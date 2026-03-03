import { supabase } from '../lib/supabase';

export interface StationDrainage {
    id: string;
    posto_id: string;
    fazenda_id: string;
    usuario_id: string;
    data_drenagem: string;
    litros_drenados: number;
    aspecto_residuo: string;
    destino_residuo: string;
    fotos: string[];
    observacoes?: string;
    tanque_identificador?: string | null;
    email_status?: 'pending' | 'sent' | 'error';
    email_error?: string | null;
    created_at: string;

    // Relations
    posto?: { nome: string };
    fazenda?: { nome: string };
    usuario?: { nome: string };
}

export const drainageService = {
    async getDrainages(filters?: {
        fazenda_id?: string;
        posto_id?: string;
        usuario_id?: string;
        dataInicio?: string;
        dataFim?: string;
    }) {
        let query = supabase
            .from('station_drainages')
            .select(`
        *,
        posto:postos(nome),
        fazenda:fazendas(nome),
        usuario:usuarios(nome)
      `)
            .order('data_drenagem', { ascending: false });

        if (filters?.fazenda_id) {
            query = query.eq('fazenda_id', filters.fazenda_id);
        }
        if (filters?.posto_id) {
            query = query.eq('posto_id', filters.posto_id);
        }
        if (filters?.usuario_id) {
            query = query.eq('usuario_id', filters.usuario_id);
        }
        if (filters?.dataInicio) {
            query = query.gte('data_drenagem', filters.dataInicio);
        }
        if (filters?.dataFim) {
            query = query.lte('data_drenagem', filters.dataFim);
        }

        const { data, error } = await query;

        if (error) throw error;
        return (data || []) as StationDrainage[];
    },

    async getDistinctFarms() {
        // Fetch all drainage records to extract unique farms
        const { data, error } = await supabase
            .from('station_drainages')
            .select('fazenda:fazendas(id, nome)')
            .not('fazenda_id', 'is', null);

        if (error) throw error;

        // Deduping
        const uniqueFarms = new Map();
        data?.forEach((item: any) => {
            if (item.fazenda) {
                uniqueFarms.set(item.fazenda.id, item.fazenda);
            }
        });

        return Array.from(uniqueFarms.values()).sort((a, b) => a.nome.localeCompare(b.nome));
    },

    async getDistinctUsers() {
        // Fetch all drainage records to extract unique users
        const { data, error } = await supabase
            .from('station_drainages')
            .select('usuario:usuarios(id, nome)')
            .not('usuario_id', 'is', null);

        if (error) throw error;

        // Deduping
        const uniqueUsers = new Map();
        data?.forEach((item: any) => {
            if (item.usuario) {
                uniqueUsers.set(item.usuario.id, item.usuario);
            }
        });

        return Array.from(uniqueUsers.values()).sort((a, b) => a.nome.localeCompare(b.nome));
    },

    async getFarmsWithDrainageStations() {
        // Get farms that have at least one station with exibir_na_drenagem = true (or null)
        const { data, error } = await supabase
            .from('fazendas')
            .select(`
                id, 
                nome,
                postos!inner(id, exibir_na_drenagem)
            `)
            .eq('ativo', true)
            .or('exibir_na_drenagem.eq.true,exibir_na_drenagem.is.null', { foreignTable: 'postos' })
            .order('nome');

        if (error) throw error;

        // Transform to match Fazenda interface (remove postos array)
        return data.map((f: any) => ({
            id: f.id,
            nome: f.nome,
            ativo: true
        }));
    },

    // New method for Dashboard stats
    async getLatestDrainagesByStation(fazendaId?: string) {
        let query = supabase
            .from('station_drainages')
            .select('posto_id, fazenda_id, data_drenagem')
            .order('data_drenagem', { ascending: false });

        if (fazendaId) {
            query = query.eq('fazenda_id', fazendaId);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data as { posto_id: string; fazenda_id: string; data_drenagem: string; tanque_identificador?: string }[];
    },

    async createDrainage(
        drainage: Omit<StationDrainage, 'id' | 'created_at' | 'posto' | 'fazenda' | 'usuario' | 'fotos'>,
        photos: File[]
    ) {
        // 1. Upload Photos
        const photoUrls: string[] = [];

        for (const file of photos) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${drainage.fazenda_id}/${new Date().getFullYear()}/${drainage.posto_id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('drainage-photos')
                .upload(filePath, file);

            if (uploadError) {
                console.error('Error uploading photo:', uploadError);
                throw new Error(`Falha no upload da foto ${file.name}: ${uploadError.message}`);
            }

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('drainage-photos')
                .getPublicUrl(filePath);

            photoUrls.push(publicUrl);
        }

        // 2. Insert Record
        const { data, error } = await supabase
            .from('station_drainages')
            .insert({
                ...drainage,
                fotos: photoUrls
            })
            .select()
            .single();

        if (error) throw error;
        return data as StationDrainage;
    },

    async updateDrainage(
        id: string,
        updates: Partial<Omit<StationDrainage, 'id' | 'created_at' | 'posto' | 'fazenda' | 'usuario'>>,
        newPhotos?: File[]
    ) {
        let photoUrls = updates.fotos || [];

        // Upload new photos if any
        if (newPhotos && newPhotos.length > 0) {
            // Needed context for path (fazenda_id, posto_id). 
            // Ideally we should pass them or fetch current record. 
            // For simplicity, we'll try to use what's in 'updates' or default to specific structure if missing, 
            // but getting the record first is safer.
            const { data: current } = await supabase.from('station_drainages').select('fazenda_id, posto_id').eq('id', id).single();

            if (current) {
                for (const file of newPhotos) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${current.fazenda_id}/${new Date().getFullYear()}/${current.posto_id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

                    const { error: uploadError } = await supabase.storage
                        .from('drainage-photos')
                        .upload(fileName, file);

                    if (!uploadError) {
                        const { data: { publicUrl } } = supabase.storage
                            .from('drainage-photos')
                            .getPublicUrl(fileName);
                        photoUrls.push(publicUrl);
                    }
                }
            }
        }

        const { data, error } = await supabase
            .from('station_drainages')
            .update({ ...updates, fotos: photoUrls })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as StationDrainage;
    },

    async deleteDrainage(id: string) {
        const { error } = await supabase
            .from('station_drainages')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async updateEmailStatus(ids: string[], status: 'sent' | 'error', errorMsg?: string) {
        const { error } = await supabase
            .from('station_drainages')
            .update({
                email_status: status,
                email_error: errorMsg || null
            })
            .in('id', ids);

        if (error) {
            console.error('Error updating email status:', error);
        }
    }
};
