import { supabase } from '../lib/supabase';
import { DirectReceipt } from '../types';

export const directReceiptService = {
    async getDirectReceipts(filters?: {
        fazenda_id?: string;
        dataInicio?: string;
        dataFim?: string;
    }) {
        let query = supabase
            .from('direct_receipts')
            .select(`
        *,
        usuario:usuario_id (nome),
        fazenda:fazenda_id (nome)
      `)
            .order('created_at', { ascending: false });

        if (filters?.fazenda_id) {
            query = query.eq('fazenda_id', filters.fazenda_id);
        }
        if (filters?.dataInicio) {
            query = query.gte('data_emissao', filters.dataInicio);
        }
        if (filters?.dataFim) {
            query = query.lte('data_emissao', filters.dataFim);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as DirectReceipt[];
    },

    async createDirectReceipt(data: Omit<DirectReceipt, 'id' | 'created_at' | 'usuario' | 'fazenda'>): Promise<DirectReceipt> {
        const { data: record, error } = await supabase
            .from('direct_receipts')
            .insert(data)
            .select(`
        *,
        usuario:usuario_id(nome),
        fazenda:fazenda_id(nome)
      `)
            .single();

        if (error) throw error;
        return record;
    },

    async createDirectReceiptBulk(items: Omit<DirectReceipt, 'id' | 'created_at' | 'usuario' | 'fazenda'>[]): Promise<DirectReceipt[]> {
        const { data: records, error } = await supabase
            .from('direct_receipts')
            .insert(items)
            .select(`
        *,
        usuario:usuario_id(nome),
        fazenda:fazenda_id(nome)
      `);

        if (error) throw error;
        return records || [];
    },

    async deleteDirectReceipt(id: string): Promise<void> {
        const { error } = await supabase
            .from('direct_receipts')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
