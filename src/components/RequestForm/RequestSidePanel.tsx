
import React from 'react';
import { FileText } from 'lucide-react';
import { formatInSystemTime } from '../../utils/dateUtils';
import { Fazenda } from '../../types';
import { RequestAttachments } from './RequestAttachments';
import { FormField } from '../ui/FormField';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';

interface RequestSidePanelProps {
    contextData: any;
    setContextData: (data: any) => void;
    fazendas: Fazenda[];
    canEditContext: boolean;
    attachments: any[];
    onUploadAttachment: (file: File) => Promise<void>;
    onDeleteAttachment: (attachment: any) => void;
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
                    <FormField label="Data Abertura">
                        <Input
                            type="text"
                            value={formatInSystemTime(contextData.data_abertura)}
                            disabled
                        />
                    </FormField>

                    <FormField label="Solicitante">
                        <Input
                            type="text"
                            value={contextData.solicitante}
                            disabled
                        />
                    </FormField>

                    <FormField label="Filial">
                        <Select
                            value={contextData.fazenda_id}
                            onChange={e => setContextData({ ...contextData, fazenda_id: e.target.value })}
                            disabled={!canEditContext}
                            placeholder="Selecione..."
                            options={fazendas.map(f => ({ value: f.id, label: f.nome }))}
                        />
                    </FormField>

                    <FormField label="Prioridade">
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
                    </FormField>

                    <FormField 
                        label="Observação" 
                        required 
                        error={!contextData.observacao && canEditContext ? "Observação obrigatória para adicionar itens" : undefined}
                    >
                        <Textarea
                            value={contextData.observacao}
                            onChange={e => setContextData({ ...contextData, observacao: e.target.value.toUpperCase() })}
                            disabled={!canEditContext}
                            placeholder="Descreva a aplicação ou motivo..."
                            error={!contextData.observacao && canEditContext}
                            className="min-h-[100px] uppercase"
                        />
                    </FormField>

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
