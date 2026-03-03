import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Calendar, Clock, CheckCircle, Search, X, Check, AlertTriangle, Save, Minus, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { stockService } from '../../services/stockService';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { StockRequest, StockRequestItem } from '../../types';

type Step = 'LIST' | 'SEPARATING';

export function MobileStockSeparation() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // States
    const [step, setStep] = useState<Step>('LIST');
    const [requests, setRequests] = useState<StockRequest[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<StockRequest | null>(null);
    const [items, setItems] = useState<StockRequestItem[]>([]);

    // UI States
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // --- Data Fetching ---
    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        setLoading(true);
        try {
            // In mobile picking, we only care about what needs work
            // Let's fetch all (since it's an admin/stock role view anyway) and filter locally for speed,
            // or pass status filters to the service if supported. 
            // Currently, getRequests returns all if no filter is passed.
            const data = await stockService.getRequests();

            // Filter strictly PENDING and SEPARATING
            const activeRequests = data.filter(req =>
                req.status === 'PENDING' || req.status === 'SEPARATING'
            );

            // Sort by oldest first (FIFO principle for separation)
            activeRequests.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            setRequests(activeRequests);
        } catch (error) {
            console.error('Error loading requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadItemsForRequest = async (req: StockRequest) => {
        setLoading(true);
        try {
            const data = await stockService.getItems(req.id);
            // Default quantity_separated to quantity_requested if not set yet
            const enrichedItems = data.map(item => ({
                ...item,
                quantity_separated: item.quantity_separated ?? item.quantity_requested
            }));
            setItems(enrichedItems);
            setSelectedRequest(req);
            setStep('SEPARATING');
        } catch (error) {
            console.error('Error loading items:', error);
            alert('Falha ao carregar itens da requisição.');
        } finally {
            setLoading(false);
        }
    };


    // --- Actions ---
    const handleBackToList = () => {
        setStep('LIST');
        setSelectedRequest(null);
        setItems([]);
        loadRequests(); // Refresh list to catch any status changes
    };

    const handleQuantityChange = (itemId: string, increment: number) => {
        setItems(prev => prev.map(item => {
            if (item.id === itemId) {
                // Determine new quantity (prevent negative, allow up to requested or maybe slightly more, but let's cap at requested for simplicity unless overridden)
                let newQty = (item.quantity_separated || 0) + increment;
                if (newQty < 0) newQty = 0;
                // Optional: Cap at requested quantity to prevent over-shipping by mistake
                // if (newQty > item.quantity_requested) newQty = item.quantity_requested;

                return { ...item, quantity_separated: newQty, status: 'CONFIRMED' }; // Auto confirm if they touch the counter
            }
            return item;
        }));
    };

    const handleQuickStatus = (itemId: string, status: 'CONFIRMED' | 'UNAVAILABLE') => {
        setItems(prev => prev.map(item => {
            if (item.id === itemId) {
                if (status === 'UNAVAILABLE') {
                    return { ...item, status, quantity_separated: 0 };
                }
                return { ...item, status, quantity_separated: item.quantity_requested }; // Auto fill if confirming full
            }
            return item;
        }));
    };

    const handleSaveStatus = async (finish: boolean) => {
        if (!selectedRequest) return;

        // Validation before finishing
        if (finish) {
            const pendingItems = items.filter(i => i.status === 'PENDING');
            if (pendingItems.length > 0) {
                return alert(`Ainda restam ${pendingItems.length} itens marcados como Pendente (Cinza). Verifique os produtos antes de finalizar.`);
            }
            if (!window.confirm('Deseja realmente FINALIZAR a separação deste pedido? Ele será despachado.')) {
                return;
            }
        }

        setSaving(true);
        try {
            // 1. Update all items
            await Promise.all(items.map(async (item) => {
                await stockService.updateItemSeparation(item.id, item.quantity_separated || 0, item.status);

                // If confirmed and finishing, log exit date
                if (finish && item.status === 'CONFIRMED' && item.material_id) {
                    await stockService.updateMaterialLastExit(item.material_id, new Date().toISOString());
                }
            }));

            // 2. Update Request Status
            if (finish) {
                await stockService.updateRequestStatus(selectedRequest.id, 'SEPARATED', user?.id);
                // The desktop version triggers an email here if the user clicks the email button manually.
                // For mobile, to keep it fast, we just transition status.
                alert('📦 Separação Finalizada com sucesso!');
                handleBackToList();
            } else {
                await stockService.updateRequestStatus(selectedRequest.id, 'SEPARATING');
                alert('💾 Progresso Salvo!');
            }

        } catch (error: any) {
            console.error('Save error:', error);
            alert('Erro ao salvar separação: ' + error.message);
        } finally {
            setSaving(false);
        }
    };


    // --- Filtering ---
    const filteredRequests = useMemo(() => {
        if (!searchTerm) return requests;
        const lowerTerm = searchTerm.toLowerCase();
        return requests.filter(req =>
            (req.friendly_id?.toString() || req.id).toLowerCase().includes(lowerTerm) ||
            req.fazenda?.nome?.toLowerCase().includes(lowerTerm) ||
            req.usuario?.nome?.toLowerCase().includes(lowerTerm)
        );
    }, [requests, searchTerm]);

    const progressPercentage = items.length > 0
        ? Math.round((items.filter(i => i.status !== 'PENDING').length / items.length) * 100)
        : 0;


    // ============================================================================
    // RENDER: LIST VIEW
    // ============================================================================
    if (step === 'LIST') {
        return (
            <div className="min-h-full bg-slate-50 relative pb-24 font-sans">
                {/* Header Teal/Blue */}
                <header className="bg-teal-600 text-white px-4 pt-6 pb-12 sticky top-0 z-10 shadow-md">
                    <div className="flex items-center gap-3 relative z-10">
                        <button onClick={() => navigate('/app')} className="p-2 -ml-2 hover:bg-white/10 rounded-full text-white/90">
                            <ArrowLeft size={24} />
                        </button>
                        <div className="flex-1">
                            <h1 className="text-xl font-black flex items-center gap-2">
                                <Package size={20} className="text-teal-200" /> Separação (Picking)
                            </h1>
                            <p className="text-xs text-teal-200 font-medium">Pedidos de Almoxarifado</p>
                        </div>
                    </div>
                </header>

                <main className="px-4 -mt-6 relative z-20 space-y-4">
                    {/* Search Bar */}
                    <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-200 flex items-center gap-2">
                        <div className="p-2 text-slate-400">
                            <Search size={20} />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por ID, Fazenda ou Solicitante..."
                            className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-400 placeholder:font-normal py-1"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="p-2 text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        )}
                    </div>

                    {/* Pending Requests List */}
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-3"></div>
                            <p className="text-slate-400 text-sm font-bold">Buscando requisições...</p>
                        </div>
                    ) : filteredRequests.length === 0 ? (
                        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center shadow-sm mt-8">
                            <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={32} className="text-teal-400" />
                            </div>
                            <h3 className="text-lg font-black text-slate-700 mb-1">Nenhum pedido na fila!</h3>
                            <p className="text-sm text-slate-500 font-medium">Você está em dia com as separações.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 pb-8">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{filteredRequests.length} Filas Pendentes</span>
                            </div>

                            {filteredRequests.map(req => {
                                const isSeparating = req.status === 'SEPARATING';
                                return (
                                    <div
                                        key={req.id}
                                        onClick={() => loadItemsForRequest(req)}
                                        className={`bg-white rounded-2xl p-4 border-l-4 shadow-sm hover:shadow-md transition-shadow active:scale-[0.98] cursor-pointer 
                                            ${isSeparating ? 'border-l-blue-500' : 'border-l-yellow-400'}
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="font-black text-slate-800 text-lg">
                                                    #{req.friendly_id || req.id.slice(0, 8)}
                                                </h4>
                                                <p className="text-xs font-bold text-slate-500 mt-0.5">
                                                    {req.fazenda?.nome || 'Fazenda Desconhecida'}
                                                </p>
                                            </div>
                                            <div className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide ${isSeparating ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {isSeparating ? 'EM SEPARAÇÃO' : 'PENDENTE'}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 text-xs font-medium text-slate-500 mt-4">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar size={12} className="text-slate-400" />
                                                {format(parseISO(req.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock size={12} className="text-slate-400" />
                                                {req.usuario?.nome?.split(' ')[0] || 'Desconhecido'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>
        );
    }

    // ============================================================================
    // RENDER: SEPARATING VIEW (PICKING LIST)
    // ============================================================================
    return (
        <div className="min-h-full bg-slate-50 relative pb-40 font-sans">
            {/* Header Picking */}
            <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-20 flex items-center justify-between shadow-sm">
                <button
                    onClick={handleBackToList}
                    className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full"
                >
                    <ArrowLeft size={24} />
                </button>
                <div className="text-center">
                    <h2 className="text-sm font-black text-slate-800">
                        Pedido #{selectedRequest?.friendly_id || selectedRequest?.id.slice(0, 8)}
                    </h2>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-teal-600">
                        {loading ? 'Carregando Itens...' : `${items.length} Itens na Lista`}
                    </span>
                </div>
                <div className="w-10"></div> {/* Spacer for symmetry */}
            </header>

            {/* Progress Bar Top */}
            {!loading && items.length > 0 && (
                <div className="w-full bg-slate-200 h-1.5 sticky top-[65px] z-10">
                    <div
                        className="bg-teal-500 h-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
            )}

            <main className="p-4 space-y-4">
                {loading ? (
                    <div className="text-center py-20 text-slate-400 font-bold flex flex-col items-center">
                        <div className="w-8 h-8 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin mb-4"></div>
                        Preparando carrinho...
                    </div>
                ) : (
                    items.map((item, index) => {
                        const isConfirmed = item.status === 'CONFIRMED';
                        const isUnavailable = item.status === 'UNAVAILABLE';
                        const isPending = item.status === 'PENDING';

                        const currentStock = item.material?.current_stock || 0;
                        const qtySep = item.quantity_separated || 0;
                        const isOverStock = qtySep > currentStock;

                        return (
                            <div
                                key={item.id}
                                className={`bg-white rounded-2xl p-4 shadow-sm border-2 transition-all 
                                    ${isConfirmed ? 'border-teal-400 bg-teal-50/10' : ''}
                                    ${isUnavailable ? 'border-red-300 bg-red-50/30' : ''}
                                    ${isPending ? 'border-slate-100 hover:border-slate-300' : ''}
                                `}
                            >
                                {/* Product Info Segment */}
                                <div className="flex gap-4 mb-4">
                                    {item.material?.image_url ? (
                                        <img src={item.material.image_url} alt="Prod" className="w-[60px] h-[60px] rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0" />
                                    ) : (
                                        <div className="w-[60px] h-[60px] rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                            <span className="text-slate-300 text-[10px] font-bold text-center leading-tight">SEM<br />FOTO</span>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0 pr-2">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded tracking-widest">
                                                ID: {item.material?.unisystem_code || 'S/N'}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400">
                                                {index + 1} DE {items.length}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-slate-800 text-sm leading-tight mb-2 line-clamp-2">
                                            {item.material?.name || 'Produto Não Encontrado'}
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                                                Pediu: {item.quantity_requested} {item.material?.unit}
                                            </span>
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${currentStock > 0 ? 'bg-slate-100 text-slate-600' : 'bg-red-50 text-red-600'}`}>
                                                Estoque: {currentStock}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px w-full bg-slate-100 mb-4" />

                                {/* Interactive Segment (Counter & Actions) */}
                                <div className="flex flex-col gap-3">

                                    {/* Big Touch Counter */}
                                    <div className="flex items-center justify-between bg-slate-50 rounded-xl p-2 border border-slate-200">
                                        <button
                                            onClick={() => handleQuantityChange(item.id, -1)}
                                            className="w-14 h-12 bg-white shadow-sm border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 active:bg-slate-100 active:scale-95 transition-all outline-none"
                                        >
                                            <Minus size={24} strokeWidth={3} />
                                        </button>

                                        <div className="flex flex-col items-center justify-center flex-1">
                                            <span className={`text-2xl font-black ${isOverStock ? 'text-red-500' : 'text-slate-800'}`}>
                                                {qtySep}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wide">
                                                Separados
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => handleQuantityChange(item.id, 1)}
                                            className="w-14 h-12 bg-white shadow-sm border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 active:bg-slate-100 active:scale-95 transition-all outline-none"
                                        >
                                            <Plus size={24} strokeWidth={3} />
                                        </button>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="grid grid-cols-2 gap-3 mt-1">
                                        <button
                                            onClick={() => handleQuickStatus(item.id, 'CONFIRMED')}
                                            className={`py-3.5 rounded-xl font-bold flex items-center gap-2 justify-center text-sm transition-all border outline-none
                                                ${isConfirmed
                                                    ? 'bg-teal-500 text-white border-teal-500 shadow-md ring-2 ring-teal-200 ring-offset-1'
                                                    : 'bg-white text-teal-600 border-teal-200 hover:bg-teal-50 shadow-sm'}
                                            `}
                                        >
                                            {isConfirmed ? <CheckCircle size={18} strokeWidth={2.5} /> : <Check size={18} strokeWidth={2.5} />}
                                            {isConfirmed ? 'COLETADO' : 'PEGUEI'}
                                        </button>
                                        <button
                                            onClick={() => handleQuickStatus(item.id, 'UNAVAILABLE')}
                                            className={`py-3.5 rounded-xl font-bold flex items-center gap-2 justify-center text-sm transition-all border outline-none
                                                ${isUnavailable
                                                    ? 'bg-red-500 text-white border-red-500 shadow-md ring-2 ring-red-200 ring-offset-1'
                                                    : 'bg-white text-red-500 border-red-200 hover:bg-red-50 shadow-sm'}
                                            `}
                                        >
                                            {isUnavailable ? <AlertTriangle size={18} strokeWidth={2.5} /> : <X size={18} strokeWidth={2.5} />}
                                            {isUnavailable ? 'FALTOU' : 'EM FALTA'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </main>

            {/* F.A.B Actions */}
            {!loading && items.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 flex flex-col gap-2 z-30 pb-safe">
                    <button
                        onClick={() => handleSaveStatus(true)}
                        disabled={saving}
                        className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-black text-base shadow-[0_8px_20px_-5px_rgba(13,148,136,0.4)] flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {saving ? 'PROCESSANDO...' : <><CheckCircle size={20} /> FINALIZAR E DESPACHAR</>}
                    </button>
                    {!saving && (
                        <button
                            onClick={() => handleSaveStatus(false)}
                            className="w-full py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                            <Save size={16} /> Salvar e Continuar Depois
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
