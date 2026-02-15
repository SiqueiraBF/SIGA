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
      console.log(`DE: Sistema SIGA`);
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
      `*${isDevolucao ? '⚠️ Ação Necessária' : '✅ Notificação de Cadastro'} - Sistema SIGA*`,
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

  /**
   * Envia relatório de drenagem por e-mail via Edge Function
   */
  async sendDrainageReport(fazendaNome: string, entries: any[], senderEmail?: string, senderName?: string) {
    try {
      // 1. Buscar configurações

      const settings = await import('./systemService').then(m => m.systemService.getParameters(['email_drenagem_to', 'email_drenagem_cc']));
      const to = settings['email_drenagem_to']?.split(',').map(e => e.trim()).filter(e => e) || [];
      const cc = settings['email_drenagem_cc']?.split(',').map(e => e.trim()).filter(e => e) || [];

      if (to.length === 0) {
        console.warn('[NOTIFICATION] Nenhum e-mail de destino configurado para drenagem.');
        return false;
      }

      // 2. Montar HTML
      const dateStr = new Date().toLocaleDateString('pt-BR');

      const rows = entries.map(item => `
              <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">${item.stationName} ${(item.tankName && item.tankName !== 'Tanque Principal') ? `- ${item.tankName}` : ''}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.litros} L</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${item.aspecto}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${item.destino}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${item.observacoes || '-'}</td>
              </tr>
          `).join('');

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
      const attachments: { name: string; contentType: string; contentBytes: string; }[] = [];

      for (const entry of entries) {
        if (entry.photos && entry.photos.length > 0) {
          for (let i = 0; i < entry.photos.length; i++) {
            const file = entry.photos[i];
            const arrayBuffer = await file.arrayBuffer();
            const base64String = btoa(
              new Uint8Array(arrayBuffer)
                .reduce((data, byte) => data + String.fromCharCode(byte), '')
            );

            // Nome único para o anexo: Posto_Tanque_N.jpg
            const safeStationName = entry.stationName.replace(/[^a-z0-9]/gi, '_');
            const safeTankName = (entry.tankName && entry.tankName !== 'Tanque Principal')
              ? `_${entry.tankName.replace(/[^a-z0-9]/gi, '_')}`
              : '';
            const ext = file.name.split('.').pop() || 'jpg';
            const fileName = `${safeStationName}${safeTankName}_${i + 1}.${ext}`;

            attachments.push({
              name: fileName,
              contentType: file.type,
              contentBytes: base64String
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
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          to,
          cc,
          subject: `[Drenagem] Relatório ${fazendaNome} - ${dateStr}`,
          htmlBody,
          fromEmail: senderEmail,
          attachments // Add attachments to payload
        })
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
      const settings = await import('./systemService').then(m => m.systemService.getParameters(['email_estoque_to', 'email_estoque_cc']));
      const to = settings['email_estoque_to']?.split(',').map(e => e.trim()).filter(e => e) || [];
      const cc = settings['email_estoque_cc']?.split(',').map(e => e.trim()).filter(e => e) || [];

      if (to.length === 0) {
        console.warn('[NOTIFICATION] Nenhum e-mail de destino configurado para estoque.');
        return false;
      }

      // Adicionar solicitante como cópia se configurado
      if (request.usuario?.email && !cc.includes(request.usuario.email)) {
        cc.push(request.usuario.email);
      }

      // 2. Montar Corpo do E-mail
      const itemsHtml = items.map(item => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.material.unisystem_code || '-'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${item.material.name}</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity_separated} ${item.material.unit}</td>
        </tr>
      `).join('');

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #2563eb;">Solicitação de Transferência #${request.friendly_id || request.numero || request.id.slice(0, 8)}</h2>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p><strong>Origem:</strong> AGRONEGOCIOS - CAREGI</p>
            <p><strong>Destino:</strong> AGRONEGOCIOS - ${request.fazenda?.nome?.toUpperCase() || 'FAZENDA NÃO IDENTIFICADA'}</p>
          </div>

          <div style="background-color: #fef2f2; color: #991b1b; padding: 10px; border-radius: 4px; font-weight: bold; text-align: center; margin-bottom: 20px; border: 1px solid #fecaca;">
            CONSIDERAR O ESTOQUE ALMOX MATRIZ AGRO
          </div>

          <h3>Itens Separados</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead style="background-color: #f1f5f9;">
              <tr>
                <th style="padding: 10px; text-align: left;">Cód.</th>
                <th style="padding: 10px; text-align: left;">Descrição</th>
                <th style="padding: 10px; text-align: center;">Qtd. Separada</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            Enviado automaticamente pelo Sistema SIGA.
          </p>
        </div>
      `;

      // 3. Enviar via Edge Function
      const supabaseUrl = 'https://wufvpptcolbdbwdtcugv.supabase.co';
      const supabaseAnonKey = 'sb_publishable_6n2wtcAyxEPPo6XZxeCDFg_mjnFoHNo';

      const { data, error } = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          to,
          cc,
          subject: `[Transferência] Solicitação #${request.friendly_id || request.id.slice(0, 8)} - ${request.fazenda?.nome}`,
          html: htmlBody,
          htmlBody: htmlBody,
          fromEmail: senderEmail // Revertendo para o email do usuário real para evitar erro de validação
        })
      }).then(res => res.json().then(d => ({ data: d.success ? d : null, error: d.success ? null : d.error })));

      if (error) throw error;
      return true;

    } catch (err) {
      console.error('Erro ao enviar solicitação de estoque:', err);
      throw err;
    }
  },

  async sendCleaningReport(
    data: {
      fazendaNome: string;
      usuarioNome: string;
      tipo: 'ALMOXARIFADO' | 'POSTO';
      data: string;
      observacoes?: string
    },
    photos: File[],
    senderEmail?: string
  ) {
    try {
      // 1. Configurações
      // Reusing drainage emails for now or a new setting? 
      // Implementation plan didn't specify new settings, so let's use a generic 'email_limpeza_to' if exists, or fallback to drainage/admin.
      // Let's assume we need to fetch 'email_limpeza_to', 'email_limpeza_cc'.

      const settings = await import('./systemService').then(m => m.systemService.getParameters(['email_limpeza_to', 'email_limpeza_cc']));
      const to = settings['email_limpeza_to']?.split(',').map(e => e.trim()).filter(e => e) || [];
      const cc = settings['email_limpeza_cc']?.split(',').map(e => e.trim()).filter(e => e) || [];

      if (to.length === 0) {
        console.warn('[NOTIFICATION] Nenhum e-mail de destino configurado para limpeza (email_limpeza_to).');
        // Fallback to avoid silent failure if user hasn't configured it yet? 
        // Better to log error and return false so UI can warn.
        return false;
      }

      // 2. HTML Body
      const dateStr = new Date(data.data + 'T12:00:00').toLocaleDateString('pt-BR'); // Fix timezone offset for display

      const htmlBody = `
              <div style="font-family: Arial, sans-serif; color: #333;">
                  <h2 style="color: #059669;">Registro de Limpeza e Organização</h2>
                  
                  <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #d1fae5;">
                      <p><strong>Fazenda:</strong> ${data.fazendaNome}</p>
                      <p><strong>Setor:</strong> ${data.tipo}</p>
                      <p><strong>Responsável:</strong> ${data.usuarioNome}</p>
                      <p><strong>Data de Referência:</strong> ${dateStr}</p>
                  </div>

                  <p><strong>Observações:</strong><br/>
                  ${data.observacoes || 'Nenhuma observação registrada.'}</p>

                  <br/>
                  <p style="font-size: 12px; color: #666;">
                    * As fotos do registro seguem em anexo.<br/>
                    Enviado automaticamente pelo Sistema SIGA.
                  </p>
              </div>
          `;

      // 3. Attachments (Photos)
      const attachments: { name: string; contentType: string; contentBytes: string; }[] = [];

      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];
        const arrayBuffer = await file.arrayBuffer();
        const base64String = btoa(
          new Uint8Array(arrayBuffer)
            .reduce((d, byte) => d + String.fromCharCode(byte), '')
        );

        const ext = file.name.split('.').pop() || 'jpg';
        attachments.push({
          name: `Foto_${i + 1}_${data.tipo}.${ext}`,
          contentType: file.type,
          contentBytes: base64String
        });
      }

      // 4. Send via Edge Function
      const supabaseUrl = 'https://wufvpptcolbdbwdtcugv.supabase.co';
      const supabaseAnonKey = 'sb_publishable_6n2wtcAyxEPPo6XZxeCDFg_mjnFoHNo';

      const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          to,
          cc,
          subject: `[Limpeza] ${data.tipo} - ${data.fazendaNome} - ${dateStr}`,
          htmlBody,
          fromEmail: senderEmail,
          attachments
        })
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
  }
};
