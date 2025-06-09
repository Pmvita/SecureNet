import React, { useState, useMemo } from 'react';
import { Button } from '@/components/common/Button';
import { EmptyState } from './EmptyState';
import type { BaseProps } from '../../types';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> extends BaseProps {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  error?: string | Error;
  emptyMessage?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  selectable?: boolean;
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  sortable?: boolean;
  defaultSort?: {
    key: string;
    direction: 'asc' | 'desc';
  };
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
  };
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading,
  error,
  emptyMessage = 'No data available',
  emptyAction,
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  sortable = true,
  defaultSort,
  onSort,
  pagination,
  className,
  ...props
}: DataTableProps<T>) {
  const [sortState, setSortState] = useState(defaultSort || { key: '', direction: 'asc' as const });

  const handleSort = (key: string) => {
    if (!sortable) return;

    const newDirection = sortState.key === key && sortState.direction === 'asc' ? 'desc' : 'asc';
    setSortState({ key, direction: newDirection });
    onSort?.(key, newDirection);
  };

  const handleSelectAll = (checked: boolean) => {
    if (!selectable || !onSelectionChange) return;
    onSelectionChange(checked ? data.map(keyExtractor) : []);
  };

  const handleSelectItem = (key: string, checked: boolean) => {
    if (!selectable || !onSelectionChange) return;
    const newSelection = checked
      ? [...selectedKeys, key]
      : selectedKeys.filter(k => k !== key);
    onSelectionChange(newSelection);
  };

  const sortedData = useMemo(() => {
    if (!sortState.key) return data;

    return [...data].sort((a, b) => {
      const aValue = (a as any)[sortState.key];
      const bValue = (b as any)[sortState.key];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortState.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortState.direction === 'asc'
        ? (aValue > bValue ? 1 : -1)
        : (bValue > aValue ? 1 : -1);
    });
  }, [data, sortState]);

  if (loading) {
    return (
      <div className="data-table-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="data-table-error">
        <p>{error instanceof Error ? error.message : String(error)}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyMessage}
        action={emptyAction}
      />
    );
  }

  return (
    <div className={`data-table ${className || ''}`} {...props}>
      <div className="data-table-container">
        <table>
          <thead>
            <tr>
              {selectable && (
                <th className="select-column">
                  <input
                    type="checkbox"
                    checked={selectedKeys.length === data.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{
                    width: column.width,
                    textAlign: column.align || 'left',
                  }}
                  className={column.sortable ? 'sortable' : ''}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  {column.header}
                  {column.sortable && sortState.key === column.key && (
                    <span className="sort-indicator">
                      {sortState.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item) => {
              const key = keyExtractor(item);
              return (
                <tr key={key}>
                  {selectable && (
                    <td className="select-column">
                      <input
                        type="checkbox"
                        checked={selectedKeys.includes(key)}
                        onChange={(e) => handleSelectItem(key, e.target.checked)}
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      style={{ textAlign: column.align || 'left' }}
                    >
                      {column.render
                        ? column.render(item)
                        : (item as any)[column.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="data-table-pagination">
          <div className="pagination-info">
            Showing {((pagination.currentPage - 1) * pagination.pageSize) + 1} to{' '}
            {Math.min(pagination.currentPage * pagination.pageSize, data.length)} of{' '}
            {data.length} entries
          </div>

          <div className="pagination-controls">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
            >
              Previous
            </Button>

            <div className="pagination-pages">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === pagination.currentPage ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => pagination.onPageChange(page)}
                >
                  {page}
                </Button>
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
            >
              Next
            </Button>

            {pagination.onPageSizeChange && (
              <select
                value={pagination.pageSize}
                onChange={(e) => pagination.onPageSizeChange?.(Number(e.target.value))}
                className="page-size-select"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            )}
          </div>
        </div>
      )}

      <style>{`
        .data-table {
          width: 100%;
          overflow-x: auto;
        }

        .data-table-container {
          min-width: 100%;
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          overflow: hidden;
        }

        .data-table table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .data-table th,
        .data-table td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border-color);
          background: var(--bg-primary);
        }

        .data-table th {
          font-weight: 500;
          color: var(--text-secondary);
          text-align: left;
          white-space: nowrap;
        }

        .data-table th.sortable {
          cursor: pointer;
          user-select: none;
        }

        .data-table th.sortable:hover {
          background: var(--bg-secondary);
        }

        .sort-indicator {
          margin-left: 0.5rem;
          color: var(--primary-color);
        }

        .data-table tbody tr:hover {
          background: var(--bg-secondary);
        }

        .data-table tbody tr:last-child td {
          border-bottom: none;
        }

        .select-column {
          width: 2.5rem;
          text-align: center;
        }

        .data-table-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 200px;
        }

        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid var(--border-color);
          border-top-color: var(--primary-color);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .data-table-error {
          padding: 1rem;
          color: var(--error);
          text-align: center;
          background: var(--error-light);
          border-radius: 0.5rem;
        }

        .data-table-pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 1rem;
          padding: 0.5rem 0;
        }

        .pagination-info {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .pagination-pages {
          display: flex;
          gap: 0.25rem;
        }

        .page-size-select {
          margin-left: 1rem;
          padding: 0.25rem 0.5rem;
          border: 1px solid var(--border-color);
          border-radius: 0.25rem;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 0.875rem;
        }

        @media (max-width: 768px) {
          .data-table-pagination {
            flex-direction: column;
            gap: 1rem;
          }

          .pagination-controls {
            width: 100%;
            justify-content: center;
          }

          .pagination-pages {
            display: none;
          }
        }
      `}</style>
    </div>
  );
} 