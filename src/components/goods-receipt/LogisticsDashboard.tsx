import React, { useState } from 'react';
import { useLogisticsDashboardMetrics, PeriodFilter } from '../../hooks/useLogisticsDashboardMetrics';
import StatsCard from '../ui/StatsCard';
import { Package, Truck, Clock, AlertTriangle, ArrowRight, Calendar, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { format, differenceInMinutes, parseISO } from 'date-fns';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';
import { EmptyState } from '../ui/EmptyState';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export function LogisticsDashboard() {
    const [period, setPeriod] = useState<PeriodFilter>('7D');
    const [customStart, setCustomStart] = useState<string>('');
    const [customEnd, setCustomEnd] = useState<string>('');
    const [selectedDestination, setSelectedDestination] = useState<string | null>(null);

    // Converter strings do input para Date quando houver valor
    const parsedStart = customStart ? new Date(customStart + 'T00:00:00') : null;
    const parsedEnd = customEnd ? new Date(customEnd + 'T23:59:59') : null;

    const { data: metrics, isPending, isError, isFetching } = useLogisticsDashboardMetrics(period, parsedStart, parsedEnd, selectedDestination);

    // Initial hard load (no data yet)
    if (isPending && !metrics) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (isError || !metrics) {
        return (
            <div className="p-8">
                <EmptyState
                    icon={AlertTriangle}
                    title="Erro ao carregar indicadores"
                    description="Não foi possível carregar as métricas do dashboard."
                />
            </div>
        );
    }

    const {
        leadTimeAverageFormatted,
        waitingList,
        volumeByDestination,
        entriesVsExitsByDay,
        totalEntradas,
        totalSaidas
    } = metrics;

    const totalWaiting = waitingList.length;

    // Custom Tooltip for Area Chart
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100 text-sm">
                    <p className="font-bold text-slate-700 mb-2">{format(parseISO(label), 'dd/MM/yyyy')}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 mb-1">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
                            <span className="text-slate-500 capitalize">{entry.name}:</span>
                            <span className="font-bold text-slate-800">{entry.value}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header / Filtro */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 text-slate-700 font-bold">
                    <Calendar className="text-blue-500" size={20} />
                    Painel de Performance Logística
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        {(['7D', 'THIS_MONTH', 'LAST_MONTH', 'CUSTOM'] as PeriodFilter[]).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${period === p
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {p === '7D' ? '7 DIAS' : p === 'THIS_MONTH' ? 'ESTE MÊS' : p === 'LAST_MONTH' ? 'MÊS PASSADO' : 'PERSONALIZADO'}
                            </button>
                        ))}
                    </div>

                    {period === 'CUSTOM' && (
                        <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                            <input
                                type="date"
                                value={customStart}
                                onChange={(e) => setCustomStart(e.target.value)}
                                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                            <span className="text-slate-400">até</span>
                            <input
                                type="date"
                                value={customEnd}
                                onChange={(e) => setCustomEnd(e.target.value)}
                                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Nova Linha: Resumo de Movimentação */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden relative">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                    <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
                        <div className="flex items-center gap-2 text-emerald-600 font-bold mb-1">
                            <ArrowDownCircle size={20} />
                            Entradas no Período
                        </div>
                        <div className="text-4xl font-extrabold text-slate-800">
                            {totalEntradas} <span className="text-base text-slate-500 font-medium">notas</span>
                        </div>
                    </div>

                    <div className="hidden md:block w-px h-16 bg-slate-100"></div>

                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Movimentação</div>
                        <div className="text-sm text-slate-500 max-w-[200px]">Fluxo consolidado dentro do intervalo selecionado.</div>
                    </div>

                    <div className="hidden md:block w-px h-16 bg-slate-100"></div>

                    <div className="flex-1 flex flex-col items-center md:items-end text-center md:text-right">
                        <div className="flex items-center gap-2 text-purple-600 font-bold mb-1">
                            <ArrowUpCircle size={20} />
                            Saídas no Período
                        </div>
                        <div className="text-4xl font-extrabold text-slate-800">
                            {totalSaidas} <span className="text-base text-slate-500 font-medium">expedidas</span>
                        </div>
                    </div>
                </div>
                {/* Background Decorator */}
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-slate-50 rounded-full blur-3xl -z-0"></div>
            </div>

            {/* Active Filter Badge */}
            {selectedDestination && (
                <div className="flex items-center gap-3 bg-purple-50 text-purple-700 px-4 py-2 rounded-xl border border-purple-100 animate-in slide-in-from-top-2 w-fit">
                    <span className="font-medium text-sm">
                        Filtrando por destino: <strong className="font-extrabold">{selectedDestination}</strong>
                    </span>
                    <button
                        onClick={() => setSelectedDestination(null)}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-purple-100 hover:bg-purple-200 transition-colors text-purple-900 text-xs font-bold"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatsCard
                    title="LEAD TIME MÉDIO (EXPEDIÇÃO)"
                    value={leadTimeAverageFormatted}
                    icon={Clock}
                    description="Tempo médio desde a entrada até a saída."
                    variant="blue"
                />

                <StatsCard
                    title="NOTAS NO PÁTIO (RETIDAS)"
                    value={totalWaiting}
                    icon={Package}
                    description="Notas que entraram no período e aguardam saída."
                    variant={totalWaiting > 20 ? 'red' : 'green'}
                />

                <StatsCard
                    title="DESTINO MAIS FREQUENTE"
                    value={volumeByDestination[0]?.name || 'N/A'}
                    icon={Truck}
                    description={`${volumeByDestination[0]?.value || 0} envios registrados`}
                    variant="purple"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Area Chart: Entradas vs Saídas */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-slate-800">Fluxo Diário: Entradas vs Saídas</h3>
                        <p className="text-sm text-slate-500">Volume de notas processadas e saldo em pátio por dia.</p>
                    </div>

                    <div className="flex-1 w-full relative min-h-0">
                        {entriesVsExitsByDay.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={entriesVsExitsByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorPatio" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(val) => format(parseISO(val), 'dd/MM')}
                                        tick={{ fontSize: 12, fill: '#64748b' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />

                                    <Area type="monotone" dataKey="entradas" name="Entradas" stroke="#10b981" fillOpacity={1} fill="url(#colorEntradas)" strokeWidth={2} />
                                    <Area type="monotone" dataKey="saidas" name="Saídas" stroke="#9333ea" fillOpacity={1} fill="url(#colorSaidas)" strokeWidth={2} />
                                    <Area type="monotone" dataKey="patio" name="Saldo Pátio" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPatio)" strokeWidth={2} strokeDasharray="5 5" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <EmptyState title="Sem Dados" description="Não há histórico de movimentação no período." icon={AreaChart as any} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Pie Chart: Destino */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
                    <div className="mb-4 text-center">
                        <h3 className="text-lg font-bold text-slate-800">Volume por Destino</h3>
                        <p className="text-sm text-slate-500">Distribuição total despachada/recebida</p>
                    </div>
                    <div className="flex-1 min-h-0 relative">
                        {volumeByDestination.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={volumeByDestination}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                        onClick={(data) => setSelectedDestination(data.name === selectedDestination ? null : data.name)}
                                        className="cursor-pointer focus:outline-none"
                                    >
                                        {volumeByDestination.map((entry, index) => {
                                            const isSelected = selectedDestination === entry.name;
                                            const isFaded = selectedDestination && !isSelected;
                                            return (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={COLORS[index % COLORS.length]}
                                                    opacity={isFaded ? 0.3 : 1}
                                                    className="transition-opacity duration-300 hover:opacity-80 focus:outline-none"
                                                />
                                            );
                                        })}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        itemStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                                    />
                                    <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: '11px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <EmptyState title="Sem Destinos" description="Nenhum dado de destino encontrado no período." icon={PieChart as any} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Ranking de Tempo de Pátio */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Clock className="text-orange-500" />
                            Ranking de Retenção (Top 10 Tempo de Pátio)
                        </h3>
                        <p className="text-sm text-slate-500">Notas ativas/retidas que deram entrada até o limite do período analisado.</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 w-16">Pos</th>
                                <th className="px-6 py-4">Fornecedor / Destino</th>
                                <th className="px-6 py-4">Nota Fiscal</th>
                                <th className="px-6 py-4">Data/Hora Entrada</th>
                                <th className="px-6 py-4 text-right">Tempo Decorrido</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {waitingList.slice(0, 10).map((receipt, index) => {
                                const entryTime = parseISO(receipt.entry_at);
                                const now = new Date();
                                const diffInMinutes = differenceInMinutes(now, entryTime);

                                const h = Math.floor(diffInMinutes / 60);
                                const m = Math.floor(diffInMinutes % 60);
                                const formattedDiff = `${h}h ${m}m`;

                                return (
                                    <tr key={receipt.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-mono font-bold text-slate-400">
                                            #{index + 1}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{receipt.supplier}</div>
                                            <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                                <ArrowRight size={10} />
                                                {receipt.destination_farm?.nome || 'Não definido'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-slate-600 font-medium">
                                            {receipt.invoice_number}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {format(entryTime, 'dd/MM/yyyy HH:mm')}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-orange-600 font-mono">
                                            {formattedDiff}
                                        </td>
                                    </tr>
                                );
                            })}

                            {waitingList.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        Nenhuma retenção detectada para o período. ✨
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
