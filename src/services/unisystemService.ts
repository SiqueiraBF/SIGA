import { supabase } from '../lib/supabase';
import { UnisystemInvoice, UnisystemSupplier } from '../types/invoiceTypes';

// MOCK DATA PARA TESTES INICIAIS (Caso tabelas estejam vazias)
const MOCK_SUPPLIERS: Partial<UnisystemSupplier>[] = [
    { name: 'AGROFERTIL S.A.', cnpj: '12.345.678/0001-90' },
    { name: 'TRATORES DO BRASIL LTDA', cnpj: '98.765.432/0001-10' },
    { name: 'POSTO DE COMBUSTIVEL SANTA RITA', cnpj: '11.222.333/0001-55' },
];

export const unisystemService = {
    /**
     * Busca fornecedores por nome ou CNPJ
     * @param query Termo de busca
     */
    async searchSuppliers(query: string): Promise<UnisystemSupplier[]> {
        if (!query) return [];

        // Tenta buscar no banco espelho
        const { data, error } = await supabase
            .from('unisystem_suppliers')
            .select('*')
            .or(`name.ilike.%${query}%,cnpj.ilike.%${query}%`)
            .limit(10);

        if (error) {
            console.error('Erro ao buscar fornecedores:', error);
            return [];
        }

        // Se não tiver nada no banco (fase inicial), retorna mock para não travar o teste
        if (data.length === 0 && query.length > 2) {
            return MOCK_SUPPLIERS.filter(s =>
                s.name?.toLowerCase().includes(query.toLowerCase()) ||
                s.cnpj?.includes(query)
            ) as UnisystemSupplier[];
        }

        return data;
    },

    /**
     * Verifica se uma nota já foi lançada no Unisystem
     * @param cnpj CNPJ do Fornecedor
     * @param number Número da Nota
     */
    async checkInvoiceExists(cnpj: string, number: string): Promise<UnisystemInvoice | null> {
        const { data, error } = await supabase
            .from('unisystem_invoices')
            .select('*')
            .eq('supplier_cnpj', cnpj)
            .eq('invoice_number', number)
            .maybeSingle();

        if (error) {
            console.error('Erro ao verificar duplicidade:', error);
            return null;
        }

        return data;
    },

    /**
     * Retorna todas as NFs lançadas (para relatórios ou simulação)
     */
    async getInvoices(farmId?: string): Promise<UnisystemInvoice[]> {
        let query = supabase.from('unisystem_invoices').select('*').order('entry_date', { ascending: false });

        if (farmId) {
            query = query.eq('farm_id', farmId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    /**
     * Cria um lançamento "fake" no espelho para testar o fluxo de conciliação
     */
    async addMockInvoice(invoice: Partial<UnisystemInvoice>): Promise<UnisystemInvoice> {
        // Garante que o fornecedor existe no espelho antes de lançar a nota (FK)
        if (invoice.supplier_cnpj && invoice.supplier_name) {
            await this.ensureSupplier({
                name: invoice.supplier_name,
                cnpj: invoice.supplier_cnpj
            });
        }

        const { data, error } = await supabase
            .from('unisystem_invoices')
            .insert(invoice)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Cria um fornecedor "fake" no espelho (se não existir)
     */
    async ensureSupplier(supplier: { name: string; cnpj: string }): Promise<UnisystemSupplier> {
        // Check if exists
        const { data: existing } = await supabase
            .from('unisystem_suppliers')
            .select('*')
            .eq('cnpj', supplier.cnpj)
            .maybeSingle();

        if (existing) return existing;

        // Create
        const { data, error } = await supabase
            .from('unisystem_suppliers')
            .insert(supplier)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
