import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../components/ui/PageHeader';
import { DirectReceiptFormModal } from '../components/direct-receipt/DirectReceiptFormModal';
import { DirectReceiptEmailSettingsModal } from '../components/direct-receipt/DirectReceiptEmailSettingsModal';
import { DirectReceiptDetailsModal } from '../components/direct-receipt/DirectReceiptDetailsModal';
import { DirectReceiptTutorialModal } from '../components/direct-receipt/DirectReceiptTutorialModal';
import { DirectReceiptDashboard } from '../components/direct-receipt/DirectReceiptDashboard';
import { directReceiptService } from '../services/directReceiptService';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import { DirectReceipt, Fazenda } from '../types';
import { farmService } from '../services/farmService';
import {
    Receipt,
    Plus,
    Building2,
    Trash2,
    Settings,
    User,
    Calendar,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    MapPin,
    BarChart3,
    List,
    FileSpreadsheet,
    HelpCircle
} from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

// UI Kit
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { FilterBar } from '../components/ui/FilterBar';
import { EmptyState } from '../components/ui/EmptyState';

type SortField = 'nota_fiscal' | 'fornecedor' | 'responsavel' | 'valor' | 'created_at' | 'data_recebimento' | 'data_emissao' | 'fazenda';
type SortDirection = 'asc' | 'desc';

