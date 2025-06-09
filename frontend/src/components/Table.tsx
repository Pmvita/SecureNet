import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { cn } from '../lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  accessor: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  selectedRows?: string[];
  onSelectRow?: (id: string) => void;
  onSelectAll?: (selected: boolean) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function Table<T extends { id: string }>({
  columns,
  data,
  sortColumn,
  sortDirection,
  onSort,
  selectedRows = [],
  onSelectRow,
  onSelectAll,
  isLoading,
  emptyMessage = 'No data available',
  className,
}: TableProps<T>) {
  const allSelected = data.length > 0 && selectedRows.length === data.length;
  const someSelected = selectedRows.length > 0 && selectedRows.length < data.length;

  return (
    <div className={cn('relative overflow-x-auto rounded-lg border border-gray-700', className)}>
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-800 text-xs uppercase">
          <tr>
            {onSelectRow && (
              <th scope="col" className="w-4 p-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-primary-500 focus:ring-primary-500"
                    checked={allSelected}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = someSelected;
                      }
                    }}
                    onChange={(e) => onSelectAll?.(e.target.checked)}
                  />
                </div>
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'px-4 py-3',
                  column.sortable && 'cursor-pointer select-none hover:bg-gray-700',
                  column.className
                )}
                onClick={() => column.sortable && onSort?.(column.key)}
              >
                <div className="flex items-center gap-2">
                  {column.header}
                  {column.sortable && sortColumn === column.key && (
                    <span className="inline-flex">
                      {sortDirection === 'asc' ? (
                        <ChevronUpIcon className="h-4 w-4" />
                      ) : (
                        <ChevronDownIcon className="h-4 w-4" />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td
                colSpan={onSelectRow ? columns.length + 1 : columns.length}
                className="px-4 py-8 text-center text-gray-400"
              >
                <div className="flex items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                  <span className="ml-2">Loading...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={onSelectRow ? columns.length + 1 : columns.length}
                className="px-4 py-8 text-center text-gray-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr
                key={item.id}
                className="border-t border-gray-700 hover:bg-gray-800/50"
              >
                {onSelectRow && (
                  <td className="w-4 p-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-primary-500 focus:ring-primary-500"
                        checked={selectedRows.includes(item.id)}
                        onChange={() => onSelectRow(item.id)}
                      />
                    </div>
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.key} className={cn('px-4 py-3', column.className)}>
                    {column.accessor(item)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const showEllipsis = totalPages > 7;
  const visiblePages = showEllipsis
    ? [
        ...pages.slice(0, 2),
        '...',
        ...pages.slice(Math.max(0, currentPage - 1), currentPage + 2),
        '...',
        ...pages.slice(-2),
      ]
    : pages;

  return (
    <div className={cn('flex items-center justify-between px-4 py-3', className)}>
      <div className="flex items-center gap-2">
        <button
          className="rounded-md px-3 py-1 text-sm hover:bg-gray-700 disabled:opacity-50"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <div className="flex items-center gap-1">
          {visiblePages.map((page, index) => (
            <button
              key={index}
              className={cn(
                'rounded-md px-3 py-1 text-sm',
                page === currentPage
                  ? 'bg-primary-500 text-white'
                  : page === '...'
                  ? 'cursor-default'
                  : 'hover:bg-gray-700'
              )}
              onClick={() => typeof page === 'number' && onPageChange(page)}
              disabled={page === '...'}
            >
              {page}
            </button>
          ))}
        </div>
        <button
          className="rounded-md px-3 py-1 text-sm hover:bg-gray-700 disabled:opacity-50"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
      <div className="text-sm text-gray-400">
        Page {currentPage} of {totalPages}
      </div>
    </div>
  );
} 