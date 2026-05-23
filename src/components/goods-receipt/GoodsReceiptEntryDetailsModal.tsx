import { X, Calendar, MapPin, User, Package, FileText, Truck, Clock, CheckCircle2, ExternalLink } from 'lucide-react';
import { GoodsReceipt } from '../../types';
import { format, parseISO, formatDistance } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { goodsReceiptService } from '../../services/goodsReceiptService';
import { GoodsReceiptExitDetailsModal } from './GoodsReceiptExitDetailsModal';

interface GoodsReceiptEntryDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    receipt: GoodsReceipt | null;
}

export function GoodsReceiptEntryDetailsModal({ isOpen, onClose, receipt }: GoodsReceiptEntryDetailsModalProps) {
    const [isExitModalOpen, setIsExitModalOpen] = useState(false);
    const [exitData, setExitData] = useState<{ exit: any, receipts: any[] } | null>(null);
    const [loadingExit, setLoadingExit] = useState(false);

    if (!isOpen || !receipt) return null;

    const handleViewExit = async () => {
        if (!receipt?.exit_id) return;
        setLoadingExit(true);
        try {
            const details = await goodsReceiptService.getExitDetails(receipt.exit_id);
            setExitData(details);
            setIsExitModalOpen(true);
        } catch (error) {
            console.error(error);
            alert('Erro ao carregar detalhes da expedição.');
        } finally {
            setLoadingExit(false);
        }
    };

    const entryDate = parseISO(receipt.entry_at);
    const exitDate = receipt.exit_at ? parseISO(receipt.exit_at) : (receipt.exit ? parseISO(receipt.exit.exit_date) : null);
    
    // Calculate dwell time
    const timeRef = exitDate || new Date();
    const dwellTime = formatDistance(timeRef, entryDate, { locale: ptBR });
    const isExited = !!exitDate;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Package className="text-blue-600" size={24} />
                        Detalhes do Recebimento
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Status Banner */}
                    <div className={`p-4 rounded-xl flex items-center justify-between ${isExited ? 'bg-green-50' : 'bg-orange-50'}`}>
                        <div className="flex items-center gap-3">
                            {isExited ? (
                                <CheckCircle2 size={24} className="text-green-600" />
                            ) : (
                                <Clock size={24} className="text-orange-600" />
                            )}
                            <div>
                                <div className={`font-bold ${isExited ? 'text-green-800' : 'text-orange-800'}`}>
                                    {isExited ? 'Despachado' : 'Aguardando Saída'}
                                </div>
                                <div className={`text-sm ${isExited ? 'text-green-600' : 'text-orange-600'}`}>
                                    Tempo de permanência: <span className="font-semibold">{dwellTime}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Data Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Fornecedor</div>
                            <div className="font-semibold text-slate-800 flex items-center gap-2">
                                {receipt.supplier.toUpperCase()}
                                {receipt.operation_type === 'CONSERTO' && (
                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700">CONSERTO</span>
                                )}
                            </div>
                        </div>
                        
                        <div className="space-y-1">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Destino</div>
                            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                <MapPin size={16} className="text-blue-500" />
                                {receipt.destination_farm?.nome}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Documentos</div>
                            <div className="flex flex-col gap-1 text-sm text-slate-700">
                                <span className="flex items-center gap-1.5 font-medium"><FileText size={14} className="text-slate-400"/> NF: {receipt.invoice_number}</span>
                                {receipt.order_number && (
                                    <span className="flex items-center gap-1.5"><FileText size={14} className="text-slate-400"/> Pedido: {receipt.order_number}</span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Recebido Por</div>
                            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                <User size={16} className="text-green-600" />
                                {receipt.receiver?.nome}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Entrada</div>
                            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                <Calendar size={16} className="text-slate-400" />
                                {format(entryDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </div>
                        </div>

                        {isExited && (
                            <div className="space-y-1">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Saída / Expedição</div>
                                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                    <Truck size={16} className="text-slate-400" />
                                    {format(exitDate!, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5 ml-5 flex items-center flex-wrap gap-1">
                                    <span>Motorista: {receipt.exit?.driver_name || receipt.driver_name}</span>
                                    {receipt.exit?.sequential_id && (
                                        <button 
                                            onClick={handleViewExit}
                                            disabled={loadingExit}
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded transition-colors font-medium ml-1 disabled:opacity-50"
                                            title="Ver detalhes da expedição"
                                        >
                                            Exp. #{receipt.exit.sequential_id}
                                            <ExternalLink size={10} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {receipt.observation_entry && (
                        <div className="pt-4 border-t border-slate-100">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Observações da Entrada</div>
                            <div className="text-sm text-slate-600 italic p-3 bg-slate-50 rounded-lg">
                                "{receipt.observation_entry}"
                            </div>
                        </div>
                    )}
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

            <GoodsReceiptExitDetailsModal
                isOpen={isExitModalOpen}
                onClose={() => setIsExitModalOpen(false)}
                data={exitData}
                isNested={true}
            />
        </div>
    );
}
