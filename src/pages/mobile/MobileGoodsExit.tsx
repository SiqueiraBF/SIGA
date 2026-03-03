import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck, MapPin, Package, Check, Calendar, CheckSquare, Square, User, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { goodsReceiptService } from '../../services/goodsReceiptService';
import { notificationService } from '../../services/notificationService';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PendingItem {
    id: string;
    invoice_number: string;
    supplier: string;
    entry_at: string;
    destination_farm_id: string;
}

export function MobileGoodsExit() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Data Loading states
    const [fazendas, setFazendas] = useState<{ id: string; nome: string }[]>([]);
    const [itensPendentes, setItensPendentes] = useState<PendingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form States
    const [fazendaSelecionadaId, setFazendaSelecionadaId] = useState('');
    const [selectedItensIds, setSelectedItensIds] = useState<Set<string>>(new Set());
    const [motorista, setMotorista] = useState('');
    const [dataSaida, setDataSaida] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));

    // 1. Initial Load: Get farms & pending items
    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            // Fetch active farms
            const { data: farmsData } = await supabase
                .from('fazendas')
                .select('id, nome')
                .eq('ativo', true)
                .order('nome');

            if (farmsData) setFazendas(farmsData);

            // Fetch ALL pending items. We will filter them locally based on the selected farm
            const pending = await goodsReceiptService.getPendingReceipts();
            setItensPendentes(pending as PendingItem[]);

        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    }

    // Filter items based on selected farm
    const itensDisponiveis = useMemo(() => {
        if (!fazendaSelecionadaId) return [];
        return itensPendentes.filter(item => item.destination_farm_id === fazendaSelecionadaId);
    }, [fazendaSelecionadaId, itensPendentes]);


    // Clear selections if farm changes
    useEffect(() => {
        setSelectedItensIds(new Set());
    }, [fazendaSelecionadaId]);


    const toggleItemSelection = (id: string) => {
        const newSet = new Set(selectedItensIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedItensIds(newSet);
    };

    const handleSelectAll = () => {
        if (selectedItensIds.size === itensDisponiveis.length) {
            setSelectedItensIds(new Set()); // Deselect all
        } else {
            setSelectedItensIds(new Set(itensDisponiveis.map(i => i.id))); // Select all
        }
    };

    const handleDispatch = async () => {
        if (!user?.id) return alert('Usuário não identificado.');
        if (!motorista.trim()) return alert('Informe o nome do motorista.');
        if (selectedItensIds.size === 0) return alert('Selecione ao menos 1 item para enviar.');

        setSubmitting(true);
        try {
            // 1. Create Exit Record
            const exit = await goodsReceiptService.createExit({
                destination_farm_id: fazendaSelecionadaId,
                driver_name: motorista.trim(),
                exit_date: new Date(dataSaida).toISOString(),
                observation: '', // Mobile simplification
                created_by: user.id
            });

            // 2. Link Items to Exit
            await goodsReceiptService.dispatchReceipts(Array.from(selectedItensIds), exit);

            // 3. E-mail Notification
            try {
                const fazendaDesc = fazendas.find(f => f.id === fazendaSelecionadaId);
                const enrichedExit = {
                    ...exit,
                    destination_farm: fazendaDesc,
                    creator: { nome: user.nome }
                };

                const itemsToDispatch = itensPendentes.filter(i => selectedItensIds.has(i.id));
                await notificationService.sendGoodsExitReport(enrichedExit, itemsToDispatch as any, user.email);
            } catch (emailError) {
                console.error('Mobile: Falha ao enviar e-mail de saída:', emailError);
            }

            alert(`🚚 Saída de ${selectedItensIds.size} itens registrada com sucesso!`);
            navigate('/app');

        } catch (error: any) {
            console.error('Erro na saída mobile:', error);
            alert('Erro ao confirmar saída: ' + (error.message || 'Falha na comunicação.'));
        } finally {
            setSubmitting(false);
        }
    };


    return (
        <div className="min-h-full bg-slate-50 relative pb-32 font-sans overflow-x-hidden">

            {/* Cabecalho Solid Color Purple/Indigo */}
            <header className="bg-indigo-600 text-white px-4 pt-6 pb-12 sticky top-0 z-10 shadow-md">
                <div className="flex items-center gap-3 relative z-10">
                    <button onClick={() => navigate('/app')} className="p-2 -ml-2 hover:bg-white/10 rounded-full text-white/90">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black flex items-center gap-2">
                            <Truck size={20} className="text-indigo-200" /> Expedição / Saída
                        </h1>
                        <p className="text-xs text-indigo-200 font-medium">Despachar mercadorias p/ Fazendas</p>
                    </div>
                </div>
            </header>

            <main className="px-4 -mt-6 relative z-20 space-y-4">

                {/* 1. Escolha de Rota (Fazenda Destino) */}
                <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2 pl-1 flex items-center gap-1.5">
                        <MapPin size={12} className="text-indigo-500" /> Para onde vai a carga? *
                    </label>
                    <div className="relative">
                        <select
                            value={fazendaSelecionadaId}
                            onChange={e => setFazendaSelecionadaId(e.target.value)}
                            className="w-full pl-4 pr-10 py-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-base text-indigo-900 font-bold disabled:opacity-50 appearance-none"
                            disabled={loading}
                        >
                            <option value="">Selecione a Fazenda Destino...</option>
                            {fazendas.map(f => (
                                <option key={f.id} value={f.id}>{f.nome}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400">
                            ▼
                        </div>
                    </div>
                </section>

                {/* 2. Seleção de Caixas (Aparece condicionada à Fazenda) */}
                <div className={`transition-all duration-500 ease-in-out ${fazendaSelecionadaId ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none hidden'}`}>

                    {itensDisponiveis.length === 0 ? (
                        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center flex flex-col items-center justify-center gap-3">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                                <Package size={32} className="text-slate-300" />
                            </div>
                            <p className="text-slate-500 font-medium text-sm">Nenhuma mercadoria esperando envio para esta fazenda.</p>
                        </div>
                    ) : (
                        <section className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <Package size={12} className="text-indigo-500" /> Quais itens do pátio vão subir? ({itensDisponiveis.length})
                                </label>
                                <button
                                    onClick={handleSelectAll}
                                    className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
                                >
                                    {selectedItensIds.size === itensDisponiveis.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                </button>
                            </div>

                            <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pb-4 px-1 -mx-1 snap-y">
                                {itensDisponiveis.map(item => {
                                    const isSelected = selectedItensIds.has(item.id);
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => toggleItemSelection(item.id)}
                                            className={`
                                                relative w-full p-4 rounded-2xl border-2 transition-all cursor-pointer snap-center
                                                ${isSelected
                                                    ? 'bg-indigo-50 border-indigo-500 shadow-sm'
                                                    : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm'
                                                }
                                            `}
                                        >
                                            <div className="flex items-start gap-4">
                                                {/* Checkbox Visual */}
                                                <div className="mt-0.5">
                                                    {isSelected ? (
                                                        <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center shadow-sm">
                                                            <Check size={14} className="text-white" strokeWidth={3} />
                                                        </div>
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full border-2 border-slate-300 bg-slate-50"></div>
                                                    )}
                                                </div>

                                                {/* Meta Info */}
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className={`font-black tracking-tight ${isSelected ? 'text-indigo-900 text-lg' : 'text-slate-700 text-base'}`}>
                                                            {item.invoice_number}
                                                        </span>
                                                    </div>
                                                    <p className={`text-xs font-medium leading-snug line-clamp-1 ${isSelected ? 'text-indigo-700' : 'text-slate-500'}`}>
                                                        {item.supplier}
                                                    </p>

                                                    {/* Badge de Horário de Entrada (Retenção visualiza que tá esperando desde X hora) */}
                                                    <div className="flex items-center gap-1 mt-2 mb-0.5">
                                                        <Calendar size={10} className="text-slate-400" />
                                                        <span className="text-[10px] font-semibold text-slate-400">
                                                            Aguardando desde: {format(parseISO(item.entry_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Detalhes Finais (Motorista) -> Só aparece se selecionar algo */}
                            {selectedItensIds.size > 0 && (
                                <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-4 animate-in slide-in-from-bottom-4 mt-6">
                                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                        <Truck size={16} className="text-indigo-500" />
                                        <h3 className="font-bold text-slate-800 text-sm">Dados do Transporte</h3>
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 pl-1 flex items-center gap-1.5">
                                            <User size={12} className="text-indigo-500" /> Nome do Motorista *
                                        </label>
                                        <input
                                            type="text"
                                            value={motorista}
                                            onChange={e => setMotorista(e.target.value)}
                                            placeholder="Ex: João da Silva"
                                            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-base text-slate-800 font-bold placeholder:text-slate-400 placeholder:font-normal"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 pl-1 flex items-center gap-1.5">
                                            <Calendar size={12} className="text-indigo-500" /> Data e Hora de Saída
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={dataSaida}
                                            onChange={e => setDataSaida(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm font-semibold text-slate-700"
                                        />
                                    </div>
                                </section>
                            )}

                        </section>
                    )}
                </div>
            </main>

            {/* F.A.B - Floating Action Button Condicional */}
            {selectedItensIds.size > 0 && (
                <div className="fixed bottom-6 left-0 right-0 px-4 z-50 animate-in slide-in-from-bottom-8 duration-300">
                    <button
                        onClick={handleDispatch}
                        disabled={submitting}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg shadow-[0_8px_25px_-5px_rgba(79,70,229,0.5)] flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70 disabled:scale-100"
                    >
                        {submitting ? (
                            <><span className="animate-spin w-5 h-5 border-2 border-white/20 border-t-white rounded-full"></span> AGUARDE...</>
                        ) : (
                            <>Confirmar Saída ({selectedItensIds.size})</>
                        )}
                    </button>
                    {/* Clear Button under FAB */}
                    <div className="text-center mt-3">
                        <button
                            onClick={() => setSelectedItensIds(new Set())}
                            className="bg-white/80 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-sm text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 mx-auto"
                        >
                            <X size={12} /> Cancelar Seleção
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
