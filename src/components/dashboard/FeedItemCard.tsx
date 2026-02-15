import React from 'react';
import { Link } from 'react-router-dom';
import { Droplet, FileText, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { formatInSystemTime } from '../../utils/dateUtils';
import { FeedItem } from '../../services/dashboardService';

interface FeedItemCardProps {
    item: FeedItem;
}

export const FeedItemCard = ({ item }: FeedItemCardProps) => {
    const isFuel = item.type === 'nuntec';
    const iconColor = isFuel ? 'text-amber-500 bg-amber-50' : 'text-blue-500 bg-blue-50';
    const Icon = isFuel ? Droplet : FileText;

    const to = item.type === 'nuntec'
        ? `${item.link}?view=integration`
        : (item.link || '#');

    return (
        <Link to={to} className="block group">
            <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 hover:shadow-sm">
                <div className={`p-2.5 rounded-full ${iconColor} shrink-0`}>
                    <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <h4 className="text-sm font-bold text-slate-700 truncate group-hover:text-blue-600 transition-colors">
                            {item.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap font-medium bg-slate-100 px-1.5 py-0.5 rounded-md">
                            {formatInSystemTime(item.timestamp, "HH:mm")}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 truncate">{item.description}</p>
                    {item.priority === 'high' && (
                        <span className="inline-block mt-2 text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                            Urgente
                        </span>
                    )}
                </div>
                <ChevronRight size={16} className="text-slate-300 self-center group-hover:translate-x-1 transition-transform" />
            </div>
        </Link>
    );
};
