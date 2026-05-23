import React, { useState, useEffect } from 'react';
import { Package, ArrowUpRight, ArrowDownRight, Search, Plus, Image as ImageIcon, List, LayoutGrid, FileSpreadsheet, Pencil, Trash2, Power, PowerOff } from 'lucide-react';
import { usedItemsService, UsedItemStock, UsedItemTransaction, UsedItemCatalog } from '../services/usedItemsService';
import { supabase } from '../lib/supabase';
import { exportToExcel } from '../utils/exportUtils';
import { farmService, Farm } from '../services/farmService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Loading } from '../components/Loading';
import { UsedItemCatalogModal } from '../components/used-items/UsedItemCatalogModal';
import { UsedItemMovementModal } from '../components/used-items/UsedItemMovementModal';
import { UsedItemDetailsModal } from '../components/used-items/UsedItemDetailsModal';
import { UsedTransactionDetailsModal } from '../components/used-items/UsedTransactionDetailsModal';
import { ImageLightbox } from '../components/ImageLightbox';

export function UsedItemsDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'estoque' | 'movimentacoes' | 'catalogo'>('estoque');
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [editingCatalogItem, setEditingCatalogItem] = useState<UsedItemCatalog | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<UsedItemTransaction | null>(null);
  
  const [detailsModalItem, setDetailsModalItem] = useState<{ id: string, nome: string, codigo?: number } | null>(null);
  const [detailsModalTransaction, setDetailsModalTransaction] = useState<UsedItemTransaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<string>('');
  
  const [stock, setStock] = useState<UsedItemStock[]>([]);
  const [transactions, setTransactions] = useState<UsedItemTransaction[]>([]);
  const [catalog, setCatalog] = useState<UsedItemCatalog[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedFarm) {
      loadStock();
      loadTransactions();
      if (catalog.length === 0) loadCatalog();
    }
  }, [selectedFarm]);

  const loadInitialData = async () => {
    try {
      const farmsData = await farmService.getFarms();
      setFarms(farmsData);
      if (farmsData.length > 0) setSelectedFarm(farmsData[0].id);
    } catch (error) {
      toast.error('Erro ao carregar filiais');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStock = async () => {
    if (!selectedFarm) return;
    try {
      const data = await usedItemsService.getStock(selectedFarm);
      setStock(data);
    } catch (error) {
      toast.error('Erro ao carregar estoque');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTransactions = async () => {
    if (!selectedFarm) return;
    try {
      // 1. Busca transações
      const { data: txs, error: txError } = await supabase
        .from('used_items_transactions')
        .select('*, produto:used_items_catalog(nome, codigo_item), usuario:usuarios(nome)')
        .eq('fazenda_id', selectedFarm)
        .order('created_at', { ascending: false });

      if (txError) throw txError;

      // 2. Busca fotos do estoque para essas transações
      const { data: stockData, error: stockError } = await supabase
        .from('used_items_stock')
        .select('produto_id, foto_url')
        .eq('fazenda_id', selectedFarm);

      if (stockError) throw stockError;

      // 3. Mapeia as fotos para as transações correspondentes
      const dataWithPhotos = (txs || []).map(tx => {
        const stockItem = stockData?.find(s => s.produto_id === tx.produto_id);
        return {
          ...tx,
          foto_url: stockItem?.foto_url
        };
      });

      setTransactions(dataWithPhotos);
    } catch (error) {
      toast.error('Erro ao carregar movimentações');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCatalog = async () => {
    try {
      const data = await usedItemsService.getAllCatalogItems();
      setCatalog(data);
    } catch (error) {
      toast.error('Erro ao carregar catálogo');
    }
  };

  const handleUpdateCatalogItem = (item: UsedItemCatalog) => {
    setEditingCatalogItem(item);
    setIsCatalogModalOpen(true);
  };

  const handleDeleteCatalogItem = async (id: string, nome: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o item "${nome}"?\nEsta ação só é permitida se o item nunca foi movimentado.`)) return;

    try {
      await usedItemsService.deleteCatalogItem(id);
      toast.success('Item excluído com sucesso');
      loadCatalog();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir item');
    }
  };

  const handleToggleCatalogStatus = async (id: string, currentAtivo: boolean) => {
    try {
      await usedItemsService.toggleCatalogItemStatus(id, !currentAtivo);
      toast.success(`Item ${!currentAtivo ? 'ativado' : 'inativado'} com sucesso`);
      loadCatalog();
    } catch (error) {
      toast.error('Erro ao alterar status do item');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta movimentação? O saldo do estoque será recalculado automaticamente.')) return;

    try {
      await usedItemsService.deleteTransaction(id);
      toast.success('Movimentação excluída e estoque atualizado');
      loadStock();
      loadTransactions();
    } catch (error) {
      toast.error('Erro ao excluir movimentação');
    }
  };

  const handleUpdateTransaction = (tx: UsedItemTransaction) => {
    setEditingTransaction(tx);
    setIsMovementModalOpen(true);
  };

  const handleExportExcel = () => {
    try {
      if (activeTab === 'estoque') {
        if (filteredStock.length === 0) {
          toast.error('Não há dados para exportar');
          return;
        }
        const data = filteredStock.map(item => ({
          'Cód. Item': item.produto?.codigo_item ? String(item.produto.codigo_item).padStart(5, '0') : '-',
          'Descrição do Produto': String(item.produto?.nome || 'N/A'),
          'Saldo Atual': Number(item.quantidade || 0),
          'Unidade': String(item.unidade_medida || 'UN'),
          'Última Atualização': new Date(item.updated_at).toLocaleString('pt-BR'),
          'Fazenda/Filial': String(farms.find(f => f.id === selectedFarm)?.nome || selectedFarm)
        }));
        exportToExcel(data, `Estoque_Itens_Usados_${farms.find(f => f.id === selectedFarm)?.nome || 'Geral'}`);
      } else if (activeTab === 'movimentacoes') {
        if (filteredTransactions.length === 0) {
          toast.error('Não há dados para exportar');
          return;
        }
        const data = filteredTransactions.map(tx => ({
          'Data/Hora': new Date(tx.created_at).toLocaleString('pt-BR'),
          'Tipo': tx.tipo,
          'Cód. Item': tx.produto?.codigo_item ? String(tx.produto.codigo_item).padStart(5, '0') : '-',
          'Produto': tx.produto?.nome || 'N/A',
          'Quantidade': tx.quantidade,
          'Unidade': tx.unidade_medida || 'UN',
          'Detalhes (Marca/Destino)': tx.tipo === 'ENTRADA' ? tx.marca : tx.equipamento_destino,
          'Usuário': tx.usuario?.nome || 'N/A'
        }));
        exportToExcel(data, `Movimentacoes_Itens_Usados_${farms.find(f => f.id === selectedFarm)?.nome || 'Geral'}`);
      } else if (activeTab === 'catalogo') {
        if (filteredCatalog.length === 0) {
          toast.error('Não há dados para exportar');
          return;
        }
        const data = filteredCatalog.map(item => ({
          'Cód. Item': item.codigo_item ? String(item.codigo_item).padStart(5, '0') : '-',
          'Nome do Item': item.nome,
          'Data Cadastro': new Date(item.created_at).toLocaleDateString('pt-BR'),
          'Status': item.ativo ? 'Ativo' : 'Inativo'
        }));
        exportToExcel(data, 'Catalogo_Itens_Usados');
      }
      toast.success('Arquivo Excel gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar arquivo Excel');
    }
  };

  if (isLoading && !stock.length && !transactions.length) {
    return <div className="flex items-center justify-center h-full"><Loading /></div>;
  }

  const filteredStock = stock.filter(item => 
    item.quantidade > 0 && (
      item.produto?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.produto?.codigo_item?.toString().includes(searchTerm)
    )
  );

  const filteredTransactions = transactions.filter(tx => 
    tx.produto?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.produto?.codigo_item?.toString().includes(searchTerm) ||
    tx.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.equipamento_destino?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.tipo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCatalog = catalog.filter(item => 
    item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.codigo_item?.toString().includes(searchTerm)
  );

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Package className="text-teal-600" size={32} />
            Estoque PU - Estoque Peças Usadas
          </h1>
          <p className="text-slate-500 mt-1">Controle de entradas, saídas e saldo de peças de reposição.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={selectedFarm}
            onChange={(e) => setSelectedFarm(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none"
          >
            {farms.map(f => (
              <option key={f.id} value={f.id}>{f.nome}</option>
            ))}
          </select>
          <button 
            onClick={() => {
              setEditingTransaction(null);
              setIsMovementModalOpen(true);
            }}
            disabled={!selectedFarm}
            className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <Plus size={18} /> Nova Movimentação
          </button>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex overflow-x-auto hide-scrollbar gap-2 p-1 bg-slate-100/50 rounded-xl w-max border border-slate-200/60">
          {[
            { id: 'estoque', label: 'Estoque Atual' },
            { id: 'movimentacoes', label: 'Extrato de Movimentações' },
            { id: 'catalogo', label: 'Catálogo de Itens' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id 
                  ? 'bg-white text-teal-700 shadow-sm border border-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>

          <button
            onClick={handleExportExcel}
            className="p-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm flex items-center gap-2 group"
            title="Exportar para Excel"
          >
            <FileSpreadsheet size={20} className="group-hover:scale-110 transition-transform" />
            <span className="hidden md:inline text-xs font-bold">Exportar Excel</span>
          </button>
          
          {activeTab === 'estoque' && (
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button 
                onClick={() => setViewMode('grid')} 
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-teal-600' : 'text-slate-400 hover:text-slate-600'}`}
                title="Visualização em Grade"
              >
                <LayoutGrid size={16} />
              </button>
              <button 
                onClick={() => setViewMode('list')} 
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-teal-600' : 'text-slate-400 hover:text-slate-600'}`}
                title="Visualização em Lista"
              >
                <List size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
        {activeTab === 'estoque' && (
          <div className="p-6">
            {filteredStock.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                {searchTerm ? 'Nenhum item encontrado para a busca.' : 'Nenhum item no estoque desta fazenda.'}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredStock.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => setDetailsModalItem({ id: item.produto_id, nome: item.produto?.nome || '', codigo: item.produto?.codigo_item })}
                    className="border border-slate-200 rounded-xl p-4 flex flex-col items-center hover:shadow-md hover:border-teal-300 transition-all cursor-pointer group"
                  >
                    <div 
                      className={`w-24 h-24 bg-slate-100 rounded-lg flex items-center justify-center mb-4 overflow-hidden group-hover:scale-105 transition-transform ${item.foto_url ? 'cursor-zoom-in' : ''}`}
                      onClick={(e) => {
                        if (item.foto_url) {
                          e.stopPropagation();
                          setLightboxImg(item.foto_url);
                        }
                      }}
                    >
                      {item.foto_url ? (
                        <img src={item.foto_url} alt={item.produto?.nome} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="text-slate-300" size={32} />
                      )}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                      CÓD: {item.produto?.codigo_item ? String(item.produto.codigo_item).padStart(5, '0') : '-'}
                    </div>
                    <h3 className="font-bold text-slate-800 text-center">{item.produto?.nome}</h3>
                    <div className="mt-4 bg-slate-50 px-4 py-2 rounded-lg w-full flex justify-between items-center border border-slate-100">
                      <span className="text-sm text-slate-500">Saldo:</span>
                      <span className="text-lg font-black text-teal-600">
                        {item.quantidade} <span className="text-xs font-semibold text-slate-400 ml-1">{item.unidade_medida || 'UN'}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <th className="py-4 px-6 font-bold w-24 text-center">Foto</th>
                      <th className="py-4 px-6 font-bold w-24">Cód.</th>
                      <th className="py-4 px-6 font-bold">Produto</th>
                      <th className="py-4 px-6 font-bold text-center w-32">Saldo</th>
                      <th className="py-4 px-6 font-bold w-48 text-right">Última Atualização</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredStock.map(item => (
                      <tr 
                        key={item.id} 
                        onClick={() => setDetailsModalItem({ id: item.produto_id, nome: item.produto?.nome || '', codigo: item.produto?.codigo_item })}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        <td className="py-4 px-6 text-center">
                          <div 
                            className={`w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden mx-auto ${item.foto_url ? 'cursor-zoom-in hover:opacity-80 transition-opacity' : ''}`}
                            onClick={(e) => {
                              if (item.foto_url) {
                                e.stopPropagation();
                                setLightboxImg(item.foto_url);
                              }
                            }}
                          >
                            {item.foto_url ? (
                              <img src={item.foto_url} alt={item.produto?.nome} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="text-slate-300" size={20} />
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 font-mono text-xs text-slate-500">
                          {item.produto?.codigo_item ? String(item.produto.codigo_item).padStart(5, '0') : '-'}
                        </td>
                        <td className="py-4 px-6 font-medium text-slate-800">{item.produto?.nome}</td>
                        <td className="py-4 px-6 text-center">
                          <span className="font-bold text-slate-800">
                            {item.quantidade} <span className="text-xs font-normal text-slate-400 ml-1">{item.unidade_medida || 'UN'}</span>
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right text-slate-500 text-xs">
                          {new Date(item.updated_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'movimentacoes' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="py-4 px-6 font-bold">Data</th>
                  <th className="py-4 px-6 font-bold">Cód.</th>
                  <th className="py-4 px-6 font-bold">Tipo</th>
                  <th className="py-4 px-6 font-bold">Produto</th>
                  <th className="py-4 px-6 font-bold text-center">Quantidade</th>
                  <th className="py-4 px-6 font-bold">Detalhes</th>
                  <th className="py-4 px-6 font-bold">Usuário</th>
                  <th className="py-4 px-6 font-bold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      {searchTerm ? 'Nenhuma movimentação encontrada para a busca.' : 'Nenhuma movimentação registrada.'}
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map(tx => (
                    <tr 
                      key={tx.id} 
                      onClick={() => setDetailsModalTransaction(tx)}
                      className="hover:bg-slate-50/50 cursor-pointer"
                    >
                      <td className="py-4 px-6 whitespace-nowrap text-slate-600">
                        {new Date(tx.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-4 px-6 font-mono text-xs text-slate-500">
                        {tx.produto?.codigo_item ? String(tx.produto.codigo_item).padStart(5, '0') : '-'}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                          tx.tipo === 'ENTRADA' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {tx.tipo === 'ENTRADA' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                          {tx.tipo}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-800">{tx.produto?.nome}</td>
                      <td className="py-4 px-6 text-center font-bold text-slate-800">
                        {tx.quantidade} <span className="text-xs text-slate-400 font-normal ml-1">{tx.unidade_medida || 'UN'}</span>
                      </td>
                      <td className="py-4 px-6 text-slate-500 text-xs">
                        {tx.tipo === 'ENTRADA' ? `Marca: ${tx.marca || '-'}` : `Destino: ${tx.equipamento_destino || '-'}`}
                      </td>
                      <td className="py-4 px-6 text-slate-600">{tx.usuario?.nome}</td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleUpdateTransaction(tx)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar movimentação"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(tx.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Excluir movimentação"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'catalogo' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Catálogo de Itens</h3>
                <p className="text-sm text-slate-500">Itens permitidos para registro no estoque e movimentações.</p>
              </div>
              <button 
                onClick={() => {
                  setEditingCatalogItem(null);
                  setIsCatalogModalOpen(true);
                }}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold shadow-sm inline-flex items-center gap-2 hover:bg-slate-700 transition-colors"
              >
                <Plus size={16} /> Adicionar Item
              </button>
            </div>
            
            {filteredCatalog.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-500">
                {searchTerm ? 'Nenhum item encontrado no catálogo.' : 'O catálogo está vazio. Adicione itens para começar a controlar o estoque.'}
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <th className="py-4 px-6 font-bold w-24">Cód.</th>
                      <th className="py-4 px-6 font-bold">Descrição do Item</th>
                      <th className="py-4 px-6 font-bold">Data de Cadastro</th>
                      <th className="py-4 px-6 font-bold w-24 text-center">Status</th>
                      <th className="py-4 px-6 font-bold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCatalog.map(item => (
                      <tr 
                        key={item.id} 
                        onClick={() => setDetailsModalItem({ id: item.id, nome: item.nome, codigo: item.codigo_item })}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        <td className="py-4 px-6 font-mono text-xs text-slate-500">
                          {item.codigo_item ? String(item.codigo_item).padStart(5, '0') : '-'}
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-800">{item.nome}</td>
                        <td className="py-4 px-6 text-slate-500">{new Date(item.created_at).toLocaleDateString('pt-BR')}</td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-[10px] font-black tracking-wider uppercase ${
                            item.ativo ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {item.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleUpdateCatalogItem(item)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar item"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleToggleCatalogStatus(item.id, item.ativo)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                item.ativo 
                                  ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' 
                                  : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={item.ativo ? 'Inativar' : 'Ativar'}
                            >
                              {item.ativo ? <PowerOff size={16} /> : <Power size={16} />}
                            </button>
                            <button
                              onClick={() => handleDeleteCatalogItem(item.id, item.nome)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Excluir item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <UsedItemCatalogModal 
        isOpen={isCatalogModalOpen} 
        onClose={() => {
          setIsCatalogModalOpen(false);
          setEditingCatalogItem(null);
        }} 
        onSuccess={loadCatalog}
        editingItem={editingCatalogItem}
      />

      {selectedFarm && (
        <UsedItemMovementModal
          isOpen={isMovementModalOpen}
          onClose={() => {
            setIsMovementModalOpen(false);
            setEditingTransaction(null);
          }}
          onSuccess={() => {
            loadStock();
            loadTransactions();
          }}
          fazendaId={selectedFarm}
          catalog={catalog}
          stock={stock}
          editingTransaction={editingTransaction}
        />
      )}

      {detailsModalItem && (
        <UsedItemDetailsModal
          isOpen={!!detailsModalItem}
          onClose={() => setDetailsModalItem(null)}
          produtoId={detailsModalItem.id}
          produtoNome={detailsModalItem.nome}
          produtoCodigo={detailsModalItem.codigo}
          stock={stock}
          transactions={transactions}
        />
      )}

      {detailsModalTransaction && (
        <UsedTransactionDetailsModal
          isOpen={!!detailsModalTransaction}
          onClose={() => setDetailsModalTransaction(null)}
          transaction={detailsModalTransaction}
          onEdit={handleUpdateTransaction}
          onDelete={handleDeleteTransaction}
          onPhotoClick={setLightboxImg}
        />
      )}

      {lightboxImg && (
        <ImageLightbox 
          src={lightboxImg}
          isOpen={!!lightboxImg}
          onClose={() => setLightboxImg(null)}
        />
      )}
    </div>
  );
}
