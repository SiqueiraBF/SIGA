import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children?: ReactNode; // For actions/buttons
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  children,
  className = '',
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 ${className}`}
    >
      <div>
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          {Icon && <Icon className="w-8 h-8 text-blue-600" />}
          {title}
        </h1>
        {subtitle && <p className="text-slate-500 mt-1 font-medium">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-3 flex-wrap">{children}</div>}
    </div>
  );
}
