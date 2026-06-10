import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { pcmService, PcmRequest } from '../services/pcmService';
import { farmService } from '../services/farmService';
import { Plus, Building2, Loader2, FileText, LayoutGrid, Settings, ClipboardList, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle2, Pencil, Trash2, BarChart3, XCircle } from 'lucide-react';
import { Loading } from '../components/Loading';
import { PageHeader } from '../components/ui/PageHeader';
import { FilterBar } from '../components/ui/FilterBar';
import { PcmRequestModal } from '../components/pcm/PcmRequestModal';
import { PcmConfirmModal } from '../components/pcm/PcmConfirmModal';
import { PcmDetailsModal } from '../components/pcm/PcmDetailsModal';
import { PcmDashboard } from '../components/pcm/PcmDashboard';
import { PcmCancelModal } from '../components/pcm/PcmCancelModal';
import { EmailSettingsModal } from '../components/ui/EmailSettingsModal';
import { DataTable, DataTableColumn } from '../components/ui/DataTable';
import { TabBar } from '../components/ui/TabBar';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { FormField } from '../components/ui/FormField';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { TableCells } from '../components/ui/TableCells';
import toast from 'react-hot-toast';

type SortField = 'num_requisicao' | 'created_at' | 'fazenda' | 'usuario' | 'maquina' | 'prioridade' | 'status' | 'data_confirmacao' | 'lead_time';
type SortDirection = 'asc' | 'desc';

