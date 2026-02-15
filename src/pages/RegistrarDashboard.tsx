import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardService, DashboardStats } from '../services/dashboardService';
import { PageHeader } from '../components/ui/PageHeader';
import { Package, Clock, CheckCircle2, AlertCircle, Calendar, Store, User } from 'lucide-react';
import { startOfMonth, endOfMonth, subMonths, format, subDays, differenceInCalendarDays, isBefore } from 'date-fns';

// Recharts
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

interface RegistrarDashboardProps {
  hideHeader?: boolean;
}

export function RegistrarDashboard({ hideHeader = false }: RegistrarDashboardProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedFarm, setSelectedFarm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });
  const [filterPeriod, setFilterPeriod] = useState('current_month');

  // Load Data
  useEffect(() => {
    loadStats();
  }, [dateRange, selectedFarm]);

  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getRequestStats(dateRange.start, dateRange.end, selectedFarm || undefined);
      setStats(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro desconhecido ao carregar dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (period: string) => {
    setFilterPeriod(period);
    const now = new Date();
    if (period === 'current_month') {
      setDateRange({ start: startOfMonth(now), end: endOfMonth(now) });
    } else if (period === 'last_month') {
      const last = subMonths(now, 1);
      setDateRange({ start: startOfMonth(last), end: endOfMonth(last) });
    } else if (period === 'last_30') {
      setDateRange({ start: subDays(now, 30), end: now });
    } else if (period === 'last_7') {
      setDateRange({ start: subDays(now, 7), end: now });
    }
  };

  // Colors
  const COLORS = {
    novo: '#22c55e', // green-500
    reativado: '#3b82f6', // blue-500
    existente: '#f59e0b', // amber-500
    correcao: '#ef4444', // red-500
    grid: '#e2e8f0', // slate-200
  };

  if (loading && !stats) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-red-600">
        <AlertCircle size={48} className="mb-4" />
        <h2 className="text-xl font-bold mb-2">Erro ao carregar dados</h2>
        <p className="bg-red-50 p-4 rounded-lg border border-red-200 font-mono text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 font-bold"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className={`${hideHeader ? 'p-0' : 'p-8'} space-y-8 bg-slate-50/50 min-h-screen`}>

      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {!hideHeader && (
          <PageHeader
            title="Dashboard de Cadastros"
            subtitle={
              selectedFarm
                ? `Filtrando por: ${stats?.charts.by_farm.find(f => f.id === selectedFarm)?.name || 'Filial Selecionada'}`
                : "Indicadores de performance e volume de solicitações"
            }
            icon={Package}
          />
        )}

        {selectedFarm && (
          <button
            onClick={() => setSelectedFarm(null)}
            className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors flex items-center gap-2"
          >
            Limpar Filtro de Filial X
          </button>
        )}

        <div className="bg-white p-1 rounded-lg border border-slate-200 inline-flex">
          {[
            { id: 'last_7', label: '7 Dias' },
            { id: 'current_month', label: 'Este Mês' },
            { id: 'last_month', label: 'Mês Passado' },
            { id: 'custom', label: 'Personalizado' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => handlePeriodChange(p.id)}
              className={`px-4 py-2 text-xs font-bold uppercase rounded-md transition-all ${filterPeriod === p.id
                ? 'bg-purple-100 text-purple-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Pickers */}
      {filterPeriod === 'custom' && (
        <div className="flex items-center justify-end gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase">De:</span>
            <input
              type="date"
              value={format(dateRange.start, 'yyyy-MM-dd')}
              onChange={(e) => e.target.value && setDateRange(prev => ({ ...prev, start: new Date(e.target.value + 'T00:00:00') }))}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Até:</span>
            <input
              type="date"
              value={format(dateRange.end, 'yyyy-MM-dd')}
              onChange={(e) => e.target.value && setDateRange(prev => ({ ...prev, end: new Date(e.target.value + 'T00:00:00') }))}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
        </div>
      )}

      {stats && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="Total de Solicitações"
              value={stats.overview.total_requests}
              subValue={`${stats.overview.total_items} Itens`}
              icon={Package}
              color="blue"
            />
            <KPICard
              title="Tempo Médio (SLA)"
              value={`${stats.overview.avg_sla_hours}h`}
              subValue="Aguardando → Finalizado"
              icon={Clock}
              color="purple"
            />
            <KPICard
              title="Taxa de Finalização"
              value={`${stats.overview.total_requests ? Math.round((stats.overview.finished_count / stats.overview.total_requests) * 100) : 0}%`}
              subValue={`${stats.overview.pending_count} Pendentes`}
              icon={CheckCircle2}
              color="green"
            />
            <KPICard
              title="Média Diária"
              value={(() => {
                // Determine the end date for calculation (don't count future days)
                const now = new Date();
                const calcEnd = isBefore(dateRange.end, now) ? dateRange.end : now;

                // Calculate elapsed days (inclusive)
                // If start > calcEnd (future range), default to 1 to avoid division by zero/negative
                const days = Math.max(1, differenceInCalendarDays(calcEnd, dateRange.start) + 1);

                return (stats.overview.total_requests / days).toFixed(1);
              })()}
              subValue={(() => {
                const now = new Date();
                const calcEnd = isBefore(dateRange.end, now) ? dateRange.end : now;
                const days = Math.max(1, differenceInCalendarDays(calcEnd, dateRange.start) + 1);
                return `${(stats.overview.total_items / days).toFixed(1)} Itens/Dia`;
              })()}
              icon={Calendar}
              color="amber"
            />
          </div>

          {/* Charts Row 1: Volume & Classification */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">

            {/* Volume por Dia */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Volume Diário (Solicitações)</h3>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.charts.daily_volume} style={{ outline: 'none' }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Line
                      name="Total Criado"
                      type="monotone"
                      dataKey="total"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      name="Finalizados"
                      type="monotone"
                      dataKey="finished"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                    />
                    <Line
                      name="Devolvidos"
                      type="monotone"
                      dataKey="returned"
                      stroke="#ef4444" // red-500
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Classificação */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Classificação dos Itens</h3>
              <div className="flex-1 w-full min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart style={{ outline: 'none' }}>
                    <Pie
                      data={stats.charts.by_classification}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.charts.by_classification.map((entry, index) => {
                        const key = (entry.name || '').toLowerCase();
                        let fill = '#94a3b8'; // default
                        if (key.includes('novo')) fill = COLORS.novo;
                        if (key.includes('reativado')) fill = COLORS.reativado;
                        if (key.includes('existente')) fill = COLORS.existente;
                        if (key.includes('corre') || key.includes('devo')) fill = COLORS.correcao;

                        return <Cell key={`cell-${index}`} fill={fill} strokeWidth={0} />;
                      })}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      formatter={(value) => <span className="text-xs font-bold text-slate-600 ml-1">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <span className="block text-2xl font-black text-slate-700">{stats.overview.total_items}</span>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Itens</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row 2: Priority, Farm, User */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Prioridade (Pizza) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[350px]">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6 flex items-center gap-2">
                <AlertCircle size={16} /> Por Prioridade
              </h3>
              <div className="flex-1 w-full min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart style={{ outline: 'none' }}>
                    <Pie
                      data={stats.charts.by_priority}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.charts.by_priority.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.name === 'Urgente' ? '#ef4444' : '#3b82f6'}
                          strokeWidth={0}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      formatter={(value) => <span className="text-xs font-bold text-slate-600 ml-1">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                  <div className="text-center">
                    <span className="block text-2xl font-black text-slate-700">
                      {stats.charts.by_priority.find(p => p.name === 'Urgente')?.value || 0}
                    </span>
                    <span className="block text-[10px] font-bold text-red-500 uppercase">Urgentes</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ranking Filiais (Bar Chart) - Compacted to 1 col */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[350px]">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6 flex items-center gap-2">
                <Store size={16} /> Por Filial
              </h3>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.charts.by_farm}
                    layout="vertical"
                    margin={{ left: 0, right: 30 }}
                    style={{ outline: 'none' }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={COLORS.grid} />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                      width={80}
                    />
                    <Tooltip
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar
                      dataKey="value"
                      radius={[0, 4, 4, 0]}
                      barSize={20}
                      label={{ position: 'right', fill: '#64748b', fontSize: 11, fontWeight: 'bold' }}
                    >
                      {stats.charts.by_farm.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={selectedFarm === entry.id ? '#4f46e5' : '#6366f1'}
                          opacity={selectedFarm && selectedFarm !== entry.id ? 0.3 : 1}
                          cursor="pointer"
                          onClick={() => setSelectedFarm(selectedFarm === entry.id ? null : entry.id)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ranking Usuários */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-[350px] overflow-hidden flex flex-col">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <User size={16} /> Top Solicitantes
              </h3>
              <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                {stats.charts.by_user.map((u, i) => (
                  <div key={i} className="flex items-center justify-between pb-3 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i < 3 ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                        {i + 1}
                      </div>
                      <span className="text-sm font-medium text-slate-700 truncate max-w-[150px]">{u.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs font-bold text-slate-700">{u.requests} Solicit.</span>
                      <span className="block text-[10px] text-slate-400">{u.items} Itens</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}

// Subcomponent: KPI Card
function KPICard({ title, value, subValue, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
  };

  const colorClass = colors[color] || 'bg-slate-50 text-slate-600';

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-start justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-3xl font-black text-slate-700 tracking-tight">{value}</h3>
        <p className="text-xs font-medium text-slate-400 mt-1">{subValue}</p>
      </div>
      <div className={`p-3 rounded-xl border ${colors}`}>
        <Icon size={24} />
      </div>
    </div>
  );
}
