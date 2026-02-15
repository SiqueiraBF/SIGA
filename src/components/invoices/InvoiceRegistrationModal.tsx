import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { invoiceService } from '../../services/invoiceService';
import { unisystemService } from '../../services/unisystemService';
import { PendingInvoice, UnisystemSupplier } from '../../types/invoiceTypes';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Save, AlertTriangle, CheckCircle, Search, DollarSign, FileText, Upload, X } from 'lucide-react';

interface InvoiceItem {
    id: string; // Temp ID for UI key
    invoice_number: string;
    supplier_name: string;
    supplier_cnpj?: string;
    issue_date: string;
    delivery_date: string;
    amount: string; // string for input handling
    status: 'valid' | 'invalid' | 'checking' | 'duplicate';
    errorMsg?: string;
    file_url?: string; // Mock url for now
    file?: File | null;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const InvoiceRegistrationModal = ({ isOpen, onClose, onSuccess }: Props) => {
    const { user } = useAuth();
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [supplierSuggestions, setSupplierSuggestions] = useState<{ [key: string]: UnisystemSupplier[] }>({});
    const [activeSearchRow, setActiveSearchRow] = useState<string | null>(null);

    // Inicializa com uma linha vazia ao abrir
    useEffect(() => {
        if (isOpen && items.length === 0) {
            addNewRow();
        }
    }, [isOpen]);

    const addNewRow = () => {
        const newItem: InvoiceItem = {
            id: crypto.randomUUID(),
            invoice_number: '',
            supplier_name: '',
            issue_date: '',
            delivery_date: new Date().toISOString().split('T')[0], // Hoje
            amount: '',
            status: 'valid',
            file: null
        };
        setItems(prev => [...prev, newItem]);
    };

    const removeRow = (id: string) => {
        if (items.length > 1) {
            setItems(prev => prev.filter(item => item.id !== id));
        }
    };

    const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };

                // Reset status on change
                if (field === 'invoice_number' || field === 'supplier_name') {
                    updated.status = 'valid';
                    updated.errorMsg = undefined;
                }

