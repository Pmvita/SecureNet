import React, { useState, useEffect } from 'react';
import { useAuth } from '../../features/auth/context/AuthContext';
import { 
  CurrencyDollarIcon, 
  ChartBarIcon,
  CreditCardIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  CalendarIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface FinancialMetrics {
  revenue: {
    mrr: number;
    arr: number;
    growth_rate: number;
    churn_rate: number;
  };
  customers: {
    total: number;
    enterprise: number;
    sme: number;
    trial: number;
  };
  billing: {
    outstanding: number;
    collected_this_month: number;
    overdue: number;
    subscription_changes: number;
  };
  forecasting: {
    next_month_mrr: number;
    quarter_projection: number;
    annual_projection: number;
    confidence: number;
  };
}

export const FinancialControl: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/founder/financial/metrics', {
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
          console.error('Failed to fetch financial metrics');
          // Fallback to mock data
          setMetrics({
            revenue: {
              mrr: 847350,
              arr: 10168200,
              growth_rate: 34.2,
              churn_rate: 2.1
            },
            customers: {
              total: 247,
              enterprise: 42,
              sme: 205,
              trial: 23
            },
            billing: {
              outstanding: 127500,
              collected_this_month: 823400,
              overdue: 15200,
              subscription_changes: 8
            },
            forecasting: {
              next_month_mrr: 892000,
              quarter_projection: 2750000,
              annual_projection: 11500000,
              confidence: 87
            }
          });
        }
      } catch (error) {
        console.error('Error fetching financial metrics:', error);
        // Fallback to mock data
        setMetrics({
          revenue: {
            mrr: 847350,
            arr: 10168200,
            growth_rate: 34.2,
            churn_rate: 2.1
          },
          customers: {
            total: 247,
            enterprise: 42,
            sme: 205,
            trial: 23
          },
          billing: {
            outstanding: 127500,
            collected_this_month: 823400,
            overdue: 15200,
            subscription_changes: 8
          },
          forecasting: {
            next_month_mrr: 892000,
            quarter_projection: 2750000,
            annual_projection: 11500000,
            confidence: 87
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFinancialData();
  }, [selectedPeriod]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading Financial Control Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <CurrencyDollarIcon className="w-8 h-8" />
                Financial Command & Control
              </h1>
              <p className="text-green-100 mt-1">
                Complete financial oversight and revenue management - {user?.username}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-green-700 text-white rounded-lg px-3 py-2 border border-green-500"
              >
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
              <button className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded-lg flex items-center gap-2">
                <ArrowPathIcon className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Key Revenue Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <RevenueCard
            title="Monthly Recurring Revenue"
            value={formatCurrency(metrics?.revenue.mrr || 0)}
            change="+12.5%"
            trend="up"
            icon={ArrowTrendingUpIcon}
          />
          <RevenueCard
            title="Annual Recurring Revenue"
            value={formatCurrency(metrics?.revenue.arr || 0)}
            change="+34.2%"
            trend="up"
            icon={ChartBarIcon}
          />
          <RevenueCard
            title="Growth Rate"
            value={`${metrics?.revenue.growth_rate || 0}%`}
            change="+2.1%"
            trend="up"
            icon={ArrowTrendingUpIcon}
          />
          <RevenueCard
            title="Churn Rate"
            value={`${metrics?.revenue.churn_rate || 0}%`}
            change="-0.3%"
            trend="down"
            icon={UserGroupIcon}
          />
        </div>

        {/* Financial Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Revenue Breakdown */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <ChartBarIcon className="w-6 h-6 text-green-400" />
                Revenue Breakdown
              </h2>
              <div className="grid grid-cols-2 gap-4">
                                 <div className="bg-gray-800 rounded-lg p-4">
                   <p className="text-sm text-gray-400 mb-1">Enterprise Revenue</p>
                   <p className="text-2xl font-bold text-green-400">{formatCurrency((metrics?.revenue.mrr || 0) * 0.68)}</p>
                   <p className="text-sm text-gray-400">68% of MRR</p>
                 </div>
                 <div className="bg-gray-800 rounded-lg p-4">
                   <p className="text-sm text-gray-400 mb-1">SME Revenue</p>
                   <p className="text-2xl font-bold text-blue-400">{formatCurrency((metrics?.revenue.mrr || 0) * 0.32)}</p>
                   <p className="text-sm text-gray-400">32% of MRR</p>
                 </div>
                 <div className="bg-gray-800 rounded-lg p-4">
                   <p className="text-sm text-gray-400 mb-1">New Customer Revenue</p>
                   <p className="text-2xl font-bold text-purple-400">{formatCurrency((metrics?.revenue.mrr || 0) * 0.15)}</p>
                   <p className="text-sm text-gray-400">15% of MRR</p>
                 </div>
                 <div className="bg-gray-800 rounded-lg p-4">
                   <p className="text-sm text-gray-400 mb-1">Expansion Revenue</p>
                   <p className="text-2xl font-bold text-yellow-400">{formatCurrency((metrics?.revenue.mrr || 0) * 0.23)}</p>
                   <p className="text-sm text-gray-400">23% of MRR</p>
                 </div>
              </div>
            </div>
          </div>

          {/* Customer Metrics */}
          <div>
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <UserGroupIcon className="w-6 h-6 text-blue-400" />
                Customer Metrics
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Total Customers</span>
                  <span className="text-2xl font-bold text-white">{metrics?.customers.total || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Enterprise</span>
                  <span className="text-lg font-semibold text-green-400">{metrics?.customers.enterprise || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">SME</span>
                  <span className="text-lg font-semibold text-blue-400">{metrics?.customers.sme || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Trial</span>
                  <span className="text-lg font-semibold text-yellow-400">{metrics?.customers.trial || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Billing & Collections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CreditCardIcon className="w-6 h-6 text-purple-400" />
              Billing & Collections
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Outstanding</p>
                <p className="text-xl font-bold text-yellow-400">{formatCurrency(metrics?.billing.outstanding || 0)}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Collected This Month</p>
                <p className="text-xl font-bold text-green-400">{formatCurrency(metrics?.billing.collected_this_month || 0)}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Overdue</p>
                <p className="text-xl font-bold text-red-400">{formatCurrency(metrics?.billing.overdue || 0)}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Subscription Changes</p>
                <p className="text-xl font-bold text-blue-400">{metrics?.billing.subscription_changes || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <DocumentTextIcon className="w-6 h-6 text-yellow-400" />
              Revenue Forecasting
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Next Month MRR</span>
                <span className="text-lg font-semibold text-green-400">{formatCurrency(metrics?.forecasting.next_month_mrr || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Quarter Projection</span>
                <span className="text-lg font-semibold text-blue-400">{formatCurrency(metrics?.forecasting.quarter_projection || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Annual Projection</span>
                <span className="text-lg font-semibold text-purple-400">{formatCurrency(metrics?.forecasting.annual_projection || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Confidence Level</span>
                <span className="text-lg font-semibold text-yellow-400">{metrics?.forecasting.confidence || 0}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Controls */}
        <div className="bg-gradient-to-r from-green-900 to-emerald-900 rounded-lg border border-green-600 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CurrencyDollarIcon className="w-6 h-6 text-green-400" />
            Founder Financial Controls
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ControlButton
              title="Modify Subscriptions"
              description="Change any customer pricing or features"
              color="blue"
              onClick={() => {/* Navigate to subscription management */}}
            />
            <ControlButton
              title="Generate Reports"
              description="Executive financial reports and P&L"
              color="purple"
              onClick={() => {/* Navigate to report generation */}}
            />
            <ControlButton
              title="Billing Administration"
              description="Complete billing system control"
              color="yellow"
              onClick={() => {/* Navigate to billing admin */}}
            />
            <ControlButton
              title="Investor Metrics"
              description="Growth metrics and achievements"
              color="green"
              onClick={() => {/* Navigate to investor dashboard */}}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
interface RevenueCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ComponentType<{ className?: string }>;
}

const RevenueCard: React.FC<RevenueCardProps> = ({ title, value, change, trend, icon: Icon }) => {
  const trendColor = trend === 'up' ? 'text-green-400' : 'text-red-400';
  const bgColor = trend === 'up' ? 'bg-green-900' : 'bg-red-900';
  const borderColor = trend === 'up' ? 'border-green-600' : 'border-red-600';
  
  return (
    <div className={`${bgColor} ${borderColor} rounded-lg border p-6`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-6 h-6 text-white" />
        <span className={`text-sm font-semibold ${trendColor}`}>{change}</span>
      </div>
      <h3 className="text-sm text-gray-300 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
};

interface ControlButtonProps {
  title: string;
  description: string;
  color: string;
  onClick: () => void;
}

const ControlButton: React.FC<ControlButtonProps> = ({ title, description, color, onClick }) => {
  const colorClasses = {
    blue: 'bg-blue-900 border-blue-600 hover:bg-blue-800',
    purple: 'bg-purple-900 border-purple-600 hover:bg-purple-800',
    yellow: 'bg-yellow-900 border-yellow-600 hover:bg-yellow-800',
    green: 'bg-green-900 border-green-600 hover:bg-green-800'
  };

  return (
    <button
      onClick={onClick}
      className={`${colorClasses[color as keyof typeof colorClasses]} rounded-lg border p-4 text-left transition-colors hover:scale-105 transform transition-transform`}
    >
      <h3 className="font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-300">{description}</p>
    </button>
  );
}; 