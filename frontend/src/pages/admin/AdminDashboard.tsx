import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  UsersIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ShieldCheckIcon,
  ServerIcon
} from '@heroicons/react/24/outline';

interface SystemStats {
  total_organizations: number;
  total_users: number;
  active_users: number;
  total_devices: number;
  plan_distribution: Record<string, number>;
  role_distribution: Record<string, number>;
  system_health: string;
  last_updated: string;
}

interface BillingOverview {
  total_monthly_revenue: number;
  revenue_by_plan: Record<string, number>;
  total_organizations: number;
  paying_customers: number;
  average_revenue_per_user: number;
  last_updated: string;
}

const AdminDashboard: React.FC = () => {
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [billingOverview, setBillingOverview] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const [statsResponse, billingResponse] = await Promise.all([
        fetch('/api/admin/system/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/admin/billing/overview', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!statsResponse.ok || !billingResponse.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const stats = await statsResponse.json();
      const billing = await billingResponse.json();

      setSystemStats(stats);
      setBillingOverview(billing);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Platform overview and system management
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <ClockIcon className="h-4 w-4" />
            <span>Last updated: {systemStats && formatDate(systemStats.last_updated)}</span>
          </div>
        </div>
      </div>

      {/* System Health Status */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center">
          <ShieldCheckIcon className="h-8 w-8 text-green-500" />
          <div className="ml-3">
            <h2 className="text-lg font-medium text-gray-900">System Health</h2>
            <p className="text-sm text-gray-500">
              Status: <span className="font-medium text-green-600 capitalize">
                {systemStats?.system_health || 'Unknown'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Organizations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white overflow-hidden shadow rounded-lg"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Organizations
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {systemStats?.total_organizations || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white overflow-hidden shadow rounded-lg"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Users
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {systemStats?.total_users || 0}
                  </dd>
                  <dd className="text-sm text-gray-500">
                    {systemStats?.active_users || 0} active
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Revenue */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white overflow-hidden shadow rounded-lg"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Monthly Revenue
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {billingOverview ? formatCurrency(billingOverview.total_monthly_revenue) : '$0'}
                  </dd>
                  <dd className="text-sm text-gray-500">
                    {billingOverview?.paying_customers || 0} paying customers
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Devices */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white overflow-hidden shadow rounded-lg"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ServerIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Devices
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {systemStats?.total_devices || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Distribution */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Plan Distribution</h3>
          <div className="space-y-3">
            {systemStats?.plan_distribution && Object.entries(systemStats.plan_distribution).map(([plan, count]) => (
              <div key={plan} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 capitalize">{plan}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full"
                      style={{
                        width: `${(count / (systemStats?.total_organizations || 1)) * 100}%`
                      }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-500">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Role Distribution */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">User Roles</h3>
          <div className="space-y-3">
            {systemStats?.role_distribution && Object.entries(systemStats.role_distribution).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {role.replace('_', ' ')}
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(count / (systemStats?.total_users || 1)) * 100}%`
                      }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-500">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {billingOverview?.revenue_by_plan && Object.entries(billingOverview.revenue_by_plan).map(([plan, revenue]) => (
            <div key={plan} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(revenue)}
              </div>
              <div className="text-sm text-gray-500 capitalize">{plan} Plan</div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Average Revenue Per User:</span>
            <span className="font-medium">
              {billingOverview ? formatCurrency(billingOverview.average_revenue_per_user) : '$0'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => window.location.href = '/admin/users'}
            className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <UsersIcon className="h-4 w-4 mr-2" />
            Manage Users
          </button>
          <button
            onClick={() => window.location.href = '/admin/organizations'}
            className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <BuildingOfficeIcon className="h-4 w-4 mr-2" />
            Manage Orgs
          </button>
          <button
            onClick={() => window.location.href = '/admin/billing'}
            className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <CurrencyDollarIcon className="h-4 w-4 mr-2" />
            Billing
          </button>
          <button
            onClick={() => window.location.href = '/admin/audit'}
            className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ChartBarIcon className="h-4 w-4 mr-2" />
            Audit Logs
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 