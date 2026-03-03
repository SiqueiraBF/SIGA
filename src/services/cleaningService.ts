import { supabase } from '../lib/supabase';
import { startOfWeek, endOfWeek, format } from 'date-fns';

export interface CleaningRegistry {
    id: string;
    fazenda_id: string;
    usuario_id: string;
    data: string; // "YYYY-MM-DD"
    tipo: 'ALMOXARIFADO' | 'POSTO';
    fotos: string[];
    observacoes?: string;
    created_at: string;

    // Relations
    fazenda?: { nome: string };
    usuario?: { nome: string };
}

export const cleaningService = {
    async getCleanings(filters?: {
        fazenda_id?: string;
        dataInicio?: string;
        dataFim?: string;
        tipo?: string;
    }) {
        let query = supabase
            .from('cleaning_registries')
            .select(`
                *,
                fazenda:fazendas(nome),
                usuario:usuarios(nome)
            `)
            .order('data', { ascending: false });

        if (filters?.fazenda_id) {
            query = query.eq('fazenda_id', filters.fazenda_id);
        }
        if (filters?.tipo) {
            query = query.eq('tipo', filters.tipo);
        }
        if (filters?.dataInicio) {
            query = query.gte('data', filters.dataInicio);
        }
        if (filters?.dataFim) {
            query = query.lte('data', filters.dataFim);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data || []) as CleaningRegistry[];
    },

    async createCleaning(
        cleaning: Omit<CleaningRegistry, 'id' | 'created_at' | 'fotos' | 'fazenda' | 'usuario'>,
        photos: File[]
    ) {
        // 1. Upload Photos to 'cleaning-photos'
        const photoUrls: string[] = [];

        for (const file of photos) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${cleaning.fazenda_id}/${new Date().getFullYear()}/${cleaning.tipo}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('cleaning-photos')
                .upload(fileName, file);

            if (uploadError) {
                console.error('Error uploading cleaning photo:', uploadError);
                throw new Error(`Falha no upload da foto ${file.name}: ${uploadError.message}`);
            }

            const { data: { publicUrl } } = supabase.storage
                .from('cleaning-photos')
                .getPublicUrl(fileName);

            photoUrls.push(publicUrl);
        }

        // 2. Insert Record
        const { data, error } = await supabase
            .from('cleaning_registries')
            .insert({
                ...cleaning,
                fotos: photoUrls
            })
            .select()
            .single();

        if (error) throw error;
        return data as CleaningRegistry;
    },

    async deleteCleaning(id: string) {
        const { error } = await supabase
            .from('cleaning_registries')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async getWeeklyStatus(fazendaId?: string) {
        // Returns status for current week: { almoxarifado: boolean, posto: boolean }
        // Almoxarifado = Monday, Posto = Friday (Business Rule)

        if (!fazendaId) return { almoxarifado: false, posto: false };

        const today = new Date();
        const start = startOfWeek(today, { weekStartsOn: 1 }); // Monday
        const end = endOfWeek(today, { weekStartsOn: 1 });

        const startStr = format(start, 'yyyy-MM-dd');
        const endStr = format(end, 'yyyy-MM-dd');

        const { data, error } = await supabase
            .from('cleaning_registries')
            .select('tipo')
            .eq('fazenda_id', fazendaId)
            .gte('data', startStr)
            .lte('data', endStr);

        if (error) {
            console.error('Error fetching weekly status:', error);
            return { almoxarifado: false, posto: false };
        }

        const almoxarifadoDone = data?.some(r => r.tipo === 'ALMOXARIFADO') || false;
        const postoDone = data?.some(r => r.tipo === 'POSTO') || false;

        return { almoxarifado: almoxarifadoDone, posto: postoDone };
    },

    async getAllFarmsWeeklyStatus() {
        // 1. Get Monitored Farms Config
        const { data: configData } = await supabase
            .from('system_parameters')
            .select('value')
            .eq('key', 'cleaning_monitored_farms')
            .single();

        let monitoredIds: string[] = [];
        if (configData?.value) {
            try {
                monitoredIds = JSON.parse(configData.value);
            } catch (e) {
                console.error('Error parsing monitored farms:', e);
            }
        }

        // 2. Get all active farms
        let query = supabase
            .from('fazendas')
            .select('id, nome')
            .eq('ativo', true)
            .order('nome');

        // If we have a list of monitored farms, strictly filter by it
        // If no list is set (first time), maybe default to all? 
        // For now, if list exists, use it.
        if (monitoredIds.length > 0) {
            query = query.in('id', monitoredIds);
        }

        const { data: fazendas, error: fazendasError } = await query;
        if (fazendasError) throw fazendasError;
        if (!fazendas) return [];

        // 3. Get LAST cleaning registry for each type for these farms
        // We want the LATEST date, regardless of if it's this week or not.
        // Doing this efficiently for many farms is tricky in one query without a complex join.
        // A simple approach: Get all recent cleanings (e.g. last 30 days) or just get all and process in memory if dataset is small.
        // Better: Use a distinct on query if supported, or just fetch last cleaning for each farm.

        // Since we need "Last Date", let's fetch cleanings for these farms. 
        // We optimize by fetching only necessary fields.
        const { data: registries, error: regError } = await supabase
            .from('cleaning_registries')
            .select('fazenda_id, tipo, data')
            .in('fazenda_id', fazendas.map(f => f.id))
            .order('data', { ascending: false });

        if (regError) throw regError;

        // 4. Map status per farm
        return fazendas.map(fazenda => {
            const farmRegistries = registries?.filter(r => r.fazenda_id === fazenda.id) || [];

            const lastAlmoxarifado = farmRegistries.find(r => r.tipo === 'ALMOXARIFADO');
            const lastPosto = farmRegistries.find(r => r.tipo === 'POSTO');

            return {
                id: fazenda.id,
                nome: fazenda.nome,
                almoxarifadoDate: lastAlmoxarifado ? lastAlmoxarifado.data : null, // New field
                postoDate: lastPosto ? lastPosto.data : null // New field
            };
        });
    }
};
