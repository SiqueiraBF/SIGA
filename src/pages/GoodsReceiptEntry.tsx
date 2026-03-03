import { useState, useEffect } from 'react';
import { Package, Truck, Calendar, FileText, Plus, Search, MapPin, CheckCircle2, Clock, Edit, Trash2, Settings as SettingsIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { goodsReceiptService } from '../services/goodsReceiptService';
import { GoodsReceipt } from '../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { FilterBar } from '../components/ui/FilterBar';
import StatsCard from '../components/ui/StatsCard';
import { GoodsReceiptFormModal } from '../components/goods-receipt/GoodsReceiptFormModal';
import { useAuth } from '../context/AuthContext';
import { GoodsReceiptEmailSettingsModal } from '../components/goods-receipt/GoodsReceiptEmailSettingsModal';
import { ArrowUpDown, ArrowUp, ArrowDown, Building2, User } from 'lucide-react';

type SortField = 'status' | 'data' | 'fornecedor' | 'destino' | 'recebedor';
type SortDirection = 'asc' | 'desc';

interface GoodsReceiptEntryProps {
    embedded?: boolean;
    refreshTrigger?: number;
    onEdit?: (receipt: GoodsReceipt) => void;
}

export function GoodsReceiptEntry({ embedded = false, refreshTrigger = 0, onEdit }: GoodsReceiptEntryProps) {
    const { user, role, checkAccess } = useAuth();
    const isAdmin = role?.nome === 'Administrador' || (user as any)?.funcao === 'Administrador';
    const [loading, setLoading] = useState(true);
    const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceipt | null>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterDestination, setFilterDestination] = useState('');
    const [filterReceiver, setFilterReceiver] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    // Sorting
    const [sortField, setSortField] = useState<SortField>('data');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    useEffect(() => {
        loadData();
    }, [refreshTrigger]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await goodsReceiptService.getAllReceipts();
            setReceipts(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (receipt: GoodsReceipt) => {
        if (onEdit) {
            onEdit(receipt);
        } else {
            setSelectedReceipt(receipt);
            setIsModalOpen(true);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este recebimento?')) return;
        try {
            await goodsReceiptService.deleteReceipt(id);
            alert('Recebimento excluído com sucesso!');
            loadData();
        } catch (error: any) {
            console.error(error);
            alert('Erro ao excluir: ' + error.message);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedReceipt(null);
    };

    // 1. Base filter (Everything except Status, used to calculate Card numbers)
    const baseReceipts = receipts.filter(item => {
        // PERMISSIONS CHECK (View Scope)
        const viewScope = role?.permissoes?.gestao_recebimento?.view_scope || 'NONE';
        if (viewScope === 'NONE' && !isAdmin) return false;
        if (viewScope === 'OWN_ONLY' && user && item.receiver_id !== user.id) return false;
        if (viewScope === 'SAME_FARM' && user && item.destination_farm_id !== user.fazenda_id) return false;

        // Date Filter
        if (filterStartDate || filterEndDate) {
            const entryDate = parseISO(item.entry_at);
            if (filterStartDate) {
                const start = new Date(filterStartDate + 'T00:00:00');
                if (entryDate < start) return false;
            }
            if (filterEndDate) {
                const end = new Date(filterEndDate + 'T23:59:59');
                if (entryDate > end) return false;
            }
        }

        if (filterDestination && item.destination_farm?.nome !== filterDestination) return false;
        if (filterReceiver && item.receiver?.nome !== filterReceiver) return false;

        if (!searchTerm) return true;
        const lowerSearch = searchTerm.toLowerCase();
        return (
            item.supplier.toLowerCase().includes(lowerSearch) ||
            item.invoice_number.toLowerCase().includes(lowerSearch) ||
            item.order_number?.toLowerCase().includes(lowerSearch) ||
            item.destination_farm?.nome?.toLowerCase().includes(lowerSearch) ||
            item.receiver?.nome?.toLowerCase().includes(lowerSearch)
        );
    });

    // 2. Final filter (Applies Status explicitly for the List rendering)
    const filteredReceipts = baseReceipts.filter(item => {
        if (filterStatus) {
            const isExited = !!item.exit_at || !!item.exit;
            if (filterStatus === 'Aguardando' && isExited) return false;
            if (filterStatus === 'Despachado' && !isExited) return false;
        }
        return true;
    });

    const sortedReceipts = [...filteredReceipts].sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortField) {
            case 'data':
                aValue = new Date(a.entry_at).getTime();
                bValue = new Date(b.entry_at).getTime();
                break;
            case 'fornecedor':
                aValue = a.supplier;
                bValue = b.supplier;
                break;
            case 'destino':
                aValue = a.destination_farm?.nome || '';
                bValue = b.destination_farm?.nome || '';
                break;
            case 'recebedor':
                aValue = a.receiver?.nome || '';
                bValue = b.receiver?.nome || '';
                break;
            case 'status':
                aValue = (!!a.exit_at || !!a.exit) ? 1 : 0;
                bValue = (!!b.exit_at || !!b.exit) ? 1 : 0;
                break;
            default:
                return 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

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
        setSearchTerm('');
        setFilterStatus('');
        setFilterDestination('');
        setFilterReceiver('');
        setFilterStartDate('');
        setFilterEndDate('');
    };

    const hasActiveFilters = filterStatus || filterDestination || filterReceiver || searchTerm || filterStartDate || filterEndDate;

    const uniqueDestinations = Array.from(new Set(receipts.map(r => r.destination_farm?.nome).filter(Boolean)));
    const uniqueReceivers = Array.from(new Set(receipts.map(r => r.receiver?.nome).filter(Boolean)));

    // Stats Calculation on top of baseReceipts (so filtering destination makes cards drop numbers!)
    const stats = {
        pending: baseReceipts.filter(r => !r.exit_at && !r.exit).length,
        receivedToday: baseReceipts.filter(r => {
            const date = parseISO(r.entry_at);
            const today = new Date();
            return date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear();
        }).length,
        dispatchedToday: baseReceipts.filter(r => {
            const exitDateStr = r.exit?.exit_date || r.exit_at;
            if (!exitDateStr) return false;
            const date = parseISO(exitDateStr);
            const today = new Date();
            return date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear();
        }).length
    };

    const canEditAll = isAdmin || role?.permissoes?.gestao_recebimento?.edit_scope === 'ALL';
    const canEditOwn = canEditAll || role?.permissoes?.gestao_recebimento?.edit_scope === 'OWN_ONLY';
    const canEdit = canEditOwn; // Used to show Add Button

    return (
        <div className={`max-w-7xl mx-auto ${embedded ? '' : 'pb-20 space-y-6'} animate-in fade-in duration-500`}>
            {!embedded && (
                <PageHeader
                    title="Recebimento de Mercadorias (Entrada)"
                    subtitle="Painel de controle de mercadorias recebidas no CD."
                    icon={Package}
                >
                    {(isAdmin || role?.permissoes?.gestao_recebimento?.manage_notifications) && !embedded && (
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="p-2.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 bg-white border border-slate-200 rounded-xl transition-all shadow-sm"
                            title="Configurar Notificações"
                        >
                            <SettingsIcon size={20} />
                        </button>
                    )}
                    {canEdit && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-lg shadow-blue-200 transition-all active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                            Novo Recebimento
                        </button>
                    )}
                </PageHeader>
            )}

            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`}>
                <StatsCard
                    title="AGUARDANDO SAÍDA"
                    value={stats.pending}
                    icon={Clock}
                    description="recebimentos retidos"
                    variant={filterStatus === 'Aguardando' ? 'orange' : 'default'}
                    onClick={() => setFilterStatus(filterStatus === 'Aguardando' ? '' : 'Aguardando')}
                    className={`hover:bg-orange-50 ${filterStatus === 'Aguardando' ? 'ring-2 ring-orange-200 bg-orange-50' : ''}`}
                />
                <StatsCard
                    title="RECEBIDOS HOJE"
                    value={stats.receivedToday}
                    icon={Package}
                    description="entradas hoje"
                    variant={!filterStatus ? 'blue' : 'default'}
                    onClick={() => setFilterStatus('')}
                    className={!filterStatus ? 'ring-2 ring-blue-200' : ''}
                />
                <StatsCard
                    title="DESPACHADOS HOJE"
                    value={stats.dispatchedToday}
                    icon={Truck}
                    description="saídas de carregamentos"
                    variant={filterStatus === 'Despachado' ? 'green' : 'default'}
                    onClick={() => setFilterStatus(filterStatus === 'Despachado' ? '' : 'Despachado')}
                    className={`hover:bg-green-50 ${filterStatus === 'Despachado' ? 'ring-2 ring-green-200 bg-green-50' : ''}`}
                />
            </div>

            {!embedded && (
                <GoodsReceiptFormModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSuccess={loadData}
                    initialData={selectedReceipt}
                />
            )}

            <div className="space-y-4">
                <FilterBar
                    onSearch={setSearchTerm}
                    searchValue={searchTerm}
                    searchPlaceholder="Buscar por Fornecedor, NF, Pedido..."
                    onClear={clearFilters}
                    hasActiveFilters={!!hasActiveFilters}
                    advancedFilters={
                        <>
                            <div className="space-y-1.5 sm:col-span-2">
                                <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                                    <Calendar size={12} /> Período de Entrada
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                                        value={filterStartDate}
                                        onChange={(e) => setFilterStartDate(e.target.value)}
                                        title="Data Inicial"
                                    />
                                    <span className="text-slate-400 self-center">até</span>
                                    <input
                                        type="date"
                                        className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                                        value={filterEndDate}
                                        onChange={(e) => setFilterEndDate(e.target.value)}
                                        title="Data Final"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                                    <Building2 size={12} /> Destino
                                </label>
                                <select
                                    className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                                    value={filterDestination}
                                    onChange={(e) => setFilterDestination(e.target.value)}
                                >
                                    <option value="">Todos</option>
                                    {uniqueDestinations.map(d => (
                                        <option key={d as string} value={d as string}>{d as string}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                                    <User size={12} /> Recebedor
                                </label>
                                <select
                                    className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                                    value={filterReceiver}
                                    onChange={(e) => setFilterReceiver(e.target.value)}
                                >
                                    <option value="">Todos</option>
                                    {uniqueReceivers.map(r => (
                                        <option key={r as string} value={r as string}>{r as string}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                                    <CheckCircle2 size={12} /> Status
                                </label>
                                <select
                                    className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                >
                                    <option value="">Todos</option>
                                    <option value="Aguardando">Aguardando Saída</option>
                                    <option value="Despachado">Despachado</option>
                                </select>
                            </div>
                        </>
                    }
                />

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-6">
                            <TableSkeleton rows={5} columns={6} />
                        </div>
                    ) : filteredReceipts.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <Package size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="font-medium">Nenhum recebimento encontrado.</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('status')}>
                                                <div className="flex items-center gap-2">Status <SortIcon field="status" /></div>
                                            </th>
                                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('data')}>
                                                <div className="flex items-center gap-2">Entrada <SortIcon field="data" /></div>
                                            </th>
                                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('fornecedor')}>
                                                <div className="flex items-center gap-2">Fornecedor / NF / Pedido <SortIcon field="fornecedor" /></div>
                                            </th>
                                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('destino')}>
                                                <div className="flex items-center gap-2">Destino <SortIcon field="destino" /></div>
                                            </th>
                                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('recebedor')}>
                                                <div className="flex items-center gap-2">Recebido Por <SortIcon field="recebedor" /></div>
                                            </th>
                                            <th className="px-6 py-4">Saída / Motorista</th>
                                            <th className="px-6 py-4 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {sortedReceipts.map(item => {
                                            const isExited = !!item.exit_at || !!item.exit;
                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        {isExited ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium text-xs">
                                                                <CheckCircle2 size={12} /> Despachado
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 font-medium text-xs">
                                                                <Clock size={12} /> Aguardando
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar size={14} className="text-slate-400" />
                                                            {format(parseISO(item.entry_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-slate-700">{item.supplier}</div>
                                                        <div className="text-xs text-slate-500 flex items-center gap-3">
                                                            <span className="flex items-center gap-1">
                                                                <FileText size={10} /> NF: {item.invoice_number}
                                                            </span>
                                                            {item.order_number && (
                                                                <span className="flex items-center gap-1 text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded">
                                                                    <FileText size={10} /> Ped: {item.order_number}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-medium text-xs">
                                                            <MapPin size={12} /> {item.destination_farm?.nome}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600">
                                                        <div className="font-medium">{item.receiver?.nome}</div>
                                                        {item.observation_entry && (
                                                            <div className="text-xs text-slate-400 italic truncate max-w-[200px]" title={item.observation_entry}>
                                                                Obs: {item.observation_entry}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600">
                                                        {item.exit ? (
                                                            <div>
                                                                <div className="flex items-center gap-1 font-medium">
                                                                    <Truck size={14} className="text-slate-400" />
                                                                    {item.exit.driver_name}
                                                                </div>
                                                                <div className="text-xs text-green-600">
                                                                    {format(parseISO(item.exit.exit_date), "dd/MM HH:mm", { locale: ptBR })}
                                                                </div>
                                                                <div className="text-[10px] text-slate-400">
                                                                    Exp. #{item.exit.sequential_id}
                                                                </div>
                                                            </div>
                                                        ) : item.exit_at ? (
                                                            <div>
                                                                <div className="flex items-center gap-1 font-medium">
                                                                    <Truck size={14} className="text-slate-400" />
                                                                    {item.driver_name}
                                                                </div>
                                                                <div className="text-xs text-green-600">
                                                                    {format(parseISO(item.exit_at), "dd/MM HH:mm", { locale: ptBR })}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {(canEditAll || (canEditOwn && item.receiver_id === user?.id)) && (
                                                                <button
                                                                    onClick={() => handleEdit(item)}
                                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                    title="Editar"
                                                                >
                                                                    <Edit size={16} />
                                                                </button>
                                                            )}
                                                            {(isAdmin || (canEditOwn && item.receiver_id === user?.id)) && !item.exit_at && (
                                                                <button
                                                                    onClick={() => handleDelete(item.id)}
                                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                    title="Excluir"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Data Cards */}
                            <div className="md:hidden divide-y divide-slate-100">
                                {sortedReceipts.map(item => {
                                    const isExited = !!item.exit_at || !!item.exit;
                                    return (
                                        <div key={item.id} className="p-4 bg-white hover:bg-slate-50 transition-colors">
                                            {/* Header: Supplier & Status */}
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="font-bold text-slate-800 line-clamp-1">{item.supplier}</div>
                                                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                                                        <span>NF: {item.invoice_number}</span>
                                                        {item.order_number && (
                                                            <span className="ps-2 border-l border-slate-200">Ped: {item.order_number}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                {isExited ? (
                                                    <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-green-100 text-green-700 font-bold text-[10px] uppercase tracking-wide">
                                                        Despachado
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-orange-100 text-orange-700 font-bold text-[10px] uppercase tracking-wide">
                                                        Aguardando
                                                    </span>
                                                )}
                                            </div>

                                            {/* Body: Meta Info */}
                                            <div className="grid grid-cols-2 gap-y-2 text-xs mb-3">
                                                <div className="flex items-center gap-1.5 text-slate-600">
                                                    <Calendar size={12} className="text-slate-400" />
                                                    {format(parseISO(item.entry_at), "dd/MM HH:mm", { locale: ptBR })}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-slate-600">
                                                    <MapPin size={12} className="text-slate-400" />
                                                    {item.destination_farm?.nome}
                                                </div>
                                                {item.exit && (
                                                    <div className="flex items-center gap-1.5 text-slate-600">
                                                        <Truck size={12} className="text-slate-400" />
                                                        {item.exit.driver_name}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Footer: Actions */}
                                            <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                                                <div className="text-xs text-blue-600 font-medium">
                                                    {item.receiver?.nome}
                                                </div>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => handleEdit(item)}
                                                        className="text-blue-600 font-medium text-xs flex items-center gap-1 p-1"
                                                    >
                                                        <Edit size={14} /> Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="text-red-500 font-medium text-xs flex items-center gap-1 p-1"
                                                    >
                                                        <Trash2 size={14} /> Excluir
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
            {isSettingsOpen && (
                <GoodsReceiptEmailSettingsModal onClose={() => setIsSettingsOpen(false)} />
            )}
        </div>
    );
}
