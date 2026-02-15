import { supabase } from '../lib/supabase';
import type { Material, StockRequest, StockRequestItem } from '../types';

export const stockService = {
    // --- Materials (Catálogo) ---

    async getMaterials(search?: string): Promise<Material[]> {
        let query = supabase
            .from('materials')
            .select('*')
            .eq('active', true)
            .order('name');

        if (search) {
            query = query.or(`name.ilike.%${search}%,unisystem_code.ilike.%${search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async getMaterialById(id: string): Promise<Material | null> {
        const { data, error } = await supabase
            .from('materials')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async getMaterialsByCode(code: string): Promise<Material | null> {
        const { data, error } = await supabase
            .from('materials')
            .select('*')
            .eq('unisystem_code', code)
            .maybeSingle(); // Use maybeSingle to avoid null error if not found

        if (error) throw error;
        return data;
    },

    async getMaterialsByCodes(codes: string[]): Promise<Material[]> {
        if (!codes || codes.length === 0) return [];
        const { data, error } = await supabase
            .from('materials')
            .select('*')
            .in('unisystem_code', codes);

        if (error) throw error;
        return data || [];
    },

    async upsertMaterial(material: Partial<Material>): Promise<Material> {
        const { data, error } = await supabase
            .from('materials')
            .upsert(material)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async toggleMaterialStatus(id: string, active: boolean): Promise<void> {
        const { error } = await supabase
            .from('materials')
            .update({ active })
            .eq('id', id);
        if (error) throw error;
    },

    async updateMaterial(id: string, updates: Partial<Material>): Promise<void> {
        const { error } = await supabase
            .from('materials')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
    },

    async updateMaterialLastExit(id: string, date: string): Promise<void> {
        const { error } = await supabase
            .from('materials')
            .update({ last_exit_date: date })
            .eq('id', id);
        if (error) throw error;
    },

    // --- Requests (Solicitações) ---

    async createRequest(
        farmId: string,
        requesterId: string,
        notes?: string
    ): Promise<StockRequest> {
        const { data, error } = await supabase
            .from('stock_requests')
            .insert({
                farm_id: farmId,
                requester_id: requesterId,
                status: 'DRAFT',
                notes
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getRequests(
        filters?: { farmId?: string; status?: string; requesterId?: string }
    ): Promise<StockRequest[]> {
        let query = supabase
            .from('stock_requests')
            .select(`
        *,
        fazenda:fazendas(nome),
        usuario:usuarios!requester_id(nome, email),
        separator:usuarios!separator_id(nome)
      `)
            .order('created_at', { ascending: false });

        if (filters?.farmId) query = query.eq('farm_id', filters.farmId);
        if (filters?.requesterId) query = query.eq('requester_id', filters.requesterId);
        if (filters?.status) query = query.eq('status', filters.status);

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async getRequestById(id: string): Promise<StockRequest | null> {
        const { data, error } = await supabase
            .from('stock_requests')
            .select(`
                *,
                fazenda:fazendas(nome),
                usuario:usuarios!requester_id(nome, email),
                separator:usuarios!separator_id(nome)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async updateRequestStatus(id: string, status: string, separatorId?: string): Promise<void> {
        const updates: any = { status, updated_at: new Date().toISOString() };
        if (separatorId) updates.separator_id = separatorId;

        const { error } = await supabase
            .from('stock_requests')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
    },

    async deleteRequest(id: string): Promise<void> {
        const { error } = await supabase
            .from('stock_requests')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- Items ---

    async addItem(requestId: string, materialId: string, quantity: number): Promise<StockRequestItem> {
        const { data, error } = await supabase
            .from('stock_request_items')
            .insert({
                request_id: requestId,
                material_id: materialId,
                quantity_requested: quantity,
                status: 'PENDING'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getItems(requestId: string): Promise<StockRequestItem[]> {
        const { data, error } = await supabase
            .from('stock_request_items')
            .select(`
        *,
        material:materials(*)
      `)
            .eq('request_id', requestId);

        if (error) throw error;
        return data || [];
    },

    async updateItemSeparation(itemId: string, quantitySeparated: number, status: string): Promise<void> {
        const { error } = await supabase
            .from('stock_request_items')
            .update({
                quantity_separated: quantitySeparated,
                status
            })
            .eq('id', itemId);

        if (error) throw error;
    },

    async removeItem(itemId: string): Promise<void> {
        const { error } = await supabase
            .from('stock_request_items')
            .delete()
            .eq('id', itemId);
        if (error) throw error;
    },

    async getMaterialHistory(materialId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('stock_request_items')
            .select(`
                quantity_requested,
                quantity_separated,
                status,
                request:stock_requests (
                    id,
                    friendly_id,
                    created_at,
                    status,
                    requester:usuarios!requester_id(nome),
                    farm:fazendas(nome)
                )
            `)
            .eq('material_id', materialId);

        if (error) throw error;

        // Client-side sort by date descending
        return (data || []).sort((a: any, b: any) =>
            new Date(b.request.created_at).getTime() - new Date(a.request.created_at).getTime()
        );
    },

    // --- Image Storage ---

    async uploadMaterialImage(file: File, path: string): Promise<string> {
        // 1. Upload
        const { error: uploadError } = await supabase.storage
            .from('material-images')
            .upload(path, file, { upsert: true });

        if (uploadError) throw uploadError;

        // 2. Get Public URL
        const { data } = supabase.storage
            .from('material-images')
            .getPublicUrl(path);

        return data.publicUrl;
    }
};
