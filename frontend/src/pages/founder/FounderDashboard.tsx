import React, { useState, useEffect } from 'react';
import { useAuth } from '../../features/auth/context/AuthContext';
import { apiClient } from '../../api/client';
import { 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  UserGroupIcon, 
  ShieldCheckIcon,
  CogIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  BuildingOfficeIcon,
  ClockIcon,
  ServerIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { Card } from '../../components/common/Card/Card';
import { Button } from '../../components/common/Button/Button';
import { Alert } from '../../components/common/Alert/Alert';

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch founder dashboard metrics using apiClient
        const metricsResponse = await apiClient.get('/api/founder/dashboard/metrics');
        setMetrics(metricsResponse.data as FounderMetrics);
        
        // Fetch organizational control data using apiClient
        const orgResponse = await apiClient.get('/api/founder/organizational-control/overview');
        setOrganizationalData(orgResponse.data as OrganizationalControlData);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

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
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          🏆 Founder Command Center
        </h1>
        <p className="text-xl text-gray-600 mb-6">
          Ultimate platform control and strategic oversight
        </p>
        <Button 
          onClick={scrollToOrganizationalControl}
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          View Organizational Control
        </Button>
      </div>

      {/* Company Health Metrics */}
      <Card>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Company Health & Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600">{metrics.company_health?.uptime || 'N/A'}</div>
            <div className="text-sm text-gray-600">Platform Uptime</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">{metrics.company_health?.customer_count?.toLocaleString() || '0'}</div>
            <div className="text-sm text-gray-600">Total Customers</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">{metrics.company_health?.monthly_recurring_revenue || 'N/A'}</div>
            <div className="text-sm text-gray-600">Monthly Revenue</div>
          </div>
          <div className="text-center p-4 bg-indigo-50 rounded-lg">
            <div className="text-3xl font-bold text-indigo-600">{metrics.company_health?.growth_rate || 'N/A'}</div>
            <div className="text-sm text-gray-600">Growth Rate</div>
          </div>
        </div>
      </Card>

      {/* Customer Analytics */}
      <Card>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-emerald-50 rounded-lg">
            <div className="text-3xl font-bold text-emerald-600">{metrics.customer_analytics?.enterprise_customers || 0}</div>
            <div className="text-sm text-gray-600">Enterprise Customers</div>
          </div>
          <div className="text-center p-4 bg-teal-50 rounded-lg">
            <div className="text-3xl font-bold text-teal-600">{metrics.customer_analytics?.sme_customers || 0}</div>
            <div className="text-sm text-gray-600">SME Customers</div>
          </div>
          <div className="text-center p-4 bg-cyan-50 rounded-lg">
            <div className="text-3xl font-bold text-cyan-600">{metrics.customer_analytics?.trial_conversions || 'N/A'}</div>
            <div className="text-sm text-gray-600">Trial Conversions</div>
          </div>
          <div className="text-center p-4 bg-sky-50 rounded-lg">
            <div className="text-3xl font-bold text-sky-600">{metrics.customer_analytics?.support_satisfaction || 'N/A'}</div>
            <div className="text-sm text-gray-600">Support Satisfaction</div>
          </div>
        </div>
      </Card>

      {/* Organizational Control Section */}
      <Card id="organizational-control">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Organizational Control</h2>
            <p className="text-gray-600">
              Comprehensive control over all organizational aspects. 
              <a 
                href="/docs/reference/FOUNDER_ACCESS_DOCUMENTATION.md#organizational-control" 
                className="text-blue-600 hover:text-blue-800 ml-1"
              >
                View Documentation →
              </a>
            </p>
          </div>
          <Button 
            onClick={() => handleOrganizationalAction('overview_access', 'organizational_control', { section: 'overview' })}
            variant="outline"
          >
            Quick Control
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Employee Management */}
          <OrganizationalControlCard
            title="Employee Management"
            description="Manage internal SecureNet team access, roles, and permissions across all departments."
            status="active"
            metrics={{
              total_employees: organizationalData?.employee_management?.total_employees || 0,
              active_employees: organizationalData?.employee_management?.active_employees || 0,
              on_leave: organizationalData?.employee_management?.on_leave || 0,
              pending: organizationalData?.employee_management?.pending_onboarding || 0
            }}
            documentationLink="/docs/reference/ENTERPRISE_USER_MANAGEMENT.md#employee-management"
            onClick={() => {
              handleOrganizationalAction('employee_management_access', 'employees', { total: organizationalData?.employee_management?.total_employees || 0 });
              // Navigate to employee management page
              window.location.href = '/founder/employee-management';
            }}
          />

          {/* Contractor Oversight */}
          <OrganizationalControlCard
            title="Contractor Oversight"
            description="Oversee 6-month, 1-year, and 30-90 day contractor agreements and compliance."
            status="active"
            metrics={{
              active_contractors: organizationalData?.contractor_oversight?.active_contractors || 0,
              '6_month': organizationalData?.contractor_oversight?.contract_types?.['6_month'] || 0,
              '1_year': organizationalData?.contractor_oversight?.contract_types?.['1_year'] || 0,
              'short_term': organizationalData?.contractor_oversight?.contract_types?.['short_term_30_90'] || 0
            }}
            documentationLink="/docs/reference/ENTERPRISE_USER_MANAGEMENT.md#contractor-management"
            onClick={() => {
              handleOrganizationalAction('contractor_oversight_access', 'contractors', { active: organizationalData?.contractor_oversight?.active_contractors || 0 });
            }}
          />

          {/* Partner Management */}
          <OrganizationalControlCard
            title="Partner Management"
            description="Control channel partners, integration partnerships, and revenue sharing agreements."
            status="active"
            metrics={{
              channel_partners: organizationalData?.partner_management?.channel_partners || 0,
              integration_partners: organizationalData?.partner_management?.integration_partners || 0,
              revenue_partners: organizationalData?.partner_management?.revenue_partners || 0,
              health_score: `${organizationalData?.partner_management?.partner_health_score || 0}/5.0`
            }}
            documentationLink="/docs/reference/ENTERPRISE_USER_MANAGEMENT.md#partner-management"
            onClick={() => {
              const total = (organizationalData?.partner_management?.channel_partners || 0) + (organizationalData?.partner_management?.integration_partners || 0);
              handleOrganizationalAction('partner_management_access', 'partners', { total });
            }}
          />

          {/* Vendor Control */}
          <OrganizationalControlCard
            title="Vendor Control"
            description="Manage third-party vendors, service providers, and external access controls."
            status="active"
            metrics={{
              active_vendors: organizationalData?.vendor_control?.active_vendors || 0,
              integrations: organizationalData?.vendor_control?.third_party_integrations || 0,
              renewals_due: organizationalData?.vendor_control?.contract_renewals_due || 0,
              spend_q: organizationalData?.vendor_control?.spend_this_quarter || 'N/A'
            }}
            documentationLink="/docs/reference/ENTERPRISE_USER_MANAGEMENT.md#vendor-management"
            onClick={() => {
              handleOrganizationalAction('vendor_control_access', 'vendors', { active: organizationalData?.vendor_control?.active_vendors || 0 });
            }}
          />

          {/* Compliance Management */}
          <OrganizationalControlCard
            title="Compliance Management"
            description="SOC 2, ISO 27001, GDPR, HIPAA, and FedRAMP compliance monitoring and reporting."
            status="active"
            metrics={{
              compliance_score: `${organizationalData?.compliance_management?.compliance_score || 0}%`,
              frameworks: Object.keys(organizationalData?.compliance_management?.frameworks || {}).length,
              open_findings: organizationalData?.compliance_management?.open_findings || 0,
              remediation: organizationalData?.compliance_management?.remediation_progress || 'N/A'
            }}
            documentationLink="/docs/compliance/COMPLIANCE_FRAMEWORKS.md"
            onClick={() => {
              handleOrganizationalAction('compliance_management_access', 'compliance', { score: organizationalData?.compliance_management?.compliance_score || 0 });
            }}
          />

          {/* Legal & IP Control */}
          <OrganizationalControlCard
            title="Legal & IP Control"
            description="Intellectual property protection, legal compliance, and contract management."
            status="active"
            metrics={{
              patents: organizationalData?.legal_ip_control?.intellectual_property?.patents_filed || 0,
              trademarks: organizationalData?.legal_ip_control?.intellectual_property?.trademarks || 0,
              copyrights: organizationalData?.legal_ip_control?.intellectual_property?.copyrights || 0,
              contracts: organizationalData?.legal_ip_control?.legal_compliance?.contracts_under_review || 0
            }}
            documentationLink="/docs/reference/ENTERPRISE_USER_MANAGEMENT.md#legal-ip-management"
            onClick={() => {
              const totalIp = (organizationalData?.legal_ip_control?.intellectual_property?.patents_filed || 0) + (organizationalData?.legal_ip_control?.intellectual_property?.trademarks || 0);
              handleOrganizationalAction('legal_ip_control_access', 'legal', { total_ip: totalIp });
            }}
          />
        </div>
      </Card>

      {/* Financial Summary */}
      <Card>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Financial Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600">${metrics.financial_summary?.mrr?.toLocaleString() || 'N/A'}</div>
            <div className="text-sm text-gray-600">Monthly Recurring Revenue</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-3xl font-bold text-orange-600">${metrics.financial_summary?.arr?.toLocaleString() || 'N/A'}</div>
            <div className="text-sm text-gray-600">Annual Recurring Revenue</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">{metrics.financial_summary?.growth_rate || 0}%</div>
            <div className="text-sm text-gray-600">Growth Rate</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">{metrics.financial_summary?.churn_rate || 0}%</div>
            <div className="text-sm text-gray-600">Churn Rate</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default FounderDashboard; 