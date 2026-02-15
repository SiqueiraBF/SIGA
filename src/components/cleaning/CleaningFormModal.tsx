import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Trash2, Calendar, AlertCircle } from 'lucide-react';
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

    useEffect(() => {
        if (isOpen) {
            // Reset form
            setTipo('ALMOXARIFADO');
            setData(format(new Date(), 'yyyy-MM-dd'));
            setObservacoes('');
            setPhotos([]);
            setPhotoPreviews([]);

            if (user?.fazenda_id) {
                setFazendaId(user.fazenda_id);
            } else {
                loadFazendas();
                setFazendaId('');
            }
        }
    }, [isOpen, user]);

    async function loadFazendas() {
        try {
            const { data } = await import('../../lib/supabase').then(async ({ supabase }) =>
                await supabase.from('fazendas').select('id, nome').eq('ativo', true).order('nome')
            );
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
            await cleaningService.createCleaning({
                fazenda_id: finalFazendaId,
                usuario_id: user.id,
                data: data,
                tipo: tipo,
                observacoes: observacoes
            }, photos);

            // 2. Send Email (Uses local photos for low egress)
            // Warning: We are not waiting for email to complete to unblock UI, but we could.
            // Let's await it to show error if any, since it's important.
            const emailSent = await notificationService.sendCleaningReport({
                fazendaNome: fazendaNome || 'Fazenda Desconhecida',
                usuarioNome: user.nome,
                tipo: tipo,
                data: data,
                observacoes: observacoes
            }, photos, user.email);

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <h2 className="text-xl font-bold text-slate-800">Registrar Limpeza</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">

                    {/* Info Card */}
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex gap-3 text-blue-800 text-sm">
                        <Calendar className="shrink-0" size={20} />
                        <div>
                            <p className="font-bold">Lembrete de Agenda:</p>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                                <li><strong>Segunda-feira:</strong> Almoxarifado</li>
                                <li><strong>Sexta-feira:</strong> Posto de Abastecimento</li>
                            </ul>
                        </div>
                    </div>

                    {/* Farm Select (Only if user has no farm) */}
                    {!user?.fazenda_id && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Fazenda *</label>
                            <select
                                value={fazendaId}
                                onChange={(e) => setFazendaId(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            >
                                <option value="">Selecione a Fazenda...</option>
                                {fazendas.map(f => (
                                    <option key={f.id} value={f.id}>{f.nome}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Setor *</label>
                        <select
                            value={tipo}
                            onChange={(e) => setTipo(e.target.value as any)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="ALMOXARIFADO">Almoxarifado</option>
                            <option value="POSTO">Posto de Abastecimento</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Data *</label>
                        <input
                            type="date"
                            required
                            value={data}
                            onChange={(e) => setData(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
                        <textarea
                            value={observacoes}
                            onChange={(e) => setObservacoes(e.target.value)}
                            rows={3}
                            placeholder="Alguma observação sobre as condições do local?"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Fotos *</label>
                        <div className="grid grid-cols-3 gap-3">
                            {photoPreviews.map((src, idx) => (
                                <div key={idx} className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200 group">
                                    <img src={src} alt="Preview" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removePhoto(idx)}
                                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}

                            <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer group">
                                <Upload size={24} className="text-slate-400 group-hover:text-blue-500 mb-1" />
                                <span className="text-xs text-slate-500 group-hover:text-blue-600 font-medium">Adicionar</span>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handlePhotoSelect}
                                    className="hidden"
                                />
                            </label>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Dica: Selecione várias fotos de uma vez.</p>
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg font-medium"
                            disabled={submitting}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                        >
                            {submitting ? 'Salvando...' : <><Save size={18} /> Salvar Registro</>}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
