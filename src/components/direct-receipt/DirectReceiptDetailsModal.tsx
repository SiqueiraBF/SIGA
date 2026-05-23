import { X, Receipt, Building2, User, Calendar, MapPin, DollarSign, FileText, CheckCircle2, Clock } from 'lucide-react';
import { DirectReceipt } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DirectReceiptDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    receipt: DirectReceipt | null;
}

export function DirectReceiptDetailsModal({ isOpen, onClose, receipt }: DirectReceiptDetailsModalProps) {
    if (!isOpen || !receipt) return null;

    const dataRegistro = new Date(receipt.created_at);
    const dataEmissao = new Date(receipt.data_emissao + 'T00:00:00');
    const teveRecebimentoFisico = !!receipt.data_recebimento && 
                                  receipt.data_recebimento !== 'Não informada' && 
                                  receipt.data_recebimento !== '-';
    
    let dataRecebimento = 'Não informada';
    if (teveRecebimentoFisico) {
        try {
            // Se tiver hífen, assumimos que é ISO e formatamos por extenso
            if (receipt.data_recebimento.includes('-')) {
                dataRecebimento = format(new Date(receipt.data_recebimento + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
            } else {
                // Se não tiver hífen, assumimos que já pode estar formatada ou é outro padrão
                dataRecebimento = receipt.data_recebimento;
            }
        } catch (e) {
            dataRecebimento = receipt.data_recebimento;
        }
    }

    const localRecebimento = receipt.local_recebimento === 'outros' 
        ? receipt.local_recebimento_outros || 'Outros' 
        : receipt.local_recebimento;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Cabeçalho */}
                <div className="bg-slate-50 border-b border-slate-100 p-6 flex items-start justify-between shrink-0">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                                <Receipt size={20} className="stroke-[2px]" />
                            </div>
                            <div>
                                <h2 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                                    Fuga de Processo 
                                    <span className="text-slate-400 font-normal">|</span> 
                                    <span className="text-blue-600 font-mono">#{receipt.nota_fiscal}</span>
                                </h2>
                                <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mt-0.5">
                                    <Clock size={12} />
                                    Registrado em {format(dataRegistro, "dd/MM/yyyy 'às' HH:mm")} por {receipt.usuario?.nome || 'Sistema'}
                                </p>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all group"
                    >
                        <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                {/* Conteúdo */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                    
                    {/* Linha 1: Info Principais */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <Building2 size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Fornecedor</p>
                                <p className="text-sm font-bold text-slate-700 uppercase leading-snug">{receipt.fornecedor}</p>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shrink-0">
                                <DollarSign size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Valor da Nota</p>
                                <p className="text-lg font-black text-slate-700">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receipt.valor)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Linha 2: Datas e Unidade */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex flex-col justify-center">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5 flex items-center gap-1.5">
                                <Calendar size={12} /> Emissão
                            </p>
                            <p className="text-sm font-bold text-slate-700">{format(dataEmissao, "dd/MM/yyyy")}</p>
                        </div>
                        
                        <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex flex-col justify-center">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5 flex items-center gap-1.5">
                                <CheckCircle2 size={12} className={teveRecebimentoFisico ? "text-emerald-500" : ""} /> Recebimento Físico
                            </p>
                            <p className={`text-sm font-bold ${teveRecebimentoFisico ? 'text-slate-700' : 'text-slate-400'}`}>
                                {dataRecebimento}
                            </p>
                        </div>

                        <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex flex-col justify-center">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5 flex items-center gap-1.5">
                                <MapPin size={12} /> Destino
                            </p>
                            <p className="text-sm font-bold text-slate-700 truncate" title={receipt.fazenda?.nome}>
                                {receipt.fazenda?.nome || 'Unidade não informada'}
                            </p>
                        </div>
                    </div>

                    {/* Linha 3: Local e Responsável */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="bg-blue-50/30 border border-blue-100/50 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <FileText size={14} className="text-blue-400" />
                                <span className="text-xs font-bold text-blue-800 uppercase tracking-wide">Local de Entrega Informado</span>
                            </div>
                            <p className="text-sm font-medium text-slate-700 uppercase">
                                {localRecebimento}
                            </p>
                        </div>

                        <div className="bg-emerald-50/30 border border-emerald-100/50 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <User size={14} className="text-emerald-500" />
                                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Responsável Informado</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-bold">
                                    {(receipt.responsavel || 'U').charAt(0).toUpperCase()}
                                </div>
                                <p className="text-sm font-bold text-slate-700 uppercase truncate">
                                    {receipt.responsavel}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Linha 4: Observação (opcional) */}
                    {receipt.observacao && (
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mt-4">
                            <div className="flex items-center gap-2 mb-2">
                                <FileText size={14} className="text-slate-400" />
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Observação</span>
                            </div>
                            <p className="text-sm font-medium text-slate-700">
                                {receipt.observacao}
                            </p>
                        </div>
                    )}

                </div>

                {/* Rodapé */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0 gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-slate-200 active:scale-95"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}
