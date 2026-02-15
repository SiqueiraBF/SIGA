import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Package, Calendar, User, Truck, CheckCircle, Clock, XCircle, Eye, EyeOff, Boxes, Trash, Settings, HelpCircle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StockRequestForm } from '../components/StockRequestForm';
import { StockSeparationModal } from '../components/StockSeparationModal';
import { StockEmailSettingsModal } from '../components/stock/StockEmailSettingsModal';
import { TransferGuideModal } from '../components/TransferGuideModal';
import { stockService } from '../services/stockService';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { StockRequest } from '../types';

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
    DRAFT: { label: 'Rascunho', color: 'bg-slate-100 text-slate-700', icon: Package },
    PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    SEPARATING: { label: 'Em Separação', color: 'bg-blue-100 text-blue-700', icon: Package },
    SEPARATED: { label: 'Separado', color: 'bg-purple-100 text-purple-700', icon: CheckCircle },
    DELIVERED: { label: 'Entregue', color: 'bg-green-100 text-green-700', icon: Truck },
    CANCELED: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export function StockRequestList() {
    const { user, role } = useAuth();
    // Allow check via joined Role OR legacy/direct user.funcao field if exists
    const isAdmin = role?.nome === 'Administrador' || (user as any)?.funcao === 'Administrador';

    const [requests, setRequests] = useState<StockRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEmailSettingsOpen, setIsEmailSettingsOpen] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);

    // Matrix View State
    const [isMatrixMode, setIsMatrixMode] = useState(false);
    const [separationRequest, setSeparationRequest] = useState<StockRequest | null>(null);
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

    useEffect(() => {
        loadRequests();
    }, [user, isMatrixMode]); // Reload when mode changes

    const loadRequests = async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            // Filter Logic
            const filters: any = {};
            if (!isMatrixMode) {
                filters.requesterId = user.id; // My Requests
            }
            const data = await stockService.getRequests(filters);
            setRequests(data);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Erro ao carregar solicitações');
        } finally {
            setLoading(false);
        }
    };

    const handleSeparationClick = (req: StockRequest) => {
        setSeparationRequest(req);
    };

    const handleViewDetails = (req: StockRequest) => {
        setSelectedRequestId(req.id);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedRequestId(null);
        loadRequests();
    };

    const handleDelete = async (data: StockRequest) => {
        if (window.confirm('Tem certeza que deseja excluir esta solicitação? Esta ação não pode ser desfeita.')) {
            try {
                await stockService.deleteRequest(data.id);
                loadRequests();
            } catch (err: any) {
                alert('Erro ao excluir: ' + err.message);
            }
        }
    };

    return (
        <div className="pb-20 space-y-6">
            <PageHeader
                title="Transferência de Estoque"
                subtitle="Solicite o envio de materiais e peças disponíveis na Matriz para unidade"
                icon={Package}
            >
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsGuideOpen(true)}
                        className="bg-white border border-slate-200 text-slate-500 px-3 py-2 rounded-lg font-bold hover:bg-slate-50 hover:text-blue-600 transition-colors"
                        title="Guia de Procedimento"
                    >
                        <HelpCircle size={20} />
                    </button>

                    {isAdmin && (
                        <button
                            onClick={() => setIsEmailSettingsOpen(true)}
                            className="bg-slate-100 text-slate-600 px-3 py-2 rounded-lg font-bold hover:bg-slate-200 transition-colors"
                            title="Configurar E-mails"
                        >
                            <Settings size={20} />
                        </button>
                    )}
                    <button
                        onClick={() => { setSelectedRequestId(null); setIsModalOpen(true); }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200"
                    >
                        <Plus size={20} /> Nova Requisição
                    </button>
                </div>
            </PageHeader>

            {isEmailSettingsOpen && (
                <StockEmailSettingsModal onClose={() => setIsEmailSettingsOpen(false)} />
            )}

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar requisição..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                <button
                    onClick={() => setIsMatrixMode(!isMatrixMode)}
                    className={`px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-colors ${isMatrixMode ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-white border border-slate-200 text-slate-600'}`}
                >
                    {isMatrixMode ? <Boxes size={20} /> : <User size={20} />}
                    {isMatrixMode ? 'Visão Matriz' : 'Minhas Requisições'}
                </button>

                <button className="bg-white border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-2 text-slate-600 font-medium hover:bg-slate-50">
                    <Filter size={20} /> Filtros
                </button>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 h-24 animate-pulse" />
                    ))}
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <div className="text-red-500 font-bold mb-2">Erro ao carregar</div>
                    <div className="text-red-400 text-sm">{error}</div>
                    <button onClick={loadRequests} className="mt-4 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm font-bold">Tentar Novamente</button>
                </div>
            ) : requests.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl text-center border border-slate-100">
                    <Package size={48} className="mx-auto text-slate-200 mb-4" />
                    <h3 className="font-bold text-slate-600">Nenhuma requisição encontrada</h3>
                    <p className="text-slate-400 text-sm">Clique em "Nova Requisição" para começar um pedido.</p>
                </div>
            ) : (
                requests.map(req => {
                    const StatusInfo = STATUS_MAP[req.status] || STATUS_MAP.PENDING;
                    const StatusIcon = StatusInfo.icon;

                    return (
                        <div key={req.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-6">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${StatusInfo.color.split(' ')[0]}`}>
                                <StatusIcon size={24} className={StatusInfo.color.split(' ')[1]} />
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="font-bold text-slate-800 text-lg">
                                        {req.friendly_id ? `#${req.friendly_id}` : `#${req.id.slice(0, 8)}`}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${StatusInfo.color}`}>
                                        {StatusInfo.label}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                    <span className="flex items-center gap-1"><Calendar size={14} /> {format(new Date(req.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}</span>
                                    <span className="flex items-center gap-1"><User size={14} /> {req.usuario?.nome}</span>
                                    {req.fazenda && (
                                        <span className="flex items-center gap-1 font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                            <Package size={14} /> {req.fazenda.nome}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="text-right flex items-center gap-2">
                                {/* Delete Button - Admins Only */}
                                {isAdmin && (
                                    <button
                                        onClick={() => handleDelete(req)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Excluir Solicitação"
                                    >
                                        <Trash size={18} />
                                    </button>
                                )}

                                {/* Validation / Separate Button - Admins Only & Correct Status */}
                                {isAdmin && isMatrixMode && (req.status === 'PENDING' || req.status === 'SEPARATING') ? (
                                    <button
                                        onClick={() => handleSeparationClick(req)}
                                        className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-purple-700 transition-colors flex items-center gap-2"
                                    >
                                        <Package size={16} /> Separar
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleViewDetails(req)}
                                        className="text-blue-600 font-bold text-sm hover:underline"
                                    >
                                        Ver Detalhes
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })
            )}

            <StockRequestForm
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={() => {
                    handleCloseModal();
                }}
                requestId={selectedRequestId}
            />

            {
                separationRequest && (
                    <StockSeparationModal
                        isOpen={!!separationRequest}
                        onClose={() => setSeparationRequest(null)}
                        onSave={(finishedReq) => {
                            loadRequests();
                            if (finishedReq) {
                                handleViewDetails(finishedReq);
                            }
                        }}
                        request={separationRequest}
                    />
                )
            }

            <TransferGuideModal
                isOpen={isGuideOpen}
                onClose={() => setIsGuideOpen(false)}
            />
        </div>
    );
}
