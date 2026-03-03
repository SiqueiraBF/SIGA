import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { fuelService } from '../services/fuelService';
import { nuntecService } from '../services/nuntecService';
import { db } from '../services/supabaseService';
import { useAuth } from '../context/AuthContext';
import type { Abastecimento, Fazenda, Posto, Modulo, NuntecTransfer } from '../types';
import {
  Plus,
  Search,
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
  ShieldCheck,
} from 'lucide-react';
import { format, parseISO, isBefore, isAfter, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { FuelingFormModal } from '../components/FuelingFormModal';
import { FuelingDetailsModal } from '../components/FuelingDetailsModal';
import { FuelingResolutionModal } from '../components/FuelingResolutionModal';
import { AuditLogModal } from '../components/AuditLogModal';
import { VehicleManagementModal } from '../components/VehicleManagementModal';
import { ComplianceDashboard } from '../components/dashboard/ComplianceDashboard';

// UI Kit
import { PageHeader } from '../components/ui/PageHeader';
import StatsCard from '../components/ui/StatsCard';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { StatsSkeleton } from '../components/ui/StatsSkeleton';
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
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  // Removed explicit abast state, now derived from infinite query
  // const [abastecimentos, setAbastecimentos] = useState<Abastecimento[]>([]);
  // Removed local state: pendenciasNuntec, nuntecError, lastUpdate, syncStartDate, ignoredIds
  // showIgnored logic remains
  const [showIgnored, setShowIgnored] = useState(false);

  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [postos, setPostos] = useState<(Posto & { fazenda: { nome: string } })[]>([]);
  const [usuarios, setUsuarios] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRepairing, setIsRepairing] = useState(false);

  // View Mode: LOCAL = Baixas Internas, INTEGRATION = Pendências Nuntec, AUDIT = Auditoria
  const [viewMode, setViewMode] = useState<'LOCAL' | 'INTEGRATION' | 'AUDIT'>('LOCAL');

  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'integration') {
      setViewMode('INTEGRATION');
    } else if ((location.state as any)?.viewMode) {
      setViewMode((location.state as any).viewMode);
    }
  }, [location.state, searchParams]);

  // Filters & View Mode
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // New Filters Requested
  const [filterVeiculo, setFilterVeiculo] = useState('');
  const [filterSemMedidor, setFilterSemMedidor] = useState(false);

  // Filtro Interativo (Similar ao RegistrarDashboard)
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDENTE'>('ALL');
  const [selectedPostoId, setSelectedPostoId] = useState<string | null>(null);
  const [selectedNuntecReservoirId, setSelectedNuntecReservoirId] = useState<number | null>(null);

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

  const viewScope = role?.permissoes?.[MODULE_KEY]?.view_scope;
  const canViewAllFarms = viewScope === 'ALL' || role?.nome === 'Administrador';
  const targetFarmId = !canViewAllFarms ? user?.fazenda_id : undefined;

  // --- Infinite Query for Abastecimentos ---

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingAbastecimentos,
    isError
  } = useInfiniteQuery({
    queryKey: ['abastecimentos', {
      startDate: filterStartDate,
      endDate: filterEndDate,
      farmId: targetFarmId,
    }],
    queryFn: async ({ pageParam = 0 }) => {
      return fuelService.getAbastecimentos({
        dataInicio: filterStartDate || undefined,
        dataFim: filterEndDate || undefined,
        fazenda_id: targetFarmId,
        page: pageParam as number,
        limit: 50
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 50 ? allPages.length : undefined;
    },
    staleTime: 1000 * 60 * 5, // 5 min
  });

  const abastecimentos = useMemo(() => {
    return data?.pages.flatMap(page => page) || [];
  }, [data]);

  // Load static data (Postos, Fazendas, Users) only ONCE
  useEffect(() => {
    loadStaticData();
  }, []);

  async function loadStaticData() {
    try {
      const [dataFazendas, dataPostos, dataUsuarios] = await Promise.all([
        db.getFazendas(),
        fuelService.getPostos(targetFarmId),
        db.getAllUsers(),
      ]);
      setFazendas(dataFazendas);
      setPostos(dataPostos);
      setUsuarios(dataUsuarios);
      setLoading(false); // Initial static load done
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }

  // Reload data (invalidate query) when dates change is handled automatically by queryKey

  // Intersection Observer for Infinite Scroll
  const observerTarget = React.useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [observerTarget, hasNextPage, fetchNextPage]);


  // --- React Query Implementation for Nuntec ---

  // 1. Integration Config
  const { data: config } = useQuery({
    queryKey: ['integration-config'],
    queryFn: db.getIntegrationConfig,
    staleTime: 1000 * 60 * 30, // 30 min
    enabled: viewMode === 'INTEGRATION',
  });
  const syncStartDate = config?.sync_start_date || null;

  // 2. Ignored Set
  const { data: ignoredList = [] } = useQuery({
    queryKey: ['nuntec-ignored', user?.id],
    queryFn: db.getIgnoredNuntecTransfers,
    staleTime: 1000 * 60 * 5,
    enabled: viewMode === 'INTEGRATION' && !!user,
  });
  const ignoredIds = useMemo(() => new Set(ignoredList), [ignoredList]);

  // 3. Raw Pending Transfers (from API)
  // Define configuredPostos first to be used in query
  const configuredPostos = useMemo(() =>
    postos.filter((p) => p.nuntec_reservoir_id && p.tipo === 'VIRTUAL'),
    [postos]
  );

  const {
    data: rawTransfers = [],
    isLoading: isLoadingNuntec,
    error: rawNuntecError,
    dataUpdatedAt
  } = useQuery({
    queryKey: ['nuntec-transfers', { farmId: user?.fazenda_id }],
    queryFn: async () => {
      // Pass empty array for abastecimentos to fetch ALL candidates without filtering locally yet
      return nuntecService.getPendingTransfers(configuredPostos, []);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    gcTime: 1000 * 60 * 30,  // Keep in memory for 30 min
    enabled: viewMode === 'INTEGRATION' && configuredPostos.length > 0,
    retry: 1
  });

  // 3b. Fetch Global Existing Transfer IDs (to avoid pagination issue)
  const { data: globalExistingIds = [] } = useQuery({
    queryKey: ['all-existing-nuntec-ids'],
    queryFn: fuelService.getAllNuntecTransferIds,
    staleTime: 1000 * 60 * 5, // 5 min
    enabled: viewMode === 'INTEGRATION'
  });

  const nuntecError = rawNuntecError ? (rawNuntecError as Error).message : null;
  const lastUpdate = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  // 4. Derived State: Filter Raw Transfers vs Installed Abastecimentos
  const pendenciasNuntec = useMemo(() => {
    // a. Farm Filter
    let visible = rawTransfers;
    if (!canViewAllFarms && user?.fazenda_id) {
      const visibleReservoirIds = new Set(
        configuredPostos
          .filter((p) => p.fazenda_id === user.fazenda_id && p.nuntec_reservoir_id)
          .map((p) => String(p.nuntec_reservoir_id)),
      );
      visible = rawTransfers.filter(
        (t) =>
          t['pointing-in'] && t['pointing-in']['reservoir-id'] &&
          visibleReservoirIds.has(String(t['pointing-in']['reservoir-id'])),
      );
    }

    // b. Active Abastecimentos Filter (Remove items that already have a linked abastecimento)
    // Use the global list required to catch items not in current page
    const existingTransferIds = new Set(globalExistingIds);

    return visible.filter(t => !existingTransferIds.has(String(t.id)));

  }, [rawTransfers, globalExistingIds, canViewAllFarms, user, configuredPostos]);

  // Create a filtered view of data based on permissions
  const visibleAbastecimentos = useMemo(() => {
    if (!canViewAllFarms && user?.fazenda_id) {
      return abastecimentos.filter(a => {
        // 1. Direct check
        if (a.fazenda_id && String(a.fazenda_id) === String(user.fazenda_id)) return true;

        // 2. Fallback check via Posto (if fazenda_id is null/missing on record)
        if (a.posto_id) {
          const posto = postos.find(p => p.id === a.posto_id);
          return posto ? String(posto.fazenda_id) === String(user.fazenda_id) : false;
        }
        return false;
      });
    }
    return abastecimentos;
  }, [abastecimentos, canViewAllFarms, user, postos]);

  const uniqueVehicles = useMemo(() => {
    const set = new Set(visibleAbastecimentos.map(a => a.veiculo_nome).filter((v): v is string => !!v));
    return Array.from(set).sort();
  }, [visibleAbastecimentos]);

  // Removed manual loadData in favor of React Query
  // Helper to re-fetch if needed (e.g. after edit)
  const refetchData = () => {
    queryClient.invalidateQueries({ queryKey: ['abastecimentos'] });
  };

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

  const handleConfirm = async (item: Abastecimento, nuntecId?: string) => {
    try {
      await fuelService.confirmBaixa(item.id, user!.id, nuntecId);
      refetchData();
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
      refetchData();
    } catch (error) {
      console.error(error);
      alert('Erro ao excluir.');
    }
  };

  const handleFormSave = () => {
    refetchData();
  };

  const handleResolveNuntec = (transfer: NuntecTransfer) => {
    setResolutionTransfer(transfer);
    setIsResolutionOpen(true);
  };

  const handleResolveSuccess = async () => {
    // Refresh local data (to see the new Abastecimento) and Nuntec list (to remove the item)
    refetchData();
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
      queryClient.invalidateQueries({ queryKey: ['nuntec-ignored'] });
    } catch (e) {
      console.error(e);
      alert('Erro ao ignorar.');
    }
  }

  async function handleRestore(transfer: NuntecTransfer) {
    if (!window.confirm('Restaurar esta pendência para a lista principal?')) return;
    try {
      await db.restoreNuntecTransfer(transfer.id);
      queryClient.invalidateQueries({ queryKey: ['nuntec-ignored'] });
    } catch (e) {
      console.error(e);
      alert('Erro ao restaurar.');
    }
  }

  // availableUserIds logic removed as User filter is deprecated
  // Only recalculate filteredList directly


  const filteredList = useMemo(() => {
    const hasBroadScope = viewScope === 'ALL' || viewScope === 'SAME_FARM' || role?.nome === 'Administrador';

    return visibleAbastecimentos.filter((a) => {
      // Only restrict to own records if user lacks broad scope AND explicit view permission
      if (!hasBroadScope && !canViewAll && a.usuario_id !== user?.id) return false;

      // Active Filter
      if (activeFilter === 'PENDENTE' && a.status !== 'PENDENTE') return false;

      // Card Filter
      if (selectedPostoId) {
        if (a.posto_id !== selectedPostoId || a.status !== 'PENDENTE') return false;
      }

      // New Filters
      if (filterVeiculo && a.veiculo_nome !== filterVeiculo) return false;
      if (filterSemMedidor && a.tipo_marcador !== 'SEM_MEDIDOR') return false;

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
          a.operador.toLowerCase().includes(s) ||
          (a.nuntec_transfer_id || '').toLowerCase().includes(s) ||
          (a.nuntec_generated_id || '').toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [visibleAbastecimentos, canViewAll, user, activeFilter, selectedPostoId, filterVeiculo, filterSemMedidor, filterStartDate, filterEndDate, searchTerm]);

  const sortedList = useMemo(() => {
    return [...filteredList].sort((a, b) => {
      if (!sortConfig) return 0;
      const { key, direction } = sortConfig;
      let valA: any = a;
      let valB: any = b;

      switch (key) {
        case 'numero': valA = a.numero; valB = b.numero; break;
        case 'status': valA = a.status; valB = b.status; break;
        case 'data': valA = new Date(a.data_abastecimento).getTime(); valB = new Date(b.data_abastecimento).getTime(); break;
        case 'fazenda': valA = a.fazenda?.nome || ''; valB = b.fazenda?.nome || ''; break;
        case 'veiculo': valA = a.veiculo_nome || ''; valB = b.veiculo_nome || ''; break;
        case 'volume': valA = a.volume; valB = b.volume; break;
        case 'marcador': valA = Number(a.leitura_marcador) || 0; valB = Number(b.leitura_marcador) || 0; break;
        case 'usuario':
          valA = a.usuario?.nome || usuarios.find(u => u.id === a.usuario_id)?.nome || '';
          valB = b.usuario?.nome || usuarios.find(u => u.id === b.usuario_id)?.nome || '';
          break;
        case 'operador': valA = a.operador || ''; valB = b.operador || ''; break;
        default: return 0;
      }

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredList, sortConfig, usuarios]);

  // Let's target specific vars instead.

  const pendenciasCount = visibleAbastecimentos.filter((a) => a.status === 'PENDENTE').length;
  const pendenciasVolume = visibleAbastecimentos
    .filter((a) => a.status === 'PENDENTE')
    .reduce((acc, curr) => acc + curr.volume, 0);

  const totalLitros = visibleAbastecimentos.reduce((acc, curr) => acc + curr.volume, 0);
  const totalRegistros = visibleAbastecimentos.length;

  const handleBulkRepair = async () => {
    if (!window.confirm('Deseja buscar novamente dados técnicos (Fuel ID, Reservatórios) para TODOS os registros integrados incompletos?\n\nIsso pode levar alguns segundos.')) return;

    setIsRepairing(true);
    try {
      const { nuntecService } = await import('../services/nuntecService');
      const result = await nuntecService.repairAllMissingData();

      if (result.total === 0) {
        alert('Todos os registros integrados já parecem estar completos!');
      } else {
        alert(`Processo Finalizado!\n\n🔍 Analisados: ${result.total}\n✅ Corrigidos: ${result.fixed}\n⚠️ Erros/Sem Dados: ${result.errors}`);
        // Force reload
        refetchData();
      }
    } catch (error: any) {
      alert('Erro ao processar reparo em massa: ' + error.message);
    } finally {
      setIsRepairing(false);
    }
  };

  const clearFilters = () => {
    setFilterVeiculo('');
    setFilterSemMedidor(false);
    setFilterStartDate('');
    setFilterEndDate('');
    setSearchTerm('');
    setActiveFilter('ALL');
  };

  /* Logic for breakdown by Posto (Pending only) used in the new interactive card */
  const breakdownData = useMemo(() => {
    const acc: Record<string, { volume: number; count: number; label: string; id: string }> = {};

    visibleAbastecimentos.filter(a => a.status === 'PENDENTE').forEach(a => {
      const fazenda = a.fazenda?.nome || 'N/A';
      const posto = a.posto?.nome || 'N/A';
      const pid = a.posto_id;
      // Use ID as key if available
      const key = pid || `${fazenda}-${posto}`;

      if (!acc[key]) {
        acc[key] = {
          volume: 0,
          count: 0,
          label: `${fazenda} • ${posto}`,
          id: pid || key
        };
      }
      acc[key].volume += a.volume;
      acc[key].count += 1;
    });
    return Object.values(acc).sort((a, b) => b.volume - a.volume);
  }, [abastecimentos]);

  /* Logic for Nuntec Breakdown by Posto (Integration) */
  const nuntecBreakdown = useMemo(() => {
    const acc: Record<number, { volume: number; count: number; label: string; id: number }> = {};
    pendenciasNuntec.filter(p => !ignoredIds.has(p.id)).forEach(t => {
      const resId = Number(t['pointing-in']['reservoir-id']);
      if (!resId) return;
      const posto = postos.find(p => Number(p.nuntec_reservoir_id) === resId);
      const nomeFazenda = posto?.fazenda?.nome || 'N/A';
      const nomePosto = posto?.nome || `ID ${resId}`;
      const label = `${nomeFazenda} • ${nomePosto}`;

      if (!acc[resId]) {
        acc[resId] = { volume: 0, count: 0, label, id: resId };
      }
      acc[resId].volume += Math.abs(t['pointing-in'].amount);
      acc[resId].count += 1;
    });
    return Object.values(acc).sort((a, b) => b.volume - a.volume);
  }, [pendenciasNuntec, postos, fazendas, ignoredIds]);

  const nuntecVolumeTotal = useMemo(() => {
    return pendenciasNuntec
      .filter(p => !ignoredIds.has(p.id))
      .reduce((acc, curr) => acc + Math.abs(curr['pointing-in'].amount), 0);
  }, [pendenciasNuntec, ignoredIds]);

  // Quick Date Filters
  const handleDateRange = (range: '7days' | 'month' | 'last-month') => {
    const today = new Date();
    let start, end;

    switch (range) {
      case '7days':
        start = subDays(today, 7);
        end = today;
        break;
      case 'month':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case 'last-month':
        const lastMonth = subMonths(today, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
    }

    setFilterStartDate(format(start, 'yyyy-MM-dd'));
    setFilterEndDate(format(end, 'yyyy-MM-dd'));
  };

  const hasActiveFilters =
    filterVeiculo ||
    filterSemMedidor ||
    filterStartDate ||
    filterEndDate ||
    searchTerm ||
    activeFilter === 'PENDENTE';

  if (loading || (isLoadingAbastecimentos && !data)) {
    return (
      <div className="min-h-screen bg-slate-50 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <PageHeader
            title="Baixas de Combustível"
            subtitle="Controle de saída de combustível e pendências manuais"
            icon={Fuel}
          >
            <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl opacity-50 cursor-not-allowed">
              <Plus size={20} /> Baixar Combustível
            </button>
          </PageHeader>
          <StatsSkeleton count={3} />
          <TableSkeleton rows={8} columns={7} />
        </div>
      </div>
    );
  }

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
        {/* <button
          onClick={handleBulkRepair}
          disabled={isRepairing}
          className={`flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-semibold shadow-sm ${isRepairing ? 'opacity-50 cursor-wait' : ''}`}
          title="Tentar recuperar dados técnicos (Fuel ID) de registros antigos"
        >
          <RefreshCw size={20} className={`text-blue-500 ${isRepairing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Reparar Dados</span>
        </button> */}
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
          {pendenciasNuntec.filter(p => !ignoredIds.has(p.id)).length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-full">
              {pendenciasNuntec.filter(p => !ignoredIds.has(p.id)).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setViewMode('AUDIT')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${viewMode === 'AUDIT' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <ShieldCheck size={16} /> Auditoria
        </button>
      </div>

      <div className={viewMode === 'AUDIT' ? 'block' : 'hidden'}>
        <div className="flex flex-col md:flex-row gap-4 p-4 border-b border-slate-200 bg-white mb-6">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg self-start md:self-auto overflow-x-auto max-w-full">
            <button
              onClick={() => handleDateRange('7days')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${filterStartDate === format(subDays(new Date(), 7), 'yyyy-MM-dd') ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              7 Dias
            </button>
            <button
              onClick={() => handleDateRange('month')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${filterStartDate === format(startOfMonth(new Date()), 'yyyy-MM-dd') ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Este Mês
            </button>
            <button
              onClick={() => handleDateRange('last-month')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${filterStartDate === format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd') ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Mês Passado
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
            />
          </div>
        </div>

        <ComplianceDashboard
          abastecimentos={abastecimentos}
          fazendas={fazendas}
          postos={postos}
          userFazendaId={user?.fazenda_id}
          canViewAllFarms={canViewAllFarms}
          startDate={filterStartDate}
          endDate={filterEndDate}
        />
      </div>

      <div className={viewMode !== 'AUDIT' ? 'block space-y-6' : 'hidden'}>
        {viewMode === 'LOCAL' && (
          <>
            {/* VOLUME BREAKDOWN CARD (Matches Integration View) */}
            <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm flex flex-col justify-between mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg text-green-600">
                    <Droplet size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Vol. Pendente por Posto</p>
                    <p className="text-xs text-slate-400 font-medium">clique no posto para filtrar a lista</p>
                  </div>
                </div>
                <div
                  className={`text-right cursor-pointer hover:opacity-80 transition-opacity ${!selectedPostoId ? 'text-green-600' : 'text-slate-400'}`}
                  onClick={() => setSelectedPostoId(null)}
                  title="Limpar filtro de posto"
                >
                  <span className="text-3xl font-bold">{pendenciasVolume.toFixed(0)} <span className="text-base font-medium">Total</span></span>
                </div>
              </div>

              {/* Grid de Postos (Matches Integration View) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 mt-2">
                {breakdownData.length > 0 ? (
                  breakdownData.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedPostoId(selectedPostoId === item.id ? null : item.id)}
                      className={`flex items-center justify-between text-sm py-2 px-3 rounded-lg cursor-pointer transition-all border group
                        ${selectedPostoId === item.id
                          ? 'bg-green-50 border-green-200 ring-1 ring-green-200 shadow-sm'
                          : 'bg-slate-50 border-transparent hover:bg-slate-100 hover:border-slate-200'}`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden flex-1">
                        <span className={`font-bold text-[10px] px-1.5 py-0.5 rounded-full min-w-[24px] text-center ${selectedPostoId === item.id ? 'bg-green-200 text-green-900' : 'bg-white text-slate-500 shadow-sm'}`}>{item.count}</span>
                        <span className={`font-medium truncate text-xs ${selectedPostoId === item.id ? 'text-green-900' : 'text-slate-600 group-hover:text-slate-800'}`} title={item.label}>{item.label}</span>
                      </div>
                      <span className={`font-bold ml-2 text-xs whitespace-nowrap ${selectedPostoId === item.id ? 'text-green-700' : 'text-slate-500'}`}>{item.volume.toFixed(0)} L</span>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-sm text-slate-400 italic py-4 text-center">Nenhuma pendência encontrada.</div>
                )}
              </div>
            </div>

            <FilterBar
              onSearch={setSearchTerm}
              searchValue={searchTerm}
              searchPlaceholder="Buscar por Nº, Veículo ou Operador..."
              onClear={() => {
                setSearchTerm('');
                setFilterVeiculo('');
                setFilterSemMedidor(false);
                setFilterStartDate('');
                setFilterEndDate('');
              }}
              hasActiveFilters={
                !!searchTerm || !!filterVeiculo || filterSemMedidor || !!filterStartDate || !!filterEndDate
              }
              advancedFilters={
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      <Calendar size={12} /> Data Inicial
                    </label>
                    <input
                      type="date"
                      className="w-full text-sm rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500 shadow-sm py-2"
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
                      className="w-full text-sm rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500 shadow-sm py-2"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      <Truck size={12} /> Veículo
                    </label>
                    <select
                      className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                      value={filterVeiculo}
                      onChange={(e) => setFilterVeiculo(e.target.value)}
                    >
                      <option value="">Todos</option>
                      {uniqueVehicles.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 w-full cursor-pointer hover:bg-slate-100 transition-colors">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={filterSemMedidor}
                        onChange={(e) => setFilterSemMedidor(e.target.checked)}
                      />
                      <span className="font-medium">Apenas Sem Medidor</span>
                    </label>
                  </div>
                </>
              }
            />

            {/* Main Table Container */}
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

                {/* Sentinel for Infinite Scroll */}
                <div ref={observerTarget} className="h-4 p-4 flex justify-center w-full">
                  {isFetchingNextPage && (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  )}
                  {!hasNextPage && abastecimentos.length > 0 && (
                    <span className="text-xs text-slate-400 italic">Todos os registros carregados</span>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {viewMode !== 'LOCAL' && (
          // --- INTEGRATION VIEW ---
          <div className="space-y-6">
            {/* Nuntec Interactive Card - Replaces Old Header */}
            <div className="bg-white rounded-2xl p-6 border-2 border-amber-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                    <Link size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Pendências Nuntec</p>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      <p className="text-[10px] text-slate-400 leading-tight hidden sm:block">
                        Transf. para "Gerente" aguardando dados.
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1" title="Última atualização">
                          <RefreshCw size={10} /> Atualizado: {lastUpdate ? format(lastUpdate, 'HH:mm') : '-'}
                        </span>
                        <span className="flex items-center gap-1" title="Período de sincronização">
                          <Calendar size={10} /> Período: {syncStartDate ? `A partir de ${format(parseISO(syncStartDate), 'dd/MM/yyyy')}` : 'Padrão'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex flex-col items-end">
                    <button
                      onClick={() => setShowIgnored(!showIgnored)}
                      className={`text-[10px] flex items-center gap-1 px-2 py-1 rounded border mb-1 transition-colors ${showIgnored ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                        }`}
                    >
                      {showIgnored ? <EyeOff size={10} /> : <Eye size={10} />}
                      {showIgnored ? 'Ocultar Ignorados' : 'Ver Ignorados'}
                    </button>
                    <div
                      className={`cursor-pointer hover:opacity-80 transition-opacity ${!selectedNuntecReservoirId ? 'text-amber-600' : 'text-slate-400'}`}
                      onClick={() => setSelectedNuntecReservoirId(null)}
                      title="Limpar filtro"
                    >
                      <span className="text-3xl font-bold">{nuntecVolumeTotal.toFixed(0)} <span className="text-base font-medium">L</span></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid de Postos Nuntec */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 mt-2">
                {nuntecBreakdown.length > 0 ? (
                  nuntecBreakdown.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedNuntecReservoirId(selectedNuntecReservoirId === item.id ? null : item.id)}
                      className={`flex items-center justify-between text-sm py-2 px-3 rounded-lg cursor-pointer transition-all border group
                        ${selectedNuntecReservoirId === item.id
                          ? 'bg-amber-50 border-amber-200 ring-1 ring-amber-200 shadow-sm'
                          : 'bg-slate-50 border-transparent hover:bg-slate-100 hover:border-slate-200'}`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden flex-1">
                        <span className={`font-bold text-[10px] px-1.5 py-0.5 rounded-full min-w-[24px] text-center ${selectedNuntecReservoirId === item.id ? 'bg-amber-200 text-amber-900' : 'bg-white text-slate-500 shadow-sm'}`}>{item.count}</span>
                        <span className={`font-medium truncate text-xs ${selectedNuntecReservoirId === item.id ? 'text-amber-900' : 'text-slate-600 group-hover:text-slate-800'}`} title={item.label}>{item.label}</span>
                      </div>
                      <span className={`font-bold ml-2 text-xs whitespace-nowrap ${selectedNuntecReservoirId === item.id ? 'text-amber-700' : 'text-slate-500'}`}>{item.volume.toFixed(0)} L</span>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-sm text-slate-400 italic py-4 text-center">Nenhuma pendência encontrada.</div>
                )}
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

                      // Nuntec Station Filter
                      const rowResId = Number(t['pointing-in']['reservoir-id']);
                      if (selectedNuntecReservoirId && rowResId !== selectedNuntecReservoirId) return null;

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
              ? (nuntecId?: string) => selectedItem && handleConfirm(selectedItem, nuntecId)
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

        {
          resolutionTransfer && (
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
          )
        }

        {
          showHistory && historyId && (
            <AuditLogModal
              isOpen={showHistory}
              onClose={() => {
                setShowHistory(false);
                setHistoryId(null);
              }}
              registroId={historyId}
              useSimpleFetch={true}
            />
          )
        }
      </div>


      <VehicleManagementModal
        isOpen={isFleetModalOpen}
        onClose={() => setIsFleetModalOpen(false)}
      />
    </div >
  );
}
