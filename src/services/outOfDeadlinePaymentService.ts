import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export interface OutOfDeadlinePayment {
  id: string;
  created_at: string;
  data_doc: string;
  tipo_doc: string;
  n_doc: string;
  fornecedor: string;
  data_vencimento: string;
  data_pgto: string;
  valor: number;
  user_id: string;
  fazenda_id: string;
  setor: string;
  motivo: string;
  justificativa: string;
  action_plan?: string;
  anexos?: string[];
  
  fazenda?: { nome: string };
  usuario?: { nome?: string; email?: string };
}

export interface OutOfDeadlinePaymentSector {
  id: string;
  nome: string;
}

export interface OutOfDeadlinePaymentUnit {
  id: string;
  nome: string;
  ativo: boolean;
}

export const outOfDeadlinePaymentService = {
  async getSectors(): Promise<OutOfDeadlinePaymentSector[]> {
    const { data, error } = await supabase
      .from('out_of_deadline_payment_sectors')
      .select('*')
      .order('nome');
    if (error) throw error;
    return data;
  },

  async createSector(nome: string): Promise<OutOfDeadlinePaymentSector> {
    const { data, error } = await supabase
      .from('out_of_deadline_payment_sectors')
      .insert([{ nome }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteSector(id: string): Promise<void> {
    const { error } = await supabase
      .from('out_of_deadline_payment_sectors')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getUnits(): Promise<OutOfDeadlinePaymentUnit[]> {
    const { data, error } = await supabase
      .from('out_of_deadline_payment_units')
      .select('*')
      .eq('ativo', true)
      .order('nome');
    if (error) throw error;
    return data;
  },

  async getAllUnits(): Promise<OutOfDeadlinePaymentUnit[]> {
    const { data, error } = await supabase
      .from('out_of_deadline_payment_units')
      .select('*')
      .order('nome');
    if (error) throw error;
    return data;
  },

  async createUnit(nome: string): Promise<OutOfDeadlinePaymentUnit> {
    const { data, error } = await supabase
      .from('out_of_deadline_payment_units')
      .insert([{ nome }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async toggleUnitStatus(id: string, ativo: boolean): Promise<void> {
    const { error } = await supabase
      .from('out_of_deadline_payment_units')
      .update({ ativo })
      .eq('id', id);
    if (error) throw error;
  },

  async deleteUnit(id: string): Promise<void> {
    const { error } = await supabase
      .from('out_of_deadline_payment_units')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getPayments(farmId?: string): Promise<OutOfDeadlinePayment[]> {
    let query = supabase
      .from('out_of_deadline_payments')
      .select(`
        *,
        fazenda:out_of_deadline_payment_units(nome),
        usuario:usuarios!out_of_deadline_payments_user_id_fkey(nome)
      `)
      .order('created_at', { ascending: false });

    if (farmId) {
      query = query.eq('fazenda_id', farmId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createPayment(paymentData: Partial<OutOfDeadlinePayment>, currentUser?: { id: string, email: string }, files?: File[]): Promise<OutOfDeadlinePayment> {
    if (!currentUser || !currentUser.id || !currentUser.email) throw new Error('Usuário autenticado não encontrado ou sem email');
    const userId = currentUser.id;

    let anexos: string[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${paymentData.fazenda_id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('out_of_deadline_attachments')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload Error:', uploadError);
          throw new Error('Erro ao fazer upload do anexo: ' + uploadError.message);
        }

        const { data: urlData } = supabase.storage.from('out_of_deadline_attachments').getPublicUrl(fileName);
        anexos.push(urlData.publicUrl);
      }
    }

    const { data, error } = await supabase
      .from('out_of_deadline_payments')
      .insert([{
        ...paymentData,
        anexos: anexos.length > 0 ? anexos : undefined,
        user_id: userId
      }])
      .select('*, fazenda:out_of_deadline_payment_units(nome), usuario:usuarios!out_of_deadline_payments_user_id_fkey(nome)')
      .single();

    if (error) throw error;

    // Disparar e-mail de notificação
    try {
      const { data: paramData } = await supabase
        .from('system_parameters')
        .select('value')
        .eq('key', `pagamentos_atrasados_${paymentData.fazenda_id}`)
        .single();
        
      if (paramData && paramData.value) {
        let to: string[] = [];
        let cc: string[] = [];
        try {
          const parsed = JSON.parse(paramData.value);
          to = (parsed.to || '').split(';').map((e: string) => e.trim()).filter((e: string) => e);
          cc = (parsed.cc || '').split(';').map((e: string) => e.trim()).filter((e: string) => e);
        } catch {
          to = paramData.value.split(';').map((e: string) => e.trim()).filter((e: string) => e);
        }

        if (to.length > 0) {
          const emailHtml = `
            <h2>Nova Autorização de Pagamento Fora do Prazo</h2>
            <p>Um novo lançamento de pagamento fora do prazo foi registrado no sistema.</p>
            <hr>
            <p><strong>Unidade:</strong> ${data.fazenda?.nome || 'N/A'}</p>
            <p><strong>Fornecedor:</strong> ${paymentData.fornecedor}</p>
            <p><strong>Tipo Doc:</strong> ${paymentData.tipo_doc} - <strong>Nº:</strong> ${paymentData.n_doc}</p>
            <p><strong>Valor:</strong> R$ ${Number(paymentData.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p><strong>Data Vencimento:</strong> ${new Date(paymentData.data_vencimento as string).toLocaleDateString('pt-BR')}</p>
            <p><strong>Data Pagamento:</strong> ${new Date(paymentData.data_pgto as string).toLocaleDateString('pt-BR')}</p>
            <br>
            <p><strong>Lançado por:</strong> ${data.usuario?.nome || 'N/A'} (Setor: ${paymentData.setor})</p>
            <p><strong>Motivo:</strong> ${paymentData.motivo}</p>
            <p><strong>Justificativa:</strong> ${paymentData.justificativa}</p>
            ${paymentData.action_plan ? `<p><strong>Plano de Ação:</strong> ${paymentData.action_plan}</p>` : ''}
            <br>
            <p>Acesse o sistema SIGA para visualizar os detalhes e imprimir o formulário de aprovação.</p>
          `;
          
          let emailAttachments: any[] = [];
          
          if (files && files.length > 0) {
            emailAttachments = await Promise.all(
              files.map(async (file) => {
                return new Promise((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => {
                    const base64String = (reader.result as string).split(',')[1];
                    resolve({
                      name: file.name,
                      contentType: file.type || 'application/octet-stream',
                      contentBytes: base64String
                    });
                  };
                  reader.onerror = reject;
                  reader.readAsDataURL(file);
                });
              })
            );
          }

          const { data: responseData, error: funcError } = await supabase.functions.invoke('send-email', {
            body: {
              to,
              cc: cc.length > 0 ? cc : undefined,
              subject: `[SIGA] Pagamento Fora do Prazo: ${paymentData.fornecedor} - R$ ${Number(paymentData.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              htmlBody: emailHtml,
              fromEmail: currentUser.email,
              attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
            }
          });

          if (funcError || (responseData && responseData.success === false)) {
            const errorMsg = funcError?.message || responseData?.error || 'Erro desconhecido na função de e-mail';
            console.error('Erro ao enviar e-mail de pagamento fora do prazo:', errorMsg);
            toast.error(`Lançamento criado, mas o aviso por e-mail falhou: ${errorMsg}`);
          }
        }
      }
    } catch (e) {
      console.error('Falha ao processar e-mail de notificação:', e);
    }

    return data;
  },

  async deletePayment(id: string): Promise<void> {
    const { error } = await supabase
      .from('out_of_deadline_payments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
