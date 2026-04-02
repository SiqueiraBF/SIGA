import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { MultiSelect } from '../ui/MultiSelect';
import { PhotoEvidenceUploader } from '../ui/PhotoEvidenceUploader';
import { StationEntry, ASPECT_OPTIONS } from './SharedDrainageTypes';

interface OmittedEntry {
    stationName: string;
}

interface DrainageBatchStationCardProps {
    postoId: string;
    stationEntries: StationEntry[];
    globalIndices: number[];
    isExpanded: boolean;
    onToggleExpand: () => void;
    onUpdateEntry: (globalIndex: number, field: keyof StationEntry, value: any) => void;
    onPhotoSelect: (globalIndex: number, e: React.ChangeEvent<HTMLInputElement>) => void;
    onDropFiles: (globalIndex: number, files: File[]) => void;
    onRemovePhoto: (globalIndex: number, photoIndex: number) => void;
}

export function DrainageBatchStationCard({
    postoId,
    stationEntries,
    globalIndices,
    isExpanded,
    onToggleExpand,
    onUpdateEntry,
    onPhotoSelect,
    onDropFiles,
    onRemovePhoto
}: DrainageBatchStationCardProps) {
    const firstEntry = stationEntries[0];
    const isFilled = stationEntries.some((e) => e.litros && parseFloat(e.litros) > 0);

    return (
        <div
            className={`bg-white rounded-xl transition-all shadow-sm ${isExpanded ? 'ring-1 ring-blue-100' : 'border border-slate-200 hover:border-blue-300'}`}
        >
            {/* Group Header (Station Name) */}
            <div
                className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/30' : 'hover:bg-slate-50'}`}
                onClick={onToggleExpand}
            >
                <div className="flex items-center gap-4">
                    <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isFilled ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}
                    >
                        <div
                            className={`w-3 h-3 rounded-full ${isFilled ? 'bg-green-500' : 'bg-slate-400'}`}
                        />
                    </div>
                    <div>
                        <span
                            className={`font-bold block ${isFilled ? 'text-green-700' : 'text-slate-700'}`}
                        >
                            {firstEntry.stationName}
                        </span>
                        {stationEntries.length > 1 && (
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                {stationEntries.length} Tanques
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {isFilled && (
                        <span className="text-xs font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                            Preenchido
                        </span>
                    )}
                    {isExpanded ? (
                        <ChevronUp size={20} className="text-slate-400" />
                    ) : (
                        <ChevronDown size={20} className="text-slate-400" />
                    )}
                </div>
            </div>

            {/* Group Body (Forms) */}
            {isExpanded && (
                <div className="border-t border-slate-100 p-4 md:p-6 space-y-6">
                    {stationEntries.map((entry, subIdx) => {
                        const globalIndex = globalIndices[subIdx];

                        return (
                            <div
                                key={globalIndex}
                                className={`${subIdx > 0 ? 'pt-6 border-t border-dashed border-slate-200' : ''}`}
                            >
                                {/* Sub-header if multiple tanks */}
                                {stationEntries.length > 1 && (
                                    <div className="mb-4 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded">
                                            {entry.tankName}
                                        </span>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                    {/* Left Col: Inputs */}
                                    <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">
                                                LITROS DRENADOS
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={entry.litros}
                                                    onChange={(e) =>
                                                        onUpdateEntry(globalIndex, 'litros', e.target.value)
                                                    }
                                                    className="w-full pl-4 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700"
                                                    placeholder="0.00"
                                                />
                                                <span className="absolute right-3 top-2.5 text-slate-400 text-sm font-bold">
                                                    L
                                                </span>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">
                                                DESTINO
                                            </label>
                                            <select
                                                value={entry.destino}
                                                onChange={(e) =>
                                                    onUpdateEntry(globalIndex, 'destino', e.target.value)
                                                }
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-700"
                                            >
                                                <option value="">Selecione...</option>
                                                <option value="Descarte / Coleta Especializada">
                                                    Descarte / Coleta Especializada
                                                </option>
                                                <option value="Reuso na Oficina (Limpeza de Peças)">
                                                    Reuso na Oficina (Limpeza de Peças)
                                                </option>
                                                <option value="Retorno ao Tanque">
                                                    Retorno ao Tanque
                                                </option>
                                            </select>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">
                                                ASPECTO
                                            </label>
                                            <div className="bg-slate-50 border border-slate-200 rounded-lg">
                                                <MultiSelect
                                                    options={ASPECT_OPTIONS}
                                                    value={
                                                        entry.aspecto
                                                            ? entry.aspecto.split(', ').filter(Boolean)
                                                            : []
                                                    }
                                                    onChange={(newValues) =>
                                                        onUpdateEntry(
                                                            globalIndex,
                                                            'aspecto',
                                                            newValues.join(', '),
                                                        )
                                                    }
                                                    placeholder="Selecione o aspecto..."
                                                />
                                            </div>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">
                                                OBSERVAÇÕES
                                            </label>
                                            <input
                                                type="text"
                                                value={entry.observacoes}
                                                onChange={(e) =>
                                                    onUpdateEntry(
                                                        globalIndex,
                                                        'observacoes',
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                                placeholder="Opcional"
                                            />
                                        </div>
                                    </div>

                                    {/* Right Col: Photos */}
                                    <div className="md:col-span-4 flex flex-col pt-6 md:pt-0">
                                        <PhotoEvidenceUploader
                                            photoPreviews={entry.photoPreviews}
                                            onPhotoSelect={(e) => onPhotoSelect(globalIndex, e)}
                                            onDropFiles={(files) => onDropFiles(globalIndex, files)}
                                            onRemovePhoto={(photoIdx) => onRemovePhoto(globalIndex, photoIdx)}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
