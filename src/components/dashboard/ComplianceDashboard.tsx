import React, { useMemo, useState } from 'react';
import {
    ShieldCheck,
    AlertTriangle,
    UserX,
    Activity,
    Search,
    Building2,
    Filter
} from 'lucide-react';
import { Abastecimento, Fazenda, Posto } from '../../types';

interface ComplianceDashboardProps {
    abastecimentos: Abastecimento[];
    fazendas: Fazenda[];
    postos: Posto[];
    userFazendaId?: string;
    canViewAllFarms: boolean;
}

export function ComplianceDashboard({
    abastecimentos,
    fazendas,
    postos,
    userFazendaId,
    canViewAllFarms
}: ComplianceDashboardProps) {

    const [selectedFazendaId, setSelectedFazendaId] = useState<string>('ALL');

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

    // 2. Calculate KPIs
    const stats = useMemo(() => {
        const total = filteredData.length;
        if (total === 0) return {
            managerModeCount: 0,
            managerModeVolume: 0,
            managerModePct: 0,
            noMeterCount: 0,
            noMeterPct: 0,
            topManagerModeVehicles: [],
            topNoMeterVehicles: [],
            reasonDistribution: []
        };

        const managerMode = filteredData.filter(a => a.is_manager_mode);
        const noMeter = filteredData.filter(a => a.tipo_marcador === 'SEM_MEDIDOR');

        const managerModeVolume = managerMode.reduce((acc, curr) => acc + curr.volume, 0);

        // Group by Vehicle (Manager Mode)
        const vehicleManagerModeMap = new Map<string, number>();
        managerMode.forEach(a => {
            const name = a.veiculo_nome || 'Desconhecido';
            vehicleManagerModeMap.set(name, (vehicleManagerModeMap.get(name) || 0) + 1);
        });

        const topManagerModeVehicles = Array.from(vehicleManagerModeMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        // Group by Vehicle (No Meter)
        const vehicleNoMeterMap = new Map<string, number>();
        noMeter.forEach(a => {
            const name = a.veiculo_nome || 'Desconhecido';
            vehicleNoMeterMap.set(name, (vehicleNoMeterMap.get(name) || 0) + 1);
        });

        const topNoMeterVehicles = Array.from(vehicleNoMeterMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        return {
            managerModeCount: managerMode.length,
            managerModeVolume,
            managerModePct: (managerMode.length / total) * 100,
            noMeterCount: noMeter.length,
            noMeterPct: (noMeter.length / total) * 100,
            topManagerModeVehicles,
            topNoMeterVehicles
        };
    }, [filteredData]);

    // Available Farms for Dropdown (if admin)
    const availableFazendas = useMemo(() => {
        if (!canViewAllFarms && userFazendaId) {
            return fazendas.filter(f => f.id === userFazendaId);
        }
        return fazendas;
    }, [fazendas, canViewAllFarms, userFazendaId]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* Header / Filter */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 leading-tight">Painel de Auditoria</h3>
                        <p className="text-xs text-slate-500">Monitoramento de conformidade e exceções</p>
                    </div>
                </div>

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

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Manager Mode Card */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <AlertTriangle size={100} />
                    </div>

                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className={`p-3 rounded-xl ${stats.managerModePct > 5 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                            <UserX size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Modo Gerente</p>
                            <p className="text-xs text-slate-400">Liberações manuais (sem automação)</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-6 relative z-10">
                        <div>
                            <p className="text-3xl font-black text-slate-800">{stats.managerModeCount}</p>
                            <p className="text-xs font-semibold text-slate-400">Ocorrências</p>
                        </div>
                        <div>
                            <p className="text-3xl font-black text-slate-800">{stats.managerModeVolume.toFixed(0)} L</p>
                            <p className="text-xs font-semibold text-slate-400">Volume Total</p>
                        </div>
                    </div>

                    <div className="mb-2 relative z-10">
                        <div className="flex justify-between text-xs font-bold mb-1">
                            <span className={stats.managerModePct > 5 ? 'text-red-600' : 'text-slate-600'}>
                                {stats.managerModePct.toFixed(1)}% do Total
                            </span>
                            <span className="text-slate-400">Meta: &lt; 5%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                                className={`h-full rounded-full ${stats.managerModePct > 5 ? 'bg-red-500' : 'bg-orange-400'}`}
                                style={{ width: `${Math.min(stats.managerModePct, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* No Meter Card */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Activity size={100} />
                    </div>

                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                            <Activity size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Sem Medidor</p>
                            <p className="text-xs text-slate-400">Abastecimentos sem horímetro/KM</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-6 relative z-10">
                        <div>
                            <p className="text-3xl font-black text-slate-800">{stats.noMeterCount}</p>
                            <p className="text-xs font-semibold text-slate-400">Ocorrências</p>
                        </div>
                        <div>
                            <div className="flex items-center gap-1 h-full">
                                <span className="text-xs font-medium bg-amber-50 text-amber-700 px-2 py-1 rounded-lg border border-amber-100">
                                    Impacta média de consumo
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mb-2 relative z-10">
                        <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-amber-600">
                                {stats.noMeterPct.toFixed(1)}% do Total
                            </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-amber-400"
                                style={{ width: `${Math.min(stats.noMeterPct, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Violators Tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Top Manager Mode */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h4 className="font-bold text-slate-700 flex items-center gap-2">
                            <UserX size={16} className="text-red-500" /> Top 5 Modo Gerente
                        </h4>
                    </div>
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-50/50">
                                <tr>
                                    <th className="px-5 py-2">Veículo</th>
                                    <th className="px-5 py-2 text-right">Qtd</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {stats.topManagerModeVehicles.length > 0 ? (
                                    stats.topManagerModeVehicles.map((item, idx) => (
                                        <tr key={item.name} className="hover:bg-slate-50">
                                            <td className="px-5 py-3 font-medium text-slate-700">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-slate-400 min-w-[15px]">{idx + 1}.</span>
                                                    {item.name}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-right font-bold text-red-600">{item.count}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={2} className="px-5 py-8 text-center text-slate-400 italic">
                                            Nenhum registro encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top No Meter */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h4 className="font-bold text-slate-700 flex items-center gap-2">
                            <Activity size={16} className="text-amber-500" /> Top 5 Sem Medidor
                        </h4>
                    </div>
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-50/50">
                                <tr>
                                    <th className="px-5 py-2">Veículo</th>
                                    <th className="px-5 py-2 text-right">Qtd</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {stats.topNoMeterVehicles.length > 0 ? (
                                    stats.topNoMeterVehicles.map((item, idx) => (
                                        <tr key={item.name} className="hover:bg-slate-50">
                                            <td className="px-5 py-3 font-medium text-slate-700">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-slate-400 min-w-[15px]">{idx + 1}.</span>
                                                    {item.name}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-right font-bold text-amber-600">{item.count}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={2} className="px-5 py-8 text-center text-slate-400 italic">
                                            Nenhum registro encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

        </div>
    );
}
