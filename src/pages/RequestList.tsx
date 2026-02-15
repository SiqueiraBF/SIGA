import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/supabaseService';
import { supabase } from '../lib/supabase';
import { RequestFormModal } from '../components/RequestFormModal';
import { RegistrarDashboard } from './RegistrarDashboard';
import type { Solicitacao, Fazenda, Usuario } from '../types';
import {
  Plus,
  LayoutDashboard,
  FileText,
  Clock,
  Package,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Building2,
  User,
  AlertTriangle,
  CheckCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay, isBefore, isAfter } from 'date-fns';
import { formatInSystemTime } from '../utils/dateUtils';

// UI Kit
import { PageHeader } from '../components/ui/PageHeader';
import StatsCard from '../components/ui/StatsCard';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { StatsSkeleton } from '../components/ui/StatsSkeleton';
import { FilterBar } from '../components/ui/FilterBar';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { TableActions } from '../components/ui/TableActions';

type SortField =
  | 'numero'
  | 'data_abertura'
  | 'fazenda'
  | 'prioridade'
  | 'status'
  | 'usuario'
  | 'items';
type SortDirection = 'asc' | 'desc';

export function RequestList() {
  const { user, checkAccess, role } = useAuth();
  const queryClient = useQueryClient();
  const [viewType, setViewType] = useState<'DASHBOARD' | 'LIST'>('LIST');

  // React Query: Fetch All Data (Optimized)
  const { data, isLoading } = useQuery({
    queryKey: ['request-list-data', user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not found");

      // Fetch requests with joins and counts in ONE call
      // Using a large limit (500) to maintain current client-side filter logic
      const { data: requestsData } = await db.getRequestsOptimized(1, 500);
      const [fazendasData, usuariosData] = await Promise.all([db.getAllFarms(), db.getAllUsers()]);

      return {
        requests: requestsData,
        fazendas: fazendasData as Fazenda[],
        usuarios: usuariosData as Usuario[],
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const requests = data?.requests || [];
  const fazendas = data?.fazendas || [];
  const usuarios = data?.usuarios || [];
  const itemCounts = {}; // No longer needed as separate state, counts are in requests objects
  const loading = isLoading;

  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // Sorting State
  const [sortField, setSortField] = useState<SortField>('data_abertura');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Advanced Filter States (Managed by FilterBar children/advanced prop)
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterFarm, setFilterFarm] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  // ACL Checks
  const viewScope = role?.permissoes?.['abrir_solicitacao']?.view_scope || 'OWN_ONLY';
  const isRestrictedToOwn = viewScope === 'OWN_ONLY';

  // Check if user can create (edit own pending items)
  const canCreate = checkAccess({
    module: 'abrir_solicitacao',
    action: 'edit',
    resourceOwnerId: user?.id,
    resourceStatus: 'PENDENTE',
  });

  // Unique Select Options (derived from data)
  const uniqueFarmIds = Array.from(new Set(requests.map((r) => r.fazenda_id).filter(Boolean)));
  const uniqueUserIds = Array.from(new Set(requests.map((r) => r.usuario_id).filter(Boolean)));

  const availableFarms = fazendas
    .filter((f) => uniqueFarmIds.includes(f.id))
    .map((f) => ({ id: f.id, nome: f.nome }));

  const availableUsers = usuarios
    .filter((u) => uniqueUserIds.includes(u.id))
    .map((u) => ({ id: u.id, nome: u.nome }));

  // Realtime Subscription (Cache Invalidator)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('request-list-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'solicitacoes' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['request-list-data'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'itens_solicitacao' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['request-list-data'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const handleCreateNew = () => {
    setSelectedRequestId(null);
    setIsModalOpen(true);
  };

  const handleRowClick = (id: string) => {
    setSelectedRequestId(id);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedRequestId(null);
  };

  const handleModalSave = () => {
    queryClient.invalidateQueries({ queryKey: ['request-list-data'] });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} className="text-slate-400 opacity-50" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={14} className="text-blue-600" />
    ) : (
      <ArrowDown size={14} className="text-blue-600" />
    );
  };

  const clearFilters = () => {
    setFilterStatus('');
    setFilterPriority('');
    setFilterFarm('');
    setFilterUser('');
    setFilterStartDate('');
    setFilterEndDate('');
    setSearchTerm('');
    setShowOnlyMine(false);
  };

  // Apply Filters and Search
  // 1. Base Filter (Context filters without status)
  const baseRequests = requests.filter((req) => {
    // ACL Enforcement: View Scope
    if (viewScope === 'OWN_ONLY' && user && req.usuario_id !== user.id) return false;
    if (viewScope === 'SAME_FARM' && user && req.fazenda_id !== user.fazenda_id) return false;

    // Search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesId = req.numero.toString().includes(searchLower);
      const matchesFarm = (req.fazenda_nome || '').toLowerCase().includes(searchLower);
      const matchesUser = (req.usuario_nome || '').toLowerCase().includes(searchLower);
      if (!matchesId && !matchesFarm && !matchesUser) return false;
    }

    // Priority Filter
    if (filterPriority && req.prioridade !== filterPriority) return false;

    // Farm Filter
    if (filterFarm && req.fazenda_id !== filterFarm) return false;

    // User Filter
    if (filterUser && req.usuario_id !== filterUser) return false;

    // Date Range Filter
    if (filterStartDate || filterEndDate) {
      const reqDate = parseISO(req.data_abertura);
      if (filterStartDate && isBefore(reqDate, startOfDay(parseISO(filterStartDate)))) return false;
      if (filterEndDate && isAfter(reqDate, endOfDay(parseISO(filterEndDate)))) return false;
    }

    // "Minhas SCs" Filter (User Toggle)
    if (!isRestrictedToOwn && showOnlyMine && user && req.usuario_id !== user.id) return false;

    return true;
  });

  // 2. Final Filter (Apply Status)
  const filteredRequests = baseRequests.filter((req) => {
    if (filterStatus && req.status !== filterStatus) return false;
    return true;
  });

  // Apply Sorting
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    let aValue: any, bValue: any;

    switch (sortField) {
      case 'numero':
        aValue = a.numero;
        bValue = b.numero;
        break;
      case 'data_abertura':
        aValue = new Date(a.data_abertura).getTime();
        bValue = new Date(b.data_abertura).getTime();
        break;
      case 'fazenda':
        aValue = a.fazenda_nome || '';
        bValue = b.fazenda_nome || '';
        break;
      case 'usuario':
        aValue = a.usuario_nome || '';
        bValue = b.usuario_nome || '';
        break;
      case 'prioridade':
        aValue = a.prioridade === 'Urgente' ? 1 : 0;
        bValue = b.prioridade === 'Urgente' ? 1 : 0;
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'items':
        aValue = a.items_count || 0;
        bValue = b.items_count || 0;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const hasActiveFilters =
    filterStatus ||
    filterPriority ||
    filterFarm ||
    filterUser ||
    filterStartDate ||
    filterEndDate ||
    searchTerm ||
    showOnlyMine;

  // KPIs
  const totalRequests = baseRequests.length;
  const aguardando = baseRequests.filter((r) => r.status === 'Aguardando').length;
  const emCadastro = baseRequests.filter((r) => r.status === 'Em Cadastro').length;
  const finalizadas = baseRequests.filter((r) => r.status === 'Finalizado').length;
  const devolvidas = baseRequests.filter((r) => r.status === 'Devolvido').length;

  const handleCardClick = (status: string) => {
    setFilterStatus(filterStatus === status ? '' : status);
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <PageHeader
        title="Solicitações de Cadastro"
        subtitle="Visualize e gerencie solicitações de todas as fazendas"
        icon={LayoutDashboard}
      >
        {canCreate && (
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all font-semibold"
          >
            <Plus size={20} /> Nova Solicitação
          </button>
        )}
      </PageHeader>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-8">
          <button
            onClick={() => setViewType('LIST')}
            className={`pb-4 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${viewType === 'LIST'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
          >
            <FileText size={16} />
            Lista de Solicitações
          </button>
          <button
            onClick={() => setViewType('DASHBOARD')}
            className={`pb-4 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${viewType === 'DASHBOARD'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
          >
            <LayoutDashboard size={16} />
            Visão Geral
          </button>
        </div>
      </div>

      {/* Content - Dashboard */}
      {viewType === 'DASHBOARD' && (
        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
          <RegistrarDashboard hideHeader={true} />
        </div>
      )}

      {/* Content - List */}
      <div className={viewType === 'LIST' ? "block animate-in fade-in slide-in-from-right-4 duration-300" : "hidden"}>
        {loading ? (
          <>
            <StatsSkeleton count={role?.nome === 'Administrador' ? 5 : 4} />
            <TableSkeleton rows={8} columns={6} />
          </>
        ) : (
          <>
            {/* KPI Cards */}
            <div
              className={`grid grid-cols-1 md:grid-cols-2 ${devolvidas > 0 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}
            >
              <StatsCard
                title="TOTAL"
                value={totalRequests}
                icon={FileText}
                description="registradas"
                variant={!filterStatus ? 'blue' : 'default'}
                onClick={() => setFilterStatus('')}
                className={!filterStatus ? 'ring-2 ring-blue-200' : ''}
              />
              <StatsCard
                title="AGUARDANDO"
                value={aguardando}
                icon={Clock}
                description="análise"
                variant={filterStatus === 'Aguardando' ? 'yellow' : 'default'}
                onClick={() => handleCardClick('Aguardando')}
                className={`hover:bg-yellow-50 ${filterStatus === 'Aguardando' ? 'ring-2 ring-yellow-200 bg-yellow-50' : ''}`}
              />
              <StatsCard
                title="EM CADASTRO"
                value={emCadastro}
                icon={Package}
                description="sendo processadas"
                variant={filterStatus === 'Em Cadastro' ? 'purple' : 'default'}
                onClick={() => handleCardClick('Em Cadastro')}
                className={`hover:bg-purple-50 ${filterStatus === 'Em Cadastro' ? 'ring-2 ring-purple-200 bg-purple-50' : ''}`}
              />
              {devolvidas > 0 && (
                <StatsCard
                  title="DEVOLVIDAS"
                  value={devolvidas}
                  icon={RotateCcw}
                  description="correção necessária"
                  variant={filterStatus === 'Devolvido' ? 'orange' : 'default'}
                  onClick={() => handleCardClick('Devolvido')}
                  className={`hover:bg-orange-50 ${filterStatus === 'Devolvido' ? 'ring-2 ring-orange-200 bg-orange-50' : ''}`}
                />
              )}
              <StatsCard
                title="FINALIZADAS"
                value={finalizadas}
                icon={CheckCircle2}
                description="concluídas"
                variant={filterStatus === 'Finalizado' ? 'green' : 'default'}
                onClick={() => handleCardClick('Finalizado')}
                className={`hover:bg-green-50 ${filterStatus === 'Finalizado' ? 'ring-2 ring-green-200 bg-green-50' : ''}`}
              />
            </div>

            {/* Search and Filters */}
            <FilterBar
              onSearch={setSearchTerm}
              searchValue={searchTerm}
              searchPlaceholder="Buscar por ID, Filial ou Solicitante..."
              onClear={clearFilters}
              hasActiveFilters={!!hasActiveFilters}
              children={
                !isRestrictedToOwn && (
                  <button
                    onClick={() => setShowOnlyMine(!showOnlyMine)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all text-sm h-full ${showOnlyMine
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    {showOnlyMine ? '✅ Minhas SCs' : '👤 Minhas SCs'}
                  </button>
                )
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
                      <Building2 size={12} /> Filial
                    </label>
                    <select
                      className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                      value={filterFarm}
                      onChange={(e) => setFilterFarm(e.target.value)}
                    >
                      <option value="">Todas</option>
                      {availableFarms.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      <User size={12} /> Solicitante
                    </label>
                    <select
                      className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                      value={filterUser}
                      onChange={(e) => setFilterUser(e.target.value)}
                    >
                      <option value="">Todos</option>
                      {availableUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      <AlertTriangle size={12} /> Prioridade
                    </label>
                    <select
                      className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                      value={filterPriority}
                      onChange={(e) => setFilterPriority(e.target.value)}
                    >
                      <option value="">Todas</option>
                      <option value="Normal">Normal</option>
                      <option value="Urgente">Urgente</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      <CheckCircle size={12} /> Status
                    </label>
                    <select
                      className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="">Todos</option>
                      <option value="Aberto">Rascunho</option>
                      <option value="Aguardando">Aguardando Aprovação</option>
                      <option value="Em Cadastro">Em Cadastro</option>
                      <option value="Finalizado">Finalizado</option>
                      <option value="Devolvido">Devolvido</option>
                    </select>
                  </div>
                </>
              }
            />

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th
                        className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                        onClick={() => handleSort('numero')}
                      >
                        <div className="flex items-center gap-2">
                          ID <SortIcon field="numero" />
                        </div>
                      </th>
                      <th
                        className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                        onClick={() => handleSort('data_abertura')}
                      >
                        <div className="flex items-center gap-2">
                          Data <SortIcon field="data_abertura" />
                        </div>
                      </th>
                      <th
                        className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                        onClick={() => handleSort('fazenda')}
                      >
                        <div className="flex items-center gap-2">
                          Filial <SortIcon field="fazenda" />
                        </div>
                      </th>
                      <th
                        className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                        onClick={() => handleSort('usuario')}
                      >
                        <div className="flex items-center gap-2">
                          Solicitante <SortIcon field="usuario" />
                        </div>
                      </th>
                      <th
                        className="px-6 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                        onClick={() => handleSort('items')}
                      >
                        <div className="flex items-center justify-center gap-2">
                          Itens <SortIcon field="items" />
                        </div>
                      </th>
                      <th
                        className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                        onClick={() => handleSort('prioridade')}
                      >
                        <div className="flex items-center gap-2">
                          Prioridade <SortIcon field="prioridade" />
                        </div>
                      </th>
                      <th
                        className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center gap-2">
                          Status <SortIcon field="status" />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedRequests.length === 0 ? (
                      <tr>
                        <td colSpan={8}>
                          <EmptyState />
                        </td>
                      </tr>
                    ) : (
                      sortedRequests.map((req) => (
                        <tr
                          key={req.id}
                          onClick={() => handleRowClick(req.id)}
                          className={`group hover:bg-slate-50 transition-colors cursor-pointer ${user && req.usuario_id === user.id ? 'bg-blue-50/10' : ''}`}
                        >
                          <td className="px-6 py-4 font-mono text-slate-500 font-medium">
                            <div className="flex items-center gap-2">
                              #{req.numero}
                              {user && req.usuario_id === user.id && (
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold rounded uppercase tracking-wider">
                                  Você
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-700">
                            {formatInSystemTime(req.data_abertura, 'dd/MM/yyyy')}{' '}
                            <span className="text-slate-400 text-xs ml-1">
                              {formatInSystemTime(req.data_abertura, 'HH:mm')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Building2 size={14} className="text-slate-700" />
                              <span className="text-slate-700 font-medium">
                                {req.fazenda_nome || 'N/A'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 uppercase">
                                {(req.usuario_nome || 'U').charAt(0)}
                              </div>
                              {req.usuario_nome || 'Desconhecido'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600 text-center font-medium">
                            {req.items_count || 0}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge
                              status={req.prioridade}
                              variant={req.prioridade === 'Urgente' ? 'error' : 'default'}
                              size="sm"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge
                              status={req.status === 'Aberto' ? 'Rascunho' : req.status}
                              variant={
                                req.status === 'Aberto'
                                  ? 'default'
                                  : req.status === 'Aguardando'
                                    ? 'warning'
                                    : req.status === 'Em Cadastro'
                                      ? 'purple'
                                      : req.status === 'Finalizado'
                                        ? 'success'
                                        : 'orange' // Devolvido
                              }
                              size="sm"
                            />
                          </td>

                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary */}
            <div className="flex items-center justify-between text-sm text-slate-500 px-2">
              <span>
                Mostrando {sortedRequests.length} de {requests.length} solicitação(ões)
              </span>
            </div>
          </>
        )}
      </div>

      {/* Render Modal */}
      <RequestFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        requestId={selectedRequestId}
      />
    </div>
  );
}
