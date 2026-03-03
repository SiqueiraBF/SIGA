
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Settings, Save, X } from 'lucide-react';
import { systemService } from '../../services/systemService';
import { drainageService } from '../../services/drainageService';
import { farmService } from '../../services/farmService';
import { ModalHeader } from '../ui/ModalHeader';
import { ModalFooter } from '../ui/ModalFooter';

interface DrainageEmailSettingsModalProps {
    onClose: () => void;
}

const schema = z.object({
    email_drenagem_to: z.string().min(1, 'Obrigatório'),
    email_drenagem_cc: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function DrainageEmailSettingsModal({ onClose }: DrainageEmailSettingsModalProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [farmId, setFarmId] = useState(''); // Empty = Global/Default
    const [farms, setFarms] = useState<any[]>([]);

    const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema)
    });

    useEffect(() => {
        loadFarms();
        loadSettings('');
    }, []);

    const loadFarms = async () => {
        try {
            // Changed from drainageService.getDistinctFarms() to farmService.getFarms()
            // to include ALL registered farms, not just those with drainage history.
            const data = await farmService.getFarms();
            setFarms(data);
        } catch (error) {
            console.error(error);
        }
    }

    const loadSettings = async (selectedFarmId: string) => {
        setIsLoading(true);
        // Determine keys based on selection
        const keyTo = selectedFarmId ? `email_drenagem_to_${selectedFarmId}` : 'email_drenagem_to';
        const keyCc = selectedFarmId ? `email_drenagem_cc_${selectedFarmId}` : 'email_drenagem_cc';

        const params = await systemService.getParameters([keyTo, keyCc]);

        // If specific farm but no value yet, should we show empty or default? 
        // Showing empty is better so user knows it's not set.
        // If Global, show global value.
        setValue('email_drenagem_to', params[keyTo] || '');
        setValue('email_drenagem_cc', params[keyCc] || '');

        setIsLoading(false);
    };

    const handleFarmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newId = e.target.value;
        setFarmId(newId);
        loadSettings(newId);
    };

    const onSubmit = async (data: FormData) => {
        try {
            const keyTo = farmId ? `email_drenagem_to_${farmId}` : 'email_drenagem_to';
            const keyCc = farmId ? `email_drenagem_cc_${farmId}` : 'email_drenagem_cc';

            await Promise.all([
                systemService.updateParameter(keyTo, data.email_drenagem_to),
                systemService.updateParameter(keyCc, data.email_drenagem_cc || '')
            ]);
            alert(`Configurações de e-mail (${farmId ? 'Fazenda' : 'Global'}) atualizadas com sucesso!`);
            // Don't close immediately if user might want to edit another farm
            // onClose(); 
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar configurações.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200" onClick={onClose}>
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <ModalHeader
                    title="Notificações de Drenagem"
                    subtitle="Defina quem recebe os relatórios de drenagem"
                    icon={Mail}
                    onClose={onClose}
                />

                <div className="p-6 space-y-4">
                    {/* Farm Selector */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Configurar para:</label>
                        <select
                            value={farmId}
                            onChange={handleFarmChange}
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                        >
                            <option value="">⚙️ Padrão (Todas as Fazendas)</option>
                            <optgroup label="Específico por Fazenda">
                                {farms.map(f => (
                                    <option key={f.id} value={f.id}>{f.nome}</option>
                                ))}
                            </optgroup>
                        </select>
                        <p className="text-xs text-slate-400 mt-1">
                            {farmId
                                ? "Configurações específicas sobrescrevem o padrão global para esta fazenda."
                                : "Estas configurações serão usadas se a fazenda não tiver uma específica."}
                        </p>
                    </div>

                    {isLoading ? (
                        <div className="space-y-6 animate-pulse">
                            <div>
                                <div className="h-4 bg-slate-200 rounded w-48 mb-2"></div>
                                <div className="h-24 bg-slate-100 rounded-lg w-full border border-slate-200"></div>
                            </div>
                            <div>
                                <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
                                <div className="h-24 bg-slate-100 rounded-lg w-full border border-slate-200"></div>
                            </div>
                        </div>
                    ) : (
                        <form id="email-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">
                                    Destinatários Principais (Para) {farmId && <span className="text-blue-600 text-xs">(Específico)</span>}
                                </label>
                                <textarea
                                    {...register('email_drenagem_to')}
                                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                    placeholder="email1@empresa.com, email2@empresa.com"
                                    rows={2}
                                />
                                <p className="text-xs text-slate-500 mt-1">Separe múltiplos e-mails por vírgula.</p>
                                {errors.email_drenagem_to && <span className="text-red-500 text-xs">{errors.email_drenagem_to.message}</span>}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">
                                    Cópia (CC) {farmId && <span className="text-blue-600 text-xs">(Específico)</span>}
                                </label>
                                <textarea
                                    {...register('email_drenagem_cc')}
                                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                    placeholder="gerente@empresa.com"
                                    rows={2}
                                />
                                <p className="text-xs text-slate-500 mt-1">Opcional. Separe por vírgula.</p>
                            </div>
                        </form>
                    )}
                </div>

                <ModalFooter>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                    >
                        Fechar
                    </button>
                    <button
                        type="submit"
                        form="email-form"
                        disabled={isSubmitting || isLoading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 flex items-center gap-2"
                    >
                        {isSubmitting ? 'Salvando...' : <><Save size={18} /> Salvar Configuração</>}
                    </button>
                </ModalFooter>
            </div>
        </div>
    );
}
