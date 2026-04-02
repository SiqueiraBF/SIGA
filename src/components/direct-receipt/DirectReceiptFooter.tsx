import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface DirectReceiptFooterProps {
    loading: boolean;
    onClose: () => void;
    handleFinalSave: () => void;
    pendingCount: number;
}

export const DirectReceiptFooter: React.FC<DirectReceiptFooterProps> = ({
    loading,
    onClose,
    handleFinalSave,
    pendingCount
}) => {
    return (
        <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between z-10 transition-all">
            <div className="flex items-center gap-4">
                <button 
                    onClick={onClose} 
                    disabled={loading} 
                    className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg text-sm hover:bg-slate-50 transition-colors disabled:opacity-50 active:scale-95"
                >
                    Fechar / Cancelar
                </button>
                <div className="h-6 w-[1px] bg-slate-100 hidden sm:block"></div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">
                    {pendingCount} {pendingCount === 1 ? 'nota pronta' : 'notas prontas'}
                </div>
            </div>

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={handleFinalSave}
                    disabled={loading || pendingCount === 0}
                    className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 disabled:opacity-50 disabled:active:scale-100"
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Processando...</span>
                        </>
                    ) : (
                        <>
                            <CheckCircle2 size={16} /> 
                            <span>Salvar Lote e Notificar</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
