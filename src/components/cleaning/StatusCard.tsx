import { CheckCircle, Clock } from 'lucide-react';

interface StatusCardProps {
  title: string;
  day: string;
  isDone: boolean;
}

export function StatusCard({ title, day, isDone }: StatusCardProps) {
  return (
    <div
      className={`p-4 rounded-xl border backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all ${isDone ? 'bg-teal-50/80 border-teal-200/50' : 'bg-white/60 border-white/40'} flex items-center justify-between`}
    >
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 block">
          {day}
        </span>
        <h3 className={`font-bold text-lg ${isDone ? 'text-teal-700' : 'text-slate-700'}`}>
          {title}
        </h3>
        <p className={`text-sm ${isDone ? 'text-teal-600' : 'text-slate-400'}`}>
          {isDone ? 'Concluído esta semana' : 'Pendente de registro'}
        </p>
      </div>
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-inner ${isDone ? 'bg-teal-500 text-white shadow-teal-500/30' : 'bg-slate-100/80 text-slate-400'}`}
      >
        {isDone ? <CheckCircle size={20} strokeWidth={2.5} /> : <Clock size={20} />}
      </div>
    </div>
  );
}
