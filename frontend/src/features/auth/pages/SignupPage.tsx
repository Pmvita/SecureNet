import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../../../api/client';
import {
  ShieldCheckIcon,
  StarIcon,
  Cog6ToothIcon,
  UserIcon,
  EyeIcon,
  EyeSlashIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

interface LicenseTier {
  price: number;
  name: string;
  max_users_per_license: number;
  features: string[];
  permissions?: string[];
}

interface LicenseTiers {
  [key: string]: LicenseTier;
}

interface SignupData {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
  organization_name: string;
  license_type: string;
  first_name: string;
  last_name: string;
  company_size: string;
  industry: string;
  phone: string;
}

export const SignupPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [licenseTiers, setLicenseTiers] = useState<LicenseTiers>({});
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  const [formData, setFormData] = useState<SignupData>({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    organization_name: '',
    license_type: '',
    first_name: '',
    last_name: '',
    company_size: '',
    industry: '',
    phone: '',
  });

  const [errors, setErrors] = useState<Partial<SignupData>>({});

  // Load license tiers
  useEffect(() => {
    const loadLicenseTiers = async () => {
      try {
        const response = await apiClient.get('/api/licenses');
        if (response.status === 'success' && response.data && typeof response.data === 'object') {
          const data = response.data as { tiers: LicenseTiers };
          setLicenseTiers(data.tiers);
        }
      } catch (error) {
        console.error('Failed to load license tiers:', error);
        alert('Failed to load license information');
      } finally {
        setLoading(false);
      }
    };

    loadLicenseTiers();
  }, []);

  // If already authenticated, redirect (after hooks)
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const validateStep = (stepNumber: number): boolean => {
    const newErrors: Partial<SignupData> = {};

    if (stepNumber === 1) {
      // Personal Information
      if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
      if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Invalid email format';
      }
      if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    }

    if (stepNumber === 2) {
      // Organization Information
      if (!formData.organization_name.trim()) {
        newErrors.organization_name = 'Organization name is required';
      }
      if (!formData.company_size) newErrors.company_size = 'Company size is required';
      if (!formData.industry) newErrors.industry = 'Industry is required';
    }

    if (stepNumber === 3) {
      // License Selection
      if (!formData.license_type) newErrors.license_type = 'Please select a license';
    }

    if (stepNumber === 4) {
      // Account Credentials
      if (!formData.username.trim()) newErrors.username = 'Username is required';
      else if (formData.username.length < 3) {
        newErrors.username = 'Username must be at least 3 characters';
      } else if (!/^[a-zA-Z0-9]+$/.test(formData.username)) {
        newErrors.username = 'Username must be alphanumeric';
      }

      if (!formData.password) newErrors.password = 'Password is required';
      else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }

      if (!formData.confirm_password) {
        newErrors.confirm_password = 'Please confirm your password';
      } else if (formData.password !== formData.confirm_password) {
        newErrors.confirm_password = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    setStep(step - 1);
    setErrors({});
  };

  const handleInputChange = (field: keyof SignupData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setIsSubmitting(true);
    try {
      const response = await apiClient.post('/api/auth/signup', formData);
      
      if (response.status === 'success' && response.data && typeof response.data === 'object') {
        const data = response.data as { token: string };
        alert('Account created successfully! Redirecting to onboarding...');
        
        // Store token and redirect to onboarding
        localStorage.setItem('auth_token', data.token);
        window.location.href = '/onboarding';
      }
    } catch (error: unknown) {
      const errorMessage = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to create account';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4].map((stepNumber) => (
        <React.Fragment key={stepNumber}>
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              stepNumber <= step
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-gray-300 text-gray-400'
            }`}
          >
            {stepNumber < step ? (
              <CheckIcon className="w-5 h-5" />
            ) : (
              <span className="text-sm font-medium">{stepNumber}</span>
            )}
          </div>
          {stepNumber < 4 && (
            <div
              className={`w-12 h-0.5 mx-2 ${
                stepNumber < step ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderPersonalInfo = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
        <p className="text-gray-600">Let's start with your basic information</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            First Name *
          </label>
          <input
            type="text"
            value={formData.first_name}
            onChange={(e) => handleInputChange('first_name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.first_name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your first name"
          />
          {errors.first_name && (
            <p className="text-red-500 text-sm mt-1">{errors.first_name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last Name *
          </label>
          <input
            type="text"
            value={formData.last_name}
            onChange={(e) => handleInputChange('last_name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.last_name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your last name"
          />
          {errors.last_name && (
            <p className="text-red-500 text-sm mt-1">{errors.last_name}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <EnvelopeIcon className="w-4 h-4 inline mr-1" />
          Email Address *
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.email ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter your email address"
        />
        {errors.email && (
          <p className="text-red-500 text-sm mt-1">{errors.email}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <PhoneIcon className="w-4 h-4 inline mr-1" />
          Phone Number *
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.phone ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter your phone number"
        />
        {errors.phone && (
          <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
        )}
      </div>
    </div>
  );

  const renderOrganizationInfo = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Organization Details</h2>
        <p className="text-gray-600">Tell us about your organization</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <BuildingOfficeIcon className="w-4 h-4 inline mr-1" />
          Organization Name *
        </label>
        <input
          type="text"
          value={formData.organization_name}
          onChange={(e) => handleInputChange('organization_name', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.organization_name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter your organization name"
        />
        {errors.organization_name && (
          <p className="text-red-500 text-sm mt-1">{errors.organization_name}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Company Size *
        </label>
        <select
          value={formData.company_size}
          onChange={(e) => handleInputChange('company_size', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.company_size ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">Select company size</option>
          <option value="1-10">1-10 employees</option>
          <option value="11-50">11-50 employees</option>
          <option value="51-200">51-200 employees</option>
          <option value="201-1000">201-1000 employees</option>
          <option value="1000+">1000+ employees</option>
        </select>
        {errors.company_size && (
          <p className="text-red-500 text-sm mt-1">{errors.company_size}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Industry *
        </label>
        <select
          value={formData.industry}
          onChange={(e) => handleInputChange('industry', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.industry ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">Select industry</option>
          <option value="technology">Technology</option>
          <option value="healthcare">Healthcare</option>
          <option value="finance">Financial Services</option>
          <option value="government">Government</option>
          <option value="education">Education</option>
          <option value="manufacturing">Manufacturing</option>
          <option value="retail">Retail</option>
          <option value="other">Other</option>
        </select>
        {errors.industry && (
          <p className="text-red-500 text-sm mt-1">{errors.industry}</p>
        )}
      </div>
    </div>
  );

  const renderLicenseSelection = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Choose Your License</h2>
        <p className="text-gray-600">Select the plan that best fits your needs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(licenseTiers).map(([key, tier]) => (
          <div
            key={key}
            className={`relative border-2 rounded-lg p-6 cursor-pointer transition-all ${
              formData.license_type === key
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleInputChange('license_type', key)}
          >
            {formData.license_type === key && (
              <div className="absolute top-4 right-4">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <CheckIcon className="w-4 h-4 text-white" />
                </div>
              </div>
            )}

            <div className="text-center">
              <div className="mb-4">
                {key === 'executive' && <StarIcon className="w-8 h-8 text-yellow-500 mx-auto" />}
                {key === 'soc_analyst' && <Cog6ToothIcon className="w-8 h-8 text-blue-500 mx-auto" />}
                {key === 'basic_user' && <UserIcon className="w-8 h-8 text-green-500 mx-auto" />}
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">{tier.name}</h3>
              
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">${tier.price}</span>
                <span className="text-gray-600">/month</span>
              </div>

              <ul className="text-left space-y-2 text-sm">
                {tier.features.slice(0, 4).map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckIcon className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 capitalize">
                      {feature.replace(/_/g, ' ')}
                    </span>
                  </li>
                ))}
                {tier.features.length > 4 && (
                  <li className="text-gray-500 text-xs">
                    +{tier.features.length - 4} more features
                  </li>
                )}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {errors.license_type && (
        <p className="text-red-500 text-sm text-center">{errors.license_type}</p>
      )}
    </div>
  );

  const renderAccountCredentials = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Account Credentials</h2>
        <p className="text-gray-600">Create your login credentials</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <UserIcon className="w-4 h-4 inline mr-1" />
          Username *
        </label>
        <input
          type="text"
          value={formData.username}
          onChange={(e) => handleInputChange('username', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.username ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Choose a username"
        />
        {errors.username && (
          <p className="text-red-500 text-sm mt-1">{errors.username}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Password *
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.password ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Create a password"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeSlashIcon className="w-5 h-5 text-gray-400" />
            ) : (
              <EyeIcon className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-red-500 text-sm mt-1">{errors.password}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Confirm Password *
        </label>
        <div className="relative">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirm_password}
            onChange={(e) => handleInputChange('confirm_password', e.target.value)}
            className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.confirm_password ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Confirm your password"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? (
              <EyeSlashIcon className="w-5 h-5 text-gray-400" />
            ) : (
              <EyeIcon className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>
        {errors.confirm_password && (
          <p className="text-red-500 text-sm mt-1">{errors.confirm_password}</p>
        )}
      </div>

      {formData.license_type && licenseTiers[formData.license_type] && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Selected Plan Summary</h4>
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-700">
              {licenseTiers[formData.license_type].name}
            </span>
            <span className="font-medium text-blue-900">
              ${licenseTiers[formData.license_type].price}/month
            </span>
          </div>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading signup form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <ShieldCheckIcon className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Join SecureNet</h1>
          <p className="text-gray-600">AI-Powered Network Security Platform</p>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {step === 1 && renderPersonalInfo()}
          {step === 2 && renderOrganizationInfo()}
          {step === 3 && renderLicenseSelection()}
          {step === 4 && renderAccountCredentials()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              type="button"
              onClick={handlePrevious}
              className={`px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 ${
                step === 1 ? 'invisible' : ''
              }`}
            >
              Previous
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Login Link */}
        <div className="text-center mt-6">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}; 