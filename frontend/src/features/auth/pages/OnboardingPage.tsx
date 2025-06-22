import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../../../api/client';
import {
  ShieldCheckIcon,
  CheckIcon,
  CogIcon,
  UsersIcon,
  CreditCardIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface OnboardingStep {
  id: string;
  title: string;
  completed: boolean;
  description: string;
}

interface OnboardingStatus {
  organization_id: string;
  onboarding_complete: boolean;
  progress_percentage: number;
  completed_steps: number;
  total_steps: number;
  steps: OnboardingStep[];
  license_info: {
    name: string;
    price: number;
    features: string[];
  };
  next_action: string;
}

interface OrganizationSetupData {
  network_ranges: string[];
  security_policies: string[];
  compliance_frameworks: string[];
  scan_frequency: string;
}

export const OnboardingPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [setupData, setSetupData] = useState<OrganizationSetupData>({
    network_ranges: [''],
    security_policies: [],
    compliance_frameworks: [],
    scan_frequency: 'daily',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    const loadOnboardingStatus = async () => {
      if (!user?.org_id) return;

      try {
        const response = await apiClient.get(`/api/organizations/${user.org_id}/onboarding-status`);
        if (response.status === 'success' && response.data) {
          const data = response.data as OnboardingStatus;
          setOnboardingStatus(data);
          
          // Set current step to the first incomplete step
          const nextStep = data.steps.find(step => !step.completed);
          setCurrentStep(nextStep?.id || 'complete');
        }
      } catch (error) {
        console.error('Failed to load onboarding status:', error);
        alert('Failed to load onboarding information');
      } finally {
        setLoading(false);
      }
    };

    loadOnboardingStatus();
  }, [user?.org_id]);

  // If not authenticated, redirect to login (after hooks)
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleNetworkRangeChange = (index: number, value: string) => {
    const newRanges = [...setupData.network_ranges];
    newRanges[index] = value;
    setSetupData(prev => ({ ...prev, network_ranges: newRanges }));
  };

  const addNetworkRange = () => {
    setSetupData(prev => ({
      ...prev,
      network_ranges: [...prev.network_ranges, '']
    }));
  };

  const removeNetworkRange = (index: number) => {
    const newRanges = setupData.network_ranges.filter((_, i) => i !== index);
    setSetupData(prev => ({ ...prev, network_ranges: newRanges }));
  };

  const handlePolicyToggle = (policy: string) => {
    const isSelected = setupData.security_policies.includes(policy);
    const newPolicies = isSelected
      ? setupData.security_policies.filter(p => p !== policy)
      : [...setupData.security_policies, policy];
    
    setSetupData(prev => ({ ...prev, security_policies: newPolicies }));
  };

  const handleComplianceToggle = (framework: string) => {
    const isSelected = setupData.compliance_frameworks.includes(framework);
    const newFrameworks = isSelected
      ? setupData.compliance_frameworks.filter(f => f !== framework)
      : [...setupData.compliance_frameworks, framework];
    
    setSetupData(prev => ({ ...prev, compliance_frameworks: newFrameworks }));
  };

  const handleCompleteSetup = async () => {
    if (!user?.org_id) return;

    setIsSubmitting(true);
    try {
      const response = await apiClient.post(`/api/organizations/${user.org_id}/setup`, {
        organization_id: user.org_id,
        ...setupData,
      });

      if (response.status === 'success') {
        alert('Organization setup completed successfully!');
        // Reload onboarding status
        window.location.reload();
      }
    } catch (error) {
      console.error('Setup failed:', error);
      alert('Failed to complete organization setup');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipToApp = () => {
    // Redirect to main dashboard
    window.location.href = '/';
  };

  const renderProgressBar = () => {
    if (!onboardingStatus) return null;

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Onboarding Progress</span>
          <span className="text-sm text-gray-500">
            {onboardingStatus.completed_steps} of {onboardingStatus.total_steps} completed
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${onboardingStatus.progress_percentage}%` }}
          ></div>
        </div>
        <div className="text-center mt-2">
          <span className="text-lg font-semibold text-blue-600">
            {Math.round(onboardingStatus.progress_percentage)}%
          </span>
        </div>
      </div>
    );
  };

  const renderStepList = () => {
    if (!onboardingStatus) return null;

    const getStepIcon = (stepId: string, completed: boolean) => {
      if (completed) {
        return <CheckIcon className="w-5 h-5 text-white" />;
      }

      switch (stepId) {
        case 'account_created':
          return <UsersIcon className="w-5 h-5 text-gray-400" />;
        case 'license_selected':
          return <DocumentTextIcon className="w-5 h-5 text-gray-400" />;
        case 'organization_setup':
          return <CogIcon className="w-5 h-5 text-gray-400" />;
        case 'billing_setup':
          return <CreditCardIcon className="w-5 h-5 text-gray-400" />;
        case 'team_invitation':
          return <UsersIcon className="w-5 h-5 text-gray-400" />;
        default:
          return <ClockIcon className="w-5 h-5 text-gray-400" />;
      }
    };

    return (
      <div className="space-y-4">
        {onboardingStatus.steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-start p-4 rounded-lg border-2 ${
              step.completed
                ? 'border-green-200 bg-green-50'
                : currentStep === step.id
                ? 'border-blue-200 bg-blue-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full mr-4 ${
                step.completed
                  ? 'bg-green-500'
                  : currentStep === step.id
                  ? 'bg-blue-500'
                  : 'bg-gray-300'
              }`}
            >
              {getStepIcon(step.id, step.completed)}
            </div>
            <div className="flex-1">
              <h3 className={`font-medium ${
                step.completed ? 'text-green-800' : 'text-gray-900'
              }`}>
                {step.title}
              </h3>
              <p className={`text-sm ${
                step.completed ? 'text-green-600' : 'text-gray-600'
              }`}>
                {step.description}
              </p>
            </div>
            {step.completed && (
              <CheckIcon className="w-6 h-6 text-green-500 ml-2" />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderOrganizationSetup = () => {
    const securityPolicies = [
      'Password Policy Enforcement',
      'Multi-Factor Authentication',
      'Network Segmentation',
      'Endpoint Protection',
      'Data Encryption',
      'Access Control Lists',
    ];

    const complianceFrameworks = [
      'SOC 2',
      'ISO 27001',
      'GDPR',
      'HIPAA',
      'PCI DSS',
      'NIST Framework',
    ];

    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-6">
          <CogIcon className="w-8 h-8 text-blue-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Organization Setup</h2>
        </div>

        <div className="space-y-6">
          {/* Network Ranges */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <GlobeAltIcon className="w-4 h-4 inline mr-1" />
              Network IP Ranges
            </label>
            <p className="text-sm text-gray-600 mb-3">
              Define the IP ranges that SecureNet should monitor for your organization.
            </p>
            {setupData.network_ranges.map((range, index) => (
              <div key={index} className="flex items-center mb-2">
                <input
                  type="text"
                  value={range}
                  onChange={(e) => handleNetworkRangeChange(index, e.target.value)}
                  placeholder="e.g., 192.168.1.0/24"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {setupData.network_ranges.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeNetworkRange(index)}
                    className="ml-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addNetworkRange}
              className="mt-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
            >
              Add Network Range
            </button>
          </div>

          {/* Security Policies */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Security Policies
            </label>
            <p className="text-sm text-gray-600 mb-3">
              Select the security policies you want to enforce.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {securityPolicies.map((policy) => (
                <label key={policy} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={setupData.security_policies.includes(policy)}
                    onChange={() => handlePolicyToggle(policy)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{policy}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Compliance Frameworks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Compliance Frameworks
            </label>
            <p className="text-sm text-gray-600 mb-3">
              Select applicable compliance frameworks for your organization.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {complianceFrameworks.map((framework) => (
                <label key={framework} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={setupData.compliance_frameworks.includes(framework)}
                    onChange={() => handleComplianceToggle(framework)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{framework}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Scan Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scan Frequency
            </label>
            <select
              value={setupData.scan_frequency}
              onChange={(e) => setSetupData(prev => ({ ...prev, scan_frequency: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-6">
            <button
              type="button"
              onClick={handleSkipToApp}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Skip for Now
            </button>
            <button
              type="button"
              onClick={handleCompleteSetup}
              disabled={isSubmitting}
              className={`px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? 'Completing Setup...' : 'Complete Setup'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading onboarding...</p>
        </div>
      </div>
    );
  }

  if (!onboardingStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Unable to load onboarding information</p>
          <button
            onClick={handleSkipToApp}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Continue to App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <ShieldCheckIcon className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome to SecureNet</h1>
          <p className="text-gray-600">Let's get your organization set up for success</p>
          
          {onboardingStatus.license_info && (
            <div className="mt-4 inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full">
              <span className="font-medium">{onboardingStatus.license_info.name}</span>
              <span className="mx-2">•</span>
              <span>${onboardingStatus.license_info.price}/month</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {renderProgressBar()}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Steps Overview */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Setup Steps</h2>
            {renderStepList()}
          </div>

          {/* Current Step Content */}
          <div className="lg:col-span-2">
            {currentStep === 'organization_setup' && renderOrganizationSetup()}
            
            {currentStep === 'billing_setup' && (
              <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                <CreditCardIcon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Billing Setup</h2>
                <p className="text-gray-600 mb-6">
                  Set up your payment method to activate your SecureNet subscription.
                </p>
                <div className="space-y-4">
                  <button className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Set Up Billing
                  </button>
                  <button
                    onClick={handleSkipToApp}
                    className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Skip for Now
                  </button>
                </div>
              </div>
            )}

            {currentStep === 'team_invitation' && (
              <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                <UsersIcon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Invite Team Members</h2>
                <p className="text-gray-600 mb-6">
                  Add team members to your SecureNet organization.
                </p>
                <div className="space-y-4">
                  <button className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Invite Team Members
                  </button>
                  <button
                    onClick={handleSkipToApp}
                    className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Skip for Now
                  </button>
                </div>
              </div>
            )}

            {currentStep === 'complete' && (
              <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                <CheckIcon className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Setup Complete!</h2>
                <p className="text-gray-600 mb-6">
                  Your SecureNet organization is ready to go. You can always modify these settings later.
                </p>
                <button
                  onClick={handleSkipToApp}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Launch SecureNet Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 