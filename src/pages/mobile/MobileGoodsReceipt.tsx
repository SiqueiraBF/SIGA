import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, User, Truck, MapPin, FileText, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { goodsReceiptService } from '../../services/goodsReceiptService';
import { notificationService } from '../../services/notificationService';
import { format } from 'date-fns';

export function MobileGoodsReceipt() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Data Loading states
    const [fazendas, setFazendas] = useState<{ id: string; nome: string }[]>([]);
    const [historicoFornecedores, setHistoricoFornecedores] = useState<string[]>([]);

    // Form States
    const [fornecedor, setFornecedor] = useState('');
    const [notaFiscal, setNotaFiscal] = useState('');
    const [pedido, setPedido] = useState('');
    const [fazendaId, setFazendaId] = useState('');
    const [dataEntrada, setDataEntrada] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    const [observacoes, setObservacoes] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBaseData();
        // Setup initial default farm if user has one
        if (user?.fazenda_id) {
            setFazendaId(user.fazenda_id);
        }
    }, [user]);

    async function loadBaseData() {
        setLoading(true);
        try {
            // Fetch active farms
            const { data: farmsData } = await supabase
                .from('fazendas')
                .select('id, nome')
                .eq('ativo', true)
                .order('nome');

            if (farmsData) {
                setFazendas(farmsData);
                // If only one farm exists and user has no bound farm, select it
                if (farmsData.length === 1 && !fazendaId) {
                    setFazendaId(farmsData[0].id);
                }
            }

            // Fetch distinct suppliers for autocomplete
            const suppliers = await goodsReceiptService.getDistinctSuppliers();
            setHistoricoFornecedores(suppliers);

        } catch (error) {
            console.error('Erro ao carregar dados base:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleSubmit = async () => {
        if (!user?.id) {
            alert('Erro: Usuário não identificado. Faça login novamente.');
            return;
        }

        if (!fornecedor.trim()) return alert('Informe o nome do Fornecedor.');
        if (!notaFiscal.trim()) return alert('Informe o número da Nota Fiscal.');
        if (!fazendaId) return alert('Selecione a Fazenda de Destino.');

        setSubmitting(true);
        try {
            // 1. Salvar no banco via Service existente
            const payload = {
                receiver_id: user.id,
                supplier: fornecedor.trim(),
                invoice_number: notaFiscal.trim(),
                order_number: pedido.trim(),
                destination_farm_id: fazendaId,
                entry_at: new Date(dataEntrada).toISOString(),
                observation_entry: observacoes.trim()
            };

            const novoRecebimento = await goodsReceiptService.createReceipt(payload);

            // 2. Disparar notificação por E-mail (Re-buscamos pra garantir relacoes completas que o email necessita)
            try {
                const { data: fullReceipt, error: fetchError } = await supabase
                    .from('goods_receipts')
                    .select('*, destination_farm:destination_farm_id(nome), receiver:receiver_id(nome)')
                    .eq('id', novoRecebimento.id)
                    .single();

                if (fullReceipt && !fetchError) {
                    await notificationService.sendGoodsReceiptReport(fullReceipt, user?.email || undefined);
                }
            } catch (notifyError) {
                console.error('Mobile: Falha ao disparar e-mail de recebimento:', notifyError);
            }

            alert('Recebimento registrado na portaria com sucesso! 📦✅');
            navigate('/app');

        } catch (error: any) {
            console.error('Erro no salvamento mobile:', error);
            alert('Erro ao registrar entrada: ' + (error.message || 'Falha desconhecida.'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-full bg-slate-100 relative pb-28 font-sans">
            {/* Cabecalho Solid Color */}
            <header className="bg-orange-600 text-white px-4 pt-6 pb-20 sticky top-0 z-0">
                <div className="flex items-center gap-3 mb-2 relative z-10">
                    <button onClick={() => navigate('/app')} className="p-2 -ml-2 hover:bg-white/10 rounded-full text-white/90">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black flex items-center gap-2">
                            <Package size={20} className="text-orange-200" /> Recebimentos
                        </h1>
                        <p className="text-sm text-orange-200 font-medium">Registrar Entrada de Mercadoria</p>
                    </div>
                </div>
            </header>

            <main className="px-4 -mt-14 relative z-10 space-y-4">

                {/* Section 1: Contexto Automático (Travado) */}
                <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                            <User size={20} />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Recebedor Resp.</label>
                            <p className="text-sm font-bold text-slate-700 truncate">{user?.nome || 'Usuário Local'}</p>
                        </div>
                    </div>

                    <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 pl-1">Data / Hora Chegada *</label>
                        <input
                            type="datetime-local"
                            value={dataEntrada}
                            onChange={e => setDataEntrada(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm font-semibold focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                    </div>
                </section>

                {/* Section 2: Origem & Destino */}
                <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-4">
                    {/* Fornecedor com Datalist AutoComplete */}
                    <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 pl-1 flex items-center gap-1.5">
                            <Truck size={12} className="text-orange-500" /> Fornecedor *
                        </label>
                        <input
                            type="text"
                            list="fornecedores-historico"
                            value={fornecedor}
                            onChange={e => setFornecedor(e.target.value)}
                            placeholder="Nome transportadora ou fornecedor..."
                            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-base text-slate-800 font-medium placeholder:text-slate-400 placeholder:font-normal"
                            autoComplete="off"
                        />
                        <datalist id="fornecedores-historico">
                            {historicoFornecedores.map((f, i) => (
                                <option key={i} value={f} />
                            ))}
                        </datalist>
                    </div>

                    {/* Fazenda Destino */}
                    <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 pl-1 flex items-center gap-1.5">
                            <MapPin size={12} className="text-orange-500" /> Fazenda Destino *
                        </label>
                        <select
                            value={fazendaId}
                            onChange={e => setFazendaId(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-base text-slate-800 font-medium"
                            disabled={loading && fazendas.length === 0}
                        >
                            <option value="">Selecione o local...</option>
                            {fazendas.map(f => (
                                <option key={f.id} value={f.id}>{f.nome}</option>
                            ))}
                        </select>
                    </div>
                </section>

                {/* Section 3: Documentacao & Detalhes */}
                <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        {/* Nota Fiscal */}
                        <div>
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 pl-1 flex items-center gap-1.5">
                                <FileText size={12} className="text-orange-500" /> Nota Fiscal *
                            </label>
                            <input
                                type="text"
                                value={notaFiscal}
                                onChange={e => setNotaFiscal(e.target.value)}
                                placeholder="Nº da NF"
                                className="w-full px-4 py-3 bg-orange-50/50 border border-orange-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-base text-orange-900 font-bold placeholder:text-orange-300 placeholder:font-normal"
                            />
                        </div>

                        {/* Pedido */}
                        <div>
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 pl-1 flex items-center gap-1.5">
                                <FileText size={12} className="text-orange-500" /> Pedido
                            </label>
                            <input
                                type="text"
                                value={pedido}
                                onChange={e => setPedido(e.target.value)}
                                placeholder="Opcional"
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-base text-slate-800 font-medium placeholder:text-slate-300 placeholder:font-normal"
                            />
                        </div>
                    </div>

                    {/* Observações */}
                    <div className="pt-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1 pl-1">Avarias ou Observações (Opcional)</label>
                        <textarea
                            value={observacoes}
                            onChange={e => setObservacoes(e.target.value)}
                            placeholder="A carga chegou com lacre rompido? Molhada?"
                            rows={3}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-sm text-slate-700 placeholder:text-slate-400 resize-none"
                        />
                    </div>
                </section>
            </main>

            {/* F.A.B - Floating Action Button Fixado no Rodapé */}
            <div className="fixed bottom-20 left-0 right-0 px-4 z-50">
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-lg shadow-[0_8px_25px_-5px_rgba(234,88,12,0.5)] flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70 disabled:scale-100"
                >
                    {submitting ? (
                        <><span className="animate-spin w-5 h-5 border-2 border-white/20 border-t-white rounded-full"></span> Salvando...</>
                    ) : (
                        <><Save size={24} strokeWidth={2.5} /> SALVAR RECEBIMENTO</>
                    )}
                </button>
            </div>
        </div>
    );
}
