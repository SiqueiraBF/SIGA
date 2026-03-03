
import { useState, useEffect } from 'react';
import { MapPin, Save, AppWindow } from 'lucide-react';
import { systemService } from '../../services/systemService';
import { farmService } from '../../services/farmService';
import { ModalHeader } from '../ui/ModalHeader';
import { ModalFooter } from '../ui/ModalFooter';

interface CleaningFarmSettingsModalProps {
    onClose: () => void;
}

export function CleaningFarmSettingsModal({ onClose }: CleaningFarmSettingsModalProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [farms, setFarms] = useState<{ id: string; nome: string }[]>([]);
    const [selectedFarmIds, setSelectedFarmIds] = useState<string[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Load all farms
            const allFarms = await farmService.getFarms();
            setFarms(allFarms);

            // Load saved config
            const params = await systemService.getParameters(['cleaning_monitored_farms']);
            const savedIdsStr = params['cleaning_monitored_farms'];

            if (savedIdsStr) {
                try {
                    const savedIds = JSON.parse(savedIdsStr);
                    if (Array.isArray(savedIds)) {
                        setSelectedFarmIds(savedIds);
                    }
                } catch (e) {
                    console.error("Error parsing monitored farms json", e);
                    // Default to all if parse error? Or none? 
                    // Let's default to all active farms to be safe if it's the first time
                    setSelectedFarmIds(allFarms.map(f => f.id));
                }
            } else {
                // If no config found, select all by default
                setSelectedFarmIds(allFarms.map(f => f.id));
            }

        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleFarm = (id: string) => {
        setSelectedFarmIds(prev =>
            prev.includes(id)
                ? prev.filter(fid => fid !== id)
                : [...prev, id]
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await systemService.updateParameter('cleaning_monitored_farms', JSON.stringify(selectedFarmIds));
            alert('Configurações de fazendas monitoradas salvas!');
            onClose();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200" onClick={onClose}>
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <ModalHeader
                    title="Fazendas Monitoradas"
                    subtitle="Selecione quais fazendas aparecem no status semanal"
                    icon={MapPin}
                    onClose={onClose}
                />

                <div className="p-0">
                    {isLoading ? (
                        <div className="p-6 space-y-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className="max-h-[60vh] overflow-y-auto">
                            <div className="divide-y divide-slate-100">
                                {farms.map(farm => {
                                    const isSelected = selectedFarmIds.includes(farm.id);
                                    return (
                                        <div
                                            key={farm.id}
                                            onClick={() => toggleFarm(farm.id)}
                                            className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50'}`}
                                        >
                                            <span className={`font-medium ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>
                                                {farm.nome}
                                            </span>
                                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 bg-white'}`}>
                                                {isSelected && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 text-center">
                        {selectedFarmIds.length} fazendas selecionadas para monitoramento.
                    </div>
                </div>

                <ModalFooter>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving || isLoading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 flex items-center gap-2"
                    >
                        {isSaving ? 'Salvando...' : <><Save size={18} /> Salvar Alterações</>}
                    </button>
                </ModalFooter>
            </div>
        </div>
    );
}
