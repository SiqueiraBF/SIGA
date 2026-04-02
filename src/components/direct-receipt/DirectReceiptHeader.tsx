import { X, Receipt } from 'lucide-react';

interface DirectReceiptHeaderProps {
    onClose: () => void;
}

export const DirectReceiptHeader: React.FC<DirectReceiptHeaderProps> = ({
    onClose
}) => {
    return (
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10 transition-all">
            <div className="flex items-center gap-4">
                <div className="p-3.5 rounded-2xl flex items-center justify-center bg-blue-50 text-blue-600 shadow-sm border border-blue-100">
                    <Receipt size={32} strokeWidth={1.5} />
                </div>
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                        Lançamento em Lote: Fuga Processo
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">STATUS:</span>
                        <span className="text-[11px] font-bold uppercase tracking-wide text-blue-600">
                            LOTE EM ABERTO
                        </span>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <button 
                    onClick={onClose} 
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors group"
                >
                    <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>
            </div>
        </div>
    );
};
