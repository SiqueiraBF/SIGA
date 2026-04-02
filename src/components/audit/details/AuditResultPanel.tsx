import { clsx } from 'clsx';
import type { AuditItem } from '../../../services/auditService';

interface AuditResultPanelProps {
    data: AuditItem;
}

/** Renders the dual result panels (Ambient Temp vs 20°C ANP) and the final difference footer. */
export function AuditResultPanel({ data }: AuditResultPanelProps) {
    const { analysis, volume, difference, differencePercent } = data;

    if (!analysis) return null;

    const ambientDiff = analysis.volume - volume;
    const ambientDiffPct = volume > 0 ? (ambientDiff / volume) * 100 : 0;
    const anpDiff = analysis.volume_20c != null ? analysis.volume_20c - volume : null;
    const anpDiffPct = analysis.volume_20c != null && volume > 0 ? (anpDiff! / volume) * 100 : null;

    return (
        <>
            {/* Result @ Ambient Temp */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                <h4 className="font-bold text-slate-700 text-sm">
                    Resultado à temperatura do combustível {analysis.temperature.toFixed(1)} ºC
                </h4>
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-sm text-slate-600">Volume:</span>
                        <span className="text-sm font-bold text-slate-800">
                            {analysis.volume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} L
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm text-slate-600">Diferença:</span>
                        <span className={clsx('text-sm font-bold', (ambientDiff < 0 && Math.abs(ambientDiffPct) > 0.6) ? 'text-red-600' : ambientDiff >= 0 ? 'text-green-600' : 'text-slate-600')}>
                            {ambientDiff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} L
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm text-slate-600">Divergência:</span>
                        <span className={clsx('text-sm font-bold', Math.abs(ambientDiffPct) > 0.6 ? 'text-red-600' : 'text-slate-600')}>
                            {ambientDiffPct.toFixed(2)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Result @ 20°C (ANP) */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                <h4 className="font-bold text-slate-700 text-sm">
                    Resultado à 20°C, resolução ANP n. 894/2022
                </h4>
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-sm text-slate-600">Volume:</span>
                        <span className="text-sm font-bold text-slate-800">
                            {analysis.volume_20c != null
                                ? analysis.volume_20c.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                                : '-'} L
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm text-slate-600">Diferença (vs NF):</span>
                        <span className={clsx('text-sm font-bold', (anpDiff != null && anpDiff < 0 && Math.abs(anpDiffPct || 0) > 0.6) ? 'text-red-600' : anpDiff != null && anpDiff >= 0 ? 'text-green-600' : 'text-slate-600')}>
                            {anpDiff != null ? anpDiff.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-'} L
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm text-slate-600">Divergência:</span>
                        <span className={clsx('text-sm font-bold', (anpDiffPct != null && Math.abs(anpDiffPct) > 0.6) ? 'text-red-600' : 'text-slate-600')}>
                            {anpDiffPct != null ? `${anpDiffPct.toFixed(2)}%` : '-'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Final Difference Footer */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between col-span-1 md:col-span-2">
                <div>
                    <h4 className="font-bold text-slate-700">Diferença Final</h4>
                    <p className="text-sm text-slate-500">Resultado do confronto (Físico - Nota)</p>
                </div>
                <div className="text-right">
                    <p className={clsx('text-3xl font-bold', (difference < 0 && Math.abs(differencePercent) > 0.6) ? 'text-red-600' : difference >= 0 ? 'text-green-600' : 'text-slate-800')}>
                        {difference > 0 ? '+' : ''}{difference.toLocaleString('pt-BR')} L
                    </p>
                    <p className={clsx('text-sm font-bold', Math.abs(differencePercent) > 0.6 ? 'text-red-600' : 'text-slate-500')}>
                        {differencePercent.toFixed(2)}%
                    </p>
                </div>
            </div>
        </>
    );
}
