import { Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CleaningRegistry } from '../../services/cleaningService';

interface CleaningCardProps {
  registry: CleaningRegistry;
  onClick: (registry: CleaningRegistry) => void;
}

export function CleaningCard({ registry, onClick }: CleaningCardProps) {
  return (
    <div
      onClick={() => onClick(registry)}
      className="bg-white/70 backdrop-blur-md p-6 rounded-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(13,148,136,0.12)] hover:border-teal-200/50 hover:bg-white/90 transition-all cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2 py-0.5 text-xs font-bold rounded-md ${registry.tipo === 'ALMOXARIFADO' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}
            >
              {registry.tipo}
            </span>
            <span className="text-slate-400 text-xs flex items-center gap-1">
              <Calendar size={12} />{' '}
              {format(new Date(registry.data + 'T12:00:00'), "dd 'de' MMMM, yyyy", {
                locale: ptBR,
              })}
            </span>
          </div>
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            {registry.fazenda?.nome}
          </h3>
          <p className="text-slate-500 text-sm flex items-center gap-2 mt-1">
            <User size={14} /> {registry.usuario?.nome}
          </p>
        </div>

        {registry.fotos && registry.fotos.length > 0 && (
          <div className="flex -space-x-3">
            {registry.fotos.slice(0, 3).map((foto, idx) => (
              <div
                key={idx}
                className="w-12 h-12 rounded-lg border-2 border-white bg-slate-100 overflow-hidden relative shadow-sm"
              >
                <img src={foto} alt={`Foto ${idx}`} className="w-full h-full object-cover" />
              </div>
            ))}
            {registry.fotos.length > 3 && (
              <div className="w-12 h-12 rounded-lg border-2 border-white bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shadow-sm">
                +{registry.fotos.length - 3}
              </div>
            )}
          </div>
        )}
      </div>

      {registry.observacoes && (
        <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 border border-slate-100">
          <span className="font-bold text-slate-700">Observação:</span> {registry.observacoes}
        </div>
      )}
    </div>
  );
}
