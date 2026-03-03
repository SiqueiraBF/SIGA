
import React, { useState, useEffect, useMemo } from 'react';
import { nuntecService } from '../services/nuntecService';
import { NuntecFueling } from '../services/nuntec/types';
import { PageHeader } from '../components/ui/PageHeader';
import { FilterBar } from '../components/ui/FilterBar';
import StatsCard from '../components/ui/StatsCard';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { StatsSkeleton } from '../components/ui/StatsSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { FuelingScheduleSettingsModal } from '../components/audit/FuelingScheduleSettingsModal';
import {
    ClipboardCheck,
    AlertTriangle,
    CheckCircle2,
    Search,
    Calendar,
    Gauge,
    Tractor,
    BarChart3,
    List,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    MapPin,
    User,
    Clock,
    Settings,
    TimerOff
} from 'lucide-react';
import { format, subDays, parseISO, isWithinInterval, parse } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { farmService } from '../services/farmService';
import { db } from '../services/supabaseService';
import { systemService } from '../services/systemService';

type SortField = 'date' | 'vehicle' | 'station' | 'operator' | 'amount' | 'status';
type SortDirection = 'asc' | 'desc';

interface ScheduleInterval {
    start: string;
    end: string;
}

interface StationSchedules {
    [reservoirId: string]: ScheduleInterval[];
}

const SCHEDULE_STORAGE_KEY = 'nuntec_fueling_schedules_v2';

