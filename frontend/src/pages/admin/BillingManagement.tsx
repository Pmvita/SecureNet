import React, { useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { 
  CreditCardIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface BillingData {
  id: string;
  tenantName: string;
  plan: 'starter' | 'professional' | 'enterprise';
  monthlyRevenue: number;
  usage: {
    users: number;
    storage: number; // GB
    apiCalls: number;
  };
  limits: {
    users: number;
    storage: number; // GB
    apiCalls: number;
  };
  overages: {
    users: number;
    storage: number;
    apiCalls: number;
  };
  nextBilling: string;
  status: 'active' | 'overdue' | 'cancelled';
}

const mockBillingData: BillingData[] = [
  {
    id: '1',
    tenantName: 'SecureOrg Inc.',
    plan: 'enterprise',
    monthlyRevenue: 299,
    usage: { users: 25, storage: 45, apiCalls: 125000 },
    limits: { users: 50, storage: 100, apiCalls: 200000 },
    overages: { users: 0, storage: 0, apiCalls: 0 },
    nextBilling: '2025-07-11',
    status: 'active'
  },
  {
    id: '2',
    tenantName: 'TechCorp Ltd.',
    plan: 'professional',
    monthlyRevenue: 99,
    usage: { users: 15, storage: 28, apiCalls: 85000 },
    limits: { users: 20, storage: 50, apiCalls: 100000 },
    overages: { users: 0, storage: 0, apiCalls: 0 },
    nextBilling: '2025-07-15',
    status: 'active'
  },
  {
    id: '3',
    tenantName: 'StartupXYZ',
    plan: 'starter',
    monthlyRevenue: 29,
    usage: { users: 8, storage: 12, apiCalls: 35000 },
    limits: { users: 10, storage: 25, apiCalls: 50000 },
    overages: { users: 0, storage: 0, apiCalls: 0 },
    nextBilling: '2025-07-01',
    status: 'active'
  }
];

const BillingManagement: React.FC = () => {
  const [billingData] = useState<BillingData[]>(mockBillingData);
  const [selectedPlan, setSelectedPlan] = useState<string>('all');

  const filteredData = billingData.filter(data => 
    selectedPlan === 'all' || data.plan === selectedPlan
  );

  const totalRevenue = billingData.reduce((sum, data) => sum + data.monthlyRevenue, 0);
  const totalOverages = billingData.reduce((sum, data) => 
    sum + (data.overages.users * 5) + (data.overages.storage * 2) + (data.overages.apiCalls * 0.001), 0
  );

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'enterprise': return 'text-green-400';
      case 'professional': return 'text-yellow-400';
      case 'starter': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getUsagePercentage = (usage: number, limit: number) => {
    return Math.min((usage / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing Management"
        subtitle="Monitor Stripe plans, usage, and overages across all tenants"
      />

      {/* Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-400">Monthly Revenue</p>
              <p className="text-2xl font-bold text-white mt-1">${totalRevenue}</p>
            </div>
            <CurrencyDollarIcon className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-400">Active Tenants</p>
              <p className="text-2xl font-bold text-white mt-1">{billingData.length}</p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-400">Overage Charges</p>
              <p className="text-2xl font-bold text-white mt-1">${totalOverages.toFixed(2)}</p>
            </div>
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-400">Growth Rate</p>
              <p className="text-2xl font-bold text-white mt-1">+12%</p>
            </div>
            <ArrowTrendingUpIcon className="h-8 w-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-600 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-300">Filter by Plan:</label>
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
          >
            <option value="all">All Plans</option>
            <option value="starter">Starter ($29/mo)</option>
                            <option value="starter">Starter ($99/mo)</option>
                <option value="professional">Professional ($299/mo)</option>
                <option value="business">Business ($799/mo)</option>
                <option value="enterprise">Enterprise ($1,999/mo)</option>
                <option value="msp_bundle">MSP Bundle ($2,999/mo)</option>
          </select>
        </div>
      </div>

      {/* Billing Details */}
      <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-600 rounded-xl">
        <div className="p-6 border-b border-gray-600 bg-gradient-to-r from-gray-800/80 to-gray-700/80">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <CreditCardIcon className="h-6 w-6 text-blue-400" />
            Billing Details ({filteredData.length} tenants)
          </h2>
        </div>
        <div className="p-6 bg-gray-900/30">
          <div className="space-y-6">
            {filteredData.map((data) => (
              <div key={data.id} className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{data.tenantName}</h3>
                    <p className={`text-sm font-medium ${getPlanColor(data.plan)}`}>
                      {data.plan.charAt(0).toUpperCase() + data.plan.slice(1)} Plan - ${data.monthlyRevenue}/mo
                    </p>
                    <p className="text-sm text-gray-400">Next billing: {new Date(data.nextBilling).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      data.status === 'active' ? 'bg-green-900/50 text-green-400' :
                      data.status === 'overdue' ? 'bg-red-900/50 text-red-400' :
                      'bg-gray-900/50 text-gray-400'
                    }`}>
                      {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Users Usage */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Users</span>
                      <span className="text-white">{data.usage.users} / {data.limits.users}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(data.usage.users, data.limits.users))}`}
                        style={{ width: `${getUsagePercentage(data.usage.users, data.limits.users)}%` }}
                      ></div>
                    </div>
                    {data.overages.users > 0 && (
                      <p className="text-xs text-red-400">+{data.overages.users} overage users</p>
                    )}
                  </div>

                  {/* Storage Usage */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Storage</span>
                      <span className="text-white">{data.usage.storage}GB / {data.limits.storage}GB</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(data.usage.storage, data.limits.storage))}`}
                        style={{ width: `${getUsagePercentage(data.usage.storage, data.limits.storage)}%` }}
                      ></div>
                    </div>
                    {data.overages.storage > 0 && (
                      <p className="text-xs text-red-400">+{data.overages.storage}GB overage</p>
                    )}
                  </div>

                  {/* API Calls Usage */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">API Calls</span>
                      <span className="text-white">{data.usage.apiCalls.toLocaleString()} / {data.limits.apiCalls.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(data.usage.apiCalls, data.limits.apiCalls))}`}
                        style={{ width: `${getUsagePercentage(data.usage.apiCalls, data.limits.apiCalls)}%` }}
                      ></div>
                    </div>
                    {data.overages.apiCalls > 0 && (
                      <p className="text-xs text-red-400">+{data.overages.apiCalls.toLocaleString()} overage calls</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                      <DocumentTextIcon className="w-4 h-4" />
                      View Invoice
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm">
                      <CreditCardIcon className="w-4 h-4" />
                      Manage Plan
                    </button>
                  </div>
                  {(data.overages.users > 0 || data.overages.storage > 0 || data.overages.apiCalls > 0) && (
                    <div className="text-right">
                      <p className="text-sm text-red-400 font-medium">
                        Overage: ${((data.overages.users * 5) + (data.overages.storage * 2) + (data.overages.apiCalls * 0.001)).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingManagement; 