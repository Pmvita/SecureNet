import React, { useState, useEffect } from 'react';
import { useAuth } from '../../features/auth/context/AuthContext';
import { apiClient } from '../../api/client';
import { Card } from '../../components/common/Card/Card';
import { Button } from '../../components/common/Button/Button';
import { Alert } from '../../components/common/Alert/Alert';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  EyeIcon,
  Cog6ToothIcon,
  BellIcon,
  CommandLineIcon,
  StarIcon,
  FireIcon,
  BoltIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  LockClosedIcon,
  UserGroupIcon,
  HandRaisedIcon
} from '@heroicons/react/24/outline';
import {
  ChartBarIcon as ChartBarIconSolid,
  CurrencyDollarIcon as CurrencyDollarIconSolid,
  UsersIcon as UsersIconSolid,
  ShieldCheckIcon as ShieldCheckIconSolid,
  StarIcon as StarIconSolid
} from '@heroicons/react/24/solid';

interface BusinessMetrics {
  company_health: {
    monthly_recurring_revenue: string;
    customer_count: number;
    churn_rate: string;
    growth_rate: string;
    uptime: string;
  };
  customer_analytics: {
    enterprise_customers: number;
    sme_customers: number;
    trial_conversions: string;
    support_satisfaction: string;
  };
  technical_metrics: {
    system_performance: string;
    security_incidents: number;
    feature_adoption: string;
    api_usage: string;
  };
}

interface FounderMetrics {
  company_health: {
    monthly_recurring_revenue: string;
    customer_count: number;
    churn_rate: string;
    growth_rate: string;
    uptime: string;
  };
  customer_analytics: {
    enterprise_customers: number;
    sme_customers: number;
    trial_conversions: string;
    support_satisfaction: string;
  };
  technical_metrics: {
    system_performance: string;
    security_incidents: number;
    feature_adoption: string;
    api_usage: string;
  };
  financial_summary: {
    mrr: number;
    arr: number;
    growth_rate: number;
    churn_rate: number;
  };
}

interface OrganizationalControlData {
  employee_management: {
    total_employees: number;
    active_employees: number;
    on_leave: number;
    pending_onboarding: number;
    department_breakdown: Record<string, number>;
    access_levels: Record<string, number>;
  };
  contractor_oversight: {
    active_contractors: number;
    contract_types: Record<string, number>;
    expiring_contracts: Record<string, number>;
    compliance_status: string;
  };
  partner_management: {
    channel_partners: number;
    integration_partners: number;
    revenue_partners: number;
    api_integrations: number;
    partner_health_score: number;
  };
  vendor_control: {
    active_vendors: number;
    third_party_integrations: number;
    vendor_risk_assessment: string;
    contract_renewals_due: number;
    spend_this_quarter: string;
  };
  compliance_management: {
    frameworks: Record<string, unknown>;
    compliance_score: number;
    open_findings: number;
    remediation_progress: string;
  };
  legal_ip_control: {
    intellectual_property: {
      patents_filed: number;
      trademarks: number;
      copyrights: number;
    };
    legal_compliance: {
      contracts_under_review: number;
      legal_risk_score: string;
      pending_agreements: number;
    };
    ip_monitoring: {
      infringement_alerts: number;
      domain_monitoring: string;
      brand_protection: string;
    };
  };
}

interface OrganizationalControlCardProps {
  title: string;
  description: string;
  status: string;
  metrics: Record<string, string | number>;
  documentationLink: string;
  onClick: () => void;
}

const OrganizationalControlCard: React.FC<OrganizationalControlCardProps> = ({
  title,
  description,
  status,
  metrics,
  documentationLink,
  onClick
}) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 cursor-pointer transition-all duration-200"
    onClick={onClick}
  >
    <div className="flex justify-between items-start mb-4">
      <h4 className="text-lg font-semibold text-gray-900">{title}</h4>
      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
        {status}
      </span>
    </div>
    <p className="text-gray-600 text-sm mb-4">{description}</p>
    
    <div className="grid grid-cols-2 gap-4 mb-4">
      {Object.entries(metrics).slice(0, 4).map(([key, value]) => (
        <div key={key} className="text-center">
          <div className="text-xl font-bold text-blue-600">{value}</div>
          <div className="text-xs text-gray-500 capitalize">{key.replace('_', ' ')}</div>
        </div>
      ))}
    </div>
    
    <div className="flex justify-between items-center">
      <a 
        href={documentationLink} 
        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        onClick={(e) => e.stopPropagation()}
      >
        View Documentation →
      </a>
      <Button size="sm" variant="outline">
        Manage
      </Button>
    </div>
  </motion.div>
);