export function PcmRequests() {
  const { user, role } = useAuth();
  
  // Controle de Permissões PCM
  const pcmPerms = role?.permissoes?.['solicitacoes_pcm'];
  const canCreate = !!pcmPerms?.can_create;
  const canConfirm = !!pcmPerms?.can_confirm;
  const manageNotifications = !!pcmPerms?.manage_notifications;
  const canDelete = !!pcmPerms?.can_delete;
  const canEdit = !!pcmPerms?.can_edit;
  const [requests, setRequests] = useState<PcmRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFarm, setSelectedFarm] = useState<string>('');
  const [farms, setFarms] = useState<any[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PcmRequest | null>(null);
  const [requestToEdit, setRequestToEdit] = useState<PcmRequest | null>(null);
  const [requestToCancel, setRequestToCancel] = useState<PcmRequest | null>(null);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'dashboard'>('list');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterFarm, setFilterFarm] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [usuarios, setUsuarios] = useState<any[]>([]);

  useEffect(() => {
    loadFarms();
  }, []);

  useEffect(() => {
    if (farms.length > 0) {
      loadRequests();
    }
  }, [farms, selectedFarm]);

  const loadFarms = async () => {
    try {
      const data = await farmService.getFarms();
      setFarms(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await pcmService.getRequests(selectedFarm || undefined);
      setRequests(data);
      const uniqueUsers = Array.from(new Set(data.map(r => r.usuario?.nome)))
        .filter(Boolean)
        .sort()
        .map(nome => ({
          id: nome as string,
          nome: nome as string
        }));
      setUsuarios(uniqueUsers);
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao carregar solicitações.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (requestToDelete) {
      try {
        await pcmService.deleteRequest(requestToDelete);
        toast.success('Solicitação excluída com sucesso!');
        loadRequests();
      } catch (error) {
        console.error(error);
        toast.error('Erro ao excluir solicitação');
      } finally {
        setRequestToDelete(null);
      }
    }
  };

  const handleCancelClick = (req: PcmRequest) => {
    setRequestToCancel(req);
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = async (motivo: string, req: PcmRequest) => {
    try {
      await pcmService.cancelRequest(req.id, motivo, { id: user?.id || '', email: user?.email || '' });
      toast.success('Solicitação cancelada com sucesso!');
      loadRequests();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao cancelar solicitação');
      throw error; 
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING_ALMOXARIFADO':
        return 'AGUARDANDO';
      case 'COMPLETED':
        return 'FINALIZADA';
      case 'CANCELLED':
        return 'CANCELADA';
      default:
        return 'DESCONHECIDO';
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const isRestrictedToOwn = pcmPerms?.view_scope === 'OWN_ONLY';
  const hasActiveFilters = !!searchTerm || showOnlyMine || !!filterFarm || !!filterUser || !!filterStatus || !!filterPriority || !!filterStartDate || !!filterEndDate;
  
  const clearFilters = () => {
      setSearchTerm('');
      setShowOnlyMine(false);
      setFilterFarm('');
      setFilterUser('');
      setFilterStatus('');
      setFilterPriority('');
      setFilterStartDate('');
      setFilterEndDate('');
  };

  const filteredRequests = requests.filter(req => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = req.num_requisicao.toString().includes(searchLower) || 
             (req.sc_numero && req.sc_numero.toString().toLowerCase().includes(searchLower)) ||
             req.fazenda?.nome?.toLowerCase().includes(searchLower) ||
             req.usuario?.nome?.toLowerCase().includes(searchLower) ||
             req.maquina.toLowerCase().includes(searchLower);
      if (!matchSearch) return false;
    }

    if (filterFarm && req.fazenda_id !== filterFarm) return false;
    if (filterUser && req.usuario?.nome !== filterUser) return false;
    if (filterStatus && req.status !== filterStatus) return false;
    if (filterPriority && req.prioridade !== filterPriority) return false;
    
    if (filterStartDate || filterEndDate) {
      const reqDate = new Date(req.created_at);
      if (filterStartDate && reqDate < new Date(`${filterStartDate}T00:00:00`)) return false;
      if (filterEndDate && reqDate > new Date(`${filterEndDate}T23:59:59`)) return false;
    }

    if (showOnlyMine && user && req.created_by !== user.id) return false;
    if (pcmPerms?.view_scope === 'SAME_FARM' && user?.fazenda_id && req.fazenda_id !== user.fazenda_id) return false;
    if (isRestrictedToOwn && user && req.created_by !== user.id) return false;

    return true;
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    let aValue: any, bValue: any;

    switch (sortField) {
      case 'num_requisicao':
        aValue = a.num_requisicao;
        bValue = b.num_requisicao;
        break;
      case 'created_at':
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
        break;
      case 'fazenda':
        aValue = a.fazenda?.nome || '';
        bValue = b.fazenda?.nome || '';
        break;
      case 'usuario':
        aValue = a.usuario?.nome || '';
        bValue = b.usuario?.nome || '';
        break;
      case 'maquina':
        aValue = a.maquina;
        bValue = b.maquina;
        break;
      case 'prioridade':
        aValue = a.prioridade === 'Urgente' ? 1 : 0;
        bValue = b.prioridade === 'Urgente' ? 1 : 0;
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'data_confirmacao':
        aValue = a.data_confirmacao ? new Date(a.data_confirmacao).getTime() : 0;
        bValue = b.data_confirmacao ? new Date(b.data_confirmacao).getTime() : 0;
        break;
      case 'lead_time':
        aValue = a.data_confirmacao ? (new Date(a.data_confirmacao).getTime() - new Date(a.created_at).getTime()) : 0;
        bValue = b.data_confirmacao ? (new Date(b.data_confirmacao).getTime() - new Date(b.created_at).getTime()) : 0;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const columns: DataTableColumn<PcmRequest>[] = [
    {
      key: 'num_requisicao',
      label: 'Requisição',
      sortable: true,
      render: (req) => <TableCells.Id value={req.num_requisicao} />
    },
    {
      key: 'created_at',
      label: 'Data',
      sortable: true,
      render: (req) => (
        <TableCells.Date 
          date={new Date(req.created_at).toLocaleDateString('pt-BR')}
          time={new Date(req.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        />
      ),
    },
    {
      key: 'fazenda',
      label: 'Filial',
      sortable: true,
      render: (req) => <TableCells.Farm name={req.fazenda?.nome} />
    },
    {
      key: 'usuario',
      label: 'Solicitante',
      sortable: true,
      render: (req) => <TableCells.User name={req.usuario?.nome} />
    },
    {
      key: 'maquina',
      label: 'Equipamento',
      sortable: true,
      render: (req) => <TableCells.Text text={req.maquina} bold />
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
      align: 'center',
      render: (req) => {
        let variant: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple' | 'orange' = 'default';
        if (req.status === 'PENDING_ALMOXARIFADO') variant = 'warning';
        else if (req.status === 'COMPLETED') variant = 'success';
        else if (req.status === 'CANCELLED') variant = 'error';

        return <TableCells.Status status={getStatusLabel(req.status)} variant={variant} />;
      },
    },
    {
      key: 'sc_numero',
      label: 'SC',
      render: (req) => req.sc_numero ? (
        <div className="text-[11px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 inline-block whitespace-nowrap">
          #{req.sc_numero}
        </div>
      ) : (
        <TableCells.Text text="-" />
      ),
    },
    {
      key: 'data_confirmacao',
      label: 'Data SC',
      sortable: true,
      render: (req) => req.data_confirmacao ? (
        <TableCells.Date 
          date={new Date(req.data_confirmacao).toLocaleDateString('pt-BR')}
          time={new Date(req.data_confirmacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        />
      ) : (
        <TableCells.Text text="-" />
      ),
    },
    {
      key: 'lead_time',
      label: 'SLA Atendimento',
      align: 'center',
      sortable: true,
      render: (req) => req.data_confirmacao ? (
        <TableCells.Text text={(() => {
          const diffMs = new Date(req.data_confirmacao!).getTime() - new Date(req.created_at).getTime();
          const diffMins = Math.max(0, Math.floor(diffMs / 60000));
          const hours = Math.floor(diffMins / 60);
          const mins = diffMins % 60;
          return `${hours}h ${mins}m`;
        })()} />
      ) : (
        <TableCells.Text text="-" />
      ),
    },
  ];

  return (
    <div className="p-6 w-full animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="Solicitações PCM"
        subtitle="Visualize e gerencie solicitações de peças e serviços de todas as fazendas"
        icon={ClipboardList}
      >
        {manageNotifications && (
          <IconButton
            icon={Settings}
            variant="default"
            onClick={() => setIsSettingsModalOpen(true)}
            label="Configurar E-mail"
          />
        )}
        
        {canCreate && (
          <Button
            icon={Plus}
            onClick={() => {
              setRequestToEdit(null);
              setIsCreateModalOpen(true);
            }}
          >
            Nova Solicitação
          </Button>
        )}
      </PageHeader>

      <div className="mt-2">
        <TabBar
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as 'list' | 'dashboard')}
          tabs={[
            { id: 'list', label: 'Lista de Solicitações', icon: FileText },
            { id: 'dashboard', label: 'Indicadores', icon: BarChart3 },
          ]}
        />
      </div>

      {activeTab === 'list' && (
        <FilterBar
          onSearch={setSearchTerm}
          searchValue={searchTerm}
          searchPlaceholder="Buscar por REQUISIÇÃO, SC, Filial ou Solicitante..."
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
          children={
            !isRestrictedToOwn && (
              <Button
                variant={showOnlyMine ? 'primary' : 'secondary'}
                onClick={() => setShowOnlyMine(!showOnlyMine)}
              >
                {showOnlyMine ? '✅ Minhas SCs' : '👤 Minhas SCs'}
              </Button>
            )
          }
          advancedFilters={
            <>
              <FormField label="Filial">
                <Select
                  value={filterFarm}
                  onChange={(e) => setFilterFarm(e.target.value)}
                  options={farms.map((f) => ({ value: f.id, label: f.nome }))}
                  placeholder="Todas as Filiais"
                />
              </FormField>
              
              <FormField label="Solicitante">
                <Select
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  options={usuarios.map((u) => ({ value: u.id, label: u.nome }))}
                  placeholder="Todos os Solicitantes"
                />
              </FormField>

              <FormField label="Status">
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  options={[
                    { value: 'PENDING_ALMOXARIFADO', label: 'Aguardando' },
                    { value: 'COMPLETED', label: 'Finalizada' },
                    { value: 'CANCELLED', label: 'Cancelada' },
                  ]}
                  placeholder="Todos os Status"
                />
              </FormField>

              <FormField label="Prioridade">
                <Select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  options={[
                    { value: 'Normal', label: 'Normal' },
                    { value: 'Urgente', label: 'Urgente' },
                  ]}
                  placeholder="Todas as Prioridades"
                />
              </FormField>

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
            </>
          }
        />
      )}

      {activeTab === 'list' ? (
        <>
          {loading ? (
            <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : sortedRequests.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <FileText className="text-slate-400" size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Nenhuma solicitação encontrada</h3>
              <p className="text-slate-500 max-w-sm mt-2">
                Não há registros de solicitação para os filtros selecionados.
              </p>
            </div>
          ) : (
            <DataTable
              data={sortedRequests}
              columns={columns}
              rowKey={(req) => req.id}
              sortField={sortField}
              sortDirection={sortDirection}
              onSortChange={(field) => handleSort(field as SortField)}
              onRowClick={(req) => {
                setSelectedRequest(req);
                setIsDetailsModalOpen(true);
              }}
            />
          )}
        </>
      ) : (
        <PcmDashboard />
      )}

      <PcmRequestModal
        isOpen={isCreateModalOpen}
        onClose={(success?: boolean) => {
          setIsCreateModalOpen(false);
          if (!success && requestToEdit) {
            setIsDetailsModalOpen(true);
          }
          setRequestToEdit(null);
        }}
        onSuccess={loadRequests}
        farms={farms}
        requestDataToEdit={requestToEdit}
      />

      <PcmConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setSelectedRequest(null);
        }}
        onSuccess={loadRequests}
        request={selectedRequest}
      />

      <EmailSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        title="Configurar E-mail · Solicitações PCM"
        subtitle="Defina quem recebe as notificações de peças e compras"
        steps={[
          { title: "1. Notificação do Almoxarifado", subtitle: "E-mails que receberão a solicitação de peças", configKeyPrefix: "pcm_to_almox" },
          { title: "2. Processamento de Compras", subtitle: "E-mails que receberão a requisição caso falte estoque", configKeyPrefix: "almox_to_compras" }
        ]}
      />

      <PcmDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedRequest(null);
        }}
        request={selectedRequest}
        onEdit={selectedRequest?.status === 'PENDING_ALMOXARIFADO' && canEdit ? () => { setRequestToEdit(selectedRequest); setIsCreateModalOpen(true); setIsDetailsModalOpen(false); } : undefined}
        onCancel={selectedRequest?.status === 'PENDING_ALMOXARIFADO' && user?.id === selectedRequest?.created_by ? () => { handleCancelClick(selectedRequest); setIsDetailsModalOpen(false); } : undefined}
        onConfirm={selectedRequest?.status === 'PENDING_ALMOXARIFADO' && canConfirm ? () => { setIsConfirmModalOpen(true); setIsDetailsModalOpen(false); } : undefined}
        onDelete={canDelete && selectedRequest ? () => { setRequestToDelete(selectedRequest.id); setIsDetailsModalOpen(false); } : undefined}
      />

      <PcmCancelModal
        isOpen={isCancelModalOpen}
        onClose={(success?: boolean) => {
          setIsCancelModalOpen(false);
          if (!success && requestToCancel) {
            setSelectedRequest(requestToCancel);
            setIsDetailsModalOpen(true);
          }
          setRequestToCancel(null);
        }}
        onConfirm={handleConfirmCancel}
        request={requestToCancel}
      />

      <ConfirmDialog
        isOpen={!!requestToDelete}
        onClose={() => setRequestToDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Solicitação"
        description="Tem certeza que deseja excluir esta solicitação? Esta ação não poderá ser desfeita."
      />
    </div>
  );
}
