import React, { useState } from 'react';
import { Pencil, Trash2, Search, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { RequestAnalystForm } from './RequestAnalystForm';

export interface RequestItem {
    id: string;
    descricao?: string;
    marca?: string;
    referencia?: string;
    unidade?: string;
    status: string;
    analise_pdm_status?: string;
    analise_pdm_padronizado?: string;
    analise_pdm_msg?: string;
    tipo_tratativa?: string;
    cod_reduzido_unisystem?: string | number;
    motivo_reprovacao?: string;
}

interface RequestItemsListProps {
    items: any[];
    contextData: any;
    isAnalystMode: boolean;
    canEditItems: boolean;
    analystSelectedItem: any;
    setAnalystSelectedItem: (item: any) => void;
    handleEditItem: (item: any) => void;
    handleDeleteItem: (item: any) => void;
    onAnalyzeItem?: (itemId: string, data: any) => void;
    onReprocessAI?: (item: any) => void;
    loading?: boolean;
}

// Helper functions for modular IA evaluation rendering
const renderAIEvaluation = (item: RequestItem) => {
    if (item.status !== 'Pendente') return null;

    const isAprovado = item.analise_pdm_status === 'Aprovado';
    const isFaltandoInfo = item.analise_pdm_status === 'FALTANDO_INFO' || item.analise_pdm_status === 'Recusado';

    if (isAprovado) {
        return (
            <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                IA: Sugere Cadastro
            </span>
        );
    }

    if (isFaltandoInfo) {
        return (
            <span className="bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                IA: Recomenda Revisão
            </span>
        );
    }

    return null;
};

const renderAIMessage = (item: RequestItem) => {
    if (item.status !== 'Pendente' || !item.analise_pdm_msg) return null;

    const isAprovado = item.analise_pdm_status === 'Aprovado';

    return (
        <div className={`text-[11px] font-medium mt-1 leading-normal ${isAprovado ? 'text-indigo-600' : 'text-amber-600'}`}>
            {item.analise_pdm_msg}
        </div>
    );
};

const renderAnalystFields = (item: RequestItem, isAnalystMode: boolean, contextData: any) => {
    const isFinishedOrReturned = ['Finalizado', 'Devolvido'].includes(contextData?.status);
    const hasAnalystData = item.tipo_tratativa || item.cod_reduzido_unisystem;

    if (!(isAnalystMode || isFinishedOrReturned) || !hasAnalystData) {
        return null;
    }

    return (
        <div className="md:col-span-12 pt-1.5 mt-1.5 border-t border-slate-100 grid grid-cols-2 gap-3">
            <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Classificação do Analista</span>
                <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                    item.tipo_tratativa === 'NOVO' ? 'text-green-700 bg-green-50 border-green-200' :
                    item.tipo_tratativa === 'REATIVADO' ? 'text-blue-700 bg-blue-50 border-blue-200' :
                    item.tipo_tratativa === 'EXISTENTE' ? 'text-amber-700 bg-amber-50 border-amber-200' :
                    'text-slate-700 bg-slate-50 border-slate-200'
                }`}>
                    {item.tipo_tratativa || 'Pendente'}
                </span>
            </div>
            <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Cód. Unisystem</span>
                <span className="text-[11px] font-mono font-bold text-slate-700">
                    {item.status === 'Reprovado' || item.status === 'Devolvido' 
                        ? (item.motivo_reprovacao || item.cod_reduzido_unisystem || 'Sem motivo detalhado') 
                        : (item.cod_reduzido_unisystem || 'Pendente')}
                </span>
            </div>
        </div>
    );
};

export const RequestItemsList: React.FC<RequestItemsListProps> = ({
    items,
    contextData,
    isAnalystMode,
    canEditItems,
    analystSelectedItem,
    setAnalystSelectedItem,
    handleEditItem,
    handleDeleteItem,
    onAnalyzeItem,
    onReprocessAI,
    loading
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredItems = items.filter(item => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            item.descricao?.toLowerCase().includes(term) ||
            item.marca?.toLowerCase().includes(term) ||
            item.referencia?.toLowerCase().includes(term) ||
            item.cod_reduzido_unisystem?.toString().includes(term)
        );
    });

    return (
        <div className="flex-1 overflow-hidden relative flex flex-col">
            <div className="py-1.5 px-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <span>Itens da Solicitação</span>
                    <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full text-[10px]">
                        {searchTerm ? `${filteredItems.length} de ${items.length}` : items.length}
                    </span>
                </div>

                <div className="relative w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar nesta lista..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 uppercase"
                    />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 md:p-3 bg-slate-50">
                <div className="max-w-5xl mx-auto space-y-2">
                    {filteredItems.map((itemRaw, index) => {
                        const item = itemRaw as RequestItem;
                        const isPendente = item.analise_pdm_status === 'Pendente';
                        const isFaltandoInfo = item.analise_pdm_status === 'FALTANDO_INFO';
                        const isAprovado = item.analise_pdm_status === 'Aprovado';
                        
                        let isActive = analystSelectedItem?.id === item.id;
                        let leftBorderColor = isActive ? 'border-blue-500 ring-1 ring-blue-500 shadow-md' : 'border-slate-200 hover:border-slate-300 shadow-sm';

                        return (
                            <div key={item.id} className={`bg-white rounded-xl border transition-all overflow-hidden ${leftBorderColor}`}>
                                {/* Header */}
                                <div className="px-3 py-1.5 border-b border-slate-50 flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400">ITEM #{index + 1}</span>
                                    <div className="flex gap-1.5">
                                        {isAnalystMode && (
                                            <div className="flex items-center gap-1">
                                                {onReprocessAI && (
                                                    <button
                                                        onClick={() => onReprocessAI(item)}
                                                        className="p-1 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded transition-all active:scale-95"
                                                        title="Reprocessar Análise da IA"
                                                    >
                                                        <RefreshCw size={13} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setAnalystSelectedItem(item)}
                                                    className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-all active:scale-95"
                                                    title="Analisar Item"
                                                >
                                                    <Pencil size={13} />
                                                </button>
                                            </div>
                                        )}
                                        {canEditItems && !isAnalystMode && (
                                            <>
                                                {contextData.status === 'Devolvido' && item.status === 'Aprovado' ? null : (
                                                    <div className="flex items-center gap-1">
                                                        {onReprocessAI && (
                                                            <button
                                                                onClick={() => onReprocessAI(item)}
                                                                className="p-1 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded transition-all active:scale-95"
                                                                title="Reprocessar Análise da IA"
                                                            >
                                                                <RefreshCw size={13} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleEditItem(item)}
                                                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all active:scale-95"
                                                        >
                                                            <Pencil size={13} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteItem(item)}
                                                            className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all active:scale-95"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-2.5 md:p-3">
                                    {isPendente ? (
                                        <div className="relative overflow-hidden rounded-xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm">
                                            {/* Pulse overlay to act as a scan line substitute */}
                                            <div className="absolute inset-0 bg-blue-400/5 animate-pulse" />
                                            
                                            <div className="relative flex items-center gap-4">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm border border-blue-100">
                                                    <Sparkles className="animate-pulse text-blue-500" size={20} />
                                                </div>
                                                <div className="space-y-2 flex-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[11px] font-mono font-bold text-blue-700 uppercase tracking-widest">IA Analisando Padrão PDM</span>
                                                        <span className="animate-ping w-1.5 h-3.5 bg-blue-500 inline-block" />
                                                    </div>
                                                    {/* Skeleton Lines */}
                                                    <div className="space-y-1.5">
                                                        <div className="h-1.5 w-3/4 rounded-full bg-blue-200/60 animate-pulse" />
                                                        <div className="h-1.5 w-1/2 rounded-full bg-blue-200/40 animate-pulse delay-75" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                                            {/* Bruto */}
                                            <div className="md:col-span-4 space-y-0.5 min-w-0">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Bruto:</span>
                                                <span className="text-[10.5px] italic text-slate-500 block break-words leading-tight">
                                                    “{item.descricao}”
                                                </span>
                                            </div>

                                            {/* Padronizado */}
                                            <div className="md:col-span-5 space-y-0.5 min-w-0">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Conceito PDM Padrão:</span>
                                                {item.analise_pdm_padronizado ? (
                                                    <div className="bg-blue-50/50 border border-blue-100 rounded-lg px-2.5 py-1.5 font-mono text-[11px] font-bold text-blue-900 break-words leading-snug shadow-sm">
                                                        {item.analise_pdm_padronizado}
                                                    </div>
                                                ) : (
                                                    <span className="text-[10.5px] text-slate-400 italic block py-1">Aguardando padronização</span>
                                                )}
                                            </div>

                                            {/* Detalhes & Status */}
                                            <div className="md:col-span-3 flex flex-col md:items-end gap-1 min-w-0">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block md:hidden">Especificações & Status:</span>
                                                <div className="flex flex-wrap gap-1.5 text-[9.5px] font-bold text-slate-400 uppercase leading-none">
                                                    <span>M: <span className="text-slate-600 truncate max-w-[65px] inline-block align-bottom" title={item.marca}>{item.marca || 'N/A'}</span></span>
                                                    <span className="text-slate-300">|</span>
                                                    <span>R: <span className="text-slate-600 truncate max-w-[65px] inline-block align-bottom" title={item.referencia}>{item.referencia || 'N/A'}</span></span>
                                                    <span className="text-slate-300">|</span>
                                                    <span>U: <span className="text-slate-600">{item.unidade || 'UN'}</span></span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-1 mt-0">
                                                    {/* Status do Sistema (Analista) */}
                                                    {item.status !== 'Pendente' && (
                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                                                            item.status === 'Aprovado' || item.status === 'Existente' || item.status === 'Reativado' ? 'bg-green-50 text-green-700 border-green-200' :
                                                            item.status === 'Reprovado' || item.status === 'Devolvido' ? 'bg-red-50 text-red-700 border-red-200' :
                                                            'bg-slate-100 text-slate-600 border-slate-200'
                                                        }`}>
                                                            {item.status}
                                                        </span>
                                                    )}
                                                    {/* Badge da IA */}
                                                    {renderAIEvaluation(item)}
                                                </div>
                                            </div>

                                            {/* Mensagem da IA */}
                                            {item.status === 'Pendente' && item.analise_pdm_msg && (
                                                <div className="md:col-span-12 pt-1 border-t border-slate-100/60 mt-1">
                                                    {renderAIMessage(item)}
                                                </div>
                                            )}

                                            {/* Analyst Fields */}
                                            {renderAnalystFields(item, isAnalystMode, contextData)}
                                        </div>
                                    )}

                                    {/* Inline Edit Form */}
                                    {isAnalystMode && analystSelectedItem?.id === item.id && onAnalyzeItem && (
                                        <div className="mt-3 pt-3 border-t border-slate-100/80 bg-slate-50/50 -mx-2.5 md:-mx-3 px-2.5 md:px-3 pb-2.5 md:pb-3">
                                            <RequestAnalystForm
                                                analystSelectedItem={analystSelectedItem}
                                                loading={!!loading}
                                                onAnalyze={onAnalyzeItem}
                                                onCancel={() => setAnalystSelectedItem(null)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {filteredItems.length === 0 && (
                        <div className="py-12">
                            <EmptyState
                                title={searchTerm ? 'Nenhum resultado' : 'Lista Vazia'}
                                description={searchTerm ? 'Nenhum item corresponde à sua busca.' : 'Nenhum item adicionado à solicitação.'}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
