import { supabase } from '../lib/supabase';

export interface LatePayment {
  id: string;
  company: string;
  document_number: string;
  supplier_client: string;
  cpf_cnpj: string;
  original_value: number;
  adjustment_type: 'JUROS' | 'DESCONTO';
  adjustment_value: number;
  final_value: number;
  issue_date: string;
  due_date: string;
  payment_date: string;
  responsible: string;
  justification: string;
  document_type?: string;
  motivo?: string;
  action_plan?: string;
  created_at: string;
}

export type CreateLatePaymentInput = Omit<LatePayment, 'id' | 'created_at'>;

export const latePaymentService = {
  async getLatePayments(): Promise<LatePayment[]> {
    const { data, error } = await supabase
      .from('late_payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching late payments:', error);
      throw error;
    }

    return data || [];
  },

  async createLatePayment(input: CreateLatePaymentInput): Promise<LatePayment> {
    const { data, error } = await supabase
      .from('late_payments')
      .insert([input])
      .select()
      .single();

    if (error) {
      console.error('Error creating late payment:', error);
      throw error;
    }

    return data;
  },

  async deleteLatePayment(id: string): Promise<void> {
    const { error } = await supabase
      .from('late_payments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting late payment:', error);
      throw error;
    }
  }
};
