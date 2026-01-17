import { supabase } from '../lib/supabase';

export const notificationService = {
  /**
   * Envia notificação automática (WhatsApp/Email) informando mudança de status da solicitação.
   * Atualmente simula o envio via logs, preparado para integração com API Gateway (Evolution/Z-API).
   */
  async notifyRequestStatus(requestId: string, newStatus: string) {
    try {
      console.log(`[NOTIFICATION] Processando notificação para SC ${requestId} -> ${newStatus}`);

      // 1. Buscar Solicitação
      const { data: request, error: reqError } = await supabase
        .from('solicitacoes')
        .select('*')
        .eq('id', requestId)
        .single();

      if (reqError || !request) {
        console.warn('[NOTIFICATION] Solicitação não encontrada.');
        return;
      }

      // 2. Buscar Usuário Solicitante
      const { data: user, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', request.usuario_id)
        .single();

      if (userError || !user) {
        console.warn('[NOTIFICATION] Usuário solicitante não encontrado.');
        return;
      }

      if (!user.telefone) {
        console.log('[NOTIFICATION] Usuário sem telefone cadastrado. Ignorando.');
        return;
      }

      // 3. Montar Mensagem Personalizada
      // Emojis diferentes para status
      const statusEmoji =
        newStatus === 'Finalizado' ? '✅' : newStatus === 'Devolvido' ? '⚠️' : 'ℹ️';

      const message =
        `Olá *${user.nome.split(' ')[0]}*! ${statusEmoji}\n\n` +
        `Sua Solicitação de Cadastro *SC #${request.numero}* teve o status atualizado para: *${newStatus.toUpperCase()}*.\n\n` +
        `Acesse o sistema para conferir os detalhes.`;

      // 4. Enviar (Simulação / Integração Futura)
      const cleanPhone = user.telefone.replace(/\D/g, '');

      // Bloco de Integração Real (Exemplo Evolution API / Z-API)
      /*
            await fetch('https://api.whatsapp-gateway.com/send-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': 'SUA_KEY' },
                body: JSON.stringify({
                    number: '55' + cleanPhone,
                    text: message
                })
            });
            */

      console.group('🔔 NOTIFICAÇÃO AUTOMÁTICA (SIMULAÇÃO)');
      console.log(`DE: Sistema Nadiana`);
      console.log(`PARA: ${user.nome} (${cleanPhone})`);
      console.log(`MENSAGEM:\n${message}`);
      console.groupEnd();

      return true;
    } catch (error) {
      console.error('[NOTIFICATION] Erro crítico ao notificar:', error);
      return false;
    }
  },

  /**
   * Gera o link do WhatsApp com a mensagem formatada (Opção 2 - Formal).
   */
  generateWhatsappLink(request: any, items: any[], userPhone: string) {
    if (!userPhone) return null;

    // 1. Sanitizar telefone (Manter apenas números)
    // Formato esperado entrada: +55 66 9651-6132 -> Saída: 556696516132
    const cleanPhone = userPhone.replace(/\D/g, '');

    // 2. Montar Mensagem
    const linhas = [
      `*Notificação de Cadastro - Sistema Nadiana*`,
      ``,
      `Prezada(o) *${request.solicitante_nome || 'Usuário'}*,`,
      `Informamos que a solicitação *SC #${request.numero}* foi concluída com sucesso. ✅`,
      ``,
      `*Resumo:*`,
      `Filial: ${request.filial_nome || 'N/A'}`,
      `Prioridade: ${request.prioridade} ${request.prioridade === 'Urgente' ? '🚨' : ''}`,
      `Obs: ${request.observacao || '-'}`,
      ``,
      `*Relação de Produtos:*`,
    ];

    // Adicionar itens
    items.forEach((item, index) => {
      const codigo = item.cod_reduzido_unisystem ? ` -> *Cód: ${item.cod_reduzido_unisystem}*` : '';
      linhas.push(`${index + 1}. ${item.descricao} (Ref: ${item.referencia || '-'}) ${codigo}`);
    });

    linhas.push(``);
    linhas.push(`Att, Departamento de Cadastros.`);

    // 3. Gerar URL
    const message = linhas.join('\n');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  },
};
