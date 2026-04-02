import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Save } from 'lucide-react';
import { systemService } from '../../services/systemService';
import { farmService } from '../../services/farmService';
import { ModalHeader } from '../ui/ModalHeader';
import { ModalFooter } from '../ui/ModalFooter';
import toast from 'react-hot-toast';

interface EmailSettingsModalProps {
    onClose: () => void;
}

const schema = z.object({
    email_financeiro_to: z.string().min(1, 'Obrigatório'),
    email_financeiro_cc: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function EmailSettingsModal({ onClose }: EmailSettingsModalProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [farmId, setFarmId] = useState(''); // Empty = Global/Default
    const [farms, setFarms] = useState<any[]>([]);

    const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema)
    });

    useEffect(() => {
        loadFarms();
        loadSettings('');
    }, []);

    const loadFarms = async () => {
        try {
            const data = await farmService.getFarms();
            setFarms(data);
        } catch (error) {
            console.error(error);
        }
    };

    const loadSettings = async (selectedFarmId: string) => {
        setIsLoading(true);
        const keyTo = selectedFarmId ? `email_financeiro_to_${selectedFarmId}` : 'email_financeiro_to';
        const keyCc = selectedFarmId ? `email_financeiro_cc_${selectedFarmId}` : 'email_financeiro_cc';

        const params = await systemService.getParameters([keyTo, keyCc]);

        setValue('email_financeiro_to', params[keyTo] || '');
        setValue('email_financeiro_cc', params[keyCc] || '');

        setIsLoading(false);
    };

    const handleFarmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newId = e.target.value;
        setFarmId(newId);
        loadSettings(newId);
    };

    const onSubmit = async (data: FormData) => {
        try {
            const keyTo = farmId ? `email_financeiro_to_${farmId}` : 'email_financeiro_to';
            const keyCc = farmId ? `email_financeiro_cc_${farmId}` : 'email_financeiro_cc';

            await Promise.all([
                systemService.updateParameter(keyTo, data.email_financeiro_to),
                systemService.updateParameter(keyCc, data.email_financeiro_cc || '')
            ]);

            toast.success(`Configurações (${farmId ? 'Fazenda' : 'Global'}) salvas!`);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar configurações.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200" onClick={onClose}>
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <ModalHeader
                    title="Configuração de Notificações"
                    subtitle="Defina quem recebe os e-mails de novas notas"
                    icon={Mail}
                    onClose={onClose}
                />

                <div className="p-6 space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase ml-1">Configurar para:</label>
                        <select
                            value={farmId}
                            onChange={handleFarmChange}
                            className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 text-sm font-bold bg-white"
                        >
                            <option value="">⚙️ Padrão (Todas as Fazendas)</option>
                            {farms.map(f => (
                                <option key={f.id} value={f.id}>{f.nome}</option>
                            ))}
                        </select>
                        <p className="text-[11px] text-slate-400 mt-2 ml-1">
                            {farmId
                                ? "Configurações específicas sobrescrevem o padrão global para esta fazenda."
                                : "Estas configurações serão usadas se a fazenda não tiver uma específica."}
                        </p>
                    </div>

                    {isLoading ? (
                        <div className="space-y-6 animate-pulse py-4">
                            <div className="h-20 bg-slate-100 rounded-2xl w-full"></div>
                            <div className="h-20 bg-slate-100 rounded-2xl w-full"></div>
                        </div>
                    ) : (
                        <form id="email-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                                    Destinatários Principais (Para) {farmId && <span className="text-teal-600 text-xs">(Específico)</span>}
                                </label>
                                <textarea
                                    {...register('email_financeiro_to')}
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 text-sm bg-slate-50/50"
                                    placeholder="exemplo@nadiana.com.br, outro@nadiana.com.br"
                                    rows={2}
                                />
                                <p className="text-[11px] text-slate-500 mt-1 ml-1">Separe múltiplos e-mails por vírgula.</p>
                                {errors.email_financeiro_to && <span className="text-red-500 text-xs">{errors.email_financeiro_to.message}</span>}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                                    Cópia (CC) {farmId && <span className="text-teal-600 text-xs">(Específico)</span>}
                                </label>
                                <textarea
                                    {...register('email_financeiro_cc')}
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 text-sm bg-slate-50/50"
                                    placeholder="copia@nadiana.com.br"
                                    rows={2}
                                />
                                <p className="text-[11px] text-slate-500 mt-1 ml-1">Opcional. Separe por vírgula.</p>
                            </div>
                        </form>
                    )}
                </div>

                <ModalFooter>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                    >
                        Fechar
                    </button>
                    <button
                        type="submit"
                        form="email-form"
                        disabled={isSubmitting || isLoading}
                        className="px-8 py-2.5 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20 flex items-center gap-2"
                    >
                        {isSubmitting ? 'Salvando...' : <><Save size={18} /> Salvar Configuração</>}
                    </button>
                </ModalFooter>
            </div>
        </div>
    );
}
