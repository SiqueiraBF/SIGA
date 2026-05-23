import { useState, useEffect } from 'react';
import { X, Save, Building2, Briefcase, Hash } from 'lucide-react';
import { Supplier } from '../../types';
import { supplierService } from '../../services/supplierService';
import toast from 'react-hot-toast';

interface SupplierFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (savedSupplier: Supplier) => void;
    initialData?: Supplier | null;
    initialCnpj?: string;
}

export function SupplierFormModal({ isOpen, onClose, onSuccess, initialData, initialCnpj }: SupplierFormModalProps) {
    const [loading, setLoading] = useState(false);
    
    // Form State
    const [formData, setFormData] = useState({
        razao_social: '',
        nome_fantasia: '',
        cnpj: '',
        ativo: true
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    razao_social: initialData.razao_social,
                    nome_fantasia: initialData.nome_fantasia || '',
                    cnpj: initialData.cnpj,
                    ativo: initialData.ativo
                });
            } else {
                setFormData({
                    razao_social: '',
                    nome_fantasia: '',
                    cnpj: initialCnpj || '',
                    ativo: true
                });
            }
        }
    }, [isOpen, initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (name === 'cnpj') {
            // Limita a 18 chars (com máscara) e formata enquanto digita
            const raw = value.replace(/\D/g, ''); 
            let formatted = raw;
            if (raw.length <= 14) {
                formatted = raw.replace(/^(\d{2})(\d)/, '$1.$2')
                               .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
                               .replace(/\.(\d{3})(\d)/, '.$1/$2')
                               .replace(/(\d{4})(\d)/, '$1-$2');
            }
            setFormData(prev => ({ ...prev, [name]: formatted.substring(0, 18) }));
            return;
        }

        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (formData.cnpj.replace(/\D/g, '').length !== 14) {
            toast.error('CNPJ incompleto ou inválido!');
            return;
        }

        setLoading(true);

        try {
            const payload = {
                razao_social: formData.razao_social.toUpperCase().trim(),
                nome_fantasia: formData.nome_fantasia ? formData.nome_fantasia.toUpperCase().trim() : undefined,
                cnpj: formData.cnpj,
                ativo: formData.ativo
            };

            let savedSupplier: Supplier;

            if (initialData) {
                savedSupplier = await supplierService.update(initialData.id, payload);
                toast.success('Fornecedor atualizado com sucesso!');
            } else {
                savedSupplier = await supplierService.create(payload);
                toast.success('Fornecedor cadastrado com sucesso!');
            }

            onSuccess(savedSupplier);
            onClose();

        } catch (error: any) {
            console.error('Error saving supplier:', error);
            toast.error(error.message || 'Erro ao processar o fornecedor.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="text-blue-600" size={20} /> 
                        {initialData ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-lg transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <form id="supplier-form" onSubmit={handleSubmit} className="space-y-5">
                        
                        {/* Status (Ativo Inativo) só exibido na edição principal */}
                        {initialData && (
                            <div className="flex items-center gap-2 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <label className="text-sm font-bold text-slate-700">Status no Sistema:</label>
                                <div className="flex items-center">
                                    <input 
                                        type="checkbox" 
                                        name="ativo"
                                        id="ativo"
                                        checked={formData.ativo}
                                        onChange={handleChange}
                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                    />
                                    <label htmlFor="ativo" className={`ml-2 text-sm font-medium ${formData.ativo ? 'text-green-600' : 'text-red-500'} cursor-pointer`}>
                                        {formData.ativo ? 'Ativo e Liberado' : 'Bloqueado (Inativo)'}
                                    </label>
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                <Hash size={16} className="text-slate-400" /> CNPJ
                            </label>
                            <input
                                required
                                type="text"
                                name="cnpj"
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                                placeholder="00.000.000/0000-00"
                                value={formData.cnpj}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                <Briefcase size={16} className="text-slate-400" /> Razão Social
                            </label>
                            <input
                                required
                                type="text"
                                name="razao_social"
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase placeholder:normal-case"
                                placeholder="Nome oficial da empresa"
                                value={formData.razao_social}
                                onChange={handleChange}
                                style={{ textTransform: 'uppercase' }}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                <Building2 size={16} className="text-slate-400" /> Nome Fantasia (Opcional)
                            </label>
                            <input
                                type="text"
                                name="nome_fantasia"
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase placeholder:normal-case"
                                placeholder="Como a empresa é conhecida comercialmente"
                                value={formData.nome_fantasia}
                                onChange={handleChange}
                                style={{ textTransform: 'uppercase' }}
                            />
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="supplier-form"
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? 'Salvando...' : (
                            <>
                                <Save size={18} /> Salvar Fornecedor
                            </>
                        )}
                    </button>
                </div>
                
            </div>
        </div>
    );
}
