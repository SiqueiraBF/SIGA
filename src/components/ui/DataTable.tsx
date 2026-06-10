import React, { useState, useMemo } from 'react';
import { EmptyState } from './EmptyState';
import { TableSkeleton } from './TableSkeleton';
import { Pagination } from './Pagination';
import { SortableHeader } from './SortableHeader';
import { LucideIcon } from 'lucide-react';

// --- Types ---

type SortDirection = 'asc' | 'desc';

export interface DataTableColumn<T> {
  /** Unique key for this column (used for sorting) */
  key: string;
  /** Header label */
  label: string;
  /** Render function for cell content */
  render: (row: T, index: number) => React.ReactNode;
  /** Enable sorting on this column */
  sortable?: boolean;
  /** Sort value extractor — if sortable, provide this to extract a comparable value */
  sortValue?: (row: T) => string | number | Date;
  /** Header alignment */
  align?: 'left' | 'center' | 'right';
  /** Extra class for the <th> */
  headerClassName?: string;
  /** Extra class for each <td> in this column */
  cellClassName?: string;
}

interface DataTableProps<T> {
  /** Data to render */
  data: T[];
  /** Column definitions */
  columns: DataTableColumn<T>[];
  /** Unique key extractor for each row */
  rowKey: (row: T) => string;
  /** Is data loading? */
  isLoading?: boolean;
  /** Handle row click */
  onRowClick?: (row: T) => void;
  /** Custom empty state */
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  emptyAction?: React.ReactNode;
  /** Pagination */
  pageSize?: number;
  totalItems?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  /** External/server-side sorting — if provided, sorting is controlled externally */
  sortField?: string | null;
  sortDirection?: SortDirection;
  onSortChange?: (field: string, direction: SortDirection) => void;
  /** Skeleton config */
  skeletonRows?: number;
  /** Custom wrapper class */
  className?: string;
  /** Actions column (rendered as last column) */
  renderActions?: (row: T) => React.ReactNode;
  /** Conditional row styling */
  rowClassName?: (row: T) => string;
}

// --- Component ---

export function DataTable<T>({
  data,
  columns,
  rowKey,
  isLoading = false,
  onRowClick,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  emptyAction,
  pageSize,
  totalItems,
  currentPage: externalPage,
  onPageChange: externalOnPageChange,
  sortField: externalSortField,
  sortDirection: externalSortDir,
  onSortChange,
  skeletonRows = 8,
  className = '',
  renderActions,
  rowClassName,
}: DataTableProps<T>) {
  // --- Internal sorting state (used when no external sort is provided) ---
  const [internalSortField, setInternalSortField] = useState<string | null>(null);
  const [internalSortDir, setInternalSortDir] = useState<SortDirection>('asc');

  const isExternalSort = onSortChange !== undefined;
  const activeSortField = isExternalSort ? (externalSortField ?? null) : internalSortField;
  const activeSortDir = isExternalSort ? (externalSortDir ?? 'asc') : internalSortDir;

  const handleSort = (field: string) => {
    if (isExternalSort) {
      const newDir = activeSortField === field && activeSortDir === 'asc' ? 'desc' : 'asc';
      onSortChange!(field, newDir);
    } else {
      if (internalSortField === field) {
        setInternalSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setInternalSortField(field);
        setInternalSortDir('asc');
      }
    }
  };

  // --- Internal pagination state ---
  const [internalPage, setInternalPage] = useState(1);
  const isExternalPagination = externalOnPageChange !== undefined;
  const activeCurrentPage = isExternalPagination ? (externalPage ?? 1) : internalPage;
  const handlePageChange = isExternalPagination ? externalOnPageChange! : setInternalPage;

  // --- Sorted data ---
  const sortedData = useMemo(() => {
    if (isExternalSort || !activeSortField) return data;

    const col = columns.find((c) => c.key === activeSortField);
    if (!col?.sortValue) return data;

    return [...data].sort((a, b) => {
      const aVal = col.sortValue!(a);
      const bVal = col.sortValue!(b);

      if (aVal < bVal) return activeSortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return activeSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, activeSortField, activeSortDir, columns, isExternalSort]);

  // --- Paginated data ---
  const paginatedData = useMemo(() => {
    if (isExternalPagination || !pageSize) return sortedData;

    const start = (activeCurrentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, pageSize, activeCurrentPage, isExternalPagination]);

  const effectiveTotalItems = totalItems ?? data.length;
  const effectivePageSize = pageSize ?? data.length;

  // --- Loading ---
  if (isLoading) {
    return (
      <TableSkeleton
        rows={skeletonRows}
        columns={columns.length}
        showActions={!!renderActions}
      />
    );
  }

  // --- Empty ---
  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={emptyIcon}
        action={emptyAction}
      />
    );
  }

  // --- Render ---
  return (
    <div className={className}>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* Head */}
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {columns.map((col) =>
                  col.sortable ? (
                    <SortableHeader
                      key={col.key}
                      label={col.label}
                      field={col.key}
                      currentField={activeSortField}
                      currentDirection={activeSortDir}
                      onSort={handleSort}
                      align={col.align}
                      className={col.headerClassName}
                    />
                  ) : (
                    <th
                      key={col.key}
                      className={`px-4 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap ${
                        col.align === 'center'
                          ? 'text-center'
                          : col.align === 'right'
                            ? 'text-right'
                            : ''
                      } ${col.headerClassName || ''}`}
                    >
                      {col.label}
                    </th>
                  ),
                )}
                {renderActions && (
                  <th className="px-4 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-right w-[100px]">
                    Ações
                  </th>
                )}
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedData.map((row, index) => (
                <tr
                  key={rowKey(row)}
                  className={`hover:bg-slate-50/50 transition-colors group ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${rowClassName ? rowClassName(row) : ''}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-4 ${
                        col.align === 'center'
                          ? 'text-center'
                          : col.align === 'right'
                            ? 'text-right'
                            : ''
                      } ${col.cellClassName || ''}`}
                    >
                      {col.render(row, index)}
                    </td>
                  ))}
                  {renderActions && (
                    <td className="px-4 py-4 text-right w-[100px]">
                      <div
                        className="flex justify-end items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {renderActions(row)}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {effectivePageSize < effectiveTotalItems && (
        <Pagination
          currentPage={activeCurrentPage}
          totalItems={effectiveTotalItems}
          itemsPerPage={effectivePageSize}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
