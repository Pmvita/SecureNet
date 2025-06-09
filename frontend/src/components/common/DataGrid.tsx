import React, { useState, useMemo } from 'react';
import { cn } from '@/utils/cn';
import { Table } from './Table';
import type { Column } from './Table';
import { Pagination } from './Pagination';
import { FilterBar } from './FilterBar';
import type { Filter } from './FilterBar';

export type { Column, Filter };

export interface DataGridProps<T> extends React.HTMLAttributes<HTMLDivElement> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  filters?: Filter[];
  initialFilters?: Record<string, string | string[]>;
  onFilterChange?: (filters: Record<string, string | string[]>) => void;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  selectable?: boolean;
  onSelectionChange?: (selectedIds: string[]) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function DataGrid<T>({
  columns,
  data,
  keyExtractor,
  filters = [],
  initialFilters = {},
  onFilterChange,
  searchPlaceholder = 'Search...',
  onSearch,
  selectable = false,
  onSelectionChange,
  isLoading = false,
  emptyMessage = 'No data available',
  className,
  ...props
}: DataGridProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeFilters, setActiveFilters] = useState<Record<string, string | string[]>>(initialFilters);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<string>();
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) =>
        columns.some((column) => {
          const value = column.accessor(item);
          return value?.toString().toLowerCase().includes(query);
        })
      );
    }

    // Apply filters
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (!value) return;
      const values = Array.isArray(value) ? value : [value];
      result = result.filter((item) => {
        const column = columns.find((col) => col.key === key);
        if (!column) return true;
        const itemValue = column.accessor(item)?.toString().toLowerCase();
        return values.some((v) => itemValue?.includes(v.toLowerCase()));
      });
    });

    // Apply sorting
    if (sortColumn) {
      const column = columns.find((col) => col.key === sortColumn);
      if (column?.sortable) {
        result.sort((a, b) => {
          const aValue = column.accessor(a)?.toString().toLowerCase() ?? '';
          const bValue = column.accessor(b)?.toString().toLowerCase() ?? '';
          return sortDirection === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        });
      }
    }

    return result;
  }, [data, columns, searchQuery, activeFilters, sortColumn, sortDirection]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleFilterChange = (filterId: string, value: string | string[]) => {
    const newFilters = { ...activeFilters, [filterId]: value };
    setActiveFilters(newFilters);
    onFilterChange?.(newFilters);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setActiveFilters({});
    onFilterChange?.({});
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
    setCurrentPage(1);
  };

  const handleRowSelect = (rowId: string) => {
    const newSelection = selectedRows.includes(rowId)
      ? selectedRows.filter((id) => id !== rowId)
      : [...selectedRows, rowId];
    setSelectedRows(newSelection);
    onSelectionChange?.(newSelection);
  };

  const handleSelectAll = (selected: boolean) => {
    const newSelection = selected ? paginatedData.map(keyExtractor) : [];
    setSelectedRows(newSelection);
    onSelectionChange?.(newSelection);
  };

  return (
    <div className={cn('space-y-4', className)} {...props}>
      {(filters.length > 0 || onSearch) && (
        <FilterBar
          filters={filters}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          searchPlaceholder={searchPlaceholder}
          searchValue={searchQuery}
          onSearchChange={handleSearchChange}
        />
      )}

      <Table
        columns={columns}
        data={paginatedData}
        keyExtractor={keyExtractor}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
        selectedRows={selectable ? selectedRows : undefined}
        onRowSelect={selectable ? handleRowSelect : undefined}
        onSelectAll={selectable ? handleSelectAll : undefined}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
      />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        totalItems={filteredData.length}
      />
    </div>
  );
} 