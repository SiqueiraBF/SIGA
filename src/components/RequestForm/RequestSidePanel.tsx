
import React from 'react';
import { FileText } from 'lucide-react';
import { formatInSystemTime } from '../../utils/dateUtils';
import { Fazenda } from '../../types';
import { RequestAttachments } from './RequestAttachments';

interface RequestSidePanelProps {
    contextData: any;
    setContextData: (data: any) => void;
    fazendas: Fazenda[];
    canEditContext: boolean;
    attachments: any[];
    onUploadAttachment: (file: File) => Promise<void>;
    onDeleteAttachment: (attachment: any) => Promise<void>;
    loading?: boolean;
    canEditAttachments: boolean;
}

export const RequestSidePanel: React.FC<RequestSidePanelProps> = ({
    contextData,
    setContextData,
    fazendas,
    canEditContext,
    attachments,
    onUploadAttachment,
    onDeleteAttachment,
    loading,
    canEditAttachments
}) => {
    return (
        <div className="w-[340px] shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
            <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Data Abertura</label>
                        <input
                            type="text"
                            value={formatInSystemTime(contextData.data_abertura)}
                            disabled
                            className="w-full px-4 py-2.5 bg-slate-100 border border-transparent rounded-lg text-slate-600 text-sm font-medium"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Solicitante</label>
                        <input
                            type="text"
                            value={contextData.solicitante}
                            disabled
                            className="w-full px-4 py-2.5 bg-slate-100 border border-transparent rounded-lg text-slate-600 text-sm font-medium"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Filial</label>
                        <select
                            value={contextData.fazenda_id}
                            onChange={e => setContextData({ ...contextData, fazenda_id: e.target.value })}
                            disabled={!canEditContext}
                            className="w-full px-4 py-2.5 bg-slate-5 border border-slate-200 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                        >
                            <option value="">Selecione...</option>
                            {fazendas.map(f => (
                                <option key={f.id} value={f.id}>{f.nome}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Prioridade</label>
                        <div className="bg-slate-100 p-1 rounded-lg grid grid-cols-2 gap-1">
                            <button
                                type="button"
                                onClick={() => canEditContext && setContextData({ ...contextData, prioridade: 'Normal' })}
                                className={`py-1.5 text-xs font-bold rounded shadow-sm transition-all ${contextData.prioridade === 'Normal' ? 'bg-white text-blue-600' : 'bg-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                Normal
                            </button>
                            <button
                                type="button"
                                onClick={() => canEditContext && setContextData({ ...contextData, prioridade: 'Urgente' })}
                                className={`py-1.5 text-xs font-bold rounded shadow-sm transition-all ${contextData.prioridade === 'Urgente' ? 'bg-white text-red-600' : 'bg-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                Urgente
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Observação <span className="text-red-500">*</span></label>
                        <textarea
                            value={contextData.observacao}
                            onChange={e => setContextData({ ...contextData, observacao: e.target.value.toUpperCase() })}
                            disabled={!canEditContext}
                            placeholder="Obrigatório para adicionar itens"
                            className={`w-full px-4 py-3 bg-white border rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none uppercase ${!contextData.observacao && canEditContext ? 'border-red-300 ring-1 ring-red-100 placeholder:text-red-300' : 'border-slate-200'}`}
                        />
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                        <RequestAttachments
                            attachments={attachments}
                            onUpload={onUploadAttachment}
                            onDelete={onDeleteAttachment}
                            loading={loading}
                            canEdit={canEditAttachments}
                        />
                    </div>
                </div>
            </div>
    );
};
