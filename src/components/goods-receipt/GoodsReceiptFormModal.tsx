import { useState, useEffect } from 'react';
import { Save, Truck, FileText, MapPin, X, User, Calendar, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/supabaseService';
import { goodsReceiptService } from '../../services/goodsReceiptService';
import { Fazenda, Usuario, GoodsReceipt, Supplier } from '../../types';
import { format, parseISO } from 'date-fns';
import { supplierService } from '../../services/supplierService';
import { SupplierFormModal } from '../suppliers/SupplierFormModal';

interface GoodsReceiptFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: GoodsReceipt | null;
}

export function GoodsReceiptFormModal({ isOpen, onClose, onSuccess, initialData }: GoodsReceiptFormModalProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [farms, setFarms] = useState<Fazenda[]>([]);
    const [users, setUsers] = useState<Usuario[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    
    // Fornecedor State
    const [supplierSearchOptionsOpen, setSupplierSearchOptionsOpen] = useState(false);
    const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        receiver_id: '',
        supplier: '',
        invoice_number: '',
        order_number: '',
        destination_farm_id: '',
        entry_at: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'),
        observation_entry: '',
        operation_type: 'COMPRA' as 'COMPRA' | 'CONSERTO' | 'RETORNO_CONSERTO'
    });

    useEffect(() => {
        if (isOpen) {
            loadData();
            if (initialData) {
                setFormData({
                    receiver_id: initialData.receiver_id || '',
                    supplier: initialData.supplier,
                    invoice_number: initialData.invoice_number,
                    order_number: initialData.order_number || '',
                    destination_farm_id: initialData.destination_farm_id || '',
                    entry_at: initialData.entry_at ? format(parseISO(initialData.entry_at), 'yyyy-MM-dd\'T\'HH:mm') : format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'),
                    observation_entry: initialData.observation_entry || '',
                    operation_type: initialData.operation_type || 'COMPRA'
                });
            } else if (user) {
                setFormData(prev => ({
                    ...prev,
                    receiver_id: user.id,
                    supplier: '',
                    invoice_number: '',
                    order_number: '',
                    destination_farm_id: '',
                    entry_at: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'),
                    observation_entry: '',
                    operation_type: 'COMPRA'
                }));
            }
        }
    }, [isOpen, user, initialData]);

    const loadData = async () => {
        try {
            const [farmsData, usersData, suppliersData] = await Promise.all([
                db.getAllFarms(),
                db.getAllUsers(),
                supplierService.getActive()
            ]);

            setFarms(farmsData as Fazenda[]);
            setUsers(usersData.filter((u: any) => u.ativo)); // Filter active users
            setSuppliers(suppliersData);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.receiver_id) return alert('Selecione o recebedor.');
        if (!formData.destination_farm_id) return alert('Selecione a fazenda de destino.');

        setLoading(true);
        try {
            // Check for duplicates (same supplier and invoice_number)
            const { data: existing, error: checkError } = await (await import('../../lib/supabase')).supabase
                .from('goods_receipts')
                .select('id')
                .eq('supplier', formData.supplier)
                .eq('invoice_number', formData.invoice_number)
                .maybeSingle();

            if (checkError) console.error('Erro ao verificar duplicidade:', checkError);
            
            if (existing && (!initialData || existing.id !== initialData.id)) {
                setLoading(false);
                return alert(`Já existe um recebimento registrado para este fornecedor com a nota fiscal ${formData.invoice_number}.`);
            }

            const payload = {
                receiver_id: formData.receiver_id,
                supplier: formData.supplier,
                invoice_number: formData.invoice_number,
                order_number: formData.order_number,
                destination_farm_id: formData.destination_farm_id,
                entry_at: new Date(formData.entry_at).toISOString(),
                observation_entry: formData.observation_entry,
                operation_type: formData.operation_type
            };

            if (initialData) {
                await goodsReceiptService.updateReceipt(initialData.id, payload);
                alert('Recebimento atualizado com sucesso!');
            } else {
                const newReceipt = await goodsReceiptService.createReceipt(payload);
                alert('Recebimento registrado com sucesso!');

                // Disparar notificação por e-mail (Background)
                try {
                    const { supabase: supabaseClient } = await import('../../lib/supabase');
                    // Buscar o registro completo com as relações (fazenda, recebedor) para o corpo do e-mail
                    const { data: fullReceipt, error: fetchError } = await supabaseClient
                        .from('goods_receipts')
                        .select('*, destination_farm:destination_farm_id(nome), receiver:receiver_id(nome)')
                        .eq('id', newReceipt.id)
                        .single();

                    if (fullReceipt && !fetchError) {
                        const { notificationService } = await import('../../services/notificationService');
                        notificationService.sendGoodsReceiptReport(fullReceipt, user?.email || undefined);
                    }
                } catch (notifyError) {
                    console.error('Falha ao disparar notificação:', notifyError);
                }
            }

            // Reset form handled in effect or close
            onSuccess();
            onClose();

        } catch (error: any) {
            console.error(error);
            alert('Erro ao salvar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 border border-white/20">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center border border-teal-100">
                            <Truck size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">
                                {initialData ? 'Editar Recebimento' : 'Novo Recebimento'}
                            </h2>
                            <p className="text-sm text-slate-500">
                                Preencha os dados da nota fiscal e destino
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    <form id="receipt-form" onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">

                        {/* Bloco 1: Dados da Operação */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <Truck size={16} className="text-teal-600" />
                                Dados da Operação
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Recebedor Responsável *</label>
                                    <div className="relative">
                                        <select
                                            name="receiver_id"
                                            value={formData.receiver_id}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none appearance-none cursor-pointer transition-all"
                                        >
                                            <option value="" disabled>Selecione...</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.nome}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Natureza da Operação *</label>
                                    <div className="flex bg-slate-100 p-1 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, operation_type: 'COMPRA' }))}
                                            className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${
                                                formData.operation_type === 'COMPRA'
                                                    ? 'bg-white text-teal-600 shadow-sm border border-slate-200/50'
                                                    : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                        >
                                            COMPRA
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, operation_type: 'CONSERTO' }))}
                                            className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${
                                                formData.operation_type === 'CONSERTO'
                                                    ? 'bg-white text-teal-600 shadow-sm border border-slate-200/50'
                                                    : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                        >
                                            CONSERTO / DEVOLUÇÃO
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bloco 2: Informações do Fornecedor e Documento */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <FileText size={16} className="text-teal-600" />
                                Fornecedor e Documento
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2 relative">
                                    <label className="text-sm font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                                        <span>{formData.operation_type === 'COMPRA' ? 'Fornecedor (Origem) *' : 'Fornecedor/Oficina (Destino Final) *'}</span>
                                        <button 
                                            type="button" 
                                            onClick={(e) => { e.preventDefault(); setIsQuickCreateOpen(true); }}
                                            className="text-xs text-teal-600 hover:text-teal-800 font-bold hover:underline"
                                        >
                                            + Cadastrar Novo
                                        </button>
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        name="supplier"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                        placeholder="Buscar Razão Social ou CNPJ..."
                                        value={formData.supplier}
                                        onChange={(e) => {
                                            handleChange(e);
                                            setSupplierSearchOptionsOpen(true);
                                        }}
                                        onFocus={() => setSupplierSearchOptionsOpen(true)}
                                        onBlur={() => setTimeout(() => setSupplierSearchOptionsOpen(false), 200)}
                                        autoComplete="off"
                                    />
                                    {supplierSearchOptionsOpen && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                            {suppliers.filter(s => {
                                                const searchTxt = formData.supplier.toLowerCase();
                                                const searchNumbers = searchTxt.replace(/\D/g, '');
                                                const cnpjNumbers = s.cnpj.replace(/\D/g, '');
                                                
                                                return s.razao_social.toLowerCase().includes(searchTxt) || 
                                                       (searchNumbers && cnpjNumbers.includes(searchNumbers)) ||
                                                       s.cnpj.includes(searchTxt);
                                            }).length === 0 ? (
                                                <div className="p-3 text-sm text-slate-500 text-center">Nenhum fornecedor encontrado.</div>
                                            ) : (
                                                suppliers.filter(s => {
                                                    const searchTxt = formData.supplier.toLowerCase();
                                                    const searchNumbers = searchTxt.replace(/\D/g, '');
                                                    const cnpjNumbers = s.cnpj.replace(/\D/g, '');
                                                    
                                                    return s.razao_social.toLowerCase().includes(searchTxt) || 
                                                           (searchNumbers && cnpjNumbers.includes(searchNumbers)) ||
                                                           s.cnpj.includes(searchTxt);
                                                }).map(s => (
                                                    <div 
                                                        key={s.id}
                                                        className="px-4 py-2 cursor-pointer hover:bg-teal-50 border-b border-slate-50 last:border-0"
                                                        onClick={() => {
                                                            setFormData(prev => ({ ...prev, supplier: `${s.razao_social.toUpperCase()} - ${s.cnpj}` }));
                                                            setSupplierSearchOptionsOpen(false);
                                                        }}
                                                    >
                                                        <div className="text-sm font-bold text-slate-700">{s.razao_social.toUpperCase()}</div>
                                                        <div className="text-xs text-slate-500 font-mono">{s.cnpj}</div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Nota Fiscal *</label>
                                    <input
                                        required
                                        type="text"
                                        name="invoice_number"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                        placeholder="Nº da NF"
                                        value={formData.invoice_number}
                                        onChange={handleChange}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Pedido</label>
                                    <input
                                        type="text"
                                        name="order_number"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                        placeholder="Nº Pedido (Opcional)"
                                        value={formData.order_number}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Bloco 3: Logística e Entrada */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <MapPin size={16} className="text-teal-600" />
                                Logística e Entrada
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                        {formData.operation_type === 'COMPRA' ? 'Fazenda Destino *' : 'Fazenda de Origem *'}
                                    </label>
                                    <div className="relative">
                                        <select
                                            required
                                            name="destination_farm_id"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none appearance-none cursor-pointer transition-all"
                                            value={formData.destination_farm_id}
                                            onChange={handleChange}
                                        >
                                            <option value="">Selecione a fazenda...</option>
                                            {farms.map(farm => (
                                                <option key={farm.id} value={farm.id}>{farm.nome}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Data/Hora Entrada *</label>
                                    <input
                                        required
                                        type="datetime-local"
                                        name="entry_at"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                        value={formData.entry_at}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Bloco 4: Observações */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <FileText size={16} className="text-teal-600" />
                                Observações
                            </h3>
                            
                            <div>
                                <textarea
                                    name="observation_entry"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none min-h-[100px] resize-none transition-all"
                                    placeholder="Alguma avaria, detalhes sobre os produtos ou ocorrência na descarga..."
                                    value={formData.observation_entry}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="receipt-form"
                        disabled={loading}
                        className="px-6 py-2.5 text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-lg shadow-teal-200 hover:shadow-teal-300 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-70"
                    >
                        {loading ? 'Salvando...' : (
                            <>
                                <Save size={18} /> {initialData ? 'Atualizar Recebimento' : 'Salvar Recebimento'}
                            </>
                        )}
                    </button>
                </div>
            </div>

            <SupplierFormModal 
                isOpen={isQuickCreateOpen}
                onClose={() => setIsQuickCreateOpen(false)}
                onSuccess={(newSupplier) => {
                    setSuppliers(prev => [...prev, newSupplier]);
                    setFormData(prev => ({ ...prev, supplier: `${newSupplier.razao_social.toUpperCase()} - ${newSupplier.cnpj}` }));
                    setIsQuickCreateOpen(false);
                }}
            />
        </div>
    );
}
