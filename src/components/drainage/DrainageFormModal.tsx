import React, { useState, useEffect } from 'react';
import { X, Upload, Trash2, Save, Image as ImageIcon } from 'lucide-react';
import { MultiSelect } from '../ui/MultiSelect';
import { fuelService } from '../../services/fuelService';
import { drainageService, StationDrainage } from '../../services/drainageService';
import type { Posto } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface DrainageFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: StationDrainage; // Optional for editing
}

export function DrainageFormModal({ isOpen, onClose, onSuccess, initialData }: DrainageFormModalProps) {
    const { user } = useAuth();
    const [postos, setPostos] = useState<Posto[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [postoId, setPostoId] = useState('');
    const [dataDrenagem, setDataDrenagem] = useState(new Date().toISOString().split('T')[0]);
    const [litros, setLitros] = useState('');
    const [aspecto, setAspecto] = useState('');
    const [destino, setDestino] = useState('');
    const [observacoes, setObservacoes] = useState('');
    const [tanquesAdicionais, setTanquesAdicionais] = useState<{ id: string; nome: string }[]>([]);
    const [tanqueIdentificador, setTanqueIdentificador] = useState('');

    const [photos, setPhotos] = useState<File[]>([]);
    const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
    const [existingPhotos, setExistingPhotos] = useState<string[]>([]); // URLs of existing photos

    useEffect(() => {
        if (isOpen) {
            if (user?.fazenda_id) {
                loadPostos();
            }
            if (initialData) {
                // Populate form for editing
                setPostoId(initialData.posto_id);
                // Extract YYYY-MM-DD from timestamp
                setDataDrenagem(initialData.data_drenagem.split('T')[0]);
                setLitros(String(initialData.litros_drenados));
                setAspecto(initialData.aspecto_residuo);
                setDestino(initialData.destino_residuo);
                setObservacoes(initialData.observacoes || '');
                setExistingPhotos(initialData.fotos || []);
                setTanqueIdentificador(initialData.tanque_identificador || '');
                setPhotos([]);
                setPhotoPreviews([]);
            } else {
                // Reset form for creating
                setPostoId('');
                setDataDrenagem(new Date().toISOString().split('T')[0]);
                setLitros('');
                setAspecto('');
                setDestino('');
                setObservacoes('');
                setPhotos([]);
                setPhotoPreviews([]);
                setExistingPhotos([]);
            }
        }
    }, [isOpen, user, initialData]);

    useEffect(() => {
        if (postoId) {
            const selectedPosto = postos.find(p => p.id === postoId);
            if (selectedPosto?.tanques_adicionais) {
                setTanquesAdicionais(selectedPosto.tanques_adicionais);
            } else {
                setTanquesAdicionais([]);
            }
        } else {
            setTanquesAdicionais([]);
        }
    }, [postoId, postos]);

    async function loadPostos() {
        setLoading(true);
        try {
            const data = await fuelService.getPostos(user?.fazenda_id);
            setPostos(data.filter(p => p.ativo));
        } catch (error) {
            console.error('Erro ao carregar postos:', error);
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

    const removeExistingPhoto = (index: number) => {
        setExistingPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || (!user.fazenda_id && !initialData)) {
            alert('Erro: Usuário sem fazenda vinculada.');
            return;
        }
        if (!postoId || !litros || !aspecto || !destino) {
            alert('Preencha todos os campos obrigatórios.');
            return;
        }

        setSubmitting(true);
        try {
            if (initialData) {
                // UPDATE
                await drainageService.updateDrainage(
                    initialData.id,
                    {
                        posto_id: postoId,
                        data_drenagem: new Date(dataDrenagem).toISOString(),
                        litros_drenados: Number(litros),
                        aspecto_residuo: aspecto,
                        destino_residuo: destino,
                        observacoes: observacoes,
                        fotos: existingPhotos, // Keep existing photos that weren't removed
                        tanque_identificador: tanqueIdentificador || null
                    },
                    photos // Upload new photos
                );
                alert('Drenagem atualizada com sucesso!');
            } else {
                // CREATE
                await drainageService.createDrainage({
                    posto_id: postoId,
                    fazenda_id: user.fazenda_id!,
                    usuario_id: user.id,
                    data_drenagem: new Date(dataDrenagem).toISOString(),
                    litros_drenados: Number(litros),
                    aspecto_residuo: aspecto,
                    destino_residuo: destino,
                    observacoes: observacoes,
                    tanque_identificador: tanqueIdentificador || null
                }, photos);
                alert('Drenagem registrada com sucesso!');
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Erro ao salvar:', error);
            alert('Erro ao salvar: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-slate-800">Registrar Drenagem</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Posto */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Posto (Tanque) *</label>
                            <select
                                required
                                value={postoId}
                                onChange={e => setPostoId(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                disabled={loading}
                            >
                                <option value="">Selecione...</option>
                                {postos.map(p => (
                                    <option key={p.id} value={p.id}>{p.nome}</option>
                                ))}
                            </select>
                        </div>

                        {/* Data */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data *</label>
                            <input
                                type="date"
                                required
                                value={dataDrenagem}
                                onChange={e => setDataDrenagem(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        {/* Litros */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Litros Drenados (Est.) *</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.1"
                                    required
                                    value={litros}
                                    onChange={e => setLitros(e.target.value)}
                                    className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="0.00"
                                />
                                <span className="absolute right-3 top-2 text-slate-400 text-sm">L</span>
                            </div>
                        </div>

                        {/* Destino */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Destino do Resíduo *</label>
                            <select
                                required
                                value={destino}
                                onChange={e => setDestino(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            >
                                <option value="">Selecione...</option>
                                <option value="Descarte / Coleta Especializada">Descarte / Coleta Especializada</option>
                                <option value="Reuso na Oficina (Limpeza de Peças)">Reuso na Oficina (Limpeza de Peças)</option>
                                <option value="Retorno ao Tanque">Retorno ao Tanque</option>
                            </select>
                        </div>

                        {/* Aspecto */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Aspecto do Resíduo *</label>
                            <MultiSelect
                                options={[
                                    { value: 'Límpido e Isento', label: 'Límpido e Isento (Transparente, sem partículas)' },
                                    { value: 'Turvo', label: 'Turvo (Perda de transparência, possível umidade)' },
                                    { value: 'Com Água Livre', label: 'Com Água Livre (Separação clara de água no fundo)' },
                                    { value: 'Com Borra', label: 'Com Borra (Resíduos pastosos ou biológicos)' },
                                    { value: 'Com Sedimentos', label: 'Com Sedimentos (Areia, ferrugem, sólidos)' },
                                    { value: 'Escurecido', label: 'Escurecido (Oxidação, velho)' }
                                ]}
                                value={aspecto ? aspecto.split(', ').filter(Boolean) : []}
                                onChange={(newValues) => setAspecto(newValues.join(', '))}
                                placeholder="Selecione o aspecto..."
                            />
                        </div>

                        {/* Tanque Identifier */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tanque (Opcional)</label>
                            <select
                                value={tanqueIdentificador}
                                onChange={e => setTanqueIdentificador(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                disabled={tanquesAdicionais.length === 0}
                            >
                                <option value="">Tanque Principal / Único</option>
                                {tanquesAdicionais.map((t, idx) => (
                                    <option key={idx} value={t.nome}>{t.nome}</option>
                                ))}
                            </select>
                            {tanquesAdicionais.length === 0 && (
                                <p className="text-xs text-slate-400 mt-1">Este posto não possui tanques adicionais cadastrados.</p>
                            )}
                        </div>

                        {/* Observações */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Observações Adicionais</label>
                            <textarea
                                value={observacoes}
                                onChange={e => setObservacoes(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                            />
                        </div>

                        {/* Fotos */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Fotos da Drenagem</label>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                {existingPhotos.map((src, idx) => (
                                    <div key={`exist-${idx}`} className="relative group aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                        <img src={src} alt="Existing" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeExistingPhoto(idx)}
                                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1 rounded">Salva</span>
                                    </div>
                                ))}
                                {photoPreviews.map((src, idx) => (
                                    <div key={idx} className="relative group aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
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
                                    <Upload size={24} className="text-slate-400 group-hover:text-blue-500 mb-2" />
                                    <span className="text-xs text-slate-500 group-hover:text-blue-600 font-medium">Adicionar Foto</span>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={handlePhotoSelect}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                            <p className="text-xs text-slate-400">Permitido imagens JPG, PNG. Múltiplos arquivos.</p>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {submitting ? (
                                <>Salvando...</>
                            ) : (
                                <>
                                    <Save size={18} /> {initialData ? 'Atualizar Drenagem' : 'Salvar Drenagem'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
