
import React from 'react';
import { X, Clock, Package } from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';

interface RequestHeaderProps {
    isNew: boolean;
    contextData: any;
    requestId: string | null;
    onClose: () => void;
    onOpenAudit: () => void;
}

export const RequestHeader: React.FC<RequestHeaderProps> = ({
    isNew,
    contextData,
    requestId,
    onClose,
    onOpenAudit
}) => {
    const statusMap: Record<string, { variant: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple' | 'orange', color: string }> = {
        'Finalizado': { variant: 'success', color: 'bg-green-50 text-green-600' },
        'Aguardando': { variant: 'warning', color: 'bg-amber-50 text-amber-600' },
        'Em Cadastro': { variant: 'purple', color: 'bg-purple-50 text-purple-600' },
        'Devolvido': { variant: 'orange', color: 'bg-orange-50 text-orange-600' },
        'Aberto': { variant: 'default', color: 'bg-slate-100 text-slate-600' }
    };

    const currentConfig = statusMap[contextData.status] || { variant: 'default', color: 'bg-slate-100 text-slate-600' };

    return (
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-4">
                <div className={`p-3.5 rounded-2xl flex items-center justify-center transition-colors ${currentConfig.color}`}>
                    <Package size={32} strokeWidth={1.5} />
                </div>
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                        {isNew && !contextData.numero ? 'Nova Solicitação' : `Solicitação #${contextData.numero || requestId?.split('-')[0] || '...'}`}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">STATUS:</span>
                        <StatusBadge 
                            status={contextData.status === 'Aberto' ? 'RASCUNHO' : contextData.status} 
                            variant={currentConfig.variant} 
                            size="sm"
                        />
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {!isNew && (
                    <Button
                        variant="secondary"
                        size="sm"
                        icon={Clock}
                        onClick={onOpenAudit}
                        title="Ver Histórico de Alterações"
                    >
                        <span className="hidden sm:inline">Histórico</span>
                    </Button>
                )}
                <IconButton
                    icon={X}
                    variant="default"
                    label="Fechar"
                    onClick={onClose}
                    className="hover:text-red-500 hover:bg-red-50 border-none shadow-none"
                />
            </div>
        </div>
    );
};
