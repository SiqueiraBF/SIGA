import { useState, useEffect, useMemo } from 'react';
import { Plus, Package, Calendar, User, Truck, CheckCircle, Clock, XCircle, Building2, AlertTriangle, Filter, Settings, HelpCircle, LayoutDashboard, FileText, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StockRequestForm } from '../components/StockRequestForm';
import { StockSeparationModal } from '../components/StockSeparationModal';
import { EmailSettingsModal } from '../components/ui/EmailSettingsModal';
import { TransferGuideModal } from '../components/TransferGuideModal';
import { FilterBar } from '../components/ui/FilterBar';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { StatusBadge } from '../components/ui/StatusBadge';
import { IconButton } from '../components/ui/IconButton';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { FormField } from '../components/ui/FormField';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { stockService } from '../services/stockService';
import { db } from '../services/supabaseService';
import { useAuth } from '../context/AuthContext';
import { format, parseISO, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import type { StockRequest, Fazenda, Usuario } from '../types';

const STATUS_MAP: Record<string, { label: string; color: string; icon: any; variant: any }> = {
    DRAFT: { label: 'Rascunho', color: 'bg-slate-100 text-slate-700', icon: Package, variant: 'default' },
    PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700', icon: Clock, variant: 'warning' },
    SEPARATING: { label: 'Em Separação', color: 'bg-blue-100 text-blue-700', icon: Package, variant: 'blue' },
    SEPARATED: { label: 'Separado', color: 'bg-purple-100 text-purple-700', icon: CheckCircle, variant: 'purple' },
    DELIVERED: { label: 'Entregue', color: 'bg-green-100 text-green-700', icon: Truck, variant: 'success' },
    CANCELED: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: XCircle, variant: 'destructive' },
};

