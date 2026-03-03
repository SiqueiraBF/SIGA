import React, { useMemo, useState, useEffect } from 'react';
import {
    ShieldCheck,
    AlertTriangle,
    UserX,
    Activity,
    Search,
    Building2,
    Filter,
    Droplet,
    BarChart3,
    PieChart as PieChartIcon,
    List
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { Abastecimento, Fazenda, Posto } from '../../types';

interface ComplianceDashboardProps {
    abastecimentos: Abastecimento[];
    fazendas: Fazenda[];
    postos: Posto[];
    userFazendaId?: string;
    canViewAllFarms: boolean;
}

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#06b6d4', '#6366f1'];

export function ComplianceDashboard({
    abastecimentos,
    fazendas,
    postos,
    userFazendaId,
    canViewAllFarms,
    startDate,
    endDate
}: ComplianceDashboardProps & { startDate: string, endDate: string }) {

    const [selectedFazendaId, setSelectedFazendaId] = useState<string>('ALL');
    const [activeFilter, setActiveFilter] = useState<{ type: 'FARM' | 'REASON' | 'OPERATOR' | 'VEHICLE' | 'ALL', value: string } | null>(null);

    // 1. Filter Data based on Scope
    const filteredData = useMemo(() => {
        let data = abastecimentos;

        // Filter by Farm Permission first
        if (!canViewAllFarms && userFazendaId) {
            data = data.filter(a => a.fazenda_id === userFazendaId);
        }
        // Filter by Selected Farm Dropdown
        else if (selectedFazendaId !== 'ALL') {
            data = data.filter(a => a.fazenda_id === selectedFazendaId);
        }

        return data;
    }, [abastecimentos, selectedFazendaId, userFazendaId, canViewAllFarms]);


    const [rawNuntecData, setRawNuntecData] = useState<any[]>([]);
    const [loadingNuntec, setLoadingNuntec] = useState(false);

    // 2. Calculate KPIs
    const stats = useMemo(() => {
        const total = filteredData.length;
        // 1. Total Volume
        const totalVolume = filteredData.reduce((acc, curr) => acc + curr.volume, 0);

        if (total === 0) return {
            totalVolume: 0,
            managerModeCount: 0,
            managerModeVolume: 0,
            managerModePct: 0,
            barChartData: [],
            pieChartData: [],
            operatorRanking: [],
            vehicleRanking: [],
            total: 0
        };

        const managerMode = filteredData.filter(a => a.is_manager_mode);

        const managerModeVolume = managerMode.reduce((acc, curr) => acc + curr.volume, 0);
        const managerModePct = totalVolume > 0 ? (managerModeVolume / totalVolume) * 100 : 0;

        // 3. Bar Chart Data (By Farm) - Stacked (Now using Nuntec for Total/Normal)
        const farmMap = new Map<string, { name: string, Normal: number, Gerente: number }>();
        const reservoirMap = new Map<string, string>();

        // Build Reservoir -> Farm Name map
        postos.forEach(p => {
            if (p.nuntec_reservoir_id) {
                const farm = fazendas.find(f => f.id === p.fazenda_id);
                reservoirMap.set(String(p.nuntec_reservoir_id), farm?.nome || 'N/A');
            }
        });

        // 3a. Sum Nuntec Volumes (Base for Total)
        if (rawNuntecData && rawNuntecData.length > 0) {
            rawNuntecData.forEach(c => {
                const resId = String(c['reservoir-id']);
                const farmName = reservoirMap.get(resId);
                if (farmName) {
                    // Check if this farm is visible/selected
                    if ((!canViewAllFarms && userFazendaId && farmName !== fazendas.find(f => f.id === userFazendaId)?.nome) ||
                        (canViewAllFarms && selectedFazendaId !== 'ALL' && farmName !== fazendas.find(f => f.id === selectedFazendaId)?.nome)) {
                        return;
                    }

                    if (!farmMap.has(farmName)) {
                        farmMap.set(farmName, { name: farmName, Normal: 0, Gerente: 0 });
                    }
                    // Removed: farmMap.get(farmName)!.Normal += c.amount; // Start with everything in Normal (we subtract Manager later)
                }
            });
        }

        // 3b. Process Local Data (Manager Mode) and adjust Normal
        filteredData.forEach(a => {
            const farmName = a.fazenda?.nome || 'N/A';
            if (!farmMap.has(farmName)) {
                // If Nuntec data missing for this farm, create entry (will be 100% Manager)
                farmMap.set(farmName, { name: farmName, Normal: 0, Gerente: 0 });
            }
            const entry = farmMap.get(farmName)!;

            if (a.is_manager_mode) {
                entry.Gerente += a.volume;
                // No subtraction needed as we only show Manager mode
            } else {
                // For now, local non-manager doesn't add to Normal if we rely on Nuntec for Total. 
                // But if Nuntec is missing, we might want to keep it? 
                // Let's assume Nuntec is the source of truth for volume.
            }
        });

        const barChartData = Array.from(farmMap.values());

        // 4. Pie Chart Data (Reasons)
        const reasonMap = new Map<string, number>();
        managerMode.forEach(a => {
            const reason = a.manager_mode_reason || 'NÃO_INFORMADO';
            reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1);
        });
        const pieChartData = Array.from(reasonMap.entries())
            .map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))
            .sort((a, b) => b.value - a.value);

        // 5. Operator Ranking (Manager Mode)
        const operatorMap = new Map<string, number>();
        managerMode.forEach(a => {
            const op = a.operador || 'Desconhecido';
            operatorMap.set(op, (operatorMap.get(op) || 0) + 1);
        });
        const operatorRanking = Array.from(operatorMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10


        // 6. Vehicle Ranking (Manager Mode)
        const vehicleMap = new Map<string, number>();
        managerMode.forEach(a => {
            const v = a.veiculo_nome || 'Desconhecido';
            vehicleMap.set(v, (vehicleMap.get(v) || 0) + 1);
        });
        const vehicleRanking = Array.from(vehicleMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return {
            totalVolume,
            managerModeCount: managerMode.length,
            managerModeVolume,
            managerModePct,
            barChartData,
            pieChartData,
            operatorRanking,
            vehicleRanking,
            total
        };
    }, [filteredData, rawNuntecData, postos, fazendas, userFazendaId, selectedFazendaId, canViewAllFarms]);

    // 3. Detailed List for Table (Interactive)
    const detailedList = useMemo(() => {
        // Base: Only Manager Mode for now as per "auditoria" focus on exceptions
        let data = filteredData.filter(a => a.is_manager_mode);

        if (activeFilter && activeFilter.type !== 'ALL') {
            const val = activeFilter.value;
            switch (activeFilter.type) {
                case 'FARM':
                    data = data.filter(a => a.fazenda?.nome === val);
                    break;
                case 'REASON':
                    data = data.filter(a => (a.manager_mode_reason || 'NÃO_INFORMADO').replace(/_/g, ' ') === val);
                    break;
                case 'OPERATOR':
                    data = data.filter(a => a.operador === val);
                    break;
                case 'VEHICLE':
                    data = data.filter(a => a.veiculo_nome === val);
                    break;
            }
        }
        return data.sort((a, b) => new Date(b.data_abastecimento).getTime() - new Date(a.data_abastecimento).getTime());
    }, [filteredData, activeFilter]);

    // Available Farms for Dropdown (if admin)
    const availableFazendas = useMemo(() => {
        if (!canViewAllFarms && userFazendaId) {
            return fazendas.filter(f => f.id === userFazendaId);
        }
        return fazendas;
    }, [fazendas, canViewAllFarms, userFazendaId]);

    // 3. Nuntec Integration for Accurate Totals
    // 3a. Fetch Data Once (or when period changes - TODO)
    useEffect(() => {
        let mounted = true;
        const fetchData = async () => {
            setLoadingNuntec(true);
            try {
                // Fetch Nuntec Consumptions for the exact date range
                console.log("Fetching Nuntec data for dashboard range:", startDate, endDate);
                const { nuntecService } = await import('../../services/nuntecService');
                const data = await nuntecService.getConsumptions(startDate, endDate);
                if (mounted) setRawNuntecData(data);
            } catch (err) {
                console.error("Failed to load Nuntec stats", err);
            } finally {
                if (mounted) setLoadingNuntec(false);
            }
        };
        fetchData();
        return () => { mounted = false; };
    }, [startDate, endDate]); // Fetch when dates change

    // 3b. Filter Data Correctly when Farm Changes (Instant)
    const nuntecStats = useMemo(() => {
        if (loadingNuntec || rawNuntecData.length === 0) return null;

        let totalCount = 0;
        let totalVolume = 0;

        // Create a Map for fast lookup: ReservoirID -> FazendaID
        const reservoirMap = new Map<string, string>();
        const virtualReservoirs = new Set<string>();

        postos.forEach(p => {
            if (p.nuntec_reservoir_id) {
                reservoirMap.set(String(p.nuntec_reservoir_id), p.fazenda_id);
                if (p.tipo === 'VIRTUAL' || p.nome.toLowerCase().includes('gerente')) {
                    virtualReservoirs.add(String(p.nuntec_reservoir_id));
                }
            }
        });

        // Filter & Sum
        rawNuntecData.forEach(c => {
            const resId = String(c['reservoir-id']);
            const fazendaId = reservoirMap.get(resId);

            // 1. Must be a known reservoir
            // 2. Must NOT be Virtual (we want the physical baseline)
            if (fazendaId && !virtualReservoirs.has(resId)) {
                // 3. Must match current Farm Filter
                if (
                    (!canViewAllFarms && userFazendaId && fazendaId !== userFazendaId) ||
                    (canViewAllFarms && selectedFazendaId !== 'ALL' && fazendaId !== selectedFazendaId)
                ) {
                    return;
                }

                totalCount++;
                totalVolume += c.amount;
            }
        });

        return { totalCount, totalVolume };
    }, [rawNuntecData, postos, selectedFazendaId, userFazendaId, canViewAllFarms, loadingNuntec]);

    // Override Total with Nuntec Data if available
    const usefulTotalCount = nuntecStats ? nuntecStats.totalCount : stats.total;
    // Safety check to avoid > 100% if sync is delayed
    const displayTotalCount = Math.max(usefulTotalCount, stats.managerModeCount);

    // Recalculate Percentages
    // User Request: "pegar o total de abastecimentos geral da nuntec... e comparar com o gerente"
    // So: Manager Mode Count / Total Nuntec Count
    const managerModeCountPct = displayTotalCount > 0
        ? (stats.managerModeCount / displayTotalCount) * 100
        : 0;


    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* Header / Filter */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
                {loadingNuntec && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-center">
                        <div className="flex items-center gap-2 text-blue-600 font-semibold bg-white px-4 py-2 rounded-lg shadow-sm border border-blue-100">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            Atualizando dados da Nuntec...
                        </div>
                    </div>
                )}
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 leading-tight">Painel de Auditoria</h3>
                        <p className="text-xs text-slate-500">Monitoramento de conformidade e exceções</p>
                    </div>
                </div>

                {activeFilter && (
                    <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium animate-in fade-in cursor-pointer hover:bg-blue-100 transition-colors"
                        onClick={() => setActiveFilter(null)}
                        title="Remover Filtro"
                    >
                        <Filter size={14} />
                        Filtro: <span className="font-bold">{activeFilter.value}</span>
                        <span className="text-[10px] ml-1 opacity-60">(Clique para limpar)</span>
                    </div>
                )}

                {canViewAllFarms && (
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-slate-500 flex items-center gap-1">
                            <Building2 size={16} /> Filtrar Fazenda:
                        </label>
                        <select
                            value={selectedFazendaId}
                            onChange={(e) => setSelectedFazendaId(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 font-medium focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="ALL">Todas as Unidades</option>
                            {availableFazendas.map(f => (
                                <option key={f.id} value={f.id}>{f.nome}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Total Volume */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Activity size={120} />
                    </div>
                    <div className="flex items-center gap-3 mb-4 relative z-10">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                            <Activity size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Total de Operações</p>
                            <p className="text-xs text-slate-400">Total Geral (Nuntec + Manual)</p>
                        </div>
                    </div>
                    <div className="relative z-10">
                        <p className="text-4xl font-black text-slate-800">{displayTotalCount.toLocaleString('pt-BR')}</p>
                        {nuntecStats && (
                            <p className="text-xs text-slate-400 mt-1 font-medium">
                                Base Nuntec: {nuntecStats.totalCount} registros
                            </p>
                        )}
                    </div>
                </div>

                {/* 2. Manager Mode KPI */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <AlertTriangle size={120} />
                    </div>
                    <div className="flex items-center gap-3 mb-4 relative z-10">
                        <div className={`p-3 rounded-xl ${managerModeCountPct > 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            <UserX size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Modo Gerente</p>
                            <p className="text-xs text-slate-400">Liberações Manuais vs Total Geral</p>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-4 relative z-10">
                        <p className={`text-4xl font-black ${managerModeCountPct > 5 ? 'text-red-600' : 'text-slate-800'}`}>
                            {managerModeCountPct.toFixed(1)}%
                        </p>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-500">
                                {stats.managerModeCount} ocorrências
                            </span>
                            <span className="text-xs text-slate-400">
                                Meta: &lt; 5%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
                {/* Stacked Bar Chart */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
                    <h4 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                        <BarChart3 size={18} className="text-slate-400" />
                        Uso Gerente por Unidade
                    </h4>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={stats.barChartData}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                                <Tooltip
                                    cursor={{ fill: '#F1F5F9' }}
                                    formatter={(value: number | undefined) => [`${(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L`, 'Volume']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="Normal" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} cursor="pointer" />
                                <Bar dataKey="Gerente" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} cursor="pointer" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
                    <h4 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                        <PieChartIcon size={18} className="text-slate-400" />
                        Pareto de Motivos de Exceção
                    </h4>
                    <div className="flex-1 w-full min-h-0 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.pieChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    onClick={(data) => setActiveFilter({ type: 'REASON', value: data.name })}
                                    cursor="pointer"
                                >
                                    {stats.pieChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number | undefined) => [value || 0, 'Ocorrências']} />
                                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Rankings Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Operator Ranking Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h4 className="font-bold text-slate-700 flex items-center gap-2">
                            <UserX size={16} className="text-red-500" /> Ranking de Operadores (Modo Gerente)
                        </h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-50/50">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Rank</th>
                                    <th className="px-6 py-3 font-medium">Operador</th>
                                    <th className="px-6 py-3 font-medium text-right">Liberações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {stats.operatorRanking.length > 0 ? (
                                    stats.operatorRanking.map((item, idx) => {
                                        const percentage = stats.managerModeCount > 0 ? (item.count / stats.managerModeCount) * 100 : 0;
                                        return (
                                            <tr
                                                key={item.name}
                                                className={`transition-colors cursor-pointer ${activeFilter?.type === 'OPERATOR' && activeFilter.value === item.name ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                                                onClick={() => setActiveFilter({ type: 'OPERATOR', value: item.name })}
                                            >
                                                <td className="px-6 py-3 text-slate-400 font-mono text-xs">#{idx + 1}</td>
                                                <td className="px-6 py-3 font-bold text-slate-700">{item.name}</td>
                                                <td className="px-6 py-3 text-right font-bold text-red-600">{item.count}</td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">
                                            Nenhum registro encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Vehicle Ranking Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h4 className="font-bold text-slate-700 flex items-center gap-2">
                            <BarChart3 size={16} className="text-orange-500" /> Ranking de Veículos (Modo Gerente)
                        </h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-50/50">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Rank</th>
                                    <th className="px-6 py-3 font-medium">Veículo</th>
                                    <th className="px-6 py-3 font-medium text-right">Liberações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {stats.vehicleRanking.length > 0 ? (
                                    stats.vehicleRanking.map((item, idx) => {
                                        return (
                                            <tr
                                                key={item.name}
                                                className={`transition-colors cursor-pointer ${activeFilter?.type === 'VEHICLE' && activeFilter.value === item.name ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                                                onClick={() => setActiveFilter({ type: 'VEHICLE', value: item.name })}
                                            >
                                                <td className="px-6 py-3 text-slate-400 font-mono text-xs">#{idx + 1}</td>
                                                <td className="px-6 py-3 font-bold text-slate-700">{item.name}</td>
                                                <td className="px-6 py-3 text-right font-bold text-orange-600">{item.count}</td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">
                                            Nenhum registro encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* Detailed Table (Filtered) */}
            <div className={`space-y-4 ${activeFilter ? 'opacity-100' : 'opacity-70 grayscale'} transition-all`}>
                <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
                    <List size={20} className="text-blue-600" />
                    Detalhamento dos Registros
                    {activeFilter && <span className="text-sm font-normal text-slate-500 ml-2">Filtrado por {activeFilter.type}: {activeFilter.value}</span>}
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto max-h-[500px]">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0">
                                <tr>
                                    <th className="px-6 py-3">Data/Hora</th>
                                    <th className="px-6 py-3">Veículo</th>
                                    <th className="px-6 py-3">Operador</th>
                                    <th className="px-6 py-3">Motivo</th>
                                    <th className="px-6 py-3 text-right">Volume</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {detailedList.length > 0 ? (
                                    detailedList.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-3 text-slate-600">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-700">{new Date(item.data_abastecimento).toLocaleDateString()}</span>
                                                    <span className="text-xs">{new Date(item.data_abastecimento).toLocaleTimeString().slice(0, 5)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 font-medium text-slate-800">{item.veiculo_nome}</td>
                                            <td className="px-6 py-3 text-slate-600">{item.operador}</td>
                                            <td className="px-6 py-3">
                                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-wide">
                                                    {(item.manager_mode_reason || 'Manual').replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-right font-mono font-bold text-slate-700">
                                                {item.volume.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} L
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                                            Selecione um item nos gráficos acima para filtrar os registros.
                                            {!activeFilter && " (Mostrando todos os registros em Modo Gerente)"}
                                            {activeFilter && detailedList.length === 0 && " Nenhum registro encontrado para este filtro."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div >
    );
}
