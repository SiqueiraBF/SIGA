import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fuelService } from '../services/fuelService';
import { nuntecService } from '../services/nuntecService';
import { db } from '../services/supabaseService';
import { useAuth } from '../context/AuthContext';
import type { Abastecimento, Fazenda, Posto, Modulo, NuntecTransfer } from '../types';
import {
  Plus,
  Fuel,
  Droplet,
  Truck,
  AlertTriangle,
  Settings,
  Calendar,
  Building2,
  MapPin,
  User,
  FileText,
  List,
  Link,
  CheckCircle,
  RefreshCw,
  Eye,
  Ban,
  Undo2,
  EyeOff,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { FuelingFormModal } from '../components/FuelingFormModal';
import { FuelingDetailsModal } from '../components/FuelingDetailsModal';
import { FuelingResolutionModal } from '../components/FuelingResolutionModal';
import { AuditLogModal } from '../components/AuditLogModal';
import { VehicleManagementModal } from '../components/VehicleManagementModal';

// UI Kit
import { PageHeader } from '../components/ui/PageHeader';
import { StatsCard } from '../components/ui/StatsCard';
import { FilterBar } from '../components/ui/FilterBar';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { TableActions } from '../components/ui/TableActions';

// Helper for Sort
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

const MODULE_KEY: Modulo = 'gestao_combustivel';

export function FuelingList() {
  const { user, role, checkAccess } = useAuth();
  const navigate = useNavigate();
  const [abastecimentos, setAbastecimentos] = useState<Abastecimento[]>([]);
  const [pendenciasNuntec, setPendenciasNuntec] = useState<NuntecTransfer[]>([]);
  const [nuntecError, setNuntecError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [syncStartDate, setSyncStartDate] = useState<string | null>(null);
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set());
  const [showIgnored, setShowIgnored] = useState(false);
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [postos, setPostos] = useState<(Posto & { fazenda: { nome: string } })[]>([]);
  const [usuarios, setUsuarios] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // View Mode: LOCAL = Baixas Internas, INTEGRATION = Pendências Nuntec
  const [viewMode, setViewMode] = useState<'LOCAL' | 'INTEGRATION'>('LOCAL');

  // Filters & View Mode
  const [filterFazenda, setFilterFazenda] = useState('');
  const [filterPosto, setFilterPosto] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Filtro Interativo (Similar ao RegistrarDashboard)
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDENTE'>('ALL');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Abastecimento | undefined>(undefined);

  // Nuntec Resolution Modal
  const [isResolutionOpen, setIsResolutionOpen] = useState(false);
  const [resolutionTransfer, setResolutionTransfer] = useState<NuntecTransfer | undefined>(
    undefined,
  );

  const [showHistory, setShowHistory] = useState(false);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [isFleetModalOpen, setIsFleetModalOpen] = useState(false);

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(
    null,
  );

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ active, direction }: { active: boolean; direction?: 'asc' | 'desc' }) => {
    if (!active) return <ArrowUpDown size={14} className="text-slate-300 ml-1 opacity-50" />;
    return direction === 'asc' ? (
      <ArrowUp size={14} className="text-blue-600 ml-1" />
    ) : (
      <ArrowDown size={14} className="text-blue-600 ml-1" />
    );
  };

  // ACL Checks
  const canCreate = checkAccess({
    module: MODULE_KEY,
    action: 'edit',
    resourceOwnerId: user?.id,
    resourceStatus: 'PENDENTE',
  });
  const canCreateManual = role?.permissoes?.[MODULE_KEY]?.can_create_manual !== false;
  const canIgnoreNuntec =
    role?.permissoes?.[MODULE_KEY]?.can_ignore_nuntec ?? role?.nome === 'Administrador';
  const canViewAll = checkAccess({
    module: MODULE_KEY,
    action: 'view',
    resourceOwnerId: 'generic_other_id',
  });
  const hasFullManagement =
    role?.permissoes?.[MODULE_KEY]?.edit_scope === 'ALL' || role?.nome === 'Administrador';
  const canManageFleet = role?.permissoes?.[MODULE_KEY]?.manage_fleet;

  useEffect(() => {
    loadData();
  }, []);

  // Load Nuntec Pendencies when entering Integration view or after data load
  useEffect(() => {
    if (viewMode === 'INTEGRATION' && postos.length > 0) {
      loadNuntecData();
    }
  }, [viewMode, postos, abastecimentos]);

  async function loadData() {
    setLoading(true);
    try {
      const [dataAbastecimentos, dataFazendas, dataPostos, dataUsuarios] = await Promise.all([
        fuelService.getAbastecimentos(),
        db.getFazendas(),
        fuelService.getPostos(),
        db.getAllUsers(),
      ]);
      setAbastecimentos(dataAbastecimentos);
      setFazendas(dataFazendas);
      setPostos(dataPostos);
      setUsuarios(dataUsuarios);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function loadNuntecData() {
    // Only load if configured postos exist
    const configuredPostos = postos.filter((p) => p.nuntec_reservoir_id);
    if (configuredPostos.length === 0) {
      setPendenciasNuntec([]);
      return;
    }

    try {
      setNuntecError(null); // Reset error

      // Fetch Config Date for UI
      const config = await db.getIntegrationConfig();
      setSyncStartDate(config?.sync_start_date || null);

      // Fetch Ignored
      const ignored = await db.getIgnoredNuntecTransfers();
      setIgnoredIds(new Set(ignored));

      const transfers = await nuntecService.getPendingTransfers(configuredPostos, abastecimentos);

      setLastUpdate(new Date());

      // Apply farm visibility filter for non-admins
      let visibleTransfers = transfers;
      if (!hasFullManagement && user?.fazenda_id) {
        // Find visible reservoir IDs based on user farm
        const visibleReservoirIds = new Set(
          configuredPostos
            .filter((p) => p.fazenda_id === user.fazenda_id)
            .map((p) => p.nuntec_reservoir_id),
        );
        visibleTransfers = transfers.filter(
          (t) =>
            t['pointing-in']['reservoir-id'] &&
            visibleReservoirIds.has(t['pointing-in']['reservoir-id']),
        );
      }

      setPendenciasNuntec(visibleTransfers);
    } catch (error: any) {
      console.error('Error loading Nuntec data', error);
      setNuntecError(error.message || 'Falha ao sincronizar com a Nuntec.');
      setPendenciasNuntec([]); // Clear stale data on error to avoid confusion
    }
  }

  const handleCreate = () => {
    setSelectedItem(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (item: Abastecimento) => {
    setSelectedItem(item);
    setIsFormOpen(true);
  };

  const handleDetails = (item: Abastecimento) => {
    setSelectedItem(item);
    setIsDetailsOpen(true);
  };

  const handleConfirm = async (item: Abastecimento) => {
    try {
      await fuelService.confirmBaixa(item.id, user!.id);
      await loadData();
      setIsDetailsOpen(false);
    } catch (error) {
      console.error(error);
      alert('Erro ao confirmar baixa.');
    }
  };

  const handleDelete = async (item: Abastecimento) => {
    if (item.status !== 'PENDENTE' && !hasFullManagement) {
      alert('Apenas abastecimentos pendentes podem ser excluídos.');
      return;
    }
    if (!confirm('Tem certeza que deseja EXCLUIR este registro?')) return;
    try {
      await fuelService.deleteAbastecimento(item.id, user!.id);
      loadData();
    } catch (error) {
      console.error(error);
      alert('Erro ao excluir.');
    }
  };

  const handleFormSave = () => {
    loadData();
  };

  const handleResolveNuntec = (transfer: NuntecTransfer) => {
    setResolutionTransfer(transfer);
    setIsResolutionOpen(true);
  };

  const handleResolveSuccess = async () => {
    // Refresh local data (to see the new Abastecimento) and Nuntec list (to remove the item)
    await loadData();
    // Force refresh of Nuntec data immediately after loadData finishes
    // (useEffect on abastecimentos will trigger, but let's be explicit if needed or let useEffect handle it)
  };

  async function handleIgnore(transfer: NuntecTransfer) {
    if (
      !user ||
      !window.confirm(
        'Tem certeza que deseja ignorar esta pendência? Ela sairá da lista principal.',
      )
    )
      return;
    try {
      await db.ignoreNuntecTransfer(transfer.id, user.id);
      setIgnoredIds((prev) => new Set(prev).add(transfer.id));
    } catch (e) {
      console.error(e);
      alert('Erro ao ignorar.');
    }
  }

  async function handleRestore(transfer: NuntecTransfer) {
    if (!window.confirm('Restaurar esta pendência para a lista principal?')) return;
    try {
      await db.restoreNuntecTransfer(transfer.id);
      setIgnoredIds((prev) => {
        const next = new Set(prev);
        next.delete(transfer.id);
        return next;
      });
    } catch (e) {
      console.error(e);
      alert('Erro ao restaurar.');
    }
  }

  // Filter Logic
  const availableUserIds = useMemo(() => {
    const ids = new Set<string>();
    abastecimentos.forEach((a) => {
      if (activeFilter === 'PENDENTE' && a.status !== 'PENDENTE') return;
      if (filterFazenda && a.fazenda_id !== filterFazenda) return;
      if (filterPosto && a.posto_id !== filterPosto) return;
      if (filterStartDate || filterEndDate) {
        const date = parseISO(a.data_abastecimento);
        if (filterStartDate && date < parseISO(filterStartDate + 'T00:00:00')) return;
        if (filterEndDate && date > parseISO(filterEndDate + 'T23:59:59')) return;
      }
      ids.add(a.usuario_id);
    });
    return ids;
  }, [abastecimentos, filterFazenda, filterPosto, filterStartDate, filterEndDate, activeFilter]);

  const filteredList = abastecimentos.filter((a) => {
    if (!canViewAll && a.usuario_id !== user?.id) return false;

    // Active Filter (Card Logic)
    if (activeFilter === 'PENDENTE' && a.status !== 'PENDENTE') return false;

    if (filterFazenda && a.fazenda_id !== filterFazenda) return false;
    if (filterPosto && a.posto_id !== filterPosto) return false;
    if (filterUser && a.usuario_id !== filterUser) return false;

    if (filterStartDate || filterEndDate) {
      const date = parseISO(a.data_abastecimento);
      if (filterStartDate && date < parseISO(filterStartDate + 'T00:00:00')) return false;
      if (filterEndDate && date > parseISO(filterEndDate + 'T23:59:59')) return false;
    }

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return (
        a.numero.toString().includes(s) ||
        (a.veiculo_nome || '').toLowerCase().includes(s) ||
        a.operador.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const sortedList = [...filteredList].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    let valA: any = a;
    let valB: any = b;

    switch (key) {
      case 'numero':
        valA = a.numero;
        valB = b.numero;
        break;
      case 'status':
        valA = a.status;
        valB = b.status;
        break;
      case 'data':
        valA = new Date(a.data_abastecimento).getTime();
        valB = new Date(b.data_abastecimento).getTime();
        break;
      case 'fazenda':
        valA = a.fazenda?.nome || '';
        valB = b.fazenda?.nome || '';
        break;
      case 'veiculo':
        valA = a.veiculo_nome || '';
        valB = b.veiculo_nome || '';
        break;
      case 'volume':
        valA = a.volume;
        valB = b.volume;
        break;
      case 'marcador':
        valA = Number(a.leitura_marcador) || 0;
        valB = Number(b.leitura_marcador) || 0;
        break;
      case 'usuario':
        valA = a.usuario?.nome || usuarios.find((u) => u.id === a.usuario_id)?.nome || '';
        valB = b.usuario?.nome || usuarios.find((u) => u.id === b.usuario_id)?.nome || '';
        break;
      case 'operador':
        valA = a.operador || '';
        valB = b.operador || '';
        break;
      default:
        return 0;
    }

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const pendenciasCount = abastecimentos.filter((a) => a.status === 'PENDENTE').length;
  const pendenciasVolume = abastecimentos
    .filter((a) => a.status === 'PENDENTE')
    .reduce((acc, curr) => acc + curr.volume, 0);

  const totalLitros = abastecimentos.reduce((acc, curr) => acc + curr.volume, 0); // Total Global
  const totalRegistros = abastecimentos.length; // Total Global

  const clearFilters = () => {
    setFilterFazenda('');
    setFilterPosto('');
    setFilterUser('');
    setFilterStartDate('');
    setFilterEndDate('');
    setSearchTerm('');
    setActiveFilter('ALL');
  };

  const hasActiveFilters =
    filterFazenda ||
    filterPosto ||
    filterUser ||
    filterStartDate ||
    filterEndDate ||
    searchTerm ||
    activeFilter === 'PENDENTE';

  if (loading)
    return (
      <div className="h-screen w-full flex items-center justify-center text-blue-600">
        Carregando dados...
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="Baixas de Combustível"
        subtitle="Controle de saída de combustível e pendências manuais"
        icon={Fuel}
      >
        {canManageFleet && (
          <button
            onClick={() => setIsFleetModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-semibold shadow-sm"
          >
            <Settings size={20} className="text-slate-400" />
            <span className="hidden sm:inline">Frota</span>
          </button>
        )}
        {canCreate && canCreateManual && (
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all font-semibold"
          >
            <Plus size={20} /> Baixar Combustível
          </button>
        )}
      </PageHeader>

      {/* View Toggle */}
      <div className="flex items-center gap-4 border-b border-slate-200">
        <button
          onClick={() => setViewMode('LOCAL')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${viewMode === 'LOCAL' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <List size={16} /> Baixas Internas
        </button>
        <button
          onClick={() => setViewMode('INTEGRATION')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${viewMode === 'INTEGRATION' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Link size={16} /> Pendências Nuntec
          {pendenciasNuntec.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-full">
              {pendenciasNuntec.length}
            </span>
          )}
        </button>
      </div>

      {viewMode === 'LOCAL' ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatsCard
              title="VOLUME TOTAL"
              value={`${totalLitros.toFixed(0)} L`}
              icon={Droplet}
              description="litros consumidos"
              variant={activeFilter === 'ALL' ? 'green' : 'default'}
              onClick={() => setActiveFilter('ALL')}
              className={`hover:bg-green-50 ${activeFilter === 'ALL' ? 'ring-2 ring-green-200 bg-green-50' : ''}`}
            />
            <StatsCard
              title="REGISTROS"
              value={totalRegistros}
              icon={FileText}
              description="abastecimentos realizados"
              variant="blue"
            />
            <StatsCard
              title="PENDÊNCIAS"
              value={pendenciasCount}
              icon={AlertTriangle}
              description={`${pendenciasVolume.toFixed(0)} litros pendentes`}
              variant={activeFilter === 'PENDENTE' ? 'orange' : 'default'}
              onClick={() => setActiveFilter(activeFilter === 'PENDENTE' ? 'ALL' : 'PENDENTE')}
              className={`hover:bg-orange-50 ${activeFilter === 'PENDENTE' ? 'ring-2 ring-orange-200 bg-orange-50' : ''}`}
            />
          </div>

          {/* Filters */}
          <FilterBar
            onSearch={setSearchTerm}
            searchValue={searchTerm}
            searchPlaceholder="Buscar por Nº, Veículo ou Operador..."
            onClear={clearFilters}
            hasActiveFilters={!!hasActiveFilters}
            advancedFilters={
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <Calendar size={12} /> Data Inicial
                  </label>
                  <input
                    type="date"
                    className="w-full text-sm rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500 shadow-sm py-2"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <Calendar size={12} /> Data Final
                  </label>
                  <input
                    type="date"
                    className="w-full text-sm rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500 shadow-sm py-2"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <Building2 size={12} /> Filial
                  </label>
                  <select
                    className="w-full text-sm rounded-xl border-slate-200 bg-white py-2"
                    value={filterFazenda}
                    onChange={(e) => {
                      setFilterFazenda(e.target.value);
                      setFilterPosto('');
                    }}
                  >
                    <option value="">Todas</option>
                    {fazendas.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <MapPin size={12} /> Posto
                  </label>
                  <select
                    className="w-full text-sm rounded-xl border-slate-200 bg-white py-2"
                    value={filterPosto}
                    onChange={(e) => setFilterPosto(e.target.value)}
                  >
                    <option value="">Todos</option>
                    {postos
                      .filter((p) => !filterFazenda || p.fazenda_id === filterFazenda)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <User size={12} /> Usuário
                  </label>
                  <select
                    className="w-full text-sm rounded-xl border-slate-200 bg-white py-2"
                    value={filterUser}
                    onChange={(e) => setFilterUser(e.target.value)}
                  >
                    <option value="">Todos</option>
                    {usuarios
                      .filter((u) => availableUserIds.has(u.id))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome}
                        </option>
                      ))}
                  </select>
                </div>
              </>
            }
          />

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold text-xs border-b border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th
                      className="px-6 py-4 cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort('data')}
                    >
                      <div className="flex items-center gap-2">
                        Data{' '}
                        <SortIcon
                          active={sortConfig?.key === 'data'}
                          direction={sortConfig?.direction}
                        />
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort('fazenda')}
                    >
                      <div className="flex items-center gap-2">
                        Posto{' '}
                        <SortIcon
                          active={sortConfig?.key === 'fazenda'}
                          direction={sortConfig?.direction}
                        />
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort('operador')}
                    >
                      <div className="flex items-center gap-2">
                        Operador{' '}
                        <SortIcon
                          active={sortConfig?.key === 'operador'}
                          direction={sortConfig?.direction}
                        />
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort('veiculo')}
                    >
                      <div className="flex items-center gap-2">
                        Veículo{' '}
                        <SortIcon
                          active={sortConfig?.key === 'veiculo'}
                          direction={sortConfig?.direction}
                        />
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort('volume')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        Volume (L){' '}
                        <SortIcon
                          active={sortConfig?.key === 'volume'}
                          direction={sortConfig?.direction}
                        />
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort('marcador')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        Marcador{' '}
                        <SortIcon
                          active={sortConfig?.key === 'marcador'}
                          direction={sortConfig?.direction}
                        />
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        Status{' '}
                        <SortIcon
                          active={sortConfig?.key === 'status'}
                          direction={sortConfig?.direction}
                        />
                      </div>
                    </th>
                    <th className="px-6 py-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {sortedList.length === 0 ? (
                    <tr>
                      <td colSpan={9}>
                        <EmptyState />
                      </td>
                    </tr>
                  ) : (
                    sortedList.map((item) => {
                      const canEditThis = checkAccess({
                        module: MODULE_KEY,
                        action: 'edit',
                        resourceOwnerId: item.usuario_id,
                        resourceStatus: item.status,
                      });

                      return (
                        <tr
                          key={item.id}
                          onClick={() => handleDetails(item)}
                          className={`group transition-colors border-l-4 cursor-pointer hover:bg-slate-50 ${item.status === 'PENDENTE' ? 'border-l-amber-400 bg-amber-50/10' : 'border-l-transparent'}`}
                        >
                          {/* Data */}
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-600">
                                {format(parseISO(item.data_abastecimento), 'dd/MM/yyyy HH:mm')}
                              </span>
                              <div className="flex gap-1.5 mt-0.5">
                                {item.nuntec_transfer_id && (
                                  <span
                                    className="text-[10px] text-amber-600 font-mono"
                                    title="ID Nuntec"
                                  >
                                    ID: {item.nuntec_transfer_id.slice(0, 8)}...
                                  </span>
                                )}
                                <span
                                  className="text-[10px] text-slate-400 font-mono"
                                  title="Número Local"
                                >
                                  #{item.numero}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Origem / Posto (Bold Posto, Small Fazenda - Nuntec Style) */}
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-700" title={item.posto?.nome}>
                                {item.posto?.nome}
                              </span>
                              <span className="text-xs text-slate-500" title={item.fazenda?.nome}>
                                {item.fazenda?.nome}
                              </span>
                            </div>
                          </td>

                          {/* Operador (Shows item.operador) */}
                          <td className="px-6 py-4 text-slate-600 font-medium">{item.operador}</td>

                          {/* Veículo (Standard Display) */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <StatusBadge
                                status={item.veiculo_possui_cadastro ? '' : '⚠️'}
                                variant={item.veiculo_possui_cadastro ? 'info' : 'warning'}
                                icon={Truck}
                                size="sm"
                                className={
                                  item.veiculo_possui_cadastro
                                    ? 'bg-blue-50 text-blue-600 border-blue-100'
                                    : 'bg-orange-50 text-orange-600 border-orange-100'
                                }
                              />
                              <span
                                className="font-medium text-slate-700 truncate max-w-[100px]"
                                title={item.veiculo_nome || item.veiculo_id || ''}
                              >
                                {item.veiculo_nome || item.veiculo_id?.slice(0, 8)}
                              </span>
                            </div>
                          </td>

                          {/* Volume */}
                          <td className="px-6 py-4 text-right">
                            <span className="font-bold text-slate-700">
                              {item.volume.toFixed(2)}
                            </span>
                          </td>

                          {/* Marcador */}
                          <td className="px-6 py-4 text-right">
                            <span className="font-mono text-slate-600">
                              {item.tipo_marcador === 'SEM_MEDIDOR' ? '-' : item.leitura_marcador}
                            </span>
                          </td>

                          {/* Status (Center) */}
                          <td className="px-6 py-4 text-center">
                            <StatusBadge
                              status={item.status === 'PENDENTE' ? 'Pendente' : 'Baixado'}
                              variant={item.status === 'PENDENTE' ? 'warning' : 'success'}
                              size="sm"
                            />
                          </td>

                          {/* Ações */}
                          <td className="px-6 py-4 text-center">
                            <TableActions
                              onHistory={() => {
                                setHistoryId(item.id);
                                setShowHistory(true);
                              }}
                              onEdit={undefined}
                              onDelete={
                                canEditThis && (item.status === 'PENDENTE' || hasFullManagement)
                                  ? () => handleDelete(item)
                                  : undefined
                              }
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        // --- INTEGRATION VIEW ---
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm text-amber-600">
                <Link size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-amber-900">Integração Nuntec</h3>
                <p className="text-sm text-amber-700">
                  Abastecimentos transferidos para reservatórios monitorados ("Gerente") que
                  precisam de dados complementares.
                </p>

                <div className="flex items-center gap-4 mt-2 text-xs text-amber-800/70 border-t border-amber-200/50 pt-2">
                  <span className="flex items-center gap-1.5" title="Momento da última verificação">
                    <RefreshCw size={12} />
                    Atualizado: {lastUpdate ? format(lastUpdate, 'HH:mm') : '-'}
                  </span>
                  <span
                    className="flex items-center gap-1.5"
                    title="Data de corte configurada para sincronização"
                  >
                    <Calendar size={12} />
                    Período:{' '}
                    {syncStartDate
                      ? `A partir de ${format(parseISO(syncStartDate), 'dd/MM/yyyy')}`
                      : 'Padrão'}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className="block text-2xl font-bold text-amber-900">
                {pendenciasNuntec.filter((p) => !ignoredIds.has(p.id)).length}
              </span>
              <span className="text-xs font-semibold text-amber-600 uppercase mb-2">
                Pendências Requerem Atenção
              </span>

              <button
                onClick={() => setShowIgnored(!showIgnored)}
                className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                  showIgnored
                    ? 'bg-slate-800 text-white border-slate-700'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                }`}
              >
                {showIgnored ? <EyeOff size={12} /> : <Eye size={12} />}
                {showIgnored ? 'Ocultar Ignorados' : 'Ver Ignorados'}
              </button>
            </div>
          </div>

          {nuntecError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="p-2 bg-red-100 rounded-lg text-red-600 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-red-800">Falha na Sincronização</h4>
                <p className="text-sm text-red-700 mt-1 leading-relaxed">
                  Não foi possível buscar as pendências da Nuntec.
                  <br />
                  <span className="font-mono text-xs bg-red-100/50 px-1 rounded">
                    {nuntecError}
                  </span>
                </p>
              </div>
              {hasFullManagement && (
                <button
                  onClick={() => navigate('/postos')}
                  className="px-4 py-2 bg-white border border-red-200 text-red-700 text-xs font-bold rounded-lg hover:bg-red-50 hover:border-red-300 transition-all shadow-sm shrink-0"
                >
                  Ver Configuração
                </button>
              )}
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold text-xs border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Data Transferência</th>
                  <th className="px-6 py-4">Destino (Posto)</th>
                  <th className="px-6 py-4">Operador Original</th>
                  <th className="px-6 py-4 text-right">Volume (L)</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {pendenciasNuntec.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        icon={CheckCircle}
                        title="Tudo em dia!"
                        description="Nenhuma transferência pendente encontrada na integração."
                      />
                    </td>
                  </tr>
                ) : (
                  pendenciasNuntec.map((t) => {
                    const isIgnored = ignoredIds.has(t.id);

                    // Mode Logic:
                    // If Show Ignored is OFF -> Show only NOT Ignored
                    // If Show Ignored is ON -> Show only Ignored
                    if (showIgnored) {
                      if (!isIgnored) return null;
                    } else {
                      if (isIgnored) return null;
                    }

                    // Find Posto Name
                    const posto = postos.find(
                      (p) => p.nuntec_reservoir_id === t['pointing-in']['reservoir-id'],
                    );
                    const fazenda = fazendas.find((f) => f.id === posto?.fazenda_id);

                    return (
                      <tr
                        key={t.id}
                        className={`transition-colors ${isIgnored ? 'bg-slate-50' : 'hover:bg-amber-50/30'}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span
                              className={`font-medium ${isIgnored ? 'text-slate-400' : 'text-slate-600'}`}
                            >
                              {format(parseISO(t['start-at']), 'dd/MM/yyyy HH:mm')}
                            </span>
                            <span
                              className="text-[10px] text-slate-400 font-mono mt-0.5"
                              title="ID da Transferência Nuntec"
                            >
                              ID: {t.id}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span
                              className={`font-bold ${isIgnored ? 'text-slate-500' : 'text-slate-700'}`}
                            >
                              {posto
                                ? posto.nome
                                : `Reservatório #${t['pointing-in']['reservoir-id'] || '?'}`}
                            </span>
                            <span className="text-xs text-slate-500">
                              {fazenda
                                ? fazenda.nome
                                : posto
                                  ? 'Fazenda não vinculada'
                                  : 'Não mapeado'}
                            </span>
                            {/* Debug/Info helper */}
                            <span className="text-[10px] text-amber-600 font-mono mt-0.5">
                              (ID Nuntec: {t['pointing-in']['reservoir-id']})
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {t.operatorName || t['operator-id'] || '-'}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-700">
                          {Math.abs(t['pointing-in'].amount).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isIgnored ? (
                            <StatusBadge status="Ignorado" variant="default" size="sm" />
                          ) : (
                            <StatusBadge status="Pendente Dados" variant="warning" size="sm" />
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {isIgnored ? (
                              <button
                                onClick={() => handleRestore(t)}
                                className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-all flex items-center gap-1.5 border border-slate-200"
                                title="Restaurar para pendentes"
                              >
                                <Undo2 size={14} /> Restaurar
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleResolveNuntec(t)}
                                  className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 shadow-sm transition-all flex items-center gap-2"
                                >
                                  Review & Baixar
                                </button>
                                {canIgnoreNuntec && (
                                  <button
                                    onClick={() => handleIgnore(t)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    title="Ignorar esta pendência"
                                  >
                                    <Ban size={16} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <FuelingFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleFormSave}
        initialData={selectedItem}
        fazendas={fazendas}
        postos={postos}
      />

      <FuelingDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onConfirm={
          selectedItem &&
          checkAccess({
            module: MODULE_KEY,
            action: 'confirm',
            resourceOwnerId: selectedItem.usuario_id,
            resourceStatus: selectedItem.status,
          })
            ? () => selectedItem && handleConfirm(selectedItem)
            : undefined
        }
        data={
          selectedItem
            ? {
                ...selectedItem,
                usuario: selectedItem.usuario || {
                  nome:
                    usuarios.find((u) => u.id === selectedItem.usuario_id)?.nome || 'Desconhecido',
                },
              }
            : undefined
        }
      />

      {resolutionTransfer && (
        <FuelingResolutionModal
          isOpen={isResolutionOpen}
          onClose={() => {
            setIsResolutionOpen(false);
            setResolutionTransfer(undefined);
          }}
          onResolve={handleResolveSuccess}
          transfer={resolutionTransfer}
          fazendas={fazendas}
          postos={postos}
        />
      )}

      {showHistory && historyId && (
        <AuditLogModal
          isOpen={showHistory}
          onClose={() => {
            setShowHistory(false);
            setHistoryId(null);
          }}
          registroId={historyId}
          useSimpleFetch={true}
        />
      )}

      <VehicleManagementModal
        isOpen={isFleetModalOpen}
        onClose={() => setIsFleetModalOpen(false)}
      />
    </div>
  );
}
