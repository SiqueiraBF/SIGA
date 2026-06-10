import { useState, useEffect } from 'react';
import { X, Save, Send, Search, Package, Plus, Trash2, AlertTriangle, ImageIcon, Calendar, User, MapPin, FileText, AlertCircle } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { FormField } from './ui/FormField';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { StatusBadge } from './ui/StatusBadge';
import { IconButton } from './ui/IconButton';
import { useAuth } from '../context/AuthContext';
import { stockService } from '../services/stockService';
import { db } from '../services/supabaseService';
import { notificationService } from '../services/notificationService';
import { EmptyState } from './ui/EmptyState';
import { formatInSystemTime } from '../utils/dateUtils';
import toast from 'react-hot-toast';
import { ConfirmDialog } from './ui/ConfirmDialog';
import type { Material, StockRequest, StockRequestCategory } from '../types';

interface StockRequestFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    requestId?: string | null;
    onSeparar?: (req: StockRequest) => void;
}

export function StockRequestForm({ isOpen, onClose, onSave, requestId, onSeparar }: StockRequestFormProps) {
    const { user, role } = useAuth();

    // State
    const [loading, setLoading] = useState(false);
    const [request, setRequest] = useState<StockRequest | null>(null);
    const [category, setCategory] = useState<StockRequestCategory>('GERAL');
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

    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        variant?: 'danger' | 'warning' | 'info';
        onConfirm: () => void | Promise<void>;
    }>({ isOpen: false, title: '', description: '', onConfirm: () => {} });

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
                stockService.getMaterials(searchQuery, category).then(setSearchResults);
            } else {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, category]);

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
                setCategory(reqData.category || 'GERAL');
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
            toast.error("Erro ao carregar");
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setRequest(null);
        setCategory('GERAL');
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
        if (quantity <= 0 || !Number.isInteger(quantity)) return void toast.error("Quantidade deve ser um número inteiro maior que zero");
        if (!user) return;
        if (!selectedFazendaId) return void toast.error("Selecione a Filial antes de adicionar itens.");
        if (!notes || notes.trim() === '') return void toast.error("Observação obrigatória para adicionar itens.");

        // Prevent adding duplicate (check locally)
        if (items.some(i => i.material?.id === selectedMaterial.id)) return void toast.error("Item já adicionado na lista");

        setLoading(true);
        try {
            let currentRequest = request;

            // 1. Create Draft if doesn't exist
            if (!currentRequest) {
                currentRequest = await stockService.createRequest(
                    selectedFazendaId,
                    user.id,
                    notes,
                    category
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
            toast.error("Erro ao salvar item: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveItem = async (index: number) => {
        const item = items[index];
        const itemId = item.id;
        if (!itemId) return; // Should not happen if persisted

        setConfirmDialog({
            isOpen: true,
            title: 'Remover Item',
            description: 'Remover este item?',
            variant: 'danger',
            onConfirm: async () => {
                setLoading(true);
                try {
                    await stockService.removeItem(itemId);
                    if (request) {
                        await refreshItems(request.id);
                    } else {
                        setItems(prev => prev.filter((_, i) => i !== index));
                    }
                } catch (err) {
                    console.error(err);
                    toast.error("Erro ao remover item");
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleSubmit = async () => {
        if (!request) return void toast.error("Adicione itens antes de enviar");
        if (items.length === 0) return void toast.error("Adicione pelo menos um item");
        if (!notes || notes.trim() === '') return void toast.error("Observação obrigatória para enviar.");

        setConfirmDialog({
            isOpen: true,
            title: 'Confirmar Envio',
            description: 'Confirmar envio da solicitação?',
            variant: 'info',
            onConfirm: async () => {
                setLoading(true);
                try {
                    await stockService.updateRequestStatus(request.id, 'PENDING');
                    toast.success("Requisição enviada com sucesso!");
                    setTimeout(() => {
                        onSave();
                        onClose();
                    }, 0);
                } catch (err: any) {
                    toast.error("Erro ao enviar: " + err.message);
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleReopen = async () => {
        if (!request) return;
        setConfirmDialog({
            isOpen: true,
            title: 'Reabrir Requisição',
            description: 'Deseja reabrir esta requisição? Ela voltará para o status RASCUNHO, permitindo que você edite os itens novamente.',
            variant: 'warning',
            onConfirm: async () => {
                setLoading(true);
                try {
                    await stockService.updateRequestStatus(request.id, 'DRAFT');
                    // Refresh
                    const updated = await stockService.getRequestById(request.id);
                    setRequest(updated);
                    toast.success("Requisição reaberta para RASCUNHO!");
                } catch (err) {
                    toast.error("Erro ao reabrir");
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleDelete = async () => {
        if (!request) return;

        const isDraft = request.status === 'DRAFT';
        const msg = isDraft
            ? "Deseja EXCLUIR este rascunho permanentemente?"
            : "Tem certeza que deseja excluir esta requisição? Esta ação não pode ser desfeita.";

        setConfirmDialog({
            isOpen: true,
            title: 'Excluir Requisição',
            description: msg,
            variant: 'danger',
            onConfirm: async () => {
                setLoading(true);
                try {
                    await stockService.deleteRequest(request.id);
                    toast.success("Requisição excluída!");
                    setTimeout(() => {
                        onSave(); // Trigger refresh in parent
                        onClose();
                    }, 0);
                } catch (err: any) {
                    toast.error("Erro ao excluir: " + err.message);
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    if (!isOpen) return null;

    return (
        <>
            <Modal 
                isOpen={isOpen} 
                onClose={onClose} 
                size="xl" 
                className="max-w-6xl h-[85vh] !rounded-2xl"
                closeOnOverlayClick={false}
            >
                {/* --- HEADER (Padrão RequestHeader) --- */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-4">
                        <div className={`p-3.5 rounded-2xl flex items-center justify-center transition-colors ${
                            !request || request.status === 'DRAFT' ? 'bg-slate-100 text-slate-600' :
                            request.status === 'PENDING' ? 'bg-amber-50 text-amber-600' :
                            request.status === 'SEPARATING' ? 'bg-blue-50 text-blue-600' :
                            request.status === 'SEPARATED' ? 'bg-purple-50 text-purple-600' :
                            request.status === 'DELIVERED' ? 'bg-green-50 text-green-600' :
                            request.status === 'CANCELED' ? 'bg-red-50 text-red-600' :
                            'bg-slate-100 text-slate-600'
                        }`}>
                            <Package size={32} strokeWidth={1.5} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                                {request?.friendly_id ? `Requisição #${request.friendly_id}` : 'Nova Requisição'}
                            </h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">STATUS:</span>
                                <StatusBadge
                                    status={
                                        request ? (
                                            request.status === 'DRAFT' ? 'Rascunho' :
                                            request.status === 'PENDING' ? 'Pendente' :
                                            request.status === 'SEPARATING' ? 'Em Separação' :
                                            request.status === 'SEPARATED' ? 'Separado' :
                                            request.status === 'DELIVERED' ? 'Entregue' :
                                            request.status === 'CANCELED' ? 'Cancelado' :
                                            request.status
                                        ) : 'Novo Registro'
                                    }
                                    variant={
                                        !request || request.status === 'DRAFT' ? 'default' :
                                        request.status === 'PENDING' ? 'warning' :
                                        request.status === 'SEPARATING' ? 'info' :
                                        request.status === 'SEPARATED' ? 'purple' :
                                        request.status === 'DELIVERED' ? 'success' :
                                        request.status === 'CANCELED' ? 'error' :
                                        'default'
                                    }
                                    size="sm"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <IconButton
                            icon={X}
                            variant="default"
                            label="Fechar"
                            onClick={onClose}
                            className="hover:text-red-500 hover:bg-red-50 border-none shadow-none"
                        />
                    </div>
                </div>

                {/* --- BODY --- */}
                <div className="flex-1 flex overflow-hidden">

                    {/* Sidebar - Padrão RequestSidePanel */}
                    <div className="w-[340px] shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
                        <div className="p-6 space-y-4">
                            <FormField label="Data Abertura">
                                <Input
                                    type="text"
                                    value={request?.created_at
                                        ? formatInSystemTime(request.created_at)
                                        : formatInSystemTime(new Date().toISOString())}
                                    disabled
                                />
                            </FormField>

                            <FormField label="Solicitante">
                                <Input
                                    type="text"
                                    value={request?.usuario?.nome || user?.nome || ''}
                                    disabled
                                />
                            </FormField>

                            <FormField label="Filial" required>
                                <Select
                                    value={selectedFazendaId}
                                    onChange={e => setSelectedFazendaId(e.target.value)}
                                    disabled={!!request}
                                    placeholder="Selecione..."
                                    options={fazendas.map(f => ({ value: f.id, label: f.nome }))}
                                />
                            </FormField>

                            <FormField
                                label="Observação"
                                required
                                error={!notes.trim() && canEdit ? 'Observação obrigatória para adicionar itens' : undefined}
                            >
                                <Textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    disabled={!canEdit}
                                    placeholder="Descreva a aplicação ou motivo..."
                                    error={!notes.trim() && canEdit}
                                    className="min-h-[100px] uppercase"
                                />
                            </FormField>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col bg-slate-50/50 relative overflow-hidden">

                        {/* Add Item Section */}
                        {canEdit && (
                            <div className="p-6 bg-slate-50/80 border-b border-slate-200/60 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] z-20">
                                {/* Category Selection */}
                                <div className="mb-6">
                                    <div className="flex items-center gap-2 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">
                                        CATEGORIA DO PEDIDO
                                    </div>
                                    <div className="flex gap-3">
                                        {(['GERAL', 'SEGURANCA', 'UNIFORME'] as StockRequestCategory[]).map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => {
                                                    if (items.length > 0) {
                                                        toast.error("Você não pode alterar a categoria após adicionar itens. Remova os itens primeiro.");
                                                        return;
                                                    }
                                                    setCategory(cat);
                                                }}
                                                disabled={!!request} // Only allow change on NEW requests, or draft if no items? 
                                                // Actually, if it's draft, we can allow change if items is 0
                                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold border transition-all ${
                                                    category === cat 
                                                        ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                                                        : (!!request || items.length > 0)
                                                            ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
                                                            : 'bg-white border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                {cat === 'GERAL' && '📦 Geral'}
                                                {cat === 'SEGURANCA' && '🦺 Segurança (EPI)'}
                                                {cat === 'UNIFORME' && '👕 Uniformes'}
                                            </button>
                                        ))}
                                    </div>
                                    {items.length > 0 && <p className="text-[10px] text-slate-400 mt-1.5">* Remova todos os itens para alterar a categoria.</p>}
                                </div>

                                <div className="flex items-center gap-2 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-4">
                                    <Plus size={14} className="text-slate-400" /> ADICIONAR ITEM
                                </div>

                                <div className="flex gap-4 items-start">
                                    {/* Search */}
                                    <div className="flex-[4] relative">
                                        <FormField label="Produto" hint="Buscar produto por nome ou código">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-3.5 text-slate-400" size={16} />
                                                <Input
                                                    type="text"
                                                    placeholder="Digite para buscar..."
                                                    className="w-full pl-9 bg-white"
                                                    value={searchQuery}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setSearchQuery(val);
                                                        if (selectedMaterial && val !== selectedMaterial.name) {
                                                            setSelectedMaterial(null);
                                                        }
                                                    }}
                                                    disabled={!canEdit}
                                                />
                                            </div>
                                        </FormField>

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
                                                                Cod: {mat.unisystem_code} <span className="mx-1">•</span> Estoque: <span className="font-bold text-slate-700">{mat.current_stock ?? 0} {mat.unit}</span>
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Quantity & Add */}
                                    {selectedMaterial && (
                                        <div className="flex gap-2 animate-in fade-in slide-in-from-left-4 flex-[3]">
                                            <div className="flex-1">
                                                <FormField label="Quantidade" hint={selectedMaterial.unit}>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        step="1"
                                                        className="text-center"
                                                        value={quantity || ''}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            if (val === '') {
                                                                setQuantity(0);
                                                                return;
                                                            }
                                                            const parsed = parseInt(val, 10);
                                                            setQuantity(isNaN(parsed) ? 0 : parsed);
                                                        }}
                                                    />
                                                </FormField>
                                            </div>
                                            <div className="flex-[2] pt-6">
                                                <Button 
                                                    onClick={handleAddItem} 
                                                    disabled={loading}
                                                    variant="success"
                                                    fullWidth
                                                >
                                                    {loading ? 'Adicionando...' : 'Adicionar Item na Lista'}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Lists */}
                        <div className="flex-1 overflow-hidden relative flex flex-col">
                            <div className="py-1.5 px-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest z-10 shrink-0">
                                <div className="flex items-center gap-3">
                                    <span>Itens Solicitados</span>
                                    <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full text-[10px]">{items.length}</span>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-2 md:p-3 bg-slate-50">
                                {items.length === 0 ? (
                                    <div className="py-12">
                                        <EmptyState
                                            title="Lista Vazia"
                                            description="Nenhum item adicionado à solicitação. Utilize a busca acima para adicionar itens."
                                        />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-2 max-w-5xl mx-auto">
                                    {items.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-blue-200 hover:shadow-md transition-all group">

                                            {/* Image */}
                                            <div
                                                className="w-16 h-16 rounded-lg bg-slate-50 shrink-0 overflow-hidden cursor-zoom-in border border-slate-100"
                                                onClick={() => setExpandedImage(item.material?.image_url || null)}
                                            >
                                                {item.material?.image_url ?
                                                    <img src={item.material.image_url} className="w-full h-full object-cover hover:scale-110 transition-transform" /> :
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300"><Package size={24} /></div>
                                                }
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-800 text-base truncate" title={item.material?.name || 'Material desconhecido'}>{item.material?.name || 'Material desconhecido'}</h4>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-xs text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                                        {item.material?.unisystem_code || '-'}
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
                                                    {canEdit ? (
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            step="1"
                                                            className="w-20 px-2 py-1 text-right text-xl font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                            value={item.qty || ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === '') {
                                                                    setItems(prev => prev.map((it, i) => i === idx ? { ...it, qty: 0 } : it));
                                                                    return;
                                                                }
                                                                const parsed = parseInt(val, 10);
                                                                const newQty = isNaN(parsed) ? 0 : parsed;
                                                                setItems(prev => prev.map((it, i) => i === idx ? { ...it, qty: newQty } : it));
                                                            }}
                                                            onBlur={async () => {
                                                                if (item.qty <= 0 || isNaN(item.qty) || !Number.isInteger(item.qty)) {
                                                                    toast.error("A quantidade deve ser um número inteiro maior que zero");
                                                                    if (request) refreshItems(request.id);
                                                                    return;
                                                                }
                                                                if (item.id) {
                                                                    try {
                                                                        await stockService.updateItemQuantity(item.id, item.qty);
                                                                    } catch (err: any) {
                                                                        console.error(err);
                                                                        toast.error("Erro ao atualizar quantidade: " + err.message);
                                                                    }
                                                                }
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    (e.target as HTMLInputElement).blur();
                                                                }
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="text-2xl font-bold text-slate-800">{item.qty}</div>
                                                    )}
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

                                                <div className="text-xs font-bold text-slate-300 uppercase self-center pt-1">{item.material?.unit || 'un'}</div>
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
                    </div>
                </div>
                </div>

                {/* --- FOOTER (Padrão RequestFooter) --- */}
                <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between z-10">
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={onClose} disabled={loading}>
                            Fechar / Cancelar
                        </Button>
                        {request && ((request.status === 'DRAFT' && canEdit) || isAdmin) && (
                            <Button
                                variant="danger"
                                onClick={handleDelete}
                                icon={Trash2}
                            >
                                Excluir
                            </Button>
                        )}
                    </div>

                    <div className="flex gap-3">
                        {/* Reopen */}
                        {canAccessRow && request && request.status === 'PENDING' && (
                            <Button
                                variant="secondary"
                                onClick={handleReopen}
                                icon={AlertTriangle}
                                className="bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100"
                            >
                                Reabrir para Rascunho
                            </Button>
                        )}

                        {/* Email */}
                        {request?.status === 'SEPARATED' && canManageNotifications && (
                            <Button
                                variant="secondary"
                                icon={Send}
                                onClick={async () => {
                                    setConfirmDialog({
                                        isOpen: true,
                                        title: 'Enviar Notificação',
                                        description: 'Deseja enviar o e-mail de notificação?',
                                        variant: 'info',
                                        onConfirm: async () => {
                                            setLoading(true);
                                            try {
                                                await notificationService.sendStockRequestReport(
                                                    request,
                                                    items.filter(i => i.quantity_separated && i.quantity_separated > 0),
                                                    user?.email,
                                                    user?.nome
                                                );
                                                toast.success('E-mail enviado!');
                                            } catch (err) {
                                                toast.error('Erro ao enviar e-mail.');
                                            } finally {
                                                setLoading(false);
                                            }
                                        }
                                    });
                                }}
                                disabled={loading}
                                className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                            >
                                Notificar Email
                            </Button>
                        )}

                        {/* Main Action */}
                        
                        {/* Separar Action */}
                        {request && canConfirm && (request.status === 'PENDING' || request.status === 'SEPARATING') && onSeparar && (
                            <Button
                                variant="primary"
                                icon={Package}
                                onClick={() => {
                                    onClose();
                                    onSeparar(request);
                                }}
                                disabled={loading}
                            >
                                Separar
                            </Button>
                        )}

                        {request && request.status === 'DRAFT' && canEdit && (
                            <Button
                                variant="primary"
                                onClick={handleSubmit}
                                icon={Send}
                                disabled={loading || items.length === 0}
                            >
                                Enviar Solicitação
                            </Button>
                        )}
                    </div>
                </div>
            </Modal>

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

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                title={confirmDialog.title}
                description={confirmDialog.description}
                variant={confirmDialog.variant}
                onConfirm={confirmDialog.onConfirm}
                isLoading={loading}
            />
        </>
    );
}
