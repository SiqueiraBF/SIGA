import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { invoiceService } from '../../services/invoiceService';
import { unisystemService } from '../../services/unisystemService';
import { PendingInvoice, UnisystemSupplier } from '../../types/invoiceTypes';
import { supabase } from '../../lib/supabase';
import { Trash2, AlertTriangle, CheckCircle, FileText, Paperclip, Pencil, Receipt, AlertCircle } from 'lucide-react';
import { GraphAttachment } from '../../services/graphService';

// Sub-components
import { InvoiceHeader } from './InvoiceHeader';
import { InvoiceSidePanel } from './InvoiceSidePanel';
import { InvoiceFooter } from './InvoiceFooter';

interface InvoiceItem {
    id: string; 
    invoice_number: string;
    supplier_name: string;
    supplier_cnpj?: string;
    issue_date: string;
    delivery_date: string;
    amount: string; 
    status: 'valid' | 'invalid' | 'checking' | 'duplicate';
    errorMsg?: string;
    file_url?: string; 
    file?: File | null;
    isExisting?: boolean; // Flag para identificar se já está no banco
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingInvoice?: PendingInvoice | null;
}

export const InvoiceRegistrationModal = ({ isOpen, onClose, onSuccess, editingInvoice }: Props) => {
    const { user } = useAuth();
    
    // States for the batch list
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isEditMode = !!editingInvoice;

    // States for the sidebar form (New Entry)
    const [formState, setFormState] = useState({
        invoice_number: '',
        supplier_name: '',
        supplier_cnpj: '',
        issue_date: '',
        delivery_date: new Date().toISOString().split('T')[0],
        amount: '',
        status: 'valid' as 'valid' | 'invalid' | 'checking' | 'duplicate',
        errorMsg: undefined as string | undefined,
        file: null as File | null
    });

    const [supplierSuggestions, setSupplierSuggestions] = useState<UnisystemSupplier[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Clean states when opening/closing
    useEffect(() => {
        if (!isOpen) {
            setItems([]);
            resetForm();
        } else if (editingInvoice) {
            // Load editing invoice data
            setFormState({
                invoice_number: editingInvoice.invoice_number,
                supplier_name: editingInvoice.supplier_name,
                supplier_cnpj: editingInvoice.supplier_cnpj || '',
                issue_date: editingInvoice.issue_date,
                delivery_date: editingInvoice.delivery_date,
                amount: editingInvoice.amount?.toString() || '',
                status: 'valid',
                errorMsg: undefined,
                file: null
            });
        } else {
            // NEW LATCH: Load existing pending invoices for this farm
            loadExistingPending();
        }
    }, [isOpen, editingInvoice]);

    const loadExistingPending = async () => {
        if (!user?.fazenda_id) return;
        
        try {
            const existing = await invoiceService.getInvoices(user.fazenda_id, 'Pendente');
            const mappedExisting: InvoiceItem[] = existing.map(inv => ({
                id: inv.id,
                invoice_number: inv.invoice_number,
                supplier_name: inv.supplier_name,
                supplier_cnpj: inv.supplier_cnpj,
                issue_date: inv.issue_date,
                delivery_date: inv.delivery_date,
                amount: inv.amount?.toString() || '',
                status: 'valid',
                file_url: inv.file_url,
                isExisting: true
            }));
            setItems(mappedExisting);
        } catch (error) {
            console.error('Erro ao carregar pendências existentes:', error);
        }
    };

    const resetForm = () => {
        setFormState({
            invoice_number: '',
            supplier_name: '',
            supplier_cnpj: '',
            issue_date: '',
            delivery_date: new Date().toISOString().split('T')[0],
            amount: '',
            status: 'valid',
            errorMsg: undefined,
            file: null
        });
    };

    // Supplier search logic
    useEffect(() => {
        if (formState.supplier_name.length < 3 || !showSuggestions) {
            setSupplierSuggestions([]);
            return;
        }

        const timer = setTimeout(async () => {
            const results = await unisystemService.searchSuppliers(formState.supplier_name);
            setSupplierSuggestions(results);
        }, 500);

        return () => clearTimeout(timer);
    }, [formState.supplier_name, showSuggestions]);

    const handleSelectSupplier = (supplier: UnisystemSupplier) => {
        setFormState(prev => ({
            ...prev,
            supplier_name: supplier.name,
            supplier_cnpj: supplier.cnpj || ''
        }));
        setShowSuggestions(false);
    };

    const validateDuplicate = async () => {
        if (!formState.invoice_number || !formState.supplier_cnpj) return;

        setFormState(prev => ({ ...prev, status: 'checking' }));

        try {
            const duplicate = await unisystemService.checkInvoiceExists(formState.supplier_cnpj, formState.invoice_number);
            
            if (duplicate) {
                setFormState(prev => ({
                    ...prev,
                    status: 'duplicate',
                    errorMsg: `Nota já lançada em ${duplicate.entry_date.split('T')[0].split('-').reverse().join('/')}`
                }));
            } else {
                setFormState(prev => ({ ...prev, status: 'valid', errorMsg: undefined }));
            }
        } catch (error) {
            setFormState(prev => ({ ...prev, status: 'valid' }));
        }
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (formState.status === 'duplicate') {
            alert('Esta NF já consta como lançada no histórico.');
            return;
        }

        if (isEditMode && editingInvoice) {
            setIsSubmitting(true);
            try {
                await invoiceService.updateInvoice(editingInvoice.id, {
                    invoice_number: formState.invoice_number,
                    supplier_name: formState.supplier_name,
                    supplier_cnpj: formState.supplier_cnpj,
                    issue_date: formState.issue_date,
                    delivery_date: formState.delivery_date,
                    amount: formState.amount ? parseFloat(formState.amount) : 0
                });
                onSuccess();
                onClose();
            } catch (error) {
                alert('Erro ao atualizar nota.');
            } finally {
                setIsSubmitting(false);
            }
            return;
        }

        const newItem: InvoiceItem = {
            id: crypto.randomUUID(),
            invoice_number: formState.invoice_number,
            supplier_name: formState.supplier_name,
            supplier_cnpj: formState.supplier_cnpj,
            issue_date: formState.issue_date,
            delivery_date: formState.delivery_date,
            amount: formState.amount,
            status: 'valid',
            file: formState.file
        };

        setItems(prev => [newItem, ...prev]);
        resetForm();
    };

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const uploadFileToSupabase = async (file: File): Promise<{ url: string | null, error: string | null }> => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${user?.fazenda_id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('invoices')
                .upload(filePath, file);

            if (uploadError) return { url: null, error: uploadError.message };

            const { data } = supabase.storage.from('invoices').getPublicUrl(filePath);
            return { url: data.publicUrl, error: null };
        } catch (error: any) {
            return { url: null, error: error.message || 'Erro desconhecido' };
        }
    };

    const handleSubmit = async () => {
        if (!user?.fazenda_id) {
            alert('Usuário deve estar vinculado a uma fazenda.');
            return;
        }

        if (items.length === 0) {
            alert('Adicione pelo menos uma nota à remessa.');
            return;
        }

        setIsSubmitting(true);
        try {
            const newItems = items.filter(item => !item.isExisting);
            
            let insertedInvoices: any[] = [];
            
            if (newItems.length > 0) {
                const payload = await Promise.all(newItems.map(async (item) => {
                    let fileUrl = item.file_url;
                    if (item.file) {
                        const result = await uploadFileToSupabase(item.file);
                        if (result.url) fileUrl = result.url;
                    }

                    return {
                        invoice_number: item.invoice_number,
                        supplier_name: item.supplier_name,
                        supplier_cnpj: item.supplier_cnpj,
                        issue_date: item.issue_date,
                        delivery_date: item.delivery_date,
                        amount: item.amount ? parseFloat(item.amount) : 0,
                        farm_id: user.fazenda_id!,
                        registered_by: user.id,
                        status: 'Pendente' as const,
                        file_url: fileUrl
                    };
                }));

                insertedInvoices = await invoiceService.createPendingInvoices(payload);
            }

            // Rich Email Notification - INCLUDES ALL (NEW + EXISTING)
            if (user?.email && items.length > 0) {
                try {
                    const { graphService } = await import('../../services/graphService');
                    const { systemService } = await import('../../services/systemService');

                    const farmId = user.fazenda_id;
                    const keys = [
                        'email_financeiro_to', 
                        'email_financeiro_cc',
                        `email_financeiro_to_${farmId}`,
                        `email_financeiro_cc_${farmId}`
                    ];

                    const params = await systemService.getParameters(keys);
                    
                    // Prioritize farm-specific config, fallback to global
                    const rawTo = params[`email_financeiro_to_${farmId}`] || params['email_financeiro_to'] || 'fiscal@nadiana.com.br';
                    const rawCc = params[`email_financeiro_cc_${farmId}`] || params['email_financeiro_cc'] || '';

                    const toRecipients = rawTo.split(',').map(e => e.trim()).filter(Boolean);
                    const ccRecipients = rawCc.split(',').map(e => e.trim()).filter(Boolean);

                    const getGreeting = () => {
                        const hour = new Date().getHours();
                        if (hour < 12) return 'Bom dia';
                        if (hour < 18) return 'Boa tarde';
                        return 'Boa noite';
                    };

                    const attachments: GraphAttachment[] = [];
                    const fileToBase64 = (file: File): Promise<string> => {
                        return new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.readAsDataURL(file);
                            reader.onload = () => resolve((reader.result as string).split(',')[1]);
                            reader.onerror = reject;
                        });
                    };

                    for (const item of items) {
                        if (item.file) {
                            const extension = item.file.name.split('.').pop();
                            const base64 = await fileToBase64(item.file);
                            attachments.push({
                                name: `[${item.invoice_number}] - [${item.supplier_name}].${extension}`,
                                contentType: item.file.type,
                                contentBytes: base64
                            });
                        }
                    }

                    const rowsHtml = items.map(inv => `
                        <tr>
                            <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold;">${inv.invoice_number}</td>
                            <td style="padding: 12px; border: 1px solid #e2e8f0; text-transform: uppercase;">${inv.supplier_name}</td>
                            <td style="padding: 12px; border: 1px solid #e2e8f0;">${inv.issue_date.split('-').reverse().join('/')}</td>
                            <td style="padding: 12px; border: 1px solid #e2e8f0;">${inv.delivery_date.split('-').reverse().join('/')}</td>
                            <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">R$ ${parseFloat(inv.amount || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    `).join('');

                    const body = `
                        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.6;">
                            <h2 style="color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 24px; font-size: 18px;">
                                Relatório de NFs Recebidas Pendentes de Lançamento
                            </h2>

                            <p style="font-size: 16px; font-weight: bold;">${getGreeting()}.</p>
                            
                            <p style="font-size: 14px; margin-top: 16px;">
                                Identificamos que os materiais listados abaixo <strong>já foram recebidos na unidade</strong>, porém as respectivas <strong>notas fiscais ainda não constam lançadas no sistema corporativo para aceite</strong>.
                            </p>
                            
                            <p style="font-size: 14px; margin-top: 12px;">
                                Como o aceite só pode ser realizado após o lançamento da nota, solicitamos, por gentileza, que seja feito o <strong>lançamento das notas fiscais</strong> o mais breve possível, para que possamos seguir com o aceite e posteriores baixas de estoque.
                            </p>
                            
                            <p style="font-size: 14px; margin-top: 12px; font-weight: bold;">
                                Segue abaixo a relação das NFs já recebidas:
                            </p>
                            
                            <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; border-radius: 8px; overflow: hidden;">
                                <thead style="background-color: #f8fafc; color: #64748b;">
                                    <tr>
                                        <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">NF</th>
                                        <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">FORNECEDOR</th>
                                        <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">EMISSÃO</th>
                                        <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">RECEBIDO</th>
                                        <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: right;">VALOR DA NOTA</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rowsHtml}
                                </tbody>
                            </table>
                            
                            <p style="font-size: 14px; margin-top: 24px;">
                                Agradecemos o apoio e contamos com a colaboração para manter o processo atualizado e evitar pendências operacionais.
                            </p>
                            
                            <p style="font-size: 14px; margin-top: 12px;">
                                Permanecemos à disposição.
                            </p>
                            
                            <p style="font-size: 14px; margin-top: 24px;">
                                Atenciosamente,
                            </p>
                        </div>`;

                    const subject = `[Relatório NFs] Recebidos mas sem lançamento - ${items.length} ${items.length === 1 ? 'NOTA' : 'NOTAS'}`;
                    await graphService.sendEmail(user.email, toRecipients, subject, body, ccRecipients, attachments);
                } catch (emailErr) {
                    console.error('Email notify failed', emailErr);
                }
            }

            alert('Lote registrado com sucesso!');
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar lote.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-[1280px] h-[90vh] flex flex-col overflow-hidden border border-white/20">
                
                <InvoiceHeader onClose={onClose} isEditMode={isEditMode} />

                <div className="flex-1 flex overflow-hidden">
                    <InvoiceSidePanel 
                        invoiceNumber={formState.invoice_number}
                        setInvoiceNumber={(val) => setFormState(prev => ({ ...prev, invoice_number: val }))}
                        supplierName={formState.supplier_name}
                        setSupplierName={(val) => setFormState(prev => ({ ...prev, supplier_name: val }))}
                        supplierCnpj={formState.supplier_cnpj}
                        issueDate={formState.issue_date}
                        setIssueDate={(val) => setFormState(prev => ({ ...prev, issue_date: val }))}
                        deliveryDate={formState.delivery_date}
                        setDeliveryDate={(val) => setFormState(prev => ({ ...prev, delivery_date: val }))}
                        amount={formState.amount}
                        setAmount={(val) => setFormState(prev => ({ ...prev, amount: val }))}
                        file={formState.file}
                        handleFileUpload={(f) => setFormState(prev => ({ ...prev, file: f }))}
                        handleAddItem={handleAddItem}
                        validateDuplicate={validateDuplicate}
                        status={formState.status}
                        errorMsg={formState.errorMsg}
                        activeSearchRow={showSuggestions}
                        setActiveSearchRow={setShowSuggestions}
                        suggestions={supplierSuggestions}
                        handleSelectSupplier={handleSelectSupplier}
                        currentFarm={user?.fazenda?.nome || 'Fazenda não identificada'}
                        userName={user?.nome || 'Usuário'}
                        isEditMode={isEditMode}
                        isSubmitting={isSubmitting}
                    />

                    <div className="flex-1 bg-slate-50/50 p-8 overflow-y-auto">
                        <div className="max-w-4xl mx-auto space-y-6">
                            {isEditMode ? (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                                            <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
                                            Visualização da Edição
                                        </h3>
                                        <span className="px-4 py-1.5 bg-blue-50 text-blue-700 text-[10px] font-black uppercase rounded-full border border-blue-100">
                                            Modo de Edição Individual
                                        </span>
                                    </div>

                                    <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-[2rem] p-10 shadow-xl shadow-slate-200/50">
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Número da NF</label>
                                                    <p className="text-2xl font-black text-slate-800">{formState.invoice_number || '---'}</p>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fornecedor</label>
                                                    <p className="text-xl font-bold text-blue-600 uppercase">{formState.supplier_name || '---'}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</label>
                                                    <p className="text-2xl font-black text-emerald-600">
                                                        {formState.amount ? `R$ ${parseFloat(formState.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data de Emissão</label>
                                                    <p className="text-lg font-bold text-slate-700">{formState.issue_date || '---'}</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-8 pt-8 border-t border-slate-100 flex items-center gap-4">
                                            <div className="p-4 bg-blue-50 rounded-2xl text-blue-600">
                                                <FileText size={32} />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800 uppercase tracking-tight">Alterações em Tempo Real</p>
                                                <p className="text-xs text-slate-500 font-bold uppercase">Os dados acima refletem o que será salvo no banco de dados.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                                            ITEM NO LOTE ({items.length})
                                        </h3>
                                        {items.length > 0 && (
                                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg uppercase tracking-wider border border-blue-100">
                                                Pronto para processar
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex-1 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-sm">
                                        {items.length === 0 ? (
                                            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-4">
                                                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center shadow-inner border border-slate-100">
                                                    <Receipt size={40} className="text-slate-200" />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Nenhuma nota adicionada</p>
                                                    <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase">Use o formulário lateral para preencher os dados da nota</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="overflow-auto flex-1 custom-scrollbar">
                                                <table className="w-full text-left border-collapse">
                                                    <thead className="sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-slate-100">
                                                        <tr>
                                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">NF</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">FORNECEDOR</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">EMISSÃO</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">RECEBIDO</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">VALOR DA NOTA</th>
                                                            <th className="px-6 py-4 w-24"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {items.map((item) => (
                                                            <tr key={item.id} className={`hover:bg-blue-50/20 transition-all group ${item.isExisting ? 'bg-slate-50/50' : ''}`}>
                                                                <td className="px-6 py-4">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-mono font-bold text-blue-600 text-sm italic">#{item.invoice_number}</span>
                                                                        {item.isExisting && (
                                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Já Registrada</span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-sm font-bold text-slate-700 uppercase">{item.supplier_name}</td>
                                                                <td className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{item.issue_date.split('-').reverse().join('/')}</td>
                                                                <td className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{item.delivery_date.split('-').reverse().join('/')}</td>
                                                                <td className="px-6 py-4 text-sm font-black text-slate-800 text-right">
                                                                    {item.amount ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(item.amount)) : 'R$ 0,00'}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                                        <button
                                                                            onClick={() => {
                                                                                setFormState({
                                                                                    invoice_number: item.invoice_number,
                                                                                    supplier_name: item.supplier_name,
                                                                                    supplier_cnpj: item.supplier_cnpj || '',
                                                                                    issue_date: item.issue_date,
                                                                                    delivery_date: item.delivery_date,
                                                                                    amount: item.amount,
                                                                                    status: 'valid',
                                                                                    errorMsg: undefined,
                                                                                    file: item.file || null
                                                                                });
                                                                                removeItem(item.id);
                                                                            }}
                                                                            className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                                                            title="Editar item"
                                                                        >
                                                                            <Pencil size={16} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => removeItem(item.id)}
                                                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                                            title="Remover nota"
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-4 transition-all hover:bg-blue-100/50">
                                        <div className="p-2 bg-white rounded-xl shadow-sm border border-blue-200">
                                            <AlertCircle size={20} className="text-blue-600 shrink-0" />
                                        </div>
                                        <p className="text-[11px] text-blue-800 font-bold leading-relaxed uppercase tracking-tight">
                                            Confirmação: Ao salvar, um relatório será disparado para o financeiro.
                                            Certifique-se de que os dados de cada nota física conferem com o lançamento efetuado.
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <InvoiceFooter 
                    isSubmitting={isSubmitting}
                    onClose={onClose}
                    handleSubmit={handleSubmit}
                    itemsCount={items.length}
                    isEditMode={isEditMode}
                    handleEditSave={handleAddItem}
                />

            </div>
        </div>
    );
};
