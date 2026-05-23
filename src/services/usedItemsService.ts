import { supabase } from '../lib/supabase';

export interface UsedItemCatalog {
  id: string;
  codigo_item: number;
  nome: string;
  ativo: boolean;
  created_at: string;
}

export interface UsedItemStock {
  id: string;
  fazenda_id: string;
  produto_id: string;
  quantidade: number;
  unidade_medida: string;
  foto_url?: string;
  updated_at: string;
  produto?: {
    nome: string;
    codigo_item: number;
  };
}

export interface UsedItemTransaction {
  id: string;
  tipo: 'ENTRADA' | 'SAIDA';
  fazenda_id: string;
  produto_id: string;
  quantidade: number;
  unidade_medida: string;
  marca?: string;
  equipamento_destino?: string;
  usuario_id: string;
  created_at: string;
  produto?: {
    nome: string;
    codigo_item: number;
  };
  usuario?: {
    nome: string;
  };
}

export const usedItemsService = {
  // CATÁLOGO
  async getCatalogItems(): Promise<UsedItemCatalog[]> {
    const { data, error } = await supabase
      .from('used_items_catalog')
      .select('*')
      .eq('ativo', true)
      .order('nome');
    if (error) throw error;
    return data || [];
  },

  async getAllCatalogItems(): Promise<UsedItemCatalog[]> {
    const { data, error } = await supabase
      .from('used_items_catalog')
      .select('*')
      .order('nome');
    if (error) throw error;
    return data || [];
  },

  async createCatalogItem(nome: string): Promise<UsedItemCatalog> {
    const nomeUpper = nome.trim().toUpperCase();
    const { data, error } = await supabase
      .from('used_items_catalog')
      .insert([{ nome: nomeUpper }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async toggleCatalogItemStatus(id: string, ativo: boolean): Promise<void> {
    const { error } = await supabase
      .from('used_items_catalog')
      .update({ ativo })
      .eq('id', id);
    if (error) throw error;
  },

  async updateCatalogItem(id: string, nome: string): Promise<void> {
    const { error } = await supabase
      .from('used_items_catalog')
      .update({ nome: nome.trim().toUpperCase() })
      .eq('id', id);
    if (error) throw error;
  },

  async deleteCatalogItem(id: string): Promise<void> {
    // 1. Verifica se tem movimentações (transações)
    // Se tiver transações, nunca permitimos excluir para manter a integridade do extrato
    const { count: txCount, error: txError } = await supabase
      .from('used_items_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('produto_id', id);

    if (txError) throw txError;
    if (txCount && txCount > 0) {
      throw new Error('Não é possível excluir este item pois ele já possui histórico de movimentações (extrato).');
    }

    // 2. Se não tem movimentações, ele pode ter apenas registros de saldo 0 no estoque
    // Vamos deletar esses registros de estoque primeiro para evitar erro de Foreign Key
    const { error: stockError } = await supabase
      .from('used_items_stock')
      .delete()
      .eq('produto_id', id);

    if (stockError) throw stockError;

    // 3. Agora deleta do catálogo
    const { error: deleteError } = await supabase
      .from('used_items_catalog')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
  },

  // ESTOQUE
  async getStock(fazendaId?: string): Promise<UsedItemStock[]> {
    let query = supabase
      .from('used_items_stock')
      .select('*, produto:used_items_catalog(nome, codigo_item)')
      .order('updated_at', { ascending: false });

    if (fazendaId) {
      query = query.eq('fazenda_id', fazendaId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // TRANSAÇÕES E MOVIMENTAÇÃO
  async getTransactions(fazendaId?: string): Promise<UsedItemTransaction[]> {
    let query = supabase
      .from('used_items_transactions')
      .select('*, produto:used_items_catalog(nome, codigo_item), usuario:usuarios(nome)')
      .order('created_at', { ascending: false });

    if (fazendaId) {
      query = query.eq('fazenda_id', fazendaId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async registerEntry(
    fazendaId: string,
    produtoId: string,
    quantidade: number,
    unidadeMedida: string,
    marca: string,
    usuarioId: string
  ): Promise<string> {
    if (quantidade <= 0) throw new Error('Quantidade deve ser maior que zero');

    const unidadeUpper = unidadeMedida.trim().toUpperCase();
    const marcaUpper = marca ? marca.trim().toUpperCase() : '';

    // 1. Gravar transação
    const { error: txError } = await supabase
      .from('used_items_transactions')
      .insert([{
        tipo: 'ENTRADA',
        fazenda_id: fazendaId,
        produto_id: produtoId,
        quantidade,
        unidade_medida: unidadeUpper,
        marca: marcaUpper,
        usuario_id: usuarioId
      }]);
    if (txError) throw txError;

    // 2. Atualizar estoque
    return await this.updateStockSaldo(fazendaId, produtoId, quantidade, unidadeUpper);
  },

  async registerExit(
    fazendaId: string,
    produtoId: string,
    quantidade: number,
    equipamentoDestino: string,
    usuarioId: string
  ): Promise<void> {
    if (quantidade <= 0) throw new Error('Quantidade deve ser maior que zero');

    // 1. Checar saldo atual e unidade de medida
    const { data: currentStock, error: fetchError } = await supabase
      .from('used_items_stock')
      .select('quantidade, unidade_medida')
      .eq('fazenda_id', fazendaId)
      .eq('produto_id', produtoId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
    const saldoAtual = currentStock?.quantidade || 0;
    const unidadeMedida = currentStock?.unidade_medida || 'UN';

    if (saldoAtual < quantidade) {
      throw new Error(`Saldo insuficiente. Estoque atual: ${saldoAtual}`);
    }

    const destinoUpper = equipamentoDestino.trim().toUpperCase();

    // 2. Gravar transação
    const { error: txError } = await supabase
      .from('used_items_transactions')
      .insert([{
        tipo: 'SAIDA',
        fazenda_id: fazendaId,
        produto_id: produtoId,
        quantidade,
        unidade_medida: unidadeMedida,
        equipamento_destino: destinoUpper,
        usuario_id: usuarioId
      }]);
    if (txError) throw txError;

    // 3. Atualizar estoque (subtraindo)
    await this.updateStockSaldo(fazendaId, produtoId, -quantidade, unidadeMedida);
  },

  async deleteTransaction(txId: string): Promise<void> {
    // 1. Buscar a transação antes de excluir para saber o que reverter
    const { data: tx, error: fetchError } = await supabase
      .from('used_items_transactions')
      .select('*')
      .eq('id', txId)
      .single();

    if (fetchError) throw fetchError;

    // 2. Reverter o saldo no estoque
    // Se era ENTRADA (somou), agora SUBTRAI. Se era SAÍDA (subtraiu), agora SOMA.
    const ajuste = tx.tipo === 'ENTRADA' ? -tx.quantidade : tx.quantidade;
    
    await this.updateStockSaldo(tx.fazenda_id, tx.produto_id, ajuste, tx.unidade_medida);

    // 3. Excluir a transação
    const { error: deleteError } = await supabase
      .from('used_items_transactions')
      .delete()
      .eq('id', txId);
    
    if (deleteError) throw deleteError;
  },

  async updateTransaction(
    txId: string, 
    updates: { quantidade?: number; marca?: string; equipamento_destino?: string }
  ): Promise<void> {
    // 1. Buscar transação atual
    const { data: oldTx, error: fetchError } = await supabase
      .from('used_items_transactions')
      .select('*')
      .eq('id', txId)
      .single();

    if (fetchError) throw fetchError;

    // 2. Se a quantidade mudou, precisamos ajustar o estoque
    if (updates.quantidade !== undefined && updates.quantidade !== oldTx.quantidade) {
      // Diferença = Nova Qtd - Qtd Antiga
      // Se era ENTRADA: estoque += (nova - antiga)
      // Se era SAÍDA: estoque -= (nova - antiga) => estoque += (antiga - nova)
      const diff = updates.quantidade - oldTx.quantidade;
      const ajusteEstoque = oldTx.tipo === 'ENTRADA' ? diff : -diff;

      await this.updateStockSaldo(oldTx.fazenda_id, oldTx.produto_id, ajusteEstoque, oldTx.unidade_medida);
    }

    // 3. Atualizar a transação
    const { error: updateError } = await supabase
      .from('used_items_transactions')
      .update({
        ...updates,
        marca: updates.marca?.trim().toUpperCase(),
        equipamento_destino: updates.equipamento_destino?.trim().toUpperCase()
      })
      .eq('id', txId);

    if (updateError) throw updateError;
  },

  async updateStockSaldo(fazendaId: string, produtoId: string, quantidadeParaSomar: number, unidadeMedida: string): Promise<string> {
    const { data: existingStock } = await supabase
      .from('used_items_stock')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .eq('produto_id', produtoId)
      .single();

    if (existingStock) {
      const novaQuantidade = Number(existingStock.quantidade) + Number(quantidadeParaSomar);
      const { error } = await supabase
        .from('used_items_stock')
        .update({ 
          quantidade: novaQuantidade,
          unidade_medida: unidadeMedida, // always update to latest if entry changes it? Or keep existing. Let's keep existing, but the user specifies it.
          updated_at: new Date().toISOString()
        })
        .eq('id', existingStock.id);
      if (error) throw error;
      return existingStock.id;
    } else {
      if (quantidadeParaSomar < 0) throw new Error('Não é possível criar estoque com saldo negativo');
      
      const { data, error } = await supabase
        .from('used_items_stock')
        .insert([{
          fazenda_id: fazendaId,
          produto_id: produtoId,
          quantidade: quantidadeParaSomar,
          unidade_medida: unidadeMedida
        }])
        .select()
        .single();
      if (error) throw error;
      return data.id;
    }
  },

  // FOTOS
  async uploadStockPhoto(stockId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${stockId}-${crypto.randomUUID()}.${fileExt}`;
    const filePath = `photos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('used_items_photos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('used_items_photos')
      .getPublicUrl(filePath);

    // Atualiza a URL na tabela de estoque
    const { error: updateError } = await supabase
      .from('used_items_stock')
      .update({ foto_url: data.publicUrl })
      .eq('id', stockId);

    if (updateError) throw updateError;

    return data.publicUrl;
  }
};
