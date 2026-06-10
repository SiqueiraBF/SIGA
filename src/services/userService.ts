import { supabase } from '../lib/supabase';

export const userService = {
    async listUsers() {
        const { data, error } = await supabase
            .from('usuarios')
            .select('id, nome')
            .order('nome');

        if (error) throw error;
        return data || [];
    },

    async listActiveUsers() {
        const { data, error } = await supabase
            .from('usuarios')
            .select('id, nome')
            .eq('ativo', true)
            .order('nome');

        if (error) throw error;
        return data || [];
    }
};
