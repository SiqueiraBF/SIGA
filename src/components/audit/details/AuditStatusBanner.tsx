import { clsx } from 'clsx';
import { CheckCircle, AlertTriangle, XCircle, FileText } from 'lucide-react';
import type { AuditItem } from '../../../services/auditService';

interface AuditStatusBannerProps {
    status: AuditItem['status'];
    conformity: AuditItem['conformity'];
}

/** Renders the colored top-level status banner inside the Audit Details Modal. */
export function AuditStatusBanner({ status, conformity }: AuditStatusBannerProps) {
    const isNonConforming = conformity === 'non_conforming';

    const config = (() => {
        if (isNonConforming) return {
            bg: 'bg-red-50 border-red-200 text-red-800',
            iconBg: 'bg-red-100',
            icon: <XCircle size={24} />,
            title: 'Não Conforme',
            subtitle: 'Divergência de volume ou qualidade fora dos padrões.'
        };
        if (status === 'MISSING_ANALYSIS') return {
            bg: 'bg-amber-50 border-amber-200 text-amber-800',
            iconBg: 'bg-amber-100',
            icon: <AlertTriangle size={24} />,
            title: 'Análise Pendente',
            subtitle: 'Aguardando lançamento da análise técnica.'
        };
        if (status === 'MISSING_ENTRY') return {
            bg: 'bg-blue-50 border-blue-200 text-blue-800',
            iconBg: 'bg-blue-100',
            icon: <FileText size={24} />,
            title: 'Entrada Pendente',
            subtitle: 'Análise recebida sem nota fiscal de entrada vinculada.'
        };
        return {
            bg: 'bg-green-50 border-green-200 text-green-800',
            iconBg: 'bg-green-100',
            icon: <CheckCircle size={24} />,
            title: 'Conforme',
            subtitle: 'Recebimento dentro dos padrões esperados.'
        };
    })();

    return (
        <div className={clsx('p-4 rounded-xl border flex items-center gap-4', config.bg)}>
            <div className={clsx('p-3 rounded-full', config.iconBg)}>
                {config.icon}
            </div>
            <div>
                <h3 className="font-bold text-lg">{config.title}</h3>
                <p className="text-sm opacity-90">{config.subtitle}</p>
            </div>
        </div>
    );
}
