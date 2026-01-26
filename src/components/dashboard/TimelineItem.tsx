import React from 'react';
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { formatInSystemTime } from '../../utils/dateUtils';
import { ptBR } from 'date-fns/locale';
import { TimelineEvent } from '../../services/dashboardService';

interface TimelineItemProps {
    event: TimelineEvent;
    isLast: boolean;
    onDelete?: () => void;
}

export const TimelineItem = ({ event, isLast, onDelete }: TimelineItemProps) => (
    <div className="relative pl-8 pb-8 last:pb-0 group">
        {!isLast && <div className="absolute left-[11px] top-3 bottom-0 w-0.5 bg-slate-100"></div>}
        <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center bg-white shadow-sm z-10 ${event.type === 'FISCAL' ? 'border-purple-500' : 'border-blue-500'}`}>
            <div className={`w-2 h-2 rounded-full ${event.type === 'FISCAL' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
        </div>

        <div className="relative group-hover:translate-x-1 transition-transform duration-200">
            <span className="text-xs font-bold text-slate-400 mb-1 block">
                {formatInSystemTime(event.date, "dd 'de' MMMM")}
            </span>
            <div className="flex justify-between items-start">
                <h4 className="text-sm font-bold text-slate-700">{event.title}</h4>
                {onDelete && (
                    <button
                        onClick={(e) => { e.preventDefault(); onDelete(); }}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-1 hover:bg-slate-50 rounded"
                        title="Excluir evento"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{event.description}</p>
        </div>
    </div>
);
