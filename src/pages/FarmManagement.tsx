import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/supabaseService';
import type { Fazenda } from '../types';
import { Building2, Plus, Edit, Power, CheckCircle, XCircle, History } from 'lucide-react';
import { FarmFormModal } from '../components/FarmFormModal';
import { AuditLogModal } from '../components/AuditLogModal';

// UI Kit
import { PageHeader } from '../components/ui/PageHeader';
import StatsCard from '../components/ui/StatsCard';
import { FilterBar } from '../components/ui/FilterBar';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { StatsSkeleton } from '../components/ui/StatsSkeleton';

export function FarmManagement() {
  const { user, hasPermission } = useAuth();
  const [farms, setFarms] = useState<Fazenda[]>([]);
  const [filteredFarms, setFilteredFarms] = useState<Fazenda[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingFarm, setEditingFarm] = useState<Fazenda | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const [historyFarmId, setHistoryFarmId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check permission
  if (!hasPermission('config_fazendas')) {
    return (
      <div className="p-8 text-center">
        <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-xl p-6">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-800 mb-2">Acesso Negado</h2>
          <p className="text-red-600">Você não tem permissão para acessar este módulo.</p>
        </div>
      </div>
    );
  }

  // Load farms
  useEffect(() => {
    loadFarms();
  }, []);

  // Apply filters
  useEffect(() => {
    let result = farms;

    // Search
    if (searchTerm) {
      result = result.filter((f) => f.nome.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter((f) => f.ativo === (filterStatus === 'active'));
    }

    setFilteredFarms(result);
  }, [farms, searchTerm, filterStatus]);

  const loadFarms = async () => {
    setLoading(true);
    try {
      const farmsData = await db.getAllFarms();
      setFarms(farmsData);
    } catch (error) {
      console.error('Erro ao carregar fazendas', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFarm = () => {
    setEditingFarm(null);
    setShowModal(true);
  };

  const handleEditFarm = (farm: Fazenda) => {
    setEditingFarm(farm);
    setShowModal(true);
  };

  const handleToggleStatus = async (farmId: string) => {
    const targetFarm = farms.find((f) => f.id === farmId);
    if (!targetFarm) return;

    const action = targetFarm.ativo ? 'desativar' : 'ativar';
    if (window.confirm(`Confirma ${action} a filial "${targetFarm.nome}"?`)) {
      try {
        await db.toggleFarmStatus(farmId, user!.id);
        await loadFarms();
      } catch (error: any) {
        alert(`Erro: ${error.message}`);
      }
    }
  };

  const handleModalClose = async (saved: boolean) => {
    setShowModal(false);
    setEditingFarm(null);
    if (saved) {
      await loadFarms();
    }
  };

  const hasActiveFilters = searchTerm || filterStatus !== 'all';

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto pb-20 space-y-6">
        <PageHeader
          title="Gestão de Filiais"
          subtitle="Gerencie as fazendas e filiais da empresa"
          icon={Building2}
        >
          <button className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl opacity-50 cursor-not-allowed">
            <Plus size={20} /> Nova Filial
          </button>
        </PageHeader>
        <StatsSkeleton count={3} />
        <TableSkeleton rows={5} columns={3} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="Gestão de Filiais"
        subtitle="Gerencie as fazendas e filiais da empresa"
        icon={Building2}
      >
        <button
          onClick={handleCreateFarm}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-lg shadow-green-500/30 transition-all font-semibold"
        >
          <Plus size={20} /> Nova Filial
        </button>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
        <StatsCard
          title="TOTAL"
          value={farms.length}
          icon={Building2}
          description="filiais cadastradas"
          variant={filterStatus === 'all' ? 'blue' : 'default'}
          onClick={() => setFilterStatus('all')}
          className={`hover:bg-blue-50 ${filterStatus === 'all' ? 'ring-2 ring-blue-200 bg-blue-50' : ''}`}
        />
        <StatsCard
          title="ATIVAS"
          value={farms.filter((f) => f.ativo).length}
          icon={CheckCircle}
          description="em operação"
          variant={filterStatus === 'active' ? 'green' : 'default'}
          onClick={() => setFilterStatus('active')}
          className={`hover:bg-green-50 ${filterStatus === 'active' ? 'ring-2 ring-green-200 bg-green-50' : ''}`}
        />
        <StatsCard
          title="INATIVAS"
          value={farms.filter((f) => !f.ativo).length}
          icon={XCircle}
          description="desativadas"
          variant={filterStatus === 'inactive' ? 'red' : 'default'}
          onClick={() => setFilterStatus('inactive')}
          className={`hover:bg-red-50 ${filterStatus === 'inactive' ? 'ring-2 ring-red-200 bg-red-50' : ''}`}
        />
      </div>

      {/* Filters */}
      <FilterBar
        onSearch={setSearchTerm}
        searchValue={searchTerm}
        searchPlaceholder="Buscar por nome..."
        onClear={() => {
          setSearchTerm('');
          setFilterStatus('all');
        }}
        hasActiveFilters={!!hasActiveFilters}
        children={
          <div className="min-w-[200px]">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none bg-white text-sm"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativas</option>
              <option value="inactive">Inativas</option>
            </select>
          </div>
        }
      />

      {/* Farms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFarms.length === 0 ? (
          <div className="col-span-full">
            <EmptyState icon={Building2} title="Nenhuma filial encontrada" />
          </div>
        ) : (
          filteredFarms.map((farm) => (
            <div
              key={farm.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-all group"
            >
              {/* Card Header */}
              <div
                className={`p-6 ${farm.ativo ? 'bg-gradient-to-br from-green-50 to-emerald-50' : 'bg-slate-50'}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${farm.ativo ? 'bg-green-100' : 'bg-slate-200'}`}>
                    <Building2
                      className={`w-8 h-8 ${farm.ativo ? 'text-green-600' : 'text-slate-400'}`}
                    />
                  </div>
                  <StatusBadge
                    status={farm.ativo ? 'Ativa' : 'Inativa'}
                    variant={farm.ativo ? 'success' : 'error'}
                    icon={farm.ativo ? CheckCircle : XCircle}
                    size="sm"
                  />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-1">{farm.nome}</h3>
                <p className="text-xs text-slate-500 font-mono">ID: {farm.id.substring(0, 8)}</p>
              </div>

              {/* Card Actions */}
              <div className="p-4 bg-slate-50 flex gap-2">
                <button
                  onClick={() => {
                    setHistoryFarmId(farm.id);
                    setShowHistory(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 transition-all font-medium text-xs"
                >
                  <History size={14} /> Histórico
                </button>
                <button
                  onClick={() => handleEditFarm(farm)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 transition-all font-medium text-xs"
                >
                  <Edit size={14} /> Editar
                </button>
                <button
                  onClick={() => handleToggleStatus(farm.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl transition-all font-medium text-xs ${farm.ativo
                    ? 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100'
                    : 'bg-green-50 border border-green-200 text-green-700 hover:bg-green-100'
                    }`}
                >
                  <Power size={14} /> {farm.ativo ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-slate-500 px-2">
        <span>Total: {filteredFarms.length} filial(is)</span>
        <span>
          {filteredFarms.filter((f) => f.ativo).length} ativa(s) •{' '}
          {filteredFarms.filter((f) => !f.ativo).length} inativa(s)
        </span>
      </div>

      {/* Modal */}
      {showModal && <FarmFormModal farm={editingFarm} onClose={handleModalClose} />}

      {showHistory && historyFarmId && (
        <AuditLogModal
          isOpen={showHistory}
          onClose={() => {
            setShowHistory(false);
            setHistoryFarmId(null);
          }}
          registroId={historyFarmId}
        />
      )}
    </div>
  );
}
