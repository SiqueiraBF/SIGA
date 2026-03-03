import { supabase } from '../lib/supabase';
import type { Veiculo } from '../types';

export const vehicleService = {
  /**
   * Busca todos os veículos.
   * @param activeOnly Se true, retorna apenas os ativos.
   */
  async getAll(activeOnly = true): Promise<Veiculo[]> {
    let query = supabase.from('veiculos').select('*').order('identificacao');

    if (activeOnly) {
      query = query.eq('ativo', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar veículos:', error);
      throw error;
    }

    return data as Veiculo[];
  },

  /**
   * Importa lista de veículos via Upsert (Inserir ou Atualizar).
   * @param vehicles Lista de objetos parciais de Veiculo (id, identificacao, etc)
   */
  async upsertBatch(vehicles: Partial<Veiculo>[]): Promise<void> {
    // Supabase upsert requires the primary key (id) to be present to update.
    // We assume 'vehicles' contains 'id' and 'identificacao'.

    // Process in chunks of 50 to avoid payload limits if list is huge
    const CHUNK_SIZE = 50;

    for (let i = 0; i < vehicles.length; i += CHUNK_SIZE) {
      const chunk = vehicles.slice(i, i + CHUNK_SIZE).map((v) => ({
        ...v,
        ativo: true, // Reactivate if it was inactive
        updated_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase.from('veiculos').upsert(chunk, { onConflict: 'id' }).select();

      if (error) {
        console.error(`Erro ao importar lote ${i}:`, error);
        throw error;
      }
      console.log(`Lote ${i / CHUNK_SIZE + 1} processado. ${data?.length} registros retornados.`);
    }
  },

  /**
   * (Opcional) Desativa veículos que não estão na lista de IDs fornecida.
   * Útil se a importação deve refletir EXATAMENTE o estado atual da frota.
   */
  async deactivateMissing(activeIds: string[]): Promise<void> {
    // Isso seria arriscado se a lista importada for parcial.
    // Deixaremos para um segundo momento se o usuário solicitar "Full Sync".
  },
};
