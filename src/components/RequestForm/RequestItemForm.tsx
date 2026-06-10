
import React, { useRef, useEffect } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import { FormField } from '../ui/FormField';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';

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
        const desc = (data.get('descricao') as string)?.toUpperCase();
        if (!desc) {
            toast.error("Descrição obrigatória");
            return;
        }

        onSave({
            descricao: desc,
            marca: (data.get('marca') as string)?.toUpperCase(),
            referencia: (data.get('referencia') as string)?.toUpperCase(),
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
                        <FormField label="Descrição" hint="Descreva o item de forma clara, sem abreviações.">
                            <Input
                                name="descricao"
                                type="text"
                                className="uppercase"
                                placeholder="Ex: PNEU 295/80R22.5 BORRACHUDO"
                                required
                            />
                        </FormField>
                    </div>
                    <div className="flex-[2]">
                        <FormField label="Marca" hint="Nome do fabricante (Opcional)">
                            <Input
                                name="marca"
                                type="text"
                                className="uppercase"
                                placeholder="Ex: FIRESTONE, TRAMONTINA"
                            />
                        </FormField>
                    </div>
                    <div className="w-32">
                        <FormField label="Unidade">
                            <Select
                                name="unidade"
                                options={[
                                    { value: 'UN', label: 'UN' },
                                    { value: 'KG', label: 'KG' },
                                    { value: 'LT', label: 'LT' },
                                    { value: 'CX', label: 'CX' },
                                    { value: 'M', label: 'M' },
                                    { value: 'PC', label: 'PC' }
                                ]}
                            />
                        </FormField>
                    </div>
                </div>

                {/* Row 2 */}
                <div className="flex gap-4 items-start">
                    <div className="flex-[2]">
                        <FormField label="Referência" hint="Part number ou modelo (Opcional)">
                            <Input
                                name="referencia"
                                type="text"
                                className="uppercase"
                                placeholder="Ex: T831, 10X20"
                            />
                        </FormField>
                    </div>
                    <div className="flex-[4]">
                        <FormField label={"\u00A0"}>
                            {editingItem ? (
                                <div className="flex gap-2">
                                    <Button type="button" variant="secondary" onClick={onCancel} disabled={loading} fullWidth>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" variant="primary" disabled={loading} fullWidth>
                                        Atualizar Item
                                    </Button>
                                </div>
                            ) : (
                                <Button type="submit" variant="success" disabled={loading} fullWidth>
                                    Adicionar Item na Lista
                                </Button>
                            )}
                        </FormField>
                    </div>
                </div>
            </form>
        </div>
    );
};
