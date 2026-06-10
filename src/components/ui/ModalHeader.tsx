import React from 'react';
import { X, LucideIcon } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { IconButton } from './IconButton';

interface ModalHeaderProps {
  title: string;
  subtitle?: string | React.ReactNode;
  icon?: LucideIcon;
  onClose: () => void;
  className?: string;
  iconClassName?: string;
  actions?: React.ReactNode;
  eliteStyle?: boolean;
  statusBadge?: React.ReactNode;
}

export function ModalHeader({
  title,
  subtitle,
  icon: Icon,
  onClose,
  className = '',
  iconClassName = '',
  actions,
  eliteStyle,
  statusBadge,
}: ModalHeaderProps) {
  return (
    <div
      className={twMerge("px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0", className)}
    >
      <div className="flex items-center gap-4">
        {Icon && (
          <div className={twMerge(
            "flex items-center justify-center transition-colors shrink-0", 
            eliteStyle ? "bg-slate-100 text-slate-600 p-3.5 rounded-2xl" : "border border-slate-100 shadow-sm p-2 rounded-lg text-blue-600", 
            iconClassName
          )}>
            <Icon size={eliteStyle ? 32 : 20} strokeWidth={eliteStyle ? 1.5 : 2} />
          </div>
        )}
        <div>
          <h2 className={twMerge("text-slate-800", eliteStyle ? "text-2xl font-extrabold tracking-tight" : "text-lg font-bold leading-tight")}>{title}</h2>
          {statusBadge && <div className={twMerge("flex items-center gap-2", eliteStyle ? "mt-0.5" : "mt-2")}>{statusBadge}</div>}
          {subtitle && (
            <div className="text-xs font-semibold text-slate-400 mt-0.5">{subtitle}</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <IconButton
          icon={X}
          variant="default"
          label="Fechar"
          onClick={onClose}
          className="hover:text-red-500 hover:bg-red-50 border-none shadow-none"
        />
      </div>
    </div>
  );
}
