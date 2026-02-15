import { useState, useEffect } from 'react';
import { X, Save, CheckCircle, Package, AlertTriangle, FileSpreadsheet, Mail } from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { stockService } from '../services/stockService';
import { EMAIL_CONFIG } from '../config';
import { useAuth } from '../context/AuthContext';
import type { StockRequest, StockRequestItem } from '../types';

interface StockSeparationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (finishedRequest?: StockRequest) => void;
    request: StockRequest;
}

export function StockSeparationModal({ isOpen, onClose, onSave, request }: StockSeparationModalProps) {
    const { user, role } = useAuth();
    const [items, setItems] = useState<StockRequestItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [expandedImage, setExpandedImage] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && request) {
            loadItems();
        }
    }, [isOpen, request]);

    const loadItems = async () => {
        setLoading(true);
        try {
            const data = await stockService.getItems(request.id);
            setItems(data);
        } catch (err) {
            console.error(err);
            alert("Erro ao carregar itens");
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = () => {
        if (items.length === 0) return;

        const exportData = items.map(item => ({
            'Código': item.material?.unisystem_code,
            'Produto': item.material?.name,
            'Unidade': item.material?.unit,
            'Estoque Atual': item.material?.current_stock || 0,
            'Qtd Solicitada': item.quantity_requested,
            'Qtd Separada': '', // Em branco para preenchimento manual
        }));

        const ws = utils.json_to_sheet(exportData);

        // Ajuste de largura das colunas
        const wscols = [
            { wch: 10 }, // Cod
            { wch: 40 }, // Produto
            { wch: 6 },  // Unit
            { wch: 15 }, // Est Atual
            { wch: 15 }, // Qtd Sol
            { wch: 15 }, // Qtd Sep (Blank)
        ];
        ws['!cols'] = wscols;

        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Separação");
        writeFile(wb, `Separacao_${request.friendly_id || request.id.slice(0, 8)}.xlsx`);
    };

    const handleSendEmail = () => {
        const idDisplay = request.friendly_id ? `#${request.friendly_id}` : request.id.slice(0, 8);
        const subject = `[Transferência] Solicitação ${idDisplay} - ${request.fazenda?.nome}`;

        const bodyItems = items.map(i =>
            `- ${i.material?.name || 'Item'} (${i.material?.unisystem_code || '-'}): ${i.quantity_separated || 0} ${i.material?.unit || 'un'}`
        ).join('%0D%0A');

        const body = `Olá,%0D%0A%0D%0ASegue confirmação dos itens separados para a solicitação ${idDisplay}.%0D%0A%0D%0AItens:%0D%0A${bodyItems}%0D%0A%0D%0AAtenciosamente,%0D%0A${user?.nome}`;

        // Recipients
        const recipientsList = [...EMAIL_CONFIG.DEFAULT_RECIPIENTS];
        if (EMAIL_CONFIG.INCLUDE_REQUESTER && request.usuario?.email) {
            recipientsList.push(request.usuario.email);
        }
        const recipients = recipientsList.join(',');

        window.open(`mailto:${recipients}?subject=${subject}&body=${body}`);
    };

    const handleQuantityChange = (itemId: string, qty: number) => {
        setItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, quantity_separated: qty } : item
        ));
    };

    const handleStatusChange = (itemId: string, status: 'PENDING' | 'CONFIRMED' | 'UNAVAILABLE') => {
        setItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, status } : item
        ));
    };

    const handleSave = async (finish: boolean) => {
        // Validação ao finalizar
        if (finish) {
            const pendingItems = items.filter(i => i.status === 'PENDING');
            if (pendingItems.length > 0) {
                return alert(`Ainda existem ${pendingItems.length} itens com status Pendente. Defina se foram ATENDIDOS ou INDISPONÍVEIS.`);
            }
        }

        if (!confirm(finish ? "Finalizar separação? O solicitante será notificado." : "Salvar progresso?")) return;

        setSaving(true);
        try {
            // 1. Update all items
            await Promise.all(items.map(async (item) => {
                await stockService.updateItemSeparation(item.id, item.quantity_separated ?? item.quantity_requested, item.status);

                // If item is confirmed and we are finishing, update last_exit_date
                if (finish && item.status === 'CONFIRMED') {
                    await stockService.updateMaterialLastExit(item.material_id, new Date().toISOString());
                }
            }));

            // 2. Update Request Status if finishing
            if (finish) {
                // Pass separator ID (current user)
                await stockService.updateRequestStatus(request.id, 'SEPARATED', user?.id);
            } else {
                await stockService.updateRequestStatus(request.id, 'SEPARATING');
            }

            alert(finish ? "Separação concluída!" : "Progresso salvo!");
            onSave(finish ? { ...request, status: 'SEPARATED' } : undefined);
            onClose();
        } catch (err: any) {
            alert("Erro ao salvar: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Package className="text-blue-600" />
                            Separação de Pedido {request.friendly_id ? `#${request.friendly_id}` : request.id.slice(0, 8)}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Solicitante: <strong>{request.usuario?.nome}</strong> • {request.fazenda?.nome}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors"><X size={24} className="text-slate-400" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loading ? (
                        <div className="text-center py-10 text-slate-400">Carregando itens...</div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase">
                                <tr>
                                    <th className="px-4 py-3">Item</th>
                                    <th className="px-4 py-3 text-center">Solicitado</th>
                                    <th className="px-4 py-3 text-center">Estoque Atual</th>
                                    <th className="px-4 py-3 text-center">Separado</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {item.material?.image_url ? (
                                                    <img
                                                        src={item.material.image_url}
                                                        className="w-10 h-10 rounded object-cover border border-slate-100 cursor-zoom-in hover:scale-150 transition-transform origin-left z-10"
                                                        onClick={() => setExpandedImage(item.material?.image_url || null)}
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-slate-300"><Package size={20} /></div>
                                                )}
                                                <div>
                                                    <div className="font-bold text-slate-700">{item.material?.name}</div>
                                                    <div className="text-xs text-slate-400">{item.material?.unisystem_code}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="font-bold text-lg text-slate-800">{item.quantity_requested}</span>
                                            <span className="text-xs text-slate-400 ml-1">{item.material?.unit}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`font-bold ${(item.material?.current_stock || 0) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                {item.material?.current_stock}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <input
                                                type="number"
                                                className="w-20 text-center font-bold border border-slate-200 rounded-lg py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={item.quantity_separated ?? item.quantity_requested}
                                                onChange={(e) => handleQuantityChange(item.id, Number(e.target.value))}
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => handleStatusChange(item.id, item.status === 'CONFIRMED' ? 'PENDING' : 'CONFIRMED')}
                                                    className={`p-1.5 rounded transition-colors ${item.status === 'CONFIRMED' ? 'bg-green-100 text-green-700 ring-2 ring-green-500 ring-offset-1' : 'text-slate-300 hover:bg-green-50 hover:text-green-600'}`}
                                                    title="Confirmar"
                                                >
                                                    <CheckCircle size={20} />
                                                </button>
                                                <button
                                                    onClick={() => handleStatusChange(item.id, item.status === 'UNAVAILABLE' ? 'PENDING' : 'UNAVAILABLE')}
                                                    className={`p-1.5 rounded transition-colors ${item.status === 'UNAVAILABLE' ? 'bg-red-100 text-red-700 ring-2 ring-red-500 ring-offset-1' : 'text-slate-300 hover:bg-red-50 hover:text-red-600'}`}
                                                    title="Indisponível"
                                                >
                                                    <AlertTriangle size={20} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between gap-3">
                    <button
                        onClick={handleExportExcel}
                        className="px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 flex items-center gap-2"
                        title="Baixar Tabela de Separação"
                    >
                        <FileSpreadsheet size={18} /> <span className="hidden sm:inline">Imprimir Separação</span>
                    </button>

                    {/* Email Button - Admin Only for Separated Requests */}
                    {request.status === 'SEPARATED' && (role?.nome === 'Administrador' || user?.nome === 'Administrador') && (
                        <button
                            onClick={handleSendEmail}
                            className="px-4 py-3 bg-blue-50 text-blue-600 border border-blue-100 font-bold rounded-xl hover:bg-blue-100 flex items-center gap-2 transition-colors"
                            title="Enviar por Email"
                        >
                            <Mail size={18} /> <span className="hidden sm:inline">Enviar Email</span>
                        </button>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={() => handleSave(false)}
                            className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
                            disabled={saving}
                        >
                            Salvar Progresso
                        </button>
                        <button
                            onClick={() => handleSave(true)}
                            className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-200 flex items-center gap-2 disabled:opacity-50"
                            disabled={saving}
                        >
                            <CheckCircle size={18} /> Finalizar Separação
                        </button>
                    </div>
                </div>

                {/* Image Expansion Modal */}
                {expandedImage && (
                    <div
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-8 animate-in fade-in duration-200"
                        onClick={() => setExpandedImage(null)}
                    >
                        <button
                            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                            onClick={() => setExpandedImage(null)}
                        >
                            <X size={48} />
                        </button>
                        <img
                            src={expandedImage}
                            className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
