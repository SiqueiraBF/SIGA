import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';
import type {
  Solicitacao,
  Fazenda,
  Usuario,
  ItemSolicitacao,
  Funcao,
  IntegrationConfig,
  AuditLog,
  PdmCategoria,
  PdmAbreviacao,
  PdmGrupoTipo,
  PdmAiLog,
} from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const db = {
  // Requests (Solicitações)
  async getRequests(user?: Usuario | null): Promise<Solicitacao[]> {
    if (!user) return [];

    const { data, error } = await supabase
      .from('solicitacoes')
      .select('id, numero, data_abertura, status, prioridade, fazenda_id, usuario_id, created_at, data_envio')
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

  async getAllPostosDetailed() {
    const { data, error } = await supabase
      .from('postos')
      .select('id, nome, fazenda_id, nuntec_reservoir_id, ativo')
      .order('nome');

    if (error) throw error;
    return data || [];
  },

  // Users
  async getAllUsers(): Promise<any[]> {
    const { data, error } = await supabase
      .from('usuarios')
      .select(`
        id, nome, login, email, ativo, funcao_id, fazenda_id, last_login,
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

  async createUser(userData: Partial<Usuario> & { senha?: string }, creatorId: string): Promise<Usuario> {
    if (!userData.senha) {
      throw new Error('A senha é obrigatória para o cadastro de novos usuários.');
    }

    const email = userData.email || `${userData.login?.toLowerCase()}@nadiana.com.br`;

    // 1. Invocar Edge Function para criar a conta no cofre (Server-Side com service_role)
    const { data: functionData, error: functionError } = await supabase.functions.invoke('create-user', {
      body: {
        email: email,
        password: userData.senha,
        name: userData.nome
      }
    });

    if (functionError || !functionData?.user) {
      throw new Error(`Erro na Edge Function ao criar credenciais: ${functionError?.message || 'Resposta inválida'}`);
    }

    const authUserId = functionData.user.id;

    // 2. Inserir o perfil na tabela pública
    const newUserData = {
      ...userData,
      id: authUserId, // Forçar o mesmo ID gerado pelo Cofre
      email: email
    };
    
    // Garantir que a senha NUNCA seja enviada para a tabela pública
    delete newUserData.senha;

    const { data, error } = await supabase.from('usuarios').insert(newUserData).select().single();

    if (error) throw error;
    return data;
  },

  async updateUser(userId: string, userData: Partial<Usuario> & { senha?: string }, modifierId: string): Promise<void> {
    // Se a senha foi alterada, atualizamos ela no cofre de forma segura via Edge Function
    if (userData.senha) {
      const { error: functionError } = await supabase.functions.invoke('update-user-password', {
        body: {
          userId: userId,
          password: userData.senha
        }
      });
      if (functionError) {
        console.error('Erro ao atualizar senha no cofre:', functionError);
        throw new Error('Falha ao atualizar a senha criptografada.');
      }
    }
    
    // Remover senha do payload para não dar erro ao atualizar a tabela pública
    const payloadForUpdate = { ...userData };
    delete payloadForUpdate.senha;

    const { error } = await supabase.from('usuarios').update(payloadForUpdate).eq('id', userId);

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
      .select('id, provider, is_active, username, base_url, sync_start_date')
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
      password: '***',
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
    const payload: any = {
      provider: 'NUNTEC',
      username: config.username,
      base_url: config.base_url,
      sync_start_date: config.sync_start_date,
      is_active: config.is_active,
      updated_at: new Date().toISOString()
    };
    
    // Apenas enviar a senha se o usuário digitou uma nova
    if (config.password && config.password !== '***') {
      payload.password = config.password;
    }

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

  // Attachments (Anexos)
  async getAttachmentsByRequestId(requestId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('solicitacao_anexos')
      .select(`
        *,
        usuario:usuarios(nome)
      `)
      .eq('solicitacao_id', requestId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async uploadAttachment(
    requestId: string,
    file: File,
    userId: string
  ): Promise<any> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${requestId}/${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('request-attachments')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data, error } = await supabase
      .from('solicitacao_anexos')
      .insert({
        solicitacao_id: requestId,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        usuario_id: userId
      })
      .select(`
        *,
        usuario:usuarios(nome)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async deleteAttachment(attachmentId: string, filePath: string): Promise<void> {
    const { error: storageError } = await supabase.storage
      .from('request-attachments')
      .remove([filePath]);

    if (storageError) throw storageError;

    const { error } = await supabase
      .from('solicitacao_anexos')
      .delete()
      .eq('id', attachmentId);

    if (error) throw error;
  },
  // System Settings
  async getSysSetting(key: string): Promise<any> {
    const { data, error } = await supabase
      .from('sys_settings')
      .select('value')
      .eq('key', key)
      .single();

    if (error) {
      console.warn(`Error fetching setting ${key}:`, error);
      return null;
    }
    return data?.value;
  },

  async updateSysSetting(key: string, value: any, description?: string): Promise<void> {
    const { error } = await supabase
      .from('sys_settings')
      .upsert({ key, value, description, updated_at: new Date().toISOString() }, { onConflict: 'key' });

    if (error) throw error;
  },

  // AI Edge Function Call
  async analyzePdmItem(itemData: Partial<ItemSolicitacao>, simulate: boolean = false): Promise<any> {
    // Garante que a sessão de login está ativa antes de chamar a Edge Function
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Sessão expirada. Recarregue a página (F5) para renovar seu acesso.');
    }

    const { data, error } = await supabase.functions.invoke('analyze-pdm', {
      body: {
        item_id: itemData.id,
        descricao: itemData.descricao,
        marca: itemData.marca,
        referencia: itemData.referencia,
        unidade: itemData.unidade,
        simulate: simulate
      }
    });

    if (error) throw error;
    if (data && data.success === false) {
       throw new Error(data.error);
    }
    return data;
  },

  // PDM Manual Endpoints
  async getPdmCategorias(): Promise<PdmCategoria[]> {
    const { data, error } = await supabase
      .from('pdm_categorias')
      .select('*')
      .order('nome');
    if (error) throw error;
    return data || [];
  },

  async updatePdmCategoria(id: string, updates: Partial<PdmCategoria>): Promise<void> {
    const { error } = await supabase
      .from('pdm_categorias')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  },

  async deletePdmCategoria(id: string): Promise<void> {
    const { error } = await supabase
      .from('pdm_categorias')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async insertPdmCategoria(categoria: PdmCategoria): Promise<void> {
    const { error } = await supabase
      .from('pdm_categorias')
      .insert(categoria);
    if (error) throw error;
  },

  async getPdmAbreviacoes(): Promise<PdmAbreviacao[]> {
    const { data, error } = await supabase
      .from('pdm_abreviacoes')
      .select('*')
      .order('termo');
    if (error) throw error;
    return data || [];
  },

  async insertPdmAbreviacao(data: PdmAbreviacao): Promise<void> {
    const { error } = await supabase
      .from('pdm_abreviacoes')
      .insert(data);
    if (error) throw error;
  },

  async deletePdmAbreviacao(termo: string): Promise<void> {
    const { error } = await supabase
      .from('pdm_abreviacoes')
      .delete()
      .eq('termo', termo);
    if (error) throw error;
  },

  async getPdmGruposTipos(): Promise<PdmGrupoTipo[]> {
    const { data, error } = await supabase
      .from('pdm_grupos_tipos')
      .select('*')
      .order('titulo');
    if (error) throw error;
    return data || [];
  },

  async updatePdmGrupoTipo(id: string, updates: Partial<PdmGrupoTipo>): Promise<void> {
    const { error } = await supabase
      .from('pdm_grupos_tipos')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  },

  async resetPdmManual(
    categoriasDefault: PdmCategoria[],
    gruposDefault: PdmGrupoTipo[],
    abreviacoesDefault: PdmAbreviacao[]
  ): Promise<void> {
    // 1. Delete all current records
    await supabase.from('pdm_categorias').delete().neq('id', 'dummy');
    await supabase.from('pdm_grupos_tipos').delete().neq('id', 'dummy');
    await supabase.from('pdm_abreviacoes').delete().neq('termo', 'dummy');

    // 2. Insert defaults in chunks/batches
    if (categoriasDefault.length > 0) {
      const { error } = await supabase.from('pdm_categorias').insert(categoriasDefault);
      if (error) throw error;
    }
    if (gruposDefault.length > 0) {
      const { error } = await supabase.from('pdm_grupos_tipos').insert(gruposDefault);
      if (error) throw error;
    }
    if (abreviacoesDefault.length > 0) {
      const { error } = await supabase.from('pdm_abreviacoes').insert(abreviacoesDefault);
      if (error) throw error;
    }
  },

  async getPdmAiLogs(): Promise<PdmAiLog[]> {
    const { data, error } = await supabase
      .from('pdm_ai_logs')
      .select('*')
      .neq('status_retornado', 'Aprovado')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
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
