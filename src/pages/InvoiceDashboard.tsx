import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoiceService } from '../services/invoiceService';
import { InvoiceKPIs, PendingInvoice } from '../types/invoiceTypes';
import StatsCard from '../components/ui/StatsCard';
import { StatsSkeleton } from '../components/ui/StatsSkeleton';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { PageHeader } from '../components/ui/PageHeader';
import { AlertTriangle, Clock, FileText, CheckCircle, Plus, Search, RefreshCw, History, Building2, Paperclip, Settings, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UnisystemSimulatorModal } from './UnisystemSimulatorModal';
import { InvoiceRegistrationModal } from '../components/invoices/InvoiceRegistrationModal';
import { EmailSettingsModal } from '../components/invoices/EmailSettingsModal';
import { FilterBar } from '../components/ui/FilterBar';
import { formatCurrency } from '../utils/formatUtils';
import { parseISO, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';
import { Calendar } from 'lucide-react';

type TabType = 'pending' | 'history';

export const InvoiceDashboard = () => {
    const { user, role, hasPermission, checkAccess } = useAuth();
    const isAdmin = role?.nome === 'Administrador' || (user as any)?.funcao === 'Administrador';
    const canEdit = checkAccess({ module: 'gestao_nfs', action: 'edit' });
    const viewScope = role?.permissoes?.gestao_nfs?.view_scope || 'NONE';
    const canViewAll = isAdmin || viewScope === 'ALL';
    const [kpis, setKpis] = useState<InvoiceKPIs | null>(null);
    const [invoices, setInvoices] = useState<PendingInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showSimulator, setShowSimulator] = useState(false);
    const [showRegistration, setShowRegistration] = useState(false);
    const [showEmailSettings, setShowEmailSettings] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('pending');

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [filterFarm, setFilterFarm] = useState('');

    const filteredInvoices = invoices.filter(inv => {
        // Status is already filtered by API/Tab

        // Search
        if (searchTerm) {
            const s = searchTerm.toLowerCase();
            const matchesNumber = inv.invoice_number.toLowerCase().includes(s);
            const matchesSupplier = inv.supplier_name.toLowerCase().includes(s);
            const matchesCNPJ = inv.supplier_cnpj?.includes(s);
            const matchesFarm = inv.farm?.nome.toLowerCase().includes(s);

            if (!matchesNumber && !matchesSupplier && !matchesCNPJ && !matchesFarm) return false;
        }

        // Date Range (Issue Date)
        if (filterStartDate || filterEndDate) {
            const date = parseISO(inv.issue_date);
            if (filterStartDate && isBefore(date, startOfDay(parseISO(filterStartDate)))) return false;
            if (filterEndDate && isAfter(date, endOfDay(parseISO(filterEndDate)))) return false;
        }

        // Farm Filter
        if (filterFarm && !inv.farm?.nome.toLowerCase().includes(filterFarm.toLowerCase())) {
            return false;
        }

        return true;
    });


    const fetchData = async () => {
        try {
            const status = activeTab === 'pending' ? 'Pendente' : 'Conciliada';

            const targetFarmId = canViewAll ? undefined : user?.fazenda_id;

            // Se estiver no histórico, não precisa de KPIs toda hora, mas mal não faz
            const [kpiData, listData] = await Promise.all([
                invoiceService.getKPIs(targetFarmId),
                invoiceService.getInvoices(targetFarmId, status)
            ]);
            setKpis(kpiData);
            setInvoices(listData);
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user, activeTab]);

    const handleManualResolve = async (id: string) => {
        if (confirm("Deseja marcar esta nota como conciliada manualmente?")) {
            try {
                await invoiceService.updateStatus(id, 'Conciliada');
                fetchData(); // Refresh
            } catch (e) {
                alert("Erro ao atualizar status");
            }
        }
    }

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    }

    if (!hasPermission('gestao_nfs')) {
        return (
            <div className="p-8 text-center max-w-7xl mx-auto">
                <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-xl p-8 shadow-sm">
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-800 mb-2">Acesso Restrito</h2>
                    <p className="text-red-600">Você não tem permissão para visualizar o Painel de NFs. Contate um administrador.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[95vw] mx-auto animate-fadeIn space-y-6">

            {/* Header */}
            <PageHeader
                title="Painel de NFs"
                subtitle="Monitoramento de notas recebidas na fazenda aguardando lançamento fiscal."
                icon={ClipboardList}
            >
                {canEdit && (
                    <button
                        onClick={() => setShowSimulator(true)}
                        className="px-3 py-2 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg text-sm font-medium border border-purple-200"
                    >
                        Simular Unisystem
                    </button>
                )}
                <button
                    onClick={handleRefresh}
                    className={`p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-all ${refreshing ? 'animate-spin' : ''}`}
                    title="Atualizar dados"
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
                {canEdit && (
                    <button
                        onClick={() => setShowRegistration(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Registro
                    </button>
                )}
                {(isAdmin || role?.permissoes?.gestao_nfs?.manage_notifications) && (
                    <button
                        onClick={() => setShowEmailSettings(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-semibold shadow-sm"
                        title="Configurar Notificações"
                    >
                        <Settings className="w-5 h-5 text-slate-400" />
                        <span className="hidden sm:inline">Notificações</span>
                    </button>
                )}
            </PageHeader>

            <UnisystemSimulatorModal
                isOpen={showSimulator}
                onClose={() => setShowSimulator(false)}
                pendingInvoices={invoices.filter(i => i.status === 'Pendente')}
                onSuccess={handleRefresh}
            />

            <InvoiceRegistrationModal
                isOpen={showRegistration}
                onClose={() => setShowRegistration(false)}
                onSuccess={handleRefresh}
            />

            {showEmailSettings && (
                <EmailSettingsModal onClose={() => setShowEmailSettings(false)} />
            )}

            {loading ? (
                <div className="space-y-6">
                    <StatsSkeleton count={3} />
                    <TableSkeleton rows={10} columns={6} />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatsCard
                            title="NFs Pendentes"
                            value={activeTab === 'pending' ? kpis?.pending_count || filteredInvoices.length : filteredInvoices.length}
                            icon={FileText}
                            description="notas listadas"
                            variant="blue"
                            className="ring-2 ring-blue-200"
                        />
                        <StatsCard
                            title="Atraso Médio"
                            value={`${kpis?.avg_delay_days || 0} dias`}
                            icon={Clock}
                            description="média desde a chegada na fazenda"
                            variant="orange"
                            className="ring-2 ring-orange-200"
                        />
                        <StatsCard
                            title="Data Mais Antiga"
                            value={kpis?.oldest_pending_date ? new Date(kpis.oldest_pending_date).toLocaleDateString() : '-'}
                            icon={AlertTriangle}
                            description="atenção a este item"
                            variant="red"
                            className="ring-2 ring-red-200"
                        />
                    </div>

                    {/* Tabs e Lista */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

                        {/* Tabs */}
                        <div className="flex border-b border-gray-200">
                            <button
                                onClick={() => setActiveTab('pending')}
                                className={`flex-1 py-4 text-center font-medium text-sm border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'pending' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <AlertTriangle className="w-4 h-4" />
                                Pendentes de Lançamento
                                <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs">{kpis?.pending_count}</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`flex-1 py-4 text-center font-medium text-sm border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'history' ? 'border-green-600 text-green-600 bg-green-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <History className="w-4 h-4" />
                                Histórico / Conciliadas
                            </button>
                        </div>

                        <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                                    {activeTab === 'pending' ? 'Itens Aguardando' : 'Últimos Lançamentos'}
                                </h3>
                                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
                                    {filteredInvoices.length} registros exibidos
                                </span>
                            </div>

                            <FilterBar
                                onSearch={setSearchTerm}
                                searchValue={searchTerm}
                                searchPlaceholder="Buscar NF, Fornecedor, CNPJ..."
                                onClear={() => {
                                    setSearchTerm('');
                                    setFilterStartDate('');
                                    setFilterEndDate('');
                                    setFilterFarm('');
                                }}
                                hasActiveFilters={!!searchTerm || !!filterStartDate || !!filterEndDate || !!filterFarm}
                                advancedFilters={
                                    <>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                                                <Calendar size={12} /> Emissão Inicial
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
                                                <Calendar size={12} /> Emissão Final
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
                                                <Building2 size={12} /> Fazenda
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full text-sm rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500 shadow-sm py-2 px-3"
                                                placeholder="Nome da fazenda..."
                                                value={filterFarm}
                                                onChange={(e) => setFilterFarm(e.target.value)}
                                            />
                                        </div>
                                    </>
                                }
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3">Número NF</th>
                                        <th className="px-6 py-3">Fornecedor</th>
                                        <th className="px-6 py-3">Fazenda</th>
                                        <th className="px-6 py-3">Datas (Emissão / Chegada)</th>
                                        <th className="px-6 py-3">Status / Arquivo</th>
                                        <th className="px-6 py-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredInvoices.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-100" />
                                                <p className="font-medium text-gray-600">
                                                    {activeTab === 'pending' ? 'Tudo em dia! Nenhuma pendência.' : 'Nenhum histórico encontrado.'}
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredInvoices.map((inv) => {
                                            const daysDelayed = Math.floor((new Date().getTime() - new Date(inv.delivery_date).getTime()) / (1000 * 3600 * 24));
                                            return (
                                                <tr key={inv.id} className="hover:bg-gray-50 transition-colors group">
                                                    <td className="px-6 py-3 font-medium text-gray-900">
                                                        {inv.invoice_number}
                                                        {inv.amount && (
                                                            <div className="text-xs text-slate-500 font-normal">
                                                                {formatCurrency(inv.amount)}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-3 text-gray-600">
                                                        {inv.supplier_name}
                                                        {inv.supplier_cnpj && <div className="text-xs text-gray-400">{inv.supplier_cnpj}</div>}
                                                    </td>
                                                    <td className="px-6 py-3 text-gray-600">
                                                        <div className="flex items-center gap-1">
                                                            <Building2 className="w-3 h-3 text-gray-400" />
                                                            {inv.farm?.nome || '-'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 text-gray-500">
                                                        <div className="flex flex-col">
                                                            <span>E: {new Date(inv.issue_date).toLocaleDateString()}</span>
                                                            <span className="font-medium text-gray-700">C: {new Date(inv.delivery_date).toLocaleDateString()}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <div className="flex flex-col gap-1 items-start">
                                                            {activeTab === 'pending' ? (
                                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${daysDelayed > 5 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                                    {daysDelayed} dias atraso
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                                                    Conciliada
                                                                </span>
                                                            )}

                                                            {inv.file_url && (
                                                                <a href={inv.file_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                                                    <Paperclip className="w-3 h-3" /> Ver Anexo
                                                                </a>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        {activeTab === 'pending' && (
                                                            <button
                                                                onClick={() => handleManualResolve(inv.id)}
                                                                className="text-blue-600 hover:text-blue-800 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                Conciliar Manual
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
