import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getCors(req: Request) {
    const origin = req.headers.get('Origin') || '';
    const isAllowed = origin.includes('localhost') || origin.endsWith('nadiana.com.br') || origin.endsWith('vercel.app');
    return {
        'Access-Control-Allow-Origin': isAllowed ? origin : 'https://siga.nadiana.com.br',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCors(req) });
  }

  try {
    // 0. Validação de Segurança (Apenas quem tiver a chave do CRON)
    const cronHeader = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
    const validSecret = Deno.env.get('CRON_SECRET_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!cronHeader || cronHeader !== validSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid CRON Secret' }), { status: 401, headers: getCors(req) });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let manualForce = false;
    
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        manualForce = body.force === true;
      } catch (e) { }
    }

    const { data: parameters, error: paramError } = await supabase
      .from('system_parameters')
      .select('key, value')
      .eq('key', 'email_recebimento_direto_periodic_active');

    if (paramError) throw paramError;

    const results = [];

    for (const param of parameters) {
      if (param.value !== 'true' && !manualForce) continue;

      const farmId = param.key.replace('email_recebimento_direto_periodic_active_', '').replace('email_recebimento_direto_periodic_active', '');
      const suffix = farmId ? `_${farmId}` : '';

      const configKeys = [
        `email_recebimento_direto_periodicity${suffix}`,
        `email_recebimento_direto_periodic_to${suffix}`,
        `email_recebimento_direto_next_send${suffix}`,
        `email_recebimento_direto_periodic_from${suffix}`,
        `email_recebimento_direto_to${suffix}`,
        `email_saida`
      ];

      const { data: configData } = await supabase
        .from('system_parameters')
        .select('key, value')
        .in('key', configKeys);

      const configMap = Object.fromEntries(configData?.map(c => [c.key, c.value]) || []);

      const periodicityKey = `email_recebimento_direto_periodicity${suffix}`;
      const recipientsKey = `email_recebimento_direto_periodic_to${suffix}`;
      const fallbackRecipientsKey = `email_recebimento_direto_to${suffix}`;
      const nextSendKey = `email_recebimento_direto_next_send${suffix}`;
      const fromKey = `email_recebimento_direto_periodic_from${suffix}`;

      const periodicity = parseInt(configMap[periodicityKey] || '7');
      const recipientsRaw = configMap[recipientsKey] || configMap[fallbackRecipientsKey];
      const nextSendStr = configMap[nextSendKey];
      const customFrom = configMap[fromKey];
      const globalFrom = configMap['email_saida'] || 'siga@nadiana.com.br';
      const senderEmail = customFrom && customFrom.trim() !== '' ? customFrom : globalFrom;

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      let shouldSend = manualForce;
      
      if (!shouldSend && nextSendStr) {
        const nextSendDate = new Date(nextSendStr);
        nextSendDate.setHours(0, 0, 0, 0);
        if (now >= nextSendDate) shouldSend = true;
      }

      if (shouldSend) {
        const reportStart = new Date(now);
        reportStart.setDate(reportStart.getDate() - periodicity);

        let query = supabase
          .from('direct_receipts')
          .select('*, fazenda:fazendas(nome)')
          .gte('created_at', reportStart.toISOString())
          .order('created_at', { ascending: true });

        if (farmId) query = query.eq('fazenda_id', farmId);

        const { data: receipts, error: recError } = await query;
        if (recError) throw recError;

        if (receipts && receipts.length > 0) {
          let totalDelayMs = 0;
          let delayCount = 0;
          let localCounts: Record<string, number> = {};
          let farmCounts: Record<string, number> = {};
          let totalValue = 0;

          const csvRows = [
            ['NF', 'Fornecedor', 'Local', 'Responsável', 'Valor', 'Registro', 'Recebido', 'Emissão', 'Fazenda'].join(';')
          ];

          for (const r of receipts) {
            totalValue += r.valor || 0;
            
            const rawLocal = r.local_recebimento || 'Não Informado';
            const local = (rawLocal.toUpperCase() === 'OUTRO' || rawLocal.toUpperCase() === 'OUTROS') 
              ? 'OUTROS' 
              : rawLocal.toUpperCase();
            localCounts[local] = (localCounts[local] || 0) + 1;

            if (r.fazenda?.nome) {
              farmCounts[r.fazenda.nome] = (farmCounts[r.fazenda.nome] || 0) + 1;
            }

            if (r.data_emissao) {
              const regDate = new Date(r.created_at);
              const emiDate = new Date(r.data_emissao);
              const diffMs = regDate.getTime() - emiDate.getTime();
              if (diffMs > 0) {
                totalDelayMs += diffMs;
                delayCount++;
              }
            }

            const valFormat = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.valor || 0);
            const regFormat = new Date(r.created_at).toLocaleString('pt-BR');
            const recFormat = (r.data_recebimento && r.data_recebimento !== 'Não informada') 
              ? r.data_recebimento.split('-').reverse().join('/') 
              : '-';
            const emiFormat = r.data_emissao ? r.data_emissao.split('-').reverse().join('/') : '-';

            csvRows.push([
              r.nota_fiscal || '-',
              r.fornecedor || '-',
              r.local_recebimento === 'OUTRO' ? (r.local_recebimento_outros || 'Outros') : (r.local_recebimento || '-'),
              r.responsavel || '-',
              valFormat,
              regFormat,
              recFormat,
              emiFormat,
              r.fazenda?.nome || '-'
            ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'));
          }

          const mediaAtraso = delayCount > 0 ? (totalDelayMs / delayCount / (1000 * 60 * 60 * 24)).toFixed(1) : '0';
          
          let setorCritico = '-';
          let maxLocalCount = 0;
          for (const [loc, count] of Object.entries(localCounts)) {
            if (count > maxLocalCount) {
              maxLocalCount = count;
              setorCritico = loc;
            }
          }

          let fazendaCritica = '-';
          let maxFarmCount = 0;
          for (const [farmName, count] of Object.entries(farmCounts)) {
            if (count > maxFarmCount) {
              maxFarmCount = count;
              fazendaCritica = farmName;
            }
          }

          const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
          const valTotalFormatted = formatter.format(totalValue);

          // Renderizar Gráficos via QuickChart.io
          const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
          
          const sortedLocals = Object.entries(localCounts).sort((a, b) => b[1] - a[1]).slice(0, 7); // Top 7
          const barChartConfig = {
            type: 'bar',
            data: {
              labels: sortedLocals.map(l => l[0].length > 15 ? l[0].substring(0, 15) + '...' : l[0]),
              datasets: [{
                data: sortedLocals.map(l => l[1]),
                backgroundColor: chartColors.slice(0, sortedLocals.length),
                borderWidth: 0,
                borderRadius: 4
              }]
            },
            options: {
              plugins: { 
                legend: { display: false },
                datalabels: { 
                  display: true,
                  anchor: 'end',
                  align: 'top',
                  color: '#475569',
                  font: { weight: 'bold', size: 10 }
                }
              },
              scales: { 
                 y: { beginAtZero: true, ticks: { stepSize: 1 } } 
              }
            }
          };
          const barChartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(barChartConfig))}&w=400&h=220&v=3`;

          const sortedFarms = Object.entries(farmCounts).sort((a, b) => b[1] - a[1]);
          const dogChartConfig = {
            type: 'doughnut',
            data: {
              labels: sortedFarms.map(f => f[0]),
              datasets: [{
                data: sortedFarms.map(f => f[1]),
                backgroundColor: chartColors.slice(0, sortedFarms.length),
                borderWidth: 2
              }]
            },
            options: {
              cutout: '70%',
              plugins: { 
                 legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, font: { size: 10 } } },
                 datalabels: { 
                   display: true,
                   color: '#ffffff',
                   font: { weight: 'bold', size: 11 }
                 }
              }
            }
          };
          const dogChartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(dogChartConfig))}&w=400&h=220&v=3`;

          // Criar CSV com Byte Order Mark (BOM) para forçar o Excel a ler como UTF-8
          const utf8BOM = String.fromCharCode(0xFEFF);
          const csvContent = utf8BOM + csvRows.join('\r\n');
          const encoder = new TextEncoder();
          const binaryString = Array.from(encoder.encode(csvContent)).map(b => String.fromCharCode(b)).join('');
          const csvBase64 = btoa(binaryString);

          const farmNameLabel = farmId ? receipts[0].fazenda?.nome : 'Todas as Unidades (Global)';
          
          const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; background-color: #f8fafc; color: #334155;">

              <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: #0f172a; margin: 0; font-size: 22px;">Relatório de Fuga de Processo</h2>
                <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Período Consolidado: <strong>${reportStart.toLocaleDateString('pt-BR')} a ${now.toLocaleDateString('pt-BR')}</strong> | ${farmNameLabel}</p>
              </div>

              <!-- RESUMO EXECUTIVO -->
              <div style="background-color: #ffffff; border-left: 4px solid #3b82f6; padding: 20px; margin-bottom: 25px; border-radius: 0 8px 8px 0; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <p style="margin: 0 0 15px 0; font-size: 14px; line-height: 1.5; color: #475569;">
                  Olá,<br><br>
                  Seguem os indicadores de Fuga de Processo do último mês. O objetivo deste controle é identificar mercadorias que chegam às unidades e seguem diretamente para uso, sem passar pela conferência do almoxarifado.
                </p>        
                <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: bold; color: #1e40af; text-transform: uppercase;">Resumo do Impacto:</p>
                <ul style="margin: 0 0 15px 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
                  <li><strong>R$ ${totalValue >= 1000 ? (totalValue / 1000).toFixed(1).replace('.', ',') + ' mil' : valTotalFormatted}</strong> em notas que desviaram do fluxo oficial.</li>
                  <li><strong>${receipts.length} notas</strong> processadas de forma irregular.</li>
                  <li>A <strong>${setorCritico}</strong> e a <strong>${fazendaCritica}</strong> concentram o maior número de ocorrências.</li>
                </ul>

                <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #475569; font-style: italic;">Essa prática gera um risco de conformidade e falta de controle físico sobre o que está sendo faturado, garantindo que todo item seja conferido fisicamente pelo almoxarifado antes do seu uso/aplicação. Isso protege nosso estoque e nos traz a segurança dos pagamentos. O relatório completo com cada registro segue anexo.</p>
              </div>

              <!-- TOP CARD -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px; table-layout: fixed;">
                <tr>
                  <td width="33%" style="padding: 24px; border-right: 1px solid #e2e8f0; text-align: left;">
                    <span style="color: #d97706; font-size: 11px; font-weight: bold; text-transform: uppercase;">$ Volume Financeiro em Fuga</span><br/>
                    <div style="color: #0f172a; font-size: 28px; font-weight: 900; margin-top: 8px;">${valTotalFormatted}</div>
                  </td>
                  <td width="34%" style="padding: 24px; text-align: center; border-right: 1px solid #e2e8f0;">
                    <span style="color: #94a3b8; font-size: 11px; font-weight: bold; text-transform: uppercase;">IMPACTO FINANCEIRO</span><br/>
                    <div style="color: #64748b; font-size: 11px; margin-top: 8px;">Somatório de notas recebidas<br/>fora do fluxo padrão.</div>
                  </td>
                  <td width="33%" style="padding: 24px; text-align: right;">
                    <span style="color: #dc2626; font-size: 11px; font-weight: bold; text-transform: uppercase;">⚠ Notas Irregulares (Total)</span><br/>
                    <div style="color: #0f172a; font-size: 28px; font-weight: 900; margin-top: 8px;">${receipts.length} <span style="font-size: 12px; color: #64748b; font-weight: normal;">registros</span></div>
                  </td>
                </tr>
              </table>

              <!-- MIDDLE CARDS -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px; table-layout: fixed;">
                <tr>
                  <!-- Média de Atraso -->
                  <td width="32%" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 18px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="right" style="color: #b91c1c; font-size: 22px; font-weight: 900;">${mediaAtraso} dias</td>
                      </tr>
                      <tr>
                        <td style="padding-top: 15px;">
                           <span style="color: #991b1b; font-size: 11px; font-weight: bold; text-transform: uppercase;">MÉDIA DE ATRASO (REGISTRO)</span><br/>
                           <div style="color: #dc2626; font-size: 10px; margin-top: 4px;">Diferença entre Emissão e Lançamento</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  
                  <td width="2%">&nbsp;</td>
                  
                  <!-- Setor Mais Frequente -->
                  <td width="32%" style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 18px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="right" style="color: #1d4ed8; font-size: 20px; font-weight: 900; text-transform: uppercase;">${setorCritico}</td>
                      </tr>
                      <tr>
                        <td style="padding-top: 15px;">
                           <span style="color: #1e40af; font-size: 11px; font-weight: bold; text-transform: uppercase;">SETOR MAIS FREQUENTE</span><br/>
                           <div style="color: #2563eb; font-size: 10px; margin-top: 4px;">Fugas identificadas nesta área</div>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <td width="2%">&nbsp;</td>

                  <!-- Fazenda Exposta -->
                  <td width="32%" style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 18px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="right" style="color: #7e22ce; font-size: 20px; font-weight: 900; text-transform: uppercase;">${fazendaCritica}</td>
                      </tr>
                      <tr>
                        <td style="padding-top: 15px;">
                           <span style="color: #6b21a8; font-size: 11px; font-weight: bold; text-transform: uppercase;">FAZENDA MAIS EXPOSTA</span><br/>
                           <div style="color: #9333ea; font-size: 10px; margin-top: 4px;">Desvios de rota identificados</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CHARTS -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout: fixed; margin-bottom: 10px;">
                <tr>
                  <td width="49%" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; vertical-align: top; text-align: center;">
                    <span style="color: #0f172a; font-size: 13px; font-weight: bold;">Ranking de Locais</span><br/>
                    <div style="margin-top: 20px;">
                      <img src="${barChartUrl}" alt="Ranking de Locais" width="360" style="display: block; width: 100%; max-width: 360px; height: auto; margin: 0 auto;" />
                    </div>
                  </td>
                  <td width="2%">&nbsp;</td>
                  <td width="49%" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; vertical-align: top; text-align: center;">
                     <span style="color: #0f172a; font-size: 13px; font-weight: bold;">Frequência por Fazenda</span><br/>
                     <div style="margin-top: 20px;">
                       <img src="${dogChartUrl}" alt="Frequência Fazenda" width="360" style="display: block; width: 100%; max-width: 360px; height: auto; margin: 0 auto;" />
                     </div>
                  </td>
                </tr>
              </table>
              
              <div style="text-align: center; margin-top: 35px; font-size: 12px; color: #64748b;">
                📎 O detalhamento completo estruturado em Excel (.csv) está em anexo.
              </div>
              <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #94a3b8; font-style: italic;">
                Enviado pelo Sistema SIGA - Sistema Integrado de Gestão de Almoxarifado
              </div>
            </div>`;

          const to = recipientsRaw?.split(',').map(e => e.trim()).filter(e => e) || [];
          if (to.length > 0) {
            await supabase.functions.invoke('send-email', {
              body: { 
                to, 
                subject: 'Relatório de Fuga de Processo - ' + farmNameLabel, 
                htmlBody, 
                fromEmail: senderEmail,
                attachments: [
                  {
                    name: `Fuga_Processo_${reportStart.toISOString().split('T')[0]}_a_${now.toISOString().split('T')[0]}.csv`,
                    contentType: 'text/csv',
                    contentBytes: csvBase64
                  }
                ]
              }
            });
            results.push({ farmId, status: 'sent', from: senderEmail, count: receipts.length });
          } else {
            results.push({ farmId, status: 'no_recipients' });
          }
        } else {
          results.push({ farmId, status: 'no_data', message: 'Nenhum registro encontrado para o período.' });
        }

        if (!manualForce) {
          const newNextSend = new Date(now);
          newNextSend.setDate(newNextSend.getDate() + periodicity);
          const nextSendKey = `email_recebimento_direto_next_send${suffix}`;
          await supabase.from('system_parameters').upsert({ 
            key: nextSendKey, 
            value: newNextSend.toISOString().split('T')[0], 
            updated_at: new Date().toISOString() 
          }, { onConflict: 'key' });
        }
      } else {
        results.push({ farmId, status: 'skipped', next_send: nextSendStr });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results }), {
      headers: { ...getCors(req), 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Erro na execução da função:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...getCors(req), 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
