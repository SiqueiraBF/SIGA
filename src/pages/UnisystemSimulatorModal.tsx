import React, { useState } from 'react';
import { unisystemService } from '../services/unisystemService';
import { PendingInvoice } from '../types/invoiceTypes';
import { X, Check } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    pendingInvoices: PendingInvoice[];
    onSuccess: () => void;
}

export const UnisystemSimulatorModal = ({ isOpen, onClose, pendingInvoices, onSuccess }: Props) => {
    const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSimulate = async () => {
        const invoice = pendingInvoices.find(i => i.id === selectedInvoiceId);
        if (!invoice) return;

        setLoading(true);
        try {
            // Cria o registro na tabela espelho como se o fiscal tivesse lançado hoje
            await unisystemService.addMockInvoice({
                invoice_number: invoice.invoice_number,
                supplier_cnpj: invoice.supplier_cnpj || '00.000.000/0000-00', // Fallback se não tiver
                supplier_name: invoice.supplier_name,
                issue_date: invoice.issue_date,
                entry_date: new Date().toISOString().split('T')[0], // Data de Hoje (Lançamento)
                amount: invoice.amount,
                farm_id: invoice.farm_id
            });

            alert(`NF ${invoice.invoice_number} simulada no Unisystem com sucesso! O dashboard deve atualizar em breve.`);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            alert(`Erro ao simular: ${error.message || JSON.stringify(error)}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fadeIn">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-purple-50">
                    <h3 className="font-bold text-purple-800">Simulador Unisystem (Debug)</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600">
                        Selecione uma NF Pendente para simular que ela foi lançada no ERP (Unisystem) agora.
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">NF Pendente</label>
                        <select
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                            value={selectedInvoiceId}
                            onChange={e => setSelectedInvoiceId(e.target.value)}
                        >
                            <option value="">Selecione...</option>
                            {pendingInvoices.map(inv => (
                                <option key={inv.id} value={inv.id}>
                                    {inv.invoice_number} - {inv.supplier_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="bg-yellow-50 p-3 rounded-md text-xs text-yellow-800 border border-yellow-200">
                        Isso criará um registro na tabela <strong>unisystem_invoices</strong>. A pendência deverá sumir do dashboard automaticamente.
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSimulate}
                        disabled={!selectedInvoiceId || loading}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? 'Processando...' : <><Check size={16} /> Simular Lançamento</>}
                    </button>
                </div>
            </div>
        </div>
    );
};
