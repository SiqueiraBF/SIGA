import { useState, useEffect, useMemo } from 'react';
import { Plus, Package, Calendar, User, Truck, CheckCircle, Clock, XCircle, Building2, AlertTriangle, Filter, Settings, HelpCircle, LayoutDashboard, FileText, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StockRequestForm } from '../components/StockRequestForm';
import { StockSeparationModal } from '../components/StockSeparationModal';
import { StockEmailSettingsModal } from '../components/stock/StockEmailSettingsModal';
import { TransferGuideModal } from '../components/TransferGuideModal';
import { FilterBar } from '../components/ui/FilterBar';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { StatusBadge } from '../components/ui/StatusBadge';
import { stockService } from '../services/stockService';
import { db } from '../services/supabaseService';
import { useAuth } from '../context/AuthContext';
import { format, parseISO, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
        if (window.confirm('Tem certeza que deseja excluir esta solicitação? Esta ação não pode ser desfeita.')) {
            try {
                await stockService.deleteRequest(data.id);
                loadData();
            } catch (err: any) {
                alert('Erro ao excluir: ' + err.message);
            }
        }
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
        return requests.filter(req => {
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
        <div className="max-w-7xl mx-auto pb-20 space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <PageHeader
                title="Transferência de Estoque"
                subtitle="Solicite o envio de materiais e peças disponíveis na Matriz para unidade"
                icon={Package}
            >
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsGuideOpen(true)}
                        className="bg-white border border-slate-200 text-slate-500 px-3 py-2 rounded-lg font-bold hover:bg-slate-50 hover:text-blue-600 transition-colors"
                        title="Guia de Procedimento"
                    >
                        <HelpCircle size={20} />
                    </button>

                    {canManageNotifications && (
                        <button
                            onClick={() => setIsEmailSettingsOpen(true)}
                            className="bg-slate-100 text-slate-600 px-3 py-2 rounded-lg font-bold hover:bg-slate-200 transition-colors"
                            title="Configurar E-mails"
                        >
                            <Settings size={20} />
                        </button>
                    )}
                    {role?.permissoes?.gestao_transferencias?.edit_scope !== 'NONE' && (
                        <button
                            onClick={() => { setSelectedRequestId(null); setIsModalOpen(true); }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all font-semibold"
                        >
                            <Plus size={20} /> Nova Requisição
                        </button>
                    )}
                </div>
            </PageHeader>

            {isEmailSettingsOpen && (
                <StockEmailSettingsModal onClose={() => setIsEmailSettingsOpen(false)} />
            )}

            {/* Filter Bar */}
            <FilterBar
                onSearch={setSearchTerm}
                searchValue={searchTerm}
                searchPlaceholder="Buscar por ID, Filial ou Solicitante..."
                onClear={clearFilters}
                hasActiveFilters={!!hasActiveFilters}
                children={
                    <button
                        onClick={() => setShowOnlyMine(!showOnlyMine)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all text-sm h-full ${showOnlyMine
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        {showOnlyMine ? '✅ Minhas Requisições' : '👤 Minhas Requisições'}
                    </button>
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
                                {farms.map((f) => (
                                    <option key={f.id} value={f.id}>{f.nome}</option>
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
                                {users.map((u) => (
                                    <option key={u.id} value={u.id}>{u.nome}</option>
                                ))}
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
                                <option value="DRAFT">Rascunho</option>
                                <option value="PENDING">Pendente</option>
                                <option value="SEPARATING">Em Separação</option>
                                <option value="SEPARATED">Separado</option>
                                <option value="DELIVERED">Entregue</option>
                                <option value="CANCELED">Cancelado</option>
                            </select>
                        </div>
                    </>
                }
            />

            {/* Content List */}
            {loading ? (
                <TableSkeleton rows={5} columns={4} showActions={true} />
            ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <div className="text-red-500 font-bold mb-2">Erro ao carregar</div>
                    <div className="text-red-400 text-sm">{error}</div>
                    <button onClick={loadData} className="mt-4 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm font-bold">Tentar Novamente</button>
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl text-center border border-slate-100">
                    <Package size={48} className="mx-auto text-slate-200 mb-4" />
                    <h3 className="font-bold text-slate-600">Nenhuma requisição encontrada</h3>
                    <p className="text-slate-400 text-sm">Tente ajustar os filtros ou crie uma nova requisição.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-slate-500 px-2 pb-2">
                        <span>Mostrando {filteredRequests.length} de {requests.length} requisições</span>
                    </div>

                    {filteredRequests.map(req => {
                        const StatusInfo = STATUS_MAP[req.status] || STATUS_MAP.PENDING;
                        const StatusIcon = StatusInfo.icon;

                        return (
                            <div key={req.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-6 group">
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

                                <div className="text-right flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    {/* Delete Button - Admins Only */}
                                    {isAdmin && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(req); }}
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Excluir Solicitação"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}

                                    {/* Action Button */}
                                    {canConfirm && (req.status === 'PENDING' || req.status === 'SEPARATING') ? (
                                        <button
                                            onClick={() => handleSeparationClick(req)}
                                            className="bg-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-purple-200 hover:bg-purple-700 transition-all active:scale-95 flex items-center gap-2"
                                        >
                                            <Package size={16} /> Separar
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleViewDetails(req)}
                                            className="px-5 py-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 font-bold text-sm rounded-xl transition-colors"
                                        >
                                            Ver Detalhes
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <StockRequestForm
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleCloseModal}
                requestId={selectedRequestId}
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
        </div>
    );
}


