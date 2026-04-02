import React, { useState } from 'react';
import { format, differenceInHours, parseISO } from 'date-fns';
import { Cloud, Fuel, Warehouse, Clock, Scale, Droplet, CheckCircle2, XCircle, Edit2, Trash2, FileText } from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';
import type { Posto, NuntecMeasurement, NuntecReservoir, NuntecAdmeasurement } from '../../types';
import { ReportPeriodModal } from './ReportPeriodModal';

interface StationCardProps {
    posto: Posto & { fazenda: { nome: string } };
    measurement?: NuntecMeasurement;
    reservoirData?: NuntecReservoir;
    latestAdmeasurement?: NuntecAdmeasurement;
    lastDrainageDate?: string;
    dailyAverage?: number;
    loadingAutonomy?: boolean;
    onEdit: (p: Posto) => void;
    onDelete: (id: string) => void;
    canManage: boolean;
}

export function StationCard({
    posto,
    measurement,
    reservoirData,
    latestAdmeasurement,
    lastDrainageDate,
    dailyAverage,
    loadingAutonomy,
    onEdit,
    onDelete,
    canManage,
}: StationCardProps) {
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const isVirtual = posto.tipo === 'VIRTUAL';

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 group flex flex-col h-full relative overflow-hidden">
            {/* Header Badge */}
            <div className="absolute top-4 right-4 flex gap-2">
                <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg border border-teal-100 bg-white transition-colors shadow-sm"
                    title="Relatório PDF"
                >
                    <FileText size={16} />
                </button>
                {isVirtual && (
                    <span className="px-2 py-1 bg-sky-50 text-sky-600 text-[10px] font-bold uppercase rounded-lg border border-sky-100 flex items-center gap-1">
                        <Cloud size={10} /> Virtual
                    </span>
                )}
                <StatusBadge
                    status={posto.ativo ? 'Ativo' : 'Inativo'}
                    variant={posto.ativo ? 'success' : 'error'}
                    icon={posto.ativo ? CheckCircle2 : XCircle}
                    size="sm"
                />
            </div>

            <div className="flex items-center gap-4 mb-4">
                <div className={`p-3 rounded-2xl ${isVirtual ? 'bg-sky-50 text-sky-600' : 'bg-slate-50 text-slate-600'}`}>
                    {isVirtual ? <Cloud size={24} /> : <Fuel size={24} />}
                </div>
            </div>

            <h3 className="text-lg font-bold text-slate-800 mb-1 line-clamp-1" title={posto.nome}>
                {posto.nome}
            </h3>

            <div className="flex items-center gap-2 text-sm text-slate-500 mb-4 font-medium">
                <Warehouse size={14} className="text-slate-400" />
                <span>{posto.fazenda.nome}</span>
            </div>

            {/* Measurement Info (Only for Physical or if data exists) */}
            {!isVirtual && posto.nuntec_reservoir_id && (
                <div className="mb-6 space-y-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-400 uppercase font-bold tracking-wider">Tanque #{posto.nuntec_reservoir_id}</span>
                    </div>

                    {measurement ? (
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                            <div className="flex justify-between items-end mb-1">
                                <div className="flex items-center gap-1.5 text-slate-600 font-medium text-xs">
                                    <Clock size={12} />
                                    <span className="font-bold mr-1">Medição:</span>
                                    {format(parseISO(measurement['measured-at']), "dd/MM HH:mm")}
                                    {/* Minimalist Status Dot/Text */}
                                    {(() => {
                                        const hours = differenceInHours(new Date(), parseISO(measurement['measured-at']));
                                        if (hours >= 24) {
                                            const isCritical = hours >= 48;
                                            return (
                                                <span className={`text-[10px] font-bold ml-1 ${isCritical ? 'text-red-500' : 'text-amber-500'}`}>
                                                    {isCritical ? '• Atrasado' : '• Atenção'}
                                                </span>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                                <div className="text-lg font-bold text-slate-800">
                                    {/* Prioritize Real Stock from Station XML over Last Measurement */}
                                    {reservoirData && reservoirData.capacity > 0 ? (
                                        <span className="text-xs text-slate-500 font-normal">
                                            <strong className="text-lg text-slate-800">
                                                {(reservoirData.stock ?? measurement.amount).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            </strong>
                                            {' '}/ {reservoirData.capacity.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} L
                                        </span>
                                    ) : (
                                        <span>{measurement.amount.toLocaleString('pt-BR')} L</span>
                                    )}
                                </div>
                            </div>

                            {reservoirData && reservoirData.capacity > 0 ? (
                                (() => {
                                    const currentStock = reservoirData.stock ?? measurement.amount;
                                    const percentage = Math.min(100, Math.max(0, (currentStock / reservoirData.capacity) * 100));

                                    let barColor = 'bg-blue-600';
                                    if (percentage < 10) barColor = 'bg-red-500';
                                    else if (percentage < 20) barColor = 'bg-amber-500';
                                    else barColor = 'bg-green-500';

                                    return (
                                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden relative">
                                            <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
                                        </div>
                                    );
                                })()
                            ) : (
                                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                    <div className="h-full bg-slate-400 w-full opacity-50"></div>
                                </div>
                            )}

                            {/* Footer Info */}
                            <div className="flex flex-col gap-1 mt-2">
                                <div className="flex justify-between items-center">
                                    {/* Calibration Minimalist */}
                                    {latestAdmeasurement ? (
                                        (() => {
                                            const days = differenceInHours(new Date(), parseISO(latestAdmeasurement['updated-at'])) / 24;
                                            const isExpired = days > 60;

                                            return (
                                                <div className="flex items-center gap-1.5" title={`Fator: ${latestAdmeasurement['pulse-factor']} | Dias: ${Math.round(days)}`}>
                                                    <Scale size={10} className={isExpired ? 'text-red-500' : 'text-slate-400'} />
                                                    <span className={`text-[10px] font-medium ${isExpired ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
                                                        {isExpired ? 'Aferição Vencida' : `Aferido em ${format(parseISO(latestAdmeasurement['updated-at']), "dd/MM/yy")}`}
                                                    </span>
                                                </div>
                                            );
                                        })()
                                    ) : (
                                        <span></span>
                                    )}

                                    {reservoirData && reservoirData.capacity > 0 && (
                                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono gap-4">
                                            {loadingAutonomy ? (
                                                <span className="text-slate-400 animate-pulse italic">
                                                    Calculando...
                                                </span>
                                            ) : (
                                                dailyAverage && dailyAverage > 0 && (
                                                    (() => {
                                                        const currentStock = reservoirData.stock ?? measurement.amount;
                                                        const days = currentStock / dailyAverage;
                                                        const isLow = days < 3;
                                                        return (
                                                            <span className={isLow ? 'text-amber-600 font-bold' : ''}>
                                                                Autonomia: ~{Math.round(days)} dias
                                                            </span>
                                                        );
                                                    })()
                                                )
                                            )}
                                            <span>
                                                {(() => {
                                                    const currentStock = reservoirData.stock ?? measurement.amount;
                                                    return Math.round((currentStock / reservoirData.capacity) * 100);
                                                })()}%
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* DRAINAGE STATUS ROW */}
                                {(posto.exibir_na_drenagem !== false) && (
                                    <div className="flex items-center gap-1.5">
                                        {lastDrainageDate ? (
                                            (() => {
                                                const days = differenceInHours(new Date(), lastDrainageDate) / 24;
                                                const isOverdue = days > 7;

                                                return (
                                                    <div className="flex items-center gap-1.5">
                                                        <Droplet size={10} className={isOverdue ? 'text-red-500' : 'text-sky-500'} />
                                                        <span className={`text-[10px] font-medium ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                                                            {isOverdue ? `Drenagem Vencida (${Math.floor(days)}d)` : `Drenado em ${format(new Date(lastDrainageDate), "dd/MM")}`}
                                                        </span>
                                                    </div>
                                                );
                                            })()
                                        ) : (
                                            <div className="flex items-center gap-1.5">
                                                <Droplet size={10} className="text-red-500" />
                                                <span className="text-[10px] font-bold text-red-600">Sem Registro de Drenagem</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-center py-4">
                            <p className="text-xs text-slate-400">Nenhuma medição recente encontrada.</p>
                        </div>
                    )}
                </div>
            )}

            {isVirtual && (
                <div className="mb-6">
                    <div className="p-3 bg-sky-50 border border-sky-100 rounded-lg text-sky-800 text-xs">
                        Este é um posto <strong>Gerencial/Virtual</strong>. Não requer medição física de estoque, apenas controle de saldo contábil.
                    </div>
                </div>
            )}

            {/* Actions Footer */}
            <div className="mt-auto pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                {canManage ? (
                    <>
                        <button
                            onClick={() => onEdit(posto)}
                            className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold uppercase text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors"
                        >
                            <Edit2 size={14} /> Editar
                        </button>
                        <button
                            onClick={() => onDelete(posto.id)}
                            className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold uppercase text-red-600 hover:bg-red-50 border border-red-100 rounded-xl transition-colors"
                        >
                            <Trash2 size={14} /> Excluir
                        </button>
                    </>
                ) : (
                    <span className="col-span-2 text-center text-xs text-slate-400 py-2">
                        Somente visualização
                    </span>
                )}
            </div>

            <ReportPeriodModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                posto={posto}
                reservoirData={reservoirData}
            />
        </div>
    );
}
