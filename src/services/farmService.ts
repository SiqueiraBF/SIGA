import { supabase } from '../lib/supabase';

export interface Farm {
    id: string;
    nome: string;
    ativo: boolean;
}

export const farmService = {
    async getFarms() {
        const { data, error } = await supabase
            .from('fazendas')
            .select('id, nome, ativo')
            .order('nome');

        if (error) throw error;
        return data || [];
    }
};
