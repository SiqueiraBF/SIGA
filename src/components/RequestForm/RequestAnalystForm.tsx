import React, { useRef } from 'react';
import { Clock, Ban, CheckCircle2 } from 'lucide-react';
import { FormField } from '../ui/FormField';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';

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
            toast.error("Selecione uma classificação para o cadastro (Novo, Reativado, Existente ou Correção)");
            return;
        }

        let updateData: any = {};

        if (tipoTratativa === 'CORRECAO') {
            if (!inputValue) {
                toast.error("Informe o motivo da correção.");
                return;
            }
            updateData = {
                status_item: 'Reprovado',
                motivo_reprovacao: inputValue,
                tipo_tratativa: 'CORRECAO'
            };
        } else {
            if (!inputValue) {
                toast.error("Código UNI obrigatório para aprovar");
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

    if (!analystSelectedItem) return null;

    return (
        <div className="flex flex-col animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-slate-500 uppercase tracking-widest mb-3.5">
                <Clock size={13} className="text-blue-500" /> EDITAR/ANALISAR ITEM
            </div>
            
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-3.5">
                {/* Action Selection Grid */}
                <FormField label="Classificação do Cadastro" required>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {[
                            { id: 'NOVO', label: 'NOVO', color: 'peer-checked:bg-green-500 peer-checked:text-white border-slate-200 text-slate-600 bg-white hover:bg-slate-50' },
                            { id: 'REATIVADO', label: 'REATIVADO', color: 'peer-checked:bg-blue-500 peer-checked:text-white border-slate-200 text-slate-600 bg-white hover:bg-slate-50' },
                            { id: 'EXISTENTE', label: 'EXISTENTE', color: 'peer-checked:bg-amber-500 peer-checked:text-white border-slate-200 text-slate-600 bg-white hover:bg-slate-50' },
                            { id: 'CORRECAO', label: 'CORREÇÃO', color: 'peer-checked:bg-red-500 peer-checked:text-white border-slate-200 text-slate-600 bg-white hover:bg-slate-50' }
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
                                        if (lbl) lbl.innerText = e.target.value === 'CORRECAO' ? 'Motivo da Correção *' : 'Cód. ERP *';

                                        const input = document.getElementById('input-cod-uni') as HTMLInputElement;
                                        if (input) {
                                            input.placeholder = e.target.value === 'CORRECAO' ? 'Descreva o motivo da correção...' : 'Digite o código Unisystem...';
                                            input.focus();
                                        }
                                    }}
                                />
                                <div className={`w-full py-1.5 flex items-center justify-center rounded text-[10px] font-bold border uppercase transition-all ${opt.color} peer-checked:border-transparent peer-checked:shadow-sm`}>
                                    {opt.label}
                                </div>
                            </label>
                        ))}
                    </div>
                </FormField>

                {/* Input ERP/Motivo */}
                <div className="w-full pb-0.5">
                    <label id="lbl-cod-uni" className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Cód. ERP <span className="text-blue-500">*</span></label>
                    <Input
                        id="input-cod-uni"
                        name="cod_uni"
                        defaultValue={analystSelectedItem.cod_reduzido_unisystem || ''}
                        required
                        type="text"
                        className="text-[11px] bg-white border-slate-200 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Selecione uma ação acima..."
                    />
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-3 pt-2">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onCancel}
                        iconRight={Ban}
                        className="px-5 text-[11px]"
                    >
                        CANCELAR
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        className="flex-1 text-[11px]"
                        icon={CheckCircle2}
                    >
                        CONFIRMAR ANÁLISE
                    </Button>
                </div>
            </form>
        </div>
    );
};
