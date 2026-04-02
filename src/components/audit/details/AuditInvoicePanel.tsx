import { format, parseISO } from 'date-fns';
import { Truck } from 'lucide-react';
import type { AuditItem } from '../../../services/auditService';

interface AuditInvoicePanelProps {
    data: AuditItem;
}

/** Panel displaying the Nota Fiscal (Goods Receipt Entry) data. */
export function AuditInvoicePanel({ data }: AuditInvoicePanelProps) {
    return (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Truck className="text-slate-400" size={18} />
                <h4 className="font-bold text-slate-700 uppercase text-sm tracking-wide">Nota Fiscal (Entrada)</h4>
            </div>

            <div className="space-y-3">
                <div className="grid grid-cols-1 gap-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase">Fornecedor</label>
                    <p className="text-slate-800 font-medium truncate">{data.analysis?.supplier_name || 'Não Identificado'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-400 uppercase">Nota Fiscal</label>
                        <p className="text-slate-800 font-medium">{data.invoiceNumber}</p>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-400 uppercase">Volume Total NF</label>
                        <p className="text-slate-800 font-medium">{data.volume.toLocaleString('pt-BR')} L</p>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-400 uppercase">ID (Entrada)</label>
                        <p className="text-slate-600 text-sm">
                            {data.groupedSupplies && data.groupedSupplies.length > 1
                                ? 'Múltiplos'
                                : data.groupedSupplies && data.groupedSupplies.length === 1
                                    ? data.groupedSupplies[0].id
                                    : data.id || '-'}
                        </p>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-400 uppercase">Data/Hora Emissão</label>
                        <p className="text-slate-800 font-medium">
                            {data.date ? format(parseISO(data.date), 'dd/MM/yyyy HH:mm') : '-'}
                        </p>
                    </div>
                </div>

                {/* Grouped Supplies Breakdown */}
                {data.groupedSupplies && data.groupedSupplies.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                        <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1 mb-2">
                            Composição do Volume ({data.groupedSupplies.length} itens)
                        </label>
                        <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-100 text-slate-500 font-medium">
                                    <tr>
                                        <th className="px-3 py-2">ID</th>
                                        <th className="px-3 py-2">NF</th>
                                        <th className="px-3 py-2 text-right">Vol (L)</th>
                                        <th className="px-3 py-2 text-right">Data</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {data.groupedSupplies.map((supply, idx) => (
                                        <tr key={`${supply.id}-${idx}`}>
                                            <td className="px-3 py-2 font-mono text-xs text-slate-500">{supply.id}</td>
                                            <td className="px-3 py-2 font-medium text-slate-700">{supply.invoiceNumber}</td>
                                            <td className="px-3 py-2 text-right">{supply.volume.toLocaleString('pt-BR')}</td>
                                            <td className="px-3 py-2 text-right text-slate-500">
                                                {supply.date ? format(parseISO(supply.date), 'dd/MM HH:mm') : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
