
import React from 'react';
import { Trash2, Save, Send, Edit3, RotateCcw, CheckCircle } from 'lucide-react';

interface RequestFooterProps {
    loading: boolean;
    onClose: () => void;
    canDelete: boolean;
    handleDelete: () => void;
    handleAction: (action: any) => void;
    contextData: any;
    items: any[];
    isNew: boolean;
    isOwner: boolean;
    hasFullManagement: boolean;
    isRegistrar: boolean;
    handleNotify: () => void;
    canReopen: boolean;
}

export const RequestFooter: React.FC<RequestFooterProps> = ({
    loading,
    onClose,
    canDelete,
    handleDelete,
    handleAction,
    contextData,
    items,
    isNew,
    isOwner,
    hasFullManagement,
    isRegistrar,
    handleNotify,
    canReopen
}) => {
    return (
        <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex gap-3">
                <button onClick={onClose} disabled={loading} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg text-sm hover:bg-slate-50 transition-colors disabled:opacity-50">
                    Fechar / Cancelar
                </button>
                {canDelete && (
                    <button onClick={handleDelete} disabled={loading} className="px-4 py-2 bg-white border border-red-200 text-red-600 font-semibold rounded-lg text-sm hover:bg-red-50 transition-colors flex items-center gap-2 disabled:opacity-50">
                        <Trash2 size={16} /> Excluir
                    </button>
                )}
            </div>

            <div className="flex gap-3">
                {/* Save Draft Action */}
                {(isNew || (contextData.status === 'Aberto' && (isOwner || hasFullManagement))) && (
                    <>
                        <button onClick={() => handleAction('SAVE')} disabled={loading} className="px-5 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50">
                            <Save size={16} /> Salvar Dados
                        </button>
                        <button onClick={() => handleAction('SEND')} disabled={loading} className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700 shadow-md transition-colors flex items-center gap-2 disabled:opacity-50">
                            <Send size={16} /> {loading ? 'Enviando...' : 'Enviar Cadastro'}
                        </button>
                    </>
                )}

                {/* Waiting State Actions (Analyst Start) */}
                {contextData.status === 'Aguardando' && isRegistrar && (
                    <>
                        <button onClick={() => handleAction('START_CADASTRO')} disabled={loading} className="px-5 py-2 bg-purple-600 text-white font-bold rounded-lg text-sm hover:bg-purple-700 shadow-md transition-colors flex items-center gap-2 disabled:opacity-50">
                            <Edit3 size={16} /> Iniciar Cadastro
                        </button>
                    </>
                )}

                {/* In Registration Actions (Analyst Work) */}
                {contextData.status === 'Em Cadastro' && isRegistrar && (
                    <>
                        {/* Show different Main Action based on items state */}
                        {items.some(i => i.status === 'Reprovado' || i.status === 'Devolvido') ? (
                            <div className="flex gap-2">
                                <button onClick={() => handleAction('RETURN')} disabled={loading} className="px-5 py-2 bg-red-500 text-white font-bold rounded-lg text-sm hover:bg-red-600 shadow-md transition-colors flex items-center gap-2 disabled:opacity-50">
                                    <RotateCcw size={16} /> Devolver Solicitação
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => handleAction('FINISH_CADASTRO')} disabled={loading} className="px-5 py-2 bg-green-600 text-white font-bold rounded-lg text-sm hover:bg-green-700 shadow-md transition-colors flex items-center gap-2 disabled:opacity-50">
                                <CheckCircle size={16} /> Finalizar Cadastro
                            </button>
                        )}
                    </>
                )}

                {/* Finalized State Actions */}
                {((contextData.status === 'Finalizado' || contextData.status === 'Devolvido') && isRegistrar) && (
                    <button onClick={handleNotify} className="px-5 py-2 bg-[#25D366] text-white font-bold rounded-lg text-sm hover:bg-[#128C7E] shadow-md transition-colors flex items-center gap-2">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg> Notificar Solicitante
                    </button>
                )}

                {/* Correction/Returned Actions (Owner) */}
                {contextData.status === 'Devolvido' && isOwner && (
                    <button onClick={() => handleAction('RESEND')} disabled={loading} className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700 shadow-md transition-colors flex items-center gap-2 disabled:opacity-50">
                        <Send size={16} /> Reenviar Correção
                    </button>
                )}

                {/* Global Reopen Action */}
                {canReopen && (
                    <button onClick={() => handleAction('REOPEN')} disabled={loading} className="px-5 py-2 bg-yellow-100 text-yellow-700 font-bold rounded-lg text-sm hover:bg-yellow-200 transition-colors flex items-center gap-2 disabled:opacity-50">
                        <RotateCcw size={16} /> Reabrir
                    </button>
                )}
            </div>
        </div>
    );
};
