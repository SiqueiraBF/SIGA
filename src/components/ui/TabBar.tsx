import { LucideIcon } from 'lucide-react';

interface Tab<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
  badge?: number | string;
  badgeVariant?: 'default' | 'warning' | 'error';
}

interface TabBarProps<T extends string> {
  tabs: Tab<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  className?: string;
}

const badgeVariants = {
  default: 'bg-blue-100 text-blue-700',
  warning: 'bg-amber-100 text-amber-700',
  error: 'bg-red-100 text-red-700',
};

export function TabBar<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  className = '',
}: TabBarProps<T>) {
  return (
    <div className={`border-b border-slate-200 overflow-x-auto scrollbar-hide ${className}`}>
      <div className="flex gap-8 min-w-max px-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`pb-4 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {Icon && <Icon size={16} />}
              {tab.label}
              {tab.badge !== undefined && tab.badge !== 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    badgeVariants[tab.badgeVariant || 'default']
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
