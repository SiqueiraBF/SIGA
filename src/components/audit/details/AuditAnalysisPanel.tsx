import { format, parseISO } from 'date-fns';
import { Scale } from 'lucide-react';
import type { AuditItem } from '../../../services/auditService';

interface AuditAnalysisPanelProps {
    analysis: AuditItem['analysis'];
}

/** Panel displaying the Nuntec technical analysis data. */
export function AuditAnalysisPanel({ analysis }: AuditAnalysisPanelProps) {
    return (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Scale className="text-slate-400" size={18} />
                <h4 className="font-bold text-slate-700 uppercase text-sm tracking-wide">Análise Técnica</h4>
            </div>

            {analysis ? (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-400 uppercase">ID Análise</label>
                            <p className="text-slate-600 text-sm">{analysis.id || '-'}</p>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-400 uppercase">Data/Hora Análise</label>
                            <p className="text-slate-800 font-medium">
                                {analysis.date ? format(parseISO(analysis.date), 'dd/MM/yyyy HH:mm') : '-'}
                            </p>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-400 uppercase">Temperatura</label>
                            <p className="text-slate-800 font-medium">{analysis.temperature.toFixed(2)} °C</p>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-400 uppercase">Densidade (Amb)</label>
                            <p className="text-slate-800 font-medium">{analysis.density.toFixed(4)}</p>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-400 uppercase">Densidade 20°C</label>
                            <p className="text-slate-800 font-medium">{analysis.density_20c?.toFixed(4) || '-'}</p>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-400 uppercase">Modo</label>
                            <p className="text-slate-500 text-sm">Observada</p>
                        </div>
                    </div>
                </div>
            ) : (
                <p className="text-sm text-slate-400">Sem análise vinculada</p>
            )}
        </div>
    );
}
