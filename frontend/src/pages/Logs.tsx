import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MagnifyingGlassIcon, FunnelIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { apiClient } from '../api/client';
import type { ApiEndpoints, LogFilters } from '../api/endpoints';
import type { LogLevel } from '@/types';

type LogEntry = ApiEndpoints['GET']['/api/logs']['response']['logs'][0];
type LogsResponse = ApiEndpoints['GET']['/api/logs']['response'];

interface FilterState {
  level: LogLevel[];
  source: string[];
  search: string;
  startDate?: string;
  endDate?: string;
}

const initialFilters: FilterState = {
  level: [],
  source: [],
  search: '',
};

const logLevels: { value: LogLevel; label: string; color: string }[] = [
  { value: 'debug', label: 'Debug', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'info', label: 'Info', color: 'bg-green-500/20 text-green-400' },
  { value: 'warning', label: 'Warning', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'error', label: 'Error', color: 'bg-red-500/20 text-red-400' },
  { value: 'critical', label: 'Critical', color: 'bg-purple-500/20 text-purple-400' },
];

const sources = [
  'Security Scanner',
  'Network Monitor',
  'System',
  'Authentication',
  'Database',
  'API',
];

async function fetchLogs(filters: FilterState, page: number, pageSize: number): Promise<LogsResponse> {
  const res = await apiClient.get('/api/logs', {
    level: filters.level.length > 0 ? filters.level : undefined,
    source: filters.source.length > 0 ? filters.source : undefined,
    search: filters.search || undefined,
    startDate: filters.startDate,
    endDate: filters.endDate,
    page,
    pageSize,
  });
  return res;
}

export default function Logs() {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
      setPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [filters]);

  const { data: logsData, isLoading, error, refetch } = useQuery({
    queryKey: ['logs', debouncedFilters, page, pageSize],
    queryFn: async () => await fetchLogs(debouncedFilters, page, pageSize),
    refetchInterval: autoRefresh ? 30000 : false,
    staleTime: 10000,
  });

  const logs = logsData?.logs ?? [];
  const total = logsData?.total ?? 0;

  const handleFilterChange = (key: keyof FilterState, value: unknown) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      if (key === 'level') {
        const levelValue = value as LogLevel;
        newFilters.level = prev.level.includes(levelValue)
          ? prev.level.filter(l => l !== levelValue)
          : [...prev.level, levelValue];
      } else if (key === 'source') {
        const sourceValue = value as string;
        newFilters.source = prev.source.includes(sourceValue)
          ? prev.source.filter(s => s !== sourceValue)
          : [...prev.source, sourceValue];
      } else {
        newFilters[key] = value as string;
      }
      return newFilters;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-white">System Logs</h1>
        <div className="flex items-center space-x-4">
          <button
            className="btn-primary"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="ml-2">Refresh</span>
          </button>
          <label className="flex items-center space-x-2 text-gray-400">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-600 bg-dark-100 text-primary-500 focus:ring-primary-500"
            />
            <span>Auto-refresh</span>
          </label>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="glass-card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search logs..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="input-field pl-10 w-full"
            />
          </div>
          <button
            className="btn-primary flex items-center justify-center"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <FunnelIcon className="h-5 w-5" />
            <span className="ml-2">Filters</span>
          </button>
        </div>

        {/* Filter Panel */}
        {isFilterOpen && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Log Level</h3>
              <div className="flex flex-wrap gap-2">
                {logLevels.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => handleFilterChange('level', level.value)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      filters.level.includes(level.value)
                        ? level.color
                        : 'text-gray-400 bg-gray-700/50'
                    }`}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Source</h3>
              <div className="flex flex-wrap gap-2">
                {sources.map((source) => (
                  <button
                    key={source}
                    onClick={() => handleFilterChange('source', source)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      filters.source.includes(source)
                        ? 'text-primary-500 bg-primary-500/10'
                        : 'text-gray-400 bg-gray-700/50'
                    }`}
                  >
                    {source}
                  </button>
                ))}
              </div>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Start Date
                </label>
                <input
                  type="datetime-local"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  End Date
                </label>
                <input
                  type="datetime-local"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="input-field w-full"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Logs Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-dark-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Message
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4">
                    <div className="animate-pulse space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-12 bg-gray-700 rounded"></div>
                      ))}
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-400">
                    No logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-dark-100/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        logLevels.find(l => l.value === log.level)?.color
                      }`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {log.source_id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      <div className="max-w-xl truncate">{log.message}</div>
                      {Object.keys(log.metadata).length > 0 && (
                        <div className="mt-1 text-xs text-gray-400">
                          {Object.entries(log.metadata).map(([key, value]) => (
                            <span key={key} className="mr-4">
                              {key}: {JSON.stringify(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Add pagination controls */}
        <div className="px-6 py-4 flex items-center justify-between border-t border-gray-800">
          <div className="flex items-center">
            <span className="text-sm text-gray-400">
              Showing {logs.length} of {total} logs
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary"
            >
              Previous
            </button>
            <span className="text-sm text-gray-400">
              Page {page} of {Math.ceil(total / pageSize)}
            </span>
            <button
              onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
              disabled={page >= Math.ceil(total / pageSize)}
              className="btn-secondary"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 