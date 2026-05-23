import { X, Truck, Calendar, MapPin, User, Package, Clock, Plus, Trash2, AlertCircle } from 'lucide-react';
import { GoodsExit, GoodsReceipt } from '../../types';
import { format, parseISO, formatDistance } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { goodsReceiptService } from '../../services/goodsReceiptService';

interface GoodsReceiptExitDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: { exit: GoodsExit, receipts: GoodsReceipt[] } | null;
    onUpdate?: () => void;
    isNested?: boolean;
}

export function GoodsReceiptExitDetailsModal({ isOpen, onClose, data, onUpdate, isNested }: GoodsReceiptExitDetailsModalProps) {
    const [currentReceipts, setCurrentReceipts] = useState<GoodsReceipt[]>([]);
    const [isAddingReceipt, setIsAddingReceipt] = useState(false);
    const [pendingReceipts, setPendingReceipts] = useState<GoodsReceipt[]>([]);
    const [loadingAdd, setLoadingAdd] = useState(false);

    useEffect(() => {
        if (data?.receipts) {
            setCurrentReceipts(data.receipts);
        }
    }, [data]);

    if (!isOpen || !data) return null;

    const { exit } = data;

    const handleRemoveReceipt = async (receiptId: string, invoiceNum: string) => {
        if (!confirm(`Deseja retirar a Nota Fiscal ${invoiceNum} desta expedição? Ela voltará para a lista de aguardando.`)) return;

        try {
            await goodsReceiptService.updateReceipt(receiptId, { exit_id: null, exit_at: null, driver_name: null, observation_exit: null });
            setCurrentReceipts(prev => prev.filter(r => r.id !== receiptId));
            if (onUpdate) onUpdate();
        } catch (error: any) {
            console.error(error);
            alert('Erro ao retirar nota: ' + error.message);
        }
    };

    const loadPendingReceipts = async () => {
        setLoadingAdd(true);
        try {
            const pending = await goodsReceiptService.getPendingReceipts();
            // Only same farm
            const filtered = pending.filter(r => r.destination_farm_id === exit.destination_farm_id);
            setPendingReceipts(filtered);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingAdd(false);
        }
    };

    const handleAddReceipt = async (receipt: GoodsReceipt) => {
        try {
            await goodsReceiptService.dispatchReceipts([receipt.id], exit);
            setCurrentReceipts(prev => [...prev, receipt]);
            setIsAddingReceipt(false);
            if (onUpdate) onUpdate();
        } catch (error: any) {
            console.error(error);
            alert('Erro ao incluir nota: ' + error.message);
        }
    };

    return (
        <div className={`fixed inset-0 ${isNested ? 'z-[70] bg-black/20' : 'z-50 bg-black/60 backdrop-blur-sm'} flex items-center justify-center p-4 animate-in fade-in duration-200`}>
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
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h4 className="text-lg font-bold text-slate-700">Notas Vinculadas</h4>
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{currentReceipts.length}</span>
                            </div>
                            <button
                                onClick={() => {
                                    setIsAddingReceipt(true);
                                    loadPendingReceipts();
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-lg transition-colors text-xs"
                            >
                                <Plus size={14} /> Incluir Nota
                            </button>
                        </div>

                        {isAddingReceipt && (
                            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 animate-in slide-in-from-top-2">
                                <div className="flex items-center justify-between mb-3">
                                    <h5 className="text-sm font-bold text-blue-800 flex items-center gap-2">
                                        <Package size={16} /> Selecione notas para incluir
                                    </h5>
                                    <button onClick={() => setIsAddingReceipt(false)} className="text-blue-400 hover:text-blue-600">
                                        <X size={18} />
                                    </button>
                                </div>
                                {loadingAdd ? (
                                    <div className="text-center py-4 text-xs text-blue-400">Buscando notas pendentes...</div>
                                ) : pendingReceipts.length === 0 ? (
                                    <div className="text-center py-4 text-xs text-slate-400 italic">Nenhuma outra nota pendente para este destino.</div>
                                ) : (
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-blue-200">
                                        {pendingReceipts.map(r => (
                                            <div key={r.id} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-blue-50 shadow-sm">
                                                <div>
                                                    <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                                        NF: {r.invoice_number}
                                                        {r.operation_type === 'CONSERTO' && (
                                                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700">CONSERTO</span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 uppercase tracking-tight">{r.supplier.toUpperCase()}</div>
                                                </div>
                                                <button
                                                    onClick={() => handleAddReceipt(r)}
                                                    className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm"
                                                    title="Incluir na Expedição"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3">Data Entrada</th>
                                        <th className="px-6 py-3">Fornecedor</th>
                                        <th className="px-6 py-3">Nota Fiscal</th>
                                        <th className="px-6 py-3">Tempo Decorrido</th>
                                        <th className="px-6 py-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {currentReceipts.map(item => {
                                        const entryDate = parseISO(item.entry_at);
                                        const exitDate = parseISO(exit.exit_date);
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-6 py-4 text-slate-600">
                                                    {format(entryDate, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-slate-700">
                                                    <div className="flex items-center gap-2">
                                                        {item.supplier.toUpperCase()}
                                                        {item.operation_type === 'CONSERTO' && (
                                                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700">CONSERTO</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-blue-600 font-medium">
                                                    {item.invoice_number}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 flex items-center gap-1.5">
                                                    <Clock size={14} className="text-slate-400" />
                                                    {formatDistance(exitDate, entryDate, { locale: ptBR })}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveReceipt(item.id, item.invoice_number);
                                                        }}
                                                        disabled={currentReceipts.length <= 1}
                                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:hidden"
                                                        title="Retirar da Expedição"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {currentReceipts.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                                                <AlertCircle size={32} className="mx-auto mb-2 opacity-20" />
                                                Expedição vazia. Por favor, inclua notas ou exclua a saída.
                                            </td>
                                        </tr>
                                    )}
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
