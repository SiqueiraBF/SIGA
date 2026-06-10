import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, User, Truck, MapPin, FileText, Save, ScanLine, Search, X, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { NativeBarcodeScanner } from '../../components/common/NativeBarcodeScanner';
import { SupplierFormModal } from '../../components/suppliers/SupplierFormModal';
import { Building2, UserPlus } from 'lucide-react';
import { goodsReceiptService } from '../../services/goodsReceiptService';
import { supplierService } from '../../services/supplierService';
import { Supplier } from '../../types';
import { notificationService } from '../../services/notificationService';
import { format } from 'date-fns';

export function MobileGoodsReceipt() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Data Loading states
    const [fazendas, setFazendas] = useState<{ id: string; nome: string }[]>([]);
    const [historicoFornecedores, setHistoricoFornecedores] = useState<Supplier[]>([]);

    // Form States
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [isSearchSupplierModalOpen, setIsSearchSupplierModalOpen] = useState(false);
    const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
    const [scannedCnpjNotRegistered, setScannedCnpjNotRegistered] = useState('');
    const [chaveNfe, setChaveNfe] = useState('');
    const [fornecedor, setFornecedor] = useState('');
    const [notaFiscal, setNotaFiscal] = useState('');
    const [pedido, setPedido] = useState('');
    const [fazendaId, setFazendaId] = useState('');
    const [dataEntrada, setDataEntrada] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    const [observacoes, setObservacoes] = useState('');
    const [operationType, setOperationType] = useState<'COMPRA' | 'CONSERTO'>('COMPRA');

    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBaseData();
        // REMOVED: Do not set default farm to force manual selection as requested by user
        // if (user?.fazenda_id) {
        //     setFazendaId(user.fazenda_id);
        // }
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
                // REMOVED: Do not auto-select even if only one farm exists
                // if (farmsData.length === 1 && !fazendaId) {
                //     setFazendaId(farmsData[0].id);
                // }
            }

            // Fetch suppliers via new service
            const suppliers = await supplierService.getActive();
            setHistoricoFornecedores(suppliers);

        } catch (error) {
            console.error('Erro ao carregar dados base:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleChaveNfeScan = async (valor: string) => {
        const raw = valor.replace(/\D/g, '');
        setChaveNfe(raw);

        // Se bater os 44 dígitos da CHAVE DE ACESSO NFe
        if (raw.length === 44) {
            // Extrair CNPJ (posição 6 a 19 - 14 dígitos)
            const nfeCnpj = raw.substring(6, 20);
            
            // Extrair Número da NF (posição 25 a 33 - 9 dígitos)
            const nfeNumberAndSeries = raw.substring(25, 34);
            const nfParseada = parseInt(nfeNumberAndSeries, 10).toString(); // remove zeros esquerda

            setNotaFiscal(nfParseada);

            // Tenta encontrar o fornecedor na base unificada
            const formattedCnpj = supplierService.formatCnpj(nfeCnpj);
            const fornecedorEncontrado = historicoFornecedores.find(
                s => supplierService.formatCnpj(s.cnpj) === formattedCnpj
            );

            if (fornecedorEncontrado) {
                setFornecedor(`${fornecedorEncontrado.razao_social} - ${fornecedorEncontrado.cnpj}`);
                setScannedCnpjNotRegistered('');
            } else {
                setFornecedor(formattedCnpj);
                setScannedCnpjNotRegistered(formattedCnpj);
            }
        }
    };

    const handleSupplierSuccess = (newSupplier: Supplier) => {
        setHistoricoFornecedores(prev => [newSupplier, ...prev]);
        setFornecedor(`${newSupplier.razao_social} - ${newSupplier.cnpj}`);
        setScannedCnpjNotRegistered('');
        setIsSupplierModalOpen(false);
    };

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
                observation_entry: observacoes.trim(),
                operation_type: operationType
            };

            const novoRecebimento = await goodsReceiptService.createReceipt(payload);

            // 2. Disparar notificação por E-mail (Re-buscamos pra garantir relacoes completas que o email necessita)
            try {
                const { supabase: supabaseClient } = await import('../../lib/supabase');
                const { data: fullReceipt, error: fetchError } = await supabaseClient
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

                {/* Section 2: Tipo de Operação */}
                <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2 pl-1">Natureza da Operação</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setOperationType('COMPRA')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                operationType === 'COMPRA'
                                    ? 'bg-white text-orange-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            COMPRA
                        </button>
                        <button
                            type="button"
                            onClick={() => setOperationType('CONSERTO')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                operationType === 'CONSERTO'
                                    ? 'bg-white text-orange-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            CONSERTO / DEVOLUÇÃO
                        </button>
                    </div>
                </section>

                {/* Section 3: Origem & Destino */}
                <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-4">
                    
                    {/* Leitor Cód Barras */}
                    <div>
                        <div className="flex justify-between items-end mb-1">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-1.5">
                                <FileText size={12} className="text-orange-500" /> Cód. de Barras (NFe)
                            </label>
                            <button 
                                onClick={() => setIsScannerOpen(true)}
                                className="text-[10px] bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold px-2 py-1 rounded-md flex items-center gap-1 transition-colors active:scale-95"
                            >
                                <ScanLine size={12} /> LER CÂMERA
                            </button>
                        </div>
                        <input
                            type="text"
                            value={chaveNfe}
                            onChange={e => handleChaveNfeScan(e.target.value)}
                            placeholder="Ou bipe/digite a chave..."
                            className="w-full px-4 py-3 bg-white border-2 border-dashed border-orange-300 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-base text-slate-800 font-mono text-center placeholder:font-sans placeholder:text-slate-400"
                            autoComplete="off"
                        />
                        {chaveNfe.length === 44 && (
                            <p className="text-xs font-bold text-green-600 mt-1 pl-1">Chave capturada com sucesso!</p>
                        )}
                    </div>

                    {/* Fornecedor */}
                    <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 pl-1 flex items-center gap-1.5">
                            <Truck size={12} className="text-orange-500" /> {operationType === 'COMPRA' ? 'Fornecedor (Origem)' : 'Fornecedor/Oficina (Destino Final)'} *
                        </label>
                        <div
                            onClick={() => setIsSearchSupplierModalOpen(true)}
                            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl flex items-center justify-between cursor-pointer active:bg-slate-50 transition-colors"
                        >
                            <span className={fornecedor ? "text-slate-800 text-sm font-medium truncate" : "text-slate-400 text-sm"}>
                                {fornecedor || "Tocar para buscar fornecedor..."}
                            </span>
                            <Search size={18} className="text-slate-400 shrink-0 ml-2" />
                        </div>

                        {/* Aviso de Não Cadastrado */}
                        {scannedCnpjNotRegistered && (
                            <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1">
                                <div className="flex items-center gap-2">
                                    <Building2 size={16} className="text-red-500" />
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-black text-red-600 uppercase">Não Cadastrado</span>
                                        <span className="text-[10px] text-red-500 leading-tight">Este CNPJ é novo no sistema.</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsSupplierModalOpen(true)}
                                    className="bg-red-600 text-white text-[10px] font-black px-3 py-2 rounded-lg flex items-center gap-1 active:scale-95 transition-transform"
                                >
                                    <UserPlus size={14} /> CADASTRAR AGORA
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Fazenda Destino */}
                    <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 pl-1 flex items-center gap-1.5">
                            <MapPin size={12} className="text-orange-500" /> {operationType === 'COMPRA' ? 'Fazenda Destino' : 'Fazenda de Origem'} *
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

            {/* Modal Extensão da Câmera (Native) */}
            {isScannerOpen && (
                <NativeBarcodeScanner 
                    expectedLength={44}
                    onClose={() => setIsScannerOpen(false)}
                    onScan={(barcode) => {
                        handleChaveNfeScan(barcode);
                        setIsScannerOpen(false);
                    }}
                />
            )}

            {/* Modal de Busca de Fornecedor */}
            {isSearchSupplierModalOpen && (
                <div className="fixed inset-0 bg-white z-[100] flex flex-col animate-in slide-in-from-bottom-4 duration-200">
                    <div className="bg-orange-600 text-white px-4 pt-6 pb-4 shadow-md flex items-center gap-3">
                        <button onClick={() => setIsSearchSupplierModalOpen(false)} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
                            <ArrowLeft size={24} />
                        </button>
                        <h2 className="text-lg font-black">Selecionar Fornecedor</h2>
                    </div>
                    <div className="p-4 bg-slate-50 border-b border-slate-200 sticky top-0 shadow-sm z-10">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input 
                                type="text"
                                autoFocus
                                value={supplierSearchQuery}
                                onChange={e => setSupplierSearchQuery(e.target.value)}
                                placeholder="Buscar por nome ou CNPJ..."
                                className="w-full pl-10 pr-10 py-3 bg-white border border-slate-300 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-base text-slate-800 shadow-inner"
                            />
                            {supplierSearchQuery && (
                                <button 
                                    onClick={() => setSupplierSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1 hover:text-slate-600"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 space-y-2">
                        {historicoFornecedores
                            .filter(f => {
                                const queryLower = supplierSearchQuery.toLowerCase();
                                const searchNumbers = supplierSearchQuery.replace(/\D/g, '');
                                const cnpjNumbers = f.cnpj.replace(/\D/g, '');
                                
                                return f.razao_social.toLowerCase().includes(queryLower) || 
                                       f.cnpj.includes(supplierSearchQuery) ||
                                       (searchNumbers && cnpjNumbers.includes(searchNumbers)) ||
                                       (f.nome_fantasia && f.nome_fantasia.toLowerCase().includes(queryLower));
                            })
                            .map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => {
                                        setFornecedor(`${f.razao_social} - ${f.cnpj}`);
                                        setIsSearchSupplierModalOpen(false);
                                        setSupplierSearchQuery('');
                                    }}
                                    className="w-full text-left p-4 bg-white rounded-xl border border-slate-200 hover:border-orange-400 active:bg-orange-50 active:scale-[0.99] transition-all shadow-sm flex flex-col gap-1"
                                >
                                    <p className="font-bold text-slate-800 text-sm">{f.razao_social}</p>
                                    <div className="flex items-center justify-between w-full">
                                        <p className="text-xs font-semibold text-slate-500">{supplierService.formatCnpj(f.cnpj)}</p>
                                        {f.nome_fantasia && <p className="text-[10px] text-slate-400 truncate max-w-[140px] uppercase font-bold tracking-wider">{f.nome_fantasia}</p>}
                                    </div>
                                </button>
                            ))}
                        
                        {supplierSearchQuery && (
                            <button
                                onClick={() => {
                                    setFornecedor(supplierSearchQuery);
                                    setIsSearchSupplierModalOpen(false);
                                    setSupplierSearchQuery('');
                                }}
                                className="w-full mt-4 p-4 border-2 border-dashed border-orange-400 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
                            >
                                <Check size={18} /> Usar "{supplierSearchQuery}"
                            </button>
                        )}
                        {!supplierSearchQuery && historicoFornecedores.length === 0 && (
                             <div className="text-center text-slate-500 py-8 text-sm font-medium">
                                Nenhum fornecedor encontrado.
                             </div>
                        )}
                        {supplierSearchQuery && historicoFornecedores.filter(f => {
                            const queryLower = supplierSearchQuery.toLowerCase();
                            const searchNumbers = supplierSearchQuery.replace(/\D/g, '');
                            const cnpjNumbers = f.cnpj.replace(/\D/g, '');
                            return f.razao_social.toLowerCase().includes(queryLower) || 
                                   f.cnpj.includes(supplierSearchQuery) ||
                                   (searchNumbers && cnpjNumbers.includes(searchNumbers)) ||
                                   (f.nome_fantasia && f.nome_fantasia.toLowerCase().includes(queryLower));
                        }).length === 0 && (
                            <div className="text-center py-6 px-4 bg-slate-100 rounded-xl border border-slate-200 mt-4">
                                <p className="text-sm font-bold text-slate-600 mb-1">Nenhum resultado</p>
                                <p className="text-xs text-slate-500">Você pode usar o texto digitado usando o botão acima, ou voltar e adicionar a chave da NFe para um cadastro automático.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal de Cadastro de Fornecedor (Mobile Overlay) */}
            <SupplierFormModal 
                isOpen={isSupplierModalOpen}
                initialCnpj={scannedCnpjNotRegistered}
                onClose={() => setIsSupplierModalOpen(false)}
                onSuccess={handleSupplierSuccess}
            />
        </div>
    );
}
