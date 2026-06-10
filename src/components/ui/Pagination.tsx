interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  showItemCount?: boolean;
  className?: string;
}

export function Pagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  isLoading = false,
  showItemCount = true,
  className = '',
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const displayedItems = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalItems <= itemsPerPage) return null;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-2 mt-6 ${className}`}
    >
      {showItemCount && (
        <div className="text-sm text-slate-500 font-medium order-2 sm:order-1">
          Mostrando{' '}
          <span className="font-bold text-slate-700">{displayedItems}</span> de{' '}
          <span className="font-bold text-slate-700">{totalItems}</span> registro(s)
        </div>
      )}

      <div className="flex items-center gap-2 order-1 sm:order-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1 || isLoading}
          className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
        >
          Anterior
        </button>

        <div className="flex items-center gap-1 px-2">
          <span className="text-sm font-bold text-blue-600">{currentPage}</span>
          <span className="text-sm text-slate-400">/</span>
          <span className="text-sm font-medium text-slate-600">{totalPages}</span>
        </div>

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages || isLoading}
          className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
        >
          Próximo
        </button>
      </div>
    </div>
  );
}
