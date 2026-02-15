import { useState, useEffect } from 'react';
import { X, Package, Calendar, User, ShoppingCart, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { stockService } from '../services/stockService';
import type { Material } from '../types';

interface StockHistoryModalProps {
    material: Material | null;
    onClose: () => void;
}

export function StockHistoryModal({ material, onClose }: StockHistoryModalProps) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (material) {
            loadHistory();
        }
    }, [material]);

    const loadHistory = async () => {
        if (!material) return;
        setLoading(true);
        try {
            const data = await stockService.getMaterialHistory(material.id);
            setHistory(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!material) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                    <div className="flex gap-4">
                        <div className="w-16 h-16 rounded-lg border border-slate-200 bg-white p-1 shrink-0">
                            {material.image_url ? (
                                <img src={material.image_url} className="w-full h-full object-cover rounded" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <Package size={24} />
                                </div>
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{material.name}</h2>
                            <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold text-xs">{material.unisystem_code}</span>
                                <span>{material.group_name} / {material.sub_group}</span>
                            </div>
                            <div className="mt-2 text-sm font-medium text-slate-700">
                                Estoque Atual: <span className="text-lg font-bold">{material.current_stock}</span> <span className="text-xs text-slate-400">{material.unit}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                        <X size={24} className="text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <Activity size={20} className="text-blue-600" /> Histórico de Movimentações
                    </h3>

                    {loading ? (
                        <div className="text-center py-10 text-slate-400">Carregando histórico...</div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <ShoppingCart size={40} className="mx-auto text-slate-300 mb-3" />
                            <p className="text-slate-500">Nenhuma movimentação registrada.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {history.map((item, idx) => (
                                <div key={idx} className="bg-white border border-slate-100 rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-shadow group">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 
                                            ${item.request.status === 'DELIVERED' ? 'bg-green-100 text-green-600' :
                                                item.request.status === 'CANCELED' ? 'bg-red-100 text-red-600' :
                                                    'bg-blue-100 text-blue-600'}`}>
                                            <ShoppingCart size={18} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-700">Solicitação #{item.request.friendly_id || item.request.id.slice(0, 6)}</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase
                                                    ${item.request.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                                        item.request.status === 'SEPARATED' ? 'bg-purple-100 text-purple-700' :
                                                            item.request.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                                                'bg-slate-100 text-slate-600'}`}>
                                                    {item.request.status}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                                                <span className="flex items-center gap-1"><Calendar size={12} /> {format(new Date(item.request.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                                                <span className="flex items-center gap-1"><User size={12} /> {item.request.requester?.nome}</span>
                                                <span>• {item.request.farm?.nome}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-slate-700">
                                            {item.quantity_requested} <span className="text-[10px] text-slate-400 font-normal">{material.unit}</span>
                                        </div>
                                        <div className="text-xs text-slate-400">Solicitado</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
