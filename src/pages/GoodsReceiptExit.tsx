import { useState, useEffect } from 'react';
import { Truck, Package, Calendar, User, MapPin, Plus, ChevronRight, Eye, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { goodsReceiptService } from '../services/goodsReceiptService';
import { GoodsExit, GoodsReceipt } from '../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { FilterBar } from '../components/ui/FilterBar';
import StatsCard from '../components/ui/StatsCard';
import { GoodsReceiptDispatchModal } from '../components/goods-receipt/GoodsReceiptDispatchModal';
import { GoodsReceiptExitDetailsModal } from '../components/goods-receipt/GoodsReceiptExitDetailsModal';
import { useAuth } from '../context/AuthContext';
import { ArrowUpDown, ArrowUp, ArrowDown, Building2 } from 'lucide-react';

type SortField = 'numero' | 'data' | 'destino' | 'motorista' | 'itens';
type SortDirection = 'asc' | 'desc';

interface GoodsReceiptExitProps {
    embedded?: boolean;
    refreshTrigger?: number;
}

export function GoodsReceiptExit({ embedded = false, refreshTrigger = 0 }: GoodsReceiptExitProps) {
    const { user, role } = useAuth();
    const isAdmin = role?.nome === 'Administrador' || (user as any)?.funcao === 'Administrador';
    const [loading, setLoading] = useState(true);
    const [exits, setExits] = useState<GoodsExit[]>([]);
    const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);

    // Details Modal
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedExitData, setSelectedExitData] = useState<{ exit: GoodsExit, receipts: GoodsReceipt[] } | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDestination, setFilterDestination] = useState('');
    const [filterDriver, setFilterDriver] = useState('');

    // Sorting
    const [sortField, setSortField] = useState<SortField>('data');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    useEffect(() => {
        loadData();
    }, [refreshTrigger]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await goodsReceiptService.getExits();
            setExits(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = async (exit: GoodsExit) => {
        setLoadingDetails(true);
        try {
            const details = await goodsReceiptService.getExitDetails(exit.id);
            setSelectedExitData(details);
            setIsDetailsModalOpen(true);
        } catch (error) {
            console.error(error);
            alert('Erro ao carregar detalhes.');
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent opening details modal
        if (!confirm('Tem certeza que deseja excluir esta saída? Os itens vinculados voltarão para "Aguardando Saída".')) return;

        try {
            await goodsReceiptService.deleteExit(id);
            alert('Saída excluída e itens liberados com sucesso!');
            loadData();
        } catch (error: any) {
            console.error(error);
            alert('Erro ao excluir: ' + error.message);
        }
    };

    const filteredExits = exits.filter(item => {
        // PERMISSIONS CHECK (View Scope)
        const viewScope = role?.permissoes?.gestao_recebimento?.view_scope || 'NONE';
        if (viewScope === 'NONE' && !isAdmin) return false;
        if (viewScope === 'OWN_ONLY' && user && item.created_by !== user.id) return false;
        if (viewScope === 'SAME_FARM' && user && item.destination_farm_id !== user.fazenda_id) return false;

        if (filterDestination && item.destination_farm?.nome !== filterDestination) return false;
        if (filterDriver && item.driver_name !== filterDriver) return false;

        if (!searchTerm) return true;
        const lowerSearch = searchTerm.toLowerCase();
        return (
            item.destination_farm?.nome.toLowerCase().includes(lowerSearch) ||
            item.driver_name.toLowerCase().includes(lowerSearch) ||
            item.sequential_id.toString().includes(lowerSearch)
        );
    });

    const sortedExits = [...filteredExits].sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortField) {
            case 'numero':
                aValue = a.sequential_id;
                bValue = b.sequential_id;
                break;
            case 'data':
                aValue = new Date(a.exit_date).getTime();
                bValue = new Date(b.exit_date).getTime();
                break;
            case 'destino':
                aValue = a.destination_farm?.nome || '';
                bValue = b.destination_farm?.nome || '';
                break;
            case 'motorista':
                aValue = a.driver_name || '';
                bValue = b.driver_name || '';
                break;
            case 'itens':
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
        setFilterDestination('');
        setFilterDriver('');
    };

    const hasActiveFilters = filterDestination || filterDriver || searchTerm;

    const uniqueDestinations = Array.from(new Set(exits.map(e => e.destination_farm?.nome).filter(Boolean)));
    const uniqueDrivers = Array.from(new Set(exits.map(e => e.driver_name).filter(Boolean)));

    // Stats
    const stats = {
        totalExits: exits.length,
        dispatchedToday: exits.filter(e => {
            const date = parseISO(e.exit_date);
            const today = new Date();
            return date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear();
        }).length,
        totalItems: exits.reduce((acc, curr) => acc + (curr.items_count || 0), 0)
    };

    const canEditAll = isAdmin || role?.permissoes?.gestao_recebimento?.edit_scope === 'ALL';
    const canEditOwn = canEditAll || role?.permissoes?.gestao_recebimento?.edit_scope === 'OWN_ONLY';
    const canEdit = canEditOwn;

    return (
        <div className={`max-w-7xl mx-auto ${embedded ? '' : 'pb-20 space-y-6'} animate-in fade-in duration-500`}>
            {!embedded && (
                <PageHeader
                    title="Saída de Mercadorias (Expedição)"
                    subtitle="Gerencie o despacho de mercadorias para as fazendas."
                    icon={Truck}
                >
                    {canEdit && (
                        <button
                            onClick={() => setIsDispatchModalOpen(true)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <Plus size={18} /> Nova Saída
                        </button>
                    )}
                </PageHeader>
            )}

            {!embedded && (
                <GoodsReceiptDispatchModal
                    isOpen={isDispatchModalOpen}
                    onClose={() => setIsDispatchModalOpen(false)}
                    onSuccess={loadData}
                />
            )}

            <GoodsReceiptExitDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                data={selectedExitData}
            />

            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`}>
                <StatsCard
                    title="TOTAL DE SAÍDAS"
                    value={stats.totalExits}
                    icon={Truck}
                    description="operações registradas"
                    variant="blue"
                />
                <StatsCard
                    title="SAÍDAS HOJE"
                    value={stats.dispatchedToday}
                    icon={Calendar}
                    description="despachos hoje"
                    variant="green"
                />
                <StatsCard
                    title="ITENS DESPACHADOS"
                    value={stats.totalItems}
                    icon={Package}
                    description="total de produtos"
                    variant="purple"
                />
            </div>

            <div className="space-y-4">
                <FilterBar
                    onSearch={setSearchTerm}
                    searchValue={searchTerm}
                    searchPlaceholder="Buscar por Motorista, Fazenda, Nº Saída..."
                    onClear={clearFilters}
                    hasActiveFilters={!!hasActiveFilters}
                    advancedFilters={
                        <>
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
                                    <User size={12} /> Motorista
                                </label>
                                <select
                                    className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                                    value={filterDriver}
                                    onChange={(e) => setFilterDriver(e.target.value)}
                                >
                                    <option value="">Todos</option>
                                    {uniqueDrivers.map(d => (
                                        <option key={d as string} value={d as string}>{d as string}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    }
                />

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-6">
                            <TableSkeleton rows={5} columns={5} />
                        </div>
                    ) : filteredExits.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <Package size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="font-medium">Nenhuma expedição encontrada.</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('numero')}>
                                                <div className="flex items-center gap-2">Nº <SortIcon field="numero" /></div>
                                            </th>
                                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('data')}>
                                                <div className="flex items-center gap-2">Data Saída <SortIcon field="data" /></div>
                                            </th>
                                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('destino')}>
                                                <div className="flex items-center gap-2">Destino <SortIcon field="destino" /></div>
                                            </th>
                                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('motorista')}>
                                                <div className="flex items-center gap-2">Enviado Por (Motorista) <SortIcon field="motorista" /></div>
                                            </th>
                                            <th className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100" onClick={() => handleSort('itens')}>
                                                <div className="flex items-center justify-center gap-2">Itens <SortIcon field="itens" /></div>
                                            </th>
                                            <th className="px-6 py-4 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {sortedExits.map(item => (
                                            <tr
                                                key={item.id}
                                                className={`hover:bg-slate-50 transition-colors cursor-pointer group ${loadingDetails ? 'opacity-70 pointer-events-none' : ''}`}
                                                onClick={() => handleViewDetails(item)}
                                            >
                                                <td className="px-6 py-4 font-bold text-slate-700">
                                                    #{item.sequential_id}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={14} className="text-slate-400" />
                                                        {format(parseISO(item.exit_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-medium text-xs">
                                                        <MapPin size={12} /> {item.destination_farm?.nome}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 font-medium text-slate-700">
                                                        <User size={14} className="text-green-600" />
                                                        {item.driver_name}
                                                    </div>
                                                    <div className="text-xs text-slate-400 pl-6">
                                                        Criado por {item.creator?.nome || 'Sistema'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="inline-block bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">
                                                        {item.items_count || 0}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 text-slate-400 group-hover:text-slate-600">
                                                        <button
                                                            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
                                                            title="Ver Detalhes"
                                                        >
                                                            <ChevronRight size={18} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDelete(item.id, e)}
                                                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors z-10 relative"
                                                            title="Excluir Saída"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Data Cards */}
                            <div className="md:hidden divide-y divide-slate-100">
                                {sortedExits.map(item => (
                                    <div
                                        key={item.id}
                                        className="p-4 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                                        onClick={() => handleViewDetails(item)}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-bold text-slate-800">#{item.sequential_id}</span>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-medium text-[10px] uppercase">
                                                    <MapPin size={10} /> {item.destination_farm?.nome}
                                                </span>
                                            </div>
                                            <span className="inline-block bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">
                                                {item.items_count || 0} itens
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-y-1 mb-3">
                                            <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                                <User size={14} className="text-green-600" />
                                                {item.driver_name}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <Calendar size={12} className="text-slate-400" />
                                                {format(parseISO(item.exit_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-50">
                                            <button
                                                className="text-blue-600 font-medium text-xs flex items-center gap-1 p-1"
                                            >
                                                <Eye size={14} /> Ver Detalhes
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(item.id, e)}
                                                className="text-red-500 font-medium text-xs flex items-center gap-1 p-1 z-10"
                                            >
                                                <Trash2 size={14} /> Excluir
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
