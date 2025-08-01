import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  CpuChipIcon,
  ServerIcon,
  WifiIcon,
  CircleStackIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { apiClient } from '../../../api/client';

interface UsageData {
  month: string;
  usage: Record<string, number>;
  quotas: Array<{
    resource_type: string;
    quota_limit: number;
  }>;
  overages: Record<string, {
    limit: number;
    usage: number;
    overage: number;
  }>;
}

interface UsageHistory {
  resource_type: string;
  month: string;
  total_usage: number;
}

const UsageTracker: React.FC = () => {
  const [currentUsage, setCurrentUsage] = useState<UsageData | null>(null);
  const [usageHistory, setUsageHistory] = useState<UsageHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current');

  useEffect(() => {
    fetchUsageData();
  }, []);

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      const [currentRes, historyRes] = await Promise.all([
        apiClient.get('/billing/usage/current'),
        apiClient.get('/billing/usage/history?months=6')
      ]);

      setCurrentUsage(currentRes.data as UsageData);
      setUsageHistory(historyRes.data as UsageHistory[]);
    } catch (err) {
      setError('Failed to load usage data');
      console.error('Usage data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getUsagePercentage = (usage: number, limit: number) => {
    return Math.min((usage / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-700 dark:text-red-400';
    if (percentage >= 75) return 'text-yellow-700 dark:text-yellow-400';
    return 'text-green-700 dark:text-green-400';
  };

  const getUsageBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-600';
    if (percentage >= 75) return 'bg-yellow-600';
    return 'bg-green-600';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getResourceIcon = (resourceType: string) => {
    switch (resourceType) {
      case 'users':
        return <CpuChipIcon className="w-5 h-5" />;
      case 'devices':
        return <ServerIcon className="w-5 h-5" />;
      case 'storage_gb':
        return <CircleStackIcon className="w-5 h-5" />;
      case 'api_calls':
        return <WifiIcon className="w-5 h-5" />;
      case 'alerts_per_month':
        return <BellIcon className="w-5 h-5" />;
      default:
        return <ChartBarIcon className="w-5 h-5" />;
    }
  };

  const getResourceName = (resourceType: string) => {
    const names: Record<string, string> = {
      'users': 'Users',
      'devices': 'Devices',
      'storage_gb': 'Storage (GB)',
      'api_calls': 'API Calls',
      'alerts_per_month': 'Alerts'
    };
    return names[resourceType] || resourceType;
  };

  const getQuotaForResource = (resourceType: string) => {
    if (!currentUsage?.quotas) return 0;
    const quota = currentUsage.quotas.find(q => q.resource_type === resourceType);
    return quota?.quota_limit || 0;
  };

  const getCurrentUsageForResource = (resourceType: string) => {
    return currentUsage?.usage[resourceType] || 0;
  };

  const getOverageForResource = (resourceType: string) => {
    return currentUsage?.overages[resourceType]?.overage || 0;
  };

  const getFilteredResources = () => {
    if (!currentUsage?.usage) return [];
    
    const resources = Object.keys(currentUsage.usage);
    if (selectedResource === 'all') return resources;
    return resources.filter(r => r === selectedResource);
  };

  const getUsageTrend = (resourceType: string) => {
    const history = usageHistory.filter(h => h.resource_type === resourceType);
    if (history.length < 2) return 'stable';
    
    const current = history[0]?.total_usage || 0;
    const previous = history[1]?.total_usage || 0;
    
    if (current > previous * 1.1) return 'up';
    if (current < previous * 0.9) return 'down';
    return 'stable';
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="card">
          <div className="loading-skeleton h-8 w-48 mb-4"></div>
          <div className="loading-skeleton h-32 w-full"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card">
              <div className="loading-skeleton h-6 w-32 mb-4"></div>
              <div className="space-y-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="loading-skeleton h-4 w-full"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card animate-fade-in-up">
        <div className="card-body text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Error Loading Usage Data</h3>
          <p className="text-slate-700 dark:text-gray-400 mb-4">{error}</p>
          <button 
            onClick={fetchUsageData}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Usage Tracker</h1>
          <p className="text-slate-700 dark:text-gray-400 mt-2">Monitor your resource consumption and quotas</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn-secondary">
            <CalendarIcon className="w-5 h-5 mr-2" />
            Export Report
          </button>
          <button className="btn-primary">
            <ChartBarIcon className="w-5 h-5 mr-2" />
            Usage Analytics
          </button>
        </div>
      </div>

      {/* Usage Overview */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Current Month Usage</h2>
          <p className="text-slate-700 dark:text-gray-400 mt-1">Resource consumption for {currentUsage?.month || 'current month'}</p>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getFilteredResources().map((resourceType) => {
              const currentUsage = getCurrentUsageForResource(resourceType);
              const quota = getQuotaForResource(resourceType);
              const percentage = getUsagePercentage(currentUsage, quota);
              const overage = getOverageForResource(resourceType);
              const trend = getUsageTrend(resourceType);

              return (
                <div key={resourceType} className="card hover:shadow-lg transition-all duration-300">
                  <div className="card-body">
                    {/* Resource Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/20">
                          <div className="text-blue-700 dark:text-blue-400">
                            {getResourceIcon(resourceType)}
                          </div>
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {getResourceName(resourceType)}
                          </h3>
                          <p className="text-sm text-slate-700 dark:text-gray-400">
                            {formatNumber(currentUsage)} / {formatNumber(quota)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {trend === 'up' && <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />}
                        {trend === 'down' && <ArrowTrendingDownIcon className="w-4 h-4 text-red-600" />}
                        {trend === 'stable' && <ClockIcon className="w-4 h-4 text-slate-500" />}
                      </div>
                    </div>

                    {/* Usage Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-800 dark:text-gray-300">
                          Usage
                        </span>
                        <span className={`text-sm font-semibold ${getUsageColor(percentage)}`}>
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-300 rounded-full h-2 dark:bg-gray-700">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${getUsageBarColor(percentage)}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Usage Details */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-700 dark:text-gray-400">Used</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {formatNumber(currentUsage)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-700 dark:text-gray-400">Limit</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {formatNumber(quota)}
                        </span>
                      </div>
                      {overage > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-red-700 dark:text-red-400">Overage</span>
                          <span className="font-medium text-red-700 dark:text-red-400">
                            +{formatNumber(overage)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Status Indicator */}
                    <div className="mt-4 pt-4 border-t border-slate-300 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700 dark:text-gray-400">Status</span>
                        <div className="flex items-center space-x-2">
                          {percentage >= 90 ? (
                            <div className="flex items-center space-x-1">
                              <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
                              <span className="text-sm font-medium text-red-700 dark:text-red-400">Critical</span>
                            </div>
                          ) : percentage >= 75 ? (
                            <div className="flex items-center space-x-1">
                              <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600" />
                              <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Warning</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1">
                              <CheckCircleIcon className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-medium text-green-700 dark:text-green-400">Good</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Usage History Chart */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Usage History</h2>
          <p className="text-slate-700 dark:text-gray-400 mt-1">6-month usage trends by resource type</p>
        </div>
        <div className="card-body">
          <div className="space-y-6">
            {Object.keys(currentUsage?.usage || {}).map((resourceType) => {
              const history = usageHistory
                .filter(h => h.resource_type === resourceType)
                .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
                .slice(-6);

              return (
                <div key={resourceType} className="p-6 bg-slate-100 rounded-2xl dark:bg-gray-800">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/20">
                      <div className="text-blue-700 dark:text-blue-400">
                        {getResourceIcon(resourceType)}
                      </div>
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {getResourceName(resourceType)} Usage Trend
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-6 gap-4">
                    {history.map((item, index) => {
                      const month = new Date(item.month).toLocaleDateString('en-US', { month: 'short' });
                      const maxUsage = Math.max(...history.map(h => h.total_usage));
                      const height = maxUsage > 0 ? (item.total_usage / maxUsage) * 100 : 0;
                      
                      return (
                        <div key={index} className="text-center">
                          <div className="mb-2">
                            <div className="w-full bg-slate-300 rounded-lg dark:bg-gray-700" style={{ height: '120px' }}>
                              <div
                                className="bg-gradient-to-t from-blue-600 to-blue-700 rounded-lg transition-all duration-300"
                                style={{ height: `${height}%` }}
                              ></div>
                            </div>
                          </div>
                          <p className="text-xs font-medium text-slate-800 dark:text-gray-300">{month}</p>
                          <p className="text-xs text-slate-700 dark:text-gray-400">
                            {formatNumber(item.total_usage)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Resource Filter */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Filter Resources</h2>
          <p className="text-slate-700 dark:text-gray-400 mt-1">View specific resource types</p>
        </div>
        <div className="card-body">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedResource('all')}
              className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                selectedResource === 'all'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              All Resources
            </button>
            {Object.keys(currentUsage?.usage || {}).map((resourceType) => (
              <button
                key={resourceType}
                onClick={() => setSelectedResource(resourceType)}
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 ${
                  selectedResource === resourceType
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <div className="text-blue-700 dark:text-blue-400">
                  {getResourceIcon(resourceType)}
                </div>
                <span>{getResourceName(resourceType)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageTracker; 