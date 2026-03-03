import { useState, useEffect } from 'react';
import { X, Save, Send, Search, Package, Plus, Trash2, AlertTriangle, ImageIcon, Calendar, User, MapPin, FileText, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { stockService } from '../services/stockService';
import { db } from '../services/supabaseService';
import { notificationService } from '../services/notificationService';
import type { Material, StockRequest } from '../types';

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

    // Farm Logic
    const [fazendas, setFazendas] = useState<{ id: string; nome: string }[]>([]);
    const [selectedFazendaId, setSelectedFazendaId] = useState('');

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
            loadFazendas();
            if (requestId) {
                loadRequest(requestId);
            } else {
                resetForm();
            }
        }
    }, [isOpen, requestId, user]);

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

    const loadFazendas = async () => {
        try {
            const { supabase } = await import('../lib/supabase');
            const { data } = await supabase.from('fazendas').select('id, nome').eq('ativo', true).order('nome');
            if (data) setFazendas(data);
        } catch (err) {
            console.error(err);
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
                setSelectedFazendaId(reqData.farm_id);
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
        setSelectedFazendaId(user?.fazenda_id || '');
    };

    // Computed Permissions
    const isAdmin = role?.nome === 'Administrador' || user?.nome === 'Administrador';
    const isOwner = !request || user?.id === request.requester_id;
    const canEditAll = isAdmin || role?.permissoes?.gestao_transferencias?.edit_scope === 'ALL';
    const canEditOwn = canEditAll || role?.permissoes?.gestao_transferencias?.edit_scope === 'OWN_ONLY';
    const canConfirm = isAdmin || role?.permissoes?.gestao_transferencias?.can_confirm;
    const canManageNotifications = isAdmin || role?.permissoes?.gestao_transferencias?.manage_notifications;

    // The user can only modify the form (add/remove items, change farm) if it's a DRAFT or a NEW request.
    const canAccessRow = canEditAll || (canEditOwn && isOwner);
    const canEdit = !request || (canAccessRow && request.status === 'DRAFT');

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
        if (!selectedFazendaId) return alert("Selecione a Filial antes de adicionar itens.");

        // Prevent adding duplicate (check locally)
        if (items.some(i => i.material.id === selectedMaterial.id)) return alert("Item já adicionado na lista");

        setLoading(true);
        try {
            let currentRequest = request;

            // 1. Create Draft if doesn't exist
            if (!currentRequest) {
                currentRequest = await stockService.createRequest(
                    selectedFazendaId,
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
        if (!confirm("Deseja reabrir esta requisição? Ela voltará para o status RASCUNHO, permitindo que você edite os itens novamente.")) return;

        setLoading(true);
        try {
            await stockService.updateRequestStatus(request.id, 'DRAFT');
            // Refresh
            const updated = await stockService.getRequestById(request.id);
            setRequest(updated);
            alert("Requisição reaberta para RASCUNHO!");
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
            <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">

                {/* --- HEADER FULL WIDTH --- */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0 bg-white z-20">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-xl font-bold text-slate-800">
                                {request?.friendly_id ? `Requisição #${request.friendly_id}` : 'Nova Requisição'}
                            </h2>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${request?.status === 'DRAFT' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                request?.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                    request?.status === 'SEPARATING' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                        request?.status === 'SEPARATED' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                            request?.status === 'DELIVERED' ? 'bg-green-50 text-green-700 border-green-200' :
                                                'bg-slate-100 text-slate-600 border-slate-200'
                                }`}>
                                {request ? (
                                    request.status === 'DRAFT' ? 'Rascunho' :
                                        request.status === 'PENDING' ? 'Pendente' :
                                            request.status === 'SEPARATING' ? 'Em Separação' :
                                                request.status === 'SEPARATED' ? 'Separado' :
                                                    request.status === 'DELIVERED' ? 'Entregue' :
                                                        request.status === 'CANCELED' ? 'Cancelado' :
                                                            request.status
                                ) : 'NOVA'}
                            </span>
                        </div>
                        <p className="text-sm text-slate-500">Prencha os dados e adicione os itens solicitados</p>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* --- BODY --- */}
                <div className="flex flex-1 overflow-hidden">

                    {/* Sidebar - Context Data */}
                    <div className="w-[320px] shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
                        <div className="p-6 space-y-6">

                            {/* Context Headline */}
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                                <AlertCircle size={12} /> Contexto
                            </div>

                            <div className="space-y-4">
                                {/* Data */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                                        <Calendar size={12} /> DATA
                                    </label>
                                    <div className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-lg text-sm font-medium text-slate-600 select-none">
                                        {request?.created_at
                                            ? new Date(request.created_at).toLocaleDateString('pt-BR')
                                            : new Date().toLocaleDateString('pt-BR')}
                                    </div>
                                </div>

                                {/* Solicitante */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                                        <User size={12} /> SOLICITANTE
                                    </label>
                                    <div className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-lg text-sm font-medium text-slate-600 select-none">
                                        {request?.usuario?.nome || user?.nome}
                                    </div>
                                </div>

                                {/* Filial (DropDown) */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                                        <MapPin size={12} /> FILIAL *
                                    </label>
                                    <select
                                        value={selectedFazendaId}
                                        onChange={(e) => setSelectedFazendaId(e.target.value)}
                                        disabled={!!request} // Lock if request exists
                                        className={`w-full px-4 py-3 border rounded-lg text-sm font-medium outline-none transition-all ${!!request
                                            ? 'bg-slate-50 border-slate-100 text-slate-500 cursor-not-allowed'
                                            : 'bg-white border-slate-200 text-slate-700 focus:ring-2 focus:ring-blue-500'
                                            }`}
                                    >
                                        <option value="">Selecione a Filial...</option>
                                        {fazendas.map(f => (
                                            <option key={f.id} value={f.id}>{f.nome}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                                        <FileText size={12} /> OBSERVAÇÕES
                                    </label>
                                    <textarea
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm min-h-[120px] resize-none text-slate-600"
                                        placeholder={canEdit ? "Observações gerais..." : "Sem observações"}
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        readOnly={!canEdit}
                                    />
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col bg-slate-50/50 relative overflow-hidden">

                        {/* Add Item Section */}
                        {canEdit && (
                            <div className="p-6 bg-white border-b border-slate-100 shadow-sm z-10">
                                <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm uppercase">
                                    <Plus size={16} className="text-blue-500" /> Adicionar Item
                                </h3>

                                <div className="flex gap-4">
                                    {/* Search */}
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Buscar produto por nome ou código..."
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            disabled={!canEdit}
                                        />

                                        {/* Search Results Dropdown */}
                                        {searchResults.length > 0 && searchQuery && !selectedMaterial && canEdit && (
                                            <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 shadow-xl rounded-xl mt-1 max-h-80 overflow-y-auto z-50 divide-y divide-slate-100">
                                                {searchResults.map(mat => (
                                                    <button
                                                        key={mat.id}
                                                        onClick={() => { setSelectedMaterial(mat); setSearchResults([]); setSearchQuery(mat.name); }}
                                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 transition-colors group"
                                                    >
                                                        {mat.image_url ? (
                                                            <div className="w-10 h-10 rounded-lg shrink-0 overflow-hidden border border-slate-100 bg-white">
                                                                <img src={mat.image_url} className="w-full h-full object-cover" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400"><ImageIcon size={16} /></div>
                                                        )}
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{mat.name}</div>
                                                            <div className="text-xs text-slate-500">
                                                                Cod: {mat.unisystem_code} <span className="mx-1">•</span> Estoque: <span className="font-bold text-slate-700">{mat.current_stock} {mat.unit}</span>
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Quantity & Add */}
                                    {selectedMaterial && (
                                        <div className="flex gap-2 animate-in fade-in slide-in-from-left-4">
                                            <div className="w-32">
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        min="0.1"
                                                        step="0.1"
                                                        className="w-full pl-3 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-center bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                        value={quantity}
                                                        onChange={e => setQuantity(Number(e.target.value))}
                                                    />
                                                    <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">{selectedMaterial.unit}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleAddItem}
                                                disabled={loading}
                                                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-md shadow-blue-100"
                                            >
                                                {loading ? 'Adicionando...' : 'Adicionar'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Lists */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <h4 className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase mb-4 sticky top-0 bg-slate-50/50 backdrop-blur-sm py-2">
                                <span>Itens Solicitados</span>
                                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{items.length}</span>
                            </h4>

                            {items.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                    <Package size={48} className="mb-4 opacity-50" />
                                    <p className="font-medium">Nenhum item adicionado</p>
                                    <p className="text-sm opacity-70">Utilize a busca acima para adicionar itens</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {items.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-blue-200 hover:shadow-md transition-all group">

                                            {/* Image */}
                                            <div
                                                className="w-16 h-16 rounded-lg bg-slate-50 shrink-0 overflow-hidden cursor-zoom-in border border-slate-100"
                                                onClick={() => setExpandedImage(item.material.image_url || null)}
                                            >
                                                {item.material.image_url ?
                                                    <img src={item.material.image_url} className="w-full h-full object-cover hover:scale-110 transition-transform" /> :
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300"><Package size={24} /></div>
                                                }
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-800 text-base truncate" title={item.material.name}>{item.material.name}</h4>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-xs text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                                        {item.material.unisystem_code}
                                                    </span>

                                                    {/* Separation Status Badge (Only Status now, quantity moved to right) */}
                                                    {request?.status === 'SEPARATED' && item.quantity_separated !== undefined && (
                                                        <div className="flex items-center gap-2">
                                                            {item.status && (
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border 
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
                                            </div>

                                            {/* Qty Display */}
                                            <div className="flex items-center gap-6 px-4 border-l border-slate-100">

                                                {/* Requested */}
                                                <div className="text-right">
                                                    <div className="text-2xl font-bold text-slate-800">{item.qty}</div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Solicitado</div>
                                                </div>

                                                {/* Separated (If applicable) */}
                                                {request?.status === 'SEPARATED' && item.quantity_separated !== undefined && (
                                                    <div className="text-right pl-6 border-l border-slate-100">
                                                        <div className={`text-2xl font-bold ${item.quantity_separated === item.qty
                                                            ? 'text-green-600'
                                                            : item.quantity_separated === 0
                                                                ? 'text-red-500'
                                                                : 'text-orange-500'
                                                            }`}>
                                                            {item.quantity_separated}
                                                        </div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Atendido</div>
                                                    </div>
                                                )}

                                                <div className="text-xs font-bold text-slate-300 uppercase self-center pt-1">{item.material.unit}</div>
                                            </div>

                                            {/* Actions */}
                                            {canEdit && (
                                                <button
                                                    onClick={() => handleRemoveItem(idx)}
                                                    className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Remover Item"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-slate-100 bg-white z-20 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <div className="flex gap-3">
                                {request && (request.status === 'DRAFT' && canEdit) && (
                                    <button
                                        onClick={handleDelete}
                                        className="px-4 py-2.5 bg-white border border-red-200 text-red-600 font-bold rounded-lg text-sm hover:bg-red-50 transition-colors flex items-center gap-2"
                                    >
                                        <Trash2 size={16} />
                                        Excluir Rascunho
                                    </button>
                                )}

                                {/* Reopen */}
                                {canAccessRow && request && request.status === 'PENDING' && (
                                    <button
                                        onClick={handleReopen}
                                        className="px-5 py-2.5 bg-yellow-100 text-yellow-700 font-bold rounded-lg text-sm hover:bg-yellow-200 transition-colors flex items-center gap-2"
                                    >
                                        <AlertTriangle size={16} /> Reabrir para Rascunho
                                    </button>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-6 py-2.5 text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg font-medium text-sm transition-colors"
                                >
                                    Fechar
                                </button>

                                {/* Email */}
                                {request?.status === 'SEPARATED' && canManageNotifications && (
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
                                        className="px-5 py-2.5 bg-blue-100 text-blue-700 font-bold rounded-lg text-sm hover:bg-blue-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <Send size={16} /> Notificar Email
                                    </button>
                                )}

                                {/* Main Action */}
                                {canEdit && (
                                    <button
                                        onClick={handleSubmit}
                                        disabled={loading || items.length === 0}
                                        className="px-8 py-2.5 bg-green-600 text-white font-bold rounded-lg text-sm hover:bg-green-700 shadow-lg shadow-green-200 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:shadow-none"
                                    >
                                        {loading ? 'Processando...' : (
                                            <>
                                                <Send size={18} /> Enviar Requisição
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
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-sm p-8 animate-in fade-in duration-200"
                    onClick={() => setExpandedImage(null)}
                >
                    <button
                        className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors p-2 bg-white/10 rounded-full"
                        onClick={() => setExpandedImage(null)}
                    >
                        <X size={32} />
                    </button>
                    <img
                        src={expandedImage}
                        className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}
