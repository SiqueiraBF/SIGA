import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result?.toString().split(',')[1] || '';
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

export interface PcmRequest {
  id: string;
  fazenda_id: string;
  created_by: string;
  created_at: string;
  status: 'PENDING_ALMOXARIFADO' | 'COMPLETED' | 'CANCELLED';
  sc_numero?: string;
  maquina: string;
  prioridade: 'Normal' | 'Urgente';
  num_requisicao: string;
  obs_pcm?: string;
  motivo_cancelamento?: string;
  anexo_pcm_url?: string;
  data_confirmacao?: string;
  confirmed_by?: string;
  solicitacao_almox?: string;
  obs_almox?: string;
  anexo_almox_url?: string;
  email_thread_id?: string;
  email_graph_message_id?: string; // Graph API internal ID - usado para createReply nativo
  
  fazenda?: { nome: string };
  usuario?: { nome?: string; email?: string };
  confirmador?: { email: string };
}

export const pcmService = {
  async getRequests(farmId?: string): Promise<PcmRequest[]> {
    let query = supabase
      .from('pcm_solicitacoes_compras')
      .select(`
        *,
        fazenda:fazendas(nome),
        usuario:usuarios!pcm_solicitacoes_compras_created_by_fkey(nome)
      `)
      .order('created_at', { ascending: false });

    if (farmId) {
      query = query.eq('fazenda_id', farmId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createRequest(requestData: Partial<PcmRequest>, file?: File, currentUser?: { id: string, email: string }): Promise<PcmRequest> {
    if (!currentUser || !currentUser.id || !currentUser.email) throw new Error('Usuário autenticado não encontrado ou sem email');
    const userId = currentUser.id;

    // Verificar duplicidade de requisição para a mesma filial (ignora canceladas)
    const { data: existing } = await supabase
      .from('pcm_solicitacoes_compras')
      .select('id')
      .eq('fazenda_id', requestData.fazenda_id)
      .eq('num_requisicao', requestData.num_requisicao)
      .neq('status', 'CANCELLED')
      .maybeSingle();

    if (existing) {
      throw new Error(`Já existe uma solicitação ativa com o número de requisição #${requestData.num_requisicao} para esta filial.`);
    }

    let anexo_pcm_url = '';
    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(7)}_${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('pcm-anexos')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('pcm-anexos')
        .getPublicUrl(filePath);
        
      anexo_pcm_url = urlData.publicUrl;
    }

    const { data, error } = await supabase
      .from('pcm_solicitacoes_compras')
      .insert([{
        ...requestData,
        created_by: userId,
        anexo_pcm_url: anexo_pcm_url || null
      }])
      .select('*, fazenda:fazendas(nome)')
      .single();

    if (error) throw error;

    // Send Email to Almoxarifado
    try {
      const { data: paramData } = await supabase
        .from('system_parameters')
        .select('value')
        .eq('key', `pcm_to_almox_${requestData.fazenda_id}`)
        .single();
        
      if (paramData && paramData.value) {
        let to: string[] = [];
        let cc: string[] = [];
        try {
          const parsed = JSON.parse(paramData.value);
          to = (parsed.to || '').split(/[;,]/).map((e: string) => e.trim()).filter((e: string) => e);
          cc = (parsed.cc || '').split(/[;,]/).map((e: string) => e.trim()).filter((e: string) => e);
        } catch {
          // Fallback legacy
          to = paramData.value.split(/[;,]/).map((e: string) => e.trim()).filter((e: string) => e);
        }

        if (to.length > 0) {
          const emailHtml = `
            <h2>Nova Solicitação de Compras (PCM)</h2>
            <p>Uma nova requisição foi gerada e aguarda a abertura da Solicitação de Compras (SC) no sistema.</p>
            <p><strong>Fazenda:</strong> ${data.fazenda?.nome || 'N/A'}</p>
            <p><strong>Máquina:</strong> ${requestData.maquina}</p>
            <p><strong>Requisição:</strong> ${requestData.num_requisicao}</p>
            <p><strong>Prioridade:</strong> ${requestData.prioridade}</p>
            <p><strong>Observações:</strong> ${requestData.obs_pcm || '-'}</p>
            <br>
            <p>Acesse o SIGA para confirmar a solicitação o quanto antes.</p>
          `;
          
          const { data: responseData, error: funcError } = await supabase.functions.invoke('send-email', {
            body: {
              to,
              cc: cc.length > 0 ? cc : undefined,
              subject: `[Solicitação PCM] Nova Requisição de Produtos: ${requestData.num_requisicao} | ${data.fazenda?.nome || 'N/A'} | Máquina ${requestData.maquina}`,
              htmlBody: emailHtml,
              fromEmail: currentUser.email,
              attachments: file ? [{
                name: file.name,
                contentType: file.type,
                contentBytes: await fileToBase64(file)
              }] : undefined
            }
          });

          if (!funcError && (responseData?.graphMessageId || responseData?.internetMessageId)) {
             // Salvar o Graph Message ID (para createReply nativo) e o internetMessageId
             await supabase
               .from('pcm_solicitacoes_compras')
               .update({
                 email_thread_id: responseData.internetMessageId,
                 email_graph_message_id: responseData.graphMessageId
               })
               .eq('id', data.id);
          } else if (funcError || (responseData && responseData.success === false)) {
            const errorMsg = funcError?.message || responseData?.error || 'Erro desconhecido na função de e-mail';
            console.error('Erro ao enviar e-mail PCM:', errorMsg);
            toast.error(`Solicitação criada, mas o e-mail falhou: ${errorMsg}`);
          }
        }
      }
    } catch (e) {
      console.error('Falha ao enviar e-mail para Almoxarifado:', e);
    }

    return data;
  },

  async updateRequest(id: string, requestData: Partial<PcmRequest>, file?: File, currentUser?: { id: string, email: string }): Promise<PcmRequest> {
    if (!currentUser || !currentUser.id) throw new Error('Usuário autenticado não encontrado');
    const userId = currentUser.id;

    let anexo_pcm_url = requestData.anexo_pcm_url;
    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(7)}_${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('pcm-anexos')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('pcm-anexos')
        .getPublicUrl(filePath);
        
      anexo_pcm_url = urlData.publicUrl;
    }

    const { data, error } = await supabase
      .from('pcm_solicitacoes_compras')
      .update({
        ...requestData,
        ...(anexo_pcm_url && { anexo_pcm_url })
      })
      .eq('id', id)
      .select('*, fazenda:fazendas(nome)')
      .single();

    if (error) throw error;
    return data;
  },

  async deleteRequest(id: string): Promise<void> {
    const { error } = await supabase
      .from('pcm_solicitacoes_compras')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async confirmRequest(id: string, almoxData: Partial<PcmRequest>, file?: File, currentUser?: { id: string, email: string }): Promise<PcmRequest> {
    if (!currentUser || !currentUser.id || !currentUser.email) throw new Error('Usuário autenticado não encontrado ou sem email');
    const userId = currentUser.id;

    let anexo_almox_url = '';
    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `almox_${Math.random().toString(36).substring(7)}_${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('pcm-anexos')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('pcm-anexos')
        .getPublicUrl(filePath);
        
      anexo_almox_url = urlData.publicUrl;
    }

    const { data, error } = await supabase
      .from('pcm_solicitacoes_compras')
      .update({
        ...almoxData,
        status: 'COMPLETED',
        data_confirmacao: new Date().toISOString(),
        confirmed_by: userId,
        anexo_almox_url: anexo_almox_url || null
      })
      .eq('id', id)
      .select('*, fazenda:fazendas(nome)')
      .single();

    if (error) throw error;

    // Send Email to Compras
    try {
      const { data: paramData } = await supabase
        .from('system_parameters')
        .select('value')
        .eq('key', `almox_to_compras_${data.fazenda_id}`)
        .single();
        
      if (paramData && paramData.value) {
        let to: string[] = [];
        let cc: string[] = [];
        try {
          const parsed = JSON.parse(paramData.value);
          to = (parsed.to || '').split(/[;,]/).map((e: string) => e.trim()).filter((e: string) => e);
          cc = (parsed.cc || '').split(/[;,]/).map((e: string) => e.trim()).filter((e: string) => e);
        } catch {
          to = paramData.value.split(/[;,]/).map((e: string) => e.trim()).filter((e: string) => e);
        }

        if (to.length > 0) {
          const originalSubject = `[SIGA] Nova Solicitação PCM - ${data.num_requisicao} (${data.maquina})`;
          
          const emailHtml = `
            <h2>Confirmação de Solicitação de Compras</h2>
            <p>O Almoxarifado confirmou uma nova Solicitação de Compra requerida pelo PCM.</p>
            <hr>
            <p><strong>Fazenda:</strong> ${data.fazenda?.nome || 'N/A'}</p>
            <p><strong>Número SC:</strong> <strong style="color: green">${almoxData.sc_numero}</strong></p>
            <p><strong>Máquina:</strong> ${data.maquina}</p>
            <p><strong>Requisição:</strong> ${data.num_requisicao}</p>
            <p><strong>Prioridade:</strong> ${data.prioridade}</p>
            <p><strong>Observações Almoxarifado:</strong> ${almoxData.obs_almox || '-'}</p>
          `;
          
          const { data: responseData, error: funcError } = await supabase.functions.invoke('send-email', {
            body: {
              to,
              cc: cc.length > 0 ? cc : undefined,
              subject: `[Solicitação PCM] Solicitação de Compras Gerada - SC: ${almoxData.sc_numero} (Req: ${data.num_requisicao}) | ${data.fazenda?.nome || 'N/A'} | Máquina ${data.maquina}`,
              htmlBody: emailHtml,
              fromEmail: currentUser.email,
              replyToGraphMessageId: data.email_graph_message_id || undefined,
              replyToInternetMessageId: data.email_thread_id || undefined,
              attachments: file ? [{
                name: file.name,
                contentType: file.type,
                contentBytes: await fileToBase64(file)
              }] : undefined
            }
          });

          if (!funcError && (responseData?.graphMessageId || responseData?.internetMessageId)) {
            // Atualizar IDs se o e-mail de resposta gerou novos (opcional, mas bom para debug)
            await supabase
              .from('pcm_solicitacoes_compras')
              .update({
                email_thread_id: responseData.internetMessageId || data.email_thread_id,
                email_graph_message_id: responseData.graphMessageId || data.email_graph_message_id
              })
              .eq('id', data.id);
          } else if (funcError || (responseData && responseData.success === false)) {
            const errorMsg = funcError?.message || responseData?.error || 'Erro desconhecido na função de e-mail';
            console.error('Erro ao enviar e-mail de confirmação PCM:', errorMsg);
            toast.error(`Confirmação salva, mas aviso por e-mail falhou: ${errorMsg}`);
          }
        }
      }
    } catch (e) {
      console.error('Falha ao enviar e-mail para Compras/Reply:', e);
    }

    return data;
  },

  async cancelRequest(id: string, motivo: string, currentUser?: { id: string, email: string }): Promise<void> {
    if (!currentUser || !currentUser.id || !currentUser.email) throw new Error('Usuário autenticado não encontrado');

    const { data, error } = await supabase
      .from('pcm_solicitacoes_compras')
      .update({
        status: 'CANCELLED',
        motivo_cancelamento: motivo
      })
      .eq('id', id)
      .select('*, fazenda:fazendas(nome)')
      .single();

    if (error) throw error;

    // Send Email to Almoxarifado informing about cancellation
    try {
      const { data: paramData } = await supabase
        .from('system_parameters')
        .select('value')
        .eq('key', `pcm_to_almox_${data.fazenda_id}`)
        .single();
        
      if (paramData && paramData.value) {
        let to: string[] = [];
        let cc: string[] = [];
        try {
          const parsed = JSON.parse(paramData.value);
          to = (parsed.to || '').split(/[;,]/).map((e: string) => e.trim()).filter((e: string) => e);
          cc = (parsed.cc || '').split(/[;,]/).map((e: string) => e.trim()).filter((e: string) => e);
        } catch {
          to = paramData.value.split(/[;,]/).map((e: string) => e.trim()).filter((e: string) => e);
        }

        if (to.length > 0) {
          const emailHtml = `
            <h2>Solicitação de Compras CANCELADA</h2>
            <p>O usuário criador cancelou a seguinte requisição:</p>
            <hr>
            <p><strong>Fazenda:</strong> ${data.fazenda?.nome || 'N/A'}</p>
            <p><strong>Máquina:</strong> ${data.maquina}</p>
            <p><strong>Requisição:</strong> ${data.num_requisicao}</p>
            <p><strong>Motivo do Cancelamento:</strong> <strong style="color: red">${motivo}</strong></p>
            <br>
            <p>Nenhuma ação é necessária por parte do almoxarifado.</p>
          `;
          
          const { data: responseData, error: funcError } = await supabase.functions.invoke('send-email', {
            body: {
              to,
              cc: cc.length > 0 ? cc : undefined,
              subject: `[CANCELADO] Solicitação PCM: ${data.num_requisicao} | ${data.fazenda?.nome || 'N/A'}`,
              htmlBody: emailHtml,
              fromEmail: currentUser.email,
              replyToGraphMessageId: data.email_graph_message_id || undefined,
              replyToInternetMessageId: data.email_thread_id || undefined
            }
          });

          if (funcError || (responseData && responseData.success === false)) {
            console.error('Erro ao enviar e-mail de cancelamento PCM:', funcError || responseData?.error);
            toast.error('Cancelamento salvo, mas aviso por e-mail falhou.');
          }
        }
      }
    } catch (e) {
      console.error('Falha ao enviar e-mail de cancelamento:', e);
    }
  }
};