export function DirectReceiptList() {
    const { user, role, hasPermission } = useAuth();
    const isAdmin = role?.nome === 'Administrador' || (user as any)?.funcao === 'Administrador';
    
    // Tab state
    const [activeTab, setActiveTab] = useState<'list' | 'dashboard'>('list');

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isTutorialOpen, setIsTutorialOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState<DirectReceipt | null>(null);
    
    // Data
    const queryClient = useQueryClient();

    // Filters & Sort State
    const [searchTerm, setSearchTerm] = useState('');
    const [fazendaFilter, setFazendaFilter] = useState('');
    const [localFilter, setLocalFilter] = useState('');
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [sortField, setSortField] = useState<SortField>('created_at');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    // Data Fetching with React Query
    const { data: receipts = [], isLoading: loadingReceipts } = useQuery({
        queryKey: ['direct-receipts', fazendaFilter, dataInicio, dataFim],
        queryFn: () => directReceiptService.getDirectReceipts({
            fazenda_id: fazendaFilter || undefined,
            dataInicio: dataInicio || undefined,
            dataFim: dataFim || undefined
        })
    });

    const { data: fazendas = [], isLoading: loadingFarms } = useQuery({
        queryKey: ['fazendas'],
        queryFn: () => farmService.getFarms()
    });

    const loading = loadingReceipts || loadingFarms;

    // Mutations
    const saveMutation = useMutation({
        mutationFn: (items: Omit<DirectReceipt, 'id' | 'created_at' | 'usuario' | 'fazenda'>[]) => 
            directReceiptService.createDirectReceiptBulk(items),
        onSuccess: (newRecords) => {
            queryClient.invalidateQueries({ queryKey: ['direct-receipts'] });
            toast.success(`${newRecords.length} recebimentos registrados com sucesso!`);
            
            notificationService.sendDirectReceiptReport(newRecords, user?.email || undefined).catch(err => {
                console.error('Erro ao disparar e-mail:', err);
            });
        },
        onError: (error: any) => {
            console.error('Erro ao salvar lote:', error);
            toast.error('Erro ao salvar lote.');
        }
    });

    const handleSave = async (items: Omit<DirectReceipt, 'id' | 'created_at' | 'usuario' | 'fazenda'>[]) => {
        await saveMutation.mutateAsync(items);
    };

    const deleteMutation = useMutation({
        mutationFn: (id: string) => directReceiptService.deleteDirectReceipt(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['direct-receipts'] });
            toast.success('Registro excluído.');
        },
        onError: (error) => {
            console.error('Erro ao excluir:', error);
            toast.error('Erro ao excluir registro.');
        }
    });

    const handleDelete = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir este registro?')) return;
        deleteMutation.mutate(id);
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
        setFazendaFilter('');
        setLocalFilter('');
        setDataInicio('');
        setDataFim('');
        setSearchTerm('');
    };

    const filteredReceipts = receipts.filter(r => {
        if (localFilter) {
            const rLocal = r.local_recebimento === 'OUTRO' ? r.local_recebimento_outros : r.local_recebimento;
            if (rLocal !== localFilter) return false;
        }

        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            const matchesFornecedor = r.fornecedor.toLowerCase().includes(searchLower);
            const matchesNf = r.nota_fiscal.toLowerCase().includes(searchLower);
            const matchesResponsavel = r.responsavel.toLowerCase().includes(searchLower);
            if (!matchesFornecedor && !matchesNf && !matchesResponsavel) return false;
        }
        return true;
    });

    const sortedReceipts = [...filteredReceipts].sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortField) {
            case 'nota_fiscal':
                aValue = a.nota_fiscal;
                bValue = b.nota_fiscal;
                break;
            case 'fornecedor':
                aValue = a.fornecedor;
                bValue = b.fornecedor;
                break;
            case 'responsavel':
                aValue = a.responsavel;
                bValue = b.responsavel;
                break;
            case 'valor':
                aValue = a.valor;
                bValue = b.valor;
                break;
            case 'created_at':
                aValue = new Date(a.created_at).getTime();
                bValue = new Date(b.created_at).getTime();
                break;
            case 'data_recebimento':
                aValue = a.data_recebimento || '';
                bValue = b.data_recebimento || '';
                break;
            case 'data_emissao':
                aValue = new Date(a.data_emissao).getTime();
                bValue = new Date(b.data_emissao).getTime();
                break;
            case 'fazenda':
                aValue = a.fazenda?.nome || '';
                bValue = b.fazenda?.nome || '';
                break;
            default:
                return 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    const handleExportExcel = () => {
        if (sortedReceipts.length === 0) {
            toast.error("Nenhum registro para exportar.");
            return;
        }

        const exportData = sortedReceipts.map(r => ({
            'ID/NF': `#${r.nota_fiscal}`,
            'Fornecedor': r.fornecedor,
            'Local': r.local_recebimento === 'OUTRO' ? r.local_recebimento_outros : r.local_recebimento,
            'Responsável': r.responsavel,
            'Valor (R$)': r.valor || 0,
            'Data Emissão': r.data_emissao ? new Date(r.data_emissao).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-',
            'Data Recebimento': r.data_recebimento ? new Date(r.data_recebimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-',
            'Data Registro': new Date(r.created_at).toLocaleString('pt-BR'),
            'Fazenda': r.fazenda?.nome || '-',
        }));

        const ws = utils.json_to_sheet(exportData);
        ws['!cols'] = [
            { wch: 15 }, // NF
            { wch: 40 }, // Fornecedor
            { wch: 20 }, // Local
            { wch: 25 }, // Responsavel
            { wch: 15 }, // Valor
            { wch: 15 }, // Emissao
            { wch: 15 }, // Recebimento
            { wch: 20 }, // Registro
            { wch: 20 }, // Fazenda
            { wch: 40 }, // Obs
        ];
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Fuga_Processos");
        writeFile(wb, `FugaProcesso_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    };

    const locaisDisponiveis = Array.from(new Set(receipts.map(r => r.local_recebimento === 'OUTRO' ? r.local_recebimento_outros : r.local_recebimento))).filter(Boolean) as string[];

    const hasActiveFilters = fazendaFilter || localFilter || dataInicio || dataFim || searchTerm;

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            <PageHeader
                title="Fuga Processo"
                subtitle="Registro de notas fiscais entregues diretamente nas unidades (Sem Almoxarifado)"
                icon={activeTab === 'list' ? Receipt : BarChart3}
            >
                <div className="flex gap-2">
                    <button
                        onClick={handleExportExcel}
                        className="p-2.5 text-green-700 hover:text-green-800 hover:bg-green-50 rounded-xl transition-all shadow-sm bg-white border border-green-200 active:scale-95 flex items-center gap-2 font-bold"
                        title="Exportar para Excel"
                    >
                        <FileSpreadsheet size={20} /> <span className="hidden sm:inline text-sm">Exportar</span>
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => setIsEmailModalOpen(true)}
                            className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm bg-white border border-slate-200 active:scale-95 flex items-center"
                            title="Configurar Notificações"
                        >
                            <Settings size={20} />
                        </button>
                    )}
                    <button
                        onClick={() => setIsTutorialOpen(true)}
                        className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm bg-white border border-slate-200 active:scale-95 flex items-center"
                        title="Ajuda / Guia"
                    >
                        <HelpCircle size={20} />
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/25 active:scale-95"
                    >
                        <Plus size={18} /> Nova Entrega
                    </button>
                </div>
            </PageHeader>

            <div className="border-b border-slate-200 overflow-x-auto scrollbar-hide">
                <div className="flex gap-8 min-w-max px-1">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`pb-4 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'list'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <List size={16} />
                        Registros
                    </button>
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`pb-4 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'dashboard'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <BarChart3 size={16} />
                        Indicadores (Dashboard)
                    </button>
                </div>
            </div>

            {activeTab === 'list' && (
                <>
                <FilterBar
                    onSearch={setSearchTerm}
                searchValue={searchTerm}
                searchPlaceholder="Fornecedor, NF ou Responsável..."
                onClear={clearFilters}
                hasActiveFilters={!!hasActiveFilters}
                advancedFilters={
                    <>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 uppercase">
                                <Building2 size={12} /> Fazenda
                            </label>
                            <select
                                className="w-full text-sm rounded-lg border-slate-200 bg-white py-2 focus:border-blue-500 focus:ring-blue-500"
                                value={fazendaFilter}
                                onChange={(e) => setFazendaFilter(e.target.value)}
                            >
                                <option value="">Todas</option>
                                {fazendas.map(f => (
                                    <option key={f.id} value={f.id}>{f.nome}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 uppercase">
                                <MapPin size={12} /> Local
                            </label>
                            <select
                                className="w-full text-sm rounded-lg border-slate-200 bg-white py-2 focus:border-blue-500 focus:ring-blue-500"
                                value={localFilter}
                                onChange={(e) => setLocalFilter(e.target.value)}
                            >
                                <option value="">Todos</option>
                                {locaisDisponiveis.map(l => (
                                    <option key={l} value={l}>{l}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 uppercase">
                                <Calendar size={12} /> Início
                            </label>
                            <input
                                type="date"
                                value={dataInicio}
                                onChange={(e) => setDataInicio(e.target.value)}
                                className="w-full text-sm rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500 py-2"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 uppercase">
                                <Calendar size={12} /> Fim
                            </label>
                            <input
                                type="date"
                                value={dataFim}
                                onChange={(e) => setDataFim(e.target.value)}
                                className="w-full text-sm rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500 py-2"
                            />
                        </div>
                    </>
                }
            />

            {loading ? (
                <TableSkeleton rows={8} columns={6} />
            ) : sortedReceipts.length === 0 ? (
                <EmptyState title="Nenhum registro encontrado" description="Você não possui recebimentos com os filtros ativos." icon={Receipt} />
            ) : (
                <>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th
                                            className="px-2.5 py-4 text-[10px] font-bold text-slate-600 uppercase transition-colors whitespace-nowrap cursor-pointer hover:bg-slate-100"
                                            onClick={() => handleSort('nota_fiscal')}
                                        >
                                            <div className="flex items-center gap-2">
                                                NF <SortIcon field="nota_fiscal" />
                                            </div>
                                        </th>
                                        <th
                                            className="px-4 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
                                            onClick={() => handleSort('fornecedor')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Fornecedor <SortIcon field="fornecedor" />
                                            </div>
                                        </th>
                                        <th className="px-2.5 py-4 text-[10px] font-bold text-slate-600 uppercase whitespace-nowrap">Local</th>
                                        <th
                                            className="px-4 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
                                            onClick={() => handleSort('responsavel')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Responsável <SortIcon field="responsavel" />
                                            </div>
                                        </th>
                                        <th
                                            className="px-4 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
                                            onClick={() => handleSort('valor')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Valor <SortIcon field="valor" />
                                            </div>
                                        </th>
                                        <th
                                            className="px-4 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
                                            onClick={() => handleSort('created_at')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Registro <SortIcon field="created_at" />
                                            </div>
                                        </th>
                                        <th
                                            className="px-4 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
                                            onClick={() => handleSort('data_recebimento')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Recebido <SortIcon field="data_recebimento" />
                                            </div>
                                        </th>
                                        <th
                                            className="px-4 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
                                            onClick={() => handleSort('data_emissao')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Emissão <SortIcon field="data_emissao" />
                                            </div>
                                        </th>
                                        <th
                                            className="px-4 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
                                            onClick={() => handleSort('fazenda')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Fazenda <SortIcon field="fazenda" />
                                            </div>
                                        </th>
                                        <th className="px-2.5 py-4 text-right text-[10px] font-bold text-slate-600 uppercase whitespace-nowrap w-[60px]">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {sortedReceipts.map((r) => (
                                        <tr 
                                            key={r.id} 
                                            className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                                            onClick={() => {
                                                setSelectedReceipt(r);
                                                setIsDetailsModalOpen(true);
                                            }}
                                        >
                                            <td className="px-2.5 py-4">
                                                <div className="text-sm font-mono font-medium text-slate-500">#{r.nota_fiscal}</div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0 text-[10px]">
                                                        <Building2 size={12} />
                                                    </div>
                                                    <span className="text-slate-700 font-medium truncate max-w-[120px] text-sm uppercase" title={r.fornecedor}>{r.fornecedor}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="text-sm font-bold text-slate-700 max-w-[100px] truncate uppercase">
                                                    {r.local_recebimento === 'outros' ? r.local_recebimento_outros : r.local_recebimento}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2 text-sm text-slate-600 max-w-[150px] truncate">
                                                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase shrink-0">
                                                        {(r.responsavel || 'U').charAt(0)}
                                                    </div>
                                                    <span className="truncate max-w-[100px] font-medium uppercase" title={r.responsavel}>{r.responsavel}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-slate-700 font-black whitespace-nowrap text-sm">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.valor)}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col text-xs font-mono leading-tight">
                                                    <span className="text-slate-500 font-medium">{format(new Date(r.created_at), 'dd/MM/yyyy')}</span>
                                                    <span className="text-slate-400 text-[10px]">{format(new Date(r.created_at), 'HH:mm')}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-[12px] font-mono font-medium text-slate-500 uppercase whitespace-nowrap">
                                                    {r.data_recebimento && !r.data_recebimento.includes('-') && r.data_recebimento !== 'Não informada' 
                                                        ? r.data_recebimento 
                                                        : (r.data_recebimento && r.data_recebimento !== 'Não informada' 
                                                            ? format(new Date(r.data_recebimento), 'dd/MM/yyyy') 
                                                            : '-')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-[12px] font-mono font-medium text-slate-500 uppercase whitespace-nowrap">
                                                    {format(new Date(r.data_emissao), 'dd/MM/yyyy')}
                                                </span>
                                            </td>
                                            <td className="px-2.5 py-4 max-w-[120px]">
                                                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700 truncate">
                                                    <MapPin size={13} className="text-slate-400 shrink-0" />
                                                    <span className="truncate" title={r.fazenda?.nome}>{r.fazenda?.nome || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(r.id);
                                                        }}
                                                        className="p-2 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm active:scale-95"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-500 px-6 mt-4">
                        <span>
                            Mostrando {sortedReceipts.length} de {receipts.length} registro(s)
                        </span>
                    </div>
                </>
            )}
            </>
            )}

            {activeTab === 'dashboard' && (
                <DirectReceiptDashboard />
            )}

            <DirectReceiptFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                fazendas={fazendas}
            />

            {isEmailModalOpen && (
                <DirectReceiptEmailSettingsModal onClose={() => setIsEmailModalOpen(false)} />
            )}

            {isTutorialOpen && (
                <DirectReceiptTutorialModal 
                    isOpen={isTutorialOpen} 
                    onClose={() => setIsTutorialOpen(false)} 
                />
            )}

            {isDetailsModalOpen && selectedReceipt && (
                <DirectReceiptDetailsModal
                    isOpen={isDetailsModalOpen}
                    onClose={() => {
                        setIsDetailsModalOpen(false);
                        setSelectedReceipt(null);
                    }}
                    receipt={selectedReceipt}
                />
            )}
        </div>
    );
}
