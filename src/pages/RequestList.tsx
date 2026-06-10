import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/supabaseService';
import { supabase } from '../lib/supabase';
import { RequestFormModal } from '../components/RequestFormModal';
import { RegistrarDashboard } from './RegistrarDashboard';
import { PdmManual } from '../components/RequestForm/PdmManual/index';
import type { Solicitacao, Fazenda, Usuario } from '../types';
import {
  Plus,
  LayoutDashboard,
  FileText,
  Clock,
  Package,
  RotateCcw,
  CheckCircle2,
  Building2,
  BookOpen,
  BarChart3
} from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay, isBefore, isAfter } from 'date-fns';
import { formatInSystemTime } from '../utils/dateUtils';

import { PageHeader } from '../components/ui/PageHeader';
import StatsCard from '../components/ui/StatsCard';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { StatsSkeleton } from '../components/ui/StatsSkeleton';
import { FilterBar } from '../components/ui/FilterBar';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TableCells } from '../components/ui/TableCells';
import { Button } from '../components/ui/Button';
import { TabBar } from '../components/ui/TabBar';
import { FormField } from '../components/ui/FormField';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';

type SortField =
  | 'numero'
  | 'data_envio'
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
  const [viewType, setViewType] = useState<'DASHBOARD' | 'LIST' | 'REGRAS_PDM'>('LIST');

  // React Query: Fetch All Data (Optimized)
  const { data, isLoading } = useQuery({
    queryKey: ['request-list-data', user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not found");

      // Fetch requests with joins and counts in ONE call
      // Increased limit to 2000 to better support client-side counting/filtering for now
      const result = await db.getRequestsOptimized(1, 2000);
      const [fazendasData, usuariosData] = await Promise.all([db.getAllFarms(), db.getAllUsers()]);

      return {
        requests: result.data,
        totalDatabaseCount: result.totalCount,
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
  const loading = isLoading;

  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // Sorting State
  const [sortField, setSortField] = useState<SortField>('data_envio');
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
      case 'data_envio':
        aValue = new Date(a.data_envio || a.data_abertura).getTime();
        bValue = new Date(b.data_envio || b.data_abertura).getTime();
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
  const totalDatabaseCount = data?.totalDatabaseCount || 0;
  const totalRequests = baseRequests.length;
  // If we have active filters, show the filtered count. Otherwise show the DB total.
  const displayTotal = hasActiveFilters ? totalRequests : totalDatabaseCount;

  const aguardando = baseRequests.filter((r) => r.status === 'Aguardando').length;
  const emCadastro = baseRequests.filter((r) => r.status === 'Em Cadastro').length;
  const finalizadas = baseRequests.filter((r) => r.status === 'Finalizado').length;
  const devolvidas = baseRequests.filter((r) => r.status === 'Devolvido').length;

  const handleCardClick = (status: string) => {
    setFilterStatus(filterStatus === status ? '' : status);
  };

  const columns: DataTableColumn<any>[] = [
    {
      key: 'numero',
      label: 'ID',
      sortable: true,
      render: (req) => (
        <TableCells.Id 
          value={req.numero} 
          badge={user && req.usuario_id === user.id ? (
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold rounded uppercase tracking-wider">
              Você
            </span>
          ) : undefined}
        />
      )
    },
    {
      key: 'data_envio',
      label: 'Data',
      sortable: true,
      render: (req) => req.status === 'Aberto' ? (
        <TableCells.Text text="—" />
      ) : (
        <TableCells.Date 
          date={formatInSystemTime(req.data_envio || req.data_abertura, 'dd/MM/yyyy')} 
          time={formatInSystemTime(req.data_envio || req.data_abertura, 'HH:mm')} 
        />
      )
    },
    {
      key: 'fazenda',
      label: 'Filial',
      sortable: true,
      render: (req) => <TableCells.Farm name={req.fazenda_nome} />
    },
    {
      key: 'usuario',
      label: 'Solicitante',
      sortable: true,
      render: (req) => <TableCells.User name={req.usuario_nome} />
    },
    {
      key: 'items',
      label: 'Itens',
      sortable: true,
      align: 'center',
      render: (req) => <TableCells.Text text={req.items_count || 0} />
    },
    {
      key: 'prioridade',
      label: 'Prioridade',
      sortable: true,
      render: (req) => <TableCells.Priority priority={req.prioridade} />
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (req) => {
        const displayStatus = req.status === 'Aberto' ? 'Rascunho' : req.status;
        const variant = req.status === 'Aberto' ? 'default'
                      : req.status === 'Aguardando' ? 'warning'
                      : req.status === 'Em Cadastro' ? 'purple'
                      : req.status === 'Finalizado' ? 'success'
                      : 'orange';
        return <TableCells.Status status={displayStatus} variant={variant} />;
      }
    }
  ];

  return (
    <div className="p-6 w-full animate-in fade-in duration-500 space-y-6 pb-20">
      {/* Header */}
      <PageHeader
        title="Solicitações de Cadastro"
        subtitle="Visualize e gerencie solicitações de todas as fazendas"
        icon={LayoutDashboard}
      >
        {canCreate && (
          <Button icon={Plus} onClick={handleCreateNew}>
            Nova Solicitação
          </Button>
        )}
      </PageHeader>

      {/* Tabs */}
      <TabBar
        tabs={[
          { id: 'LIST' as const, label: 'Lista de Solicitações', icon: FileText },
          { id: 'DASHBOARD' as const, label: 'Indicadores', icon: BarChart3 },
          { id: 'REGRAS_PDM' as const, label: 'Manual do PDM', icon: BookOpen },
        ]}
        activeTab={viewType}
        onTabChange={(tab) => setViewType(tab as typeof viewType)}
      />

      {/* Content - Dashboard */}
      {viewType === 'DASHBOARD' && (
        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
          <RegistrarDashboard hideHeader={true} />
        </div>
      )}

      {/* Content - Regras PDM */}
      {viewType === 'REGRAS_PDM' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <PdmManual />
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
                value={displayTotal}
                icon={FileText}
                description={hasActiveFilters ? "encontradas" : "registradas"}
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
                  <Button
                    variant={showOnlyMine ? 'primary' : 'secondary'}
                    size="md"
                    onClick={() => setShowOnlyMine(!showOnlyMine)}
                  >
                    {showOnlyMine ? '✅ Minhas SCs' : '👤 Minhas SCs'}
                  </Button>
                )
              }
              advancedFilters={
                <>
                  <FormField label="Data Inicial">
                    <Input
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Data Final">
                    <Input
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Filial">
                    <Select
                      value={filterFarm}
                      onChange={(e) => setFilterFarm(e.target.value)}
                      placeholder="Todas"
                      options={availableFarms.map((f) => ({ value: f.id, label: f.nome }))}
                    />
                  </FormField>
                  <FormField label="Solicitante">
                    <Select
                      value={filterUser}
                      onChange={(e) => setFilterUser(e.target.value)}
                      placeholder="Todos"
                      options={availableUsers.map((u) => ({ value: u.id, label: u.nome }))}
                    />
                  </FormField>
                  <FormField label="Prioridade">
                    <Select
                      value={filterPriority}
                      onChange={(e) => setFilterPriority(e.target.value)}
                      placeholder="Todas"
                      options={[
                        { value: 'Normal', label: 'Normal' },
                        { value: 'Urgente', label: 'Urgente' },
                      ]}
                    />
                  </FormField>
                  <FormField label="Status">
                    <Select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      placeholder="Todos"
                      options={[
                        { value: 'Aberto', label: 'Rascunho' },
                        { value: 'Aguardando', label: 'Aguardando Aprovação' },
                        { value: 'Em Cadastro', label: 'Em Cadastro' },
                        { value: 'Finalizado', label: 'Finalizado' },
                        { value: 'Devolvido', label: 'Devolvido' },
                      ]}
                    />
                  </FormField>
                </>
              }
            />

            {/* Table */}
            <DataTable
              data={sortedRequests}
              columns={columns}
              rowKey={(req) => req.id}
              onRowClick={(req) => handleRowClick(req.id)}
              sortField={sortField}
              sortDirection={sortDirection}
              onSortChange={(field, dir) => {
                setSortField(field as SortField);
                setSortDirection(dir);
              }}
              pageSize={15}
              rowClassName={(req) => user && req.usuario_id === user.id ? 'bg-blue-50/10' : ''}
              emptyTitle="Nenhuma solicitação encontrada"
              emptyDescription="Não há solicitações que correspondam aos filtros atuais."
              emptyIcon={FileText}
            />
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
