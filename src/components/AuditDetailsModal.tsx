import React from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    X,
    CheckCircle,
    AlertTriangle,
    XCircle,
    Droplet,
    Scale,
    Thermometer,
    FileText,
    Truck
} from 'lucide-react';
import type { AuditItem } from '../services/auditService';
import { clsx } from 'clsx';

// UI Kit
import { ModalHeader } from './ui/ModalHeader';
import { ModalFooter } from './ui/ModalFooter';

interface AuditDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: AuditItem | null;
}

export function AuditDetailsModal({ isOpen, onClose, data }: AuditDetailsModalProps) {
    if (!isOpen || !data) return null;

    const isHighDiff = Math.abs(data.differencePercent) > 0.5;
    const isNonConforming = data.conformity === 'non_conforming';

    return (
        <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <ModalHeader
                    title="Detalhes da Auditoria"
                    subtitle={`Nota Fiscal: ${data.invoiceNumber}`}
                    icon={FileText}
                    iconClassName="text-blue-600 bg-blue-50 border-blue-100"
                    onClose={onClose}
                />

                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50">

                    {/* Status Banner */}
                    <div className={clsx(
                        "p-4 rounded-xl border flex items-center gap-4",
                        isNonConforming ? "bg-red-50 border-red-200 text-red-800" :
                            data.status === 'MISSING_ANALYSIS' ? "bg-amber-50 border-amber-200 text-amber-800" :
                                "bg-green-50 border-green-200 text-green-800"
                    )}>
                        <div className={clsx(
                            "p-3 rounded-full",
                            isNonConforming ? "bg-red-100" :
                                data.status === 'MISSING_ANALYSIS' ? "bg-amber-100" :
                                    "bg-green-100"
                        )}>
                            {isNonConforming ? <XCircle size={24} /> :
                                data.status === 'MISSING_ANALYSIS' ? <AlertTriangle size={24} /> :
                                    <CheckCircle size={24} />
                            }
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">
                                {isNonConforming ? "Não Conforme" :
                                    data.status === 'MISSING_ANALYSIS' ? "Análise Pendente" :
                                        "Conforme"
                                }
                            </h3>
                            <p className="text-sm opacity-90">
                                {isNonConforming ? "Divergência de volume ou qualidade fora dos padrões." :
                                    data.status === 'MISSING_ANALYSIS' ? "Aguardando lançamento da análise técnica." :
                                        "Recebimento dentro dos padrões esperados."
                                }
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* Left: Invoice Data */}
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
                            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                                <Truck className="text-slate-400" size={18} />
                                <h4 className="font-bold text-slate-700 uppercase text-sm tracking-wide">Nota Fiscal (Entrada)</h4>
                            </div>

                            <div className="space-y-3">
                                <div className="grid grid-cols-1 gap-1">
                                    <label className="text-xs font-semibold text-slate-400 uppercase">Fornecedor</label>
                                    <p className="text-slate-800 font-medium truncate">{data.analysis?.supplier_name || 'Não Identificado'}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-400 uppercase">Nota Fiscal</label>
                                        <p className="text-slate-800 font-medium">{data.invoiceNumber}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-400 uppercase">Volume NF</label>
                                        <p className="text-slate-800 font-medium">{data.volume.toLocaleString('pt-BR')} L</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-400 uppercase">ID Entrada</label>
                                        <p className="text-slate-600 text-sm">{data.id || '-'}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-400 uppercase">Data/Hora Emissão</label>
                                        <p className="text-slate-800 font-medium">
                                            {data.date ? format(parseISO(data.date), 'dd/MM/yyyy HH:mm') : '-'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Analysis Summary */}
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
                            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                                <Scale className="text-slate-400" size={18} />
                                <h4 className="font-bold text-slate-700 uppercase text-sm tracking-wide">Análise Técnica</h4>
                            </div>

                            {data.analysis ? (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-semibold text-slate-400 uppercase">ID Análise</label>
                                            <p className="text-slate-600 text-sm">{data.analysis.id || '-'}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-400 uppercase">Data/Hora Análise</label>
                                            <p className="text-slate-800 font-medium">
                                                {data.analysis.date ? format(parseISO(data.analysis.date), 'dd/MM/yyyy HH:mm') : '-'}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-400 uppercase">Temperatura</label>
                                            <p className="text-slate-800 font-medium">{data.analysis.temperature.toFixed(2)} °C</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-400 uppercase">Densidade (Amb)</label>
                                            <p className="text-slate-800 font-medium">{data.analysis.density.toFixed(4)}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-400 uppercase">Densidade 20°C</label>
                                            <p className="text-slate-800 font-medium">{data.analysis.density_20c?.toFixed(4) || '-'}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-400 uppercase">Modo</label>
                                            <p className="text-slate-500 text-sm">Observada</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400">Sem análise vinculada</p>
                            )}
                        </div>

                        {/* Cargo Data (Weights) */}
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4 col-span-1">
                            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                                <h4 className="font-bold text-slate-700 uppercase text-sm tracking-wide">Carga (Pesagem)</h4>
                            </div>
                            {data.analysis ? (
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-slate-500 font-medium">Peso Bruto Total:</span>
                                        <span className="text-sm text-slate-800 font-bold">{data.analysis.gross_weight?.toLocaleString('pt-BR')} kg</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-slate-500 font-medium">Tara:</span>
                                        <span className="text-sm text-slate-800 font-bold">{data.analysis.tare?.toLocaleString('pt-BR')} kg</span>
                                    </div>
                                    <div className="flex justify-between border-t border-slate-100 pt-2">
                                        <span className="text-sm text-slate-700 font-bold">Peso Líquido:</span>
                                        <span className="text-sm text-blue-700 font-bold">{data.analysis.net_weight?.toLocaleString('pt-BR')} kg</span>
                                    </div>
                                    <div className="flex justify-between pt-2">
                                        <span className="text-sm text-slate-500 font-medium">Número do Ticket:</span>
                                        <span className="text-sm text-slate-800">{data.analysis.ticket_number || 'Não especificado'}</span>
                                    </div>
                                </div>
                            ) : <p className="text-sm text-slate-400">Sem dados de pesagem</p>}
                        </div>

                        {/* Transport (Placeholder as seen in image, usually manually entered or from NF XML which we don't fully parse yet for driver) */}
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4 col-span-1">
                            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                                <h4 className="font-bold text-slate-700 uppercase text-sm tracking-wide">Transporte</h4>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-500 font-medium">Placa:</span>
                                    <span className="text-sm text-slate-400">Não especificado</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-500 font-medium">Motorista:</span>
                                    <span className="text-sm text-slate-400">Não especificado</span>
                                </div>
                            </div>
                        </div>

                        {/* Result @ Ambient Temp */}
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4 col-span-1 md:col-span-1">
                            <h4 className="font-bold text-slate-700 text-sm">Resultado à temperatura do combustível {data.analysis?.temperature.toFixed(1)} ºC</h4>
                            {data.analysis ? (
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-slate-600">Volume:</span>
                                        <span className="text-sm font-bold text-slate-800">{data.analysis.volume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} L</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-slate-600">Diferença:</span>
                                        <span className={clsx("text-sm font-bold", (data.analysis.volume - data.volume) < 0 ? "text-red-600" : "text-green-600")}>
                                            {(data.analysis.volume - data.volume).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} L
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-slate-600">Divergência:</span>
                                        <span className={clsx("text-sm font-bold", Math.abs(((data.analysis.volume - data.volume) / data.volume)) > 0.005 ? "text-red-600" : "text-slate-600")}>
                                            {data.volume > 0
                                                ? (((data.analysis.volume - data.volume) / data.volume) * 100).toFixed(2) + '%'
                                                : '-'}
                                        </span>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {/* Result @ 20C */}
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4 col-span-1 md:col-span-1">
                            <h4 className="font-bold text-slate-700 text-sm">Resultado à 20°C, resolução ANP n. 894/2022</h4>
                            {data.analysis ? (
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-slate-600">Volume:</span>
                                        <span className="text-sm font-bold text-slate-800">{data.analysis.volume_20c?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '-'} L</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-slate-600">Diferença (vs NF):</span>
                                        <span className={clsx("text-sm font-bold", (data.analysis.volume_20c || 0) - data.volume < 0 ? "text-red-600" : "text-green-600")}>
                                            {data.analysis.volume_20c ? ((data.analysis.volume_20c - data.volume).toLocaleString('pt-BR', { minimumFractionDigits: 2 })) : '-'} L
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-slate-600">Divergência:</span>
                                        <span className="text-sm font-bold text-slate-600">
                                            {data.analysis.volume_20c && data.volume > 0
                                                ? (((data.analysis.volume_20c - data.volume) / data.volume) * 100).toFixed(2) + '%'
                                                : '-'}
                                        </span>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                    </div>

                    {/* Difference Footer */}
                    {data.analysis && (
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-slate-700">Diferença Final</h4>
                                <p className="text-sm text-slate-500">Resultado do confronto (Físico - Nota)</p>
                            </div>
                            <div className="text-right">
                                <p className={clsx("text-3xl font-bold", data.difference < 0 ? "text-red-600" : "text-green-600")}>
                                    {data.difference > 0 ? "+" : ""}{data.difference.toLocaleString('pt-BR')} L
                                </p>
                                <p className={clsx("text-sm font-bold", Math.abs(data.differencePercent) > 0.5 ? "text-red-600" : "text-slate-500")}>
                                    {data.differencePercent.toFixed(2)}%
                                </p>
                            </div>
                        </div>
                    )}

                </div>

                <ModalFooter>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-all shadow-lg shadow-slate-200"
                    >
                        Fechar
                    </button>
                </ModalFooter>
            </div>
        </div>
    );
}
