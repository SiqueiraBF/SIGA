
import React from 'react';
import { Trash2, Save, Send, Edit3, RotateCcw, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';

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
                <Button variant="secondary" onClick={onClose} disabled={loading}>
                    Fechar / Cancelar
                </Button>
                {canDelete && (
                    <Button variant="danger" onClick={handleDelete} disabled={loading} icon={Trash2}>
                        Excluir
                    </Button>
                )}
            </div>

            <div className="flex gap-3">
                {/* Save Draft Action */}
                {(isNew || (contextData.status === 'Aberto' && (isOwner || hasFullManagement))) && (
                    <>
                        <Button variant="secondary" onClick={() => handleAction('SAVE')} disabled={loading} icon={Save}>
                            Salvar Dados
                        </Button>
                        <Button variant="primary" onClick={() => handleAction('SEND')} disabled={loading} icon={Send}>
                            {loading ? 'Enviando...' : 'Enviar Cadastro'}
                        </Button>
                    </>
                )}

                {/* Waiting State Actions (Analyst Start) */}
                {contextData.status === 'Aguardando' && isRegistrar && (
                    <>
                        <Button variant="primary" onClick={() => handleAction('START_CADASTRO')} disabled={loading} icon={Edit3} className="bg-purple-600 hover:bg-purple-700 shadow-purple-500/25 border-transparent">
                            Iniciar Cadastro
                        </Button>
                    </>
                )}

                {/* In Registration Actions (Analyst Work) */}
                {contextData.status === 'Em Cadastro' && isRegistrar && (
                    <>
                        {/* Show different Main Action based on items state */}
                        {items.some(i => i.status === 'Reprovado' || i.status === 'Devolvido') ? (
                            <div className="flex gap-2">
                                <Button variant="danger" onClick={() => handleAction('RETURN')} disabled={loading} icon={RotateCcw}>
                                    Devolver Solicitação
                                </Button>
                            </div>
                        ) : (
                            <Button variant="success" onClick={() => handleAction('FINISH_CADASTRO')} disabled={loading} icon={CheckCircle}>
                                Finalizar Cadastro
                            </Button>
                        )}
                    </>
                )}

                {/* Finalized State Actions */}
                {((contextData.status === 'Finalizado' || contextData.status === 'Devolvido') && isRegistrar) && (
                    <Button onClick={handleNotify} className="bg-[#25D366] hover:bg-[#128C7E] shadow-[#25D366]/25 border-transparent text-white">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg> Notificar Solicitante
                    </Button>
                )}

                {/* Correction/Returned Actions (Owner) */}
                {contextData.status === 'Devolvido' && isOwner && (
                    <Button variant="primary" onClick={() => handleAction('RESEND')} disabled={loading} icon={Send}>
                        Reenviar Correção
                    </Button>
                )}

                {/* Global Reopen Action */}
                {canReopen && (
                    <Button variant="secondary" onClick={() => handleAction('REOPEN')} disabled={loading} icon={RotateCcw} className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200 shadow-sm">
                        Reabrir
                    </Button>
                )}
            </div>
        </div>
    );
};
