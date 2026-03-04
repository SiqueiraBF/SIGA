import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  async sendGoodsReceiptReport(receipt: any, senderEmail?: string) {
    try {
      const fazendaId = receipt.destination_farm_id || receipt.destination_farm?.id;
      const keyTo = fazendaId ? `email_entrada_to_${fazendaId}` : 'email_entrada_to';
      const keyCc = fazendaId ? `email_entrada_cc_${fazendaId}` : 'email_entrada_cc';

      const settings = await import('./systemService').then((m) =>
        m.systemService.getParameters([keyTo, keyCc, 'email_entrada_to', 'email_entrada_cc']),
      );

      const rawTo = settings[keyTo] || settings['email_entrada_to'];
      const rawCc = settings[keyCc] || settings['email_entrada_cc'];

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

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto;">
          <h2>Novo Recebimento de Mercadoria - ${receipt.destination_farm?.nome || 'Fazenda'}</h2>
          
          <p><strong>Data:</strong> ${dateStr}</p>
          <p>Informamos que um novo recebimento de mercadoria foi registrado no sistema com os seguintes detalhes:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; border: 1px solid #f3f4f6;">
            <tbody>
              <tr>
                <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; width: 30%; color: #6b7280; font-weight: bold;">Fornecedor:</td>
                <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: bold;">${receipt.supplier}</td>
              </tr>
              <tr>
                <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: bold;">Nota Fiscal:</td>
                <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; color: #111827;">${receipt.invoice_number}</td>
              </tr>
              <tr>
                <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: bold;">Pedido:</td>
                <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; color: #2563eb; font-weight: bold;">${receipt.order_number || '-'}</td>
              </tr>
              <tr>
                <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: bold;">Fazenda Destino:</td>
                <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; color: #111827;">${receipt.destination_farm?.nome || '-'}</td>
              </tr>
              <tr>
                <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: bold;">Recebido por:</td>
                <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; color: #111827;">${receipt.receiver?.nome || '-'}</td>
              </tr>
            </tbody>
          </table>

          ${receipt.observation_entry
          ? `
          <div style="margin-top: 20px;">
            <p><strong>Observações:</strong></p>
            <p style="padding: 16px; border: 1px solid #f3f4f6; border-radius: 4px;">${receipt.observation_entry}</p>
          </div>`
          : ''
        }
          <br/>
          <p style="text-align: center; font-size: 11px; color: #9ca3af; margin-top: 30px; font-style: italic;">
            Enviado pelo Sistema SIGA - Sistema Integrado de Gestão de Almoxarifado
          </p>
        </div>
      `;

      const supabaseUrl = 'https://wufvpptcolbdbwdtcugv.supabase.co';
      const supabaseAnonKey = 'sb_publishable_6n2wtcAyxEPPo6XZxeCDFg_mjnFoHNo';

      const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          to,
          cc,
          subject: `[Entrada CD] ${receipt.supplier} - NF ${receipt.invoice_number} - ${receipt.destination_farm?.nome || 'Sem Destino'}`,
          html: htmlBody,
          htmlBody: htmlBody,
          fromEmail: senderEmail,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        console.error('[NOTIFICATION] Erro no envio de e-mail de recebimento:', result.error);
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
      const fazendaId = exit.farm_id || exit.farm?.id;
      // Usuário solicitou que os e-mails de Saída vão para os mesmos destinatários da Entrada
      const keyTo = fazendaId ? `email_entrada_to_${fazendaId}` : 'email_entrada_to';
      const keyCc = fazendaId ? `email_entrada_cc_${fazendaId}` : 'email_entrada_cc';

      const settings = await import('./systemService').then((m) =>
        m.systemService.getParameters([keyTo, keyCc, 'email_entrada_to', 'email_entrada_cc']),
      );

      const rawTo = settings[keyTo] || settings['email_entrada_to'];
      const rawCc = settings[keyCc] || settings['email_entrada_cc'];

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
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #1f2937;">${item.supplier || '-'}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #111827; font-weight: bold;">${item.invoice_number || '-'}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #1f2937;">${item.order_number || '-'}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${rowDate}</td>
        </tr>
      `;
          }
        )
        .join('');

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; color: #111827; max-width: 900px; margin: 0 auto;">
          
          <p style="margin-bottom: 20px; font-size: 15px;">Informamos que uma nova expedição de mercadorias foi registrada com os seguintes detalhes:</p>

          <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; border: 1px solid #f3f4f6;">
            <tbody>
              <tr>
                <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; width: 30%; color: #6b7280; font-weight: bold;">Motorista / Portador:</td>
                <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: bold;">${exit.driver_name}</td>
              </tr>
              <tr>
                <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: bold;">Fazenda Destino:</td>
                <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; color: #111827;">${exit.destination_farm?.nome || '-'}</td>
              </tr>
              <tr>
                <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: bold;">Registrado por:</td>
                <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; color: #111827;">${exit.creator?.nome || 'Sistema'}</td>
              </tr>
              <tr>
                <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: bold;">Total de Notas:</td>
                <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: bold;">${items.length}</td>
              </tr>
            </tbody>
          </table>

          ${exit.observation
          ? `
          <div style="margin-top: 20px;">
            <p><strong>Observações:</strong></p>
            <p style="padding: 16px; border: 1px solid #f3f4f6; border-radius: 4px;">${exit.observation}</p>
          </div>`
          : ''
        }

          <h3 style="font-size: 16px; color: #1f2937; margin-top: 40px; margin-bottom: 10px;">Relação de Notas / Mercadorias</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead style="background-color: #f8fafc; color: #4b5563; text-align: left;">
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
          <p style="text-align: center; font-size: 11px; color: #9ca3af; margin-top: 30px; font-style: italic;">
            Enviado pelo Sistema SIGA - Sistema Integrado de Gestão de Almoxarifado
          </p>
        </div>
      `;

      const supabaseUrl = 'https://wufvpptcolbdbwdtcugv.supabase.co';
      const supabaseAnonKey = 'sb_publishable_6n2wtcAyxEPPo6XZxeCDFg_mjnFoHNo';

      const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          to,
          cc,
          subject: `[Saída CD] Motorista: ${exit.driver_name} - Destino: ${exit.destination_farm?.nome || 'Sem Destino'}`,
          html: htmlBody,
          htmlBody: htmlBody,
          fromEmail: senderEmail,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        console.error('[NOTIFICATION] Erro no envio de e-mail de saída:', result.error);
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
      const settings = await import('./systemService').then((m) =>
        m.systemService.getParameters(['email_drenagem_to', 'email_drenagem_cc']),
      );
      const to =
        settings['email_drenagem_to']
          ?.split(',')
          .map((e) => e.trim())
          .filter((e) => e) || [];
      const cc =
        settings['email_drenagem_cc']
          ?.split(',')
          .map((e) => e.trim())
          .filter((e) => e) || [];

      if (to.length === 0) {
        console.warn('[NOTIFICATION] Nenhum e-mail de destino configurado para drenagem.');
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
            const arrayBuffer = await file.arrayBuffer();
            const base64String = btoa(
              new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''),
            );

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
      const supabaseUrl = 'https://wufvpptcolbdbwdtcugv.supabase.co';
      const supabaseAnonKey = 'sb_publishable_6n2wtcAyxEPPo6XZxeCDFg_mjnFoHNo';

      const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          to,
          cc,
          subject: `[Drenagem] Relatório ${fazendaNome} - ${dateStr}`,
          htmlBody,
          fromEmail: senderEmail,
          attachments, // Add attachments to payload
        }),
      });

      const result = await response.json();
      if (!result.success) {
        console.error('[NOTIFICATION] Erro no envio de e-mail:', result.error);
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
        m.systemService.getParameters(['email_estoque_to', 'email_estoque_cc']),
      );
      const to =
        settings['email_estoque_to']
          ?.split(',')
          .map((e) => e.trim())
          .filter((e) => e) || [];
      const cc =
        settings['email_estoque_cc']
          ?.split(',')
          .map((e) => e.trim())
          .filter((e) => e) || [];

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
      const pdfArrayBuffer = doc.output('arraybuffer');
      const pdfBase64 = btoa(
        new Uint8Array(pdfArrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''),
      );

      const attachments = [
        {
          name: `Relatorio_Separacao_Req_${request.friendly_id || request.id.slice(0, 8)}.pdf`,
          contentType: 'application/pdf',
          contentBytes: pdfBase64,
        },
      ];

      // 4. Enviar via Edge Function
      const supabaseUrl = 'https://wufvpptcolbdbwdtcugv.supabase.co';
      const supabaseAnonKey = 'sb_publishable_6n2wtcAyxEPPo6XZxeCDFg_mjnFoHNo';

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

      const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          to,
          cc,
          subject: `[Transferência] Solicitação #${request.friendly_id || request.id.slice(0, 8)} - ${request.fazenda?.nome
            }`,
          html: htmlBody,
          htmlBody: htmlBody,
          fromEmail: senderEmail,
          attachments,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        console.error('[NOTIFICATION] Erro no envio de e-mail:', result.error);
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
        const arrayBuffer = await file.arrayBuffer();
        const base64String = btoa(
          new Uint8Array(arrayBuffer).reduce((d, byte) => d + String.fromCharCode(byte), ''),
        );

        const ext = file.name.split('.').pop() || 'jpg';
        attachments.push({
          name: `Foto_${i + 1}_${tipo}.${ext}`,
          contentType: file.type,
          contentBytes: base64String,
        });
      }

      // 4. Send via Edge Function
      const supabaseUrl = 'https://wufvpptcolbdbwdtcugv.supabase.co';
      const supabaseAnonKey = 'sb_publishable_6n2wtcAyxEPPo6XZxeCDFg_mjnFoHNo';

      const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          to,
          cc,
          subject: `[Limpeza] ${tipo} - ${fazendaNome} - ${dateStr}`,
          htmlBody,
          fromEmail: senderEmail,
          attachments,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        console.error('[NOTIFICATION] Erro no envio de e-mail:', result.error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[NOTIFICATION] Erro ao processar envio de e-mail de limpeza:', error);
      return false;
    }
  },
};
