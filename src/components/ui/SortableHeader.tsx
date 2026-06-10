import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

type SortDirection = 'asc' | 'desc';

interface SortableHeaderProps<T extends string> {
  label: string;
  field: T;
  currentField: T | null;
  currentDirection: SortDirection;
  onSort: (field: T) => void;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export function SortableHeader<T extends string>({
  label,
  field,
  currentField,
  currentDirection,
  onSort,
  align = 'left',
  className = '',
}: SortableHeaderProps<T>) {
  const isActive = currentField === field;

  const alignClass = {
    left: '',
    center: 'text-center',
    right: 'text-right',
  }[align];

  const justifyClass = {
    left: '',
    center: 'justify-center',
    right: 'justify-end',
  }[align];

  return (
    <th
      className={`px-4 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap ${alignClass} ${className}`}
      onClick={() => onSort(field)}
    >
      <div className={`flex items-center gap-2 ${justifyClass}`}>
        {label}
        {isActive ? (
          currentDirection === 'asc' ? (
            <ArrowUp size={14} className="text-blue-600" />
          ) : (
            <ArrowDown size={14} className="text-blue-600" />
          )
        ) : (
          <ArrowUpDown size={14} className="text-slate-400 opacity-50" />
        )}
      </div>
    </th>
  );
}
