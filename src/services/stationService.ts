import { supabase } from '../lib/supabase';

export const stationService = {
    async getStations(fazendaId?: string, onlyDrainage: boolean = false) {
        let query = supabase
            .from('postos')
            .select('id, nome, fazenda_id')
            .order('nome');

        if (fazendaId) {
            query = query.eq('fazenda_id', fazendaId);
        }

        if (onlyDrainage) {
            // Include explicitly true OR null (default true)
            query = query.or('exibir_na_drenagem.eq.true,exibir_na_drenagem.is.null');
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
    }
};
