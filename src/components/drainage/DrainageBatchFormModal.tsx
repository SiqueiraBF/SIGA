import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Upload, AlertCircle, ChevronDown, ChevronUp, Trash2, Camera } from 'lucide-react';
import { MultiSelect } from '../ui/MultiSelect'; // Import component
import { fuelService } from '../../services/fuelService';
import { drainageService, StationDrainage } from '../../services/drainageService';
import { notificationService } from '../../services/notificationService';
import type { Posto, Fazenda } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface DrainageBatchFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface StationEntry {
    postoId: string;
    stationName: string; // Raw station name for grouping
    tankName?: string;   // Display name of the tank/sub-unit
    tanqueIdentificador?: string;
    litros: string;
    aspecto: string;
    destino: string;
    observacoes: string;
    photos: File[];
    photoPreviews: string[];
}

const ASPECT_OPTIONS = [
    { value: 'Límpido e Isento', label: 'Límpido e Isento (Transparente, sem partículas)' },
    { value: 'Turvo', label: 'Turvo (Perda de transparência, possível umidade)' },
    { value: 'Com Água Livre', label: 'Com Água Livre (Separação clara de água no fundo)' },
    { value: 'Com Borra', label: 'Com Borra (Resíduos pastosos ou biológicos)' },
    { value: 'Com Sedimentos', label: 'Com Sedimentos (Areia, ferrugem, sólidos)' },
    { value: 'Escurecido', label: 'Escurecido (Oxidação, velho)' }
];

