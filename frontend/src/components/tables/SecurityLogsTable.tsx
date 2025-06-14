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
} from '@tanstack/react-table';
import { 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

interface SecurityLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  message: string;
  ip?: string;
  user?: string;
  action?: string;
}

interface SecurityLogsTableProps {
  logs: SecurityLog[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

const getLevelIcon = (level: string) => {
  switch (level) {
    case 'critical':
      return <XCircleIcon className="h-4 w-4 text-red-500" />;
    case 'error':
      return <ExclamationTriangleIcon className="h-4 w-4 text-red-400" />;
    case 'warning':
      return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400" />;
    case 'info':
      return <InformationCircleIcon className="h-4 w-4 text-blue-400" />;
    default:
      return <CheckCircleIcon className="h-4 w-4 text-green-400" />;
  }
};

const getLevelBadge = (level: string) => {
  const baseClasses = "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium";
  
  switch (level) {
    case 'critical':
      return `${baseClasses} bg-red-500/20 text-red-300`;
    case 'error':
      return `${baseClasses} bg-red-400/20 text-red-300`;
    case 'warning':
      return `${baseClasses} bg-yellow-400/20 text-yellow-300`;
    case 'info':
      return `${baseClasses} bg-blue-400/20 text-blue-300`;
    default:
      return `${baseClasses} bg-green-400/20 text-green-300`;
  }
};

export function SecurityLogsTable({ logs, isLoading = false, onRefresh }: SecurityLogsTableProps) {
  const [sorting, setSorting] = React.useState([]);
  const [globalFilter, setGlobalFilter] = React.useState('');

  const columns = React.useMemo<ColumnDef<SecurityLog>[]>(
    () => [
      {
        accessorKey: 'timestamp',
        header: 'Time',
        cell: ({ getValue }) => {
          const timestamp = getValue() as string;
          return (
            <div className="text-sm text-gray-300">
              {new Date(timestamp).toLocaleString()}
            </div>
          );
        },
        size: 160,
      },
      {
        accessorKey: 'level',
        header: 'Level',
        cell: ({ getValue }) => {
          const level = getValue() as string;
          return (
            <span className={getLevelBadge(level)}>
              {getLevelIcon(level)}
              {level.toUpperCase()}
            </span>
          );
        },
        size: 100,
      },
      {
        accessorKey: 'source',
        header: 'Source',
        cell: ({ getValue }) => (
          <div className="text-sm text-gray-300">{getValue() as string}</div>
        ),
        size: 120,
      },
      {
        accessorKey: 'message',
        header: 'Message',
        cell: ({ getValue }) => (
          <div className="text-sm text-gray-300 max-w-md truncate" title={getValue() as string}>
            {getValue() as string}
          </div>
        ),
        size: 300,
      },
      {
        accessorKey: 'ip',
        header: 'IP Address',
        cell: ({ getValue }) => {
          const ip = getValue() as string;
          return ip ? (
            <div className="text-sm text-gray-300 font-mono">{ip}</div>
          ) : (
            <div className="text-sm text-gray-500">-</div>
          );
        },
        size: 120,
      },
      {
        accessorKey: 'user',
        header: 'User',
        cell: ({ getValue }) => {
          const user = getValue() as string;
          return user ? (
            <div className="text-sm text-gray-300">{user}</div>
          ) : (
            <div className="text-sm text-gray-500">-</div>
          );
        },
        size: 100,
      },
      {
        accessorKey: 'action',
        header: 'Action',
        cell: ({ getValue }) => {
          const action = getValue() as string;
          return action ? (
            <div className="text-sm text-gray-300">{action}</div>
          ) : (
            <div className="text-sm text-gray-500">-</div>
          );
        },
        size: 120,
      },
    ],
    []
  );

  const table = useReactTable({
    data: logs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* Header with search and refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-white">Security Logs</h2>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-64 rounded-md border border-gray-600 bg-gray-800 pl-10 pr-4 py-2 text-sm text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
        
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Refresh
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-800 text-xs uppercase text-gray-300">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={cn(
                        'px-4 py-3',
                        header.column.getCanSort() && 'cursor-pointer select-none hover:bg-gray-700'
                      )}
                      onClick={header.column.getToggleSortingHandler()}
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
            <tbody className="bg-gray-900 text-white">
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-400">
                    <div className="flex items-center justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                      <span className="ml-2">Loading security logs...</span>
                    </div>
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-400">
                    No security logs found
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-gray-700 hover:bg-gray-800/50"
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
        <div className="flex items-center justify-between border-t border-gray-700 px-4 py-3 bg-gray-800">
          <div className="text-sm text-gray-400">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{' '}
            of {table.getFilteredRowModel().rows.length} results
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="rounded-md px-3 py-1 text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <span className="text-sm text-gray-400">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="rounded-md px-3 py-1 text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 