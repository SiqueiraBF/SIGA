import { supabase } from '../lib/supabase';
import { DirectReceipt } from '../types';

export const directReceiptService = {
    async getDirectReceipts(filters?: {
        fazenda_id?: string;
        dataInicio?: string;
        dataFim?: string;
        search?: string;
        limit?: number;
        offset?: number;
    }) {
        let query = supabase
            .from('direct_receipts')
            .select(`
                *,
                usuario:usuario_id (nome),
                fazenda:fazenda_id (nome)
            `, { count: 'exact' })
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
        if (filters?.search) {
            const s = `%${filters.search}%`;
            query = query.or(`nota_fiscal.ilike.${s},fornecedor.ilike.${s},responsavel.ilike.${s}`);
        }

        // Pagination
        const limit = filters?.limit || 50;
        const offset = filters?.offset || 0;
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (error) throw error;
        
        return {
            data: data as DirectReceipt[],
            count: count || 0
        };
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
    },

    async updateDirectReceipt(id: string, data: Partial<Omit<DirectReceipt, 'id' | 'created_at' | 'usuario' | 'fazenda'>>): Promise<DirectReceipt> {
        const { data: record, error } = await supabase
            .from('direct_receipts')
            .update(data)
            .eq('id', id)
            .select(`
        *,
        usuario:usuario_id(nome),
        fazenda:fazenda_id(nome)
      `)
            .single();

        if (error) throw error;
        return record;
    }
};
