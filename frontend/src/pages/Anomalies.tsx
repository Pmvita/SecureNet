import { useState } from 'react';
import { useAnomalies } from '../features/anomalies/api/useAnomalies';
import type { Anomaly } from '../features/anomalies/api/useAnomalies';
import { apiClient } from '../api/client';
import type { ApiResponse } from '../api/endpoints';
import { ExclamationTriangleIcon, ShieldCheckIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface AnomalyStats {
  total: number;
  open: number;
    critical: number;
  resolved: number;
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
}

const TYPE_CONFIG = {
  security: { label: 'Security', color: 'bg-red-500' },
  network: { label: 'Network', color: 'bg-blue-500' },
  system: { label: 'System', color: 'bg-yellow-500' },
  application: { label: 'Application', color: 'bg-purple-500' },
} as const;

const SEVERITY_CONFIG = {
  critical: 'bg-red-600',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
} as const;

const STATUS_CONFIG = {
  active: 'bg-red-500',
  investigating: 'bg-yellow-500',
  resolved: 'bg-green-500',
  false_positive: 'bg-gray-500',
} as const;

export default function AnomaliesPage() {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const {
    anomalies,
    total,
    metrics,
    isLoading,
    isError,
    error,
    resolveAnomaly,
    markAsFalsePositive,
    runAnalysis,
    isResolving,
    isMarkingFalsePositive,
    isAnalyzing,
  } = useAnomalies({
    filters: {
      type: selectedType !== 'all' ? selectedType : undefined,
      severity: selectedSeverity !== 'all' ? selectedSeverity : undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
    },
  });

  const stats = metrics as {
    total: number;
    open: number;
    critical: number;
    resolved: number;
    by_type: Record<string, number>;
    by_severity: Record<string, number>;
  };

  const filteredAnomalies = anomalies.filter((anomaly) => {
    const type = anomaly.type as Anomaly['type'];
    const severity = anomaly.severity as Anomaly['severity'];
    const status = anomaly.status as Anomaly['status'];

    if (selectedType !== 'all' && type !== selectedType) return false;
    if (selectedSeverity !== 'all' && severity !== selectedSeverity) return false;
    if (selectedStatus !== 'all' && status !== selectedStatus) return false;
    return true;
  });

  const handleResolve = async (id: string) => {
    try {
      await resolveAnomaly(id);
    } catch (error) {
      console.error('Failed to resolve anomaly:', error);
    }
  };

  const handleMarkFalsePositive = async (id: string) => {
    try {
      await markAsFalsePositive(id);
    } catch (error) {
      console.error('Failed to mark anomaly as false positive:', error);
    }
  };

  const handleRunAnalysis = async () => {
    try {
      await runAnalysis();
    } catch (error) {
      console.error('Failed to run analysis:', error);
    }
  };

  if (isError) {
  return (
      <div className="p-4">
        <div className="rounded-lg bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading anomalies</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error instanceof Error ? error.message : 'An unknown error occurred'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Stats Overview */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-gray-800 p-4">
          <h3 className="text-sm font-medium text-gray-400">Total Anomalies</h3>
          <p className="mt-2 text-2xl font-semibold text-white">
            {isLoading ? (
                  <div className="h-8 w-24 bg-gray-700 animate-pulse rounded"></div>
                ) : (
              stats.total
                )}
              </p>
            </div>
        <div className="rounded-lg bg-gray-800 p-4">
          <h3 className="text-sm font-medium text-gray-400">Open Anomalies</h3>
          <p className="mt-2 text-2xl font-semibold text-white">
            {isLoading ? (
              <div className="h-8 w-24 bg-gray-700 animate-pulse rounded"></div>
            ) : (
              stats.open
            )}
          </p>
        </div>
        <div className="rounded-lg bg-gray-800 p-4">
          <h3 className="text-sm font-medium text-gray-400">Critical Anomalies</h3>
          <p className="mt-2 text-2xl font-semibold text-white">
            {isLoading ? (
                  <div className="h-8 w-24 bg-gray-700 animate-pulse rounded"></div>
                ) : (
              stats.critical
                )}
              </p>
        </div>
        <div className="rounded-lg bg-gray-800 p-4">
          <h3 className="text-sm font-medium text-gray-400">Resolved Anomalies</h3>
          <p className="mt-2 text-2xl font-semibold text-white">
            {isLoading ? (
                  <div className="h-8 w-24 bg-gray-700 animate-pulse rounded"></div>
                ) : (
              stats.resolved
                )}
              </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="rounded-md bg-gray-700 px-3 py-2 text-sm text-white"
        >
          <option value="all">All Types</option>
          {Object.entries(TYPE_CONFIG).map(([type, { label }]) => (
            <option key={type} value={type}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value)}
          className="rounded-md bg-gray-700 px-3 py-2 text-sm text-white"
        >
          <option value="all">All Severities</option>
          {Object.entries(SEVERITY_CONFIG).map(([severity]) => (
            <option key={severity} value={severity}>
              {severity.charAt(0).toUpperCase() + severity.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="rounded-md bg-gray-700 px-3 py-2 text-sm text-white"
        >
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([status]) => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
            </option>
          ))}
        </select>
                <button
          onClick={handleRunAnalysis}
          disabled={isAnalyzing}
          className="ml-auto rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isAnalyzing ? 'Running Analysis...' : 'Run Analysis'}
                </button>
      </div>

      {/* Anomalies List */}
      <div className="rounded-lg bg-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-400">
                    Loading anomalies...
                  </td>
                </tr>
              ) : (filteredAnomalies.length === 0) ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-400">
                    No anomalies found
                  </td>
                </tr>
              ) : (filteredAnomalies.map((anomaly) => {
                const type = anomaly.type as Anomaly['type'];
                const severity = anomaly.severity as Anomaly['severity'];
                const status = anomaly.status as Anomaly['status'];
                return (
                  <tr key={anomaly.id}>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 text-white ${TYPE_CONFIG[type].color}`}>
                        {TYPE_CONFIG[type].label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 text-white ${SEVERITY_CONFIG[severity]}`}>
                        {severity.charAt(0).toUpperCase() + severity.slice(1)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 text-white ${STATUS_CONFIG[status]}`}>
                        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{anomaly.description}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300">{anomaly.source}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300">
                      {new Date(anomaly.timestamp).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      {status === 'active' && (
                        <>
                          <button
                            onClick={() => handleResolve(anomaly.id)}
                            disabled={isResolving}
                            className="mr-2 text-blue-400 hover:text-blue-300 disabled:opacity-50"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => handleMarkFalsePositive(anomaly.id)}
                            disabled={isMarkingFalsePositive}
                            className="text-gray-400 hover:text-gray-300 disabled:opacity-50"
                          >
                            Mark as False Positive
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 