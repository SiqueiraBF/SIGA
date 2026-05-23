import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, ComposedChart
} from 'recharts';
import { AuditItem } from '../../services/auditService';
import { clsx } from 'clsx';
import { TrendingDown, AlertTriangle, Building2, Droplet } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditDashboardProps {
    items: AuditItem[];
}

// Cores premium baseadas nos tokens do sistema
const COLORS = {
    TEAL: '#0d9488', // teal-600
    RED: '#dc2626', // red-600
    YELLOW: '#ca8a04', // yellow-600
    SLATE: '#64748b', // slate-500
    BLUE: '#2563eb', // blue-600
    ORANGE: '#ea580c', // orange-600
    PURPLE: '#9333ea', // purple-600
};

const FUEL_COLORS: Record<string, string> = {
    'Óleo Diesel S10': COLORS.TEAL,
    'Óleo Diesel': COLORS.BLUE,
    'Querosene': COLORS.ORANGE,
    'Etanol': COLORS.PURPLE,
    'Gasolina': COLORS.RED,
};

export function AuditDashboard({ items }: AuditDashboardProps) {
    // A. Margem de Tolerância / Quebra por Combustível
    const fuelStats = useMemo(() => {
        const stats: Record<string, { volume: number; difference: number }> = {};
        items.forEach(item => {
            const fuel = item.fuel_name || 'Desconhecido';
            if (!stats[fuel]) stats[fuel] = { volume: 0, difference: 0 };
            stats[fuel].volume += item.volume;
            stats[fuel].difference += item.difference;
        });

        return Object.entries(stats).map(([name, data]) => {
            const percent = data.volume > 0 ? (data.difference / data.volume) * 100 : 0;
            return {
                name,
                volume: data.volume,
                difference: data.difference,
                percent,
                isCritical: percent < -0.6
            };
        }).sort((a, b) => a.percent - b.percent); // Order by worst loss
    }, [items]);

    // B. Ranking de Fornecedores (Quebra % por fornecedor e combustível)
    const supplierRanking = useMemo(() => {
        const stats: Record<string, { volume: number; difference: number }> = {};
        items.forEach(item => {
            if (!item.analysis?.supplier_name) return;
            const supplier = item.analysis.supplier_name;
            if (!stats[supplier]) stats[supplier] = { volume: 0, difference: 0 };
            stats[supplier].volume += item.volume;
            stats[supplier].difference += item.difference;
        });

        return Object.entries(stats).map(([name, data]) => {
            const percent = data.volume > 0 ? (data.difference / data.volume) * 100 : 0;
            return {
                name: name.length > 20 ? name.substring(0, 20) + '...' : name,
                fullName: name,
                percent: Number(percent.toFixed(2)),
                volume: data.volume
            };
        })
            .filter(s => s.percent < 0) // Show only losses
            .sort((a, b) => a.percent - b.percent) // Sort worst first
            .slice(0, 10); // Top 10 worst
    }, [items]);

    // C. Comparativo por Unidade (Conforme vs Não Conforme)
    const unitComparison = useMemo(() => {
        const stats: Record<string, { conforming: number; non_conforming: number }> = {};
        items.forEach(item => {
            // Determine farm name gracefully
            let farm = item.farm_name;
            if (!farm && item.unit_id) {
                let cleanName = item.unit_id.replace(/^\[.*?\]\s*/, '').trim();
                const parts = cleanName.split(' - ');
                farm = parts.length > 0 ? parts[0].trim() : cleanName;
            }
            if (!farm) farm = 'Desconhecida';

            if (!stats[farm]) stats[farm] = { conforming: 0, non_conforming: 0 };
            
            if (item.conformity === 'CONFORME') {
                stats[farm].conforming += 1;
            } else if (item.conformity === 'NÃO CONFORME') {
                stats[farm].non_conforming += 1;
            }
        });

        return Object.entries(stats).map(([name, data]) => ({
            name: name.length > 15 ? name.substring(0, 15) + '...' : name,
            fullName: name,
            Conforme: data.conforming,
            'Não Conforme': data.non_conforming,
            total: data.conforming + data.non_conforming
        }))
        .filter(u => u.total > 0)
        .sort((a, b) => b['Não Conforme'] - a['Não Conforme']); // Sort by most non-conforming
    }, [items]);

    // D. Série Temporal (Quebra % Média ao longo do tempo por Combustível)
    const timeSeriesData = useMemo(() => {
        const days: Record<string, Record<string, { volume: number; diff: number }>> = {};
        
        items.forEach(item => {
            if (!item.date) return;
            // Format to YYYY-MM-DD
            const dateKey = item.date.split('T')[0];
            const fuel = item.fuel_name || 'Geral';
            
            if (!days[dateKey]) days[dateKey] = {};
            if (!days[dateKey][fuel]) days[dateKey][fuel] = { volume: 0, diff: 0 };
            
            days[dateKey][fuel].volume += item.volume;
            days[dateKey][fuel].diff += item.difference;
        });

        // Convert to array sorted by date
        return Object.entries(days).map(([date, fuels]) => {
            const entry: any = { 
                date, 
                formattedDate: format(parseISO(date), 'dd/MMM', { locale: ptBR }) 
            };
            
            Object.entries(fuels).forEach(([fuel, data]) => {
                if (data.volume > 0) {
                    entry[fuel] = Number(((data.diff / data.volume) * 100).toFixed(2));
                }
            });
            return entry;
        }).sort((a, b) => a.date.localeCompare(b.date));
    }, [items]);

    // Extrair lista única de combustíveis para as linhas da série temporal
    const uniqueFuels = useMemo(() => {
        const fuels = new Set<string>();
        items.forEach(i => { if (i.fuel_name) fuels.add(i.fuel_name); });
        return Array.from(fuels);
    }, [items]);

    if (items.length === 0) {
        return (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-12 border border-slate-200/70 text-center flex flex-col items-center">
                <Droplet className="w-16 h-16 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-600">Dados Insuficientes</h3>
                <p className="text-slate-400 mt-2">Não há dados suficientes no período para gerar o dashboard.</p>
            </div>
        );
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-xl border border-slate-100 text-sm">
                    <p className="font-bold text-slate-800 mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 mb-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-slate-600">{entry.name}:</span>
                            <span className="font-semibold text-slate-800">
                                {entry.name === 'Conforme' || entry.name === 'Não Conforme' 
                                    ? entry.value 
                                    : `${entry.value}%`}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* A. Quebra por Combustível */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {fuelStats.map((stat) => (
                    <div key={stat.name} className="bg-white/80 backdrop-blur-sm p-5 rounded-xl shadow-sm border border-slate-200/70 hover:border-slate-300 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-semibold text-slate-600">{stat.name}</span>
                            <Droplet size={18} color={FUEL_COLORS[stat.name] || COLORS.SLATE} />
                        </div>
                        <div className="flex items-end gap-2">
                            <h4 className={clsx(
                                "text-2xl font-bold",
                                stat.isCritical ? "text-red-600" : "text-teal-600"
                            )}>
                                {stat.percent > 0 ? '+' : ''}{stat.percent.toFixed(2)}%
                            </h4>
                            <span className="text-xs text-slate-400 mb-1 pb-0.5">
                                ({stat.difference.toLocaleString('pt-BR')} L)
                            </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-4 overflow-hidden">
                            <div 
                                className={clsx("h-1.5 rounded-full", stat.isCritical ? "bg-red-500" : "bg-teal-500")} 
                                style={{ width: `${Math.min(Math.abs(stat.percent) * 50, 100)}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* D. Série Temporal (Fluxo Diário) */}
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-slate-200/70 lg:col-span-2">
                    <div className="mb-6">
                        <h3 className="font-bold text-slate-800 text-lg">Evolução do Índice de Quebra</h3>
                        <p className="text-sm text-slate-500">Acompanhamento temporal da diferença (%)</p>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={timeSeriesData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="formattedDate" tick={{ fontSize: 12, fill: '#475569' }} />
                                <YAxis unit="%" tick={{ fontSize: 12, fill: '#64748b' }} domain={['auto', 'auto']} />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                                {uniqueFuels.map((fuel, index) => (
                                    <Line 
                                        key={fuel}
                                        type="monotone" 
                                        dataKey={fuel} 
                                        name={fuel}
                                        stroke={FUEL_COLORS[fuel] || Object.values(COLORS)[index % Object.values(COLORS).length]} 
                                        strokeWidth={3}
                                        dot={{ r: 4, strokeWidth: 2 }}
                                        activeDot={{ r: 6 }}
                                        connectNulls
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* B. Ranking de Quebra (Bar Chart) */}
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-slate-200/70">
                    <div className="mb-6">
                        <h3 className="font-bold text-slate-800 text-lg">Maiores Índices de Quebra</h3>
                        <p className="text-sm text-slate-500">Ranking por Transportadora/Fornecedor</p>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={supplierRanking} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                <XAxis type="number" unit="%" tick={{ fontSize: 12, fill: '#64748b' }} domain={['dataMin - 0.2', 0]} />
                                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#475569' }} width={120} />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Bar dataKey="percent" name="Quebra" fill={COLORS.RED} radius={[0, 4, 4, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* C. Comparativo por Unidade */}
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-slate-200/70">
                    <div className="mb-6">
                        <h3 className="font-bold text-slate-800 text-lg">Conformidade por Unidade</h3>
                        <p className="text-sm text-slate-500">Volume de Entregas (NF vs Análise Técnica)</p>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={unitComparison} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Bar dataKey="Conforme" stackId="a" fill={COLORS.TEAL} radius={[0, 0, 4, 4]} barSize={32} />
                                <Bar dataKey="Não Conforme" stackId="a" fill={COLORS.RED} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
