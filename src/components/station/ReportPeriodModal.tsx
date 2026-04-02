
import React, { useState } from 'react';
import { Calendar, FileText, Download, Loader2 } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ModalHeader } from '../ui/ModalHeader';
import { ModalFooter } from '../ui/ModalFooter';
import { reportService } from '../../services/reportService';
import type { Posto, NuntecReservoir } from '../../types';

interface ReportPeriodModalProps {
    isOpen: boolean;
    onClose: () => void;
    posto: Posto & { fazenda: { nome: string } };
    reservoirData?: NuntecReservoir;
}

export function ReportPeriodModal({
    isOpen,
    onClose,
    posto,
    reservoirData
}: ReportPeriodModalProps) {
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            await reportService.generateStationReport(posto, startDate, endDate, reservoirData);
            onClose();
        } catch (error) {
            console.error('Error generating report:', error);
            alert('Erro ao gerar relatório. Verifique os dados e tente novamente.');
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
                <ModalHeader
                    title="Gerar Relatório PDF"
                    subtitle="Selecione o período para o relatório de conciliação"
                    icon={FileText}
                    iconClassName="text-teal-600 bg-teal-50 border-teal-100"
                    onClose={onClose}
                />

                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                Data Inicial
                            </label>
                            <div className="relative">
                                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                Data Final
                            </label>
                            <div className="relative">
                                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                            O relatório inclui histórico de medições, entradas de combustível e saídas capturadas pela telemetria.
                        </p>
                    </div>
                </div>

                <ModalFooter>
                    <button
                        onClick={onClose}
                        disabled={isGenerating}
                        className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 font-bold text-sm transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Gerando...
                            </>
                        ) : (
                            <>
                                <Download size={18} />
                                Gerar Relatório
                            </>
                        )}
                    </button>
                </ModalFooter>
            </div>
        </div>
    );
}

