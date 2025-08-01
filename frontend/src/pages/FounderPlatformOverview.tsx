import React, { useState, useEffect } from 'react';
import { useAuth } from '../features/auth/context/AuthContext';
import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  UsersIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  ServerIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  BoltIcon,
  FireIcon
} from '@heroicons/react/24/outline';

interface PlatformOverviewMetrics {
  business: {
    total_customers: number;
    customer_growth_rate: number;
    mrr: number;
    arr: number;
    revenue_growth_rate: number;
  };
  platform_health: {
    overall_uptime: number;
    api_response_time: number;
    total_api_calls_today: number;
    error_rate: number;
  };
  security_overview: {
    total_threats_blocked_today: number;
    customers_with_active_threats: number;
    platform_security_score: number;
    critical_vulnerabilities: number;
  };
  infrastructure: {
    total_servers: number;
    healthy_servers: number;
    database_health: number;
    cdn_performance: number;
  };
  customer_activity: {
    daily_active_organizations: number;
    peak_concurrent_users: number;
    feature_adoption_rate: number;
  };
}

const FounderPlatformOverview: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<PlatformOverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlatformMetrics();
    // Refresh every 60 seconds
    const interval = setInterval(fetchPlatformMetrics, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchPlatformMetrics = async () => {
    try {
      setLoading(true);
      // In real implementation, this would aggregate data from all customers
      setMetrics({
        business: {
          total_customers: 2847,
          customer_growth_rate: 18.4,
          mrr: 487000,
          arr: 5844000,
          revenue_growth_rate: 23.7
        },
        platform_health: {
          overall_uptime: 99.97,
          api_response_time: 145,
          total_api_calls_today: 2847691,
          error_rate: 0.12
        },
        security_overview: {
          total_threats_blocked_today: 1847,
          customers_with_active_threats: 12,
          platform_security_score: 94.2,
          critical_vulnerabilities: 3
        },
        infrastructure: {
          total_servers: 24,
          healthy_servers: 23,
          database_health: 97.8,
          cdn_performance: 94.1
        },
        customer_activity: {
          daily_active_organizations: 1842,
          peak_concurrent_users: 4567,
          feature_adoption_rate: 87.3
        }
      });
    } catch (error) {
      console.error('Error fetching platform metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getHealthColor = (value: number, threshold: number = 95) => {
    if (value >= threshold) return 'text-green-400';
    if (value >= threshold * 0.8) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading platform overview...</p>
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
            <ChartBarIcon className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">Platform Overview</h1>
          </div>
          <p className="text-gray-400 mb-4">
            Strategic command center for the entire SecureNet platform
          </p>
          <div className="p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
            <p className="text-blue-300 text-sm">
              👑 <strong>Founder Command Center:</strong> Real-time platform-wide metrics across all {formatNumber(metrics?.business.total_customers || 0)} customers and global infrastructure.
            </p>
          </div>
        </div>

        {/* Key Business Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <BuildingOfficeIcon className="w-8 h-8 text-blue-400" />
              <div className="flex items-center gap-1">
                <ArrowTrendingUpIcon className="w-5 h-5 text-green-400" />
                <span className="text-sm font-medium text-green-400">+{metrics?.business.customer_growth_rate}%</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {formatNumber(metrics?.business.total_customers || 0)}
            </div>
            <p className="text-gray-400 text-sm">Total Customers</p>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <CurrencyDollarIcon className="w-8 h-8 text-green-400" />
              <div className="flex items-center gap-1">
                <ArrowTrendingUpIcon className="w-5 h-5 text-green-400" />
                <span className="text-sm font-medium text-green-400">+{metrics?.business.revenue_growth_rate}%</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {formatCurrency(metrics?.business.mrr || 0)}
            </div>
            <p className="text-gray-400 text-sm">Monthly Recurring Revenue</p>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <UsersIcon className="w-8 h-8 text-purple-400" />
              <BoltIcon className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {formatNumber(metrics?.customer_activity.daily_active_organizations || 0)}
            </div>
            <p className="text-gray-400 text-sm">Active Organizations Today</p>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <ServerIcon className="w-8 h-8 text-orange-400" />
              <span className={`text-sm font-medium ${getHealthColor(metrics?.platform_health.overall_uptime || 0, 99)}`}>
                {metrics?.platform_health.overall_uptime}%
              </span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {formatNumber(metrics?.platform_health.total_api_calls_today || 0)}
            </div>
            <p className="text-gray-400 text-sm">API Calls Today</p>
          </div>
        </div>

        {/* Platform Health Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <ShieldCheckIcon className="w-6 h-6 text-green-400" />
              Platform Security Status
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Threats Blocked Today</span>
                <span className="text-green-400 font-bold">{formatNumber(metrics?.security_overview.total_threats_blocked_today || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Customers with Active Threats</span>
                <span className="text-yellow-400 font-bold">{metrics?.security_overview.customers_with_active_threats}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Platform Security Score</span>
                <span className={`font-bold ${getHealthColor(metrics?.security_overview.platform_security_score || 0)}`}>
                  {metrics?.security_overview.platform_security_score}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Critical Vulnerabilities</span>
                <span className="text-red-400 font-bold">{metrics?.security_overview.critical_vulnerabilities}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <ServerIcon className="w-6 h-6 text-blue-400" />
              Infrastructure Health
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Server Fleet</span>
                <span className="text-white font-bold">{metrics?.infrastructure.healthy_servers}/{metrics?.infrastructure.total_servers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Database Health</span>
                <span className={`font-bold ${getHealthColor(metrics?.infrastructure.database_health || 0)}`}>
                  {metrics?.infrastructure.database_health}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">CDN Performance</span>
                <span className={`font-bold ${getHealthColor(metrics?.infrastructure.cdn_performance || 0)}`}>
                  {metrics?.infrastructure.cdn_performance}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">API Response Time</span>
                <span className="text-white font-bold">{metrics?.platform_health.api_response_time}ms</span>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue & Growth Analytics */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <CurrencyDollarIcon className="w-6 h-6 text-green-400" />
            Revenue Analytics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">
                {formatCurrency(metrics?.business.arr || 0)}
              </div>
              <p className="text-gray-400">Annual Recurring Revenue</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">
                {formatNumber(metrics?.customer_activity.peak_concurrent_users || 0)}
              </div>
              <p className="text-gray-400">Peak Concurrent Users</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">
                {metrics?.customer_activity.feature_adoption_rate}%
              </div>
              <p className="text-gray-400">Feature Adoption Rate</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <a href="/platform/security" className="bg-red-900/20 border border-red-700/30 rounded-lg p-4 hover:bg-red-900/30 transition-colors">
            <FireIcon className="w-6 h-6 text-red-400 mb-2" />
            <h3 className="text-red-400 font-semibold">Security Center</h3>
            <p className="text-gray-400 text-sm">Global threat monitoring</p>
          </a>
          <a href="/platform/infrastructure" className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4 hover:bg-blue-900/30 transition-colors">
            <ServerIcon className="w-6 h-6 text-blue-400 mb-2" />
            <h3 className="text-blue-400 font-semibold">Infrastructure</h3>
            <p className="text-gray-400 text-sm">Platform health monitoring</p>
          </a>
          <a href="/platform/analytics" className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4 hover:bg-purple-900/30 transition-colors">
            <ChartBarIcon className="w-6 h-6 text-purple-400 mb-2" />
            <h3 className="text-purple-400 font-semibold">Analytics</h3>
            <p className="text-gray-400 text-sm">Business intelligence</p>
          </a>
          <a href="/founder/financial" className="bg-green-900/20 border border-green-700/30 rounded-lg p-4 hover:bg-green-900/30 transition-colors">
            <CurrencyDollarIcon className="w-6 h-6 text-green-400 mb-2" />
            <h3 className="text-green-400 font-semibold">Financial Control</h3>
            <p className="text-gray-400 text-sm">Strategic financial overview</p>
          </a>
        </div>
      </div>
    </div>
  );
};

export default FounderPlatformOverview;