import { supabase } from '../lib/supabase';
import { Supplier } from '../types';

export interface Saving {
  id: string;
  data: string;
  comprador: string;
  n_cotacao: string;
  fornecedor_id: string;
  valor_inicial: number;
  valor_final: number;
  saving: number;
  desconto_percentual: number;
  anexos: { name: string; path: string }[];
  created_at: string;
  created_by?: string;
  fornecedor?: Supplier;
}

export const savingService = {
  async getAll(): Promise<Saving[]> {
    const { data, error } = await supabase
      .from('savings')
      .select('*, fornecedor:suppliers(*)')
      .order('data', { ascending: false });

    if (error) throw error;
    return data;
  },

  async create(savingData: Omit<Saving, 'id' | 'created_at' | 'saving' | 'desconto_percentual' | 'anexos'>, files: File[] = []): Promise<Saving> {
    const anexos = [];

    // Calcula os valores de saving e desconto
    const savingValue = savingData.valor_inicial - savingData.valor_final;
    const descontoPercentual = savingData.valor_inicial > 0 
      ? (savingValue / savingData.valor_inicial) * 100 
      : 0;

    // Upload files if any
    if (files.length > 0) {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${savingData.n_cotacao}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('savings_attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        anexos.push({
          name: file.name,
          path: filePath
        });
      }
    }

    const { data, error } = await supabase
      .from('savings')
      .insert({
        ...savingData,
        saving: savingValue,
        desconto_percentual: descontoPercentual,
        anexos
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, savingData: Partial<Omit<Saving, 'id' | 'created_at' | 'anexos'>>, files: File[] = []): Promise<Saving> {
    // Busca dados atuais
    const { data: currentSaving, error: fetchError } = await supabase
      .from('savings')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    let anexos = currentSaving.anexos || [];

    // Calcular saving e desconto se valor inicial/final mudar
    let savingValue = currentSaving.saving;
    let descontoPercentual = currentSaving.desconto_percentual;
    
    const valInicial = savingData.valor_inicial ?? currentSaving.valor_inicial;
    const valFinal = savingData.valor_final ?? currentSaving.valor_final;

    if (savingData.valor_inicial !== undefined || savingData.valor_final !== undefined) {
      savingValue = valInicial - valFinal;
      descontoPercentual = valInicial > 0 ? (savingValue / valInicial) * 100 : 0;
    }

    // Upload files if any
    if (files.length > 0) {
      const cotacao = savingData.n_cotacao ?? currentSaving.n_cotacao;
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${cotacao}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('savings_attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        anexos.push({
          name: file.name,
          path: filePath
        });
      }
    }

    const { data, error } = await supabase
      .from('savings')
      .update({
        ...savingData,
        saving: savingValue,
        desconto_percentual: descontoPercentual,
        anexos
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    // 1. Get attachments to delete from bucket
    const { data: saving, error: fetchError } = await supabase
      .from('savings')
      .select('anexos')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // 2. Delete files from storage
    if (saving?.anexos && saving.anexos.length > 0) {
      const paths = saving.anexos.map((a: any) => a.path);
      const { error: storageError } = await supabase.storage
        .from('savings_attachments')
        .remove(paths);
      if (storageError) console.error('Error removing files:', storageError);
    }

    // 3. Delete record
    const { error } = await supabase
      .from('savings')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getAttachmentUrl(path: string): Promise<string> {
    const { data } = await supabase.storage
      .from('savings_attachments')
      .createSignedUrl(path, 3600); // 1 hour
      
    return data?.signedUrl || '';
  }
};
