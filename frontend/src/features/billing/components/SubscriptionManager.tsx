import React, { useState, useEffect } from 'react';
import { 
  CreditCardIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  StarIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { apiClient } from '../../../api/client';

interface BillingPlan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  limits: Record<string, number>;
}

interface CurrentSubscription {
  id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  amount_cents: number;
  billing_cycle: string;
}

interface ApiResponse<T> {
  data: T;
  status: string;
  timestamp: string;
}

interface SuccessResponse {
  success: boolean;
  message?: string;
}

const SubscriptionManager: React.FC = () => {
  const [plans, setPlans] = useState<Record<string, BillingPlan>>({});
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const [plansRes, subscriptionRes] = await Promise.all([
        apiClient.get('/billing/plans'),
        apiClient.get('/billing/subscriptions/current')
      ]);

      setPlans(plansRes.data as Record<string, BillingPlan>);
      setCurrentSubscription(subscriptionRes.data as CurrentSubscription);
      setSelectedPlan((subscriptionRes.data as CurrentSubscription)?.plan_id || '');
    } catch (err) {
      setError('Failed to load subscription data');
      console.error('Subscription data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = async () => {
    if (!selectedPlan || selectedPlan === currentSubscription?.plan_id) {
      return;
    }

    try {
      setUpdating(true);
      setError(null);

      const response = await apiClient.post('/billing/subscriptions/update', {
        plan_id: selectedPlan,
        billing_cycle: billingCycle
      });

      if ((response.data as SuccessResponse).success) {
        await fetchSubscriptionData();
        alert('Subscription updated successfully!');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to update subscription');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setUpdating(true);
      setError(null);

      const response = await apiClient.post('/billing/subscriptions/cancel', {
        cancel_at_period_end: true
      });

      if ((response.data as SuccessResponse).success) {
        await fetchSubscriptionData();
        setShowCancelModal(false);
        alert('Subscription will be canceled at the end of the current period.');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to cancel subscription');
    } finally {
      setUpdating(false);
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'starter':
        return <UserGroupIcon className="w-6 h-6" />;
      case 'professional':
        return <BuildingOfficeIcon className="w-6 h-6" />;
      case 'business':
        return <ShieldCheckIcon className="w-6 h-6" />;
      case 'enterprise':
        return <StarIcon className="w-6 h-6" />;
      case 'msp':
        return <CreditCardIcon className="w-6 h-6" />;
      default:
        return <CreditCardIcon className="w-6 h-6" />;
    }
  };

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case 'starter':
        return 'from-blue-600 to-cyan-600';
      case 'professional':
        return 'from-purple-600 to-pink-600';
      case 'business':
        return 'from-indigo-600 to-purple-600';
      case 'enterprise':
        return 'from-yellow-600 to-orange-600';
      case 'msp':
        return 'from-green-600 to-emerald-600';
      default:
        return 'from-gray-600 to-slate-600';
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

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="card">
          <div className="loading-skeleton h-8 w-48 mb-4"></div>
          <div className="loading-skeleton h-32 w-full"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card">
              <div className="loading-skeleton h-6 w-32 mb-4"></div>
              <div className="space-y-3">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="loading-skeleton h-4 w-full"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Subscription Management</h1>
          <p className="text-slate-700 dark:text-gray-400 mt-2">Manage your current plan and billing cycle</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn-secondary">
            <InformationCircleIcon className="w-5 h-5 mr-2" />
            Billing History
          </button>
          <button className="btn-primary">
            <CreditCardIcon className="w-5 h-5 mr-2" />
            Payment Methods
          </button>
        </div>
      </div>

      {/* Current Subscription */}
      {currentSubscription && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Current Subscription</h2>
            <p className="text-slate-700 dark:text-gray-400 mt-1">Your active subscription details</p>
          </div>
          <div className="card-body">
            <div className="flex items-center justify-between p-6 bg-blue-50 rounded-2xl dark:from-blue-900/20 dark:to-indigo-900/20">
              <div className="flex items-center space-x-4">
                <div className={`p-4 bg-gradient-to-r ${getPlanColor(currentSubscription.plan_id)} rounded-2xl text-white`}>
                  {getPlanIcon(currentSubscription.plan_id)}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {plans[currentSubscription.plan_id]?.name || currentSubscription.plan_id}
                  </h3>
                  <p className="text-slate-700 dark:text-gray-400">
                    {formatCurrency(currentSubscription.amount_cents / 100)} / {currentSubscription.billing_cycle}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-gray-500 mt-1">
                    Next billing: {formatDate(currentSubscription.current_period_end)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="status-badge status-success">
                  {currentSubscription.status}
                </span>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="btn-secondary text-red-700 hover:text-red-800 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  Cancel Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan Selection */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Change Your Plan</h2>
          <p className="text-slate-700 dark:text-gray-400 mt-1">Select a new plan and billing cycle</p>
        </div>
        <div className="card-body">
          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center mb-8">
            <div className="bg-slate-200 rounded-xl p-1 dark:bg-gray-800">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-slate-900 shadow-md dark:bg-gray-700 dark:text-white'
                    : 'text-slate-700 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  billingCycle === 'yearly'
                    ? 'bg-white text-slate-900 shadow-md dark:bg-gray-700 dark:text-white'
                    : 'text-slate-700 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                Yearly
                <span className="ml-2 px-2 py-1 bg-green-200 text-green-800 text-xs rounded-full dark:bg-green-900/20 dark:text-green-400">
                  Save 17%
                </span>
              </button>
            </div>
          </div>

          {/* Plan Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(plans).map(([planId, plan]) => {
              const isCurrentPlan = currentSubscription?.plan_id === planId;
              const isSelected = selectedPlan === planId;
              const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;

              return (
                <div
                  key={planId}
                  className={`card cursor-pointer transition-all duration-300 ${
                    isSelected
                      ? 'ring-2 ring-blue-600 shadow-lg transform -translate-y-1'
                      : 'hover:shadow-lg hover:transform hover:-translate-y-1'
                  } ${isCurrentPlan ? 'opacity-75' : ''}`}
                  onClick={() => !isCurrentPlan && setSelectedPlan(planId)}
                >
                  <div className="card-body">
                    {/* Plan Header */}
                    <div className="text-center mb-6">
                      <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r ${getPlanColor(planId)} rounded-2xl text-white mb-4`}>
                        {getPlanIcon(planId)}
                      </div>
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{plan.name}</h3>
                      <div className="mb-4">
                        <span className="text-3xl font-bold text-slate-900 dark:text-white">
                          {formatCurrency(price / 100)}
                        </span>
                        <span className="text-slate-700 dark:text-gray-400">/{billingCycle === 'monthly' ? 'mo' : 'year'}</span>
                      </div>
                      {isCurrentPlan && (
                        <span className="status-badge status-success">
                          Current Plan
                        </span>
                      )}
                    </div>

                    {/* Features */}
                    <div className="space-y-3 mb-6">
                      {plan.features.slice(0, 5).map((feature, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <CheckIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                          <span className="text-sm text-slate-800 dark:text-gray-300">{feature}</span>
                        </div>
                      ))}
                      {plan.features.length > 5 && (
                        <p className="text-sm text-slate-600 dark:text-gray-500 text-center">
                          +{plan.features.length - 5} more features
                        </p>
                      )}
                    </div>

                    {/* Action Button */}
                    {!isCurrentPlan && (
                      <button
                        className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                          isSelected
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                            : 'bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                        disabled={updating}
                      >
                        {isSelected ? 'Selected' : 'Select Plan'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Update Button */}
          {selectedPlan && selectedPlan !== currentSubscription?.plan_id && (
            <div className="mt-8 text-center">
              <button
                onClick={handlePlanChange}
                disabled={updating}
                className="btn-primary"
              >
                {updating ? 'Updating...' : `Update to ${plans[selectedPlan]?.name} Plan`}
              </button>
              {error && (
                <p className="text-red-700 dark:text-red-400 mt-4 text-sm">{error}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <ExclamationTriangleIcon className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Cancel Subscription?
              </h3>
              <p className="text-slate-700 dark:text-gray-400 mb-6">
                Your subscription will remain active until the end of the current billing period. You can reactivate at any time.
              </p>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="btn-secondary flex-1"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={handleCancelSubscription}
                  disabled={updating}
                  className="btn-primary flex-1 bg-red-600 hover:bg-red-700"
                >
                  {updating ? 'Canceling...' : 'Cancel Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManager; 