import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: React.ReactNode;
  variant?: 'default' | 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange';
  onClick?: () => void;
  className?: string;
}

const variants = {
  default: {
    bg: 'bg-white',
    border: 'border-slate-200',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    textColor: 'text-slate-700',
    subTextColor: 'text-slate-500',
    ring: 'ring-slate-200',
  },
  blue: {
    bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
    border: 'border-blue-200',
    iconBg: 'bg-blue-200',
    iconColor: 'text-blue-600',
    textColor: 'text-blue-700',
    subTextColor: 'text-blue-600',
    ring: 'ring-blue-200',
  },
  green: {
    bg: 'bg-gradient-to-br from-green-50 to-green-100',
    border: 'border-green-200',
    iconBg: 'bg-green-200',
    iconColor: 'text-green-600',
    textColor: 'text-green-700',
    subTextColor: 'text-green-600',
    ring: 'ring-green-200',
  },
  red: {
    bg: 'bg-gradient-to-br from-red-50 to-red-100',
    border: 'border-red-200',
    iconBg: 'bg-red-200',
    iconColor: 'text-red-600',
    textColor: 'text-red-700',
    subTextColor: 'text-red-600',
    ring: 'ring-red-200',
  },
  yellow: {
    bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100',
    border: 'border-yellow-200',
    iconBg: 'bg-yellow-200',
    iconColor: 'text-yellow-600',
    textColor: 'text-yellow-700',
    subTextColor: 'text-yellow-600',
    ring: 'ring-yellow-200',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-50 to-purple-100',
    border: 'border-purple-200',
    iconBg: 'bg-purple-200',
    iconColor: 'text-purple-600',
    textColor: 'text-purple-700',
    subTextColor: 'text-purple-600',
    ring: 'ring-purple-200',
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-50 to-orange-100',
    border: 'border-orange-200',
    iconBg: 'bg-orange-200',
    iconColor: 'text-orange-600',
    textColor: 'text-orange-700',
    subTextColor: 'text-orange-600',
    ring: 'ring-orange-200',
  },
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  variant = 'default',
  onClick,
  className = '',
}: StatsCardProps) {
  const style = variants[variant];
  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      className={`
                relative overflow-hidden rounded-2xl p-6 border-2 transition-all duration-300
                ${style.bg} ${style.border} ${className}
                ${isClickable ? `cursor-pointer hover:scale-[1.02] hover:shadow-md hover:${style.ring} ring-0 hover:ring-2` : ''}
            `}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className={style.iconColor} size={24} />
        <span className={`text-3xl font-bold ${style.textColor}`}>{value}</span>
      </div>
      <p className={`text-sm font-bold uppercase tracking-wider ${style.textColor}`}>{title}</p>
      {description && (
        <div className={`text-xs mt-1 font-medium opacity-80 ${style.subTextColor}`}>{description}</div>
      )}
    </div>
  );
}
