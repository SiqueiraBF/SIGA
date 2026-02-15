import { useState, useEffect, useRef } from 'react';
import { X, Save, Send, Search, Package, Plus, Trash2, AlertTriangle, ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { stockService } from '../services/stockService';
import { db } from '../services/supabaseService';
import { notificationService } from '../services/notificationService';
import type { Material, StockRequest, Fazenda } from '../types';

interface StockRequestFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    requestId?: string | null;
}

export function StockRequestForm({ isOpen, onClose, onSave, requestId }: StockRequestFormProps) {
    const { user, role } = useAuth();

    // State
    const [loading, setLoading] = useState(false);
    const [request, setRequest] = useState<StockRequest | null>(null);
    const [items, setItems] = useState<{
        material: Material;
        qty: number;
        id?: string;
        quantity_separated?: number;
        status?: string
    }[]>([]);
    const [farmName, setFarmName] = useState('');

    // Item Form State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Material[]>([]);
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [quantity, setQuantity] = useState<number>(1);
    const [notes, setNotes] = useState('');

    // Image State
    const [expandedImage, setExpandedImage] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (requestId) {
                loadRequest(requestId);
            } else {
                resetForm();
            }
            loadFarm();
        }
    }, [isOpen, requestId]);

    // Debounced Search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.length > 2) {
                stockService.getMaterials(searchQuery).then(setSearchResults);
            } else {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const loadFarm = async () => {
        if (user?.fazenda_id) {
            const f = await db.getFarm(user.fazenda_id);
            if (f) setFarmName(f.nome);
        }
    };

    const loadRequest = async (id: string) => {
        setLoading(true);
        try {
            const [reqData, itemsData] = await Promise.all([
                stockService.getRequestById(id),
                stockService.getItems(id)
            ]);

            if (reqData) {
                setRequest(reqData);
                setNotes(reqData.notes || '');
                // Map DB items to Form items
                setItems(itemsData.map(i => ({
                    material: i.material as Material,
                    qty: i.quantity_requested,
                    id: i.id,
                    quantity_separated: i.quantity_separated,
                    status: i.status
                })));
            }
        } catch (err) {
            console.error(err);
            alert("Erro ao carregar");
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setRequest(null);
        setItems([]);
        setSearchQuery('');
        setSelectedMaterial(null);
        setQuantity(1);
        setNotes('');
    };

    // Computed Permissions
    const isAdmin = role?.nome === 'Administrador' || user?.nome === 'Administrador';
    const isOwner = !request || user?.id === request.requester_id;

    // User can edit if it's their request and status is DRAFT or PENDING
    // Admin can edit permissions? Requirement says "requester only". But assume Admin can always override or just use "Reopen".
    // Let's strictly follow: "solicitante só pode editar os seus propios e se o formulario estiver com status pendente"
    const canEdit = !request || (isOwner && (request.status === 'DRAFT' || request.status === 'PENDING'));

    // Re-fetch items helper
    const refreshItems = async (reqId: string) => {
        const dbItems = await stockService.getItems(reqId);
        setItems(dbItems.map(i => ({
            material: i.material as Material,
            qty: i.quantity_requested,
            id: i.id,
            quantity_separated: i.quantity_separated,
            status: i.status
        })));
    };

    const handleAddItem = async () => {
        if (!selectedMaterial) return;
        if (quantity <= 0) return alert("Quantidade deve ser maior que zero");
        if (!user) return;

        // Prevent adding duplicate (check locally)
        if (items.some(i => i.material.id === selectedMaterial.id)) return alert("Item já adicionado na lista");

        setLoading(true);
        try {
            let currentRequest = request;

            // 1. Create Draft if doesn't exist
            if (!currentRequest) {
                currentRequest = await stockService.createRequest(
                    user.fazenda_id || '',
                    user.id,
                    notes
                );
                setRequest(currentRequest);
            }

            // 2. Add Item to DB
            await stockService.addItem(currentRequest.id, selectedMaterial.id, quantity);

            // 3. Refresh State
            await refreshItems(currentRequest.id);

            // 4. Reset Inputs
            setSelectedMaterial(null);
            setSearchQuery('');
            setQuantity(1);
        } catch (err: any) {
            alert("Erro ao salvar item: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveItem = async (index: number) => {
        const item = items[index];
        if (!item.id) return; // Should not happen if persisted

        if (!confirm("Remover este item?")) return;

        setLoading(true);
        try {
            await stockService.removeItem(item.id);
            if (request) {
                await refreshItems(request.id);
            } else {
                // Fallback for local (shouldn't reach here with new logic)
                setItems(items.filter((_, i) => i !== index));
            }
        } catch (err) {
            console.error(err);
            alert("Erro ao remover item");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!request) return alert("Adicione itens antes de enviar");
        if (items.length === 0) return alert("Adicione pelo menos um item");

        if (!confirm("Confirmar envio da solicitação?")) return;

        setLoading(true);
        try {
            // Update Notes one last time? 
            // We assume notes are passed during creation. If changed, we might need an updateRequest (not implemented yet for generic fields).
            // For now, assume notes were correct or update status.

            await stockService.updateRequestStatus(request.id, 'PENDING');
            alert("Requisição enviada com sucesso!");
            onSave();
            onClose();
        } catch (err: any) {
            alert("Erro ao enviar: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleReopen = async () => {
        if (!request) return;
        if (!confirm("Deseja reabrir esta requisição? Ela voltará para o status PENDENTE.")) return;

        setLoading(true);
        try {
            await stockService.updateRequestStatus(request.id, 'PENDING');
            // Refresh
            const updated = await stockService.getRequestById(request.id);
            setRequest(updated);
            alert("Requisição reaberta para PENDENTE!");
        } catch (err) {
            alert("Erro ao reabrir");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!request) return;

        const isDraft = request.status === 'DRAFT';
        const msg = isDraft
            ? "Deseja EXCLUIR este rascunho permanentemente?"
            : "Tem certeza que deseja excluir esta requisição? Esta ação não pode ser desfeita.";

        if (!confirm(msg)) return;

        setLoading(true);
        try {
            await stockService.deleteRequest(request.id);
            alert("Requisição excluída!");
            onSave(); // Trigger refresh in parent
            onClose();
        } catch (err: any) {
            alert("Erro ao excluir: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Package className="text-blue-600" />
                            {request?.friendly_id ? `Requisição #${request.friendly_id}` : 'Nova Requisição'}
                            {request && (
                                <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wide
                                    ${request.status === 'DRAFT' ? 'bg-slate-200 text-slate-600' :
                                        request.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                            request.status === 'SEPARATING' ? 'bg-blue-100 text-blue-700' :
                                                request.status === 'SEPARATED' ? 'bg-purple-100 text-purple-700' :
                                                    request.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                                        'bg-gray-100'}`}>
                                    {request.status === 'DRAFT' ? 'Rascunho' :
                                        request.status === 'PENDING' ? 'Pendente' :
                                            request.status === 'SEPARATING' ? 'Em Separação' :
                                                request.status === 'SEPARATED' ? 'Separado' :
                                                    request.status === 'DELIVERED' ? 'Entregue' :
                                                        request.status === 'CANCELED' ? 'Cancelado' :
                                                            request.status}
                                </span>
                            )}
                        </h2>
                        <div className="flex gap-4 mt-1 text-sm text-slate-500">
                            <span><strong>Solicitante:</strong> {request?.usuario?.nome || user?.nome}</span>
                            <span><strong>Filial:</strong> {farmName}</span>
                            {request?.separator && (
                                <span className="text-purple-600"><strong>Separado por:</strong> {request.separator.nome}</span>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors"><X size={24} className="text-slate-400" /></button>
                </div>

                {/* Body */}
                <div className="flex-1 flex overflow-hidden">

                    {/* Left: Item Selection (Disabled if !canEdit) */}
                    <div className={`w-1/3 border-r border-slate-100 p-6 flex flex-col bg-slate-50/50 ${!canEdit ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm uppercase">
                            <Plus size={16} /> Adicionar Item
                        </h3>

                        {/* ... Search Logic ... */}
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar item (nome ou código)..."
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                disabled={!canEdit}
                            />

                            {/* Email Button - Admin Only for Separated Requests */}
                            {searchResults.length > 0 && searchQuery && !selectedMaterial && canEdit && (
                                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 shadow-xl rounded-lg mt-1 max-h-60 overflow-y-auto z-50 divide-y divide-slate-100">
                                    {searchResults.map(mat => (
                                        <button
                                            key={mat.id}
                                            onClick={() => { setSelectedMaterial(mat); setSearchResults([]); setSearchQuery(mat.name); }}
                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                                        >
                                            {/* ... (Image Rendering same) ... */}
                                            {mat.image_url ? (
                                                <div className="w-8 h-8 rounded shrink-0 overflow-hidden border border-slate-100 cursor-zoom-in">
                                                    <img src={mat.image_url} className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400"><ImageIcon size={14} /></div>
                                            )}
                                            <div>
                                                <div className="text-xs font-bold text-slate-700">{mat.name}</div>
                                                <div className="text-[10px] text-slate-500">Cod: {mat.unisystem_code} • Estoque: {mat.current_stock} {mat.unit}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedMaterial && (
                            <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                                {/* ... Material Details ... */}
                                <div className="flex gap-4 mb-4">
                                    {selectedMaterial.image_url ? (
                                        <div className="w-20 h-20 rounded-lg shrink-0 overflow-hidden border border-slate-100">
                                            <img src={selectedMaterial.image_url} className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-20 h-20 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100">
                                            <ImageIcon size={32} />
                                        </div>
                                    )}
                                    <div>
                                        <h4 className="font-bold text-sm text-slate-800 line-clamp-2">{selectedMaterial.name}</h4>
                                        <div className="mt-2 text-xs font-medium text-slate-600">
                                            Disponível: <strong>{selectedMaterial.current_stock} {selectedMaterial.unit}</strong>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-end gap-3">
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Quantidade</label>
                                        <input
                                            type="number"
                                            min="0.1"
                                            step="0.1"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-center font-bold"
                                            value={quantity}
                                            onChange={e => setQuantity(Number(e.target.value))}
                                        />
                                    </div>
                                    <button
                                        onClick={handleAddItem}
                                        disabled={loading}
                                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                                    >
                                        {loading ? '...' : 'Adicionar'}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="mt-auto pt-6">
                            <label className="block text-xs font-bold text-slate-500 mb-2">Observação Geral</label>
                            <textarea
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm h-24 resize-none"
                                placeholder={canEdit ? "Alguma observação para o pedido?" : "Sem observações"}
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                disabled={!canEdit && notes !== '' /* If viewing, typically readonly */}
                                readOnly={!canEdit}
                            />
                        </div>
                    </div>

                    {/* Right: List */}
                    <div className="flex-1 flex flex-col bg-white">
                        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500 uppercase">Itens do Pedido ({items.length})</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {items.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                                    <Package size={64} className="mb-4 stroke-1" />
                                    <p>Sua lista está vazia</p>
                                </div>
                            ) : (
                                items.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-4 p-3 border border-slate-100 rounded-xl hover:border-blue-100 hover:shadow-sm transition-all group">
                                        <div className="w-10 h-10 rounded bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden">
                                            {item.material.image_url ?
                                                <img
                                                    src={item.material.image_url}
                                                    className="w-full h-full object-cover cursor-zoom-in hover:scale-110 transition-transform"
                                                    onClick={() => setExpandedImage(item.material.image_url || null)}
                                                /> :
                                                <Package size={20} className="text-slate-300" />
                                            }
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-bold text-slate-700">{item.material.name}</div>
                                            <div className="text-xs text-slate-400">{item.material.unisystem_code}</div>

                                            {/* Quantity Separated and Status Display */}
                                            {request?.status === 'SEPARATED' && item.quantity_separated !== undefined && (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                                                        SEPARADO: {item.quantity_separated} {item.material.unit}
                                                    </span>
                                                    {item.status && (
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border 
                                                            ${item.status === 'CONFIRMED' ? 'text-green-700 bg-green-50 border-green-100' :
                                                                item.status === 'UNAVAILABLE' ? 'text-red-700 bg-red-50 border-red-100' :
                                                                    'text-slate-500 bg-slate-100 border-slate-200'}`}>
                                                            {item.status === 'CONFIRMED' ? 'CONFIRMADO' :
                                                                item.status === 'UNAVAILABLE' ? 'INDISPONÍVEL' :
                                                                    item.status}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-slate-800">{item.qty} <span className="text-[10px] text-slate-400 font-normal">{item.material.unit}</span></div>
                                            {/* Label "Solicitado" just to be clear if showing separated as well */}
                                            {request?.status === 'SEPARATED' && (
                                                <div className="text-[10px] text-slate-400">Solicitado</div>
                                            )}
                                        </div>
                                        {canEdit && (
                                            <button onClick={() => handleRemoveItem(idx)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center z-10">

                            {/* Left Side: Secondary Actions */}
                            <div className="flex gap-3">
                                <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg text-sm hover:bg-slate-50 transition-colors disabled:opacity-50">
                                    Fechar
                                </button>

                                {(request?.status === 'DRAFT' || isAdmin) && (
                                    <button
                                        onClick={handleDelete}
                                        className="px-4 py-2 bg-white border border-red-200 text-red-600 font-semibold rounded-lg text-sm hover:bg-red-50 transition-colors flex items-center gap-2"
                                    >
                                        <Trash2 size={16} />
                                        {request?.status === 'DRAFT' ? 'Excluir Rascunho' : 'Excluir'}
                                    </button>
                                )}
                            </div>

                            {/* Right Side: Primary Actions */}
                            <div className="flex gap-3">
                                {/* Reopen - Admin */}
                                {isAdmin && request && request.status !== 'DRAFT' && request.status !== 'PENDING' && (
                                    <button
                                        onClick={handleReopen}
                                        className="px-5 py-2 bg-yellow-100 text-yellow-700 font-bold rounded-lg text-sm hover:bg-yellow-200 transition-colors flex items-center gap-2"
                                        title="Reabrir requisição"
                                    >
                                        <AlertTriangle size={16} /> Reabrir
                                    </button>
                                )}

                                {/* Email - Admin/Sep */}
                                {request?.status === 'SEPARATED' && (role?.nome === 'Administrador' || user?.nome === 'Administrador') && (
                                    <button
                                        onClick={async () => {
                                            if (!confirm('Deseja enviar o e-mail de notificação?')) return;
                                            setLoading(true);
                                            try {
                                                await notificationService.sendStockRequestReport(
                                                    request,
                                                    items.filter(i => i.quantity_separated && i.quantity_separated > 0),
                                                    user?.email,
                                                    user?.nome
                                                );
                                                alert('E-mail enviado!');
                                            } catch (err) {
                                                alert('Erro ao enviar e-mail.');
                                            } finally {
                                                setLoading(false);
                                            }
                                        }}
                                        disabled={loading}
                                        className="px-5 py-2 bg-blue-100 text-blue-700 font-bold rounded-lg text-sm hover:bg-blue-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <Send size={16} /> {loading ? 'Enviando...' : 'Notificar Email'}
                                    </button>
                                )}

                                {/* Main Action */}
                                {canEdit && (
                                    <button
                                        onClick={handleSubmit}
                                        disabled={loading || items.length === 0}
                                        className="px-5 py-2 bg-green-600 text-white font-bold rounded-lg text-sm hover:bg-green-700 shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {loading ? 'Processando...' : (
                                            <>
                                                <Send size={16} /> {request ? (request.status === 'PENDING' ? 'Salvar Alterações' : 'Finalizar Requisição') : 'Enviar Requisição'}
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

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
            )
            }
        </div >
    );
}
