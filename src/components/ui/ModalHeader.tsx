import React from 'react';
import { X, LucideIcon } from 'lucide-react';

interface ModalHeaderProps {
  title: string;
  subtitle?: string | React.ReactNode;
  icon?: LucideIcon;
  onClose: () => void;
  className?: string;
  iconClassName?: string;
  actions?: React.ReactNode;
}

export function ModalHeader({
  title,
  subtitle,
  icon: Icon,
  onClose,
  className = '',
  iconClassName = 'text-blue-600',
  actions,
}: ModalHeaderProps) {
  return (
    <div
      className={`px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0 ${className}`}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`p-2 rounded-lg border border-slate-100 shadow-sm ${iconClassName}`}>
            <Icon size={20} />
          </div>
        )}
        <div>
          <h2 className="text-lg font-bold text-slate-800 leading-tight">{title}</h2>
          {subtitle && (
            <div className="text-xs font-semibold text-slate-400 mt-0.5">{subtitle}</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors"
          aria-label="Fermer"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
