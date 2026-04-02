import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Droplet,
    Camera,
    Save,
    ChevronDown,
    ChevronUp,
    Trash2,
    MapPin,
    CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fuelService } from '../../services/fuelService';
import { drainageService } from '../../services/drainageService';
import type { Fazenda, Posto } from '../../types';
import { useDrainageSubmit } from '../../hooks/useDrainageSubmit';
import { toast } from 'react-hot-toast';
import { PhotoEvidenceUploader } from '../../components/ui/PhotoEvidenceUploader';
import { StationEntry, ASPECT_OPTIONS } from '../../components/drainage/SharedDrainageTypes';

export function MobileDrainage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { mutateAsync: submitBatch } = useDrainageSubmit();

    const [fazendas, setFazendas] = useState<Fazenda[]>([]);
    const [selectedFazendaId, setSelectedFazendaId] = useState('');
    const [entries, setEntries] = useState<StationEntry[]>([]);
    const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [dataDrenagem, setDataDrenagem] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        loadFazendas();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (selectedFazendaId) {
            loadStations(selectedFazendaId);
        } else {
            setEntries([]);
            setExpandedGroupIds([]);
        }
    }, [selectedFazendaId]);

    async function loadFazendas() {
        try {
            const data = await drainageService.getFarmsWithDrainageStations();
            setFazendas(data);

            if (user?.fazenda_id) {
                const userFarm = data.find((f) => f.id === user.fazenda_id);
                if (userFarm) setSelectedFazendaId(userFarm.id);
            } else if (data.length === 1) {
                setSelectedFazendaId(data[0].id);
            }
        } catch (error) {
            console.error('Erro ao carregar fazendas:', error);
        }
    }

    async function loadStations(fazendaId: string) {
        setLoading(true);
        try {
            const data = await fuelService.getPostos(fazendaId) as Posto[];
            const physicalStations = data.filter(
                (p) => p.ativo && p.tipo === 'FISICO' && p.exibir_na_drenagem !== false,
            );

            const initialEntries: StationEntry[] = [];

            physicalStations.forEach((p) => {
                const hasSubTanks =
                    p.tanques_adicionais &&
                    Array.isArray(p.tanques_adicionais) &&
                    p.tanques_adicionais.length > 0;

                if (!hasSubTanks) {
                    initialEntries.push({
                        postoId: p.id,
                        stationName: p.nome,
                        tankName: 'Tanque Principal',
                        tanqueIdentificador: undefined,
                        litros: '',
                        aspecto: '',
                        destino: '',
                        observacoes: '',
                        photos: [],
                        photoPreviews: [],
                    });
                } else {
                    p.tanques_adicionais!.forEach((t: { id: string; nome: string }) => {
                        initialEntries.push({
                            postoId: p.id,
                            stationName: p.nome,
                            tankName: t.nome,
                            tanqueIdentificador: t.nome,
                            litros: '',
                            aspecto: '',
                            destino: '',
                            observacoes: '',
                            photos: [],
                            photoPreviews: [],
                        });
                    });
                }
            });
            setEntries(initialEntries);
            setExpandedGroupIds([]);
        } catch (error) {
            console.error('Erro ao carregar postos:', error);
        } finally {
            setLoading(false);
        }
    }

    const updateEntry = (index: number, field: keyof StationEntry, value: any) => {
        setEntries((prev) => {
            const newEntries = [...prev];
            newEntries[index] = { ...newEntries[index], [field]: value };
            return newEntries;
        });
    };

    const toggleAspect = (index: number, aspectValue: string) => {
        const currentAspects = entries[index].aspecto ? entries[index].aspecto.split(', ') : [];
        let newAspects;

        if (currentAspects.includes(aspectValue)) {
            newAspects = currentAspects.filter((a) => a !== aspectValue);
        } else {
            newAspects = [...currentAspects, aspectValue];
        }

        updateEntry(index, 'aspecto', newAspects.join(', '));
    };

    const handlePhotoSelect = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            addFilesToEntry(index, newFiles);
        }
    };

    const handleDropFiles = (index: number, newFiles: File[]) => {
        if (newFiles.length > 0) {
            addFilesToEntry(index, newFiles);
        }
    };

    const addFilesToEntry = (index: number, newFiles: File[]) => {
        setEntries((prev) => {
            const newEntries = [...prev];
            const currentEntry = newEntries[index];

            const updatedPhotos = [...currentEntry.photos, ...newFiles];
            const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
            const updatedPreviews = [...currentEntry.photoPreviews, ...newPreviews];

            newEntries[index] = {
                ...currentEntry,
                photos: updatedPhotos,
                photoPreviews: updatedPreviews,
            };
            return newEntries;
        });
    };

    const removePhoto = (entryIndex: number, photoIndex: number) => {
        setEntries((prev) => {
            const newEntries = [...prev];
            const currentEntry = newEntries[entryIndex];

            URL.revokeObjectURL(currentEntry.photoPreviews[photoIndex]);

            const updatedPhotos = currentEntry.photos.filter((_, i) => i !== photoIndex);
            const updatedPreviews = currentEntry.photoPreviews.filter((_, i) => i !== photoIndex);

            newEntries[entryIndex] = {
                ...currentEntry,
                photos: updatedPhotos,
                photoPreviews: updatedPreviews,
            };
            return newEntries;
        });
    };

    const handleSubmit = async () => {
        const filledEntries = entries.filter((ent) => ent.litros && parseFloat(ent.litros) > 0);

        if (filledEntries.length === 0) return;

        const invalid = filledEntries.some((ent) => !ent.aspecto || !ent.destino);
        if (invalid) {
            toast.error('Aspecto e Destino são obrigatórios para os postos preenchidos.');
            return;
        }

        const missingPhotos = filledEntries.some((ent) => ent.photos.length === 0);
        if (missingPhotos) {
            toast.error('É obrigatório anexar pelo menos uma evidência para cada tanque preenchido.');
            return;
        }

        const involvedStationIds = new Set(filledEntries.map((e) => e.postoId));
        for (const postoId of involvedStationIds) {
            const stationEntries = entries.filter((e) => e.postoId === postoId);
            const filledStationEntries = stationEntries.filter(
                (e) => e.litros && parseFloat(e.litros) > 0,
            );
            if (filledStationEntries.length < stationEntries.length) {
                const stationName = stationEntries[0].stationName;
                toast.error(
                    `O ${stationName} possui tanques não preenchidos. Preencha todos deste conjunto.`,
                );
                return;
            }
        }

        setSubmitting(true);
        try {
            const selectedFazenda = fazendas.find((f) => f.id === selectedFazendaId);

            const args = filledEntries.map((entry) => {
                const aspectValues = entry.aspecto ? entry.aspecto.split(', ') : [];
                const aspectLabels = aspectValues.map(val => {
                    const option = ASPECT_OPTIONS.find(o => o.value === val);
                    return option ? option.label : val;
                });
                const emailAspecto = aspectLabels.join('<br/>');

                return {
                    drainage: {
                        posto_id: entry.postoId,
                        fazenda_id: selectedFazendaId || user?.fazenda_id || '',
                        usuario_id: user?.id || '',
                        data_drenagem: new Date(dataDrenagem).toISOString(),
                        litros_drenados: Number(entry.litros),
                        aspecto_residuo: entry.aspecto,
                        destino_residuo: entry.destino,
                        observacoes: entry.observacoes,
                        tanque_identificador: entry.tanqueIdentificador,
                    },
                    photos: entry.photos,
                    fazendaNome: selectedFazenda?.nome,
                    stationName: entry.stationName,
                    usuarioEmail: user?.email,
                    usuarioNome: user?.nome,
                    sendEmail: true,
                };
            });

            const { records, emailSent, emailError } = await submitBatch(args);

            let msg = `${records.length} drenagens registradas!`;
            if (emailSent) {
                msg += '\n✅ Relatório enviado.';
                toast.success(msg, { duration: 4000 });
            } else if (emailError) {
                msg += `\n⚠️ Erro no e-mail: ${emailError}`;
                toast.success(msg, { duration: 5000, icon: '⚠️' });
            } else {
                toast.success(msg);
            }

            navigate('/app');
        } catch (error: any) {
            console.error('Erro no salvamento:', error);
            toast.error('Erro ao salvar as drenagens (Falha de conexão).');
        } finally {
            setSubmitting(false);
        }
    };

    const filledCount = entries.filter((e) => e.litros && parseFloat(e.litros) > 0).length;

    return (
        <div className="min-h-full bg-slate-50 relative pb-24">
            {/* Cabecalho Minimalista Base */}
            <header className="bg-white border-b border-slate-200 px-4 pt-6 pb-4 sticky top-0 z-40">
                <div className="flex items-center gap-3 mb-4">
                    <button
                        onClick={() => navigate('/app')}
                        className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <Droplet size={20} className="text-blue-600" /> Drenagem
                        </h1>
                        <p className="text-xs text-slate-500 font-medium">Registro em Lote</p>
                    </div>
                </div>

                {/* Seletores Iniciais (Glow Context) */}
                <div className="flex gap-2">
                    <div className="flex-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                            Fazenda
                        </label>
                        <select
                            value={selectedFazendaId}
                            onChange={(e) => setSelectedFazendaId(e.target.value)}
                            className="w-full bg-slate-100 border-none text-slate-700 text-sm font-semibold rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={loading && fazendas.length === 0}
                        >
                            <option value="">Selecione...</option>
                            {fazendas.map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.nome}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="w-1/3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                            Data
                        </label>
                        <input
                            type="date"
                            value={dataDrenagem}
                            onChange={(e) => setDataDrenagem(e.target.value)}
                            className="w-full bg-slate-100 border-none text-slate-700 text-sm font-semibold rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </header>

            {/* Listagem de Postos/Tanques (Acordeões) */}
            <main className="p-4 space-y-3">
                {loading ? (
                    <div className="py-20 text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                        <p className="text-slate-400 text-sm font-medium">Buscando tanques...</p>
                    </div>
                ) : !selectedFazendaId ? (
                    <div className="py-16 text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MapPin size={28} className="text-blue-400" />
                        </div>
                        <p className="text-slate-500 font-medium">
                            Selecione uma fazenda acima para listar os postos.
                        </p>
                    </div>
                ) : entries.length === 0 ? (
                    <div className="py-16 text-center text-slate-500 font-medium">
                        Nenhum posto encontrado.
                    </div>
                ) : (
                    Array.from(new Set(entries.map((e) => e.postoId))).map((postoId) => {
                        const stationEntries = entries.filter((e) => e.postoId === postoId);
                        const firstEntry = stationEntries[0];
                        const isExpanded = expandedGroupIds.includes(postoId);
                        const isFilled = stationEntries.some((e) => e.litros && parseFloat(e.litros) > 0);

                        return (
                            <div
                                key={postoId}
                                className={`bg-white rounded-2xl overflow-hidden transition-all shadow-sm border ${isFilled ? 'border-green-200' : 'border-slate-200'}`}
                            >
                                {/* Card Header (Touch Area) */}
                                <button
                                    className="w-full text-left flex items-center justify-between p-4 bg-white active:bg-slate-50"
                                    onClick={() => {
                                        setExpandedGroupIds((prev) =>
                                            prev.includes(postoId)
                                                ? prev.filter((id) => id !== postoId)
                                                : [...prev, postoId],
                                        );
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${isFilled ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}
                                        >
                                            {isFilled ? (
                                                <CheckCircle2 size={20} />
                                            ) : (
                                                <div className="w-2.5 h-2.5 bg-slate-400 rounded-full" />
                                            )}
                                        </div>
                                        <div>
                                            <span
                                                className={`block font-bold text-base ${isFilled ? 'text-green-700' : 'text-slate-800'}`}
                                            >
                                                {firstEntry.stationName}
                                            </span>
                                            {stationEntries.length > 1 && (
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                    {stationEntries.length} Tanques
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-slate-400">
                                        {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                    </div>
                                </button>

                                {/* Card Body (Form expanded) */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-6">
                                        {stationEntries.map((entry, subIdx) => {
                                            const globalIndex = entries.indexOf(entry);

                                            return (
                                                <div
                                                    key={globalIndex}
                                                    className={`${subIdx > 0 ? 'pt-6 border-t border-dashed border-slate-200' : ''}`}
                                                >
                                                    {stationEntries.length > 1 && (
                                                        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-full">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                                                                {entry.tankName}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="space-y-5">
                                                        {/* Litros Input Gigante */}
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 block mb-1.5">
                                                                LITROS DRENADOS
                                                            </label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    step="0.1"
                                                                    inputMode="decimal"
                                                                    value={entry.litros}
                                                                    onChange={(e) =>
                                                                        updateEntry(globalIndex, 'litros', e.target.value)
                                                                    }
                                                                    className="w-full px-4 py-4 text-2xl font-black bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-300 text-slate-800"
                                                                    placeholder="0.0"
                                                                />
                                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl font-bold">
                                                                    L
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Destino */}
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 block mb-1.5">
                                                                DESTINO
                                                            </label>
                                                            <select
                                                                value={entry.destino}
                                                                onChange={(e) =>
                                                                    updateEntry(globalIndex, 'destino', e.target.value)
                                                                }
                                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-base text-slate-700 font-medium"
                                                            >
                                                                <option value="">Selecione...</option>
                                                                <option value="Descarte / Coleta Especializada">
                                                                    Descarte especializado
                                                                </option>
                                                                <option value="Reuso na Oficina (Limpeza de Peças)">
                                                                    Reuso Oficina
                                                                </option>
                                                                <option value="Retorno ao Tanque">Retorno ao Tanque</option>
                                                            </select>
                                                        </div>

                                                        {/* Aspecto - Pílulas Touch-friendly */}
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 block mb-2">
                                                                ASPECTO DA AMOSTRA
                                                            </label>
                                                            <div className="flex flex-wrap gap-2">
                                                                {ASPECT_OPTIONS.map((opt) => {
                                                                    const isActive =
                                                                        entry.aspecto && entry.aspecto.includes(opt.value);
                                                                    return (
                                                                        <button
                                                                            key={opt.value}
                                                                            type="button"
                                                                            onClick={() => toggleAspect(globalIndex, opt.value)}
                                                                            className={`px-4 py-2 rounded-full border text-sm font-semibold transition-all active:scale-95 ${isActive
                                                                                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/30'
                                                                                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                                                                                }`}
                                                                        >
                                                                            {opt.label}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        {/* Fotos - Extracted Uploader */}
                                                        <div>
                                                            <PhotoEvidenceUploader
                                                                photoPreviews={entry.photoPreviews}
                                                                onPhotoSelect={(e) => handlePhotoSelect(globalIndex, e)}
                                                                onDropFiles={(files) => handleDropFiles(globalIndex, files)}
                                                                onRemovePhoto={(photoIdx) => removePhoto(globalIndex, photoIdx)}
                                                            />
                                                        </div>

                                                        {/* Observações */}
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 block mb-1.5">
                                                                OBSERVAÇÕES
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={entry.observacoes}
                                                                onChange={(e) =>
                                                                    updateEntry(globalIndex, 'observacoes', e.target.value)
                                                                }
                                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                                                placeholder="Opcional..."
                                                            />
                                                        </div>

                                                        {/* Botao Salvar do Card (Apenas p/ UI Fechar o Card) */}
                                                        <button
                                                            onClick={() => {
                                                                // Se estiver preenchido minimamente, feche o card.
                                                                if (entry.litros) {
                                                                    setExpandedGroupIds((prev) =>
                                                                        prev.filter((id) => id !== postoId),
                                                                    );
                                                                }
                                                            }}
                                                            className={`w-full py-3 mt-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${entry.litros ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}
                                                        >
                                                            <CheckCircle2 size={18} /> Continuar
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </main>

            {/* F.A.B - Floating Action Button Fixado no Rodapé */}
            {filledCount > 0 && (
                <div className="fixed bottom-20 left-0 right-0 px-4 z-50 animate-in fade-in slide-in-from-bottom-8">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg shadow-[0_10px_25px_-5px_rgba(37,99,235,0.4)] flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-70"
                    >
                        {submitting ? (
                            <>
                                <span className="animate-spin w-5 h-5 border-2 border-white/20 border-t-white rounded-full"></span>{' '}
                                Enviando...
                            </>
                        ) : (
                            <>
                                <Save size={24} /> ENVIAR RELATÓRIO ({filledCount})
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
