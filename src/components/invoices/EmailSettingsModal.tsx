
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Settings, Save, X } from 'lucide-react';
import { systemService } from '../../services/systemService';
import { ModalHeader } from '../ui/ModalHeader';
import { ModalFooter } from '../ui/ModalFooter';

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

    const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema)
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setIsLoading(true);
        const params = await systemService.getParameters(['email_financeiro_to', 'email_financeiro_cc']);
        setValue('email_financeiro_to', params['email_financeiro_to'] || '');
        setValue('email_financeiro_cc', params['email_financeiro_cc'] || '');
        setIsLoading(false);
    };

    const onSubmit = async (data: FormData) => {
        try {
            await Promise.all([
                systemService.updateParameter('email_financeiro_to', data.email_financeiro_to),
                systemService.updateParameter('email_financeiro_cc', data.email_financeiro_cc || '')
            ]);
            alert('Configurações de e-mail atualizadas com sucesso!');
            onClose();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar configurações.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200" onClick={onClose}>
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <ModalHeader
                    title="Configuração de Notificações"
                    subtitle="Defina quem recebe os e-mails de novas notas"
                    icon={Mail}
                    onClose={onClose}
                />

                <div className="p-6">
                    {isLoading ? (
                        <div className="space-y-6 animate-pulse">
                            <div>
                                <div className="h-4 bg-slate-200 rounded w-48 mb-2"></div>
                                <div className="h-24 bg-slate-100 rounded-lg w-full border border-slate-200"></div>
                                <div className="h-3 bg-slate-100 rounded w-64 mt-2"></div>
                            </div>
                            <div>
                                <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
                                <div className="h-24 bg-slate-100 rounded-lg w-full border border-slate-200"></div>
                                <div className="h-3 bg-slate-100 rounded w-40 mt-2"></div>
                            </div>
                        </div>
                    ) : (
                        <form id="email-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Destinatários Principais (Para)</label>
                                <textarea
                                    {...register('email_financeiro_to')}
                                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                    placeholder="email1@empresa.com, email2@empresa.com"
                                    rows={2}
                                />
                                <p className="text-xs text-slate-500 mt-1">Separe múltiplos e-mails por vírgula.</p>
                                {errors.email_financeiro_to && <span className="text-red-500 text-xs">{errors.email_financeiro_to.message}</span>}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Cópia (CC)</label>
                                <textarea
                                    {...register('email_financeiro_cc')}
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
                        Cancelar
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
