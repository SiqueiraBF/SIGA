import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const fileToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

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

      console.log(`[NOTIFICATION] Sending WhatsApp message to: ${user.id}`);

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

  async sendGoodsReceiptReport(receipt: any, senderEmail?: string) {
    try {
      const fazendaId = receipt.destination_farm_id || receipt.destination_farm?.id;
      const keyTo = fazendaId ? `email_cd_to_${fazendaId}` : 'email_cd_to';
      const keyCc = fazendaId ? `email_cd_cc_${fazendaId}` : 'email_cd_cc';

      const legacyKeyTo = fazendaId ? `email_entrada_to_${fazendaId}` : 'email_entrada_to';
      const legacyKeyCc = fazendaId ? `email_entrada_cc_${fazendaId}` : 'email_entrada_cc';

      const settings = await import('./systemService').then((m) =>
        m.systemService.getParameters([keyTo, keyCc, legacyKeyTo, legacyKeyCc, 'email_cd_to', 'email_cd_cc', 'email_entrada_to', 'email_entrada_cc']),
      );

      const rawTo = settings[keyTo] || settings[legacyKeyTo] || settings['email_cd_to'] || settings['email_entrada_to'];
      const rawCc = settings[keyCc] || settings[legacyKeyCc] || settings['email_cd_cc'] || settings['email_entrada_cc'];

      const to =
        rawTo
          ?.split(',')
          .map((e) => e.trim())
          .filter((e) => e) || [];
      const cc =
        rawCc
          ?.split(',')
          .map((e) => e.trim())
          .filter((e) => e) || [];

      if (to.length === 0) {
        console.warn(`[NOTIFICATION] Nenhum e-mail de destino configurado para CD (${keyTo} ou email_entrada_to).`);
        return false;
      }

      const dateStr = new Date(receipt.entry_at).toLocaleString('pt-BR');

      const isConserto = receipt.operation_type === 'CONSERTO';
      const titlePrefix = isConserto ? 'Recebimento de Conserto/Devolução' : 'Novo Recebimento de Mercadoria';

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; background-color: #ffffff;">
          <h2 style="color: #333; font-size: 20px; font-weight: bold; margin-bottom: 5px;">${titlePrefix} - ${receipt.destination_farm?.nome || 'Fazenda'}</h2>
          
          <p style="margin-top: 5px; margin-bottom: 20px; color: #333;"><strong>Data:</strong> ${dateStr}</p>
          <p style="color: #333; margin-bottom: 20px;">Informamos que um novo recebimento de mercadoria foi registrado no sistema com os seguintes detalhes:</p>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; border: 1px solid #f3f4f6;">
            <tbody>
              <tr>
                <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; width: 30%; color: #7a899e; font-weight: bold;">Fornecedor:</td>
                <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: bold; text-transform: uppercase;">${receipt.supplier}</td>
              </tr>
              <tr>
                <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; color: #7a899e; font-weight: bold;">Nota Fiscal:</td>
                <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; color: #111827;">${receipt.invoice_number}</td>
              </tr>
              <tr>
                <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; color: #7a899e; font-weight: bold;">Pedido:</td>
                <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; font-weight: bold;">
                  ${receipt.order_number
          ? `<a href="#" style="color: #2563eb; text-decoration: none;">${receipt.order_number}</a>`
          : '-'}
                </td>
              </tr>
              <tr>
                <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; color: #7a899e; font-weight: bold;">${isConserto ? 'Fazenda de Origem:' : 'Fazenda Destino:'}</td>
                <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; color: #111827;">${receipt.destination_farm?.nome || '-'}</td>
              </tr>
              <tr>
                <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; color: #7a899e; font-weight: bold;">Recebido por:</td>
                <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; color: #111827;">${receipt.receiver?.nome || '-'}</td>
              </tr>
            </tbody>
          </table>

          ${receipt.observation_entry
          ? `
          <div style="margin-top: 20px;">
            <p><strong style="color: #7a899e;">Observações:</strong></p>
            <p style="padding: 16px; border: 1px solid #f3f4f6; border-radius: 4px;">${receipt.observation_entry}</p>
          </div>`
          : ''
        }
          <br/>
          <p style="text-align: center; font-size: 13px; color: #9ca3af; margin-top: 50px; font-style: italic;">
            Enviado pelo Sistema SIGA - Sistema Integrado de Gestão de Almoxarifado
          </p>
        </div>
      `;

      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to,
          cc,
          subject: `[Entrada CD${isConserto ? ' - CONSERTO' : ''}] ${receipt.supplier} - NF ${receipt.invoice_number} - ${receipt.destination_farm?.nome || 'Sem Destino'}`,
          html: htmlBody,
          htmlBody: htmlBody,
          fromEmail: senderEmail,
        }
      });

      if (error || (data && data.success === false)) {
        console.error('[NOTIFICATION] Erro no envio de e-mail de recebimento:', error || data?.error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('[NOTIFICATION] Erro ao processar e-mail de recebimento:', error);
      return false;
    }
  },

  async sendGoodsExitReport(exit: any, items: any[], senderEmail?: string) {
    try {
      const fazendaId = exit.destination_farm_id || exit.destination_farm?.id;

      const keyTo = fazendaId ? `email_cd_to_${fazendaId}` : 'email_cd_to';
      const keyCc = fazendaId ? `email_cd_cc_${fazendaId}` : 'email_cd_cc';

      const legacyKeyTo = fazendaId ? `email_entrada_to_${fazendaId}` : 'email_entrada_to';
      const legacyKeyCc = fazendaId ? `email_entrada_cc_${fazendaId}` : 'email_entrada_cc';

      const settings = await import('./systemService').then((m) =>
        m.systemService.getParameters([keyTo, keyCc, legacyKeyTo, legacyKeyCc, 'email_cd_to', 'email_cd_cc', 'email_entrada_to', 'email_entrada_cc']),
      );

      const rawTo = settings[keyTo] || settings[legacyKeyTo] || settings['email_cd_to'] || settings['email_entrada_to'];
      const rawCc = settings[keyCc] || settings[legacyKeyCc] || settings['email_cd_cc'] || settings['email_entrada_cc'];

      const to =
        rawTo
          ?.split(',')
          .map((e) => e.trim())
          .filter((e) => e) || [];
      const cc =
        rawCc
          ?.split(',')
          .map((e) => e.trim())
          .filter((e) => e) || [];

      if (to.length === 0) {
        console.warn(`[NOTIFICATION] Nenhum e-mail de destino configurado para Expedição (usando config: ${keyTo} ou email_entrada_to).`);
        return false;
      }

      const dateStr = new Date(exit.exit_date).toLocaleString('pt-BR');

      const itemsHtml = items
        .map(
          (item) => {
            const rowDate = item.entry_at || item.entry_date ? new Date(item.entry_at || item.entry_date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
            return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #333;">
            ${item.supplier || '-'}
            ${item.operation_type === 'CONSERTO' ? '<br/><span style="display: inline-block; margin-top: 4px; font-size: 10px; background-color: #fef3c7; color: #d97706; padding: 2px 6px; border-radius: 4px; font-weight: bold;">CONSERTO</span>' : ''}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #111827; font-weight: bold;">${item.invoice_number || '-'}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #111827;">${item.order_number || '-'}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #7a899e; font-size: 11px;">${rowDate}</td>
        </tr>
      `;
          }
        )
        .join('');

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 900px; margin: 0 auto; background-color: #ffffff;">
          <h2 style="color: #333; font-size: 20px; font-weight: bold; margin-bottom: 5px;">Nova Saída de Mercadoria - Rota ${exit.destination_farm?.nome || 'Fazenda'}</h2>
          
          <p style="margin-top: 5px; margin-bottom: 20px; color: #333;"><strong>Data da Saída:</strong> ${dateStr}</p>
          <p style="color: #333; margin-bottom: 20px;">Informamos que uma nova expedição de mercadorias foi registrada com os seguintes detalhes:</p>

          <table style="width: 100%; border-collapse: collapse; font-size: 14px; border: 1px solid #f0f0f0;">
            <tbody>
              <tr>
                <td style="padding: 16px; border-bottom: 1px solid #f0f0f0; width: 30%; color: #7a899e; font-weight: bold;">Motorista / Portador:</td>
                <td style="padding: 16px; border-bottom: 1px solid #f0f0f0; color: #111827; font-weight: bold;">${exit.driver_name}</td>
              </tr>
              <tr>
                <td style="padding: 16px; border-bottom: 1px solid #f0f0f0; color: #7a899e; font-weight: bold;">Rota (Fazenda vinculada):</td>
                <td style="padding: 16px; border-bottom: 1px solid #f0f0f0; color: #111827;">${exit.destination_farm?.nome || '-'}</td>
              </tr>
              <tr>
                <td style="padding: 16px; border-bottom: 1px solid #f0f0f0; color: #7a899e; font-weight: bold;">Registrado por:</td>
                <td style="padding: 16px; border-bottom: 1px solid #f0f0f0; color: #111827;">${exit.creator?.nome || 'Sistema'}</td>
              </tr>
              <tr>
                <td style="padding: 16px; border-bottom: 1px solid #f0f0f0; color: #7a899e; font-weight: bold;">Total de Notas:</td>
                <td style="padding: 16px; border-bottom: 1px solid #f0f0f0; color: #111827; font-weight: bold;">${items.length}</td>
              </tr>
            </tbody>
          </table>

          ${exit.observation
          ? `
          <div style="margin-top: 20px;">
            <p><strong style="color: #7a899e;">Observações:</strong></p>
            <p style="padding: 16px; border: 1px solid #f0f0f0; border-radius: 4px;">${exit.observation}</p>
          </div>`
          : ''
        }

          <h3 style="font-size: 16px; color: #1e293b; font-weight: bold; margin-top: 40px; margin-bottom: 10px;">Relação de Notas / Mercadorias</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid #f0f0f0;">
            <thead style="background-color: #f8fafc; color: #7a899e; text-align: left;">
              <tr>
                <th style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Fornecedor</th>
                <th style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">NF</th>
                <th style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Pedido</th>
                <th style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Data Entrada</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <br/>
          <p style="text-align: center; font-size: 13px; color: #9ca3af; margin-top: 50px; font-style: italic;">
            Enviado pelo Sistema SIGA - Sistema Integrado de Gestão de Almoxarifado
          </p>
        </div>
      `;

      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to,
          cc,
          subject: `[Saída CD] Motorista: ${exit.driver_name} - Destino: ${exit.destination_farm?.nome || 'Sem Destino'}`,
          html: htmlBody,
          htmlBody: htmlBody,
          fromEmail: senderEmail,
        }
      });

      if (error || (data && data.success === false)) {
        console.error('[NOTIFICATION] Erro no envio de e-mail de saída:', error || data?.error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('[NOTIFICATION] Erro ao processar e-mail de saída:', error);
      return false;
    }
  },

  async sendDrainageReport(
    fazendaNome: string,
    entries: any[],
    senderEmail?: string,
    senderName?: string,
    fazendaId?: string
  ) {
    try {
      // 1. Buscar configurações
      const keyTo = fazendaId ? `email_drenagem_to_${fazendaId}` : 'email_drenagem_to';
      const keyCc = fazendaId ? `email_drenagem_cc_${fazendaId}` : 'email_drenagem_cc';

      const settings = await import('./systemService').then((m) =>
        m.systemService.getParameters([keyTo, keyCc, 'email_drenagem_to', 'email_drenagem_cc']),
      );

      const rawTo = settings[keyTo] || settings['email_drenagem_to'];
      const rawCc = settings[keyCc] || settings['email_drenagem_cc'];

      const to =
        rawTo
          ?.split(',')
          .map((e) => e.trim())
          .filter((e) => e) || [];
      const cc =
        rawCc
          ?.split(',')
          .map((e) => e.trim())
          .filter((e) => e) || [];

      if (to.length === 0) {
        console.warn(`[NOTIFICATION] Nenhum e-mail de destino configurado para drenagem (usando config: ${keyTo} ou email_drenagem_to).`);
        return false;
      }

      // 2. Montar HTML
      const dateStr = new Date().toLocaleDateString('pt-BR');

      const rows = entries
        .map(
          (item) => `
              <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">${item.stationName} ${item.tankName && item.tankName !== 'Tanque Principal' ? `- ${item.tankName}` : ''
            }</td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.litros} L</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${item.aspecto}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${item.destino}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${item.observacoes || '-'}</td>
              </tr>
          `,
        )
        .join('');

      const htmlBody = `
              <h2>Relatório de Drenagem de Postos - ${fazendaNome}</h2>
              <p><strong>Data:</strong> ${dateStr}</p>
              <p>Foram realizados os seguintes registros de drenagem:</p>
              
              <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-family: Arial, sans-serif;">
                  <thead style="background-color: #f4f4f4;">
                      <tr>
                          <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Posto / Tanque</th>
                          <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Qtd. Drenada</th>
                          <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Aspecto</th>
                          <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Destino</th>
                          <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Observações</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${rows}
                  </tbody>
              </table>
              <br/>
              <p><em>Enviado automaticamente pelo Sistema SIGA.</em></p>
          `;

      // 3. Processar Anexos (Fotos)
      const attachments: { name: string; contentType: string; contentBytes: string }[] = [];

      for (const entry of entries) {
        if (entry.photos && entry.photos.length > 0) {
          for (let i = 0; i < entry.photos.length; i++) {
            const file = entry.photos[i];
            const base64String = await fileToBase64(file);

            // Nome único para o anexo: Posto_Tanque_N.jpg
            const safeStationName = entry.stationName.replace(/[^a-z0-9]/gi, '_');
            const safeTankName =
              entry.tankName && entry.tankName !== 'Tanque Principal'
                ? `_${entry.tankName.replace(/[^a-z0-9]/gi, '_')}`
                : '';
            const ext = file.name.split('.').pop() || 'jpg';
            const fileName = `${safeStationName}${safeTankName}_${i + 1}.${ext}`;

            attachments.push({
              name: fileName,
              contentType: file.type,
              contentBytes: base64String,
            });
          }
        }
      }

      // 4. Enviar via Edge Function
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to,
          cc,
          subject: `[Drenagem] Relatório ${fazendaNome} - ${dateStr}`,
          html: htmlBody,
          htmlBody,
          fromEmail: senderEmail,
          attachments, // Add attachments to payload
        }
      });

      if (error || (data && data.success === false)) {
        console.error('[NOTIFICATION] Erro no envio de e-mail de drenagem:', error || data?.error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[NOTIFICATION] Erro ao processar envio de e-mail:', error);
      return false;
    }
  },

  async sendStockRequestReport(request: any, items: any[], senderEmail?: string, senderName?: string) {
    try {
      // 1. Buscar configurações
      const settings = await import('./systemService').then((m) =>
        m.systemService.getParameters(['email_estoque', 'email_estoque_to', 'email_estoque_cc']),
      );

      let to: string[] = [];
      let cc: string[] = [];

      // Novo formato JSON (EmailSettingsModal padrão)
      if (settings['email_estoque']) {
        try {
          const parsed = JSON.parse(settings['email_estoque']);
          to = (parsed.to || '').split(';').map((e: string) => e.trim()).filter((e: string) => e);
          cc = (parsed.cc || '').split(';').map((e: string) => e.trim()).filter((e: string) => e);
        } catch {
          // Não é JSON, ignorar e tentar formato legado
        }
      }

      // Fallback formato legado (chaves separadas email_estoque_to / email_estoque_cc)
      if (to.length === 0) {
        to = settings['email_estoque_to']
          ?.split(',')
          .map((e: string) => e.trim())
          .filter((e: string) => e) || [];
        cc = settings['email_estoque_cc']
          ?.split(',')
          .map((e: string) => e.trim())
          .filter((e: string) => e) || [];
      }

      if (to.length === 0) {
        console.warn('[NOTIFICATION] Nenhum e-mail de destino configurado para estoque.');
        return false;
      }

      // Adicionar solicitante como cópia se configurado
      if (request.usuario?.email && !cc.includes(request.usuario.email)) {
        cc.push(request.usuario.email);
      }

      // 3. Gerar PDF
      const doc = new jsPDF();

      // Cabeçalho PDF
      doc.setFontSize(14);
      doc.text(`Solicitação: ${request.friendly_id || request.numero || request.id.slice(0, 8)}`, 14, 20);

      doc.setFontSize(10);
      doc.text('Origem: AGRONEGOCIOS - CAREGI', 14, 30);
      doc.text(
        `Destino: AGRONEGOCIOS - ${request.fazenda?.nome?.toUpperCase() || 'FAZENDA NÃO IDENTIFICADA'}`,
        14,
        38,
      );

      doc.setFontSize(10);
      doc.setTextColor(150, 0, 0); // Texto em vermelho escuro para as ressalvas
      doc.text('CONSIDERAR O ESTOQUE ALMOX MATRIZ AGRO PARA EPIS E UNIFORMES', 14, 48);
      doc.text('e CONSIDERAR O ESTOQUE CANTINA CAREGI MATRIZ PARA ALIMENTOS', 14, 53);
      doc.setTextColor(0, 0, 0); // Resetar para preto

      // Tabela no PDF
      const tableData = items.map((item) => [
        item.material.unisystem_code || '-',
        item.material.name || '-',
        `${item.quantity_separated} ${item.material.unit}`,
      ]);

      autoTable(doc, {
        startY: 60,
        head: [['Cód', 'Descrição', 'Qtd Separada']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] }, // Azul estilo padrão do autoTable
      });

      // Converter as string em Base64
      const pdfBlob = doc.output('blob');
      const pdfBase64 = await fileToBase64(pdfBlob);

      const attachments = [
        {
          name: `Relatorio_Separacao_Req_${request.friendly_id || request.id.slice(0, 8)}.pdf`,
          contentType: 'application/pdf',
          contentBytes: pdfBase64,
        },
      ];

      // 4. Enviar via Edge Function
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #2563eb;">Solicitação de Transferência #${request.friendly_id || request.numero || request.id.slice(0, 8)
        }</h2>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p><strong>Origem:</strong> AGRONEGOCIOS - CAREGI</p>
            <p><strong>Destino:</strong> AGRONEGOCIOS - ${request.fazenda?.nome?.toUpperCase() || 'FAZENDA NÃO IDENTIFICADA'
        }</p>
          </div>

          <p>O relatório de separação de mercadorias está em anexo neste e-mail (PDF).</p>
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            Enviado automaticamente pelo Sistema SIGA.
          </p>
        </div>
      `;

      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to,
          cc,
          subject: `[Transferência] Solicitação #${request.friendly_id || request.id.slice(0, 8)} - ${request.fazenda?.nome
            }`,
          html: htmlBody,
          htmlBody: htmlBody,
          fromEmail: senderEmail,
          attachments,
        }
      });

      if (error || (data && data.success === false)) {
        console.error('[NOTIFICATION] Erro no envio de e-mail de transferência:', error || data?.error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Erro ao enviar solicitação de estoque:', err);
      return false;
    }
  },

  async sendCleaningReport(
    fazendaNome: string,
    tipo: 'ALMOXARIFADO' | 'POSTO',
    usuarioNome: string,
    observacoes: string | undefined,
    fotosUrl: string[],
    fazendaId: string,
    senderEmail: string | undefined,
    photos: File[]
  ) {
    try {
      // 1. Configurações
      const keyTo = fazendaId ? `email_limpeza_to_${fazendaId}` : 'email_limpeza_to';
      const keyCc = fazendaId ? `email_limpeza_cc_${fazendaId}` : 'email_limpeza_cc';

      const settings = await import('./systemService').then((m) =>
        m.systemService.getParameters([keyTo, keyCc, 'email_limpeza_to', 'email_limpeza_cc']),
      );

      const rawTo = settings[keyTo] || settings['email_limpeza_to'];
      const rawCc = settings[keyCc] || settings['email_limpeza_cc'];

      const to =
        rawTo
          ?.split(',')
          .map((e) => e.trim())
          .filter((e) => e) || [];
      const cc =
        rawCc
          ?.split(',')
          .map((e) => e.trim())
          .filter((e) => e) || [];

      if (to.length === 0) {
        console.warn(`[NOTIFICATION] Nenhum e-mail de destino configurado para limpeza (usando config: ${keyTo} ou email_limpeza_to).`);
        return false;
      }

      // 2. HTML Body
      const dateStr = new Date().toLocaleDateString('pt-BR'); // Fix timezone offset for display

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; color: #333; background-color: #ffffff; line-height: 1.5; max-width: 800px;">
          <h1 style="color: #333; font-size: 20px; font-weight: bold; margin-bottom: 5px;">Relatório de Limpeza e Organização - ${tipo}</h1>
          <p style="margin-top: 5px; margin-bottom: 40px; color: #333;"><strong>Data:</strong> ${dateStr}</p>
          
          <p style="color: #333;">Informamos que a rotina de limpeza e organização do setor foi realizada conforme o cronograma estabelecido.</p>

          <p style="color: #333; margin-top: 20px;">
            <strong>Observações:</strong> ${(observacoes || 'NENHUMA OBSERVAÇÃO REGISTRADA.').toUpperCase()}
          </p>

          <p style="font-size: 12px; color: #a5b4fc; margin-top: 20px; margin-bottom: 40px;">
            * As fotos do registro seguem em anexo.
          </p>

          <p style="font-size: 13px; color: #333; font-style: italic; margin-top: 50px;">
            Enviado pelo Sistema SIGA - Sistema Integrado de Gestão de Almoxarifado
          </p>
        </div>
      `;

      // 3. Attachments (Photos)
      const attachments: { name: string; contentType: string; contentBytes: string }[] = [];

      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];
        const base64String = await fileToBase64(file);

        const ext = file.name.split('.').pop() || 'jpg';
        attachments.push({
          name: `Foto_${i + 1}_${tipo}.${ext}`,
          contentType: file.type,
          contentBytes: base64String,
        });
      }

      // 4. Send via Edge Function
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to,
          cc,
          subject: `[Limpeza] ${tipo} - ${fazendaNome} - ${dateStr}`,
          htmlBody,
          fromEmail: senderEmail,
          attachments,
        }
      });

      if (error || (data && data.success === false)) {
        console.error('[NOTIFICATION] Erro no envio de e-mail de limpeza:', error || data?.error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[NOTIFICATION] Erro ao processar envio de e-mail de limpeza:', error);
      return false;
    }
  },

  async sendDirectReceiptReport(receipts: any[], senderEmail?: string) {
    try {
      if (!receipts || receipts.length === 0) return false;

      const firstReceipt = receipts[0];
      const fazendaId = firstReceipt.fazenda_id;
      const keyTo = fazendaId ? `email_recebimento_direto_to_${fazendaId}` : 'email_recebimento_direto_to';
      const keyCc = fazendaId ? `email_recebimento_direto_cc_${fazendaId}` : 'email_recebimento_direto_cc';

      const settings = await import('./systemService').then((m) =>
        m.systemService.getParameters([keyTo, keyCc, 'email_recebimento_direto_to', 'email_recebimento_direto_cc', 'email_saida']),
      );

      const rawTo = settings[keyTo] || settings['email_recebimento_direto_to'];
      const rawCc = settings[keyCc] || settings['email_recebimento_direto_cc'];

      const to = rawTo?.split(',').map((e) => e.trim()).filter((e) => e) || [];
      const cc = rawCc?.split(',').map((e) => e.trim()).filter((e) => e) || [];

      if (to.length === 0) {
        console.warn(`[NOTIFICATION] Nenhum e-mail de destino configurado para Fuga Processo (${keyTo}).`);
        return false;
      }

      if (!senderEmail) {
        console.error('[NOTIFICATION] Erro: Remetente não identificado. O e-mail não será enviado conforme regra de segurança.');
        return false;
      }


      const rowsHtml = receipts.map(r => {
        const dateEmissao = new Date(r.data_emissao).toLocaleDateString('pt-BR');
        const dateRegistro = new Date(r.created_at).toLocaleDateString('pt-BR') + ' ' + new Date(r.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const dateRecebimento = r.data_recebimento === 'Não informada'
          ? 'Não informada'
          : (r.data_recebimento && r.data_recebimento.includes('-') ? new Date(r.data_recebimento).toLocaleDateString('pt-BR') : r.data_recebimento);

        const local = r.local_recebimento === 'outros' ? r.local_recebimento_outros : r.local_recebimento;
        const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.valor);

        return `
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 12px; font-weight: bold; color: #111827; text-transform: uppercase;">${r.fornecedor}</td>
            <td style="padding: 12px; color: #111827;">${r.nota_fiscal}</td>
            <td style="padding: 12px; color: #111827;">${dateRegistro}</td>
            <td style="padding: 12px; color: #111827;">${dateRecebimento}</td>
            <td style="padding: 12px; color: #111827;">${dateEmissao}</td>
            <td style="padding: 12px; font-weight: bold; color: #0d9488;">${valorFormatado}</td>
            <td style="padding: 12px; color: #111827; text-transform: uppercase;">${local}</td>
            <td style="padding: 12px; color: #111827;">${r.responsavel}</td>
          </tr>
        `;
      }).join('');

      const subject = `Alerta de Fuga de Processo – Unidade ${firstReceipt.fazenda?.nome || 'Fazenda'}`;

      const destinatariosParaMensagem = [...to]; // Apenas os destinatarios principais (Para), exclui Ccs
      
      // Buscar os nomes dos usuários associados aos e-mails
      let contatosMencionados: string[] = [];
      if (destinatariosParaMensagem.length > 0) {
        const { data: nameData } = await supabase
          .from('usuarios')
          .select('email, nome')
          .in('email', destinatariosParaMensagem);
          
        const emailToNameMap = new Map(nameData?.map(u => [u.email, u.nome]) || []);
        
        contatosMencionados = destinatariosParaMensagem.map(email => {
          const name = emailToNameMap.get(email) || email;
          return `<b>${name}</b>`;
        });
      }

      const saudacao = contatosMencionados.length > 0 ? contatosMencionados.join(', ') : `<b>Equipe ${firstReceipt.fazenda?.nome || ''}</b>`;

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 1000px; margin: 0 auto; background-color: #ffffff;">
          <h2 style="color: #333; font-size: 20px; font-weight: bold; margin-bottom: 5px;">${subject}</h2>
          
          <p style="color: #333; margin-bottom: 20px; line-height: 1.5;">
            Olá, ${saudacao}. Identificamos que a NF abaixo foi registrada via módulo de exceção, pois o material entrou na unidade sem a conferência padrão do almoxarifado.<br><br>
            Sua ajuda é fundamental para reforçarmos esse fluxo com a equipe, garantindo que todo item seja conferido fisicamente pelo almoxarifado antes do seu uso/aplicação. Isso protege nosso estoque e nos traz a segurança dos pagamentos.<br><br>
            Conto com seu apoio para evitarmos novas ocorrências. Sigo à disposição!
          </p>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid #f3f4f6;">
            <thead>
              <tr style="background-color: #f9fafb; text-align: left;">
                <th style="padding: 12px; border-bottom: 2px solid #e5e7eb; color: #7a899e;">Fornecedor</th>
                <th style="padding: 12px; border-bottom: 2px solid #e5e7eb; color: #7a899e;">NF</th>
                <th style="padding: 12px; border-bottom: 2px solid #e5e7eb; color: #7a899e;">Registro</th>
                <th style="padding: 12px; border-bottom: 2px solid #e5e7eb; color: #7a899e;">Recebimento</th>
                <th style="padding: 12px; border-bottom: 2px solid #e5e7eb; color: #7a899e;">Emissão</th>
                <th style="padding: 12px; border-bottom: 2px solid #e5e7eb; color: #7a899e;">Valor</th>
                <th style="padding: 12px; border-bottom: 2px solid #e5e7eb; color: #7a899e;">Local</th>
                <th style="padding: 12px; border-bottom: 2px solid #e5e7eb; color: #7a899e;">Responsável</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <br/>
          <p style="text-align: center; font-size: 13px; color: #9ca3af; margin-top: 50px; font-style: italic;">
            Enviado pelo Sistema SIGA - Sistema Integrado de Gestão de Almoxarifado
          </p>
        </div>
      `;

      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to,
          cc,
          subject: `[Fuga Processo] ${receipts.length} Notas - ${firstReceipt.fazenda?.nome || 'Sem Destino'}`,
          html: htmlBody,
          htmlBody: htmlBody,
          fromEmail: senderEmail,
        }
      });

      if (error || (data && data.success === false)) {
        console.error('[NOTIFICATION] Erro no envio de e-mail de recebimento direto:', error || data?.error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('[NOTIFICATION] Erro ao processar e-mail de recebimento direto:', error);
      return false;
    }
  },
};
