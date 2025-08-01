import React, { useState, useEffect } from 'react';
import { useAuth } from '../../features/auth/context/AuthContext';
import { 
  CpuChipIcon,
  ServerIcon,
  CloudIcon,
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  GlobeAltIcon,
  CircleStackIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

interface InfrastructureMetrics {
  servers: {
    total: number;
    healthy: number;
    warning: number;
    critical: number;
  };
  databases: {
    primary_status: 'healthy' | 'warning' | 'critical';
    replica_status: 'healthy' | 'warning' | 'critical';
    connection_pool: number;
    query_performance: number;
  };
  api_performance: {
    avg_response_time: number;
    requests_per_minute: number;
    error_rate: number;
    uptime_percentage: number;
  };
  cdn_status: {
    global_regions: number;
    cache_hit_rate: number;
    bandwidth_usage: number;
  };
  monitoring: {
    alerts_last_24h: number;
    incidents_resolved: number;
    system_load: number;
    memory_usage: number;
  };
}

const PlatformInfrastructurePage: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<InfrastructureMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInfrastructureMetrics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchInfrastructureMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchInfrastructureMetrics = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would fetch from infrastructure monitoring APIs
      setMetrics({
        servers: {
          total: 12,
          healthy: 10,
          warning: 1,
          critical: 1
        },
        databases: {
          primary_status: 'healthy',
          replica_status: 'healthy',
          connection_pool: 85,
          query_performance: 92
        },
        api_performance: {
          avg_response_time: 145,
          requests_per_minute: 2847,
          error_rate: 0.12,
          uptime_percentage: 99.97
        },
        cdn_status: {
          global_regions: 8,
          cache_hit_rate: 94.2,
          bandwidth_usage: 78.5
        },
        monitoring: {
          alerts_last_24h: 3,
          incidents_resolved: 2,
          system_load: 67,
          memory_usage: 72
        }
      });
    } catch (error) {
      console.error('Error fetching infrastructure metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400 bg-green-400/10';
      case 'warning': return 'text-yellow-400 bg-yellow-400/10';
      case 'critical': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getPerformanceColor = (value: number, threshold: number = 80) => {
    if (value >= threshold) return 'text-green-400';
    if (value >= threshold * 0.7) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading infrastructure metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <ServerIcon className="w-8 h-8 text-green-400" />
            <h1 className="text-3xl font-bold text-white">Infrastructure Health</h1>
          </div>
          <p className="text-gray-400">
            Real-time monitoring of SecureNet platform infrastructure and performance
          </p>
          <div className="mt-4 p-4 bg-green-900/20 border border-green-700/30 rounded-lg">
            <p className="text-green-300 text-sm">
              👑 <strong>Founder View:</strong> Complete infrastructure overview including servers, databases, APIs, and global CDN status.
            </p>
          </div>
        </div>

        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <ServerIcon className="w-8 h-8 text-blue-400" />
              <span className={`text-2xl font-bold ${getPerformanceColor(metrics?.api_performance.uptime_percentage || 0, 99)}`}>
                {metrics?.api_performance.uptime_percentage}%
              </span>
            </div>
            <h3 className="text-white font-semibold">API Uptime</h3>
            <p className="text-gray-400 text-sm">Last 30 days</p>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <ClockIcon className="w-8 h-8 text-green-400" />
              <span className="text-2xl font-bold text-green-400">{metrics?.api_performance.avg_response_time}ms</span>
            </div>
            <h3 className="text-white font-semibold">Avg Response Time</h3>
            <p className="text-gray-400 text-sm">Global average</p>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <BoltIcon className="w-8 h-8 text-yellow-400" />
              <span className="text-2xl font-bold text-yellow-400">{metrics?.api_performance.requests_per_minute.toLocaleString()}</span>
            </div>
            <h3 className="text-white font-semibold">Requests/Min</h3>
            <p className="text-gray-400 text-sm">Current load</p>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-400" />
              <span className="text-2xl font-bold text-red-400">{metrics?.api_performance.error_rate}%</span>
            </div>
            <h3 className="text-white font-semibold">Error Rate</h3>
            <p className="text-gray-400 text-sm">Last 24 hours</p>
          </div>
        </div>

        {/* Server Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <ServerIcon className="w-6 h-6" />
              Server Fleet Status
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Total Servers</span>
                <span className="text-white font-bold">{metrics?.servers.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-400" />
                  <span className="text-gray-300">Healthy</span>
                </span>
                <span className="text-green-400 font-bold">{metrics?.servers.healthy}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />
                  <span className="text-gray-300">Warning</span>
                </span>
                <span className="text-yellow-400 font-bold">{metrics?.servers.warning}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
                  <span className="text-gray-300">Critical</span>
                </span>
                <span className="text-red-400 font-bold">{metrics?.servers.critical}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <CircleStackIcon className="w-6 h-6" />
              Database Health
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Primary Database</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(metrics?.databases.primary_status || 'healthy')}`}>
                  {metrics?.databases.primary_status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Replica Status</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(metrics?.databases.replica_status || 'healthy')}`}>
                  {metrics?.databases.replica_status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Connection Pool</span>
                <span className="text-white font-bold">{metrics?.databases.connection_pool}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Query Performance</span>
                <span className={`font-bold ${getPerformanceColor(metrics?.databases.query_performance || 0)}`}>
                  {metrics?.databases.query_performance}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CDN and Global Infrastructure */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <CloudIcon className="w-6 h-6" />
              Global CDN Status
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Active Regions</span>
                <span className="text-white font-bold">{metrics?.cdn_status.global_regions}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Cache Hit Rate</span>
                <span className={`font-bold ${getPerformanceColor(metrics?.cdn_status.cache_hit_rate || 0, 90)}`}>
                  {metrics?.cdn_status.cache_hit_rate}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Bandwidth Usage</span>
                <span className="text-white font-bold">{metrics?.cdn_status.bandwidth_usage}%</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <ChartBarIcon className="w-6 h-6" />
              System Monitoring
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Alerts (24h)</span>
                <span className="text-yellow-400 font-bold">{metrics?.monitoring.alerts_last_24h}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Incidents Resolved</span>
                <span className="text-green-400 font-bold">{metrics?.monitoring.incidents_resolved}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">System Load</span>
                <span className={`font-bold ${getPerformanceColor(100 - (metrics?.monitoring.system_load || 0), 50)}`}>
                  {metrics?.monitoring.system_load}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Memory Usage</span>
                <span className={`font-bold ${getPerformanceColor(100 - (metrics?.monitoring.memory_usage || 0), 50)}`}>
                  {metrics?.monitoring.memory_usage}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Recent Infrastructure Events</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
              <CheckCircleIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-white">Database replica synchronized successfully</p>
                <p className="text-gray-400 text-sm">2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
              <BoltIcon className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-white">Auto-scaling triggered: Added 2 new server instances</p>
                <p className="text-gray-400 text-sm">15 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
              <CloudIcon className="w-5 h-5 text-purple-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-white">CDN cache updated across all regions</p>
                <p className="text-gray-400 text-sm">1 hour ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformInfrastructurePage;