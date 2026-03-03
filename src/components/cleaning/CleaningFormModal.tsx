import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Trash2, AlertCircle } from 'lucide-react';
import { cleaningService, CleaningRegistry } from '../../services/cleaningService';
import { notificationService } from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

interface CleaningFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function CleaningFormModal({ isOpen, onClose, onSuccess }: CleaningFormModalProps) {
    const { user } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [fazendas, setFazendas] = useState<{ id: string; nome: string }[]>([]);

    // Form States
    const [fazendaId, setFazendaId] = useState('');
    const [tipo, setTipo] = useState<'ALMOXARIFADO' | 'POSTO'>('ALMOXARIFADO');
    const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [observacoes, setObservacoes] = useState('');
    const [photos, setPhotos] = useState<File[]>([]);
    const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files) {
            const newFiles = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));

            if (newFiles.length > 0) {
                setPhotos(prev => [...prev, ...newFiles]);
                const newPreviews = newFiles.map(file => URL.createObjectURL(file));
                setPhotoPreviews(prev => [...prev, ...newPreviews]);
            }
        }
    };

    useEffect(() => {
        if (isOpen) {
            // Reset form
            setTipo('ALMOXARIFADO');
            setData(format(new Date(), 'yyyy-MM-dd'));
            setObservacoes('');
            setPhotos([]);
            setPhotoPreviews([]);

            // Always load all farms to allow selection
            loadFazendas();

            if (user?.fazenda_id) {
                setFazendaId(user.fazenda_id);
            } else {
                setFazendaId('');
            }
        }
    }, [isOpen, user]);

    async function loadFazendas(specificId?: string) {
        try {
            const query = import('../../lib/supabase').then(async ({ supabase }) => {
                let q = supabase.from('fazendas').select('id, nome').eq('ativo', true).order('nome');
                if (specificId) {
                    q = q.eq('id', specificId);
                }
                return await q;
            });

            const { data } = await query;
            if (data) setFazendas(data);
        } catch (error) {
            console.error('Erro ao carregar fazendas:', error);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate generic user presence
        if (!user) return;

        // If user has sticky farm, use it. If not, use selected farm.
        const finalFazendaId = user.fazenda_id || fazendaId;

        if (!finalFazendaId) {
            alert('Erro: É necessário selecionar uma fazenda vinculada.');
            return;
        }

        if (photos.length === 0) {
            alert('Por favor, anexe pelo menos uma foto para comprovar a limpeza.');
            return;
        }

        setSubmitting(true);

        try {
            // Find fazenda name for email if manual selection
            let fazendaNome = user.fazenda?.nome;
            if (!fazendaNome && finalFazendaId) {
                fazendaNome = fazendas.find(f => f.id === finalFazendaId)?.nome || 'Fazenda';
            }

            // 1. Create Database Record (Uploads photos to Storage)
            const newRegistry = await cleaningService.createCleaning({
                fazenda_id: finalFazendaId,
                usuario_id: user.id,
                data: data,
                tipo: tipo,
                observacoes: observacoes
            }, photos);

            // 2. Send Email (Uses public URLs from newRegistry)
            const emailSent = await notificationService.sendCleaningReport(
                fazendaNome || 'Fazenda Desconhecida',
                tipo,
                user.nome,
                observacoes,
                newRegistry.fotos || [], // Pass URLs (still used for potential logging or legacy, though HTML ignores them now)
                finalFazendaId,
                user.email,
                photos // Pass File objects for attachment
            );

            if (!emailSent) {
                alert('Registro salvo com sucesso, mas houve um erro ao enviar o e-mail automático. Verifique as configurações.');
            } else {
                alert('Registro salvo e e-mail enviado com sucesso!');
            }

            onSuccess();
            onClose();

        } catch (error: any) {
            console.error('Erro ao salvar limpeza:', error);
            alert('Erro ao salvar: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden font-sans">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Registrar Limpeza</h2>
                        <p className="text-xs text-slate-400 font-medium">Preencha os dados e anexe as evidências</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body - Split View */}
                <div className="flex-1 flex overflow-hidden">

                    {/* Sidebar - Context Data */}
                    <div className="w-[340px] shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
                        <div className="p-6 space-y-5">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                <AlertCircle size={12} /> Contexto
                            </div>

                            {/* Data */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Data *</label>
                                <input
                                    type="date"
                                    required
                                    value={data}
                                    onChange={(e) => setData(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            {/* Usuário (Travado) */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Responsável</label>
                                <input
                                    type="text"
                                    value={user?.nome || ''}
                                    disabled
                                    className="w-full px-4 py-2.5 bg-slate-100 border border-transparent rounded-lg text-slate-500 text-sm font-medium select-none"
                                />
                            </div>

                            {/* Fazenda */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Filial *</label>
                                <select
                                    value={fazendaId}
                                    onChange={(e) => setFazendaId(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                >
                                    <option value="">Selecione a Filial...</option>
                                    {fazendas.map(f => (
                                        <option key={f.id} value={f.id}>{f.nome}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Setor */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Setor *</label>
                                <select
                                    value={tipo}
                                    onChange={(e) => setTipo(e.target.value as any)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="ALMOXARIFADO">Almoxarifado</option>
                                    <option value="POSTO">Posto de Abastecimento</option>
                                </select>
                            </div>

                            {/* Observações */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Observações</label>
                                <textarea
                                    value={observacoes}
                                    onChange={(e) => setObservacoes(e.target.value)}
                                    rows={5}
                                    placeholder="Descreva as condições do local ou observações relevantes..."
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Main Content - Photos */}
                    <div className="flex-1 flex flex-col bg-slate-50/50 relative overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="max-w-3xl mx-auto">
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                                        <Upload size={20} className="text-blue-500" />
                                        Evidências Fotográficas
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">
                                        É obrigatório anexar fotos que comprovem a realização da limpeza e organização.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {photoPreviews.map((src, idx) => (
                                        <div key={idx} className="relative aspect-square bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 group group-hover:shadow-md transition-all">
                                            <img src={src} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <button
                                                    type="button"
                                                    onClick={() => removePhoto(idx)}
                                                    className="bg-white text-red-500 p-2 rounded-full shadow-lg hover:bg-red-50 hover:text-red-600 transform scale-90 group-hover:scale-100 transition-all"
                                                    title="Remover foto"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    <label
                                        className={`flex flex-col items-center justify-center aspect-square bg-white border-2 border-dashed rounded-xl transition-all cursor-pointer group ${isDragging ? 'border-blue-500 bg-blue-50/50' : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/50'}`}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                    >
                                        <div className={`p-3 rounded-full transition-colors mb-2 ${isDragging ? 'bg-blue-100' : 'bg-slate-50 group-hover:bg-blue-100'}`}>
                                            <Upload size={24} className={`${isDragging ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-600'}`} />
                                        </div>
                                        <span className={`text-sm font-medium ${isDragging ? 'text-blue-700' : 'text-slate-600 group-hover:text-blue-700'}`}>
                                            {isDragging ? 'Solte para adicionar' : 'Adicionar Foto'}
                                        </span>
                                        <span className="text-[10px] text-slate-400 mt-1">JPG, PNG</span>
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={handlePhotoSelect}
                                            className="hidden"
                                        />
                                    </label>

                                </div>
                                <p className="text-xs text-slate-400 mt-4 text-center">
                                    Dica: Selecione várias fotos de uma vez ao abrir a galeria.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg font-medium text-sm transition-colors"
                        disabled={submitting}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 shadow-sm shadow-blue-200 transition-all active:scale-[0.98]"
                    >
                        {submitting ? (
                            <>
                                <span className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full"></span>
                                Salvando...
                            </>
                        ) : (
                            <><Save size={18} /> Salvar Registro</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
