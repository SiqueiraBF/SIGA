import React from 'react';
import { FileText } from 'lucide-react';
import type { AuditItem } from '../services/auditService';

// UI Kit
import { ModalHeader } from './ui/ModalHeader';
import { ModalFooter } from './ui/ModalFooter';

// Detail Sub-components — DT-02: modal broken into focused sub-components
import { AuditStatusBanner } from './audit/details/AuditStatusBanner';
import { AuditInvoicePanel } from './audit/details/AuditInvoicePanel';
import { AuditAnalysisPanel } from './audit/details/AuditAnalysisPanel';
import { AuditCargoPanel } from './audit/details/AuditCargoPanel';
import { AuditResultPanel } from './audit/details/AuditResultPanel';

interface AuditDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: AuditItem | null;
}

export function AuditDetailsModal({ isOpen, onClose, data }: AuditDetailsModalProps) {
    if (!isOpen || !data) return null;

    return (
        <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <ModalHeader
                    title="Detalhes da Auditoria"
                    subtitle={`Nota Fiscal: ${data.invoiceNumber}`}
                    icon={FileText}
                    iconClassName="text-blue-600 bg-blue-50 border-blue-100"
                    onClose={onClose}
                />

                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50">
                    {/* Status Banner */}
                    <AuditStatusBanner status={data.status} conformity={data.conformity} />

                    {/* Data Panels Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <AuditInvoicePanel data={data} />
                        <AuditAnalysisPanel analysis={data.analysis} />
                        <AuditCargoPanel analysis={data.analysis} />
                        {/* DT-03: Transport section removed — data not yet available from API */}
                        <AuditResultPanel data={data} />
                    </div>
                </div>

                <ModalFooter>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-all shadow-lg shadow-slate-200"
                    >
                        Fechar
                    </button>
                </ModalFooter>
            </div>
        </div>
    );
}
