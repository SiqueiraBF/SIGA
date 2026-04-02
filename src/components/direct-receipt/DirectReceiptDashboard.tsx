import React, { useState } from 'react';
import { useDirectReceiptDashboardMetrics, PeriodFilter } from '../../hooks/useDirectReceiptDashboardMetrics';
import StatsCard from '../ui/StatsCard';
import { Calendar, DollarSign, AlertTriangle, TrendingDown, MapPin, Building2, Clock, ArrowRight, Receipt, AlertOctagon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    BarChart,
    Bar,
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

export function DirectReceiptDashboard() {
    const [period, setPeriod] = useState<PeriodFilter>('7D');
    const [customStart, setCustomStart] = useState<string>('');
    const [customEnd, setCustomEnd] = useState<string>('');

    const parsedStart = customStart ? new Date(customStart + 'T00:00:00') : null;
    const parsedEnd = customEnd ? new Date(customEnd + 'T23:59:59') : null;

    const { data: metrics, isPending, isError } = useDirectReceiptDashboardMetrics(period, parsedStart, parsedEnd);

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
        totalCount,
        totalValueFormatted,
        volumeByFazenda,
        rankingLocais,
        avgDelayDays,
        topDelayed
    } = metrics;

    // Custom Tooltip for Bar Chart
    const CustomBarTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-100 text-sm">
                    <p className="font-bold text-slate-700 mb-1">{label}</p>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                        <span className="text-slate-500">Registros:</span>
                        <span className="font-bold text-slate-800">{payload[0].value}</span>
                    </div>
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
                    Painel de Fuga (Recebimento Direto)
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

            {/* Nova Linha: Resumo Principal (Decorated) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden relative">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                    <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
                        <div className="flex items-center gap-2 text-amber-500 font-bold mb-1">
                            <DollarSign size={20} />
                            Volume Financeiro em Fuga
                        </div>
                        <div className="text-4xl font-black text-slate-800 tracking-tight">
                            {totalValueFormatted}
                        </div>
                    </div>

                    <div className="hidden md:block w-px h-16 bg-slate-100"></div>

                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Impacto Financeiro</div>
                        <div className="text-sm text-slate-500 max-w-[200px]">Somatório de notas recebidas fora do fluxo padrão.</div>
                    </div>

                    <div className="hidden md:block w-px h-16 bg-slate-100"></div>

                    <div className="flex-1 flex flex-col items-center md:items-end text-center md:text-right">
                        <div className="flex items-center gap-2 text-red-500 font-bold mb-1">
                            <AlertOctagon size={20} />
                            Notas Irregulares (Total)
                        </div>
                        <div className="text-4xl font-extrabold text-slate-800">
                            {totalCount} <span className="text-base text-slate-500 font-medium">registros</span>
                        </div>
                    </div>
                </div>
                {/* Background Decorator */}
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-slate-50 rounded-full blur-3xl -z-0"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full blur-3xl opacity-50 -z-0"></div>
            </div>

            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatsCard
                    title="MÉDIA DE ATRASO (REGISTRO)"
                    value={`${avgDelayDays} dias`}
                    icon={Clock}
                    description="Diferença entre Emissão e Lançamento"
                    variant={avgDelayDays > 5 ? 'red' : 'orange'}
                />

                <StatsCard
                    title="SETOR MAIS FREQUENTE"
                    value={rankingLocais[0]?.name || 'N/A'}
                    icon={Building2}
                    description={`${rankingLocais[0]?.value || 0} fugas identificadas`}
                    variant="blue"
                />

                <StatsCard
                    title="FAZENDA MAIS EXPOSTA"
                    value={volumeByFazenda[0]?.name || 'N/A'}
                    icon={MapPin}
                    description={`${volumeByFazenda[0]?.value || 0} desvios de rota`}
                    variant="purple"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Bar Chart: Locais */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Ranking de Locais (Setores)</h3>
                            <p className="text-sm text-slate-500">Unidades que mais recebem mercadoria por vias não-padrão.</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 border border-blue-100 flex items-center justify-center">
                            <Building2 size={20} />
                        </div>
                    </div>

                    <div className="flex-1 w-full relative min-h-0">
                        {rankingLocais.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={rankingLocais} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fontSize: 11, fill: '#64748b' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <RechartsTooltip content={<CustomBarTooltip />} cursor={{ fill: '#f8fafc' }} />
                                    
                                    <Bar dataKey="value" name="Registros" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                         {rankingLocais.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <EmptyState title="Sem Dados" description="Não há registros de fuga no período." icon={BarChart as any} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Pie Chart: Fazendas */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
                    <div className="mb-4 text-center">
                        <h3 className="text-lg font-bold text-slate-800">Frequência por Fazenda</h3>
                        <p className="text-sm text-slate-500">Distribuição entre as unidades produtivas</p>
                    </div>
                    <div className="flex-1 min-h-0 relative">
                        {volumeByFazenda.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={volumeByFazenda}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                        className="cursor-default focus:outline-none"
                                    >
                                        {volumeByFazenda.map((entry, index) => {
                                            return (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={COLORS[index % COLORS.length]}
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
                                <EmptyState title="Sem Destinos" description="Nenhum dado de fazenda encontrado." icon={PieChart as any} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Ranking de Atraso */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <TrendingDown className="text-red-500" />
                            Atraso de Registro (Top 10 GAP Emissão-Lançamento)
                        </h3>
                        <p className="text-sm text-slate-500">Notas com maior diferença de dias entre emissão fiscal e registro no módulo.</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 w-16 text-center">Pos</th>
                                <th className="px-6 py-4">Fornecedor / Fazenda</th>
                                <th className="px-6 py-4">Nota Fiscal</th>
                                <th className="px-6 py-4">Responsável</th>
                                <th className="px-6 py-4">Data Emissão</th>
                                <th className="px-6 py-4">Registrado No Sistema</th>
                                <th className="px-6 py-4 text-right">Dias de Atraso</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {topDelayed.map((receipt, index) => {
                                const emissaoTime = new Date(receipt.data_emissao);
                                const registryTime = new Date(receipt.created_at);
                                const isCritical = receipt.delayDays > 10;
                                const isWarning = receipt.delayDays > 3 && receipt.delayDays <= 10;

                                return (
                                    <tr key={receipt.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-mono font-bold text-slate-400 text-center">
                                            #{index + 1}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800 uppercase">{receipt.fornecedor}</div>
                                            <div className="text-xs text-slate-500 font-medium flex items-center gap-1 uppercase">
                                                <ArrowRight size={10} />
                                                {receipt.fazenda?.nome || 'Não definido'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-slate-600 font-medium">
                                            {receipt.nota_fiscal}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-bold uppercase">
                                            {receipt.responsavel}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {format(emissaoTime, 'dd/MM/yyyy')}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {format(registryTime, 'dd/MM/yyyy HH:mm')}
                                            <div className="text-[10px] text-slate-400">por {receipt.usuario?.nome || 'Sistema'}</div>
                                        </td>
                                        <td className={`px-6 py-4 text-right font-black font-mono text-base ${isCritical ? 'text-red-600' : isWarning ? 'text-orange-500' : 'text-slate-600'}`}>
                                            {receipt.delayDays} <span className="text-xs font-medium">dias</span>
                                        </td>
                                    </tr>
                                );
                            })}

                            {topDelayed.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                        Nenhum registro encontrado no período.
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
