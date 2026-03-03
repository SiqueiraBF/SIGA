
import React from 'react';
import { X, Clock, Package } from 'lucide-react';

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
    const statusColors = {
        'Finalizado': 'bg-green-50 text-green-600',
        'Aguardando': 'bg-amber-50 text-amber-600',
        'Em Cadastro': 'bg-purple-50 text-purple-600',
        'Devolvido': 'bg-orange-50 text-orange-600',
        'Aberto': 'bg-slate-100 text-slate-600'
    };

    const statusTextColors = {
        'Finalizado': 'text-green-600',
        'Aguardando': 'text-amber-600',
        'Em Cadastro': 'text-purple-600',
        'Devolvido': 'text-orange-600',
        'Aberto': 'text-slate-500'
    };

    const currentStatusColor = statusColors[contextData.status as keyof typeof statusColors] || 'bg-slate-100 text-slate-600';
    const currentTextColor = statusTextColors[contextData.status as keyof typeof statusTextColors] || 'text-slate-500';

    return (
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-4">
                <div className={`p-3.5 rounded-2xl flex items-center justify-center transition-colors ${currentStatusColor}`}>
                    <Package size={32} strokeWidth={1.5} />
                </div>
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                        {isNew && !contextData.numero ? 'Nova Solicitação' : `Solicitação #${contextData.numero || requestId?.split('-')[0] || '...'}`}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">STATUS:</span>
                        <span className={`text-[11px] font-bold uppercase tracking-wide ${currentTextColor}`}>
                            {contextData.status === 'Aberto' ? 'RASCUNHO' : contextData.status.toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {!isNew && (
                    <button
                        onClick={onOpenAudit}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 rounded-lg transition-colors uppercase tracking-wide"
                        title="Ver Histórico de Alterações"
                    >
                        <Clock size={16} />
                        <span className="hidden sm:inline">Histórico</span>
                    </button>
                )}
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <X size={24} />
                </button>
            </div>
        </div>
    );
};