export function StockRequestList() {
    const { user, role, hasPermission, checkAccess } = useAuth();
    const isAdmin = role?.nome === 'Administrador' || (user as any)?.funcao === 'Administrador';

    // Permission Checks
    const canEditAll = isAdmin || role?.permissoes?.gestao_transferencias?.edit_scope === 'ALL';
    const canEditOwn = canEditAll || role?.permissoes?.gestao_transferencias?.edit_scope === 'OWN_ONLY';
    const canEdit = canEditOwn; // Used just to show 'Nova Requisição' button
    const canConfirm = isAdmin || role?.permissoes?.gestao_transferencias?.can_confirm;
    const canManageNotifications = isAdmin || role?.permissoes?.gestao_transferencias?.manage_notifications;

    // Data State
    const [requests, setRequests] = useState<StockRequest[]>([]);
    const [farms, setFarms] = useState<Fazenda[]>([]);
    const [users, setUsers] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEmailSettingsOpen, setIsEmailSettingsOpen] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [separationRequest, setSeparationRequest] = useState<StockRequest | null>(null);
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        variant?: 'danger' | 'warning' | 'info';
        onConfirm: () => void | Promise<void>;
        isLoading?: boolean;
    }>({ isOpen: false, title: '', description: '', onConfirm: () => {} });

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyMine, setShowOnlyMine] = useState(false);

    // Advanced Filters
    const [filterStatus, setFilterStatus] = useState('');
    const [filterFarm, setFilterFarm] = useState('');
    const [filterUser, setFilterUser] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    useEffect(() => {
        loadData();
    }, [user]);

    const loadData = async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const viewScope = role?.permissoes?.gestao_transferencias?.view_scope || 'NONE';

            // Build query filters based on permissions to reduce egress
            let queryFilters: { farmId?: string; requesterId?: string } = {};
            if (!isAdmin) {
                if (viewScope === 'OWN_ONLY') {
                    queryFilters.requesterId = user.id;
                } else if (viewScope === 'SAME_FARM') {
                    queryFilters.farmId = user.fazenda_id;
                } else if (viewScope === 'NONE') {
                    // If no permission, don't even try to fetch
                    setRequests([]);
                    setLoading(false);
                    return;
                }
            }

            // Fetch everything in parallel
            const [requestsData, farmsData, usersData] = await Promise.all([
                stockService.getRequests(queryFilters),
                db.getAllFarms(),
                db.getAllUsers()
            ]);

            setRequests(requestsData);
            setFarms(farmsData as Fazenda[]);
            setUsers(usersData as Usuario[]);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    const handleSeparationClick = (req: StockRequest) => {
        setSeparationRequest(req);
    };

    const handleViewDetails = (req: StockRequest) => {
        setSelectedRequestId(req.id);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedRequestId(null);
        loadData(); // Refresh list
    };

    const handleDelete = async (data: StockRequest) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Excluir Solicitação',
            description: 'Tem certeza que deseja excluir esta solicitação? Esta ação não pode ser desfeita.',
            variant: 'danger',
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, isLoading: true }));
                try {
                    await stockService.deleteRequest(data.id);
                    toast.success('Solicitação excluída com sucesso');
                    loadData();
                } catch (err: any) {
                    toast.error('Erro ao excluir: ' + err.message);
                } finally {
                    setConfirmDialog(prev => ({ ...prev, isLoading: false }));
                }
            }
        });
    };

    const clearFilters = () => {
        setSearchTerm('');
        setShowOnlyMine(false);
        setFilterStatus('');
        setFilterFarm('');
        setFilterUser('');
        setFilterStartDate('');
        setFilterEndDate('');
    };

    // --- Filter Logic ---
    const filteredRequests = useMemo(() => {
        const filtered = requests.filter(req => {
            // 1. Text Search (ID, Farm, User)
            if (searchTerm) {
                const lowerTerm = searchTerm.toLowerCase();
                const matchId = (req.friendly_id?.toString() || req.id).toLowerCase().includes(lowerTerm);
                const matchFarm = (req.fazenda?.nome || '').toLowerCase().includes(lowerTerm);
                const matchUser = (req.usuario?.nome || '').toLowerCase().includes(lowerTerm);
                if (!matchId && !matchFarm && !matchUser) return false;
            }

            // 2. Only Mine Toggle (Manual Overlap Filter)
            if (showOnlyMine && user && req.requester_id !== user.id) return false;

            // 3. Status
            if (filterStatus && req.status !== filterStatus) return false;

            // 4. Farm
            if (filterFarm && req.farm_id !== filterFarm) return false;

            // 5. User (Requester from filter)
            if (filterUser && req.requester_id !== filterUser) return false;

            // 6. Date Range
            if (filterStartDate || filterEndDate) {
                const reqDate = parseISO(req.created_at);
                if (filterStartDate && isBefore(reqDate, startOfDay(parseISO(filterStartDate)))) return false;
                if (filterEndDate && isAfter(reqDate, endOfDay(parseISO(filterEndDate)))) return false;
            }

            return true;
        });

        return filtered.sort((a, b) => {
            if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
            if (b.status === 'PENDING' && a.status !== 'PENDING') return 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }, [requests, searchTerm, showOnlyMine, filterStatus, filterFarm, filterUser, filterStartDate, filterEndDate, user]);

    // Unique IDs for Dropdowns (Optimization: only show farms/users involved in requests? Or all? Using ALL from DB for simplicity in filter)
    // Using formatted farms/users from state.

    const hasActiveFilters = searchTerm || showOnlyMine || filterStatus || filterFarm || filterUser || filterStartDate || filterEndDate;

    if (!hasPermission('gestao_transferencias')) {
        return (
            <div className="p-8 text-center">
                <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-xl p-6">
                    <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-800 mb-2">Acesso Negado</h2>
                    <p className="text-red-600">Você não tem permissão para acessar as Transferências de Estoque.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 w-full animate-in fade-in duration-500 space-y-6 pb-20">
            {/* Header */}
            <PageHeader
                title="Transferência de Estoque"
                subtitle="Solicite o envio de materiais e peças disponíveis na Matriz para unidade"
                icon={Package}
            >
                <div className="flex gap-2">
                    <IconButton
                        icon={HelpCircle}
                        label="Guia de Procedimento"
                        onClick={() => setIsGuideOpen(true)}
                    />

                    {canManageNotifications && (
                        <IconButton
                            icon={Settings}
                            label="Configurar E-mail"
                            onClick={() => setIsEmailSettingsOpen(true)}
                        />
                    )}
                    {role?.permissoes?.gestao_transferencias?.edit_scope !== 'NONE' && (
                        <Button
                            icon={Plus}
                            onClick={() => { setSelectedRequestId(null); setIsModalOpen(true); }}
                        >
                            Nova Requisição
                        </Button>
                    )}
                </div>
            </PageHeader>

            <EmailSettingsModal
                isOpen={isEmailSettingsOpen}
                onClose={() => setIsEmailSettingsOpen(false)}
                title="Configurar E-mail · Transferência de Estoque"
                subtitle="Defina quem recebe as solicitações de transferência"
                globalMode
                steps={[
                    { title: "Destinatários de Transferência", subtitle: "E-mails que receberão as solicitações de transferência de estoque", configKeyPrefix: "email_estoque" }
                ]}
            />

            {/* Filter Bar */}
            <FilterBar
                onSearch={setSearchTerm}
                searchValue={searchTerm}
                searchPlaceholder="Buscar por ID, Filial ou Solicitante..."
                onClear={clearFilters}
                hasActiveFilters={!!hasActiveFilters}
                children={
                    <Button
                        onClick={() => setShowOnlyMine(!showOnlyMine)}
                        variant={showOnlyMine ? 'primary' : 'secondary'}
                        icon={showOnlyMine ? CheckCircle : User}
                        className="h-full"
                    >
                        Minhas Requisições
                    </Button>
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
                                options={[{ value: '', label: 'Todas' }, ...farms.map(f => ({ value: f.id, label: f.nome }))]}
                            />
                        </FormField>
                        <FormField label="Solicitante">
                            <Select
                                value={filterUser}
                                onChange={(e) => setFilterUser(e.target.value)}
                                options={[{ value: '', label: 'Todos' }, ...users.map(u => ({ value: u.id, label: u.nome }))]}
                            />
                        </FormField>
                        <FormField label="Status">
                            <Select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                options={[
                                    { value: '', label: 'Todos' },
                                    { value: 'DRAFT', label: 'Rascunho' },
                                    { value: 'PENDING', label: 'Pendente' },
                                    { value: 'SEPARATING', label: 'Em Separação' },
                                    { value: 'SEPARATED', label: 'Separado' },
                                    { value: 'DELIVERED', label: 'Entregue' },
                                    { value: 'CANCELED', label: 'Cancelado' }
                                ]}
                            />
                        </FormField>
                    </>
                }
            />

            {/* Content List */}
            {loading ? (
                <TableSkeleton rows={5} columns={4} showActions={true} />
            ) : error ? (
                <EmptyState
                    icon={AlertTriangle}
                    title="Erro ao carregar"
                    description={error}
                    action={
                        <Button variant="danger" onClick={loadData}>
                            Tentar Novamente
                        </Button>
                    }
                />
            ) : filteredRequests.length === 0 ? (
                <EmptyState
                    icon={Package}
                    title="Nenhuma requisição encontrada"
                    description="Tente ajustar os filtros ou crie uma nova requisição."
                />
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-slate-500 px-2 pb-2">
                        <span>Mostrando {filteredRequests.length} de {requests.length} requisições</span>
                    </div>

                    {filteredRequests.map(req => {
                        const StatusInfo = STATUS_MAP[req.status] || STATUS_MAP.PENDING;
                        const StatusIcon = StatusInfo.icon;

                        return (
                            <Card key={req.id} hover className="p-5 flex items-center gap-6 group cursor-pointer" onClick={() => handleViewDetails(req)}>
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${StatusInfo.color.split(' ')[0]} bg-opacity-50`}>
                                    <StatusIcon size={24} className={StatusInfo.color.split(' ')[1]} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1.5">
                                        <span className="font-bold text-slate-800 text-lg">
                                            {req.friendly_id ? `#${req.friendly_id}` : `#${req.id.slice(0, 8)}`}
                                        </span>
                                        <StatusBadge
                                            status={StatusInfo.label}
                                            variant={StatusInfo.variant}
                                            size="sm"
                                        />
                                        {req.category && req.category !== 'GERAL' && (
                                            <StatusBadge 
                                                size="sm" 
                                                variant={req.category === 'SEGURANCA' ? 'orange' : 'info'} 
                                                status={req.category === 'SEGURANCA' ? 'EPI' : 'Uniforme'} 
                                            />
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar size={14} className="text-slate-400" />
                                            {format(new Date(req.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <User size={14} className="text-slate-400" />
                                            {req.usuario?.nome || 'Desconhecido'}
                                        </span>
                                        {req.fazenda && (
                                            <span className="flex items-center gap-1.5 font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                                                <Building2 size={12} className="text-slate-500" /> {req.fazenda.nome}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            <StockRequestForm
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleCloseModal}
                requestId={selectedRequestId}
                onSeparar={handleSeparationClick}
            />

            {separationRequest && (
                <StockSeparationModal
                    isOpen={!!separationRequest}
                    onClose={() => setSeparationRequest(null)}
                    onSave={(finishedReq) => {
                        loadData();
                        if (finishedReq) {
                            handleViewDetails(finishedReq);
                        }
                    }}
                    request={separationRequest}
                />
            )}

            <TransferGuideModal
                isOpen={isGuideOpen}
                onClose={() => setIsGuideOpen(false)}
            />

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                title={confirmDialog.title}
                description={confirmDialog.description}
                variant={confirmDialog.variant}
                onConfirm={confirmDialog.onConfirm}
                isLoading={confirmDialog.isLoading}
            />
        </div>
    );
}


