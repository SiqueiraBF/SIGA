import React, { useState, useMemo } from 'react';
import { DollarSign, ArrowDown, FileText, TrendingUp, Trophy, Calendar, Target, Users } from 'lucide-react';
import { Saving } from '../../services/savingService';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { format, subDays, startOfMonth, startOfYear, isAfter, parseISO, getYear, getMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SavingDashboardProps {
  savings: Saving[];
}

type PeriodFilter = '30D' | 'MONTH' | 'YEAR' | 'ALL';

const COLORS = ['#2563eb', '#3b82f6', '#a855f7', '#f59e0b', '#ec4899'];

export function SavingDashboard({ savings }: SavingDashboardProps) {
  const [period, setPeriod] = useState<PeriodFilter>('ALL');
  const [evolutionView, setEvolutionView] = useState<'TOTAL' | 'BUYER' | 'YEAR'>('TOTAL');

  // --- Filtragem por Período ---
  const filteredSavings = useMemo(() => {
    const now = new Date();
    return savings.filter(s => {
      if (period === 'ALL') return true;
      const date = parseISO(s.data);
      if (period === '30D') return isAfter(date, subDays(now, 30));
      if (period === 'MONTH') return isAfter(date, startOfMonth(now));
      if (period === 'YEAR') return isAfter(date, startOfYear(now));
      return true;
    });
  }, [savings, period]);

  // --- Cálculos de KPIs ---
  const totalSaving = filteredSavings.reduce((acc, curr) => acc + curr.saving, 0);
  const totalValorInicial = filteredSavings.reduce((acc, curr) => acc + curr.valor_inicial, 0);
  const totalValorFinal = filteredSavings.reduce((acc, curr) => acc + curr.valor_final, 0);
  const avgDesconto = totalValorInicial > 0 ? (totalSaving / totalValorInicial) * 100 : 0;
  
  const maiorSaving = filteredSavings.length > 0 
    ? Math.max(...filteredSavings.map(s => s.saving))
    : 0;

  // --- Dados para Gráfico: Evolução Mensal ---
  const evolutionData = useMemo(() => {
    if (evolutionView === 'YEAR') {
      const yearMonthMap: Record<number, Record<number, number>> = {};
      const yearSet = new Set<number>();
      
      filteredSavings.forEach(curr => {
        const date = parseISO(curr.data);
        const year = getYear(date);
        const month = getMonth(date); // 0-11
        
        yearSet.add(year);
        if (!yearMonthMap[month]) yearMonthMap[month] = {};
        if (!yearMonthMap[month][year]) yearMonthMap[month][year] = 0;
        yearMonthMap[month][year] += curr.saving;
      });

      const sortedYears = Array.from(yearSet).sort();
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      
      const data = monthNames.map((name, index) => {
        const point: any = { name };
        sortedYears.forEach(year => {
          point[year] = yearMonthMap[index]?.[year] || 0;
        });
        return point;
      });

      return { data, years: sortedYears, buyers: [] };
    }

    const months: Record<string, any> = {};
    const buyerSet = new Set<string>();

    filteredSavings.forEach(curr => {
      const date = parseISO(curr.data);
      const monthYear = format(date, 'MMM/yy', { locale: ptBR });
      
      if (!months[monthYear]) {
        months[monthYear] = { 
          name: monthYear, 
          totalSaving: 0, 
          totalInicial: 0, 
          totalFinal: 0,
          sortDate: date.getTime() 
        };
      }
      
      months[monthYear].totalSaving += curr.saving;
      months[monthYear].totalInicial += curr.valor_inicial;
      months[monthYear].totalFinal += curr.valor_final;
      
      const buyer = curr.comprador || 'Outros';
      buyerSet.add(buyer);
      if (!months[monthYear][buyer]) months[monthYear][buyer] = 0;
      months[monthYear][buyer] += curr.saving;
    });

    const buyers = Array.from(buyerSet).sort();
    const data = Object.values(months)
      .sort((a, b) => a.sortDate - b.sortDate)
      .map(m => {
        const fullMonth = { ...m };
        buyers.forEach(b => {
          if (fullMonth[b] === undefined) fullMonth[b] = 0;
        });
        return fullMonth;
      });

    return { data, buyers, years: [] };
  }, [filteredSavings, evolutionView]);

  // --- Dados para Gráfico: Top Compradores ---
  const buyerData = useMemo(() => {
    const grouped = filteredSavings.reduce((acc, curr) => {
      const buyer = curr.comprador || 'Não Informado';
      if (!acc[buyer]) acc[buyer] = 0;
      acc[buyer] += curr.saving;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5
  }, [filteredSavings]);

  // --- Dados para Gráfico: Top Fornecedores ---
  const supplierData = useMemo(() => {
    const grouped = filteredSavings.reduce((acc, curr) => {
      const supplier = curr.fornecedor?.razao_social || 'Desconhecido';
      if (!acc[supplier]) acc[supplier] = 0;
      acc[supplier] += curr.saving;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5
  }, [filteredSavings]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Filtros */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm w-fit">
        <Calendar size={16} className="text-slate-400 ml-2" />
        <span className="text-sm font-medium text-slate-600 mr-2">Período:</span>
        <div className="flex gap-1">
          <button
            onClick={() => setPeriod('30D')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${period === '30D' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Últimos 30 Dias
          </button>
          <button
            onClick={() => setPeriod('MONTH')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${period === 'MONTH' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Este Mês
          </button>
          <button
            onClick={() => setPeriod('YEAR')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${period === 'YEAR' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Este Ano
          </button>
          <button
            onClick={() => setPeriod('ALL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${period === 'ALL' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Todo o Período
          </button>
        </div>
      </div>

      {/* 5 KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* KPI 1: Saving Total */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full transition-transform group-hover:scale-125 opacity-50" />
          <div className="relative">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3 text-blue-600">
              <DollarSign size={20} />
            </div>
            <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Saving Total</p>
            <p className="text-2xl font-bold text-slate-800">
              {formatCurrency(totalSaving)}
            </p>
          </div>
        </div>

        {/* KPI 2: Média Desconto */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full transition-transform group-hover:scale-125 opacity-50" />
          <div className="relative">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3 text-blue-600">
              <ArrowDown size={20} />
            </div>
            <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Média Desconto</p>
            <p className="text-2xl font-bold text-slate-800">
              {avgDesconto.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* KPI 3: Total Negociações */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-50 rounded-full transition-transform group-hover:scale-125 opacity-50" />
          <div className="relative">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mb-3 text-purple-600">
              <FileText size={20} />
            </div>
            <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Negociações</p>
            <p className="text-2xl font-bold text-slate-800">
              {filteredSavings.length}
            </p>
          </div>
        </div>

        {/* KPI 4: Valor Final Gasto */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-slate-100 rounded-full transition-transform group-hover:scale-125 opacity-50" />
          <div className="relative">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mb-3 text-slate-600">
              <Target size={20} />
            </div>
            <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Valor Gasto</p>
            <p className="text-2xl font-bold text-slate-800">
              {formatCurrency(totalValorFinal)}
            </p>
          </div>
        </div>

        {/* KPI 5: Maior Negociação */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-50 rounded-full transition-transform group-hover:scale-125 opacity-50" />
          <div className="relative">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-3 text-amber-600">
              <Trophy size={20} />
            </div>
            <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Maior Saving</p>
            <p className="text-2xl font-bold text-slate-800">
              {formatCurrency(maiorSaving)}
            </p>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico 1: Evolução Mensal (Ocupa 2 colunas) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-blue-600" size={20} />
              <h3 className="text-lg font-bold text-slate-800">Evolução do Saving</h3>
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setEvolutionView('TOTAL')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${evolutionView === 'TOTAL' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Geral
                  </button>
                  <button
                    onClick={() => setEvolutionView('BUYER')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${evolutionView === 'BUYER' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Comprador
                  </button>
                  <button
                    onClick={() => setEvolutionView('YEAR')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${evolutionView === 'YEAR' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Anual
                  </button>
                </div>
          </div>
          
          <div className="h-[300px] w-full">
            {evolutionData.data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolutionData.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSaving" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickFormatter={(value) => `R$ ${value / 1000}k`}
                  />
                  <Tooltip 
                    formatter={(value: any, name: string | undefined) => [formatCurrency(Number(value)), name === 'totalSaving' ? 'Saving Total' : (name || '')]}
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      padding: '12px'
                    }}
                  />
                  
                  <Legend 
                    iconType="circle" 
                    verticalAlign="bottom" 
                    align="center"
                    height={36} 
                    wrapperStyle={{ 
                      paddingTop: '30px',
                      fontSize: '11px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }} 
                    formatter={(value) => {
                      if (value === 'totalSaving') return 'Saving';
                      return value;
                    }}
                  />
                  
                  {evolutionView === 'TOTAL' ? (
                    <Area 
                      name="totalSaving"
                      type="monotone" 
                      dataKey="totalSaving" 
                      stroke="#2563eb" 
                      strokeWidth={4} 
                      fillOpacity={1} 
                      fill="url(#colorSaving)" 
                      animationDuration={1500}
                    />
                  ) : evolutionView === 'BUYER' ? (
                    evolutionData.buyers.map((buyer, index) => (
                      <Area 
                        key={buyer} 
                        type="monotone" 
                        dataKey={buyer} 
                        stroke={COLORS[index % COLORS.length]} 
                        fill={COLORS[index % COLORS.length]} 
                        fillOpacity={0.15}
                        strokeWidth={3}
                        animationDuration={1000}
                        animationBegin={index * 100}
                      />
                    ))
                  ) : (
                    evolutionData.years.map((year, index) => (
                      <Area 
                        key={year} 
                        name={year.toString()}
                        type="monotone" 
                        dataKey={year} 
                        stroke={COLORS[index % COLORS.length]} 
                        fill={COLORS[index % COLORS.length]} 
                        fillOpacity={0.15}
                        strokeWidth={3}
                        animationDuration={1000}
                        animationBegin={index * 100}
                      />
                    ))
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">Sem dados no período</div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Top Fornecedores (Ocupa 1 coluna) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="text-amber-500" size={20} />
            <h3 className="text-lg font-bold text-slate-800">Top Fornecedores (R$)</h3>
          </div>
          <div className="h-[300px] w-full">
            {supplierData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={supplierData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {supplierData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(Number(value))}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">Sem dados no período</div>
            )}
          </div>
          {/* Legenda Customizada do PieChart */}
          <div className="mt-2 flex flex-col gap-2">
            {supplierData.map((entry, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-slate-600 truncate" title={entry.name}>{entry.name}</span>
                </div>
                <span className="font-bold text-slate-800 shrink-0">{formatCurrency(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico 3: Top Compradores (Ocupa as 3 colunas ou 2) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-3">
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="text-blue-500" size={20} />
            <h3 className="text-lg font-bold text-slate-800">Ranking de Compradores (Saving R$)</h3>
          </div>
          <div className="h-[300px] w-full">
            {buyerData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buyerData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `R$ ${val/1000}k`} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(Number(value))}
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={32}>
                    {buyerData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">Sem dados no período</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
