import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Save, Clock, AlertCircle, ChevronRight, MapPin, Gauge } from 'lucide-react';
import { systemService } from '../../services/systemService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    // Updated props to receive full objects
    farms: { id: string; nome: string }[];
    stations: { id: string; nome: string; fazenda_id: string; nuntec_reservoir_id: string }[];
    onSave: () => void;
}

interface ScheduleInterval {
    start: string;
    end: string;
}

interface StationSchedules {
    [reservoirId: string]: ScheduleInterval[];
}

const STORAGE_KEY = 'nuntec_fueling_schedules_v2'; // New key for new format

export function FuelingScheduleSettingsModal({ isOpen, onClose, farms, stations, onSave }: Props) {
    const [selectedFarmId, setSelectedFarmId] = useState<string>('');
    const [selectedStationId, setSelectedStationId] = useState<string>(''); // Internal DB ID
    const [schedules, setSchedules] = useState<StationSchedules>({});
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Load from System Parameters on mount/open
    useEffect(() => {
        if (isOpen) {
            loadSchedules();
            // Select first farm by default if none selected
            if (farms.length > 0 && !selectedFarmId) {
                setSelectedFarmId(farms[0].id);
            }
        }
    }, [isOpen]);

    async function loadSchedules() {
        try {
            const saved = await systemService.getParameter(STORAGE_KEY);
            if (saved) {
                setSchedules(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Failed to parse schedules from DB", e);
        }
    }

    const handleSave = async () => {
        try {
            await systemService.updateParameter(STORAGE_KEY, JSON.stringify(schedules));
            setHasUnsavedChanges(false);
            onSave(); // Notify parent to reload filter settings
            onClose();
        } catch (error) {
            console.error("Error saving schedules:", error);
            alert("Erro ao salvar configurações. Tente novamente.");
        }
    };

    // Helper to get current station's schedule key (reservoir_id)
    const getCurrentStationKey = () => {
        const station = stations.find(s => s.id === selectedStationId);
        return station?.nuntec_reservoir_id ? String(station.nuntec_reservoir_id) : null;
    };

    const addInterval = () => {
        const key = getCurrentStationKey();
        if (!key) return;

        const current = schedules[key] || [];
        const newInterval: ScheduleInterval = { start: '07:00', end: '17:00' };

        setSchedules({
            ...schedules,
            [key]: [...current, newInterval]
        });
        setHasUnsavedChanges(true);
    };

    const removeInterval = (index: number) => {
        const key = getCurrentStationKey();
        if (!key) return;

        const current = [...(schedules[key] || [])];
        current.splice(index, 1);
        setSchedules({
            ...schedules,
            [key]: current
        });
        setHasUnsavedChanges(true);
    };

    const updateInterval = (index: number, field: 'start' | 'end', value: string) => {
        const key = getCurrentStationKey();
        if (!key) return;

        const current = [...(schedules[key] || [])];
        current[index] = { ...current[index], [field]: value };
        setSchedules({
            ...schedules,
            [key]: current
        });
        setHasUnsavedChanges(true);
    };

    if (!isOpen) return null;

    // Filter stations for selected farm
    const farmStations = stations.filter(s => s.fazenda_id === selectedFarmId);

    // Get currently selected station object
    const selectedStation = stations.find(s => s.id === selectedStationId);
    const selectedStationKey = selectedStation?.nuntec_reservoir_id ? String(selectedStation.nuntec_reservoir_id) : null;
    const currentIntervals = selectedStationKey ? (schedules[selectedStationKey] || []) : [];

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2 text-slate-800">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                            <Clock size={20} />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg">Configurar Horários por Posto</h2>
                            <p className="text-xs text-slate-500">Defina os horários permitidos para cada posto individualmente</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-[240px_280px_1fr] divide-x divide-slate-100">

                    {/* Column 1: Farms */}
                    <div className="flex flex-col bg-slate-50/50">
                        <div className="p-3 border-b border-slate-100 bg-slate-100/50">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <MapPin size={12} /> Fazendas
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {farms.map(farm => (
                                <button
                                    key={farm.id}
                                    onClick={() => {
                                        setSelectedFarmId(farm.id);
                                        setSelectedStationId(''); // Reset station selection
                                    }}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-between group ${selectedFarmId === farm.id
                                            ? 'bg-blue-50 text-blue-700 font-medium shadow-sm'
                                            : 'hover:bg-slate-100 text-slate-600'
                                        }`}
                                >
                                    <span className="truncate">{farm.nome}</span>
                                    {selectedFarmId === farm.id && <ChevronRight size={14} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Column 2: Stations (of selected Farm) */}
                    <div className="flex flex-col bg-white">
                        <div className="p-3 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Gauge size={12} /> Postos da Unidade
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {!selectedFarmId ? (
                                <div className="p-4 text-center text-slate-400 text-sm">
                                    Selecione uma fazenda
                                </div>
                            ) : farmStations.length === 0 ? (
                                <div className="p-4 text-center text-slate-400 text-sm">
                                    Nenhum posto encontrado
                                </div>
                            ) : (
                                farmStations.map(station => {
                                    const key = String(station.nuntec_reservoir_id);
                                    const hasRules = (schedules[key]?.length || 0) > 0;

                                    return (
                                        <button
                                            key={station.id}
                                            onClick={() => setSelectedStationId(station.id)}
                                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all border border-transparent ${selectedStationId === station.id
                                                    ? 'bg-blue-50 border-blue-100 text-blue-700 font-medium'
                                                    : 'hover:bg-slate-50 text-slate-600 hover:border-slate-100'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="truncate font-medium">{station.nome}</span>
                                                {hasRules && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Possui regras" />
                                                )}
                                            </div>
                                            <div className="text-[10px] text-slate-400 truncate">
                                                ID Tanque: {station.nuntec_reservoir_id || 'N/A'}
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Column 3: Schedules (of selected Station) */}
                    <div className="flex flex-col bg-slate-50/30">
                        <div className="p-3 border-b border-slate-100 bg-white">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Clock size={12} /> Horários Permitidos
                            </h3>
                        </div>

                        <div className="flex-1 p-5 overflow-y-auto">
                            {!selectedStationId ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                    <MapPin size={48} className="mb-4 text-slate-200" />
                                    <p>Selecione um posto para configurar</p>
                                </div>
                            ) : !selectedStation?.nuntec_reservoir_id ? (
                                <div className="h-full flex flex-col items-center justify-center text-amber-500 opacity-80 text-center px-6">
                                    <AlertCircle size={48} className="mb-4" />
                                    <h4 className="font-bold mb-2">Posto sem Vínculo Nuntec</h4>
                                    <p className="text-sm">Este posto não possui um ID de tanque (Nuntec) configurado. Não é possível aplicar regras de horário.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-4 flex items-center justify-between">
                                        <div>
                                            <span className="text-sm text-slate-500">Configurando:</span>
                                            <h4 className="font-bold text-slate-800 text-lg">{selectedStation.nome}</h4>
                                        </div>

                                        {currentIntervals.length === 0 && (
                                            <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs rounded-md">
                                                Sem restrições (24h)
                                            </span>
                                        )}
                                    </div>

                                    {currentIntervals.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center text-slate-400 py-10 border-2 border-dashed border-slate-200 rounded-lg bg-white/50">
                                            <Clock size={32} className="mb-2 opacity-50" />
                                            <p className="text-sm">Nenhum horário definido.</p>
                                            <p className="text-xs text-center px-4 mt-1">
                                                Abastecimentos neste posto serão permitidos em qualquer horário.
                                            </p>
                                            <button
                                                onClick={addInterval}
                                                className="mt-4 px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-2"
                                            >
                                                <Plus size={16} /> Adicionar Horário
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {currentIntervals.map((interval, idx) => (
                                                <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm animate-in slide-in-from-left-2 duration-200">
                                                    <div className="flex-1 grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Início</label>
                                                            <input
                                                                type="time"
                                                                value={interval.start}
                                                                onChange={(e) => updateInterval(idx, 'start', e.target.value)}
                                                                className="w-full text-lg font-mono font-medium text-slate-700 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 rounded px-2 py-1 transition-colors"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Fim</label>
                                                            <input
                                                                type="time"
                                                                value={interval.end}
                                                                onChange={(e) => updateInterval(idx, 'end', e.target.value)}
                                                                className="w-full text-lg font-mono font-medium text-slate-700 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 rounded px-2 py-1 transition-colors"
                                                            />
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => removeInterval(idx)}
                                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all self-center"
                                                        title="Remover intervalo"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            ))}

                                            <button
                                                onClick={addInterval}
                                                className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Plus size={16} /> Adicionar Outro Intervalo
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <AlertCircle size={14} className="text-amber-500" />
                        <span>As alterações são aplicadas imediatamente ao salvar.</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!hasUnsavedChanges}
                            className={`px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 transition-all shadow-sm ${hasUnsavedChanges
                                ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                                : 'bg-slate-400 cursor-not-allowed opacity-50'
                                }`}
                        >
                            <Save size={16} /> Salvar Configuração
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
