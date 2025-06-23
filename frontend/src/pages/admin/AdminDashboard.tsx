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
      const token = localStorage.getItem('auth_token');
      
      const [statsResponse, billingResponse] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/admin/system/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://127.0.0.1:8000/api/admin/billing/overview', {
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-300">Error</h3>
            <p className="mt-1 text-sm text-red-200">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Super Admin Dashboard</h1>
            <p className="mt-1 text-sm text-gray-400">
              Platform overview and system management
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <ClockIcon className="h-4 w-4" />
            <span>Last updated: {systemStats && formatDate(systemStats.last_updated)}</span>
          </div>
        </div>
      </div>

      {/* System Health Status */}
      <div className="glass-card p-6">
        <div className="flex items-center">
          <div className="p-3 rounded-lg bg-green-500/10">
            <ShieldCheckIcon className="h-8 w-8 text-green-500" />
          </div>
          <div className="ml-4">
            <h2 className="text-lg font-medium text-white">System Health</h2>
            <p className="text-sm text-gray-400">
              Status: <span className="font-medium text-green-400 capitalize">
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
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Organizations</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {systemStats?.total_organizations || 0}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10">
              <BuildingOfficeIcon className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </motion.div>

        {/* Users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Users</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {systemStats?.total_users || 0}
              </p>
              <p className="text-sm text-gray-500">
                {systemStats?.active_users || 0} active
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500/10">
              <UsersIcon className="h-6 w-6 text-purple-500" />
            </div>
          </div>
        </motion.div>

        {/* Revenue */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Monthly Revenue</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {billingOverview ? formatCurrency(billingOverview.total_monthly_revenue) : '$0'}
              </p>
              <p className="text-sm text-gray-500">
                {billingOverview?.paying_customers || 0} paying customers
              </p>
            </div>
            <div className="p-3 rounded-lg bg-pink-500/10">
              <CurrencyDollarIcon className="h-6 w-6 text-pink-500" />
            </div>
          </div>
        </motion.div>

        {/* Devices */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Devices</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {systemStats?.total_devices || 0}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-teal-500/10">
              <ServerIcon className="h-6 w-6 text-teal-500" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Distribution */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-medium text-white mb-4">Plan Distribution</h3>
          <div className="space-y-3">
            {systemStats?.plan_distribution && Object.entries(systemStats.plan_distribution).map(([plan, count]) => (
              <div key={plan} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-400 capitalize">{plan}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
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
        <div className="glass-card p-6">
          <h3 className="text-lg font-medium text-white mb-4">User Roles</h3>
          <div className="space-y-3">
            {systemStats?.role_distribution && Object.entries(systemStats.role_distribution).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-400 capitalize">
                  {role.replace('_', ' ')}
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
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
      <div className="glass-card p-6">
        <h3 className="text-lg font-medium text-white mb-4">Revenue Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {billingOverview?.revenue_by_plan && Object.entries(billingOverview.revenue_by_plan).map(([plan, revenue]) => (
            <div key={plan} className="text-center p-4 bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-white">
                {formatCurrency(revenue)}
              </div>
              <div className="text-sm text-gray-500 capitalize">{plan} Plan</div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Average Revenue Per User:</span>
            <span className="font-medium">
              {billingOverview ? formatCurrency(billingOverview.average_revenue_per_user) : '$0'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-medium text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => window.location.href = '/admin/users'}
            className="flex items-center justify-center px-4 py-2 border border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700"
          >
            <UsersIcon className="h-4 w-4 mr-2" />
            Manage Users
          </button>
          <button
            onClick={() => window.location.href = '/admin/organizations'}
            className="flex items-center justify-center px-4 py-2 border border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700"
          >
            <BuildingOfficeIcon className="h-4 w-4 mr-2" />
            Manage Orgs
          </button>
          <button
            onClick={() => window.location.href = '/admin/billing'}
            className="flex items-center justify-center px-4 py-2 border border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700"
          >
            <CurrencyDollarIcon className="h-4 w-4 mr-2" />
            Billing
          </button>
          <button
            onClick={() => window.location.href = '/admin/audit'}
            className="flex items-center justify-center px-4 py-2 border border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700"
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