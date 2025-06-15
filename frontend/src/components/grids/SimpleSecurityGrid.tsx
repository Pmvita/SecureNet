import React, { useMemo, useState } from 'react';
import { useLogs } from '../../features/logs/api/useLogs';
import { useSecurity } from '../../features/security/api/useSecurity';
import { useAnomalies } from '../../features/anomalies/api/useAnomalies';
import { 
  ArrowDownTrayIcon, 
  MagnifyingGlassIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

interface SecurityEvent {
  id: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'threat' | 'vulnerability' | 'anomaly' | 'system';
  source: string;
  description: string;
  status: 'open' | 'investigating' | 'resolved';
  category: string;
}

interface SimpleSecurityGridProps {
  height?: number;
  className?: string;
}

export function SimpleSecurityGrid({ height = 600, className = '' }: SimpleSecurityGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof SecurityEvent>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const { data: logsData, isLoading: logsLoading } = useLogs({ page: 1, pageSize: 1000 });
  const { recentFindings, isLoading: securityLoading } = useSecurity();
  const { anomalies, isLoading: anomaliesLoading } = useAnomalies();

  // Transform data from different sources into unified security events
  const securityEvents: SecurityEvent[] = useMemo(() => {
    const events: SecurityEvent[] = [];

    // Add security findings
    if (recentFindings) {
      recentFindings.forEach(finding => {
        events.push({
          id: `security-${finding.id}`,
          timestamp: finding.timestamp || new Date().toISOString(),
          severity: finding.severity as 'low' | 'medium' | 'high' | 'critical',
          type: 'threat',
          source: 'Security Scanner',
          description: finding.description || 'Security finding detected',
          status: 'open',
          category: 'Security Finding'
        });
      });
    }

    // Add anomalies
    if (anomalies) {
      anomalies.forEach((anomaly: any) => {
        events.push({
          id: `anomaly-${anomaly.id}`,
          timestamp: anomaly.timestamp,
          severity: anomaly.severity as 'low' | 'medium' | 'high' | 'critical',
          type: 'anomaly',
          source: anomaly.source || 'Anomaly Detection',
          description: anomaly.description,
          status: anomaly.status === 'active' ? 'open' : 'resolved',
          category: 'Network Anomaly'
        });
      });
    }

    // Add critical logs
    if (logsData?.logs) {
      logsData.logs
        .filter((log: any) => log.level === 'error' || log.level === 'critical')
        .forEach((log: any) => {
          events.push({
            id: `log-${log.id}`,
            timestamp: log.timestamp,
            severity: log.level === 'critical' ? 'critical' : 'high',
            type: 'system',
            source: log.source || 'System',
            description: log.message,
            status: 'open',
            category: 'System Event'
          });
        });
    }

    return events;
  }, [recentFindings, anomalies, logsData]);

  // Filter and sort events
  const filteredAndSortedEvents = useMemo(() => {
    let filtered = securityEvents;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (sortField === 'timestamp') {
        const aTime = new Date(aValue as string).getTime();
        const bTime = new Date(bValue as string).getTime();
        return sortDirection === 'desc' ? bTime - aTime : aTime - bTime;
      }
      
      if (aValue < bValue) return sortDirection === 'desc' ? 1 : -1;
      if (aValue > bValue) return sortDirection === 'desc' ? -1 : 1;
      return 0;
    });

    return filtered;
  }, [securityEvents, searchTerm, sortField, sortDirection]);

  // Pagination
  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedEvents.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedEvents, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedEvents.length / pageSize);

  const handleSort = (field: keyof SecurityEvent) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-500 text-white';
      case 'investigating': return 'bg-yellow-500 text-black';
      case 'resolved': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const exportToCsv = () => {
    const headers = ['Timestamp', 'Severity', 'Type', 'Category', 'Source', 'Description', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredAndSortedEvents.map(event => [
        event.timestamp,
        event.severity,
        event.type,
        event.category,
        event.source,
        `"${event.description.replace(/"/g, '""')}"`,
        event.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-events-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const isLoading = logsLoading || securityLoading || anomaliesLoading;

  if (isLoading) {
    return (
      <div className={`bg-gray-900 border border-gray-700 rounded-lg p-6 ${className}`}>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white">Security Events</h3>
          <p className="text-sm text-gray-400 mt-1">Enterprise security event management and analysis</p>
        </div>
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Security Events</h3>
            <p className="text-sm text-gray-400 mt-1">Enterprise security event management and analysis</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={exportToCsv}
              className="inline-flex items-center px-3 py-2 border border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-300 bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Search and Stats */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-md leading-5 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <span>{securityEvents.filter(e => e.severity === 'critical').length} Critical</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
              <span>{securityEvents.filter(e => e.severity === 'high').length} High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>{filteredAndSortedEvents.length} Total</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto" style={{ height: height - 120 }}>
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800 sticky top-0">
            <tr>
              {[
                { key: 'timestamp', label: 'Time', width: 'w-48' },
                { key: 'severity', label: 'Severity', width: 'w-24' },
                { key: 'type', label: 'Type', width: 'w-24' },
                { key: 'category', label: 'Category', width: 'w-32' },
                { key: 'source', label: 'Source', width: 'w-32' },
                { key: 'description', label: 'Description', width: 'flex-1' },
                { key: 'status', label: 'Status', width: 'w-24' },
              ].map(({ key, label, width }) => (
                <th
                  key={key}
                  className={`${width} px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700`}
                  onClick={() => handleSort(key as keyof SecurityEvent)}
                >
                  <div className="flex items-center gap-1">
                    {label}
                    {sortField === key && (
                      sortDirection === 'desc' ? 
                        <ChevronDownIcon className="h-3 w-3" /> : 
                        <ChevronUpIcon className="h-3 w-3" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-700">
            {paginatedEvents.map((event) => (
              <tr key={event.id} className="hover:bg-gray-800 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {new Date(event.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(event.severity)}`}>
                    {event.severity.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 capitalize">
                  {event.type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {event.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {event.source}
                </td>
                <td className="px-6 py-4 text-sm text-gray-300 max-w-md truncate">
                  {event.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                    {event.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-3 border-t border-gray-700 bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredAndSortedEvents.length)} of {filteredAndSortedEvents.length} events
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-600 rounded text-gray-300 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-600 rounded text-gray-300 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SimpleSecurityGrid; 