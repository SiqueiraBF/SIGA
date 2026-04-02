import type { AuditItem } from '../../../services/auditService';

interface AuditCargoPanelProps {
    analysis: AuditItem['analysis'];
}

/** Panel displaying cargo weighing data (gross, tare, net weight, ticket). */
export function AuditCargoPanel({ analysis }: AuditCargoPanelProps) {
    return (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <h4 className="font-bold text-slate-700 uppercase text-sm tracking-wide">Carga (Pesagem)</h4>
            </div>
            {analysis ? (
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-sm text-slate-500 font-medium">Peso Bruto Total:</span>
                        <span className="text-sm text-slate-800 font-bold">
                            {analysis.gross_weight != null ? analysis.gross_weight.toLocaleString('pt-BR') : '-'} kg
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm text-slate-500 font-medium">Tara:</span>
                        <span className="text-sm text-slate-800 font-bold">
                            {analysis.tare != null ? analysis.tare.toLocaleString('pt-BR') : '-'} kg
                        </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-2">
                        <span className="text-sm text-slate-700 font-bold">Peso Líquido:</span>
                        <span className="text-sm text-blue-700 font-bold">
                            {analysis.net_weight != null ? analysis.net_weight.toLocaleString('pt-BR') : '-'} kg
                        </span>
                    </div>
                    <div className="flex justify-between pt-2">
                        <span className="text-sm text-slate-500 font-medium">Número do Ticket:</span>
                        <span className="text-sm text-slate-800">{analysis.ticket_number || 'Não especificado'}</span>
                    </div>
                </div>
            ) : (
                <p className="text-sm text-slate-400">Sem dados de pesagem</p>
            )}
        </div>
    );
}
