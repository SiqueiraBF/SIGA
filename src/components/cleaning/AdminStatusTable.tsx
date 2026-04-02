import { format, differenceInDays } from 'date-fns';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface AdminStatusTableProps {
  statusData: {
    id: string;
    nome: string;
    almoxarifadoDate: string | null;
    postoDate: string | null;
  }[];
}

export function AdminStatusTable({ statusData }: AdminStatusTableProps) {
  const renderStatusCell = (dateString: string | null) => {
    if (!dateString) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
          <Clock size={12} className="mr-1" /> Pendente
        </span>
      );
    }

    const dateObj = new Date(dateString + 'T12:00:00');
    const daysDiff = differenceInDays(new Date(), dateObj);

    if (daysDiff > 7) {
      return (
        <div className="flex flex-col items-center">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 mb-1">
            <AlertTriangle size={12} className="mr-1" /> Atrasado ({daysDiff} dias)
          </span>
          <span className="text-xs text-red-500 font-bold">{format(dateObj, 'dd/MM/yyyy')}</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100/80 text-teal-800 mb-1 shadow-sm border border-teal-200/50">
          <CheckCircle size={12} className="mr-1" /> Realizado
        </span>
        <span className="text-xs text-slate-400">{format(dateObj, 'dd/MM/yyyy')}</span>
      </div>
    );
  };

  return (
    <div className="bg-white/70 backdrop-blur-md rounded-xl border border-white/60 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="p-4 border-b border-white/50 bg-slate-50/50">
        <h3 className="font-bold text-slate-700">Status por Fazenda</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50/40 border-b border-slate-100/50">
            <tr>
              <th className="px-6 py-3 font-medium">Fazenda</th>
              <th className="px-6 py-3 font-medium text-center">Almoxarifado</th>
              <th className="px-6 py-3 font-medium text-center">Posto</th>
            </tr>
          </thead>
          <tbody>
            {statusData.map((farm) => (
              <tr
                key={farm.id}
                className="border-b border-slate-100/50 hover:bg-white/60 transition-colors"
              >
                <td className="px-6 py-4 font-bold text-slate-800">{farm.nome}</td>
                <td className="px-6 py-4 text-center">{renderStatusCell(farm.almoxarifadoDate)}</td>
                <td className="px-6 py-4 text-center">{renderStatusCell(farm.postoDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
