import { supabase } from '../lib/supabase';
import type { Posto, Abastecimento } from '../types';

export const fuelService = {
  // --- Postos ---

  async getPostos(fazendaId?: string) {
    let query = supabase
      .from('postos')
      .select(
        `
                *,
                fazenda:fazendas(nome)
            `,
      )
      .order('nome');

    if (fazendaId) {
      query = query.eq('fazenda_id', fazendaId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as (Posto & { fazenda: { nome: string } })[];
  },

  async createPosto(posto: Omit<Posto, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('postos').insert(posto).select().single();

    if (error) throw error;
    return data as Posto;
  },

  async updatePosto(id: string, updates: Partial<Posto>) {
    const { data, error } = await supabase
      .from('postos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Posto;
  },

  async deletePosto(id: string) {
    const { error } = await supabase.from('postos').delete().eq('id', id);

    if (error) throw error;
  },

  // --- Abastecimentos ---

  async getAbastecimentos(filters?: {
    fazenda_id?: string;
    posto_id?: string;
    dataInicio?: string;
    dataFim?: string;
  }) {
    let query = supabase
      .from('abastecimentos')
      .select(
        `
                *,
                usuario:usuarios(nome),
                fazenda:fazendas(nome),
                posto:postos(nome)
            `,
      )
      .order('data_abastecimento', { ascending: false });

    if (filters?.fazenda_id) {
      query = query.eq('fazenda_id', filters.fazenda_id);
    }
    if (filters?.posto_id) {
      query = query.eq('posto_id', filters.posto_id);
    }
    if (filters?.dataInicio) {
      query = query.gte('data_abastecimento', filters.dataInicio);
    }
    if (filters?.dataFim) {
      query = query.lte('data_abastecimento', filters.dataFim);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Abastecimento[];
  },

  async createAbastecimento(
    abastecimento: Omit<Abastecimento, 'id' | 'numero' | 'usuario'>,
    userId: string,
  ) {
    const { data, error } = await supabase
      .from('abastecimentos')
      .insert(abastecimento)
      .select()
      .single();

    if (error) throw error;

    // Log Audit
    await supabase.from('audit_logs').insert([
      {
        usuario_id: userId,
        acao: 'CRIAR',
        tabela: 'Abastecimento',
        registro_id: data.id,
        dados_novos: data,
      },
    ]);

    return data as Abastecimento;
  },

  async updateAbastecimento(id: string, updates: Partial<Abastecimento>, userId: string) {
    // Get old data for audit
    const { data: oldData } = await supabase
      .from('abastecimentos')
      .select('*')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('abastecimentos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log Audit
    await supabase.from('audit_logs').insert([
      {
        usuario_id: userId,
        acao: 'EDITAR',
        tabela: 'Abastecimento',
        registro_id: id,
        dados_anteriores: oldData,
        dados_novos: data,
      },
    ]);

    return data as Abastecimento;
  },

  async deleteAbastecimento(id: string, userId: string) {
    // Get data for audit
    const { data: oldData } = await supabase
      .from('abastecimentos')
      .select('*')
      .eq('id', id)
      .single();

    const { error } = await supabase.from('abastecimentos').delete().eq('id', id);

    if (error) throw error;

    // Log Audit
    if (oldData) {
      await supabase.from('audit_logs').insert([
        {
          usuario_id: userId,
          acao: 'EXCLUIR',
          tabela: 'Abastecimento',
          registro_id: id,
          dados_anteriores: oldData,
        },
      ]);
    }
  },

  async confirmBaixa(id: string, userId: string) {
    if (!userId) {
      console.error('UserId is missing for confirmBaixa audit');
    }

    // Get old data
    const { data: oldData } = await supabase
      .from('abastecimentos')
      .select('*')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('abastecimentos')
      .update({ status: 'BAIXADO' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log Audit
    if (userId) {
      try {
        // Simplifica payload para evitar erros de tamanho/tipo e focar na mudança de status
        const { error: logError } = await supabase.from('audit_logs').insert([
          {
            usuario_id: userId,
            acao: 'EDITAR', // Changed from CONFIRM to avoid check constraint violation
            tabela: 'Abastecimento',
            registro_id: id,
            dados_anteriores: {
              status: oldData?.status,
              data_abastecimento: oldData?.data_abastecimento,
            },
            dados_novos: { status: data.status, data_abastecimento: data.data_abastecimento },
          },
        ]);

        if (logError) {
          console.error('Error logging confirmBaixa:', logError);
          alert('Aviso: Baixa confirmada, mas erro ao salvar auditoria: ' + logError.message);
        }
      } catch (err) {
        console.error('Exception logging confirmBaixa:', err);
      }
    }

    return data as Abastecimento;
  },
};
