import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  PaginationState,
} from '@tanstack/react-table';
import { ChevronDownIcon, ChevronUpIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

interface BaseTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enablePagination?: boolean;
  pageSize?: number;
  selectedRows?: string[];
  onSelectRow?: (id: string) => void;
  onSelectAll?: (selected: boolean) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
}

export function BaseTable<T extends { id: string }>({
  data,
  columns,
  enableSorting = true,
  enableFiltering = true,
  enablePagination = true,
  pageSize = 50,
  selectedRows = [],
  onSelectRow,
  onSelectAll,
  isLoading = false,
  emptyMessage = 'No data available',
  className,
  globalFilter = '',
  onGlobalFilterChange,
}: BaseTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilterState, setGlobalFilterState] = React.useState<string>(globalFilter);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  // Handle global filter changes
  React.useEffect(() => {
    setGlobalFilterState(globalFilter);
  }, [globalFilter]);

  // Create selection column if row selection is enabled
  const selectionColumn: ColumnDef<T> = React.useMemo(
    () => ({
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-primary-500 focus:ring-primary-500"
          checked={table.getIsAllRowsSelected()}
          indeterminate={table.getIsSomeRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-primary-500 focus:ring-primary-500"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
      enableSorting: false,
      size: 40,
    }),
    []
  );

  const tableColumns = React.useMemo(
    () => (onSelectRow ? [selectionColumn, ...columns] : columns),
    [columns, onSelectRow, selectionColumn]
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    state: {
      sorting,
      globalFilter: globalFilterState,
      pagination: enablePagination ? pagination : undefined,
      rowSelection: selectedRows.reduce((acc, id) => ({ ...acc, [id]: true }), {}),
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: (value) => {
      setGlobalFilterState(value);
      onGlobalFilterChange?.(value);
    },
    onPaginationChange: enablePagination ? setPagination : undefined,
    enableRowSelection: !!onSelectRow,
    getRowId: (row) => row.id,
  });

  const allSelected = data.length > 0 && selectedRows.length === data.length;
  const someSelected = selectedRows.length > 0 && selectedRows.length < data.length;

  // Handle selection changes
  React.useEffect(() => {
    if (onSelectAll && table.getIsAllRowsSelected() !== allSelected) {
      onSelectAll(table.getIsAllRowsSelected());
    }
  }, [table.getIsAllRowsSelected(), allSelected, onSelectAll]);

  return (
    <div className={cn('relative overflow-hidden rounded-lg border border-gray-700', className)}>
      {/* Global Filter */}
      {enableFiltering && onGlobalFilterChange && (
        <div className="border-b border-gray-700 p-4">
          <input
            type="text"
            placeholder="Search all columns..."
            value={globalFilterState ?? ''}
            onChange={(e) => table.setGlobalFilter(e.target.value)}
            className="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-800 text-xs uppercase">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    scope="col"
                    className={cn(
                      'px-4 py-3',
                      header.column.getCanSort() && 'cursor-pointer select-none hover:bg-gray-700'
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="inline-flex">
                          {header.column.getIsSorted() === 'asc' ? (
                            <ChevronUpIcon className="h-4 w-4" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <div className="h-4 w-4" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={table.getAllColumns().length}
                  className="px-4 py-8 text-center text-gray-400"
                >
                  <div className="flex items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                    <span className="ml-2">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={table.getAllColumns().length}
                  className="px-4 py-8 text-center text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-t border-gray-700 hover:bg-gray-800/50',
                    row.getIsSelected() && 'bg-primary-500/10'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {enablePagination && (
        <div className="flex items-center justify-between border-t border-gray-700 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>
              Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}{' '}
              of {table.getFilteredRowModel().rows.length} results
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="inline-flex items-center gap-1 rounded-md px-3 py-1 text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Previous
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(table.getPageCount(), 5) }, (_, i) => {
                const pageIndex = table.getState().pagination.pageIndex;
                const totalPages = table.getPageCount();
                let pageNumber;
                
                if (totalPages <= 5) {
                  pageNumber = i;
                } else if (pageIndex <= 2) {
                  pageNumber = i;
                } else if (pageIndex >= totalPages - 3) {
                  pageNumber = totalPages - 5 + i;
                } else {
                  pageNumber = pageIndex - 2 + i;
                }
                
                return (
                  <button
                    key={pageNumber}
                    onClick={() => table.setPageIndex(pageNumber)}
                    className={cn(
                      'rounded-md px-3 py-1 text-sm',
                      pageNumber === pageIndex
                        ? 'bg-primary-500 text-white'
                        : 'hover:bg-gray-700'
                    )}
                  >
                    {pageNumber + 1}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="inline-flex items-center gap-1 rounded-md px-3 py-1 text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 