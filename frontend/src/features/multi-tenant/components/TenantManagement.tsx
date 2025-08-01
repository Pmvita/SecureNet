import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  BuildingOffice2Icon, 
  UsersIcon, 
  Cog6ToothIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { TenantInfo, TenantQuota, TenantHealth } from '../types';
import { tenantApi } from '../api/tenantApi';
import TenantList from './TenantList';
import TenantDetails from './TenantDetails';
import TenantQuotas from './TenantQuotas';
import TenantSettings from './TenantSettings';
import TenantAuditLogs from './TenantAuditLogs';
import CreateTenantModal from './CreateTenantModal';

interface TenantManagementProps {
  className?: string;
}

const TenantManagement: React.FC<TenantManagementProps> = ({ className = '' }) => {
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'quotas' | 'settings' | 'audit'>('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch all tenants
  const { data: tenants, isLoading: tenantsLoading, error: tenantsError } = useQuery({
    queryKey: ['tenants'],
    queryFn: tenantApi.getAllTenants,
    staleTime: 30000, // 30 seconds
  });

  // Fetch current tenant info
  const { data: currentTenant, isLoading: currentTenantLoading } = useQuery({
    queryKey: ['current-tenant'],
    queryFn: tenantApi.getCurrentTenant,
    enabled: !selectedTenant,
  });

  // Fetch selected tenant details
  const { data: selectedTenantData, isLoading: selectedTenantLoading } = useQuery({
    queryKey: ['tenant', selectedTenant],
    queryFn: () => tenantApi.getTenant(selectedTenant!),
    enabled: !!selectedTenant,
  });

  // Fetch tenant health
  const { data: tenantHealth, isLoading: healthLoading } = useQuery({
    queryKey: ['tenant-health', selectedTenant || currentTenant?.tenant_id],
    queryFn: () => tenantApi.getTenantHealth(selectedTenant || currentTenant?.tenant_id!),
    enabled: !!(selectedTenant || currentTenant?.tenant_id),
  });

  // Create tenant mutation
  const createTenantMutation = useMutation({
    mutationFn: tenantApi.createTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setShowCreateModal(false);
    },
  });

  // Update tenant status mutation
  const updateTenantStatusMutation = useMutation({
    mutationFn: ({ tenantId, status }: { tenantId: string; status: string }) => 
      tenantApi.updateTenantStatus(tenantId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
    },
  });

  const activeTenant = selectedTenantData || currentTenant;

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'critical':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <CheckCircleIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (tenantsLoading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (tenantsError) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <XCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Error Loading Tenants</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Failed to load tenant information. Please try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Multi-Tenant Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage organizations, quotas, and settings across all tenants
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <BuildingOffice2Icon className="w-5 h-5" />
          <span>Create Tenant</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tenant List Sidebar */}
        <div className="lg:col-span-1">
          <div className="glass-card p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Organizations
            </h3>
            
            <TenantList
              tenants={tenants || []}
              selectedTenant={selectedTenant}
              onSelectTenant={setSelectedTenant}
              onUpdateStatus={updateTenantStatusMutation.mutate}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {activeTenant ? (
            <div className="space-y-6">
              {/* Tenant Header */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {activeTenant.organization_name}
                    </h2>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getHealthColor(tenantHealth?.overall_health || 'unknown')}`}>
                        {getHealthIcon(tenantHealth?.overall_health || 'unknown')}
                        <span className="ml-1 capitalize">
                          {tenantHealth?.overall_health || 'Unknown'}
                        </span>
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {activeTenant.tenant_tier}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        activeTenant.tenant_status === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {activeTenant.tenant_status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Created {new Date(activeTenant.created_at).toLocaleDateString()}
                    </p>
                    {activeTenant.billing_email && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {activeTenant.billing_email}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="glass-card p-4">
                <nav className="flex space-x-8">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'overview'
                        ? 'text-primary bg-primary/10 dark:bg-primary/20'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    <BuildingOffice2Icon className="w-4 h-4" />
                    <span>Overview</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('quotas')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'quotas'
                        ? 'text-primary bg-primary/10 dark:bg-primary/20'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    <ChartBarIcon className="w-4 h-4" />
                    <span>Quotas</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'settings'
                        ? 'text-primary bg-primary/10 dark:bg-primary/20'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    <Cog6ToothIcon className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('audit')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'audit'
                        ? 'text-primary bg-primary/10 dark:bg-primary/20'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    <ShieldCheckIcon className="w-4 h-4" />
                    <span>Audit Logs</span>
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="glass-card p-6">
                {activeTab === 'overview' && (
                  <TenantDetails 
                    tenant={activeTenant}
                    health={tenantHealth}
                    isLoading={selectedTenantLoading || healthLoading}
                  />
                )}
                
                {activeTab === 'quotas' && (
                  <TenantQuotas 
                    tenantId={activeTenant.tenant_id}
                    health={tenantHealth}
                  />
                )}
                
                {activeTab === 'settings' && (
                  <TenantSettings 
                    tenantId={activeTenant.tenant_id}
                  />
                )}
                
                {activeTab === 'audit' && (
                  <TenantAuditLogs 
                    tenantId={activeTenant.tenant_id}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 text-center">
              <BuildingOffice2Icon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Select a Tenant
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Choose an organization from the sidebar to view its details and manage settings.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Tenant Modal */}
      <CreateTenantModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={createTenantMutation.mutate}
        isLoading={createTenantMutation.isPending}
      />
    </div>
  );
};

export default TenantManagement; 