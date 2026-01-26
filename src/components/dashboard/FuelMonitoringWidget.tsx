import React from 'react';
import { Fuel, AlertTriangle, Clock, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';

interface StationHealth {
    id: string;
    nome: string;
    currentStock: number;
    capacity: number;
    percentage: number;
    autonomyDays?: number;
    lastMeasurement?: string;
    status: 'ok' | 'warning' | 'critical';
}

interface FuelMonitoringWidgetProps {
    stations: StationHealth[];
}

export function FuelMonitoringWidget({ stations }: FuelMonitoringWidgetProps) {
    if (!stations || stations.length === 0) {
        return (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[500px]">
                <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-6">
                    <Fuel size={18} className="text-slate-400" />
                    Monitoramento de Combustível
                </h3>
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                        <Fuel size={24} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-medium text-slate-400">Sem postos integrados</p>
                    <p className="text-xs text-slate-300 mt-1 text-center px-4">
                        Configure o ID Nuntec nos seus postos físicos para ver o monitoramento aqui.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[500px] hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <Fuel size={18} className="text-slate-400" />
                    Monitoramento de Combustível
                </h3>
                <Link
                    to="/postos"
                    className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    Ver Todos
                </Link>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 -mr-1 space-y-2">
                {stations.map((s) => {
                    // Determine Status Color logic similar to StationCard
                    let statusDotColor = 'bg-slate-300';
                    let statusText = 'Sem dados';

                    if (s.lastMeasurement) {
                        // Simplify logic for widget: 
                        // < 24h = Green (Em Dia)
                        // < 48h = Amber (Atenção)
                        // > 48h = Red (Atrasado)
                        const lastDate = new Date(s.lastMeasurement);
                        const hoursDiff = (new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60);

                        if (hoursDiff < 24) {
                            statusDotColor = 'bg-green-500';
                            statusText = 'Em Dia';
                        } else if (hoursDiff < 48) {
                            statusDotColor = 'bg-amber-500';
                            statusText = 'Atenção';
                        } else {
                            statusDotColor = 'bg-red-500';
                            statusText = 'Atrasado';
                        }
                    }

                    // Bar Color Logic
                    let barColor = 'bg-blue-600';
                    if (s.percentage < 10) barColor = 'bg-red-500';
                    else if (s.percentage < 20) barColor = 'bg-amber-500';
                    else barColor = 'bg-green-500';

                    return (
                        <div key={s.id} className="py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors -mx-2 px-2 rounded-lg group/item">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-700 line-clamp-1 truncate max-w-[140px]" title={s.nome}>
                                        {s.nome}
                                    </h4>

                                    <div className="flex items-center gap-2 mt-1">
                                        {/* Status Dot */}
                                        <div className="flex items-center gap-1.5" title={`Última medição: ${s.lastMeasurement ? new Date(s.lastMeasurement).toLocaleDateString() : 'N/A'}`}>
                                            <div className={`w-2 h-2 rounded-full ${statusDotColor}`}></div>
                                            <span className="text-[10px] font-medium text-slate-400">{statusText}</span>
                                        </div>

                                        {s.autonomyDays !== undefined && (
                                            <>
                                                <span className="text-[10px] text-slate-300">•</span>
                                                <div className={`flex items-center gap-1 text-[10px] uppercase font-bold tracking-tight ${s.autonomyDays < 3 ? 'text-amber-500' : 'text-slate-400'
                                                    }`}>
                                                    ~{s.autonomyDays} dias
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="text-sm font-bold text-slate-800">
                                        {s.currentStock.toLocaleString()} L
                                    </div>
                                    <div className="text-[10px] text-slate-400 -mt-0.5">
                                        de {s.capacity.toLocaleString()} L
                                    </div>
                                </div>
                            </div>

                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-1000 ${barColor}`}
                                    style={{ width: `${s.percentage}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
