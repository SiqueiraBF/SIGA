import { Search, Filter, X } from 'lucide-react';
import { ReactNode, useState } from 'react';

interface FilterBarProps {
  onSearch: (term: string) => void;
  searchValue: string;
  searchPlaceholder?: string;
  children?: ReactNode; // Additional standalone filters (buttons/selects) next to search
  advancedFilters?: ReactNode; // Filters that appear in the collapsible panel
  onClear?: () => void;
  hasActiveFilters?: boolean;
}

export function FilterBar({
  onSearch,
  searchValue,
  searchPlaceholder = 'Buscar...',
  children,
  advancedFilters,
  onClear,
  hasActiveFilters,
}: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-4">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              value={searchValue}
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>

          {/* Actions / Toggles */}
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
            {children}

            {advancedFilters && (
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-all font-semibold whitespace-nowrap ${
                  showAdvanced
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Filter size={18} />
                Filtros
                {hasActiveFilters && !showAdvanced && (
                  <span className="w-2 h-2 rounded-full bg-blue-600 ml-1 block animate-pulse" />
                )}
              </button>
            )}

            {hasActiveFilters && onClear && (
              <button
                onClick={onClear}
                className="flex items-center gap-2 px-3 py-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                title="Limpar Filtros"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {advancedFilters && showAdvanced && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {advancedFilters}
          </div>
        </div>
      )}
    </div>
  );
}