export function FuelingConsistency() {
    const { user, hasPermission } = useAuth();
    const [loading, setLoading] = useState(true);
    const [fuelings, setFuelings] = useState<NuntecFueling[]>([]);
    const [filteredFuelings, setFilteredFuelings] = useState<NuntecFueling[]>([]);

    // View Mode
    const [viewMode, setViewMode] = useState<'LIST' | 'RANKING'>('LIST');

    // Filters
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'OK' | 'MISSING'>('ALL');

    // Business Hours Filter
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [schedules, setSchedules] = useState<StationSchedules>({});
    const [onlyOffHours, setOnlyOffHours] = useState(false);

    // New Filters
    // Services Data
    const [allFarms, setAllFarms] = useState<any[]>([]);
    const [allPostos, setAllPostos] = useState<any[]>([]);

    // New Filters
    const [farmFilter, setFarmFilter] = useState('ALL');
    const [stationFilter, setStationFilter] = useState('ALL');
    const [vehicleFilter, setVehicleFilter] = useState('ALL');
    const [operatorFilter, setOperatorFilter] = useState('ALL');

    // Sorting
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    useEffect(() => {
        loadData();
        loadAuxiliaryData();
    }, [startDate, endDate]);

    useEffect(() => {
        loadSchedules();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [fuelings, searchTerm, statusFilter, farmFilter, stationFilter, vehicleFilter, operatorFilter, onlyOffHours, schedules]);

    async function loadAuxiliaryData() {
        try {
            const [farms, postos] = await Promise.all([
                farmService.getFarms(),
                db.getAllPostosDetailed()
            ]);
            setAllFarms(farms);
            setAllPostos(postos);
        } catch (e) {
            console.error("Failed to load aux data", e);
        }
    }

    async function loadSchedules() {
        try {
            const saved = await systemService.getParameter(SCHEDULE_STORAGE_KEY);
            if (saved) {
                setSchedules(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Failed to load schedules", e);
        }
    }

    async function loadData() {
        setLoading(true);
        try {
            const data = await nuntecService.getFuelingConsistency(startDate, endDate);
            setFuelings(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    // Derived Lists for Select Options (Vehicles/Operators still from data)
    const { uniqueVehicles, uniqueOperators } = useMemo(() => {
        const vehicles = new Set<string>();
        const operators = new Set<string>();

        fuelings.forEach(f => {
            if (f.vehicleName) vehicles.add(f.vehicleName);
            if (f.operatorName) operators.add(f.operatorName);
        });

        return {
            uniqueVehicles: Array.from(vehicles).sort(),
            uniqueOperators: Array.from(operators).sort()
        };
    }, [fuelings]);

    // Derived Postos for selected Farm
    const filteredPostos = useMemo(() => {
        if (farmFilter === 'ALL') return [];
        const farm = allFarms.find(f => f.nome === farmFilter);
        if (!farm) return [];
        return allPostos.filter(p => p.fazenda_id === farm.id);
    }, [farmFilter, allFarms, allPostos]);

    // Check if a fueling is off-hours
    const isOffHours = (fueling: NuntecFueling) => {
        // Must have reservoirId to check against new schedule format
        if (!fueling.reservoirId) return false;

        const stationSchedules = schedules[fueling.reservoirId];
        if (!stationSchedules || stationSchedules.length === 0) return false; // No rules = authorized

        // Parse Fueling Time (HH:mm)
        const fuelingDate = parseISO(fueling.date);
        const timeStr = format(fuelingDate, 'HH:mm');
        const fuelingTime = parse(timeStr, 'HH:mm', new Date());

        // Check if inside ANY interval
        const isInsideAny = stationSchedules.some(interval => {
            const start = parse(interval.start, 'HH:mm', new Date());
            const end = parse(interval.end, 'HH:mm', new Date());

            // Handle overnight shifts if end < start? Assuming same-day for now as simpler
            return fuelingTime >= start && fuelingTime <= end;
        });

        return !isInsideAny;
    };

    function applyFilters() {
        let result = fuelings;

        // Status
        if (statusFilter === 'MISSING') {
            result = result.filter(f => f.hourmeter === 0 && f.odometer === 0);
        } else if (statusFilter === 'OK') {
            result = result.filter(f => f.hourmeter > 0 || f.odometer > 0);
        }

        // Business Hours
        if (onlyOffHours) {
            result = result.filter(f => isOffHours(f));
        }

        // Farm & Station Filter Logic (DB Based)
        if (farmFilter !== 'ALL') {
            const selectedFarm = allFarms.find(f => f.nome === farmFilter);

            if (selectedFarm) {
                // Get all reservoir IDs for this farm (from its stations)
                const farmStationIds = allPostos
                    .filter(p => p.fazenda_id === selectedFarm.id && p.nuntec_reservoir_id)
                    .map(p => String(p.nuntec_reservoir_id));

                if (stationFilter !== 'ALL') {
                    // Specific Station Selected
                    const selectedStation = allPostos.find(p => p.id === stationFilter);
                    if (selectedStation && selectedStation.nuntec_reservoir_id) {
                        result = result.filter(f => f.reservoirId === String(selectedStation.nuntec_reservoir_id));
                    } else {
                        // Fallback if no reservoir ID map (shouldn't happen if setup is correct)
                        result = result.filter(f => f.stationName?.includes(stationFilter));
                    }
                } else {
                    // Only Farm Selected -> Filter by ANY of the farm's reservoir IDs or Station Name Fallback
                    result = result.filter(f => {
                        // Priority 1: Check Reservoir ID match
                        if (f.reservoirId && farmStationIds.includes(f.reservoirId)) return true;

                        // Priority 2: Fallback to Name Match (Legacy/Unmapped)
                        if (f.stationName?.startsWith(farmFilter)) return true;

                        return false;
                    });
                }
            } else {
                // Fallback to simple name match if DB farm not found
                result = result.filter(f => f.stationName?.startsWith(farmFilter));
            }
        }

        // Vehicle
        if (vehicleFilter !== 'ALL') {
            result = result.filter(f => f.vehicleName === vehicleFilter);
        }

        // Operator
        if (operatorFilter !== 'ALL') {
            result = result.filter(f => f.operatorName === operatorFilter);
        }

        // Search
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(f =>
                f.vehicleName?.toLowerCase().includes(lower) ||
                f.stationName?.toLowerCase().includes(lower) ||
                f.operatorName?.toLowerCase().includes(lower)
            );
        }

        setFilteredFuelings(result);
    }

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedFuelings = useMemo(() => {
        return [...filteredFuelings].sort((a, b) => {
            let aValue: any, bValue: any;

            switch (sortField) {
                case 'date':
                    aValue = new Date(a.date).getTime();
                    bValue = new Date(b.date).getTime();
                    break;
                case 'vehicle':
                    aValue = a.vehicleName || '';
                    bValue = b.vehicleName || '';
                    break;
                case 'station':
                    aValue = a.stationName || '';
                    bValue = b.stationName || '';
                    break;
                case 'operator':
                    aValue = a.operatorName || '';
                    bValue = b.operatorName || '';
                    break;
                case 'amount':
                    aValue = a.amount;
                    bValue = b.amount;
                    break;
                case 'status':
                    // 0 = OK, 1 = MISSING (to sort errors to top/bottom)
                    aValue = (a.hourmeter === 0 && a.odometer === 0) ? 1 : 0;
                    bValue = (b.hourmeter === 0 && b.odometer === 0) ? 1 : 0;
                    break;
            }

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredFuelings, sortField, sortDirection]);

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown size={14} className="text-slate-400 opacity-50" />;
        return sortDirection === 'asc' ? <ArrowUp size={14} className="text-blue-600" /> : <ArrowDown size={14} className="text-blue-600" />;
    };

    // KPIs
    const total = fuelings.length;
    const missing = fuelings.filter(f => f.hourmeter === 0 && f.odometer === 0).length;
    const ok = total - missing;
    const percentMissing = total > 0 ? ((missing / total) * 100).toFixed(1) : '0.0';

    // Ranking Data
    const rankingData = useMemo(() => {
        const counts = new Map<string, { name: string; count: number }>();
        fuelings.forEach(f => {
            if (f.hourmeter === 0 && f.odometer === 0) {
                const current = counts.get(f.vehicleId) || { name: f.vehicleName || 'Desconhecido', count: 0 };
                counts.set(f.vehicleId, { ...current, count: current.count + 1 });
            }
        });
        return Array.from(counts.values()).sort((a, b) => b.count - a.count);
    }, [fuelings]);

    if (!hasPermission('gestao_auditoria')) {
        return (
            <div className="p-8 text-center">
                <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-xl p-6">
                    <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-800 mb-2">Acesso Negado</h2>
                    <p className="text-red-600">Você não tem permissão para acessar a Auditoria de Abastecimentos.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
            <PageHeader
                title="Auditoria de Abastecimentos"
                subtitle="Monitore inconsistências de medição, horários não permitidos e conformidade da frota (Nuntec)."
                icon={ClipboardCheck}
            >
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsScheduleModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 transition-colors"
                        title="Configurar Horários"
                    >
                        <Settings size={16} />
                        <span className="hidden md:inline">Configurações</span>
                    </button>

                    <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                        <Calendar size={14} />
                        <span>Período: <b>{format(parseISO(startDate), 'dd/MM')}</b> até <b>{format(parseISO(endDate), 'dd/MM')}</b></span>
                    </div>
                </div>
            </PageHeader>

            <div className="flex items-center gap-4 border-b border-slate-200">
                <button
                    onClick={() => setViewMode('LIST')}
                    className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${viewMode === 'LIST' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <List size={16} /> Lista
                </button>
                <button
                    onClick={() => setViewMode('RANKING')}
                    className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${viewMode === 'RANKING' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <BarChart3 size={16} /> Ranking
                </button>
            </div>

            {loading ? (
                <div className="animate-in fade-in duration-300">
                    <StatsSkeleton count={3} />
                    <TableSkeleton rows={8} columns={6} />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatsCard
                            title="TOTAL ABASTECIMENTOS"
                            value={total}
                            icon={Tractor}
                            description="No período selecionado"
                            variant="blue"
                        />
                        <StatsCard
                            title="COM MEDIÇÃO (OK)"
                            value={ok}
                            icon={CheckCircle2}
                            description="Horímetro ou Hodômetro > 0"
                            variant="green"
                            onClick={() => setStatusFilter('OK')}
                            className={statusFilter === 'OK' ? 'ring-2 ring-green-500' : ''}
                        />
                        <StatsCard
                            title="SEM MEDIÇÃO (ERRO)"
                            value={missing}
                            icon={AlertTriangle}
                            description={`Representa ${percentMissing}% do total`}
                            variant="red"
                            onClick={() => setStatusFilter('MISSING')}
                            className={statusFilter === 'MISSING' ? 'ring-2 ring-red-500' : ''}
                        />
                    </div>

                    <FilterBar
                        onSearch={setSearchTerm}
                        searchValue={searchTerm}
                        searchPlaceholder="Buscar por veículo, posto ou operador..."
                        hasActiveFilters={
                            statusFilter !== 'ALL' ||
                            farmFilter !== 'ALL' ||
                            stationFilter !== 'ALL' ||
                            vehicleFilter !== 'ALL' ||
                            operatorFilter !== 'ALL' ||
                            onlyOffHours
                        }
                        onClear={() => {
                            setSearchTerm('');
                            setStatusFilter('ALL');
                            setFarmFilter('ALL');
                            setStationFilter('ALL');
                            setVehicleFilter('ALL');
                            setOperatorFilter('ALL');
                            setOnlyOffHours(false);
                        }}
                        advancedFilters={
                            <>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                                        <TimerOff size={12} className={onlyOffHours ? "text-red-500" : ""} /> Filtro Especial
                                    </label>
                                    <button
                                        onClick={() => setOnlyOffHours(!onlyOffHours)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm border transition-all ${onlyOffHours
                                            ? 'bg-red-50 border-red-200 text-red-700 font-medium'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        <span>Apenas Fora de Horário</span>
                                        {onlyOffHours && <CheckCircle2 size={14} />}
                                    </button>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                                        <CheckCircle2 size={12} /> Status
                                    </label>
                                    <select
                                        className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value as any)}
                                    >
                                        <option value="ALL">Todos</option>
                                        <option value="MISSING">Sem Medição (Irregular)</option>
                                        <option value="OK">Com Medição (Correto)</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                                        <MapPin size={12} /> Fazenda
                                    </label>
                                    <select
                                        className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                                        value={farmFilter}
                                        onChange={(e) => {
                                            setFarmFilter(e.target.value);
                                            setStationFilter('ALL'); // Reset station when farm changes
                                        }}
                                    >
                                        <option value="ALL">Todas</option>
                                        {allFarms.map(f => (
                                            <option key={f.id} value={f.nome}>{f.nome}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Posto Filter - Only show if Farm is selected */}
                                {farmFilter !== 'ALL' && (
                                    <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                                        <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                                            <Gauge size={12} /> Posto
                                        </label>
                                        <select
                                            className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                                            value={stationFilter}
                                            onChange={(e) => setStationFilter(e.target.value)}
                                        >
                                            <option value="ALL">Todos os Postos</option>
                                            {filteredPostos.map(p => (
                                                <option key={p.id} value={p.id}>{p.nome}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                                        <Tractor size={12} /> Veículo
                                    </label>
                                    <select
                                        className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                                        value={vehicleFilter}
                                        onChange={(e) => setVehicleFilter(e.target.value)}
                                    >
                                        <option value="ALL">Todos</option>
                                        {uniqueVehicles.map(v => (
                                            <option key={v} value={v}>{v}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                                        <User size={12} /> Operador
                                    </label>
                                    <select
                                        className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                                        value={operatorFilter}
                                        onChange={(e) => setOperatorFilter(e.target.value)}
                                    >
                                        <option value="ALL">Todos</option>
                                        {uniqueOperators.map(o => (
                                            <option key={o} value={o}>{o}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                                        <Calendar size={12} /> Data Início
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                                        <Calendar size={12} /> Data Fim
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                            </>
                        }
                    />

                    {viewMode === 'RANKING' ? (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                            <div className="p-6 border-b border-slate-100">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <BarChart3 className="text-blue-600" />
                                    Ranking de Inconsistências
                                </h3>
                                <p className="text-slate-500 text-sm">Veículos com maior número de abastecimentos sem medição</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4 w-20">Rank</th>
                                            <th className="px-6 py-4">Veículo</th>
                                            <th className="px-6 py-4 text-right">Falhas (Sem Medição)</th>
                                            <th className="px-6 py-4 w-1/3">Participação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {rankingData.map((item, index) => {
                                            const percent = missing > 0 ? (item.count / missing) * 100 : 0;
                                            return (
                                                <tr key={index} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 font-mono text-slate-400">#{index + 1}</td>
                                                    <td className="px-6 py-4 font-bold text-slate-800">{item.name}</td>
                                                    <td className="px-6 py-4 text-right font-bold text-red-600">{item.count}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-red-500 rounded-full"
                                                                    style={{ width: `${percent}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-slate-500 w-12 text-right">{percent.toFixed(1)}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {rankingData.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                                    Nenhum veículo com inconsistência encontrado neste período.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : filteredFuelings.length > 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                        <tr>
                                            <th
                                                className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                                                onClick={() => handleSort('date')}
                                            >
                                                <div className="flex items-center gap-2">Data <SortIcon field="date" /></div>
                                            </th>
                                            <th
                                                className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                                                onClick={() => handleSort('vehicle')}
                                            >
                                                <div className="flex items-center gap-2">Veículo <SortIcon field="vehicle" /></div>
                                            </th>
                                            <th
                                                className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                                                onClick={() => handleSort('station')}
                                            >
                                                <div className="flex items-center gap-2">Posto <SortIcon field="station" /></div>
                                            </th>
                                            <th
                                                className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                                                onClick={() => handleSort('operator')}
                                            >
                                                <div className="flex items-center gap-2">Operador <SortIcon field="operator" /></div>
                                            </th>
                                            <th
                                                className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                                                onClick={() => handleSort('amount')}
                                            >
                                                <div className="flex items-center justify-end gap-2">Volume <SortIcon field="amount" /></div>
                                            </th>
                                            <th className="px-6 py-4 text-center">Medição (H/Km)</th>
                                            <th
                                                className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                                                onClick={() => handleSort('status')}
                                            >
                                                <div className="flex items-center justify-center gap-2">Status <SortIcon field="status" /></div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {sortedFuelings.map((item) => {
                                            const offHours = isOffHours(item);
                                            return (
                                                <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${offHours ? 'bg-red-50/30' : ''}`}>
                                                    <td className="px-6 py-4 text-slate-600">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold">{format(parseISO(item.date), "dd/MM/yyyy")}</span>
                                                            <span className="flex items-center gap-1.5 text-xs">
                                                                {format(parseISO(item.date), "HH:mm")}
                                                                {offHours && (
                                                                    <span className="flex items-center gap-1 text-red-500 font-bold bg-red-100 px-1.5 py-0.5 rounded-md" title="Fora de Horário de Expediente">
                                                                        <Clock size={10} /> Fora de Horário
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-slate-800">
                                                        {item.vehicleName}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600">
                                                        {item.stationName}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600">
                                                        {item.operatorName}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono text-slate-700">
                                                        {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} L
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            {item.hourmeter > 0 && (
                                                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-mono">
                                                                    H: {item.hourmeter}
                                                                </span>
                                                            )}
                                                            {item.odometer > 0 && (
                                                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-mono">
                                                                    Km: {item.odometer}
                                                                </span>
                                                            )}
                                                            {item.hourmeter === 0 && item.odometer === 0 && (
                                                                <span className="text-slate-300 font-mono">-</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {item.hourmeter === 0 && item.odometer === 0 ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                                                <AlertTriangle size={12} />
                                                                Sem Dados
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                                                <CheckCircle2 size={12} />
                                                                OK
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <EmptyState
                            title="Nenhum registro encontrado"
                            description="Não foram encontrados abastecimentos com os filtros selecionados."
                            icon={ClipboardCheck}
                        />
                    )}
                </>
            )}

            <FuelingScheduleSettingsModal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                farms={allFarms}
                stations={allPostos}
                onSave={loadSchedules}
            />
        </div>
    );
}
