import { Droplet, Scale, AlertOctagon } from 'lucide-react';
import { clsx } from 'clsx';
import React from 'react';

interface AuditStatsCardsProps {
    stats: {
        totalVolume: number;
        analysisCoverage: number;
        totalAnalyzed: number;
        totalDifference: number;
    }
}

export function AuditStatsCards({ stats }: AuditStatsCardsProps) {
    const coverageIsLow = stats.analysisCoverage < 90;
    const differenceIsNegative = stats.totalDifference < -100;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-in fade-in duration-300">
            {/* DT-06: Applied Glassmorphism + Teal accent token */}
            <KPICard
                title="Volume Total Recebido"
                value={`${stats.totalVolume.toLocaleString('pt-BR')} L`}
                icon={<Droplet className="text-teal-600" size={24} />}
                iconBg="bg-teal-50"
                subtext="Baseado nas Notas Fiscais (Filtro Atual)"
            />
            <KPICard
                title="% Com Análise Vinculada"
                value={`${stats.analysisCoverage.toFixed(1)}%`}
                icon={<Scale className={coverageIsLow ? 'text-yellow-600' : 'text-teal-600'} size={24} />}
                iconBg={coverageIsLow ? 'bg-yellow-50' : 'bg-teal-50'}
                subtext={`${stats.totalAnalyzed} análises encontradas`}
                status={coverageIsLow ? 'warning' : 'neutral'}
            />
            <KPICard
                title="Volume Acumulado de Quebra"
                value={`${stats.totalDifference.toLocaleString('pt-BR')} L`}
                icon={<AlertOctagon className={differenceIsNegative ? 'text-red-600' : 'text-slate-400'} size={24} />}
                iconBg={differenceIsNegative ? 'bg-red-50' : 'bg-slate-100'}
                subtext="Diferença total (Físico vs NF)"
                status={differenceIsNegative ? 'negative' : 'neutral'}
            />
        </div>
    );
}

interface KPICardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    iconBg: string;
    subtext: string;
    status?: 'neutral' | 'negative' | 'warning';
}

function KPICard({ title, value, icon, iconBg, subtext, status = 'neutral' }: KPICardProps) {
    return (
        // DT-06: Glassmorphism — bg-white/80 + backdrop-blur + border with opacity
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-200/70 flex items-start justify-between transition-transform hover:-translate-y-0.5 duration-200">
            <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                <h3 className={clsx(
                    'text-2xl font-bold',
                    status === 'negative' ? 'text-red-600' :
                        status === 'warning' ? 'text-yellow-600' :
                            'text-slate-800'
                )}>
                    {value}
                </h3>
                <p className="text-xs text-slate-400 mt-2">{subtext}</p>
            </div>
            <div className={clsx('p-3 rounded-lg', iconBg)}>{icon}</div>
        </div>
    );
}
