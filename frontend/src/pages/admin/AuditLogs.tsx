import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShieldExclamationIcon,
  CurrencyDollarIcon,
  UserIcon,
  ClockIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

interface AuditLog {
  id: number;
  timestamp: string;
  level: string;
  category: string;
  source: string;
  message: string;
  metadata: string | null;
  organization_name: string | null;
}

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [limit, setLimit] = useState(100);

  useEffect(() => {
    fetchAuditLogs();
  }, [limit]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/audit-logs?limit=${limit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (log.organization_name && log.organization_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || log.category === selectedCategory;
    const matchesLevel = selectedLevel === 'all' || log.level === selectedLevel;
    return matchesSearch && matchesCategory && matchesLevel;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <ShieldExclamationIcon className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <InformationCircleIcon className="h-4 w-4 text-blue-500" />;
      default:
        return <DocumentTextIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'auth':
        return <UserIcon className="h-4 w-4 text-green-500" />;
      case 'admin':
        return <ShieldExclamationIcon className="h-4 w-4 text-purple-500" />;
      case 'security':
        return <ShieldExclamationIcon className="h-4 w-4 text-red-500" />;
      case 'billing':
        return <CurrencyDollarIcon className="h-4 w-4 text-blue-500" />;
      default:
        return <DocumentTextIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'auth':
        return 'bg-green-100 text-green-800';
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'security':
        return 'bg-red-100 text-red-800';
      case 'billing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const parseMetadata = (metadata: string | null) => {
    if (!metadata) return null;
    try {
      return JSON.parse(metadata);
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
            <p className="mt-1 text-sm text-gray-500">
              System audit trail and security events
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              Showing {filteredLogs.length} of {logs.length} logs
            </div>
            <button
              onClick={fetchAuditLogs}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Logs
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search messages, sources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Categories</option>
              <option value="auth">Authentication</option>
              <option value="admin">Administration</option>
              <option value="security">Security</option>
              <option value="billing">Billing</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Level
            </label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Levels</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Limit
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value={50}>50 logs</option>
              <option value={100}>100 logs</option>
              <option value={200}>200 logs</option>
              <option value={500}>500 logs</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Audit Log Entries
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organization
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <motion.tr
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-2 text-gray-400" />
                      {formatDate(log.timestamp)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getLevelIcon(log.level)}
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelBadgeColor(log.level)}`}>
                        {log.level.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getCategoryIcon(log.category)}
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryBadgeColor(log.category)}`}>
                        {log.category.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.source}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs truncate" title={log.message}>
                      {log.message}
                    </div>
                    {log.metadata && (
                      <div className="mt-1 text-xs text-gray-500">
                        <details className="cursor-pointer">
                          <summary>Metadata</summary>
                          <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                            {JSON.stringify(parseMetadata(log.metadata), null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.organization_name ? (
                      <div className="flex items-center">
                        <BuildingOfficeIcon className="h-4 w-4 mr-1 text-gray-400" />
                        {log.organization_name}
                      </div>
                    ) : (
                      <span className="text-gray-400">System</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No audit logs found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search criteria or refresh the logs.
            </p>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {['auth', 'admin', 'security', 'billing'].map((category) => {
          const categoryLogs = logs.filter(log => log.category === category);
          const errorCount = categoryLogs.filter(log => log.level === 'error').length;
          const warningCount = categoryLogs.filter(log => log.level === 'warning').length;
          
          return (
            <div key={category} className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                {getCategoryIcon(category)}
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900 capitalize">
                    {category}
                  </h3>
                  <div className="mt-2 space-y-1">
                    <div className="text-sm text-gray-500">
                      Total: {categoryLogs.length}
                    </div>
                    {errorCount > 0 && (
                      <div className="text-sm text-red-600">
                        Errors: {errorCount}
                      </div>
                    )}
                    {warningCount > 0 && (
                      <div className="text-sm text-yellow-600">
                        Warnings: {warningCount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AuditLogs; 