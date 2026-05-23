import React, { useState, useEffect } from 'react';
import { Plus, Search, DollarSign, Upload, FileText, ArrowDown, ArrowUp, ArrowUpDown, List, BarChart3, Calendar, Filter, ChevronDown, User, Building2 } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { savingService, Saving } from '../services/savingService';
import { SavingFormModal } from '../components/savings/SavingFormModal';
import { SavingImportModal } from '../components/savings/SavingImportModal';
import { SavingDashboard } from '../components/savings/SavingDashboard';
import { SavingDetailModal } from '../components/savings/SavingDetailModal';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export function Savings() {
  const { user, role } = useAuth();
  const [savings, setSavings] = useState<Saving[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const canEdit =
    role?.nome === 'Administrador' ||
    role?.permissoes?.controle_saving?.edit_scope === 'ALL';
  
  const [activeTab, setActiveTab] = useState<'list' | 'dashboard'>('list');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSaving, setSelectedSaving] = useState<Saving | null>(null);
  const [savingToEdit, setSavingToEdit] = useState<Saving | null>(null);

  // Estados dos filtros
  const [showFilters, setShowFilters] = useState(false);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [filterComprador, setFilterComprador] = useState('Todos');
  const [filterFornecedor, setFilterFornecedor] = useState('Todos');

  // Estado de ordenação
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'data',
    direction: 'desc'
  });

  useEffect(() => {
    loadSavings();
  }, []);

  const loadSavings = async () => {
    try {
      setLoading(true);
      const data = await savingService.getAll();
      setSavings(data);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar registros de saving');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSaving = async (id: string) => {
    try {
      await savingService.delete(id);
      toast.success('Registro excluído com sucesso');
      loadSavings();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao excluir registro');
    }
  };

  const filteredSavings = savings.filter(s => {
    const matchesSearch = 
      s.comprador.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.n_cotacao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.fornecedor?.razao_social.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesComprador = filterComprador === 'Todos' || s.comprador === filterComprador;
    const matchesFornecedor = filterFornecedor === 'Todos' || s.fornecedor?.razao_social === filterFornecedor;
    
    const savingDate = s.data.split('T')[0];
    const matchesDateStart = !dateStart || savingDate >= dateStart;
    const matchesDateEnd = !dateEnd || savingDate <= dateEnd;

    return matchesSearch && matchesComprador && matchesFornecedor && matchesDateStart && matchesDateEnd;
  });

  const sortedSavings = [...filteredSavings].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    if (sortConfig.key === 'fornecedor') {
      aValue = a.fornecedor?.razao_social || '';
      bValue = b.fornecedor?.razao_social || '';
    } else {
      aValue = (a as any)[sortConfig.key];
      bValue = (b as any)[sortConfig.key];
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} className="text-slate-300" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-teal-600" /> : <ArrowDown size={14} className="text-teal-600" />;
  };

  const uniqueBuyers = Array.from(new Set(savings.map(s => s.comprador))).sort();
  const uniqueSuppliers = Array.from(new Set(savings.map(s => s.fornecedor?.razao_social).filter((s): s is string => !!s))).sort();

  // KPIs
  const totalSaving = filteredSavings.reduce((acc, curr) => acc + curr.saving, 0);
  const totalValorInicial = filteredSavings.reduce((acc, curr) => acc + curr.valor_inicial, 0);
  const avgDesconto = totalValorInicial > 0 ? (totalSaving / totalValorInicial) * 100 : 0;

  return (
    <div className="p-6 w-full animate-in fade-in duration-500">
      <PageHeader
        title="Saving de Compras"
        subtitle="Gestão de negociações e descontos do setor de suprimentos"
        icon={DollarSign}
      >
        {canEdit && (
          <>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl font-medium transition-colors shadow-sm"
            >
              <Upload size={18} />
              <span className="hidden sm:inline">Importar CSV</span>
            </button>
            <button
              onClick={() => {
                setSavingToEdit(null);
                setIsFormModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors shadow-sm active:scale-95"
            >
              <Plus size={18} />
              Novo Registro
            </button>
          </>
        )}
      </PageHeader>

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition-colors ${
            activeTab === 'list' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <List size={18} /> Lançamentos
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition-colors ${
            activeTab === 'dashboard' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <BarChart3 size={18} /> Indicadores (Dashboard)
        </button>
      </div>

      {activeTab === 'list' ? (
        <>
          {/* Filtros */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar por comprador, cotação ou fornecedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all shadow-sm"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all border shadow-sm ${
                  showFilters 
                    ? 'bg-teal-50 border-teal-200 text-teal-700' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Filter size={18} />
                Filtros
                <ChevronDown size={16} className={`transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {showFilters && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-in slide-in-from-top-2 duration-300 grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
                    <Calendar size={14} /> Data Inicial
                  </label>
                  <input
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
                    <Calendar size={14} /> Data Final
                  </label>
                  <input
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
                    <User size={14} /> Comprador
                  </label>
                  <select
                    value={filterComprador}
                    onChange={(e) => setFilterComprador(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                  >
                    <option value="Todos">Todos</option>
                    {uniqueBuyers.map(buyer => (
                      <option key={buyer} value={buyer}>{buyer.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
                    <Building2 size={14} /> Fornecedor
                  </label>
                  <select
                    value={filterFornecedor}
                    onChange={(e) => setFilterFornecedor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                  >
                    <option value="Todos">Todos</option>
                    {uniqueSuppliers.map(supplier => (
                      <option key={supplier} value={supplier}>{supplier.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="w-full">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
                    <th className="py-4 px-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors w-[120px]" onClick={() => handleSort('data')}>
                      <div className="flex items-center gap-2">Data {getSortIcon('data')}</div>
                    </th>
                    <th className="py-4 px-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors min-w-[180px]" onClick={() => handleSort('comprador')}>
                      <div className="flex items-center gap-2">Comprador {getSortIcon('comprador')}</div>
                    </th>
                    <th className="py-4 px-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors w-[130px]" onClick={() => handleSort('n_cotacao')}>
                      <div className="flex items-center gap-2">Cotação {getSortIcon('n_cotacao')}</div>
                    </th>
                    <th className="py-4 px-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors min-w-[250px]" onClick={() => handleSort('fornecedor')}>
                      <div className="flex items-center gap-2">Fornecedor {getSortIcon('fornecedor')}</div>
                    </th>
                    <th className="py-4 px-4 font-bold text-right cursor-pointer hover:bg-slate-100 transition-colors w-[150px]" onClick={() => handleSort('valor_inicial')}>
                      <div className="flex items-center justify-end gap-2">Valor Inicial {getSortIcon('valor_inicial')}</div>
                    </th>
                    <th className="py-4 px-4 font-bold text-right cursor-pointer hover:bg-slate-100 transition-colors w-[150px]" onClick={() => handleSort('valor_final')}>
                      <div className="flex items-center justify-end gap-2">Valor Final {getSortIcon('valor_final')}</div>
                    </th>
                    <th className="py-4 px-4 font-bold text-right text-teal-700 cursor-pointer hover:bg-slate-100 transition-colors w-[150px]" onClick={() => handleSort('saving')}>
                      <div className="flex items-center justify-end gap-2">Saving (R$) {getSortIcon('saving')}</div>
                    </th>
                    <th className="py-4 px-4 font-bold text-center cursor-pointer hover:bg-slate-100 transition-colors w-[100px]" onClick={() => handleSort('desconto_percentual')}>
                      <div className="flex items-center justify-center gap-2">Desc. % {getSortIcon('desconto_percentual')}</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                          Carregando registros...
                        </div>
                      </td>
                    </tr>
                  ) : sortedSavings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <FileText size={48} className="text-slate-300" />
                          <p>Nenhum registro encontrado.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedSavings.map((item) => (
                      <tr 
                        key={item.id} 
                        onClick={() => {
                          setSelectedSaving(item);
                          setIsDetailModalOpen(true);
                        }}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      >
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-slate-400" />
                            {item.data.split('T')[0].split('-').reverse().join('/')}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 break-words">{item.comprador?.toUpperCase()}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-md">
                            #{item.n_cotacao?.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 break-words">
                          {(item.fornecedor?.razao_social || 'Fornecedor não encontrado').toUpperCase()}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-right whitespace-nowrap">
                          {item.valor_inicial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 text-right whitespace-nowrap">
                          {item.valor_final.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-3 px-4 font-bold text-teal-600 text-right bg-teal-50/30 whitespace-nowrap">
                          {item.saving.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center justify-center px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">
                            {item.desconto_percentual.toFixed(2)}%
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <SavingDashboard savings={filteredSavings} />
      )}

      <SavingFormModal 
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setTimeout(() => setSavingToEdit(null), 200);
        }}
        onSuccess={loadSavings}
        initialData={savingToEdit}
      />

      <SavingImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={loadSavings}
      />

      <SavingDetailModal
        saving={selectedSaving}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setTimeout(() => setSelectedSaving(null), 200);
        }}
        onDelete={handleDeleteSaving}
        onEdit={(saving) => {
          setSavingToEdit(saving);
          setIsFormModalOpen(true);
        }}
      />
    </div>
  );
}
