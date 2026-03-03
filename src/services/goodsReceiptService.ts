import { supabase } from '../lib/supabase';
import { GoodsReceipt, GoodsExit } from '../types';

export const goodsReceiptService = {
    async createReceipt(data: Omit<GoodsReceipt, 'id' | 'created_at' | 'exit_at' | 'driver_name' | 'observation_exit'>) {
        const { data: receipt, error } = await supabase
            .from('goods_receipts')
            .insert(data)
            .select()
            .single();

        if (error) throw error;
        return receipt;
    },

    async getPendingReceipts(): Promise<GoodsReceipt[]> {
        const { data, error } = await supabase
            .from('goods_receipts')
            .select(`
        *,
        destination_farm:destination_farm_id (nome),
        receiver:receiver_id (nome, email)
      `)
            .is('exit_id', null)
            .order('entry_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async getCompletedReceipts(startDate: string, endDate: string) {
        const { data, error } = await supabase
            .from('goods_receipts')
            .select(`
          *,
          destination_farm:destination_farm_id (nome),
          receiver:receiver_id (nome, email)
        `)
            .not('exit_at', 'is', null)
            .gte('exit_at', startDate)
            .lte('exit_at', endDate)
            .order('exit_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async createExit(data: { destination_farm_id: string; driver_name: string; exit_date: string; observation?: string; created_by: string }) {
        const { data: exit, error } = await supabase
            .from('goods_exits')
            .insert(data)
            .select()
            .single();

        if (error) throw error;
        return exit;
    },

    async dispatchReceipts(ids: string[], exit: GoodsExit) {
        const { data, error } = await supabase
            .from('goods_receipts')
            .update({
                exit_id: exit.id,
                exit_at: exit.exit_date,
                driver_name: exit.driver_name,
                observation_exit: exit.observation
            })
            .in('id', ids)
            .select();

        if (error) throw error;
        return data;
    },

    async getExits() {
        const { data, error } = await supabase
            .from('goods_exits')
            .select(`
                *,
                destination_farm:destination_farm_id (nome),
                creator:created_by (nome),
                items:goods_receipts (count)
            `)
            .order('exit_date', { ascending: false });

        if (error) throw error;

        // Transform items count
        return data?.map(item => ({
            ...item,
            items_count: item.items ? item.items[0].count : 0
        })) || [];
    },

    async getExitDetails(exitId: string) {
        // Get Exit Info
        const { data: exit, error: exitError } = await supabase
            .from('goods_exits')
            .select(`
                *,
                destination_farm:destination_farm_id (nome),
                creator:created_by (nome)
            `)
            .eq('id', exitId)
            .single();

        if (exitError) throw exitError;

        // Get Linked Receipts
        const { data: receipts, error: receiptsError } = await supabase
            .from('goods_receipts')
            .select(`
                *,
                destination_farm:destination_farm_id (nome),
                receiver:receiver_id (nome)
            `)
            .eq('exit_id', exitId)
            .order('entry_at', { ascending: true });

        if (receiptsError) throw receiptsError;

        return { exit, receipts };
    },

    async getAllReceipts() {
        const { data, error } = await supabase
            .from('goods_receipts')
            .select(`
                *,
                destination_farm:destination_farm_id (nome),
                receiver:receiver_id (nome),
                exit:exit_id (
                    sequential_id,
                    driver_name,
                    exit_date
                )
            `)
            .order('entry_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },


    async updateReceipt(id: string, data: Partial<GoodsReceipt>) {
        const { data: receipt, error } = await supabase
            .from('goods_receipts')
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return receipt;
    },

    async deleteReceipt(id: string) {
        const { error } = await supabase
            .from('goods_receipts')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async updateExit(id: string, data: Partial<GoodsExit>) {
        const { data: exit, error } = await supabase
            .from('goods_exits')
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return exit;
    },

    async deleteExit(id: string) {
        // 1. Unlink receipts first (set exit_id to null)
        const { error: unlinkError } = await supabase
            .from('goods_receipts')
            .update({ exit_id: null, exit_at: null }) // Clear legacy fields too if present
            .eq('exit_id', id);

        if (unlinkError) throw unlinkError;

        // 2. Delete the exit
        const { error } = await supabase
            .from('goods_exits')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async getDistinctSuppliers() {
        const { data, error } = await supabase
            .from('goods_receipts')
            .select('supplier')
            .order('supplier');

        if (error) throw error;

        // Return unique suppliers
        const suppliers = data?.map(item => item.supplier) || [];
        return [...new Set(suppliers)];
    }
};
