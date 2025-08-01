import React, { useState, useEffect } from 'react';
import { useAuth } from '../../features/auth/context/AuthContext';
import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UsersIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  BoltIcon,
  EyeIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface AnalyticsMetrics {
  business_overview: {
    total_customers: number;
    monthly_growth_rate: number;
    total_revenue_mtd: number;
    revenue_growth_rate: number;
    customer_acquisition_cost: number;
    lifetime_value: number;
  };
  platform_usage: {
    daily_active_users: number;
    monthly_active_users: number;
    total_api_calls_today: number;
    peak_concurrent_users: number;
    average_session_duration: number;
    feature_adoption_rates: {
      security_scans: number;
      network_monitoring: number;
      anomaly_detection: number;
      vulnerability_management: number;
    };
  };
  customer_segmentation: {
    enterprise: { count: number; percentage: number };
    business: { count: number; percentage: number };
    professional: { count: number; percentage: number };
    starter: { count: number; percentage: number };
  };
  geographic_distribution: {
    north_america: number;
    europe: number;
    asia_pacific: number;
    other: number;
  };
}

const PlatformAnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchAnalyticsMetrics();
  }, [timeRange]);

  const fetchAnalyticsMetrics = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would fetch from analytics APIs
      setMetrics({
        business_overview: {
          total_customers: 2847,
          monthly_growth_rate: 18.4,
          total_revenue_mtd: 892350,
          revenue_growth_rate: 23.7,
          customer_acquisition_cost: 247,
          lifetime_value: 14280
        },
        platform_usage: {
          daily_active_users: 1842,
          monthly_active_users: 12456,
          total_api_calls_today: 2847691,
          peak_concurrent_users: 456,
          average_session_duration: 24.7,
          feature_adoption_rates: {
            security_scans: 87.3,
            network_monitoring: 92.1,
            anomaly_detection: 76.8,
            vulnerability_management: 83.5
          }
        },
        customer_segmentation: {
          enterprise: { count: 284, percentage: 32.1 },
          business: { count: 456, percentage: 28.7 },
          professional: { count: 678, percentage: 24.9 },
          starter: { count: 892, percentage: 14.3 }
        },
        geographic_distribution: {
          north_america: 45.2,
          europe: 28.7,
          asia_pacific: 18.9,
          other: 7.2
        }
      });
    } catch (error) {
      console.error('Error fetching analytics metrics:', error);
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

  const getTrendIcon = (rate: number) => {
    return rate > 0 ? 
      <ArrowTrendingUpIcon className="w-5 h-5 text-green-400" /> :
      <ArrowTrendingDownIcon className="w-5 h-5 text-red-400" />;
  };

  const getTrendColor = (rate: number) => {
    return rate > 0 ? 'text-green-400' : 'text-red-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <ChartBarIcon className="w-8 h-8 text-purple-400" />
                <h1 className="text-3xl font-bold text-white">Business Intelligence</h1>
              </div>
              <p className="text-gray-400">
                Strategic analytics and insights across the entire SecureNet platform
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select 
                value={timeRange} 
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 3 Months</option>
              </select>
            </div>
          </div>
          <div className="mt-4 p-4 bg-purple-900/20 border border-purple-700/30 rounded-lg">
            <p className="text-purple-300 text-sm">
              👑 <strong>Founder View:</strong> Comprehensive business analytics including revenue, customer behavior, and platform usage metrics.
            </p>
          </div>
        </div>

        {/* Business Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <BuildingOfficeIcon className="w-8 h-8 text-blue-400" />
              <div className="flex items-center gap-1">
                {getTrendIcon(metrics?.business_overview.monthly_growth_rate || 0)}
                <span className={`text-sm font-medium ${getTrendColor(metrics?.business_overview.monthly_growth_rate || 0)}`}>
                  +{metrics?.business_overview.monthly_growth_rate}%
                </span>
              </div>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {formatNumber(metrics?.business_overview.total_customers || 0)}
            </div>
            <p className="text-gray-400 text-sm">Total Customers</p>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <CurrencyDollarIcon className="w-8 h-8 text-green-400" />
              <div className="flex items-center gap-1">
                {getTrendIcon(metrics?.business_overview.revenue_growth_rate || 0)}
                <span className={`text-sm font-medium ${getTrendColor(metrics?.business_overview.revenue_growth_rate || 0)}`}>
                  +{metrics?.business_overview.revenue_growth_rate}%
                </span>
              </div>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {formatCurrency(metrics?.business_overview.total_revenue_mtd || 0)}
            </div>
            <p className="text-gray-400 text-sm">Revenue MTD</p>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <UsersIcon className="w-8 h-8 text-purple-400" />
              <EyeIcon className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {formatNumber(metrics?.platform_usage.daily_active_users || 0)}
            </div>
            <p className="text-gray-400 text-sm">Daily Active Users</p>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <BoltIcon className="w-8 h-8 text-yellow-400" />
              <GlobeAltIcon className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {formatNumber(metrics?.platform_usage.total_api_calls_today || 0)}
            </div>
            <p className="text-gray-400 text-sm">API Calls Today</p>
          </div>
        </div>

        {/* Customer Segmentation and Geographic Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Customer Segmentation</h2>
            <div className="space-y-4">
              {Object.entries(metrics?.customer_segmentation || {}).map(([tier, data]) => (
                <div key={tier} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      tier === 'enterprise' ? 'bg-purple-400' :
                      tier === 'business' ? 'bg-blue-400' :
                      tier === 'professional' ? 'bg-green-400' : 'bg-yellow-400'
                    }`}></div>
                    <span className="text-gray-300 capitalize">{tier}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold">{data.count}</div>
                    <div className="text-gray-400 text-sm">{data.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Geographic Distribution</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">North America</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-gray-800 rounded-full h-2">
                    <div 
                      className="bg-blue-400 h-2 rounded-full" 
                      style={{ width: `${metrics?.geographic_distribution.north_america}%` }}
                    ></div>
                  </div>
                  <span className="text-white font-bold w-12 text-right">
                    {metrics?.geographic_distribution.north_america}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Europe</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-gray-800 rounded-full h-2">
                    <div 
                      className="bg-green-400 h-2 rounded-full" 
                      style={{ width: `${metrics?.geographic_distribution.europe}%` }}
                    ></div>
                  </div>
                  <span className="text-white font-bold w-12 text-right">
                    {metrics?.geographic_distribution.europe}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Asia Pacific</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-gray-800 rounded-full h-2">
                    <div 
                      className="bg-purple-400 h-2 rounded-full" 
                      style={{ width: `${metrics?.geographic_distribution.asia_pacific}%` }}
                    ></div>
                  </div>
                  <span className="text-white font-bold w-12 text-right">
                    {metrics?.geographic_distribution.asia_pacific}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Other Regions</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-gray-800 rounded-full h-2">
                    <div 
                      className="bg-yellow-400 h-2 rounded-full" 
                      style={{ width: `${metrics?.geographic_distribution.other}%` }}
                    ></div>
                  </div>
                  <span className="text-white font-bold w-12 text-right">
                    {metrics?.geographic_distribution.other}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Adoption and Key Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Feature Adoption Rates</h2>
            <div className="space-y-4">
              {Object.entries(metrics?.platform_usage.feature_adoption_rates || {}).map(([feature, rate]) => (
                <div key={feature} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 capitalize">{feature.replace('_', ' ')}</span>
                    <span className="text-white font-bold">{rate}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${rate}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Key Performance Indicators</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Customer Acquisition Cost</span>
                <span className="text-white font-bold">
                  {formatCurrency(metrics?.business_overview.customer_acquisition_cost || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Customer Lifetime Value</span>
                <span className="text-white font-bold">
                  {formatCurrency(metrics?.business_overview.lifetime_value || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Peak Concurrent Users</span>
                <span className="text-white font-bold">
                  {formatNumber(metrics?.platform_usage.peak_concurrent_users || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Avg Session Duration</span>
                <span className="text-white font-bold">
                  {metrics?.platform_usage.average_session_duration} min
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Monthly Active Users</span>
                <span className="text-white font-bold">
                  {formatNumber(metrics?.platform_usage.monthly_active_users || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Insights */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <DocumentTextIcon className="w-6 h-6" />
            Strategic Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-900/20 border border-green-700/30 rounded-lg">
              <h3 className="text-green-400 font-semibold mb-2">Revenue Growth</h3>
              <p className="text-gray-300 text-sm">
                Strong {metrics?.business_overview.revenue_growth_rate}% month-over-month growth driven by enterprise segment expansion.
              </p>
            </div>
            <div className="p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
              <h3 className="text-blue-400 font-semibold mb-2">Feature Adoption</h3>
              <p className="text-gray-300 text-sm">
                Network monitoring leads adoption at {metrics?.platform_usage.feature_adoption_rates.network_monitoring}%, indicating strong infrastructure focus.
              </p>
            </div>
            <div className="p-4 bg-purple-900/20 border border-purple-700/30 rounded-lg">
              <h3 className="text-purple-400 font-semibold mb-2">Market Expansion</h3>
              <p className="text-gray-300 text-sm">
                Asia Pacific showing rapid growth potential with {metrics?.geographic_distribution.asia_pacific}% market share.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformAnalyticsPage;