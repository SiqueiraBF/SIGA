import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Save, Calendar, Users, Clock } from 'lucide-react';
import { systemService } from '../../services/systemService';
import { farmService } from '../../services/farmService';
import { ModalHeader } from '../ui/ModalHeader';
import { ModalFooter } from '../ui/ModalFooter';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface DirectReceiptEmailSettingsModalProps {
    onClose: () => void;
}

const schema = z.object({
    email_recebimento_direto_to: z.string().min(1, 'Obrigatório'),
    email_recebimento_direto_cc: z.string().optional(),
    // Periodic Report
    periodic_active: z.boolean(),
    periodic_days: z.string(),
    periodic_to: z.string().optional(),
    next_send_date: z.string(),
    periodic_from: z.string().email('E-mail inválido').or(z.literal('')),
});

type FormData = {
    email_recebimento_direto_to: string;
    email_recebimento_direto_cc?: string;
    periodic_active: boolean;
    periodic_days: string;
    periodic_to?: string;
    next_send_date: string;
    periodic_from: string;
};

export function DirectReceiptEmailSettingsModal({ onClose }: DirectReceiptEmailSettingsModalProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isTesting, setIsTesting] = useState(false);
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
        const keys = [
            selectedFarmId ? `email_recebimento_direto_to_${selectedFarmId}` : 'email_recebimento_direto_to',
            selectedFarmId ? `email_recebimento_direto_cc_${selectedFarmId}` : 'email_recebimento_direto_cc',
            'email_recebimento_direto_periodic_active',
            'email_recebimento_direto_periodicity',
            'email_recebimento_direto_periodic_to',
            'email_recebimento_direto_next_send',
            'email_recebimento_direto_periodic_from',
        ];

        const params = await systemService.getParameters(keys);

        const keyTo = keys[0];
        const keyCc = keys[1];
        const keyPActive = keys[2];
        const keyPDays = keys[3];
        const keyPTo = keys[4];
        const keyPNext = keys[5];
        const keyPFrom = keys[6];

        setValue('email_recebimento_direto_to', params[keyTo] || '');
        setValue('email_recebimento_direto_cc', params[keyCc] || '');
        setValue('periodic_active', params[keyPActive] === 'true');
        setValue('periodic_days', params[keyPDays] || '7');
        setValue('periodic_to', params[keyPTo] || '');
        setValue('next_send_date', params[keyPNext] || new Date().toISOString().split('T')[0]);
        setValue('periodic_from', params[keyPFrom] || '');

        setIsLoading(false);
    };

    const handleFarmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newId = e.target.value;
        setFarmId(newId);
        loadSettings(newId);
    };

    const onSubmit = async (data: FormData) => {
        try {
            const keyTo = farmId ? `email_recebimento_direto_to_${farmId}` : 'email_recebimento_direto_to';
            const keyCc = farmId ? `email_recebimento_direto_cc_${farmId}` : 'email_recebimento_direto_cc';
            const keyPActive = 'email_recebimento_direto_periodic_active';
            const keyPDays = 'email_recebimento_direto_periodicity';
            const keyPTo = 'email_recebimento_direto_periodic_to';
            const keyPNext = 'email_recebimento_direto_next_send';
            const keyPFrom = 'email_recebimento_direto_periodic_from';

            await Promise.all([
                systemService.updateParameter(keyTo, data.email_recebimento_direto_to),
                systemService.updateParameter(keyCc, data.email_recebimento_direto_cc || ''),
                systemService.updateParameter(keyPActive, String(data.periodic_active)),
                systemService.updateParameter(keyPDays, data.periodic_days),
                systemService.updateParameter(keyPTo, data.periodic_to || ''),
                systemService.updateParameter(keyPNext, data.next_send_date),
                systemService.updateParameter(keyPFrom, data.periodic_from || '')
            ]);

            toast.success(`Configurações (${farmId ? 'Fazenda' : 'Global'}) salvas!`);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar configurações.');
        }
    };

    const handleTestReport = async () => {
        setIsTesting(true);
        const t = toast.loading('Gerando relatório de teste...', { id: 'test-report' });
        try {
            const { data, error } = await supabase.functions.invoke('scheduled-direct-receipt-report', {
                body: { force: true }
            });

            if (error) throw error;
            if (data?.success) {
                const result = data.processed?.[0];
                if (result?.status === 'no_data') {
                    toast.error('Nenhum registro encontrado nos últimos 30 dias para esta unidade.', { id: 'test-report', duration: 5000 });
                } else if (result?.status === 'sent') {
                    toast.success(`Relatório enviado com sucesso! (${result.count} registros)`, { id: 'test-report' });
                } else {
                    toast.success('Processamento concluído.', { id: 'test-report' });
                }
            } else {
                throw new Error(data?.error || 'Erro desconhecido');
            }
        } catch (error: any) {
            console.error(error);
            toast.error(`Erro ao testar: ${error.message}`, { id: 'test-report' });
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200" onClick={onClose}>
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <ModalHeader
                    title="Notificações: Fuga Processo"
                    subtitle="Defina quem recebe os relatórios de Fuga Processo"
                    icon={Mail}
                    onClose={onClose}
                />

                <div className="p-5 bg-slate-50 border-b border-slate-100 flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Configurar para:</label>
                    <select
                        value={farmId}
                        onChange={handleFarmChange}
                        className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-bold bg-white shadow-sm"
                    >
                        <option value="">⚙️ CONFIGURAÇÃO GERAL (Todas as Fazendas)</option>
                        {farms.map(f => (
                            <option key={f.id} value={f.id}>{f.nome}</option>
                        ))}
                    </select>
                    <p className="text-[10px] text-slate-400 ml-1">
                        {farmId 
                            ? "✅ Editando apenas esta fazenda." 
                            : "📊 Esta configuração consolida os dados de todo o sistema."}
                    </p>
                </div>

                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">

                    {isLoading ? (
                        <div className="space-y-6 animate-pulse py-4">
                            <div className="h-20 bg-slate-100 rounded-2xl w-full"></div>
                            <div className="h-20 bg-slate-100 rounded-2xl w-full"></div>
                        </div>
                    ) : (
                        <form id="email-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                                    Destinatários Principais (Para) {farmId && <span className="text-blue-600 text-xs">(Específico)</span>}
                                </label>
                                <textarea
                                    {...register('email_recebimento_direto_to')}
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50/50"
                                    placeholder="exemplo@nadiana.com.br, outro@nadiana.com.br"
                                    rows={2}
                                />
                                <p className="text-[11px] text-slate-500 mt-1 ml-1">Separe múltiplos e-mails por vírgula.</p>
                                {errors.email_recebimento_direto_to && <span className="text-red-500 text-xs">{errors.email_recebimento_direto_to.message}</span>}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                                    Cópia (CC) {farmId && <span className="text-blue-600 text-xs">(Específico)</span>}
                                </label>
                                <textarea
                                    {...register('email_recebimento_direto_cc')}
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50/50"
                                    placeholder="copia@nadiana.com.br"
                                    rows={2}
                                />
                                <p className="text-[11px] text-slate-500 mt-1 ml-1">Opcional. Separe por vírgula.</p>
                            </div>

                            {/* Periodic Report Section */}
                            <div className="pt-4 border-t border-slate-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                                        <Clock size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800">Relatório Consolidado (Global)</h3>
                                        <p className="text-[11px] text-slate-500">Envio automático de todos os registros de todas as fazendas. (Independe do seletor acima)</p>
                                    </div>
                                </div>

                                <div className="space-y-4 bg-slate-50/50 p-4 rounded-2xl border border-dashed border-slate-200">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-slate-700">Ativar Relatório Automático</label>
                                        <input
                                            type="checkbox"
                                            {...register('periodic_active')}
                                            className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase ml-1 flex items-center gap-1">
                                            <Calendar size={12} /> Periodicidade
                                        </label>
                                        <select
                                            {...register('periodic_days')}
                                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                                        >
                                            <option value="7">A cada 7 dias (Semanal)</option>
                                            <option value="15">A cada 15 dias (Quinzenal)</option>
                                            <option value="30">A cada 30 dias (Mensal)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase ml-1 flex items-center gap-1">
                                            <Mail size={12} /> E-mail de Saída (Remetente)
                                        </label>
                                        <input
                                            type="email"
                                            {...register('periodic_from')}
                                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                                            placeholder="siga@nadiana.com.br"
                                        />
                                        <p className="text-[10px] text-slate-400 mt-1 ml-1">Deve ser uma conta válida no seu Office 365.</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase ml-1 flex items-center gap-1">
                                            <Users size={12} /> Destinatários do Consolidado
                                        </label>
                                        <textarea
                                            {...register('periodic_to')}
                                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                                            placeholder="gestao@nadiana.com.br"
                                            rows={2}
                                        />
                                        <p className="text-[10px] text-slate-400 mt-1 ml-1">Se vazio, usará os destinatários principais acima.</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase ml-1 flex items-center gap-1">
                                            <Calendar size={12} /> Data do Próximo Envio
                                        </label>
                                        <input
                                            type="date"
                                            {...register('next_send_date')}
                                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                                        />
                                        <p className="text-[10px] text-slate-400 mt-1 ml-1">Para disparar no fim do mês, escolha o dia 30 ou 31.</p>
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="button"
                                            onClick={handleTestReport}
                                            disabled={isTesting || isLoading}
                                            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2 border border-slate-200"
                                        >
                                            {isTesting ? 'Enviando teste...' : <>Testar Envio Agora</>}
                                        </button>
                                        <p className="text-[9px] text-slate-400 mt-1 text-center italic">
                                            O teste envia um relatório real com os dados dos últimos 30 dias para os destinatários acima.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </form>
                    )}
                </div>

                <ModalFooter>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg text-sm hover:bg-slate-50 transition-colors disabled:opacity-50 active:scale-95"
                    >
                        Fechar
                    </button>
                    <button
                        type="submit"
                        form="email-form"
                        disabled={isSubmitting || isLoading}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:active:scale-100 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/25 active:scale-95"
                    >
                        {isSubmitting ? 'Salvando...' : <><Save size={18} /> Salvar Configuração</>}
                    </button>
                </ModalFooter>
            </div>
        </div>
    );
}
