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
      setError(null); // Clear previous errors
      const token = localStorage.getItem('auth_token');
              const response = await fetch(`http://127.0.0.1:8000/api/admin/audit-logs?limit=${limit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // JWT expired, redirect to login
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
          return;
        }
        throw new Error(`Failed to fetch audit logs: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setLogs(data);
      setError(null); // Clear error on success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('Audit logs fetch error:', err);
      setError(errorMessage);
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

  const parseMetadata = (metadata: string | null): Record<string, unknown> | null => {
    if (!metadata) return null;
    try {
      // Handle case where metadata might already be an object
      if (typeof metadata === 'object') {
        return metadata as Record<string, unknown>;
      }
      
      // Try to parse as JSON string
      const parsed = JSON.parse(metadata);
      return parsed;
    } catch (error) {
      // If parsing fails, try to extract meaningful info from the string
      console.warn('Failed to parse metadata:', metadata, error);
      
      // Check if it's a stringified object that got corrupted
      if (typeof metadata === 'string') {
        // Try to extract user_id and role from common patterns
        const userIdMatch = metadata.match(/user_id["\s]*:\s*(\d+)/);
        const roleMatch = metadata.match(/role["\s]*:\s*["']([^"']+)["']/);
        
        if (userIdMatch || roleMatch) {
          const result: Record<string, unknown> = {};
          if (userIdMatch) result.user_id = parseInt(userIdMatch[1]);
          if (roleMatch) result.role = roleMatch[1];
          return result;
        }
      }
      
      return null;
    }
  };

  const formatMetadata = (metadata: Record<string, unknown> | null): string | null => {
    if (!metadata) return null;
    
    // Handle common metadata patterns
    if (typeof metadata === 'object') {
      const entries = Object.entries(metadata);
      if (entries.length === 0) return null;
      
      return entries.map(([key, value]) => {
        // Format specific keys nicely
        if (key === 'user_id') return `User ID: ${value}`;
        if (key === 'role') return `Role: ${value}`;
        if (key === 'ip_address') return `IP: ${value}`;
        if (key === 'session_id') return `Session: ${value}`;
        
        // Default formatting
        return `${key}: ${value}`;
      }).join(', ');
    }
    
    return String(metadata);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
            <p className="mt-1 text-sm text-gray-400">
              System audit trail and security events
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              Showing {filteredLogs.length} of {logs.length} logs
            </div>
            <button
              onClick={() => {
                setError(null);
                fetchAuditLogs();
              }}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-300 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300 mr-2"></div>
                  Loading...
                </>
              ) : (
                'Refresh'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-300">Error Loading Audit Logs</h3>
                <p className="mt-1 text-sm text-red-200">{error}</p>
                {error.includes('401') && (
                  <p className="mt-1 text-xs text-red-300">Your session may have expired. Please refresh the page or log in again.</p>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                setError(null);
                fetchAuditLogs();
              }}
              className="ml-4 inline-flex items-center px-3 py-2 border border-red-600 shadow-sm text-sm leading-4 font-medium rounded-md text-red-300 bg-red-900/20 hover:bg-red-900/40"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Search Logs
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search messages, sources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-gray-600 rounded-md px-3 py-2 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Filter by Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border border-gray-600 rounded-md px-3 py-2 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="auth">Authentication</option>
              <option value="admin">Admin Actions</option>
              <option value="security">Security</option>
              <option value="billing">Billing</option>
              <option value="system">System</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Filter by Level
            </label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full border border-gray-600 rounded-md px-3 py-2 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Levels</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Log Limit
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full border border-gray-600 rounded-md px-3 py-2 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={50}>50 logs</option>
              <option value={100}>100 logs</option>
              <option value={250}>250 logs</option>
              <option value={500}>500 logs</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Organization
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredLogs.map((log, index) => {
                const metadata = parseMetadata(log.metadata);
                return (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-800/50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 mr-2 text-gray-500" />
                        {formatDate(log.timestamp)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getLevelIcon(log.level)}
                        <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getLevelBadgeColor(log.level)}`}>
                          {log.level}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getCategoryIcon(log.category)}
                        <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getCategoryBadgeColor(log.category)}`}>
                          {log.category}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {log.source}
                    </td>
                    <td className="px-6 py-4 text-sm text-white">
                      <div className="max-w-md">
                        <p className="text-white">{log.message}</p>
                        {metadata && (
                          <div className="mt-1 text-xs text-gray-400 bg-gray-800/50 rounded px-2 py-1">
                            {formatMetadata(metadata)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      <div className="flex items-center">
                        <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                        {(() => {
                          // Debug: log the organization_name to see what we're getting
                          if (index === 0) {
                            console.log('Sample log data:', {
                              organization_name: log.organization_name,
                              metadata: log.metadata,
                              full_log: log
                            });
                          }
                          
                          const orgName = log.organization_name;
                          
                          // Handle null/undefined
                          if (!orgName) return 'System';
                          
                          // Handle normal string
                          if (typeof orgName === 'string') {
                            // Check if it looks like corrupted indexed data (e.g., "0: {1: "2: u3: s...")
                            if (orgName.match(/^\d+:\s*\{/)) {
                              // This is corrupted indexed data, try to extract meaningful info
                              
                              // Look for user_id pattern in the corrupted string
                              const userIdMatch = orgName.match(/(\d+):\s*(\d+)/);
                              if (userIdMatch) {
                                return `User ${userIdMatch[2]}`;
                              }
                              
                              // Look for role patterns
                              if (orgName.includes('platform_owner') || orgName.includes('p25: l26: a27: t28: f29: o30: r31: m32: _33: o34: w35: n36: e37: r38:')) {
                                return 'Platform Owner';
                              }
                              if (orgName.includes('security_admin') || orgName.includes('s25: e26: c27: u28: r29: i30: t31: y32: _33: a34: d35: m36: i37: n38:')) {
                                return 'Security Admin';
                              }
                              if (orgName.includes('soc_analyst') || orgName.includes('s25: o26: c27: _28: a29: n30: a31: l32: y33: s34: t35:')) {
                                return 'SOC Analyst';
                              }
                              
                              // Default for corrupted data
                              return 'System';
                            }
                            
                            // Check if it looks like JSON
                            if (orgName.startsWith('{') && orgName.endsWith('}')) {
                              try {
                                const parsed = JSON.parse(orgName);
                                if (parsed.user_id && parsed.role) {
                                  return `User ${parsed.user_id} (${parsed.role})`;
                                } else if (parsed.user_id) {
                                  return `User ${parsed.user_id}`;
                                } else if (parsed.role) {
                                  return parsed.role;
                                }
                              } catch (e) {
                                // JSON parsing failed, fall through to default
                              }
                            }
                            
                            // Normal organization name
                            return orgName;
                          }
                          
                          // Fallback
                          return 'System';
                        })()}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && !loading && (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-300">No audit logs found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedCategory !== 'all' || selectedLevel !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'No audit logs are available.'}
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
            <div key={category} className="glass-card p-6">
              <div className="flex items-center">
                {getCategoryIcon(category)}
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-300 capitalize">
                    {category}
                  </h3>
                  <div className="mt-2 space-y-1">
                    <div className="text-sm text-gray-400">
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