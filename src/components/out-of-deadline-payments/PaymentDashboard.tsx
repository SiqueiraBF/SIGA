import React, { useState, useMemo } from 'react';
import { Calendar, TrendingUp, DollarSign, AlertCircle, Building2, Briefcase, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { format, parseISO, subDays, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
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
import StatsCard from '../ui/StatsCard';
import { EmptyState } from '../ui/EmptyState';
import { OutOfDeadlinePayment } from '../../services/outOfDeadlinePaymentService';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

type PeriodFilter = '7D' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM';

interface PaymentDashboardProps {
  payments: OutOfDeadlinePayment[];
}

export function PaymentDashboard({ payments }: PaymentDashboardProps) {
  const [period, setPeriod] = useState<PeriodFilter>('THIS_MONTH');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [selectedMotivo, setSelectedMotivo] = useState<string | null>(null);

  // Filter Data By Period
  const filteredPayments = useMemo(() => {
    const today = new Date();
    let start: Date;
    let end: Date = today;

    if (period === '7D') {
      start = subDays(today, 7);
    } else if (period === 'THIS_MONTH') {
      start = startOfMonth(today);
      end = endOfMonth(today);
    } else if (period === 'LAST_MONTH') {
      const lastMonth = subDays(startOfMonth(today), 1);
      start = startOfMonth(lastMonth);
      end = endOfMonth(lastMonth);
    } else {
      start = customStart ? startOfDay(new Date(customStart + 'T00:00:00')) : new Date(2000, 0, 1);
      end = customEnd ? endOfDay(new Date(customEnd + 'T23:59:59')) : today;
    }

    return payments.filter(p => {
      const pDate = new Date(p.created_at);
      return isWithinInterval(pDate, { start, end });
    });
  }, [payments, period, customStart, customEnd]);

  // KPIs
  const totalLancamentos = filteredPayments.length;
  const valorTotal = filteredPayments.reduce((acc, curr) => acc + Number(curr.valor), 0);

  // Helper for counting frequencies
  const getMostFrequent = (arr: any[], key: string, nestedKey?: string) => {
    const counts = arr.reduce((acc, item) => {
      const val = nestedKey && item[key] ? item[key][nestedKey] : item[key];
      if (!val) return acc;
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const entries = (Object.entries(counts) as [string, number][]).sort((a, b) => b[1] - a[1]);
    return entries.length > 0 ? { name: entries[0][0], count: entries[0][1] } : { name: 'N/A', count: 0 };
  };

  const setorCampeao = getMostFrequent(filteredPayments, 'setor');
  const fazendaCampeao = getMostFrequent(filteredPayments, 'fazenda', 'nome');
  
  // Distribuicao por Motivo (Pie Chart)
  const distribuicaoMotivo = useMemo(() => {
    const counts = filteredPayments.reduce((acc, item) => {
      const val = item.motivo || 'Outros';
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredPayments]);

  const motivoMaisComum = distribuicaoMotivo.length > 0 ? distribuicaoMotivo[0] : { name: 'N/A', value: 0 };

  // Fluxo Diario (Area Chart)
  const fluxoDiario = useMemo(() => {
    const dailyData = filteredPayments.reduce((acc, item) => {
      const date = item.created_at.split('T')[0];
      if (!acc[date]) acc[date] = { date, quantidade: 0, valor: 0 };
      acc[date].quantidade += 1;
      acc[date].valor += Number(item.valor);
      return acc;
    }, {} as Record<string, { date: string; quantidade: number; valor: number }>);

    return Object.values(dailyData).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredPayments]);

  // Ranking Fornecedores
  const rankingFornecedores = useMemo(() => {
    const grouped = filteredPayments.reduce((acc, item) => {
      const f = item.fornecedor || 'Desconhecido';
      if (!acc[f]) acc[f] = { fornecedor: f, total_notas: 0, valor_total: 0 };
      acc[f].total_notas += 1;
      acc[f].valor_total += Number(item.valor);
      return acc;
    }, {} as Record<string, { fornecedor: string; total_notas: number; valor_total: number }>);

    return Object.values(grouped).sort((a, b) => b.total_notas - a.total_notas);
  }, [filteredPayments]);

  // Custom Tooltips
  const CustomTooltipArea = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100 text-sm">
          <p className="font-bold text-slate-700 mb-2">{format(parseISO(label), 'dd/MM/yyyy')}</p>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            <span className="text-slate-500">Quantidade:</span>
            <span className="font-bold text-slate-800">{payload[0]?.value}</span>
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
          <Calendar className="text-teal-500" size={20} />
          Painel Analítico de Atrasos
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(['7D', 'THIS_MONTH', 'LAST_MONTH', 'CUSTOM'] as PeriodFilter[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
                  period === p
                    ? 'bg-white text-teal-600 shadow-sm'
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
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              <span className="text-slate-400">até</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Resumo de Movimentação */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden relative">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center gap-2 text-rose-600 font-bold mb-1">
              <AlertCircle size={20} />
              Total de Autorizações
            </div>
            <div className="text-4xl font-extrabold text-slate-800">
              {totalLancamentos} <span className="text-base text-slate-500 font-medium">guias/notas</span>
            </div>
          </div>

          <div className="hidden md:block w-px h-16 bg-slate-100"></div>

          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Impacto Financeiro</div>
            <div className="text-sm text-slate-500 max-w-[200px]">Volume financeiro total processado fora do prazo.</div>
          </div>

          <div className="hidden md:block w-px h-16 bg-slate-100"></div>

          <div className="flex-1 flex flex-col items-center md:items-end text-center md:text-right">
            <div className="flex items-center gap-2 text-teal-600 font-bold mb-1">
              <DollarSign size={20} />
              Valor Total Autorizado
            </div>
            <div className="text-4xl font-extrabold text-slate-800">
              <span className="text-2xl text-slate-500 font-medium mr-1">R$</span>
              {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
        {/* Background Decorator */}
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-teal-50 rounded-full blur-3xl -z-0"></div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title="SETOR MAIS FREQUENTE"
          value={setorCampeao.name}
          icon={Briefcase}
          description={`${setorCampeao.count} solicitações neste período`}
          variant="blue"
        />

        <StatsCard
          title="MOTIVO RECORRENTE"
          value={
            <span
              className={motivoMaisComum.name.length > 15 ? 'text-xl' : ''}
            >
              {motivoMaisComum.name}
            </span>
          }
          icon={TrendingUp}
          description={`${motivoMaisComum.value} ocorrências`}
          variant={motivoMaisComum.value > 5 ? 'red' : 'green'}
        />

        <StatsCard
          title="FAZENDA / UNIDADE"
          value={fazendaCampeao.name}
          icon={Building2}
          description={`${fazendaCampeao.count} solicitações`}
          variant="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Chart: Evolução Diária */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-800">Evolução Diária de Autorizações</h3>
            <p className="text-sm text-slate-500">Volume de solicitações criadas por dia.</p>
          </div>

          <div className="flex-1 w-full relative min-h-0">
            {fluxoDiario.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fluxoDiario} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorQuantidade" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <RechartsTooltip content={<CustomTooltipArea />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />

                  <Area type="monotone" dataKey="quantidade" name="Quantidade Lançada" stroke="#10b981" fillOpacity={1} fill="url(#colorQuantidade)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <EmptyState title="Sem Dados" description="Não há histórico de lançamentos no período." icon={AreaChart as any} />
              </div>
            )}
          </div>
        </div>

        {/* Pie Chart: Motivos */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
          <div className="mb-4 text-center">
            <h3 className="text-lg font-bold text-slate-800">Distribuição de Motivos</h3>
            <p className="text-sm text-slate-500">Principais causas de atraso</p>
          </div>
          <div className="flex-1 min-h-0 relative">
            {distribuicaoMotivo.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribuicaoMotivo}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    onClick={(data) => setSelectedMotivo(data.name === selectedMotivo ? null : data.name)}
                    className="cursor-pointer focus:outline-none"
                  >
                    {distribuicaoMotivo.map((entry, index) => {
                      const isSelected = selectedMotivo === entry.name;
                      const isFaded = selectedMotivo && !isSelected;
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
                <EmptyState title="Sem Motivos" description="Nenhum dado encontrado." icon={PieChart as any} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ranking de Fornecedores */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="text-rose-500" />
              Ranking de Fornecedores Recorrentes (Top 10)
            </h3>
            <p className="text-sm text-slate-500">Fornecedores com maior volume de lançamentos fora do prazo.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-16">Pos</th>
                <th className="px-6 py-4">Fornecedor</th>
                <th className="px-6 py-4 text-center">Quantidade de Notas</th>
                <th className="px-6 py-4 text-right">Volume Total (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rankingFornecedores.slice(0, 10).map((item, index) => (
                <tr key={index} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-slate-400">
                    #{index + 1}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{item.fornecedor}</div>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-slate-600">
                    {item.total_notas}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-rose-600">
                    R$ {item.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}

              {rankingFornecedores.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    Nenhum fornecedor registrado no período. ✨
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
