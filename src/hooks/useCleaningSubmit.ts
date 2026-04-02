import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cleaningService, CleaningRegistry } from '../services/cleaningService';
import { notificationService } from '../services/notificationService';

interface SubmitCleaningVariables {
  cleaning: Omit<CleaningRegistry, 'id' | 'created_at' | 'fotos' | 'fazenda' | 'usuario'>;
  photos: File[];
  fazendaNome: string;
  usuarioNome: string;
  usuarioEmail?: string;
}

export const useCleaningSubmit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cleaning,
      photos,
      fazendaNome,
      usuarioNome,
      usuarioEmail,
    }: SubmitCleaningVariables) => {
      // 1. Create Database Record (Uploads photos to Storage)
      const newRegistry = await cleaningService.createCleaning(cleaning, photos);

      // 2. Send Email Notification
      const emailSent = await notificationService.sendCleaningReport(
        fazendaNome,
        cleaning.tipo,
        usuarioNome,
        cleaning.observacoes || '',
        newRegistry.fotos || [], // public URL array
        cleaning.fazenda_id,
        usuarioEmail,
        photos, // File objects
      );

      return { newRegistry, emailSent };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleanings'] });
      queryClient.invalidateQueries({ queryKey: ['cleaningWeeklyStatus'] });
      queryClient.invalidateQueries({ queryKey: ['cleaningAllFarmsWeeklyStatus'] });
    },
  });
};
