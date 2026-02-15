import { supabase } from '../lib/supabase';
import { PendingInvoice, InvoiceKPIs } from '../types/invoiceTypes';

export const invoiceService = {
    /**
     * Lista NFs pendentes com filtros
     */
    async getInvoices(farmId?: string, status: 'Pendente' | 'Conciliada' | 'Cancelada' = 'Pendente'): Promise<PendingInvoice[]> {
        let query = supabase
            .from('pending_invoices')
            .select('*, farm:fazendas(nome), unisystem_supplier:unisystem_suppliers(name, cnpj)')
            .eq('status', status)
            .order('delivery_date', { ascending: status === 'Pendente' });

        if (status === 'Conciliada') {
            query = query.order('updated_at', { ascending: false }).limit(50);
        }

        if (farmId) {
            query = query.eq('farm_id', farmId);
        }

        const { data, error } = await query;
        if (error) throw error;

        const invoices = data as unknown as PendingInvoice[];

        // AUTO-CONCILIAÇÃO (Lazy) - Apenas para pendentes
        if (status === 'Pendente') {
            const confirmedPending: PendingInvoice[] = [];

            for (const invoice of invoices) {
                const { data: match } = await supabase
                    .from('unisystem_invoices')
                    .select('id')
                    .eq('invoice_number', invoice.invoice_number)
                    .or(invoice.supplier_cnpj
                        ? `supplier_cnpj.eq.${invoice.supplier_cnpj}`
                        : `supplier_name.ilike.${invoice.supplier_name}`)
                    .maybeSingle();

                if (match) {
                    await supabase
                        .from('pending_invoices')
                        .update({ status: 'Conciliada' })
                        .eq('id', invoice.id);
                } else {
                    confirmedPending.push(invoice);
                }
            }
            return confirmedPending;
        }

        return invoices;
    },

    /**
     * Cria uma ou várias notas pendentes (Batch)
     */
    async createPendingInvoices(invoices: Partial<PendingInvoice>[]): Promise<PendingInvoice[]> {
        const { data, error } = await supabase
            .from('pending_invoices')
            .insert(invoices)
            .select();

        if (error) throw error;
        return data as PendingInvoice[];
    },

    /**
     * Atualiza status da nota
     */
    async updateStatus(id: string, status: 'Conciliada' | 'Cancelada'): Promise<void> {
        const { error } = await supabase
            .from('pending_invoices')
            .update({ status })
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Calcula KPIs simples
     */
    async getKPIs(farmId?: string): Promise<InvoiceKPIs> {
        const invoices = await this.getInvoices(farmId, 'Pendente');

        const count = invoices.length;
        let totalDelay = 0;
        let oldestDate: Date | null = null;

        if (count > 0) {
            const now = new Date();

            invoices.forEach(inv => {
                const delivery = new Date(inv.delivery_date);
                const diffTime = Math.abs(now.getTime() - delivery.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                totalDelay += diffDays;

                if (!oldestDate || delivery < oldestDate) {
                    oldestDate = delivery;
                }
            });
        }

        return {
            pending_count: count,
            avg_delay_days: count > 0 ? Math.floor(totalDelay / count) : 0,
            oldest_pending_date: oldestDate ? (oldestDate as Date).toISOString() : null
        };
    }
};
