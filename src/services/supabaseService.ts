import { supabase } from '../lib/supabase';
import type {
  Solicitacao,
  Fazenda,
  Usuario,
  ItemSolicitacao,
  Funcao,
  IntegrationConfig,
  AuditLog,
} from '../types';

export const db = {
  // Requests (Solicitações)
  async getRequests(user?: Usuario | null): Promise<Solicitacao[]> {
    if (!user) return [];

    const { data, error } = await supabase
      .from('solicitacoes')
      .select('id, numero, data_abertura, status, prioridade, fazenda_id, usuario_id, created_at')
      .order('data_abertura', { ascending: false });

    if (error) {
      console.error('Error fetching requests:', error);
      throw error;
    }
    return data || [];
  },

  async getRequestsOptimized(page = 1, pageSize = 50): Promise<{ data: any[], totalCount: number }> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('solicitacoes')
      .select(`
        *,
        fazenda:fazendas(nome),
        usuario:usuarios(nome),
        item_count:itens_solicitacao(count)
      `, { count: 'exact' })
      .order('data_abertura', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error in getRequestsOptimized:', error);
      throw error;
    }

    // Flatten data for easier frontend consumption
    const flattened = data.map(item => ({
      ...item,
      items_count: item.item_count[0]?.count || 0,
      fazenda_nome: item.fazenda?.nome,
      usuario_nome: item.usuario?.nome
    }));

    return {
      data: flattened,
      totalCount: count || 0
    };
  },

  async getRequestById(id: string): Promise<Solicitacao | null> {
    const { data, error } = await supabase
      .from('solicitacoes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return null;

    if (data.usuario_id) {
      const { data: user } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', data.usuario_id)
        .single();

      if (user) {
        (data as any).usuario = user;
      }
    }
    return data;
  },

  async createRequest(
    data: Partial<Solicitacao>,
    items: Partial<ItemSolicitacao>[],
    userId: string,
  ): Promise<Solicitacao> {
    const input = { ...data, usuario_id: userId, created_at: new Date().toISOString() };
    const { data: newRequest, error } = await supabase
      .from('solicitacoes')
      .insert(input)
      .select()
      .single();

    if (error) throw error;

    if (items.length > 0) {
      const itemsToInsert = items.map((item) => ({
        ...item,
        solicitacao_id: newRequest.id,
      }));
      const { error: itemsError } = await supabase.from('itens_solicitacao').insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    // [AUDIT] Log Creation
    await supabase.from('audit_logs').insert([
      {
        usuario_id: userId,
        acao: 'CRIAR',
        tabela: 'Solicitacao',
        registro_id: newRequest.id,
        dados_novos: newRequest,
      },
    ]);

    return newRequest;
  },

  async updateRequest(
    requestId: string,
    data: Partial<Solicitacao>,
    userId: string,
  ): Promise<void> {
    // [AUDIT] Get old data
    const { data: oldData } = await supabase
      .from('solicitacoes')
      .select('*')
      .eq('id', requestId)
      .single();

    const { error } = await supabase.from('solicitacoes').update(data).eq('id', requestId);

    if (error) throw error;

    // [AUDIT] Log Update
    if (oldData) {
      await supabase.from('audit_logs').insert([
        {
          usuario_id: userId,
          acao: data.status && data.status !== oldData.status ? 'STATUS' : 'EDITAR',
          tabela: 'Solicitacao',
          registro_id: requestId,
          dados_anteriores: oldData,
          dados_novos: { ...oldData, ...data },
        },
      ]);
    }
  },

  async deleteRequest(requestId: string): Promise<void> {
    const { error } = await supabase.from('solicitacoes').delete().eq('id', requestId);

    if (error) throw error;
  },

  // Items
  async getItemsByRequestId(requestId: string): Promise<ItemSolicitacao[]> {
    const { data, error } = await supabase
      .from('itens_solicitacao')
      .select('*')
      .eq('solicitacao_id', requestId);

    if (error) throw error;
    return data || [];
  },

  async addItemToRequest(
    requestId: string,
    itemData: Partial<ItemSolicitacao>,
    userId: string,
  ): Promise<ItemSolicitacao> {
    const input = { ...itemData, solicitacao_id: requestId };
    const { data, error } = await supabase
      .from('itens_solicitacao')
      .insert(input)
      .select()
      .single();

    if (error) throw error;

    // [AUDIT] Log Item Creation
    await supabase.from('audit_logs').insert([
      {
        usuario_id: userId,
        acao: 'CRIAR', // Using CRIAR for item creation
        tabela: 'ItemSolicitacao',
        registro_id: data.id,
        dados_novos: data,
      },
    ]);

    return data;
  },

  async updateItem(itemId: string, data: Partial<ItemSolicitacao>, userId: string): Promise<void> {
    // [AUDIT] Get old data
    const { data: oldData } = await supabase
      .from('itens_solicitacao')
      .select('*')
      .eq('id', itemId)
      .single();

    const { error } = await supabase.from('itens_solicitacao').update(data).eq('id', itemId);

    if (error) throw error;

    // [AUDIT] Log Item Update
    if (oldData) {
      await supabase.from('audit_logs').insert([
        {
          usuario_id: userId,
          acao: 'EDITAR',
          tabela: 'ItemSolicitacao',
          registro_id: itemId,
          dados_anteriores: oldData,
          dados_novos: { ...oldData, ...data },
        },
      ]);
    }
  },

  async deleteItem(itemId: string, userId: string): Promise<void> {
    // [AUDIT] Get old data
    const { data: oldData } = await supabase
      .from('itens_solicitacao')
      .select('*')
      .eq('id', itemId)
      .single();

    const { error } = await supabase.from('itens_solicitacao').delete().eq('id', itemId);

    if (error) throw error;

    // [AUDIT] Log
    if (oldData) {
      await supabase.from('audit_logs').insert([
        {
          usuario_id: userId,
          acao: 'ITEM_EXCLUIDO',
          tabela: 'ItemSolicitacao',
          registro_id: oldData.solicitacao_id, // Log to parent request
          dados_anteriores: oldData,
        },
      ]);

      await supabase.from('audit_logs').insert([
        {
          usuario_id: userId,
          acao: 'EXCLUIR',
          tabela: 'ItemSolicitacao',
          registro_id: itemId,
          dados_anteriores: oldData,
        }
      ]);
    }
  },

  // Farms (Fazendas)
  async getAllFarms(): Promise<Fazenda[]> {
    const { data, error } = await supabase.from('fazendas').select('*').order('nome');

    if (error) throw error;
    return data || [];
  },

  async getFazendas(): Promise<Fazenda[]> {
    return this.getAllFarms();
  },

  async getFarm(id: string): Promise<Fazenda | null> {
    if (!id) return null;
    const { data, error } = await supabase.from('fazendas').select('*').eq('id', id).single();

    if (error) return null;
    return data;
  },

  async createFarm(farm: Partial<Fazenda>, creatorId: string): Promise<Fazenda> {
    const { data, error } = await supabase.from('fazendas').insert(farm).select().single();
    if (error) throw error;
    return data;
  },

  async updateFarm(id: string, updates: Partial<Fazenda>, modifierId: string): Promise<void> {
    const { error } = await supabase.from('fazendas').update(updates).eq('id', id);
    if (error) throw error;
  },

  async toggleFarmStatus(farmId: string, modifierId?: string): Promise<void> {
    const { data, error } = await supabase
      .from('fazendas')
      .select('ativo')
      .eq('id', farmId)
      .single();

    if (error) throw error;

    const { error: updateError } = await supabase
      .from('fazendas')
      .update({ ativo: !data.ativo })
      .eq('id', farmId);

    if (updateError) throw updateError;
  },

  // Postos
  async getPostos(): Promise<{ id: string; nome: string }[]> {
    const { data, error } = await supabase.from('postos').select('id, nome');
    if (error) throw error;
    return data || [];
  },

  // Users
  async getAllUsers(): Promise<any[]> {
    const { data, error } = await supabase
      .from('usuarios')
      .select(`
        *,
        funcao:funcoes(nome),
        fazenda:fazendas(nome)
      `)
      .order('nome');

    if (error) throw error;
    return data || [];
  },

  async getUserById(id: string): Promise<Usuario | null> {
    const { data, error } = await supabase.from('usuarios').select('*').eq('id', id).single();
    if (error) return null;
    return data;
  },

  async createUser(userData: Partial<Usuario>, creatorId: string): Promise<Usuario> {
    const { data, error } = await supabase.from('usuarios').insert(userData).select().single();

    if (error) throw error;
    return data;
  },

  async updateUser(userId: string, userData: Partial<Usuario>, modifierId: string): Promise<void> {
    const { error } = await supabase.from('usuarios').update(userData).eq('id', userId);

    if (error) throw error;
  },

  async toggleUserStatus(userId: string, modifierId: string): Promise<void> {
    const { data: user, error: getError } = await supabase
      .from('usuarios')
      .select('ativo')
      .eq('id', userId)
      .single();

    if (getError) throw getError;

    const newStatus = !user.ativo;

    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ ativo: newStatus })
      .eq('id', userId);

    if (updateError) throw updateError;
  },

  async updateLastLogin(userId: string): Promise<void> {
    const { error } = await supabase
      .from('usuarios')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId);

    if (error) console.error('Error updating last login:', error);
  },

  // Roles
  async getRole(id: string): Promise<Funcao | null> {
    if (!id) return null;
    const { data, error } = await supabase.from('funcoes').select('*').eq('id', id).single();

    if (error) return null;
    return data;
  },

  // Integration Config (Nuntec)
  async getIntegrationConfig(): Promise<IntegrationConfig | null> {
    const { data, error } = await supabase
      .from('integration_settings')
      .select('*')
      .eq('provider', 'NUNTEC')
      .maybeSingle();

    if (error) {
      console.warn('Error fetching integration settings:', error);
      return null;
    }
    if (!data) return null;

    // Map DB fields to internal type
    return {
      id: data.id,
      provider: data.provider,
      is_active: data.is_active,
      username: data.username,
      password: data.password,
      base_url: data.base_url,
      sync_start_date: data.sync_start_date,
      // Default others if missing from DB schema version
      sync_interval_minutes: 60,
      last_sync_at: null
    } as unknown as IntegrationConfig;
  },

  async saveIntegrationConfig(
    config: Partial<IntegrationConfig>,
    modifierId?: string,
  ): Promise<void> {
    // Map internal type to DB fields
    const payload = {
      provider: 'NUNTEC',
      username: config.username,
      password: config.password,
      base_url: config.base_url,
      sync_start_date: config.sync_start_date,
      is_active: config.is_active,
      updated_at: new Date().toISOString()
    };

    // Upsert based on provider unique key
    const { error } = await supabase
      .from('integration_settings')
      .upsert(payload, { onConflict: 'provider' });

    if (error) throw error;
  },

  async getIgnoredNuntecTransfers(): Promise<string[]> {
    const { data, error } = await supabase.from('nuntec_ignored_transfers').select('nuntec_transfer_id');

    if (error) {
      console.warn('Error fetching ignored transfers:', error);
      return [];
    }
    return data ? data.map((d: any) => d.nuntec_transfer_id) : [];
  },

  async ignoreNuntecTransfer(transferId: string, userId: string): Promise<void> {
    // Try inserting with user tracking first
    const { error } = await supabase
      .from('nuntec_ignored_transfers')
      .insert({ nuntec_transfer_id: transferId, ignored_by: userId });

    if (error) {
      console.error("Detailed Ignore Error:", error);
      // Fallback: If FK fails (user not found), try inserting without user tracking
      if (error.code === '23503') { // Foreign Key Violation
        const { error: retryError } = await supabase
          .from('nuntec_ignored_transfers')
          .insert({ nuntec_transfer_id: transferId });
        if (retryError) throw retryError;
        return;
      }
      throw error;
    }
  },

  async restoreNuntecTransfer(transferId: string): Promise<void> {
    const { error } = await supabase
      .from('nuntec_ignored_transfers')
      .delete()
      .eq('nuntec_transfer_id', transferId);

    if (error) throw error;
  },

  // Audit Logs
  async getAuditLogs(registroId?: string): Promise<AuditLog[]> {
    let query = supabase.from('audit_logs').select('*').order('data_hora', { ascending: false });

    if (registroId) {
      query = query.eq('registro_id', registroId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getLogs(registroId: string): Promise<AuditLog[]> {
    return this.getAuditLogs(registroId);
  },

  async getRequestWithItemLogs(requestId: string): Promise<AuditLog[]> {
    const requestLogs = await this.getAuditLogs(requestId);

    const { data: items } = await supabase
      .from('itens_solicitacao')
      .select('id')
      .eq('solicitacao_id', requestId);

    if (!items || items.length === 0) return requestLogs;

    const itemIds = items.map((i) => i.id);
    const { data: itemLogs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .in('registro_id', itemIds)
      .order('data_hora', { ascending: false });

    if (error) throw error;

    const allLogs = [...requestLogs, ...itemLogs].sort(
      (a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime(),
    );

    return allLogs;
  },
};

export const roleService = {
  async getAll(): Promise<Funcao[]> {
    const { data, error } = await supabase.from('funcoes').select('*').order('nome');
    if (error) throw error;
    return data || [];
  },

  async create(role: Partial<Funcao>): Promise<Funcao> {
    const { data, error } = await supabase.from('funcoes').insert(role).select().single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Funcao>): Promise<void> {
    const { error } = await supabase.from('funcoes').update(updates).eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('funcoes').delete().eq('id', id);
    if (error) throw error;
  },
};
