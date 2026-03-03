
import React, { useState, useEffect, useMemo } from 'react';
import { auditService, AuditResponse, AuditItem } from '../services/auditService';
import { useAuth } from '../context/AuthContext';
import { format, parseISO, subDays } from 'date-fns';
import {
    CheckCircle,
    AlertTriangle,
    XCircle,
    Droplet,
    Info,
    CircleHelp,
    Scale,
    AlertOctagon,
    Search,
    FilterX,
    ShieldCheck
} from 'lucide-react';
import { clsx } from 'clsx';

import { AuditDetailsModal } from '../components/AuditDetailsModal';
import { ReceiptGuideModal } from '../components/ReceiptGuideModal'; // Added Import
import { PageHeader } from '../components/ui/PageHeader';
import { FilterBar } from '../components/ui/FilterBar';

import { TableSkeleton } from '../components/ui/TableSkeleton';
import { StatsSkeleton } from '../components/ui/StatsSkeleton';

export function AuditReceipt() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AuditResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<AuditItem | null>(null);
    const [isGuideOpen, setIsGuideOpen] = useState(false);

    const { user, role, hasPermission } = useAuth();

    // Filters
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [conformityFilter, setConformityFilter] = useState('ALL');
    const [farmFilter, setFarmFilter] = useState('ALL');
    const [fuelFilter, setFuelFilter] = useState('ALL');
    const [supplierFilter, setSupplierFilter] = useState('ALL');

    // Initialize Farm Filter based on User Context
    useEffect(() => {
        if (user?.fazenda?.nome) {
            setFarmFilter(user.fazenda.nome);
        }
    }, [user]);

    // Derived State: Core Filtered Data (Context Filters: Date, Farm, Search, Status, Conformity)
    // This is used as the source for the Dropdown Options (Fuels, Suppliers) so they don't filter themselves out.
    const coreFilteredItems = useMemo(() => {
        if (!data) return [];
        return data.data.filter(item => {
            // Permission Check: Enforce Farm Restriction if user has one
            if (user?.fazenda?.nome && !item.unit_id?.includes(user.fazenda.nome)) {
                return false;
            }

            // 1. Date Range
            const itemDate = item.date ? parseISO(item.date) : null;
            if (itemDate) {
                const start = parseISO(startDate);
                const end = parseISO(endDate);
                // Set hours to compare strictly by day
                end.setHours(23, 59, 59, 999);
                if (itemDate < start || itemDate > end) return false;
            }

            // 2. Search Term (NF or Unit)
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                const nf = item.invoiceNumber?.toLowerCase() || '';
                const unit = item.unit_id?.toLowerCase() || '';
                if (!nf.includes(searchLower) && !unit.includes(searchLower)) return false;
            }

            // 3. Status
            if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;

            // 4. Conformity
            if (conformityFilter !== 'ALL' && item.conformity !== conformityFilter) return false;

            // 5. Farm (Unit)
            if (farmFilter !== 'ALL') {
                if (item.farm_name) {
                    if (item.farm_name !== farmFilter) return false;
                } else {
                    if (!item.unit_id?.includes(farmFilter)) return false;
                }
            }

            return true;
        });
    }, [data, startDate, endDate, searchTerm, statusFilter, conformityFilter, farmFilter, user]);

    // Derived State: Final Filtered Items (Applying Specific Filters: Fuel, Supplier)
    const filteredItems = useMemo(() => {
        return coreFilteredItems.filter(item => {
            // 6. Fuel Type
            if (fuelFilter !== 'ALL' && item.fuel_name !== fuelFilter) return false;

            // 7. Supplier
            if (supplierFilter !== 'ALL') {
                if (!item.analysis?.supplier_name || item.analysis.supplier_name !== supplierFilter) {
                    return false;
                }
            }
            return true;
        });
    }, [coreFilteredItems, fuelFilter, supplierFilter]);


    // Derived State: Unique Farms (Always based on full data or user permission, independent of other filters)
    const uniqueFarms = useMemo(() => {
        if (!data) return [];
        if (user?.fazenda?.nome) return [user.fazenda.nome];

        const farms = new Set<string>();
        data.data.forEach(i => {
            if (i.farm_name) {
                farms.add(i.farm_name);
            } else if (i.unit_id) {
                let cleanName = i.unit_id.replace(/^\[.*?\]\s*/, '').trim();
                const parts = cleanName.split(' - ');
                farms.add(parts.length > 0 ? parts[0].trim() : cleanName);
            }
        });
        return Array.from(farms).sort();
    }, [data, user]);

    // Derived State: Unique Fuels (Context-Aware: based on Core Filters)
    const uniqueFuels = useMemo(() => {
        const fuels = new Set<string>();
        coreFilteredItems.forEach(i => {
            if (i.fuel_name) fuels.add(i.fuel_name);
        });
        return Array.from(fuels).sort();
    }, [coreFilteredItems]);

    // Derived State: Unique Suppliers (Context-Aware: based on Core Filters)
    const uniqueSuppliers = useMemo(() => {
        const suppliers = new Set<string>();
        coreFilteredItems.forEach(i => {
            if (i.analysis?.supplier_name) suppliers.add(i.analysis.supplier_name);
        });
        return Array.from(suppliers).sort();
    }, [coreFilteredItems]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const result = await auditService.getAuditData();
            setData(result);

            // Clear filters on reload
            setSearchTerm('');
            setFuelFilter('ALL');
            setSupplierFilter('ALL');
        } catch (err: any) {
            setError(err.message || 'Falha ao carregar dados de auditoria.');
        } finally {
            setLoading(false);
        }
    };

    // Derived State: Stats based on Filtered Items
    const derivedStats = useMemo(() => {
        if (!filteredItems.length) {
            return {
                totalVolume: 0,
                analysisCoverage: 0,
                totalAnalyzed: 0,
                totalDifference: 0
            };
        }

        const totalVolume = filteredItems.reduce((acc, item) => acc + item.volume, 0);
        const totalDifference = filteredItems.reduce((acc, item) => acc + item.difference, 0);
        const totalAnalyzed = filteredItems.filter(item => item.status === 'ANALYZED').length;
        const analysisCoverage = (totalAnalyzed / filteredItems.length) * 100;

        return {
            totalVolume,
            analysisCoverage,
            totalAnalyzed,
            totalDifference
        };
    }, [filteredItems]);

    if (!hasPermission('gestao_auditoria')) {
        return (
            <div className="p-8 text-center">
                <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-xl p-6">
                    <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-800 mb-2">Acesso Negado</h2>
                    <p className="text-red-600">Você não tem permissão para acessar a Auditoria de Recebimento.</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-500">
                <h2 className="text-xl font-bold mb-2">Erro</h2>
                <p>{error}</p>
                <button
                    onClick={loadData}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Tentar Novamente
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            <PageHeader
                title="Auditoria de Recebimento"
                subtitle="Confronto entre NFs de Entrada e Análises Técnicas (Nuntec)"
                icon={ShieldCheck}
            >
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsGuideOpen(true)}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                        title="Guia de Procedimento"
                    >
                        <CircleHelp size={24} />
                    </button>

                    {data?.isSystemMock ? (
                        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-sm">
                            <Info size={18} />
                            <span className="font-medium">Modo Simulação</span>
                        </div>
                    ) : (data && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-sm">
                            <CheckCircle size={18} />
                            <span className="font-medium">Conectado</span>
                        </div>
                    ))}
                </div>
            </PageHeader>

            {loading ? (
                <>
                    <StatsSkeleton count={3} />
                    <TableSkeleton rows={6} columns={8} />
                </>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-in fade-in duration-300">
                        <KPICard
                            title="Volume Total Recebido"
                            value={`${derivedStats.totalVolume.toLocaleString('pt-BR')} L`}
                            icon={<Droplet className="text-blue-600" size={24} />}
                            subtext="Baseado nas Notas Fiscais (Filtro Atual)"
                        />
                        <KPICard
                            title="% Com Análise Vinculada"
                            value={`${derivedStats.analysisCoverage.toFixed(1)}%`}
                            icon={<Scale className={derivedStats.analysisCoverage < 90 ? "text-yellow-600" : "text-green-600"} size={24} />}
                            subtext={`${derivedStats.totalAnalyzed} análises encontradas`}
                        />
                        <KPICard
                            title="Volume Acumulado de Quebra"
                            value={`${derivedStats.totalDifference.toLocaleString('pt-BR')} L`}
                            icon={<AlertOctagon className={derivedStats.totalDifference < -100 ? "text-red-600" : "text-slate-600"} size={24} />}
                            subtext="Diferença total (Físico vs NF)"
                            status={derivedStats.totalDifference < 0 ? 'negative' : 'neutral'}
                        />
                    </div>

                    {/* Filter Bar */}
                    <FilterBar
                        onSearch={setSearchTerm}
                        searchValue={searchTerm}
                        searchPlaceholder="Buscar por NF ou Fazenda..."
                        onClear={() => {
                            setSearchTerm('');
                            setStatusFilter('ALL');
                            setConformityFilter('ALL');
                            setFarmFilter('ALL');
                            setFuelFilter('ALL');
                            setSupplierFilter('ALL');
                            setStartDate(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
                            setEndDate(format(new Date(), 'yyyy-MM-dd'));
                        }}
                        hasActiveFilters={
                            searchTerm !== '' ||
                            statusFilter !== 'ALL' ||
                            conformityFilter !== 'ALL' ||
                            farmFilter !== 'ALL' ||
                            fuelFilter !== 'ALL' ||
                            supplierFilter !== 'ALL'
                        }
                        advancedFilters={
                            <>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                                        Período (Início)
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full text-sm rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500 shadow-sm py-2"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                                        Período (Fim)
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full text-sm rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500 shadow-sm py-2"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                                        Status
                                    </label>
                                    <select
                                        className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                    >
                                        <option value="ALL">Todos</option>
                                        <option value="ANALYZED">Com Análise</option>
                                        <option value="MISSING_ANALYSIS">Análise Pendente (Tem Entrada)</option>
                                        <option value="MISSING_ENTRY">Entrada Pendente (Tem Análise)</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                                        Conformidade
                                    </label>
                                    <select
                                        className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                                        value={conformityFilter}
                                        onChange={(e) => setConformityFilter(e.target.value)}
                                    >
                                        <option value="ALL">Todas</option>
                                        <option value="conforming">Conforme</option>
                                        <option value="non_conforming">Não Conforme</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                                        Fazenda
                                    </label>
                                    <select
                                        className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                                        value={farmFilter}
                                        onChange={(e) => setFarmFilter(e.target.value)}
                                    >
                                        <option value="ALL">Todas</option>
                                        {uniqueFarms.map(farm => (
                                            <option key={farm} value={farm}>{farm}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                                        Combustível
                                    </label>
                                    <select
                                        className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                                        value={fuelFilter}
                                        onChange={(e) => setFuelFilter(e.target.value)}
                                    >
                                        <option value="ALL">Todos</option>
                                        {uniqueFuels.map(fuel => (
                                            <option key={fuel} value={fuel}>{fuel}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                                        Fornecedor
                                    </label>
                                    <select
                                        className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                                        value={supplierFilter}
                                        onChange={(e) => setSupplierFilter(e.target.value)}
                                    >
                                        <option value="ALL">Todos</option>
                                        {uniqueSuppliers.map(sup => (
                                            <option key={sup} value={sup}>{sup}</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        }
                    />

                    {/* Audit Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                            <h2 className="font-semibold text-slate-800">Detalhamento das Entradas</h2>
                            <span className="text-xs font-bold text-slate-500 uppercase bg-slate-200 px-2 py-1 rounded-md">
                                {filteredItems.length} Registros
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">NF</th>
                                        <th className="px-4 py-3">Data/Hora</th>
                                        <th className="px-4 py-3">Unidade (Fazenda)</th>
                                        <th className="px-4 py-3 text-right">Volume NF (L)</th>
                                        <th className="px-4 py-3 text-right">Diferença (L)</th>
                                        <th className="px-4 py-3 text-right">Diff %</th>
                                        <th className="px-4 py-3">Conformidade Técnica</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredItems.length > 0 ? (
                                        filteredItems.map((item) => (
                                            <AuditRow
                                                key={item.id}
                                                item={item}
                                                onClick={() => setSelectedItem(item)}
                                            />
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={8} className="py-12 text-center text-slate-400">
                                                <div className="flex flex-col items-center gap-2">
                                                    <FilterX size={32} className="opacity-20" />
                                                    <p>Nenhum registro encontrado com os filtros atuais.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            <AuditDetailsModal
                isOpen={!!selectedItem}
                onClose={() => setSelectedItem(null)}
                data={selectedItem}
            />

            <ReceiptGuideModal
                isOpen={isGuideOpen}
                onClose={() => setIsGuideOpen(false)}
            />
        </div>
    );
}

// Sub-components

function KPICard({ title, value, icon, subtext, status = 'neutral' }: { title: string; value: string; icon: React.ReactNode; subtext: string; status?: 'neutral' | 'negative' }) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                <h3 className={clsx("text-2xl font-bold", status === 'negative' ? 'text-red-600' : 'text-slate-800')}>{value}</h3>
                <p className="text-xs text-slate-400 mt-2">{subtext}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">{icon}</div>
        </div>
    );
}

function AuditRow({ item, onClick }: { item: AuditItem, onClick: () => void }) {
    const isHighDiff = Math.abs(item.differencePercent) > 0.5;
    const isNonConforming = item.conformity === 'non_conforming';
    const isproblematic = isHighDiff || isNonConforming;

    return (
        <tr
            onClick={onClick}
            className={clsx(
                "hover:bg-slate-50 transition-colors cursor-pointer",
                isproblematic && "bg-red-50 hover:bg-red-100"
            )}
        >
            <td className="px-4 py-3">
                <StatusIcon status={item.status} conformity={item.conformity} />
            </td>
            <td className="px-4 py-3 font-medium text-slate-700">{item.invoiceNumber}</td>
            <td className="px-4 py-3 text-slate-500">
                {new Date(item.date).toLocaleString('pt-BR')}
            </td>
            <td className="px-4 py-3">
                <div className="flex flex-col">
                    <span className="font-semibold text-slate-700">{item.farm_name || item.unit_id}</span>
                    {item.station_name && (
                        <span className="text-xs text-slate-500">{item.station_name}</span>
                    )}
                </div>
            </td>
            <td className="px-4 py-3 text-right font-medium">{item.volume.toLocaleString('pt-BR')}</td>
            <td className={clsx("px-4 py-3 text-right font-bold", item.difference < 0 ? "text-red-600" : "text-green-600")}>
                {item.difference.toLocaleString('pt-BR')}
            </td>
            <td className={clsx("px-4 py-3 text-right", isHighDiff ? "text-red-600 font-bold" : "text-slate-500")}>
                {item.differencePercent.toFixed(2)}%
            </td>
            <td className="px-4 py-3">
                <ConformityBadge status={item.conformity} details={item.analysis} />
            </td>
        </tr>
    );
}

function StatusIcon({ status, conformity }: { status: string; conformity: string }) {
    if (status === 'MISSING_ENTRY') return <span title="Entrada Pendente"><CircleHelp className="text-blue-500" size={20} /></span>;
    if (status === 'MISSING_ANALYSIS') return <span title="Análise Pendente"><AlertTriangle className="text-yellow-500" size={20} /></span>;
    if (conformity === 'non_conforming') return <span title="Não Conforme"><XCircle className="text-red-500" size={20} /></span>;
    return <span title="Conforme"><CheckCircle className="text-green-500" size={20} /></span>;
}

function ConformityBadge({ status, details }: { status: string; details: any }) {
    if (!details || status === 'unknown') return <span className="text-xs text-slate-400">Dados Indisponíveis</span>;

    if (status === 'non_conforming') {
        return (
            <div className="flex flex-col text-xs text-red-600">
                <span className="font-bold">NÃO CONFORME</span>
                <span>Dens: {details.density}</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col text-xs text-slate-500">
            <span className="text-green-600 font-medium">CONFORME</span>
            <span className="scale-90 origin-left">Dens: {details.density} | Temp: {details.temperature}°C</span>
        </div>
    );
}
