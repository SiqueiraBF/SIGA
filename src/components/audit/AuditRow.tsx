import { clsx } from 'clsx';
import { CheckCircle, AlertTriangle, XCircle, CircleHelp } from 'lucide-react';
import type { AuditItem } from '../../services/auditService';

interface AuditRowProps {
    item: AuditItem;
    onClick: () => void;
}

export function AuditRow({ item, onClick }: AuditRowProps) {
    const isHighDiff = Math.abs(item.differencePercent) > 0.6;
    const isNonConforming = item.conformity === 'non_conforming';
    const isProblematic = isHighDiff || isNonConforming;

    return (
        <tr
            onClick={onClick}
            className={clsx(
                "hover:bg-slate-50 transition-colors cursor-pointer",
                isProblematic && "bg-red-50 hover:bg-red-100"
            )}
        >
            <td className="px-4 py-3">
                <StatusIcon status={item.status} conformity={item.conformity} />
            </td>
            <td className="px-4 py-3 font-medium text-slate-700">{item.invoiceNumber}</td>
            <td className="px-4 py-3 text-slate-500">
                {new Date(item.date).toLocaleString('pt-BR')}
            </td>
            <td className="px-4 py-3">
                <div className="flex flex-col">
                    <span className="font-semibold text-slate-700">{item.farm_name || item.unit_id}</span>
                    {item.station_name && (
                        <span className="text-xs text-slate-500">{item.station_name}</span>
                    )}
                </div>
            </td>
            <td className="px-4 py-3 text-right font-medium">{item.volume.toLocaleString('pt-BR')}</td>
            <td className={clsx("px-4 py-3 text-right font-bold", (item.difference < 0 && isHighDiff) ? "text-red-600" : item.difference >= 0 ? "text-green-600" : "text-slate-500")}>
                {item.difference.toLocaleString('pt-BR')}
            </td>
            <td className={clsx("px-4 py-3 text-right", isHighDiff ? "text-red-600 font-bold" : "text-slate-500")}>
                {item.differencePercent.toFixed(2)}%
            </td>
            <td className="px-4 py-3">
                <ConformityBadge status={item.conformity} details={item.analysis} />
            </td>
        </tr>
    );
}

export function StatusIcon({ status, conformity }: { status: string; conformity: string }) {
    if (status === 'MISSING_ENTRY') return <span title="Entrada Pendente"><CircleHelp className="text-blue-500" size={20} /></span>;
    if (status === 'MISSING_ANALYSIS') return <span title="Análise Pendente"><AlertTriangle className="text-yellow-500" size={20} /></span>;
    if (conformity === 'non_conforming') return <span title="Não Conforme"><XCircle className="text-red-500" size={20} /></span>;
    return <span title="Conforme"><CheckCircle className="text-green-500" size={20} /></span>;
}

// DT-01: Replaced `any` with the precise AuditItem['analysis'] type
export function ConformityBadge({ status, details }: { status: string; details: AuditItem['analysis'] }) {
    if (!details || status === 'unknown') return <span className="text-xs text-slate-400">Dados Indisponíveis</span>;

    if (status === 'non_conforming') {
        return (
            <div className="flex flex-col text-xs text-red-600">
                <span className="font-bold">NÃO CONFORME</span>
                <span>Dens: {details.density.toFixed(4)}</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col text-xs text-slate-500">
            <span className="text-green-600 font-medium">CONFORME</span>
            <span className="scale-90 origin-left">Dens: {details.density.toFixed(4)} | Temp: {details.temperature.toFixed(1)}°C</span>
        </div>
    );
}
