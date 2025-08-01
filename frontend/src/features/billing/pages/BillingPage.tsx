import React, { useState } from 'react';
import { 
  CreditCardIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import BillingDashboard from '../components/BillingDashboard';
import SubscriptionManager from '../components/SubscriptionManager';
import UsageTracker from '../components/UsageTracker';

type BillingTab = 'dashboard' | 'subscription' | 'usage';

const BillingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<BillingTab>('dashboard');

  const tabs = [
    {
      id: 'dashboard' as BillingTab,
      name: 'Dashboard',
      icon: ChartBarIcon,
      description: 'Overview of billing and revenue'
    },
    {
      id: 'subscription' as BillingTab,
      name: 'Subscription',
      icon: CreditCardIcon,
      description: 'Manage your subscription plan'
    },
    {
      id: 'usage' as BillingTab,
      name: 'Usage',
      icon: Cog6ToothIcon,
      description: 'Track resource usage and quotas'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <BillingDashboard />;
      case 'subscription':
        return <SubscriptionManager />;
      case 'usage':
        return <UsageTracker />;
      default:
        return <BillingDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <CreditCardIcon className="h-6 w-6 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Billing & Subscriptions</h1>
          </div>
          <p className="text-gray-400">
            Manage your SecureNet subscription, monitor usage, and handle billing
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-1 bg-gray-900/50 rounded-lg p-1 border border-gray-600">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {renderTabContent()}
        </div>

        {/* Quick Actions */}
        <div className="mt-12 bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-600 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <DocumentTextIcon className="h-6 w-6 text-green-400" />
            Quick Actions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setActiveTab('subscription')}
              className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors text-left"
            >
              <CreditCardIcon className="h-6 w-6 text-blue-400" />
              <div>
                <p className="font-medium text-white">Upgrade Plan</p>
                <p className="text-sm text-gray-400">Change your subscription tier</p>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('usage')}
              className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors text-left"
            >
              <ChartBarIcon className="h-6 w-6 text-green-400" />
              <div>
                <p className="font-medium text-white">View Usage</p>
                <p className="text-sm text-gray-400">Check resource consumption</p>
              </div>
            </button>
            
            <button
              onClick={() => window.open('/admin/billing', '_blank')}
              className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors text-left"
            >
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" />
              <div>
                <p className="font-medium text-white">Billing Support</p>
                <p className="text-sm text-gray-400">Get help with billing issues</p>
              </div>
            </button>
          </div>
        </div>

        {/* Billing Information */}
        <div className="mt-8 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Billing Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-blue-400 mb-2">Payment Methods</h4>
              <p className="text-sm text-gray-300">
                We accept all major credit cards and support secure payment processing through Stripe. 
                Your payment information is encrypted and secure.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-blue-400 mb-2">Billing Cycle</h4>
              <p className="text-sm text-gray-300">
                Choose between monthly or annual billing cycles. Annual plans include a 17% discount 
                and are billed upfront for the entire year.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-blue-400 mb-2">Usage Overage</h4>
              <p className="text-sm text-gray-300">
                If you exceed your plan limits, you'll be charged for the overage at the end of your 
                billing cycle. We'll notify you before any charges are applied.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-blue-400 mb-2">Cancellation</h4>
              <p className="text-sm text-gray-300">
                You can cancel your subscription at any time. You'll continue to have access until 
                the end of your current billing period.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingPage; 