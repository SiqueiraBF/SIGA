import { supabase } from '../lib/supabase';

export const farmService = {
    async getFarms() {
        const { data, error } = await supabase
            .from('fazendas')
            .select('id, nome')
            .order('nome');

        if (error) throw error;
        return data || [];
    }
};
