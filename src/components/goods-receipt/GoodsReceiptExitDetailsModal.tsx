import { X, Truck, Calendar, MapPin, User, Package, Clock } from 'lucide-react';
import { GoodsExit, GoodsReceipt } from '../../types';
import { format, parseISO, formatDistance } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GoodsReceiptExitDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: { exit: GoodsExit, receipts: GoodsReceipt[] } | null;
}

export function GoodsReceiptExitDetailsModal({ isOpen, onClose, data }: GoodsReceiptExitDetailsModalProps) {
    if (!isOpen || !data) return null;

    const { exit, receipts } = data;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Truck className="text-blue-600" size={24} />
                        Expedição Nº {exit.sequential_id}
                    </h3>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* Details Card */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Destino</div>
                            <div className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                <MapPin size={18} className="text-blue-500" />
                                {exit.destination_farm?.nome}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Data Saída</div>
                            <div className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                <Calendar size={18} className="text-blue-500" />
                                {format(parseISO(exit.exit_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Enviado por</div>
                            <div className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                <User size={18} className="text-green-600" />
                                {exit.driver_name}
                                {/* Note: User asked for "Enviado por", showing driver or Creator? 
                                    Screenshot implies Driver/Carrier name, but label says "Enviado por" (Sent by).
                                    Usually "Sent by" = User, but data shows "JOSE WILIAN ROSADO" which sounds like a person/driver.
                                    Let's show Driver Name here as consistent with screenshot "list".
                                    But maybe add "Registrado por" (User) as tooltip?
                                */}
                                <span className="text-xs text-slate-400 font-normal ml-1">
                                    (Reg. por {exit.creator?.nome || 'Sistema'})
                                </span>
                            </div>
                        </div>
                        {exit.observation && (
                            <div className="col-span-full pt-4 border-t border-slate-50 mt-2">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Observações</div>
                                <div className="text-slate-600 italic">"{exit.observation}"</div>
                            </div>
                        )}
                    </div>

                    {/* Linked Invoices (Notas Vinculadas) */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <h4 className="text-lg font-bold text-slate-700">Notas Vinculadas</h4>
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{receipts.length}</span>
                        </div>

                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3">Data Entrada</th>
                                        <th className="px-6 py-3">Fornecedor</th>
                                        <th className="px-6 py-3">Nota Fiscal</th>
                                        <th className="px-6 py-3">Tempo Decorrido</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {receipts.map(item => {
                                        const entryDate = parseISO(item.entry_at);
                                        const exitDate = parseISO(exit.exit_date);
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 text-slate-600">
                                                    {format(entryDate, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-slate-700">
                                                    {item.supplier}
                                                </td>
                                                <td className="px-6 py-4 text-blue-600 font-medium">
                                                    {item.invoice_number}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 flex items-center gap-1.5">
                                                    <Clock size={14} className="text-slate-400" />
                                                    {formatDistance(exitDate, entryDate, { locale: ptBR })}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg transition-colors shadow-sm"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}
