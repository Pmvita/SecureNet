import React from 'react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/common/Button';
import { Badge } from './Badge';

export interface Filter {
  id: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'boolean';
  options?: { label: string; value: string }[];
}

export interface FilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  filters: Filter[];
  activeFilters: Record<string, string | string[]>;
  onFilterChange: (filterId: string, value: string | string[]) => void;
  onClearFilters: () => void;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  activeFilters,
  onFilterChange,
  onClearFilters,
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  className,
  ...props
}) => {
  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4',
        className
      )}
      {...props}
    >
      <div className="flex flex-wrap items-center gap-4">
        {onSearchChange && (
          <div className="flex-1 min-w-[200px]">
            <input
              type="search"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        {filters.map((filter) => (
          <div key={filter.id} className="flex items-center gap-2">
            <select
              value={activeFilters[filter.id] as string || ''}
              onChange={(e) => onFilterChange(filter.id, e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">{filter.label}</option>
              {filter.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {hasActiveFilters && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onClearFilters}
            className="ml-auto"
          >
            Clear filters
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(activeFilters).map(([filterId, value]) => {
            const filter = filters.find((f) => f.id === filterId);
            if (!filter) return null;

            const values = Array.isArray(value) ? value : [value];
            return values.map((v) => {
              const option = filter.options?.find((opt) => opt.value === v);
              return (
                <Badge
                  key={`${filterId}-${v}`}
                  variant="default"
                  className="flex items-center gap-1"
                >
                  <span>
                    {filter.label}: {option?.label || v}
                  </span>
                  <button
                    onClick={() => {
                      if (Array.isArray(activeFilters[filterId])) {
                        onFilterChange(
                          filterId,
                          (activeFilters[filterId] as string[]).filter(
                            (val) => val !== v
                          )
                        );
                      } else {
                        onFilterChange(filterId, '');
                      }
                    }}
                    className="ml-1 rounded-full p-0.5 hover:bg-gray-200"
                  >
                    ×
                  </button>
                </Badge>
              );
            });
          })}
        </div>
      )}
    </div>
  );
}; 