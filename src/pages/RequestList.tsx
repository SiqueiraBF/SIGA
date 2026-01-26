import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/supabaseService';
import { supabase } from '../lib/supabase';
import { RequestFormModal } from '../components/RequestFormModal';
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
} from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay, isBefore, isAfter } from 'date-fns';
import { formatInSystemTime } from '../utils/dateUtils';

// UI Kit
import { PageHeader } from '../components/ui/PageHeader';
import { StatsCard } from '../components/ui/StatsCard';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { StatsSkeleton } from '../components/ui/StatsSkeleton';
import { FilterBar } from '../components/ui/FilterBar';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { TableActions } from '../components/ui/TableActions';

// Components Helper
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

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
  const [requests, setRequests] = useState<Solicitacao[]>([]);
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

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
  const isRestrictedToOwn = viewScope === 'OWN_ONLY'; // Kept for legacy UI flag "Minhas SCs" toggle behavior if needed

  // Check if user can create (edit own pending items)
  const canCreate = checkAccess({
    module: 'abrir_solicitacao',
    action: 'edit',
    resourceOwnerId: user?.id,
    resourceStatus: 'PENDENTE',
  });

  // Unique Select Options (derived from data)
  const [availableFarms, setAvailableFarms] = useState<{ id: string; nome: string }[]>([]);
  const [availableUsers, setAvailableUsers] = useState<{ id: string; nome: string }[]>([]);

  useEffect(() => {
    loadData();

    // Realtime Subscription
    const channel = supabase
      .channel('request-list-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'solicitacoes' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setRequests((prev) => [payload.new as Solicitacao, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setRequests((prev) =>
              prev.map((r) => (r.id === payload.new.id ? { ...r, ...payload.new } : r)),
            );
          } else if (payload.eventType === 'DELETE') {
            setRequests((prev) => prev.filter((r) => r.id !== payload.old.id));
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'itens_solicitacao' },
        async (payload) => {
          const reqId = (payload.new as any)?.solicitacao_id;

          if (payload.eventType === 'INSERT' && reqId) {
            // Optimistic update for INSERT (we have the parent ID)
            setItemCounts((prev) => ({ ...prev, [reqId]: (prev[reqId] || 0) + 1 }));
          } else if (payload.eventType === 'DELETE') {
            // FORCE REFRESH: Since we don't know the parent ID of the deleted item,
            // re-fetching all data is the only safe way to guarantee correct counts.
            loadData();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Load requests
      const requestsData = await db.getRequests(user);
      setRequests(requestsData);

      // Load all fazendas and usuarios
      const [fazendasData, usuariosData] = await Promise.all([db.getAllFarms(), db.getAllUsers()]);
      setFazendas(fazendasData);
      setUsuarios(usuariosData);

      // Load item counts for all requests
      const counts: Record<string, number> = {};
      await Promise.all(
        requestsData.map(async (req: Solicitacao) => {
          const items = await db.getItemsByRequestId(req.id);
          counts[req.id] = items.length;
        }),
      );
      setItemCounts(counts);

      // Extract unique farms and users for filter dropdowns
      const uniqueFarmIds = Array.from(
        new Set(requestsData.map((r: Solicitacao) => r.fazenda_id).filter(Boolean)),
      );
      const uniqueUserIds = Array.from(
        new Set(requestsData.map((r: Solicitacao) => r.usuario_id).filter(Boolean)),
      );

      setAvailableFarms(
        fazendasData
          .filter((f: Fazenda) => uniqueFarmIds.includes(f.id))
          .map((f: Fazenda) => ({ id: f.id, nome: f.nome })),
      );
      setAvailableUsers(
        usuariosData
          .filter((u: Usuario) => uniqueUserIds.includes(u.id))
          .map((u: Usuario) => ({ id: u.id, nome: u.nome })),
      );
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

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
    loadData();
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

  const getUserName = (userId: string) => {
    const u = usuarios.find((usr) => usr.id === userId);
    return u?.nome || 'Desconhecido';
  };

  const getFarmName = (farmId: string) => {
    const f = fazendas.find((farm) => farm.id === farmId);
    return f?.nome || '';
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
      const matchesFarm = getFarmName(req.fazenda_id).toLowerCase().includes(searchLower);
      const matchesUser = getUserName(req.usuario_id).toLowerCase().includes(searchLower);
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
        aValue = getFarmName(a.fazenda_id);
        bValue = getFarmName(b.fazenda_id);
        break;
      case 'usuario':
        aValue = getUserName(a.usuario_id);
        bValue = getUserName(b.usuario_id);
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
        aValue = itemCounts[a.id] || 0;
        bValue = itemCounts[b.id] || 0;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <PageHeader
            title="Solicitações de Cadastro"
            subtitle="Visualize e gerencie solicitações de todas as fazendas"
            icon={LayoutDashboard}
          >
            <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg opacity-50 cursor-not-allowed">
              <Plus size={20} />
              Nova Solicitação
            </button>
          </PageHeader>

          <StatsSkeleton count={role?.nome === 'Administrador' ? 5 : 4} />
          <TableSkeleton rows={8} columns={6} />
        </div>
      </div>
    );
  }

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
                  className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status <SortIcon field="status" />
                  </div>
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Ações
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
                      {(() => {
                        const farm = fazendas.find((f) => f.id === req.fazenda_id);
                        if (!farm) return <span className="text-slate-400 italic">N/A</span>;
                        return (
                          <div className="flex items-center gap-2">
                            <Building2
                              size={14}
                              className={farm.ativo ? 'text-green-600' : 'text-slate-400'}
                            />
                            <span
                              className={
                                farm.ativo ? 'text-slate-700 font-medium' : 'text-slate-400'
                              }
                            >
                              {farm.nome}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 uppercase">
                          {getUserName(req.usuario_id).charAt(0)}
                        </div>
                        {getUserName(req.usuario_id)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-center font-medium">
                      {itemCounts[req.id] || 0}
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
                    <td className="px-6 py-4">
                      <TableActions
                        onView={() => handleRowClick(req.id)}
                      // We can add delete/edit logic directly here if we want direct buttons
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
