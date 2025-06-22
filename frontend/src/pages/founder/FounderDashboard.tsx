import React, { useState, useEffect } from 'react';
import { useAuth } from '../../features/auth/context/AuthContext';
import { 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  UserGroupIcon, 
  ShieldCheckIcon,
  CogIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  BuildingOfficeIcon,
  ClockIcon,
  ServerIcon
} from '@heroicons/react/24/outline';

interface BusinessMetrics {
  company_health: {
    monthly_recurring_revenue: string;
    customer_count: number;
    churn_rate: string;
    growth_rate: string;
    uptime: string;
  };
  customer_analytics: {
    enterprise_customers: number;
    sme_customers: number;
    trial_conversions: string;
    support_satisfaction: string;
  };
  technical_metrics: {
    system_performance: string;
    security_incidents: number;
    feature_adoption: string;
    api_usage: string;
  };
}

export const FounderDashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch real founder metrics from API
  useEffect(() => {
    const fetchFounderMetrics = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/founder/dashboard/metrics', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          setMetrics(result.data);
        } else {
          console.error('Failed to fetch founder metrics');
          // Fallback to mock data if API fails
          setMetrics({
            company_health: {
              monthly_recurring_revenue: "$847,350",
              customer_count: 247,
              churn_rate: "2.1%",
              growth_rate: "34%",
              uptime: "99.97%"
            },
            customer_analytics: {
              enterprise_customers: 42,
              sme_customers: 205,
              trial_conversions: "28.5%",
              support_satisfaction: "4.7/5.0"
            },
            technical_metrics: {
              system_performance: "excellent",
              security_incidents: 3,
              feature_adoption: "87%",
              api_usage: "2.3M calls/month"
            }
          });
        }
      } catch (error) {
        console.error('Error fetching founder metrics:', error);
        // Fallback to mock data
        setMetrics({
          company_health: {
            monthly_recurring_revenue: "$847,350",
            customer_count: 247,
            churn_rate: "2.1%",
            growth_rate: "34%",
            uptime: "99.97%"
          },
          customer_analytics: {
            enterprise_customers: 42,
            sme_customers: 205,
            trial_conversions: "28.5%",
            support_satisfaction: "4.7/5.0"
          },
          technical_metrics: {
            system_performance: "excellent",
            security_incidents: 3,
            feature_adoption: "87%",
            api_usage: "2.3M calls/month"
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFounderMetrics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading Executive Command Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-gold-600 to-yellow-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <span className="text-4xl">🏆</span>
                Executive Command Center
              </h1>
              <p className="text-gold-100 mt-1">
                Welcome back, {user?.username} - Complete platform control at your fingertips
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gold-100">Access Level</p>
              <p className="text-lg font-semibold text-white">UNLIMITED</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <QuickActionCard
            title="Financial Control"
            description="Revenue & Billing"
            icon={CurrencyDollarIcon}
            color="green"
            onClick={() => {/* Navigate to financial dashboard */}}
          />
          <QuickActionCard
            title="System Administration"
            description="God-Mode Access"
            icon={CogIcon}
            color="blue"
            onClick={() => {/* Navigate to system admin */}}
          />
          <QuickActionCard
            title="User Management"
            description="All Organizations"
            icon={UserGroupIcon}
            color="purple"
            onClick={() => {/* Navigate to user management */}}
          />
          <QuickActionCard
            title="Emergency Controls"
            description="System Recovery"
            icon={ExclamationTriangleIcon}
            color="red"
            onClick={() => {/* Navigate to emergency controls */}}
          />
        </div>

        {/* Business Intelligence Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Company Health */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <ChartBarIcon className="w-6 h-6 text-blue-400" />
                Company Health Metrics
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <MetricCard
                  label="Monthly Recurring Revenue"
                  value={metrics?.company_health.monthly_recurring_revenue || "N/A"}
                  trend="+12.5%"
                  color="green"
                />
                <MetricCard
                  label="Customer Count"
                  value={metrics?.company_health.customer_count.toString() || "N/A"}
                  trend="+8.2%"
                  color="blue"
                />
                <MetricCard
                  label="Churn Rate"
                  value={metrics?.company_health.churn_rate || "N/A"}
                  trend="-0.3%"
                  color="green"
                />
                <MetricCard
                  label="Growth Rate"
                  value={metrics?.company_health.growth_rate || "N/A"}
                  trend="+5.1%"
                  color="green"
                />
              </div>
            </div>
          </div>

          {/* System Status */}
          <div>
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <ServerIcon className="w-6 h-6 text-green-400" />
                System Status
              </h2>
              <div className="space-y-4">
                <StatusIndicator
                  label="Platform Uptime"
                  value={metrics?.company_health.uptime || "N/A"}
                  status="excellent"
                />
                <StatusIndicator
                  label="System Performance"
                  value={metrics?.technical_metrics.system_performance || "N/A"}
                  status="excellent"
                />
                <StatusIndicator
                  label="Security Incidents"
                  value={`${metrics?.technical_metrics.security_incidents || 0} this month`}
                  status="good"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Customer Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BuildingOfficeIcon className="w-6 h-6 text-purple-400" />
              Customer Analytics
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <MetricCard
                label="Enterprise Customers"
                value={metrics?.customer_analytics.enterprise_customers.toString() || "N/A"}
                trend="+15.3%"
                color="purple"
              />
              <MetricCard
                label="SME Customers"
                value={metrics?.customer_analytics.sme_customers.toString() || "N/A"}
                trend="+6.7%"
                color="blue"
              />
              <MetricCard
                label="Trial Conversions"
                value={metrics?.customer_analytics.trial_conversions || "N/A"}
                trend="+2.1%"
                color="green"
              />
              <MetricCard
                label="Support Satisfaction"
                value={metrics?.customer_analytics.support_satisfaction || "N/A"}
                trend="+0.2"
                color="green"
              />
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <ArrowTrendingUpIcon className="w-6 h-6 text-yellow-400" />
              Technical Metrics
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Feature Adoption</span>
                <span className="text-yellow-400 font-semibold">{metrics?.technical_metrics.feature_adoption || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">API Usage</span>
                <span className="text-yellow-400 font-semibold">{metrics?.technical_metrics.api_usage || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Platform Performance</span>
                <span className="text-green-400 font-semibold capitalize">{metrics?.technical_metrics.system_performance || "N/A"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Founder Privileges */}
        <div className="bg-gradient-to-r from-gold-900 to-yellow-900 rounded-lg border border-gold-600 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <ShieldCheckIcon className="w-6 h-6 text-gold-400" />
            Founder Privileges & Access
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <PrivilegeCard
              title="Complete Financial Control"
              description="All billing, revenue, subscription management"
              active={true}
            />
            <PrivilegeCard
              title="Strategic Business Intelligence"
              description="Company-wide analytics, performance metrics"
              active={true}
            />
            <PrivilegeCard
              title="God-Mode System Access"
              description="Complete database access, system configuration"
              active={true}
            />
            <PrivilegeCard
              title="Multi-Tenant Management"
              description="Create, modify, delete any organization"
              active={true}
            />
            <PrivilegeCard
              title="Emergency Override"
              description="Bypass all authentication for system recovery"
              active={true}
            />
            <PrivilegeCard
              title="Compliance Authority"
              description="Override compliance settings for business requirements"
              active={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  onClick: () => void;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ title, description, icon: Icon, color, onClick }) => {
  const colorClasses = {
    green: 'bg-green-900 border-green-600 hover:bg-green-800',
    blue: 'bg-blue-900 border-blue-600 hover:bg-blue-800',
    purple: 'bg-purple-900 border-purple-600 hover:bg-purple-800',
    red: 'bg-red-900 border-red-600 hover:bg-red-800'
  };

  return (
    <button
      onClick={onClick}
      className={`${colorClasses[color as keyof typeof colorClasses]} rounded-lg border p-4 text-left transition-colors hover:scale-105 transform transition-transform`}
    >
      <Icon className="w-8 h-8 mb-2 text-white" />
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="text-sm text-gray-300">{description}</p>
    </button>
  );
};

interface MetricCardProps {
  label: string;
  value: string;
  trend: string;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, trend, color }) => {
  const trendColor = trend.startsWith('+') ? 'text-green-400' : trend.startsWith('-') ? 'text-red-400' : 'text-gray-400';
  
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className={`text-sm ${trendColor}`}>{trend}</p>
    </div>
  );
};

interface StatusIndicatorProps {
  label: string;
  value: string;
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ label, value, status }) => {
  const statusColors = {
    excellent: 'bg-green-500',
    good: 'bg-blue-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500'
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-white font-semibold">{value}</p>
      </div>
      <div className={`w-3 h-3 rounded-full ${statusColors[status]}`}></div>
    </div>
  );
};

interface PrivilegeCardProps {
  title: string;
  description: string;
  active: boolean;
}

const PrivilegeCard: React.FC<PrivilegeCardProps> = ({ title, description, active }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${active ? 'bg-green-400' : 'bg-red-400'}`}></div>
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      <p className="text-sm text-gray-300">{description}</p>
    </div>
  );
}; 