
import React, { useRef } from 'react';
import { Clock, ArrowUpDown, Ban, CheckCircle2, MousePointerClick } from 'lucide-react';

interface RequestAnalystFormProps {
    analystSelectedItem: any;
    loading: boolean;
    onAnalyze: (itemId: string, data: any) => void;
    onCancel: () => void;
}

export const RequestAnalystForm: React.FC<RequestAnalystFormProps> = ({
    analystSelectedItem,
    loading,
    onAnalyze,
    onCancel
}) => {
    const formRef = useRef<HTMLFormElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!analystSelectedItem) return;

        const data = new FormData(e.currentTarget as HTMLFormElement);
        const inputValue = data.get('cod_uni') as string;
        const tipoTratativa = data.get('tipo_tratativa') as string;

        if (!tipoTratativa) {
            alert("Selecione uma classificação para o cadastro (Novo, Reativado, Existente ou Correção)");
            return;
        }

        let updateData: any = {};

        if (tipoTratativa === 'CORRECAO') {
            if (!inputValue) {
                alert("Informe o motivo da correção.");
                return;
            }
            updateData = {
                status_item: 'Reprovado',
                motivo_reprovacao: inputValue,
                tipo_tratativa: 'CORRECAO'
            };
        } else {
            if (!inputValue) {
                alert("Código UNI obrigatório para aprovar");
                return;
            }

            updateData = {
                status_item: 'Aprovado',
                cod_reduzido_unisystem: inputValue,
                motivo_reprovacao: null,
                tipo_tratativa: tipoTratativa as any
            };
        }

        onAnalyze(analystSelectedItem.id, updateData);
    };

    return (
        <div className="p-6 bg-white border-b border-slate-200/60 shadow-sm z-20 min-h-[140px] flex flex-col justify-center">
            {analystSelectedItem ? (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-4">
                        <Clock size={14} className="text-purple-500" /> EDITAR/ANALISAR ITEM
                    </div>
                    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                        {/* Row 1: Read Only Data */}
                        <div className="flex gap-4">
                            <div className="flex-[3]">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Descrição</label>
                                <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium truncate">
                                    {analystSelectedItem.descricao}
                                </div>
                            </div>
                            <div className="flex-[2]">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Marca</label>
                                <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium truncate">
                                    {analystSelectedItem.marca || '-'}
                                </div>
                            </div>
                            <div className="w-24">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Unidade</label>
                                <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium flex items-center justify-between">
                                    {analystSelectedItem.unidade}
                                    <ArrowUpDown size={12} className="opacity-30" />
                                </div>
                            </div>
                        </div>

                        {/* Action Selection Grid */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Classificação do Cadastro <span className="text-red-500">*</span></label>
                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    { id: 'NOVO', label: 'NOVO', color: 'peer-checked:bg-green-500 peer-checked:text-white border-green-200 text-green-700 bg-green-50' },
                                    { id: 'REATIVADO', label: 'REATIVADO', color: 'peer-checked:bg-blue-500 peer-checked:text-white border-blue-200 text-blue-700 bg-blue-50' },
                                    { id: 'EXISTENTE', label: 'EXISTENTE', color: 'peer-checked:bg-amber-500 peer-checked:text-white border-amber-200 text-amber-700 bg-amber-50' },
                                    { id: 'CORRECAO', label: 'CORREÇÃO', color: 'peer-checked:bg-red-500 peer-checked:text-white border-red-200 text-red-700 bg-red-50' }
                                ].map((opt) => (
                                    <label key={opt.id} className="relative cursor-pointer group">
                                        <input
                                            type="radio"
                                            name="tipo_tratativa"
                                            value={opt.id}
                                            className="peer sr-only"
                                            required
                                            onChange={(e) => {
                                                const lbl = document.getElementById('lbl-cod-uni');
                                                if (lbl) lbl.innerText = e.target.value === 'CORRECAO' ? 'Motivo da Correção *' : 'Cód. Uni *';

                                                const input = document.getElementById('input-cod-uni') as HTMLInputElement;
                                                if (input) {
                                                    input.placeholder = e.target.value === 'CORRECAO' ? 'Descreva o motivo...' : 'Digite o código...';
                                                    input.focus();
                                                }
                                            }}
                                        />
                                        <div className={`w-full py-2 flex items-center justify-center rounded-lg text-[10px] font-extrabold border uppercase transition-all ${opt.color} opacity-60 peer-checked:opacity-100 peer-checked:shadow-md hover:opacity-80`}>
                                            {opt.label}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Row 2: Input & Logic */}
                        <div className="flex gap-4 items-end">
                            <div className="flex-[2]">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Referência</label>
                                <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium truncate">
                                    {analystSelectedItem.referencia || '-'}
                                </div>
                            </div>

                            <div className="flex-[4]">
                                <label id="lbl-cod-uni" className="block text-[10px] font-bold text-purple-600 uppercase mb-1">Cód. Uni <span className="text-purple-400">*</span></label>
                                <input
                                    id="input-cod-uni"
                                    name="cod_uni"
                                    defaultValue={analystSelectedItem.cod_reduzido_unisystem || ''}
                                    required
                                    type="text"
                                    className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-shadow placeholder:text-slate-300"
                                    placeholder="Selecione uma ação..."
                                />
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="flex gap-4 pt-2">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="px-6 py-3 bg-slate-50 text-slate-500 font-bold rounded-lg text-xs uppercase tracking-wide hover:bg-slate-100 transition-colors flex items-center gap-2"
                            >
                                CANCELAR <Ban size={14} className="opacity-50" />
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-3 bg-purple-600 text-white font-extrabold rounded-lg text-sm uppercase tracking-wide hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all transform active:scale-[0.99] flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={18} /> CONFIRMAR ANÁLISE
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="h-full border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 gap-2 min-h-[100px]">
                    <MousePointerClick size={24} className="opacity-50" />
                    <p className="text-xs font-medium">Selecione um item na tabela abaixo para<br />informar o Código UNI e validar.</p>
                </div>
            )}
        </div>
    );
};
