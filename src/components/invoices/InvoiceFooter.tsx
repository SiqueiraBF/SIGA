import { CheckCircle2 } from 'lucide-react';

interface InvoiceFooterProps {
    isSubmitting: boolean;
    onClose: () => void;
    handleSubmit: () => void;
    itemsCount: number;
    isEditMode?: boolean;
    handleEditSave?: (e: React.FormEvent) => void;
}

export const InvoiceFooter: React.FC<InvoiceFooterProps> = ({
    isSubmitting,
    onClose,
    handleSubmit,
    itemsCount,
    isEditMode,
    handleEditSave
}) => {
    return (
        <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between z-10 transition-all">
            <div className="flex items-center gap-4">
                <button 
                    onClick={onClose} 
                    disabled={isSubmitting} 
                    className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl text-[11px] uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50"
                >
                    FECHAR / CANCELAR
                </button>
                {!isEditMode && (
                    <>
                        <div className="h-6 w-[1px] bg-slate-100 hidden sm:block"></div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">
                            {itemsCount} {itemsCount === 1 ? 'nota pronta' : 'notas prontas'}
                        </div>
                    </>
                )}
            </div>

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={isEditMode ? handleEditSave : handleSubmit}
                    disabled={isSubmitting || (!isEditMode && itemsCount === 0)}
                    className="px-8 py-2.5 bg-blue-600 text-white font-black uppercase text-[11px] tracking-widest rounded-xl hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 disabled:grayscale flex items-center gap-2"
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>{isEditMode ? 'SALVANDO ALTERAÇÕES...' : 'PROCESSANDO LOTE...'}</span>
                        </>
                    ) : (
                        <>
                            <CheckCircle2 size={18} /> 
                            <span>{isEditMode ? 'SALVAR EDIÇÃO' : `SALVAR LOTE E NOTIFICAR`}</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
