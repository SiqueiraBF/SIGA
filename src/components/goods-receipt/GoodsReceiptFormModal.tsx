import { useState, useEffect } from 'react';
import { Save, Truck, FileText, MapPin, X, User, Calendar, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/supabaseService';
import { goodsReceiptService } from '../../services/goodsReceiptService';
import { Fazenda, Usuario, GoodsReceipt } from '../../types';
import { format, parseISO } from 'date-fns';

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
    const [suppliers, setSuppliers] = useState<string[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        receiver_id: '',
        supplier: '',
        invoice_number: '',
        order_number: '',
        destination_farm_id: '',
        entry_at: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'),
        observation_entry: ''
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
                    observation_entry: initialData.observation_entry || ''
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
                    observation_entry: ''
                }));
            }
        }
    }, [isOpen, user, initialData]);

    const loadData = async () => {
        try {
            const [farmsData, usersData, suppliersData] = await Promise.all([
                db.getAllFarms(),
                db.getAllUsers(),
                goodsReceiptService.getDistinctSuppliers()
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
            const payload = {
                receiver_id: formData.receiver_id,
                supplier: formData.supplier,
                invoice_number: formData.invoice_number,
                order_number: formData.order_number,
                destination_farm_id: formData.destination_farm_id,
                entry_at: new Date(formData.entry_at).toISOString(),
                observation_entry: formData.observation_entry
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Truck className="text-blue-600" size={20} /> {initialData ? 'Editar Recebimento' : 'Novo Recebimento'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="p-6 overflow-y-auto">
                    <form id="receipt-form" onSubmit={handleSubmit} className="space-y-6">

                        {/* Receiver Info (Dropdown) */}
                        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center gap-4 relative">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shadow-sm flex-shrink-0">
                                <User size={20} />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-bold text-blue-400 uppercase tracking-wide block mb-1">
                                    Recebedor Responsável
                                </label>
                                <div className="relative">
                                    <select
                                        name="receiver_id"
                                        value={formData.receiver_id}
                                        onChange={handleChange}
                                        className="w-full bg-transparent font-semibold text-slate-700 outline-none appearance-none cursor-pointer pr-8 py-1 border-b border-transparent hover:border-blue-200 focus:border-blue-400 transition-colors"
                                    >
                                        <option value="" disabled>Selecione...</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.nome}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Supplier with Datalist */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                    <Truck size={16} className="text-slate-400" /> Fornecedor
                                </label>
                                <input
                                    required
                                    type="text"
                                    name="supplier"
                                    list="suppliers-list"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="Nome do fornecedor"
                                    value={formData.supplier}
                                    onChange={handleChange}
                                    autoComplete="off"
                                />
                                <datalist id="suppliers-list">
                                    {suppliers.map((s, i) => (
                                        <option key={i} value={s} />
                                    ))}
                                </datalist>
                            </div>

                            {/* Invoice & Order */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                        <FileText size={16} className="text-slate-400" /> Nota Fiscal
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        name="invoice_number"
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="Nº da NF"
                                        value={formData.invoice_number}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                        <FileText size={16} className="text-slate-400" /> Pedido
                                    </label>
                                    <input
                                        type="text"
                                        name="order_number"
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="Nº Pedido"
                                        value={formData.order_number}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            {/* Destination Farm */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                    <MapPin size={16} className="text-slate-400" /> Fazenda Destino
                                </label>
                                <select
                                    required
                                    name="destination_farm_id"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={formData.destination_farm_id}
                                    onChange={handleChange}
                                >
                                    <option value="">Selecione a fazenda...</option>
                                    {farms.map(farm => (
                                        <option key={farm.id} value={farm.id}>{farm.nome}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Date */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                    <Calendar size={16} className="text-slate-400" /> Data/Hora Entrada
                                </label>
                                <input
                                    required
                                    type="datetime-local"
                                    name="entry_at"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={formData.entry_at}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Observation */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                <FileText size={16} className="text-slate-400" /> Observações de Entrada (Opcional)
                            </label>
                            <textarea
                                name="observation_entry"
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px] resize-none transition-all"
                                placeholder="Alguma avaria ou detalhe importante..."
                                value={formData.observation_entry}
                                onChange={handleChange}
                            />
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="receipt-form"
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? 'Salvando...' : (
                            <>
                                <Save size={18} /> Salvar Recebimento
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
