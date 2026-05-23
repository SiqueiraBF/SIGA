import { supabase } from '../lib/supabase';
import { Supplier } from '../types';

export const supplierService = {
  /**
   * Remove toda pontuação do CNPJ (deixando apenas números)
   */
  stripCnpj(cnpj: string): string {
    if (!cnpj) return '';
    return cnpj.replace(/\D/g, '');
  },

  /**
   * Aplica a máscara padrão no CNPJ: 00.000.000/0000-00
   */
  formatCnpj(cnpj: string): string {
    const raw = this.stripCnpj(cnpj);
    return raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, '$1.$2.$3/$4-$5');
  },

  /**
   * Busca todos os fornecedores (Ativos e Inativos) ordenados pela Razão Social
   */
  async getAll(): Promise<Supplier[]> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('razao_social', { ascending: true });

    if (error) {
      console.error(error);
      throw error;
    }
    return data as Supplier[] || [];
  },

  /**
   * Busca apenas fornecedores ativos ordenados pela Razão Social
   */
  async getActive(): Promise<Supplier[]> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('ativo', true)
      .order('razao_social', { ascending: true });

    if (error) {
      console.error(error);
      throw error;
    }
    return data as Supplier[] || [];
  },

  /**
   * Verifica se o CNPJ já está cadastrado
   */
  async checkDuplicateCnpj(cnpj: string, excludeId?: string): Promise<boolean> {
    const cleanCnpj = this.formatCnpj(cnpj);

    let query = supabase
      .from('suppliers')
      .select('id')
      .eq('cnpj', cleanCnpj)
      .limit(1);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;
    
    if (error) {
       console.error(error);
       throw error;
    }

    return data && data.length > 0;
  },

  /**
   * Cria um novo fornecedor
   */
  async create(supplier: Omit<Supplier, 'id' | 'created_at'>): Promise<Supplier> {
    const cleanCnpj = this.formatCnpj(supplier.cnpj);

    const isDuplicate = await this.checkDuplicateCnpj(cleanCnpj);
    if (isDuplicate) {
      throw new Error(`CNPJ ${cleanCnpj} já está cadastrado no sistema.`);
    }

    const payload = {
      ...supplier,
      cnpj: cleanCnpj,
      nome_fantasia: supplier.nome_fantasia?.trim() || undefined,
      razao_social: supplier.razao_social.trim()
    };

    const { data, error } = await supabase
      .from('suppliers')
      .insert([payload])
      .select()
      .single();

    if (error) {
       console.error(error);
       throw error;
    }

    return data as Supplier;
  },

  /**
   * Atualiza um fornecedor existente
   */
  async update(id: string, supplier: Partial<Supplier>): Promise<Supplier> {
    const payload = { ...supplier };
    
    if (payload.cnpj) {
      payload.cnpj = this.formatCnpj(payload.cnpj);
      const isDuplicate = await this.checkDuplicateCnpj(payload.cnpj, id);
      if (isDuplicate) {
        throw new Error(`CNPJ ${payload.cnpj} já está em uso por outro fornecedor.`);
      }
    }

    if (payload.nome_fantasia !== undefined) {
      payload.nome_fantasia = payload.nome_fantasia?.trim() || undefined;
    }
    
    if (payload.razao_social) {
      payload.razao_social = payload.razao_social.trim();
    }

    const { data, error } = await supabase
      .from('suppliers')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
       console.error(error);
       throw error;
    }

    return data as Supplier;
  },

  /**
   * Alternativa o status Ativo/Inativo
   */
  async toggleActive(id: string, currentStatus: boolean): Promise<void> {
    const { error } = await supabase
      .from('suppliers')
      .update({ ativo: !currentStatus })
      .eq('id', id);

    if (error) {
       console.error(error);
       throw error;
    }
  }
};
