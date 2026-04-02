import { useMutation, useQueryClient } from '@tanstack/react-query';
import { drainageService, StationDrainage } from '../services/drainageService';
import { notificationService } from '../services/notificationService';
import { drainageSubmitSchema, drainageBatchSubmitSchema } from '../schemas/drainageSchema';

/**
 * Hook central de mutação (Gravação / Edição) para a Drenagem de Postos.
 * Permite enviar uma única drenagem ou processar arrays (Lote) via PWA.
 * Interceptado pelo react-hot-toast na UI de consumo.
 */

interface SubmitDrainageArgs {
  drainage: Omit<StationDrainage, 'id' | 'created_at' | 'posto' | 'fazenda' | 'usuario' | 'fotos'>;
  photos: File[];
  existingPhotos?: string[]; // No caso de Update
  id?: string; // No caso de Update
  fazendaNome?: string;
  stationName?: string;
  usuarioEmail?: string;
  usuarioNome?: string;
  sendEmail?: boolean;
}

export function useDrainageSubmit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: SubmitDrainageArgs | SubmitDrainageArgs[]) => {
      // 1. Verificar conexão
      if (!navigator.onLine) {
        const { offlineSyncService } = await import('../services/offlineSyncService');
        await offlineSyncService.enqueue(args);
        return {
          records: [],
          emailSent: false,
          offline: true,
          message: 'Você está offline. O registro foi salvo no seu dispositivo e será sincronizado assim que houver internet.'
        };
      }

      const isBatch = Array.isArray(args);

      // ZOD Payload Security Check before engaging IO
      try {
        if (isBatch) {
          drainageBatchSubmitSchema.parse(args);
        } else {
          drainageSubmitSchema.parse(args);
        }
      } catch (validationError: any) {
        console.error("Zod Validation Failed:", validationError);
        // Extract Zod messages for the UI layer (Toast)
        const errorMsg = validationError.errors ? validationError.errors.map((e: any) => e.message).join(', ') : 'Erro de validação de dados';
        throw new Error(`Validação Recusada: ${errorMsg}`);
      }

      const items = isBatch ? args : [args as SubmitDrainageArgs];

      const results = [];
      const idsForEmail: string[] = [];

      for (const item of items) {
        if (item.id) {
          // Update
          const updated = await drainageService.updateDrainage(
            item.id,
            { ...item.drainage, fotos: item.existingPhotos },
            item.photos,
          );
          results.push(updated);
        } else {
          // Create
          const created = await drainageService.createDrainage(item.drainage, item.photos);
          results.push(created);
          if (item.sendEmail && created.id) {
            idsForEmail.push(created.id);
          }
        }
      }

      // Tratamento de Email (Se Lote, agrupa. Se single, envia 1)
      let emailSent = false;
      let emailErrorMsg = '';

      if (idsForEmail.length > 0 && items[0].sendEmail && items[0].fazendaNome) {
        try {
          // No PWA os stationNames e tankNames já vem via prop para o formato de Email
          const entriesForEmail = items.map((p) => ({
            postoId: p.drainage.posto_id,
            stationName: p.stationName || 'Posto Desconhecido',
            tankName: p.drainage.tanque_identificador || 'Tanque Único',
            litros: p.drainage.litros_drenados.toString(),
            aspecto: p.drainage.aspecto_residuo,
            destino: p.drainage.destino_residuo,
            observacoes: p.drainage.observacoes || '',
            photos: p.photos,
          }));

          const success = await notificationService.sendDrainageReport(
            items[0].fazendaNome,
            entriesForEmail,
            items[0].usuarioEmail,
            items[0].usuarioNome,
            items[0].drainage.fazenda_id,
          );

          emailSent = success;
          if (!success) emailErrorMsg = 'Falha no disparo AWS/Edge';

          await drainageService.updateEmailStatus(
            idsForEmail,
            emailSent ? 'sent' : 'error',
            emailErrorMsg || undefined,
          );
        } catch (error: any) {
          emailErrorMsg = error.message;
          await drainageService.updateEmailStatus(idsForEmail, 'error', emailErrorMsg);
        }
      }

      return {
        records: results,
        emailSent,
        emailError: emailErrorMsg,
      };
    },
    onSuccess: () => {
      // Invalida a query base para provocar um reload imediato da tabela
      queryClient.invalidateQueries({ queryKey: ['drainages'] });
      queryClient.invalidateQueries({ queryKey: ['drainage-distinct-farms'] });
    },
  });
}
