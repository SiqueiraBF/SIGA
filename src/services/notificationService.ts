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

    const cleanPhone = userPhone.replace(/\D/g, '');
    const isDevolucao = request.status === 'Devolvido';

    // Se for devolução, filtra apenas itens reprovados/devolvidos. Senão, mostra todos.
    const relevantItems = isDevolucao
      ? items.filter(i => i.status === 'Reprovado' || i.status === 'Devolvido')
      : items;

    if (isDevolucao && relevantItems.length === 0) {
      // Fallback se não detectar itens específicos (ex: devolução geral)
    }

    // 2. Montar Mensagem
    const linhas = [
      `*${isDevolucao ? '⚠️ Ação Necessária' : '✅ Notificação de Cadastro'} - Sistema Nadiana*`,
      ``,
      `Prezada(o) *${request.solicitante_nome || 'Usuário'}*,`,
      isDevolucao
        ? `Sua solicitação *SC #${request.numero}* possui itens devolvidos/reprovados que precisam de correção.`
        : `Informamos que a solicitação *SC #${request.numero}* foi concluída com sucesso.`,
      ``,
      `*Resumo:*`,
      `Filial: ${request.filial_nome || 'N/A'}`,
      // Removed confusing "General Reason" which was just user observation
      ...(isDevolucao ? [] : [`Prioridade: ${request.prioridade}`, `Obs: ${request.observacao || '-'}`]),
      ``,
      `*${isDevolucao ? 'Itens Reprovados / Pendentes:' : 'Relação de Produtos:'}*`,
    ];

    // Adicionar itens
    relevantItems.forEach((item, index) => {
      // If code matches rejection reason (hack for table display), don't show it as "Code", only as "Reason"
      const showCode = item.cod_reduzido_unisystem && item.cod_reduzido_unisystem !== item.motivo_reprovacao;

      const codigo = showCode ? ` -> *Cód: ${item.cod_reduzido_unisystem}*` : '';

      // If returned, emphasize the reason clearly
      const motivo = isDevolucao && item.motivo_reprovacao
        ? `\n   🔴 *Motivo:* _${item.motivo_reprovacao}_`
        : '';

      linhas.push(`${index + 1}. ${item.descricao} (Ref: ${item.referencia || '-'}) ${codigo}${motivo}`);
    });

    linhas.push(``);
    linhas.push(`Att, Departamento de Cadastros.`);

    // 3. Gerar URL
    const message = linhas.join('\n');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  },
};
