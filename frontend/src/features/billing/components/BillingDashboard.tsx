import React, { useState, useEffect } from 'react';
import { 
  CreditCardIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  UsersIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { apiClient } from '../../../api/client';

interface BillingOverview {
  total_monthly_revenue: number;
  paying_customers: number;
  active_subscriptions: number;
  overdue_amount: number;
  revenue_by_plan: Record<string, number>;
  average_revenue_per_user: number;
}

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  amount_cents: number;
  billing_cycle: string;
}

interface Invoice {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  billing_reason: string;
  created_at: string;
  due_date: string;
  paid_at?: string;
}

const BillingDashboard: React.FC = () => {
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const [overviewRes, subscriptionsRes, invoicesRes] = await Promise.all([
        apiClient.get('/billing/admin/overview'),
        apiClient.get('/billing/subscriptions/current'),
        apiClient.get('/billing/invoices?limit=10')
      ]);

      setOverview(overviewRes.data as BillingOverview);
      setSubscriptions(Array.isArray(subscriptionsRes.data) ? subscriptionsRes.data as Subscription[] : [subscriptionsRes.data as Subscription]);
      setInvoices(invoicesRes.data as Invoice[]);
    } catch (err) {
      setError('Failed to load billing data');
      console.error('Billing data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'paid':
        return 'status-success';
      case 'past_due':
      case 'overdue':
        return 'status-error';
      case 'trialing':
        return 'status-info';
      case 'canceled':
        return 'text-slate-600 bg-slate-200 border border-slate-400 dark:text-gray-400 dark:bg-gray-900/20 dark:border-gray-800';
      default:
        return 'status-warning';
    }
  };

  const getPlanName = (planId: string) => {
    const planNames: Record<string, string> = {
      'starter': 'Starter',
      'professional': 'Professional',
      'business': 'Business',
      'enterprise': 'Enterprise',
      'msp': 'MSP Bundle'
    };
    return planNames[planId] || planId;
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="metric-card">
              <div className="loading-skeleton h-8 w-24 mb-2"></div>
              <div className="loading-skeleton h-12 w-32"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
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
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Error Loading Billing Data</h3>
          <p className="text-slate-700 dark:text-gray-400 mb-4">{error}</p>
          <button 
            onClick={fetchBillingData}
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Billing Dashboard</h1>
          <p className="text-slate-700 dark:text-gray-400 mt-2">Monitor revenue, subscriptions, and billing metrics</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn-secondary">
            <DocumentTextIcon className="w-5 h-5 mr-2" />
            Export Report
          </button>
          <button className="btn-primary">
            <CreditCardIcon className="w-5 h-5 mr-2" />
            Manage Billing
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="metric-card group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-xl dark:bg-blue-900/20">
              <CurrencyDollarIcon className="w-6 h-6 text-blue-700 dark:text-blue-400" />
            </div>
            <ArrowTrendingUpIcon className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-gray-400 mb-2">Monthly Revenue</h3>
          <p className="metric-value">{formatCurrency(overview?.total_monthly_revenue || 0)}</p>
          <p className="text-sm text-green-700 dark:text-green-400 mt-2">
            +12.5% from last month
          </p>
        </div>

        <div className="metric-card group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-xl dark:bg-green-900/20">
              <UsersIcon className="w-6 h-6 text-green-700 dark:text-green-400" />
            </div>
            <CheckCircleIcon className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-gray-400 mb-2">Paying Customers</h3>
          <p className="metric-value">{overview?.paying_customers || 0}</p>
          <p className="text-sm text-green-700 dark:text-green-400 mt-2">
            +8.2% from last month
          </p>
        </div>

        <div className="metric-card group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-xl dark:bg-purple-900/20">
              <BuildingOfficeIcon className="w-6 h-6 text-purple-700 dark:text-purple-400" />
            </div>
            <ChartBarIcon className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-gray-400 mb-2">Active Subscriptions</h3>
          <p className="metric-value">{overview?.active_subscriptions || 0}</p>
          <p className="text-sm text-blue-700 dark:text-blue-400 mt-2">
            +5.7% from last month
          </p>
        </div>

        <div className="metric-card group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 rounded-xl dark:bg-red-900/20">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-700 dark:text-red-400" />
            </div>
            <XCircleIcon className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-gray-400 mb-2">Overdue Amount</h3>
          <p className="metric-value">{formatCurrency(overview?.overdue_amount || 0)}</p>
          <p className="text-sm text-red-700 dark:text-red-400 mt-2">
            -2.1% from last month
          </p>
        </div>
      </div>

      {/* Revenue by Plan Chart */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Revenue by Plan</h2>
          <p className="text-slate-700 dark:text-gray-400 mt-1">Breakdown of revenue across different subscription tiers</p>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {Object.entries(overview?.revenue_by_plan || {}).map(([plan, revenue]) => (
              <div key={plan} className="text-center p-4 bg-slate-100 rounded-xl dark:bg-gray-800">
                <h3 className="font-medium text-slate-900 dark:text-white mb-2">{getPlanName(plan)}</h3>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {formatCurrency(revenue)}
                </p>
                <p className="text-sm text-slate-700 dark:text-gray-400 mt-1">
                  {((revenue / (overview?.total_monthly_revenue || 1)) * 100).toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Current Subscriptions and Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Subscriptions */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Current Subscriptions</h2>
            <p className="text-slate-700 dark:text-gray-400 mt-1">Active subscription details</p>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {subscriptions.map((subscription) => (
                <div key={subscription.id} className="flex items-center justify-between p-4 bg-slate-100 rounded-xl dark:bg-gray-800">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/20">
                      <CreditCardIcon className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900 dark:text-white">
                        {getPlanName(subscription.plan_id)}
                      </h3>
                      <p className="text-sm text-slate-700 dark:text-gray-400">
                        {subscription.billing_cycle} • {formatCurrency(subscription.amount_cents / 100)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`status-badge ${getStatusColor(subscription.status)}`}>
                      {subscription.status}
                    </span>
                    <ClockIcon className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-700 dark:text-gray-400">
                      {formatDate(subscription.current_period_end)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Recent Invoices</h2>
            <p className="text-slate-700 dark:text-gray-400 mt-1">Latest billing activity</p>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 bg-slate-100 rounded-xl dark:bg-gray-800">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900/20">
                      <DocumentTextIcon className="w-5 h-5 text-green-700 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900 dark:text-white">
                        {invoice.billing_reason}
                      </h3>
                      <p className="text-sm text-slate-700 dark:text-gray-400">
                        Due: {formatDate(invoice.due_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`status-badge ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {formatCurrency(invoice.amount_cents / 100)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingDashboard; 