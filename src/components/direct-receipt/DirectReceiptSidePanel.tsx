import React from 'react';
import { Plus, Building2, User } from 'lucide-react';

interface DirectReceiptSidePanelProps {
    notaFiscal: string;
    setNotaFiscal: (val: string) => void;
    fornecedor: string;
    setFornecedor: (val: string) => void;
    dataEmissao: string;
    setDataEmissao: (val: string) => void;
    isDateUnknown: boolean;
    setIsDateUnknown: (val: boolean) => void;
    dataRecebimento: string;
    setDataRecebimento: (val: string) => void;
    localRecebimento: string;
    setLocalRecebimento: (val: string) => void;
    localOutros: string;
    setLocalOutros: (val: string) => void;
    responsavel: string;
    setResponsavel: (val: string) => void;
    valor: string;
    setValor: (val: string) => void;
    observacao: string;
    setObservacao: (val: string) => void;
    handleAddItem: (e: React.FormEvent) => void;
    currentFarm: string;
    userName?: string;
    LOCAL_OPTIONS: { value: string; label: string }[];
}

export const DirectReceiptSidePanel: React.FC<DirectReceiptSidePanelProps> = ({
    notaFiscal, setNotaFiscal,
    fornecedor, setFornecedor,
    dataEmissao, setDataEmissao,
    isDateUnknown, setIsDateUnknown,
    dataRecebimento, setDataRecebimento,
    localRecebimento, setLocalRecebimento,
    localOutros, setLocalOutros,
    responsavel, setResponsavel,
    valor, setValor,
    observacao, setObservacao,
    handleAddItem,
    currentFarm,
    userName,
    LOCAL_OPTIONS
}) => {
    return (
        <div className="w-[340px] shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
            <div className="p-6 space-y-6">
                {/* Context Info */}
                <div className="space-y-4 pb-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <Building2 size={16} className="text-slate-400" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filial / Fazenda</label>
                            <span className="text-sm font-bold text-slate-700">{currentFarm}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <User size={16} className="text-slate-400" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Usuário Logado</label>
                            <span className="text-sm font-bold text-slate-700">{userName}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <Plus size={12} className="text-blue-500" /> Detalhes da Nota
                </div>

                <form onSubmit={handleAddItem} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 uppercase">Nota Fiscal</label>
                        <input
                            type="text"
                            required
                            value={notaFiscal}
                            onChange={(e) => setNotaFiscal(e.target.value)}
                            placeholder="Número da NF"
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 uppercase">Fornecedor</label>
                        <input
                            type="text"
                            required
                            value={fornecedor}
                            onChange={(e) => setFornecedor(e.target.value)}
                            placeholder="Nome da empresa"
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 uppercase">Emissão</label>
                            <input
                                type="date"
                                required
                                value={dataEmissao}
                                onChange={(e) => setDataEmissao(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1.5 ml-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase">Recebimento</label>
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isDateUnknown}
                                        onChange={(e) => setIsDateUnknown(e.target.checked)}
                                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Não sei</span>
                                </label>
                            </div>
                            <input
                                type={isDateUnknown ? "text" : "date"}
                                disabled={isDateUnknown}
                                value={isDateUnknown ? "Não informada" : dataRecebimento}
                                onChange={(e) => setDataRecebimento(e.target.value)}
                                className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none ${isDateUnknown ? 'bg-slate-100 border-transparent text-slate-400 italic' : 'bg-white border-slate-200 text-slate-800'}`}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 uppercase">Local de Recebimento</label>
                        <select
                            value={localRecebimento}
                            onChange={(e) => setLocalRecebimento(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                        >
                            {LOCAL_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                        {localRecebimento === 'outros' && (
                            <input
                                type="text"
                                required
                                value={localOutros}
                                onChange={(e) => setLocalOutros(e.target.value)}
                                placeholder="Especifique..."
                                className="w-full mt-2 px-4 py-2.5 bg-blue-50/50 border border-blue-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none animate-in slide-in-from-top-1"
                            />
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 uppercase">Responsável</label>
                        <input
                            type="text"
                            required
                            value={responsavel}
                            onChange={(e) => setResponsavel(e.target.value)}
                            placeholder="Nome de quem recebeu"
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 uppercase">Valor da Nota (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={valor}
                            onChange={(e) => setValor(e.target.value)}
                            placeholder="0,00"
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 uppercase">Observação</label>
                        <textarea
                            value={observacao}
                            onChange={(e) => setObservacao(e.target.value)}
                            placeholder="Informações adicionais..."
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-2.5 bg-slate-800 text-white font-bold rounded-lg text-sm hover:bg-slate-900 active:scale-95 transition-all shadow-lg shadow-slate-800/25 flex items-center justify-center gap-2 mt-4"
                    >
                        <Plus size={18} /> Adicionar Nota
                    </button>
                </form>
            </div>
        </div>
    );
};
