import { LucideIcon } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple' | 'orange';
  icon?: LucideIcon;
  size?: 'sm' | 'md';
  className?: string;
}

const variants = {
  default: 'bg-slate-100 text-slate-700 border-transparent',
  success: 'bg-green-100 text-green-800 border-transparent',
  warning: 'bg-amber-100 text-amber-800 border-transparent',
  error: 'bg-red-100 text-red-800 border-transparent',
  info: 'bg-blue-100 text-blue-800 border-transparent',
  purple: 'bg-purple-100 text-purple-800 border-transparent',
  orange: 'bg-orange-100 text-orange-800 border-transparent',
};

const dotColors = {
  default: 'bg-slate-400',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
};

const sizes = {
  sm: 'px-2 py-0.5 text-[10.5px]',
  md: 'px-3 py-1.5 text-xs',
};

export function StatusBadge({
  status,
  variant = 'default',
  icon: Icon,
  size = 'md',
  className = '',
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold border ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {!Icon && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {Icon && <Icon size={size === 'sm' ? 10 : 12} />}
      <span className="capitalize tracking-tight">{status.toLowerCase()}</span>
    </span>
  );
}
