
import React, { useRef, useEffect } from 'react';
import { Plus, ArrowUpDown, AlertTriangle } from 'lucide-react';

interface RequestItemFormProps {
    editingItem: any;
    loading: boolean;
    onSave: (data: any) => void;
    onCancel: () => void;
}

export const RequestItemForm: React.FC<RequestItemFormProps> = ({
    editingItem,
    loading,
    onSave,
    onCancel
}) => {
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (editingItem && formRef.current) {
            const form = formRef.current;
            const setVal = (name: string, val: string) => {
                const el = form.elements.namedItem(name) as HTMLInputElement;
                if (el) el.value = val;
            };
            setVal('descricao', editingItem.descricao);
            setVal('marca', editingItem.marca || '');
            setVal('referencia', editingItem.referencia || '');
            setVal('unidade', editingItem.unidade || 'UN');
        }
    }, [editingItem]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;

        const data = new FormData(e.currentTarget as HTMLFormElement);
        const desc = data.get('descricao') as string;
        if (!desc) {
            alert("Descrição obrigatória");
            return;
        }

        onSave({
            descricao: desc,
            marca: data.get('marca'),
            referencia: data.get('referencia'),
            unidade: data.get('unidade')
        });

        if (!editingItem) {
            (e.target as HTMLFormElement).reset();
            setTimeout(() => formRef.current?.querySelector<HTMLInputElement>('input[name="descricao"]')?.focus(), 100);
        }
    };

    return (
        <div className="p-6 bg-slate-50/80 border-b border-slate-200/60 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] z-20">
            <div className="flex items-center gap-2 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-4">
                <Plus size={14} className="text-slate-400" /> {editingItem ? 'EDITAR ITEM' : 'NOVO ITEM'}
            </div>

            {/* Rejection Feedback Alert */}
            {editingItem && (editingItem.status === 'Reprovado' || editingItem.status === 'Devolvido') && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                    <div>
                        <h4 className="text-xs font-bold text-red-700 uppercase mb-1">Motivo da Devolução</h4>
                        <p className="text-sm text-red-600 font-medium">
                            {editingItem.motivo_reprovacao || editingItem.cod_reduzido_unisystem || "Verifique os dados e tente novamente."}
                        </p>
                    </div>
                </div>
            )}

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">

                {/* Row 1 */}
                <div className="flex gap-4">
                    <div className="flex-[3]">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Descrição</label>
                        <input
                            name="descricao"
                            type="text"
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow placeholder:text-slate-300"
                            placeholder="Nome do produto"
                            required
                        />
                    </div>
                    <div className="flex-[2]">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Marca</label>
                        <input
                            name="marca"
                            type="text"
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:border-blue-500 outline-none transition-shadow placeholder:text-slate-300"
                            placeholder="-"
                        />
                    </div>
                    <div className="w-32">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Unidade</label>
                        <div className="relative">
                            <select name="unidade" className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none appearance-none cursor-pointer">
                                <option value="UN">UN</option>
                                <option value="KG">KG</option>
                                <option value="LT">LT</option>
                                <option value="CX">CX</option>
                                <option value="M">M</option>
                                <option value="PC">PC</option>
                            </select>
                            <ArrowUpDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Row 2 */}
                <div className="flex gap-4 items-end">
                    <div className="flex-[2]">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Referência</label>
                        <input
                            name="referencia"
                            type="text"
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:border-blue-500 outline-none transition-shadow placeholder:text-slate-300"
                            placeholder="-"
                        />
                    </div>
                    <div className="flex-[4]">
                        {editingItem ? (
                            <div className="flex gap-2 h-[38px]">
                                <button type="button" onClick={onCancel} disabled={loading} className="flex-1 bg-slate-200 text-slate-600 font-bold rounded-lg text-xs uppercase hover:bg-slate-300 disabled:opacity-50 transition-colors">Cancelar</button>
                                <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white font-bold rounded-lg text-xs uppercase hover:bg-blue-700 disabled:opacity-50 shadow-md shadow-blue-200 transition-all">Atualizar Item</button>
                            </div>
                        ) : (
                            <button type="submit" disabled={loading} className="w-full h-[38px] bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 hover:border-green-300 font-extrabold rounded-lg text-xs uppercase tracking-wide transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed">
                                Adicionar Item na Lista
                            </button>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
};
