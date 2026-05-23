import React, { useState } from 'react';
import { X, Calendar, Building2, User, FileText, CheckCircle, Clock, Paperclip, ExternalLink, Receipt, MapPin, AlertTriangle, Building, CreditCard } from 'lucide-react';
import { PendingInvoice } from '../../types/invoiceTypes';
import { formatCurrency } from '../../utils/formatUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    invoice: PendingInvoice;
}

export const InvoiceDetailsModal = ({ isOpen, onClose, invoice }: Props) => {
    if (!isOpen) return null;

    const deliveryDate = new Date(invoice.delivery_date);
    const isInvalidDate = deliveryDate.getFullYear() < 2000;
    const daysDelayed = isInvalidDate ? 0 : Math.max(0, Math.floor((new Date().getTime() - deliveryDate.getTime()) / (1000 * 3600 * 24)));

    const getStatusStyles = () => {
        if (invoice.status === 'Conciliada') return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: 'text-emerald-600' };
        if (daysDelayed > 5) return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: 'text-rose-600' };
        return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'text-amber-600' };
    };

    const status = getStatusStyles();

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Header (Pattern used-items) */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Receipt className="text-blue-600" size={24} />
                            Detalhes da Pendência
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Informações detalhadas do recebimento e lançamento fiscal</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content (Pattern used-items) */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    {/* Resumo Superior (Pattern used-items) */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row gap-6 shadow-sm">
                        
                        {/* Placeholder/Imagem para o Anexo */}
                        <div className="w-full md:w-32 h-32 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border border-slate-200">
                            {invoice.file_url ? (
                                <a href={invoice.file_url} target="_blank" rel="noreferrer" className="w-full h-full flex flex-col items-center justify-center gap-2 text-blue-600 hover:bg-blue-50 transition-colors">
                                    <FileText size={40} />
                                    <span className="text-[10px] font-bold uppercase tracking-tighter">Ver Anexo</span>
                                </a>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-slate-400 text-center p-2">
                                    <Paperclip size={32} />
                                    <span className="text-[10px] font-medium leading-tight">Sem documento anexo</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex-1 flex flex-col justify-center">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                                    NF {invoice.invoice_number}
                                </span>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${status.bg} ${status.text} ${status.border}`}>
                                    {invoice.status}
                                </span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mb-4 uppercase">{invoice.supplier_name}</h3>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                                    <span className="block text-sm font-semibold text-slate-500 mb-1">Valor da Nota</span>
                                    <div className="text-2xl font-black text-slate-800">
                                        {formatCurrency(invoice.amount || 0)}
                                    </div>
                                </div>
                                
                                <div className={`bg-slate-50 border border-slate-100 rounded-xl p-4 ${isInvalidDate ? 'border-red-200' : ''}`}>
                                    <span className="block text-sm font-semibold text-slate-500 mb-1">Status de Atraso</span>
                                    <div className={`text-xl font-black flex items-center gap-2 ${isInvalidDate ? 'text-red-600' : (daysDelayed > 5 ? 'text-rose-600' : 'text-amber-600')}`}>
                                        {isInvalidDate ? (
                                            <><AlertTriangle size={16} /> Erro Data</>
                                        ) : (
                                            <>{daysDelayed} <span className="text-xs font-bold opacity-60">Dias</span></>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Blocos de Dados (Pattern used-items) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Coluna de Origem/Fazenda */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Building size={16} /> Identificação e Origem
                            </h4>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
                                        <MapPin size={16} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Fazenda Unidade</label>
                                        <p className="text-sm font-bold text-slate-700 uppercase leading-none">{invoice.farm?.nome || '-'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
                                        <User size={16} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Registrado por</label>
                                        <p className="text-sm font-bold text-slate-700 uppercase leading-none">{invoice.usuario?.nome || 'Usuário do Sistema'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Coluna de Datas do Fluxo */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Clock size={16} /> Linha do Tempo (Workflow)
                            </h4>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
                                        <Calendar size={16} />
                                    </div>
                                    <div className="flex-1 flex justify-between items-center">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Emissão da NF</label>
                                            <p className="text-sm font-bold text-slate-700 uppercase leading-none">{invoice.issue_date.split('-').reverse().join('/')}</p>
                                        </div>
                                        <div className="text-right">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Chegada</label>
                                            <p className={`text-sm font-bold uppercase leading-none ${isInvalidDate ? 'text-red-600' : 'text-slate-700'}`}>
                                                {invoice.delivery_date.split('-').reverse().join('/')}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {invoice.status === 'Conciliada' && (
                                    <div className="flex items-center gap-3 pt-2 border-t border-slate-200/50">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                                            <CheckCircle size={16} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-emerald-600/60 uppercase">Data da Conciliação</label>
                                            <p className="text-sm font-bold text-emerald-700 uppercase leading-none">
                                                {invoice.updated_at ? format(new Date(invoice.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Rodapé de Ações (Pattern used-items) */}
                    <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
                        <button 
                            onClick={onClose}
                            className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all active:scale-95"
                        >
                            Fechar
                        </button>
                        {invoice.file_url && (
                            <a 
                                href={invoice.file_url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-sm inline-flex items-center gap-2 hover:bg-blue-700 transition-all active:scale-95 shadow-blue-500/20"
                            >
                                <ExternalLink size={16} />
                                Abrir Documento
                            </a>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};