                return updated;
            }
            return item;
        }));
    };

    // Busca de Fornecedores (Debounced)
    useEffect(() => {
        if (!activeSearchRow) return;

        const item = items.find(i => i.id === activeSearchRow);
        if (!item || item.supplier_name.length < 3) {
            setSupplierSuggestions(prev => ({ ...prev, [activeSearchRow]: [] }));
            return;
        }

        const timer = setTimeout(async () => {
            const results = await unisystemService.searchSuppliers(item.supplier_name);
            setSupplierSuggestions(prev => ({ ...prev, [activeSearchRow]: results }));
        }, 500);

        return () => clearTimeout(timer);
    }, [items.find(i => i.id === activeSearchRow)?.supplier_name, activeSearchRow]);


    const handleSelectSupplier = (rowId: string, supplier: UnisystemSupplier) => {
        setItems(prev => prev.map(item => {
            if (item.id === rowId) {
                return {
                    ...item,
                    supplier_name: supplier.name,
                    supplier_cnpj: supplier.cnpj
                };
            }
            return item;
        }));
        setActiveSearchRow(null); // Fecha sugestões
        validateRow(rowId); // Já valida duplicidade
    };

    // Validação de Duplicidade
    const validateRow = async (rowId: string) => {
        const item = items.find(i => i.id === rowId);
        if (!item || !item.invoice_number || !item.supplier_cnpj) return;

        setItems(prev => prev.map(i => i.id === rowId ? { ...i, status: 'checking' } : i));

        const duplicate = await unisystemService.checkInvoiceExists(item.supplier_cnpj, item.invoice_number);

        setItems(prev => prev.map(i => {
            if (i.id === rowId) {
                if (duplicate) {
                    return {
                        ...i,
                        status: 'duplicate',
                        errorMsg: `Nota já lançada em ${new Date(duplicate.entry_date).toLocaleDateString()}`
                    };
                }
                return { ...i, status: 'valid', errorMsg: undefined };
            }
            return i;
        }));
    };

    const handleFileUpload = async (rowId: string, file: File) => {
        // Upload Imediato para UX (mostra loading ou sucesso)
        // Mas vamos apenas guardar o file no state e fazer upload no submit para não deixar lixo no bucket se cancelar?
        // Melhor fazer no submit para garantir.
        updateItem(rowId, 'file', file);
    }

    const uploadFileToSupabase = async (file: File): Promise<{ url: string | null, error: string | null }> => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${user?.fazenda_id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('invoices')
                .upload(filePath, file);

            if (uploadError) {
                console.error('Erro upload:', uploadError);
                return { url: null, error: uploadError.message };
            }

            const { data } = supabase.storage
                .from('invoices')
                .getPublicUrl(filePath);

            return { url: data.publicUrl, error: null };
        } catch (error: any) {
            console.error('Erro storage:', error);
            return { url: null, error: error.message || 'Erro desconhecido' };
        }
    };

    const handleSubmit = async () => {
        if (!user?.fazenda_id) {
            alert('Usuário deve estar vinculado a uma fazenda.');
            return;
        }

        // Validação final de campos obrigatórios
        const invalidItems = items.filter(i => !i.invoice_number || !i.supplier_name || !i.issue_date || !i.delivery_date);
        if (invalidItems.length > 0) {
            alert('Preencha os campos obrigatórios (Número, Fornecedor, Datas) de todas as linhas.');
            return;
        }

        if (items.some(i => i.status === 'duplicate')) {
            alert('Remova ou corrija as notas marcadas como duplicadas antes de salvar.');
            return;
        }

        setIsSubmitting(true);
        try {
            // Processa uploads e cria payload
            const payload = await Promise.all(items.map(async (item) => {
                let fileUrl = item.file_url;

                if (item.file) {
                    const result = await uploadFileToSupabase(item.file);
                    if (result.url) {
                        fileUrl = result.url;
                    } else {
                        alert(`Erro ao fazer upload da nota ${item.invoice_number}: ${result.error}`);
                        // Não impede de salvar, mas avisa. 
                        // Se quiser impedir: throw new Error(result.error || 'Falha no upload');
                    }
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

            await invoiceService.createPendingInvoices(payload);

            // Notificação via Graph API (E-mail Avançado)
            if (user?.email) {
                try {
                    const { graphService } = await import('../../services/graphService');
                    const { systemService } = await import('../../services/systemService');

                    // 1. Buscar Destinatários do Banco
                    const params = await systemService.getParameters(['email_financeiro_to', 'email_financeiro_cc']);
                    const toRecipients = params['email_financeiro_to'] ? params['email_financeiro_to'].split(',') : ['fiscal@nadiana.com.br']; // Fallback
                    const ccRecipients = params['email_financeiro_cc'] ? params['email_financeiro_cc'].split(',') : [];

                    // 2. Preparar Anexos (Base64)
                    const attachments: any[] = [];

                    // Helper para converter File em Base64
                    const fileToBase64 = (file: File): Promise<string> => {
                        return new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.readAsDataURL(file);
                            reader.onload = () => {
                                const result = reader.result as string;
                                // Remove o prefixo "data:image/jpeg;base64,"
                                const base64 = result.split(',')[1];
                                resolve(base64);
                            };
                            reader.onerror = error => reject(error);
                        });
                    };

                    // Processa anexos dos itens
                    for (const item of items) {
                        if (item.file) {
                            try {
                                const base64 = await fileToBase64(item.file);
                                attachments.push({
                                    name: `NF_${item.invoice_number}_${item.file.name}`,
                                    contentType: item.file.type,
                                    contentBytes: base64
                                });
                            } catch (err) {
                                console.error('Erro ao processar anexo:', item.file.name, err);
                            }
                        }
                    }

                    const subject = `Nova Remessa de NFs: ${payload.length} nota(s) registrada(s)`;

                    // 3. Template HTML Rico
                    const rowsHtml = payload.map(inv => `
                        <tr>
                            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #1f2937;"><strong>${inv.invoice_number}</strong></td>
                            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">${inv.supplier_name}</td>
                            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-family: monospace;">R$ ${inv.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">${new Date(inv.issue_date).toLocaleDateString('pt-BR')}</td>
                             <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                                <a href="https://nadiana-app.vercel.app/conciliacao" style="background-color: #22c55e; color: white; padding: 6px 12px; text-decoration: none; border-radius: 4px; font-size: 12px; font-weight: bold;">ABRIR</a>
                            </td>
                        </tr>
                    `).join('');

                    const body = `
                        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; padding: 20px;">
                            <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                                
                                <div style="background-color: #1e3a8a; padding: 20px; text-align: center;">
                                    <h2 style="color: white; margin: 0;">Nova Remessa Recebida</h2>
                                    <p style="color: #bfdbfe; margin: 5px 0 0 0;">Ação Necessária do Financeiro</p>
                                </div>

                                <div style="padding: 24px;">
                                    <p style="color: #374151; font-size: 16px;">Olá Equipe,</p>
                                    <p style="color: #374151; line-height: 1.5;">
                                        O usuário <strong>${user.nome}</strong> acabou de registrar <strong>${payload.length}</strong> novas notas fiscais no sistema.
                                        Os arquivos digitais estão anexados a este e-mail para conferência rápida.
                                    </p>

                                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px;">
                                        <thead>
                                            <tr style="background-color: #f8fafc; text-align: left;">
                                                <th style="padding: 12px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 12px; text-transform: uppercase;">Número</th>
                                                <th style="padding: 12px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 12px; text-transform: uppercase;">Fornecedor</th>
                                                <th style="padding: 12px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 12px; text-transform: uppercase;">Valor</th>
                                                <th style="padding: 12px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 12px; text-transform: uppercase;">Emissão</th>
                                                <th style="padding: 12px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 12px; text-transform: uppercase;">Ação</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${rowsHtml}
                                        </tbody>
                                    </table>

                                    <div style="margin-top: 30px; text-align: center;">
                                        <a href="https://nadiana-app.vercel.app/conciliacao" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                                            ACESSAR SISTEMA PARA CONCILIAR
                                        </a>
                                        <p style="font-size: 12px; color: #9ca3af; margin-top: 10px;">Clique acima para dar baixa ou classificar as notas.</p>
                                    </div>
                                </div>

                                <div style="background-color: #f9fafb; padding: 15px; text-align: center; border-top: 1px solid #e5e7eb;">
                                    <p style="font-size: 12px; color: #6b7280; margin: 0;">
                                        Enviado automaticamente pelo <strong>Sistema Gravity</strong><br/>
                                        Data: ${new Date().toLocaleString('pt-BR')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    `;

                    const result = await graphService.sendEmail(user.email, toRecipients, subject, body, ccRecipients, attachments);

                    if (result.success) {
                        alert(`Lote registrado com sucesso! \n📧 E-mail enviado com ${attachments.length} anexo(s).`);
                    } else {
                        console.error('Erro no envio de e-mail (Graph):', result.error);
                        alert(`Lote registrado com sucesso!\n⚠️ AVISO: O e-mail NÃO foi enviado.\nErro: ${result.error}\n\nNota: O envio direto pelo navegador pode ser bloqueado por segurança (CORS).`);
                    }

                } catch (emailErr) {
                    console.error('Falha no envio:', emailErr);
                    alert(`Lote registrado com sucesso! \n⚠️ Erro no envio de e-mail: ${emailErr}`);
                }
            } else {
                alert('Lote registrado com sucesso! \n(Sem notificação: usuário sem e-mail cadastrado)');
            }

            setItems([]);
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar lote. Tente novamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-fadeIn">

                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            Nova Remessa de NFs
                        </h2>
                        <p className="text-sm text-gray-500">Registre as notas fiscais recebidas na fazenda.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body (Scrollable) */}
                <div className="flex-1 overflow-auto p-4 bg-gray-50/50">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-3 p-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                            <div className="col-span-2">Número NF</div>
                            <div className="col-span-3">Fornecedor</div>
                            <div className="col-span-2">Datas (Emissão / Chegada)</div>
                            <div className="col-span-2">Valor / Arquivo</div>
                            <div className="col-span-1 text-center">Remover</div>
                        </div>

                        {/* Rows */}
                        <div className="divide-y divide-gray-100">
                            {items.map((item, index) => (
                                <div key={item.id} className={`grid grid-cols-12 gap-3 p-3 items-start group transition-colors ${item.status === 'duplicate' ? 'bg-red-50' : 'hover:bg-gray-50'}`}>

                                    {/* Número */}
                                    <div className="col-span-2 relative mt-1">
                                        <input
                                            type="text"
                                            placeholder="000.000"
                                            className={`w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-all ${item.status === 'duplicate' ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200'}`}
                                            value={item.invoice_number}
                                            onChange={(e) => updateItem(item.id, 'invoice_number', e.target.value)}
                                            onBlur={() => validateRow(item.id)}
                                        />
                                        {item.status === 'duplicate' && (
                                            <span className="absolute -bottom-5 left-0 text-[10px] text-red-600 font-medium flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" /> {item.errorMsg}
                                            </span>
                                        )}
                                        {item.status === 'checking' && (
                                            <span className="absolute -bottom-5 left-0 text-[10px] text-blue-600 font-medium animate-pulse">
                                                Verificando...
                                            </span>
                                        )}
                                    </div>

                                    {/* Fornecedor */}
                                    <div className="col-span-3 relative mt-1">
                                        <div className="relative">
                                            <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Busca..."
                                                className="w-full pl-8 p-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={item.supplier_name}
                                                onChange={(e) => {
                                                    updateItem(item.id, 'supplier_name', e.target.value);
                                                    setActiveSearchRow(item.id);
                                                }}
                                                onFocus={() => setActiveSearchRow(item.id)}
                                            />
                                        </div>
                                        {/* Sugestões */}
                                        {activeSearchRow === item.id && supplierSuggestions[item.id]?.length > 0 && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                                {supplierSuggestions[item.id].map(s => (
                                                    <div
                                                        key={s.id}
                                                        className="p-2 text-sm hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0"
                                                        onClick={() => handleSelectSupplier(item.id, s)}
                                                    >
                                                        <div className="font-medium text-gray-800">{s.name}</div>
                                                        <div className="text-xs text-gray-500">CNPJ: {s.cnpj}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {item.supplier_cnpj && (
                                            <div className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" /> {item.supplier_cnpj}
                                            </div>
                                        )}
                                    </div>

                                    {/* Datas (Compacto) */}
                                    <div className="col-span-2 flex flex-col gap-2">
                                        <input
                                            type="date"
                                            className="w-full p-1.5 text-xs border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 outline-none text-gray-600"
                                            value={item.issue_date}
                                            onChange={(e) => updateItem(item.id, 'issue_date', e.target.value)}
                                            title="Data de Emissão"
                                        />
                                        <input
                                            type="date"
                                            className="w-full p-1.5 text-xs border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 outline-none text-gray-600"
                                            value={item.delivery_date}
                                            onChange={(e) => updateItem(item.id, 'delivery_date', e.target.value)}
                                            title="Data de Chegada"
                                        />
                                    </div>

                                    {/* Valor e Arquivo */}
                                    <div className="col-span-2 flex flex-col gap-2">
                                        <div className="relative">
                                            <DollarSign className="absolute left-1.5 top-1.5 w-3 h-3 text-gray-400" />
                                            <input
                                                type="number"
                                                placeholder="0,00"
                                                className="w-full pl-6 p-1.5 text-xs border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                                                value={item.amount}
                                                onChange={(e) => updateItem(item.id, 'amount', e.target.value)}
                                            />
                                        </div>

                                        {/* Upload Button */}
                                        <div className="relative">
                                            <input
                                                type="file"
                                                id={`file-${item.id}`}
                                                className="hidden"
                                                onChange={(e) => e.target.files?.[0] && handleFileUpload(item.id, e.target.files[0])}
                                            />
                                            <label
                                                htmlFor={`file-${item.id}`}
                                                className={`flex items-center justify-center gap-1 w-full p-1.5 text-xs border border-dashed rounded-md cursor-pointer transition-colors ${item.file ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-300 text-gray-500 hover:bg-gray-100'}`}
                                            >
                                                {item.file ? (
                                                    <><CheckCircle size={10} /> {item.file.name.substring(0, 10)}...</>
                                                ) : (
                                                    <><Upload size={10} /> Anexar Foto/PDF</>
                                                )}
                                            </label>
                                        </div>
                                    </div>

                                    {/* Remover */}
                                    <div className="col-span-1 flex justify-center pt-3">
                                        <button
                                            onClick={() => removeRow(item.id)}
                                            className="text-gray-400 hover:text-red-500 p-1 rounded-md transition-colors"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>

                                </div>
                            ))}
                        </div>

                        {/* Footer Tabela */}
                        <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-center">
                            <button
                                onClick={addNewRow}
                                className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1 px-4 py-2 hover:bg-blue-50 rounded-md transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                Adicionar Linha
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer Modal */}
                <div className="p-4 border-t border-gray-100 bg-white rounded-b-xl flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Salvando...' : (
                            <>
                                <Save className="w-4 h-4" />
                                Salvar Lote ({items.length})
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};
