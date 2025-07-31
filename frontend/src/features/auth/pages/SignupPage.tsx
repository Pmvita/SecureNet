import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../../../api/client';
import { 
  ShieldCheckIcon, 
  CheckIcon, 
  ArrowRightIcon,
  BuildingOfficeIcon,
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  StarIcon
} from '@heroicons/react/24/outline';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  priceYearly: number;
  description: string;
  features: string[];
  popular?: boolean;
  deviceLimit: number;
  scanLimit: number;
  logRetention: number;
}

const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceYearly: 0,
    description: 'Perfect for small teams getting started',
    features: [
      '5 devices',
      '10 scans per month',
      '7-day log retention',
      'Basic network scanning',
      'Email alerts',
      'Community support'
    ],
    deviceLimit: 5,
    scanLimit: 10,
    logRetention: 7
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 149,
    priceYearly: 1490,
    description: 'Ideal for growing security teams',
    features: [
      '50 devices',
      '500 scans per month',
      '30-day log retention',
      'Advanced vulnerability scanning',
      'ML anomaly detection',
      'Slack/Teams integration',
      'Custom dashboards',
      'API access',
      'Priority support'
    ],
    popular: true,
    deviceLimit: 50,
    scanLimit: 500,
    logRetention: 30
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 499,
    priceYearly: 4990,
    description: 'For large organizations with advanced needs',
    features: [
      '1000+ devices',
      'Unlimited scanning',
      '1-year log retention',
      'Advanced ML threat detection',
      'Full integrations suite',
      'White-label options',
      'Dedicated support',
      'Compliance reporting',
      'On-premise deployment',
      'Custom integrations'
    ],
    deviceLimit: 1000,
    scanLimit: -1, // unlimited
    logRetention: 365
  },
  {
    id: 'msp',
    name: 'MSP Bundle',
    price: 999,
    priceYearly: 9990,
    description: 'For Managed Service Providers',
    features: [
      'Unlimited devices',
      'Unlimited scanning',
      'Unlimited log retention',
      'Multi-tenant management',
      'White-label platform',
      'Reseller capabilities',
      'Dedicated account manager',
      'Custom integrations',
      'Priority support',
      'Revenue sharing'
    ],
    deviceLimit: -1, // unlimited
    scanLimit: -1, // unlimited
    logRetention: -1 // unlimited
  }
];

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    companySize: '',
    jobTitle: '',
    phone: ''
  });
  
  const [selectedPlan, setSelectedPlan] = useState<string>('pro');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [currentStep, setCurrentStep] = useState<'plan' | 'details' | 'billing'>('plan');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
    if (!formData.companySize) newErrors.companySize = 'Company size is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const selectedPlanData = subscriptionPlans.find(plan => plan.id === selectedPlan);
      
      const signupData = {
        ...formData,
        subscriptionPlan: selectedPlan,
        billingCycle,
        planDetails: selectedPlanData
      };
      
      // Use API client directly for signup
      const response = await apiClient.post('/api/auth/signup', signupData);
      
      if (response.status === 'success') {
        navigate('/onboarding');
      } else {
        setErrors({ general: 'Failed to create account. Please try again.' });
      }
    } catch (error) {
      console.error('Signup error:', error);
      setErrors({ general: 'Failed to create account. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const getSelectedPlanData = () => {
    return subscriptionPlans.find(plan => plan.id === selectedPlan);
  };

  const renderPlanSelection = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Choose Your Plan</h2>
        <p className="text-gray-300 text-lg max-w-2xl mx-auto">
          Select the plan that best fits your organization's security needs
        </p>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="flex justify-center">
        <div className="glass-card p-1 inline-flex">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              billingCycle === 'monthly'
                ? 'bg-primary-600 text-white shadow-lg transform scale-105'
                : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 relative ${
              billingCycle === 'yearly'
                ? 'bg-primary-600 text-white shadow-lg transform scale-105'
                : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            Yearly
            <span className="absolute -top-2 -right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
        {subscriptionPlans.map((plan) => (
          <div
            key={plan.id}
            className={`relative glass-card p-6 lg:p-8 cursor-pointer transition-all duration-300 hover:transform hover:-translate-y-2 ${
              selectedPlan === plan.id
                ? 'ring-2 ring-primary-500 bg-primary-500/10 shadow-xl'
                : 'hover:shadow-lg hover:bg-gray-800/50'
            } ${plan.popular ? 'ring-2 ring-primary-500 shadow-xl' : ''}`}
            onClick={() => setSelectedPlan(plan.id)}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-primary-600 to-primary-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center">
                  <StarIcon className="h-4 w-4 mr-2" />
                  Most Popular
                </span>
              </div>
            )}

            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-3">{plan.name}</h3>
              <div className="mb-6">
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-white">
                    ${billingCycle === 'monthly' ? plan.price : plan.priceYearly}
                  </span>
                  <span className="text-gray-400 ml-1">
                    /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                  </span>
                </div>
                {billingCycle === 'yearly' && plan.price > 0 && (
                  <p className="text-green-400 text-sm mt-1">
                    ${plan.price}/mo when billed monthly
                  </p>
                )}
              </div>
              <p className="text-gray-300 text-sm mb-6 leading-relaxed">{plan.description}</p>
            </div>

            <ul className="space-y-3 mb-8">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start text-sm">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300 leading-relaxed">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-center">
              <div className={`w-6 h-6 rounded-full border-2 transition-all duration-200 ${
                selectedPlan === plan.id
                  ? 'border-primary-500 bg-primary-500 shadow-lg'
                  : 'border-gray-600 hover:border-gray-500'
              }`}>
                {selectedPlan === plan.id && (
                  <div className="w-3 h-3 bg-white rounded-full m-0.5" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 pt-8">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-gray-400 hover:text-white transition-colors flex items-center group"
        >
          <ArrowRightIcon className="h-4 w-4 mr-2 rotate-180 group-hover:translate-x-1 transition-transform" />
          Back to Home
        </button>
        <button
          type="button"
          onClick={() => setCurrentStep('details')}
          className="btn-primary flex items-center px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
        >
          Continue to Account Setup
          <ArrowRightIcon className="ml-2 h-5 w-5" />
        </button>
      </div>
    </div>
  );

  const renderDetailsForm = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Create Your Account</h2>
        <p className="text-gray-300 text-lg max-w-2xl mx-auto">
          Tell us about yourself and your organization to get started
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Personal Information */}
        <div className="glass-card p-6 lg:p-8">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <UserIcon className="h-6 w-6 mr-3 text-primary-500" />
            Personal Information
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className={`input-field w-full transition-all duration-200 ${
                  errors.firstName ? 'border-red-500 focus:border-red-500' : 'focus:border-primary-500'
                }`}
                placeholder="Enter your first name"
              />
              {errors.firstName && (
                <p className="text-red-400 text-sm mt-1">{errors.firstName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className={`input-field w-full transition-all duration-200 ${
                  errors.lastName ? 'border-red-500 focus:border-red-500' : 'focus:border-primary-500'
                }`}
                placeholder="Enter your last name"
              />
              {errors.lastName && (
                <p className="text-red-400 text-sm mt-1">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`input-field w-full transition-all duration-200 ${
                errors.email ? 'border-red-500 focus:border-red-500' : 'focus:border-primary-500'
              }`}
              placeholder="Enter your email address"
            />
            {errors.email && (
              <p className="text-red-400 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Password *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`input-field w-full transition-all duration-200 ${
                  errors.password ? 'border-red-500 focus:border-red-500' : 'focus:border-primary-500'
                }`}
                placeholder="Create a strong password"
              />
              {errors.password && (
                <p className="text-red-400 text-sm mt-1">{errors.password}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Confirm Password *
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`input-field w-full transition-all duration-200 ${
                  errors.confirmPassword ? 'border-red-500 focus:border-red-500' : 'focus:border-primary-500'
                }`}
                placeholder="Confirm your password"
              />
              {errors.confirmPassword && (
                <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>
              )}
            </div>
          </div>
        </div>

        {/* Organization Information */}
        <div className="glass-card p-6 lg:p-8">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <BuildingOfficeIcon className="h-6 w-6 mr-3 text-primary-500" />
            Organization Information
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                className={`input-field w-full transition-all duration-200 ${
                  errors.companyName ? 'border-red-500 focus:border-red-500' : 'focus:border-primary-500'
                }`}
                placeholder="Enter your company name"
              />
              {errors.companyName && (
                <p className="text-red-400 text-sm mt-1">{errors.companyName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Company Size *
              </label>
              <select
                name="companySize"
                value={formData.companySize}
                onChange={handleInputChange}
                className={`input-field w-full transition-all duration-200 ${
                  errors.companySize ? 'border-red-500 focus:border-red-500' : 'focus:border-primary-500'
                }`}
              >
                <option value="">Select company size</option>
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="201-1000">201-1000 employees</option>
                <option value="1000+">1000+ employees</option>
              </select>
              {errors.companySize && (
                <p className="text-red-400 text-sm mt-1">{errors.companySize}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Job Title
              </label>
              <input
                type="text"
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleInputChange}
                className="input-field w-full transition-all duration-200 focus:border-primary-500"
                placeholder="e.g., Security Manager, IT Director"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="input-field w-full transition-all duration-200 focus:border-primary-500"
                placeholder="Enter your phone number"
              />
            </div>
          </div>
        </div>

        {/* Selected Plan Summary */}
        <div className="glass-card p-6 lg:p-8 border border-primary-500/20 bg-primary-500/5">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <ShieldCheckIcon className="h-6 w-6 mr-3 text-primary-500" />
            Selected Plan Summary
          </h3>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div>
              <p className="font-bold text-white text-lg">
                {getSelectedPlanData()?.name || 'No Plan Selected'} Plan
              </p>
              <p className="text-gray-300">
                ${billingCycle === 'monthly' ? (getSelectedPlanData()?.price ?? 0) : (getSelectedPlanData()?.priceYearly ?? 0)} / {billingCycle === 'monthly' ? 'month' : 'year'}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {billingCycle === 'yearly' && getSelectedPlanData()?.price && getSelectedPlanData()?.price > 0 && (
                  <span className="text-green-400">Save 17% with annual billing</span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep('plan')}
              className="text-primary-400 hover:text-primary-300 text-sm font-semibold transition-colors hover:underline flex items-center"
            >
              <ArrowRightIcon className="h-4 w-4 mr-1 rotate-180" />
              Change Plan
            </button>
          </div>
        </div>

        {errors.general && (
          <div className="glass-card p-4 border border-red-500/20 bg-red-500/5">
            <p className="text-red-400 text-sm flex items-center">
              <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
              {errors.general}
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 pt-8">
          <button
            type="button"
            onClick={() => setCurrentStep('plan')}
            className="text-gray-400 hover:text-white transition-colors flex items-center group"
          >
            <ArrowRightIcon className="h-4 w-4 mr-2 rotate-180 group-hover:translate-x-1 transition-transform" />
            Back to Plans
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Creating Account...
              </>
            ) : (
              <>
                Create Account
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-200 via-dark-100 to-dark-200 text-gray-100">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex-shrink-0 py-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <Link 
              to="/" 
              className="inline-flex items-center text-primary-500 hover:text-primary-400 transition-colors group"
            >
              <ShieldCheckIcon className="h-8 w-8 mr-3 group-hover:scale-110 transition-transform" />
              <span className="text-2xl font-bold">SecureNet</span>
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-6xl mx-auto">
            {/* Progress Indicator */}
            <div className="mb-8">
              <div className="flex items-center justify-center space-x-4">
                <div className={`flex items-center ${currentStep === 'plan' ? 'text-primary-500' : 'text-gray-500'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    currentStep === 'plan' ? 'bg-primary-500 text-white' : 'bg-gray-700 text-gray-400'
                  }`}>
                    1
                  </div>
                  <span className="ml-2 font-medium">Choose Plan</span>
                </div>
                <div className="w-12 h-0.5 bg-gray-700"></div>
                <div className={`flex items-center ${currentStep === 'details' ? 'text-primary-500' : 'text-gray-500'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    currentStep === 'details' ? 'bg-primary-500 text-white' : 'bg-gray-700 text-gray-400'
                  }`}>
                    2
                  </div>
                  <span className="ml-2 font-medium">Account Details</span>
                </div>
              </div>
            </div>

            {/* Content Card */}
            <div className="glass-card p-8 sm:p-10 lg:p-12 shadow-2xl">
              {currentStep === 'plan' && renderPlanSelection()}
              {currentStep === 'details' && renderDetailsForm()}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="flex-shrink-0 py-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-gray-400 text-sm">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="text-primary-400 hover:text-primary-300 font-medium transition-colors hover:underline"
              >
                Sign in
              </Link>
            </p>
            <p className="text-gray-500 text-xs mt-2">
              By creating an account, you agree to our{' '}
              <a href="#" className="text-primary-400 hover:text-primary-300 transition-colors hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-primary-400 hover:text-primary-300 transition-colors hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};