export const FounderDashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<FounderMetrics | null>(null);
  const [organizationalData, setOrganizationalData] = useState<OrganizationalControlData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch founder dashboard metrics using apiClient
      const metricsResponse = await apiClient.get('/api/founder/dashboard/metrics');
      setMetrics(metricsResponse.data as FounderMetrics);
      
      // Fetch organizational control data using apiClient
      const orgResponse = await apiClient.get('/api/founder/organizational-control/overview');
      setOrganizationalData(orgResponse.data as OrganizationalControlData);
      
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Function to handle organizational control actions
  const handleOrganizationalAction = async (action: string, category: string, details: Record<string, unknown>) => {
    try {
      await apiClient.post('/api/founder/organizational-control/audit-log', {
        action,
        category,
        resource_type: 'organizational_control',
        details,
        ip_address: 'browser_client',
        user_agent: navigator.userAgent,
        compliance_framework: 'SOC2_ISO27001',
        risk_level: 'low'
      });
    } catch (error) {
      console.error('Error logging organizational action:', error);
    }
  };

  const scrollToOrganizationalControl = () => {
    document.getElementById('organizational-control')?.scrollIntoView({ 
      behavior: 'smooth' 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading founder dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert type="error" title="Error" message={error} />
      </div>
    );
  }

  if (!metrics || !organizationalData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert type="warning" title="No Data Available" message="Please check your connection and try again." />
      </div>
    );
  }

  // Additional safety check for nested properties
  if (!metrics.company_health || !metrics.customer_analytics || !metrics.financial_summary || !organizationalData.employee_management) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert type="warning" title="Incomplete Data" message="Dashboard data is incomplete. Please refresh the page." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <StarIconSolid className="w-8 h-8 text-yellow-400" />
                Executive Command Center
              </h1>
              <p className="text-purple-100 mt-1">
                Ultimate platform control and strategic oversight - {user?.username}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-purple-100">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
              <Button
                onClick={async () => {
                  setIsRefreshing(true);
                  await fetchData();
                  setIsRefreshing(false);
                }}
                disabled={isRefreshing}
                className="bg-purple-700 hover:bg-purple-600 px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={() => window.location.href = '/founder/employee-management'}
                  className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg flex items-center gap-2 text-sm"
                >
                  <HandRaisedIcon className="w-4 h-4" />
                  Employees
                </Button>
                <Button
                  onClick={() => window.location.href = '/founder/documentation'}
                  className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg flex items-center gap-2 text-sm"
                >
                  <DocumentTextIcon className="w-4 h-4" />
                  Docs
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-gray-900 rounded-lg p-1">
          {[
            { id: 'overview', label: 'Executive Overview', icon: ChartBarIcon },
            { id: 'financial', label: 'Financial Command', icon: CurrencyDollarIcon },
            { id: 'operations', label: 'Operations Control', icon: Cog6ToothIcon },
            { id: 'security', label: 'Security Command', icon: ShieldCheckIcon },
            { id: 'intelligence', label: 'Business Intelligence', icon: SparklesIcon },
            { id: 'emergency', label: 'Emergency Controls', icon: ExclamationTriangleIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                selectedTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Company Health Metrics */}
            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <ChartBarIconSolid className="w-6 h-6 text-blue-400" />
                Company Health & Performance
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.1 }}
                  className="text-center p-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg"
                >
                  <div className="text-3xl font-bold text-white">{metrics?.company_health?.uptime || 'N/A'}</div>
                  <div className="text-sm text-green-100">Platform Uptime</div>
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.2 }}
                  className="text-center p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg"
                >
                  <div className="text-3xl font-bold text-white">{metrics?.company_health?.customer_count?.toLocaleString() || '0'}</div>
                  <div className="text-sm text-blue-100">Total Customers</div>
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.3 }}
                  className="text-center p-4 bg-gradient-to-br from-purple-500 to-violet-500 rounded-lg"
                >
                  <div className="text-3xl font-bold text-white">{metrics?.company_health?.monthly_recurring_revenue || 'N/A'}</div>
                  <div className="text-sm text-purple-100">Monthly Revenue</div>
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.4 }}
                  className="text-center p-4 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-lg"
                >
                  <div className="text-3xl font-bold text-white">{metrics?.company_health?.growth_rate || 'N/A'}</div>
                  <div className="text-sm text-indigo-100">Growth Rate</div>
                </motion.div>
              </div>
            </div>

            {/* Customer Analytics */}
            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <UsersIconSolid className="w-6 h-6 text-emerald-400" />
                Customer Analytics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.1 }}
                  className="text-center p-4 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg"
                >
                  <div className="text-3xl font-bold text-white">{metrics?.customer_analytics?.enterprise_customers || 0}</div>
                  <div className="text-sm text-emerald-100">Enterprise Customers</div>
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.2 }}
                  className="text-center p-4 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg"
                >
                  <div className="text-3xl font-bold text-white">{metrics?.customer_analytics?.sme_customers || 0}</div>
                  <div className="text-sm text-teal-100">SME Customers</div>
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.3 }}
                  className="text-center p-4 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg"
                >
                  <div className="text-3xl font-bold text-white">{metrics?.customer_analytics?.trial_conversions || 'N/A'}</div>
                  <div className="text-sm text-cyan-100">Trial Conversions</div>
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.4 }}
                  className="text-center p-4 bg-gradient-to-br from-sky-500 to-indigo-500 rounded-lg"
                >
                  <div className="text-3xl font-bold text-white">{metrics?.customer_analytics?.support_satisfaction || 'N/A'}</div>
                  <div className="text-sm text-sky-100">Support Satisfaction</div>
                </motion.div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <CurrencyDollarIconSolid className="w-6 h-6 text-green-400" />
                Financial Summary
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.1 }}
                  className="text-center p-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg"
                >
                  <div className="text-3xl font-bold text-white">${metrics?.financial_summary?.mrr?.toLocaleString() || 'N/A'}</div>
                  <div className="text-sm text-green-100">Monthly Recurring Revenue</div>
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.2 }}
                  className="text-center p-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg"
                >
                  <div className="text-3xl font-bold text-white">${metrics?.financial_summary?.arr?.toLocaleString() || 'N/A'}</div>
                  <div className="text-sm text-orange-100">Annual Recurring Revenue</div>
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.3 }}
                  className="text-center p-4 bg-gradient-to-br from-purple-500 to-violet-500 rounded-lg"
                >
                  <div className="text-3xl font-bold text-white">{metrics?.financial_summary?.growth_rate || 0}%</div>
                  <div className="text-sm text-purple-100">Growth Rate</div>
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.4 }}
                  className="text-center p-4 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg"
                >
                  <div className="text-3xl font-bold text-white">{metrics?.financial_summary?.churn_rate || 0}%</div>
                  <div className="text-sm text-blue-100">Churn Rate</div>
                </motion.div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <BoltIcon className="w-6 h-6 text-yellow-400" />
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button
                  onClick={() => window.location.href = '/founder/employee-management'}
                  className="bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 p-4 rounded-lg flex items-center justify-center gap-2"
                >
                  <UsersIcon className="w-5 h-5" />
                  Employee Management
                </Button>
                <Button
                  onClick={() => window.location.href = '/founder/documentation'}
                  className="bg-gradient-to-br from-gray-600 to-slate-600 hover:from-gray-700 hover:to-slate-700 p-4 rounded-lg flex items-center justify-center gap-2"
                >
                  <DocumentTextIcon className="w-5 h-5" />
                  Documentation
                </Button>
                <Button
                  onClick={() => window.location.href = '/founder/financial'}
                  className="bg-gradient-to-br from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 p-4 rounded-lg flex items-center justify-center gap-2"
                >
                  <CurrencyDollarIcon className="w-5 h-5" />
                  Financial Control
                </Button>
                <Button
                  onClick={() => window.location.href = '/founder/system'}
                  className="bg-gradient-to-br from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 p-4 rounded-lg flex items-center justify-center gap-2"
                >
                  <Cog6ToothIcon className="w-5 h-5" />
                  System Admin
                </Button>
                <Button
                  onClick={() => setSelectedTab('emergency')}
                  className="bg-gradient-to-br from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 p-4 rounded-lg flex items-center justify-center gap-2"
                >
                  <ExclamationTriangleIcon className="w-5 h-5" />
                  Emergency
                </Button>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'financial' && (
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <CurrencyDollarIconSolid className="w-6 h-6 text-green-400" />
                Financial Command Center
              </h2>
              <p className="text-gray-300 mb-4">Access comprehensive financial controls and revenue management.</p>
              <Button
                onClick={() => window.location.href = '/founder/financial'}
                className="bg-green-600 hover:bg-green-700"
              >
                Open Financial Control
              </Button>
            </div>
          </div>
        )}

        {selectedTab === 'operations' && (
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Cog6ToothIcon className="w-6 h-6 text-blue-400" />
                Operations Control Center
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <motion.div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-2">Employee Management</h3>
                  <p className="text-gray-300 text-sm mb-4">
                    Total: {organizationalData?.employee_management?.total_employees || 0} employees
                  </p>
                  <Button 
                    onClick={() => window.location.href = '/founder/employee-management'}
                    size="sm"
                  >
                    Manage
                  </Button>
                </motion.div>
                <motion.div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-2">Contractors</h3>
                  <p className="text-gray-300 text-sm mb-4">
                    Active: {organizationalData?.contractor_oversight?.active_contractors || 0} contractors
                  </p>
                  <Button size="sm">Manage</Button>
                </motion.div>
                <motion.div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-2">Partners</h3>
                  <p className="text-gray-300 text-sm mb-4">
                    Total: {(organizationalData?.partner_management?.channel_partners || 0) + (organizationalData?.partner_management?.integration_partners || 0)} partners
                  </p>
                  <Button size="sm">Manage</Button>
                </motion.div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'security' && (
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <ShieldCheckIconSolid className="w-6 h-6 text-red-400" />
                Security Command Center
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <motion.div className="bg-red-900 border border-red-600 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-2">Security Incidents</h3>
                  <p className="text-red-100 text-3xl font-bold mb-2">
                    {metrics?.technical_metrics?.security_incidents || 0}
                  </p>
                  <Button size="sm" variant="outline">View Details</Button>
                </motion.div>
                <motion.div className="bg-green-900 border border-green-600 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-2">Compliance Score</h3>
                  <p className="text-green-100 text-3xl font-bold mb-2">
                    {organizationalData?.compliance_management?.compliance_score || 0}%
                  </p>
                  <Button size="sm" variant="outline">View Report</Button>
                </motion.div>
                <motion.div className="bg-blue-900 border border-blue-600 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-2">System Performance</h3>
                  <p className="text-blue-100 text-lg font-semibold mb-2">
                    {metrics?.technical_metrics?.system_performance || 'Unknown'}
                  </p>
                  <Button size="sm" variant="outline">Monitor</Button>
                </motion.div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'intelligence' && (
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <SparklesIcon className="w-6 h-6 text-purple-400" />
                Business Intelligence
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-2">Feature Adoption</h3>
                  <p className="text-gray-300 text-3xl font-bold mb-2">
                    {metrics?.technical_metrics?.feature_adoption || 'N/A'}
                  </p>
                </motion.div>
                <motion.div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-2">API Usage</h3>
                  <p className="text-gray-300 text-2xl font-bold mb-2">
                    {metrics?.technical_metrics?.api_usage || 'N/A'}
                  </p>
                </motion.div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'emergency' && (
          <div className="space-y-6">
            <div className="bg-red-900 border border-red-600 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
                Emergency Controls - Founder Only
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => alert('System reset initiated...')}
                  className="bg-red-600 hover:bg-red-700 p-4 rounded-lg"
                >
                  System Reset
                </Button>
                <Button
                  onClick={() => alert('Emergency override activated...')}
                  className="bg-orange-600 hover:bg-orange-700 p-4 rounded-lg"
                >
                  Emergency Override
                </Button>
                <Button
                  onClick={() => alert('Maintenance mode enabled...')}
                  className="bg-yellow-600 hover:bg-yellow-700 p-4 rounded-lg"
                >
                  Maintenance Mode
                </Button>
                <Button
                  onClick={() => alert('Database recovery initiated...')}
                  className="bg-purple-600 hover:bg-purple-700 p-4 rounded-lg"
                >
                  Database Recovery
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FounderDashboard; 