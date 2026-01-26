import React, { useState } from 'react';
import { X } from 'lucide-react';
import { TimelineEvent } from '../services/dashboardService';

interface TimelineModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (event: Omit<TimelineEvent, 'id'>, recurrence?: { frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY', until: string }) => Promise<void>;
}

export function TimelineModal({ isOpen, onClose, onSave }: TimelineModalProps) {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [type, setType] = useState<TimelineEvent['type']>('GERAL');
    const [description, setDescription] = useState('');

    // Recurrence State
    const [isRecurring, setIsRecurring] = useState(false);
    const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');
    const [untilDate, setUntilDate] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const recurrenceConfig = isRecurring && untilDate ? { frequency, until: untilDate } : undefined;

            await onSave({
                title,
                date: new Date(date).toISOString(),
                type,
                description
            }, recurrenceConfig);

            onClose();
            // Reset fields
            setTitle(''); setDate(''); setType('GERAL'); setDescription('');
            setIsRecurring(false); setUntilDate('');
        } catch (err: any) {
            console.error(err);
            alert(`Erro ao salvar evento: ${err.message || JSON.stringify(err)}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-all">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                    <h3 className="font-semibold text-slate-800">Novo Evento na Timeline</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Título</label>
                        <input
                            type="text"
                            required
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Ex: Manutenção Servidor"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Data</label>
                            <input
                                type="datetime-local"
                                required
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tipo</label>
                            <select
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm bg-white"
                                value={type}
                                onChange={e => setType(e.target.value as any)}
                            >
                                <option value="GERAL">Geral</option>
                                <option value="MANUTENCAO">Manutenção</option>
                                <option value="FISCAL">Fiscal</option>
                            </select>
                        </div>
                    </div>

                    {/* Recurrence Section */}
                    <div className="bg-slate-50 p-4 rounded-lg space-y-3 border border-slate-100">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="recurrence"
                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                checked={isRecurring}
                                onChange={e => setIsRecurring(e.target.checked)}
                            />
                            <label htmlFor="recurrence" className="text-sm font-medium text-slate-700 select-none cursor-pointer">Repetir este evento</label>
                        </div>

                        {isRecurring && (
                            <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Frequência</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm bg-white"
                                        value={frequency}
                                        onChange={e => setFrequency(e.target.value as any)}
                                    >
                                        <option value="DAILY">Diário</option>
                                        <option value="WEEKLY">Semanal</option>
                                        <option value="MONTHLY">Mensal</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Repetir até</label>
                                    <input
                                        type="date"
                                        required={isRecurring}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm"
                                        value={untilDate}
                                        onChange={e => setUntilDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Descrição</label>
                        <textarea
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none h-24 resize-none transition-all text-sm"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Detalhes adicionais..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-50 mt-2 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm shadow-blue-200"
                        >
                            {isSubmitting ? 'Salvando...' : 'Adicionar Evento'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
