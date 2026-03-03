import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Box, Fuel, Camera, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { cleaningService } from '../../services/cleaningService';
import { notificationService } from '../../services/notificationService';
import { format } from 'date-fns';

export function MobileCleaning() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // State
    const [fazendas, setFazendas] = useState<{ id: string; nome: string }[]>([]);
    const [fazendaId, setFazendaId] = useState('');
    const [tipo, setTipo] = useState<'ALMOXARIFADO' | 'POSTO'>('ALMOXARIFADO');
    const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [observacoes, setObservacoes] = useState('');
    const [photos, setPhotos] = useState<File[]>([]);
    const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadFazendas();
    }, []);

    useEffect(() => {
        if (user?.fazenda_id && !fazendaId) {
            setFazendaId(user.fazenda_id);
        }
    }, [user, fazendaId]);

    async function loadFazendas() {
        setLoading(true);
        try {
            const { data: fazendasData } = await supabase
                .from('fazendas')
                .select('id, nome')
                .eq('ativo', true)
                .order('nome');

            if (fazendasData) {
                setFazendas(fazendasData);
                if (fazendasData.length === 1 && !fazendaId) {
                    setFazendaId(fazendasData[0].id);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar fazendas:', error);
        } finally {
            setLoading(false);
        }
    }

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setPhotos(prev => [...prev, ...newFiles]);

            const newPreviews = newFiles.map(file => URL.createObjectURL(file));
            setPhotoPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
        setPhotoPreviews(prev => {
            URL.revokeObjectURL(prev[index]);
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleSubmit = async () => {
        if (!fazendaId) {
            alert('Erro: É necessário selecionar uma filial.');
            return;
        }

        if (photos.length === 0) {
            alert('Por favor, anexe pelo menos uma foto para comprovar a limpeza.');
            return;
        }

        setSubmitting(true);
        try {
            const fazendaNome = fazendas.find(f => f.id === fazendaId)?.nome || user?.fazenda?.nome || 'Fazenda Desconhecida';

            // 1. Banco de Dados e Storage
            const newRegistry = await cleaningService.createCleaning({
                fazenda_id: fazendaId,
                usuario_id: user?.id || '',
                data: data,
                tipo: tipo,
                observacoes: observacoes
            }, photos);

            // 2. Email Notification
            const emailSent = await notificationService.sendCleaningReport(
                fazendaNome,
                tipo,
                user?.nome || 'Usuário',
                observacoes,
                newRegistry.fotos || [],
                fazendaId,
                user?.email,
                photos
            );

            if (!emailSent) {
                alert('Registro salvo com sucesso, mas houve erro no envio do e-mail. A TI foi notificada.');
            } else {
                alert('Limpeza registrada com sucesso! ✅\nE-mail enviado.');
            }

            navigate('/app');

        } catch (error: any) {
            console.error('Erro ao salvar:', error);
            alert('Erro ao salvar registro: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-full bg-slate-50 relative pb-28">
            {/* Cabecalho Clean */}
            <header className="bg-white border-b border-slate-200 px-4 pt-6 pb-4 sticky top-0 z-40">
                <div className="flex items-center gap-3 mb-4">
                    <button onClick={() => navigate('/app')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <Sparkles size={20} className="text-teal-500" /> Organização
                        </h1>
                        <p className="text-xs text-slate-500 font-medium">Registro de Limpeza</p>
                    </div>
                </div>

                {/* Seletores Principais de Contexto */}
                <div className="flex gap-2">
                    <div className="flex-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Filial *</label>
                        <select
                            value={fazendaId}
                            onChange={(e) => setFazendaId(e.target.value)}
                            className="w-full bg-slate-100 border-none text-slate-700 text-sm font-semibold rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-teal-500"
                            disabled={loading && fazendas.length === 0}
                        >
                            <option value="">Selecione...</option>
                            {fazendas.map(f => (
                                <option key={f.id} value={f.id}>{f.nome}</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-1/3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Data</label>
                        <input
                            type="date"
                            value={data}
                            onChange={(e) => setData(e.target.value)}
                            className="w-full bg-slate-100 border-none text-slate-700 text-sm font-semibold rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                </div>
            </header>

            <main className="p-4 space-y-6">

                {/* Seleção de Setor - Radio Buttons Estilizados */}
                <section>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-3 pl-1">Área Limpa *</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setTipo('ALMOXARIFADO')}
                            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all active:scale-95 ${tipo === 'ALMOXARIFADO'
                                    ? 'bg-teal-50 border-teal-500 text-teal-700 shadow-sm shadow-teal-500/20'
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-teal-300'
                                }`}
                        >
                            <Box size={32} className={tipo === 'ALMOXARIFADO' ? 'text-teal-600' : 'text-slate-400'} />
                            <span className="font-bold text-sm">Almoxarifado</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setTipo('POSTO')}
                            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all active:scale-95 ${tipo === 'POSTO'
                                    ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm shadow-orange-500/20'
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-orange-300'
                                }`}
                        >
                            <Fuel size={32} className={tipo === 'POSTO' ? 'text-orange-600' : 'text-slate-400'} />
                            <span className="font-bold text-sm leading-tight text-center">Posto de<br />Abastecimento</span>
                        </button>
                    </div>
                </section>

                {/* Evidências Fotográficas */}
                <section className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-1">
                            <Camera size={18} className="text-teal-500" />
                            Evidências Fotográficas *
                        </h3>
                        <p className="text-[11px] text-slate-400 font-medium">Capture o estado atual (Pelo menos 1 foto)</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {photoPreviews.map((src, idx) => (
                            <div key={idx} className="relative aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                                <img src={src} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => removePhoto(idx)}
                                    className="absolute top-1 right-1 bg-black/60 backdrop-blur text-white p-1.5 rounded-full active:scale-90 transition-transform"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}

                        <label className="aspect-square bg-slate-50 border-2 border-slate-200 border-dashed rounded-xl flex flex-col items-center justify-center text-teal-600 cursor-pointer active:bg-teal-50 active:border-teal-300 transition-colors">
                            <Camera size={24} className="mb-1" />
                            <span className="text-[10px] font-bold text-slate-500">ADICIONAR</span>
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                multiple
                                onChange={handlePhotoSelect}
                                className="hidden"
                            />
                        </label>
                    </div>
                </section>

                {/* Observações */}
                <section>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2 pl-1">Observações (Opcional)</label>
                    <textarea
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                        placeholder="Algum comentário sobre o estado da área ou materiais faltantes?"
                        rows={3}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-sm text-slate-700 placeholder:text-slate-400 resize-none shadow-sm"
                    />
                </section>

            </main>

            {/* F.A.B - Floating Action Button Fixado no Rodapé */}
            <div className="fixed bottom-20 left-0 right-0 px-4 z-50">
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-black text-lg shadow-[0_8px_25px_-5px_rgba(20,184,166,0.5)] flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70 disabled:scale-100"
                >
                    {submitting ? (
                        <><span className="animate-spin w-5 h-5 border-2 border-white/20 border-t-white rounded-full"></span> Salvando...</>
                    ) : (
                        <><Save size={24} strokeWidth={2.5} /> REGISTRAR LIMPEZA</>
                    )}
                </button>
            </div>
        </div>
    );
}