export function DrainageBatchFormModal({ isOpen, onClose, onSuccess }: DrainageBatchFormModalProps) {
    const { user } = useAuth();
    const [fazendas, setFazendas] = useState<Fazenda[]>([]);
    const [selectedFazendaId, setSelectedFazendaId] = useState('');
    const [entries, setEntries] = useState<StationEntry[]>([]);
    const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]); // Posto IDs that are expanded
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [dataDrenagem, setDataDrenagem] = useState(new Date().toISOString().split('T')[0]);
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        setDraggingIndex(index);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDraggingIndex(null);
    };

    const handleDrop = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        setDraggingIndex(null);

        if (e.dataTransfer.files) {
            const newFiles = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));

            if (newFiles.length > 0) {
                setEntries(prev => {
                    const newEntries = [...prev];
                    const currentEntry = newEntries[index];

                    const updatedPhotos = [...currentEntry.photos, ...newFiles];
                    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
                    const updatedPreviews = [...currentEntry.photoPreviews, ...newPreviews];

                    newEntries[index] = {
                        ...currentEntry,
                        photos: updatedPhotos,
                        photoPreviews: updatedPreviews
                    };
                    return newEntries;
                });
            }
        }
    };

    // Load farms on mount
    useEffect(() => {
        if (isOpen) {
            loadFazendas();
            // Reset state
            setSelectedFazendaId('');
            setEntries([]);
            setExpandedGroupIds([]);
            setDataDrenagem(new Date().toISOString().split('T')[0]);
        }
    }, [isOpen]);

    // Load stations when farm is selected
    useEffect(() => {
        if (selectedFazendaId) {
            loadStations(selectedFazendaId);
        } else {
            setEntries([]);
        }
    }, [selectedFazendaId]);

    async function loadFazendas() {
        try {
            // Only load farms that have stations configured for drainage
            const data = await drainageService.getFarmsWithDrainageStations();
            setFazendas(data);

            // Default logic:
            // 1. If user has a specific farm assigned, select it (but still allow changing if they have permissions)
            if (user?.fazenda_id) {
                const userFarm = data.find(f => f.id === user.fazenda_id);
                if (userFarm) {
                    setSelectedFazendaId(userFarm.id);
                }
            } else if (data.length === 1) {
                // If only one farm available, select it
                setSelectedFazendaId(data[0].id);
            }
        } catch (error) {
            console.error('Erro ao carregar fazendas:', error);
        }
    }

    async function loadStations(fazendaId: string) {
        setLoading(true);
        try {
            const data = await fuelService.getPostos(fazendaId);
            // Filter: Active AND Physical AND Show in Drainage (default true if undefined)
            const physicalStations = data.filter(p =>
                p.ativo &&
                p.tipo === 'FISICO' &&
                (p.exibir_na_drenagem !== false) // Treat undefined/null as true
            );

            // Initialize entries
            const initialEntries: StationEntry[] = [];

            physicalStations.forEach(p => {
                const hasSubTanks = p.tanques_adicionais && Array.isArray(p.tanques_adicionais) && p.tanques_adicionais.length > 0;

                // 1. Posto Only (If no sub-tanks)
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
                        photoPreviews: []
                    });
                }

                // 2. Additional Tanks (If present)
                if (hasSubTanks) {
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
                            photoPreviews: []
                        });
                    });
                }
            });
            setEntries(initialEntries);
            setExpandedGroupIds([]); // Start all collapsed as requested ("minimizados")

        } catch (error) {
            console.error('Erro ao carregar postos:', error);
        } finally {
            setLoading(false);
        }
    }

    // Handlers for entry updates...
    const updateEntry = (index: number, field: keyof StationEntry, value: any) => {
        setEntries(prev => {
            const newEntries = [...prev];
            newEntries[index] = { ...newEntries[index], [field]: value };
            return newEntries;
        });
    };

    const handlePhotoSelect = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setEntries(prev => {
                const newEntries = [...prev];
                const currentEntry = newEntries[index];

                const updatedPhotos = [...currentEntry.photos, ...newFiles];
                const newPreviews = newFiles.map(file => URL.createObjectURL(file));
                const updatedPreviews = [...currentEntry.photoPreviews, ...newPreviews];

                newEntries[index] = {
                    ...currentEntry,
                    photos: updatedPhotos,
                    photoPreviews: updatedPreviews
                };
                return newEntries;
            });
        }
    };

    const removePhoto = (entryIndex: number, photoIndex: number) => {
        setEntries(prev => {
            const newEntries = [...prev];
            const currentEntry = newEntries[entryIndex];

            // Revoke URL
            URL.revokeObjectURL(currentEntry.photoPreviews[photoIndex]);

            const updatedPhotos = currentEntry.photos.filter((_, i) => i !== photoIndex);
            const updatedPreviews = currentEntry.photoPreviews.filter((_, i) => i !== photoIndex);

            newEntries[entryIndex] = {
                ...currentEntry,
                photos: updatedPhotos,
                photoPreviews: updatedPreviews
            };
            return newEntries;
        });
    };



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Filter entries that have at least some data filled (Litros is a good indicator)
        const filledEntries = entries.filter(ent => ent.litros && parseFloat(ent.litros) > 0);

        if (filledEntries.length === 0) {
            alert('Preencha os dados de pelo menos um posto para salvar.');
            return;
        }

        // Validate required fields for filled entries
        const invalid = filledEntries.some(ent => !ent.aspecto || !ent.destino);
        if (invalid) {
            alert('Para os postos preenchidos, Aspecto e Destino são obrigatórios.');
            return;
        }

        // Validate photos for filled entries (NEW REQUIREMENT)
        const missingPhotos = filledEntries.some(ent => ent.photos.length === 0);
        if (missingPhotos) {
            alert('É obrigatório anexar pelo menos uma foto (Evidência) para cada posto preenchido.');
            return;
        }

        // NEW VALIDATION: Check for partial multi-tank stations
        const involvedStationIds = new Set(filledEntries.map(e => e.postoId));

        for (const postoId of involvedStationIds) {
            const stationEntries = entries.filter(e => e.postoId === postoId); // All entries for this station
            const filledStationEntries = stationEntries.filter(e => e.litros && parseFloat(e.litros) > 0); // Filled ones

            if (filledStationEntries.length < stationEntries.length) {
                // Found a partial fill
                const stationName = stationEntries[0].stationName;
                alert(`O posto "${stationName}" possui tanques não preenchidos. Por favor, preencha todos os tanques deste posto.`);
                return;
            }
        }

        setSubmitting(true);
        try {
            // Sequential or Parallel save? Parallel is faster.
            const promises = filledEntries.map(entry => {
                return drainageService.createDrainage({
                    posto_id: entry.postoId,
                    fazenda_id: selectedFazendaId || user?.fazenda_id || '',
                    usuario_id: user?.id || '',
                    data_drenagem: new Date(dataDrenagem).toISOString(),
                    litros_drenados: Number(entry.litros),
                    aspecto_residuo: entry.aspecto,
                    destino_residuo: entry.destino,
                    observacoes: entry.observacoes,
                    tanque_identificador: entry.tanqueIdentificador
                }, entry.photos);
            });

            const results = await Promise.all(promises);
            const createdIds = results.filter(r => r && r.id).map(r => r.id);

            // Send Email Notification
            const selectedFazenda = fazendas.find(f => f.id === selectedFazendaId);
            let emailSent = false;
            let emailError = "";

            if (selectedFazenda && createdIds.length > 0) {
                try {
                    // Map filledEntries to include full labels for Aspecto in the email
                    const entriesForEmail = filledEntries.map(entry => {
                        const aspectValues = entry.aspecto ? entry.aspecto.split(', ') : [];
                        const aspectLabels = aspectValues.map(val => {
                            const option = ASPECT_OPTIONS.find(o => o.value === val);
                            return option ? option.label : val;
                        });
                        return {
                            ...entry,
                            aspecto: aspectLabels.join('<br/>') // Use HTML break for cleaner list in email
                        };
                    });

                    const success = await notificationService.sendDrainageReport(
                        selectedFazenda.nome,
                        entriesForEmail,
                        user?.email || undefined,
                        user?.nome || undefined,
                        selectedFazenda.id // Pass ID to fetch specific email config
                    );
                    emailSent = success;
                    if (!success) {
                        emailError = "O serviço de e-mail retornou falha (verifique configurações).";
                    }

                    // Update DB with email status
                    await drainageService.updateEmailStatus(
                        createdIds,
                        emailSent ? 'sent' : 'error',
                        emailError || undefined
                    );
                } catch (emailErr: any) {
                    console.error("Failed to send email report", emailErr);
                    emailError = emailErr.message || "Erro de conexão com o serviço de e-mail.";

                    // Update DB with error status
                    await drainageService.updateEmailStatus(createdIds, 'error', emailError);
                }
            }

            let msg = `${filledEntries.length} drenagens registradas com sucesso!`;
            if (emailSent) {
                msg += "\n✅ Relatório enviado por e-mail.";
            } else if (emailError) {
                msg += `\n⚠️ Mas houve um erro no e-mail: ${emailError}`;
            }

            alert(msg);
            onSuccess();
            onClose();

        } catch (error: any) {
            console.error('Erro no salvamento em lote:', error);
            alert('Erro ao salvar algumas drenagens. Verifique o console ou tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden font-sans">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Registrar Drenagem em Lote</h2>
                        <p className="text-xs text-slate-400 font-medium">Preencha os dados dos tanques drenados</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body - Split View */}
                <div className="flex-1 flex overflow-hidden">

                    {/* Sidebar - Context Data */}
                    <div className="w-[300px] shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
                        <div className="p-6 space-y-5">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                <AlertCircle size={12} /> Contexto
                            </div>

                            {/* Data */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Data da Drenagem</label>
                                <input
                                    type="date"
                                    required
                                    value={dataDrenagem}
                                    onChange={e => setDataDrenagem(e.target.value)}
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
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Fazenda</label>
                                <select
                                    value={selectedFazendaId}
                                    onChange={e => setSelectedFazendaId(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    disabled={loading && fazendas.length === 0}
                                >
                                    <option value="">Selecione uma fazenda...</option>
                                    {fazendas.map(f => (
                                        <option key={f.id} value={f.id}>{f.nome}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <h4 className="text-xs font-bold text-blue-800 mb-2">Resumo</h4>
                                <div className="text-sm text-blue-600">
                                    <span className="font-bold text-lg">{entries.filter(e => e.litros && parseFloat(e.litros) > 0).length}</span>
                                    <span className="opacity-80 ml-1">postos preenchidos</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content - Station List */}
                    <div className="flex-1 flex flex-col bg-slate-50/50 relative overflow-hidden">
                        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                                <div className="max-w-4xl mx-auto space-y-4">

                                    {loading ? (
                                        <div className="text-center py-20">
                                            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                                            <p className="text-slate-400 font-medium">Carregando postos...</p>
                                        </div>
                                    ) : entries.length === 0 ? (
                                        <div className="text-center py-20">
                                            <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <AlertCircle size={32} className="text-slate-400 opacity-50" />
                                            </div>
                                            <h3 className="text-slate-600 font-bold text-lg mb-1">Nenhum posto encontrado</h3>
                                            <p className="text-slate-400 text-sm">Selecione uma fazenda para carregar os postos de monitoramento.</p>
                                        </div>
                                    ) : (
                                        // Group entries by postoId for rendering
                                        Array.from(new Set(entries.map(e => e.postoId))).map(postoId => {
                                            const stationEntries = entries.filter(e => e.postoId === postoId);
                                            const firstEntry = stationEntries[0];
                                            const isExpanded = expandedGroupIds.includes(postoId);
                                            const isFilled = stationEntries.some(e => e.litros && parseFloat(e.litros) > 0);

                                            return (
                                                <div key={postoId} className={`bg-white rounded-xl transition-all shadow-sm ${isExpanded ? 'ring-1 ring-blue-100' : 'border border-slate-200 hover:border-blue-300'}`}>
                                                    {/* Group Header (Station Name) */}
                                                    <div
                                                        className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/30' : 'hover:bg-slate-50'}`}
                                                        onClick={() => {
                                                            setExpandedGroupIds(prev =>
                                                                prev.includes(postoId)
                                                                    ? prev.filter(id => id !== postoId)
                                                                    : [...prev, postoId]
                                                            );
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isFilled ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                                                <div className={`w-3 h-3 rounded-full ${isFilled ? 'bg-green-500' : 'bg-slate-400'}`} />
                                                            </div>
                                                            <div>
                                                                <span className={`font-bold block ${isFilled ? 'text-green-700' : 'text-slate-700'}`}>{firstEntry.stationName}</span>
                                                                {stationEntries.length > 1 && (
                                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{stationEntries.length} Tanques</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            {isFilled && <span className="text-xs font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">Preenchido</span>}
                                                            {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                                                        </div>
                                                    </div>

                                                    {/* Group Body (Forms) */}
                                                    {isExpanded && (
                                                        <div className="border-t border-slate-100 p-4 md:p-6 space-y-6">
                                                            {stationEntries.map((entry, subIdx) => {
                                                                // Find the actual index in the global 'entries' array to update state correctly
                                                                const globalIndex = entries.indexOf(entry);

                                                                return (
                                                                    <div key={globalIndex} className={`${subIdx > 0 ? 'pt-6 border-t border-dashed border-slate-200' : ''}`}>
                                                                        {/* Sub-header if multiple tanks */}
                                                                        {stationEntries.length > 1 && (
                                                                            <div className="mb-4 flex items-center gap-2">
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                                                                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded">{entry.tankName}</span>
                                                                            </div>
                                                                        )}

                                                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                                                                            {/* Left Col: Inputs */}
                                                                            <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                                <div>
                                                                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">LITROS DRENADOS</label>
                                                                                    <div className="relative">
                                                                                        <input
                                                                                            type="number"
                                                                                            step="0.1"
                                                                                            value={entry.litros}
                                                                                            onChange={e => updateEntry(globalIndex, 'litros', e.target.value)}
                                                                                            className="w-full pl-4 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700"
                                                                                            placeholder="0.00"
                                                                                        />
                                                                                        <span className="absolute right-3 top-2.5 text-slate-400 text-sm font-bold">L</span>
                                                                                    </div>
                                                                                </div>

                                                                                <div>
                                                                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">DESTINO</label>
                                                                                    <select
                                                                                        value={entry.destino}
                                                                                        onChange={e => updateEntry(globalIndex, 'destino', e.target.value)}
                                                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-700"
                                                                                    >
                                                                                        <option value="">Selecione...</option>
                                                                                        <option value="Descarte / Coleta Especializada">Descarte / Coleta Especializada</option>
                                                                                        <option value="Reuso na Oficina (Limpeza de Peças)">Reuso na Oficina (Limpeza de Peças)</option>
                                                                                        <option value="Retorno ao Tanque">Retorno ao Tanque</option>
                                                                                    </select>
                                                                                </div>

                                                                                <div className="md:col-span-2">
                                                                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">ASPECTO</label>
                                                                                    <div className="bg-slate-50 border border-slate-200 rounded-lg">
                                                                                        <MultiSelect
                                                                                            options={ASPECT_OPTIONS}
                                                                                            value={entry.aspecto ? entry.aspecto.split(', ').filter(Boolean) : []}
                                                                                            onChange={(newValues) => updateEntry(globalIndex, 'aspecto', newValues.join(', '))}
                                                                                            placeholder="Selecione o aspecto..."
                                                                                        />
                                                                                    </div>
                                                                                </div>

                                                                                <div className="md:col-span-2">
                                                                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">OBSERVAÇÕES</label>
                                                                                    <input
                                                                                        type="text"
                                                                                        value={entry.observacoes}
                                                                                        onChange={e => updateEntry(globalIndex, 'observacoes', e.target.value)}
                                                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                                                                        placeholder="Opcional"
                                                                                    />
                                                                                </div>
                                                                            </div>

                                                                            {/* Right Col: Photos */}
                                                                            <div className="md:col-span-4 border-l border-slate-100 pl-6">
                                                                                <label className="block text-xs font-bold text-slate-500 mb-2.5 flex items-center gap-2">
                                                                                    <Camera size={14} /> EVIDÊNCIAS
                                                                                </label>
                                                                                <div className="grid grid-cols-2 gap-2">
                                                                                    {entry.photoPreviews.map((src, photoIdx) => (
                                                                                        <div key={photoIdx} className="relative group aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                                                                                            <img src={src} alt="Preview" className="w-full h-full object-cover" />
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => removePhoto(globalIndex, photoIdx)}
                                                                                                className="absolute top-1 right-1 bg-white/90 text-red-500 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-white shadow-sm"
                                                                                            >
                                                                                                <Trash2 size={12} />
                                                                                            </button>
                                                                                        </div>
                                                                                    ))}

                                                                                    {/* Camera Button for Mobile/Tablet */}
                                                                                    <label className="flex lg:hidden flex-col items-center justify-center aspect-square bg-blue-50 border-2 border-blue-200 border-dashed rounded-lg active:bg-blue-100 transition-colors cursor-pointer text-blue-600">
                                                                                        <Camera size={20} />
                                                                                        <span className="text-[9px] font-bold mt-1">Câmera</span>
                                                                                        <input
                                                                                            type="file"
                                                                                            accept="image/*"
                                                                                            capture="environment"
                                                                                            onChange={(e) => handlePhotoSelect(globalIndex, e)}
                                                                                            className="hidden"
                                                                                        />
                                                                                    </label>

                                                                                    {/* Standard Upload */}
                                                                                    <label
                                                                                        className={`flex flex-col items-center justify-center aspect-square border-2 border-dashed rounded-lg transition-all cursor-pointer group ${draggingIndex === globalIndex ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white hover:border-blue-500 hover:bg-blue-50'}`}
                                                                                        onDragOver={(e) => handleDragOver(e, globalIndex)}
                                                                                        onDragLeave={handleDragLeave}
                                                                                        onDrop={(e) => handleDrop(e, globalIndex)}
                                                                                    >
                                                                                        <div className={`p-1.5 rounded-full transition-colors mb-1 ${draggingIndex === globalIndex ? 'bg-blue-100' : 'bg-slate-50 group-hover:bg-blue-100'}`}>
                                                                                            <Upload size={16} className={`${draggingIndex === globalIndex ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-600'}`} />
                                                                                        </div>
                                                                                        <span className={`text-[9px] font-bold ${draggingIndex === globalIndex ? 'text-blue-700' : 'text-slate-500 group-hover:text-blue-700'}`}>
                                                                                            {draggingIndex === globalIndex ? 'Solte' : 'Adicionar'}
                                                                                        </span>
                                                                                        <input
                                                                                            type="file"
                                                                                            multiple
                                                                                            accept="image/*"
                                                                                            onChange={(e) => handlePhotoSelect(globalIndex, e)}
                                                                                            className="hidden"
                                                                                        />
                                                                                    </label>
                                                                                </div>
                                                                            </div>

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
                                </div>
                            </div>

                            {/* Sticky Footer */}
                            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white z-10">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-6 py-2.5 text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg font-medium text-sm transition-colors"
                                    disabled={submitting}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || entries.filter(e => e.litros).length === 0}
                                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 shadow-sm shadow-blue-200 transition-all active:scale-[0.98]"
                                >
                                    {submitting ? (
                                        <>
                                            <span className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full"></span>
                                            Salvando...
                                        </>
                                    ) : (
                                        <><Save size={18} /> Salvar Lote</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
