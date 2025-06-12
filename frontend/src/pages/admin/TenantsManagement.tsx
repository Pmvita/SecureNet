import React, { useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { 
  BuildingOfficeIcon,
  UserGroupIcon,
  CogIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'trial';
  userCount: number;
  createdAt: string;
  lastActivity: string;
}

const mockTenants: Tenant[] = [
  {
    id: '1',
    name: 'SecureOrg Inc.',
    domain: 'secureorg.com',
    plan: 'enterprise',
    status: 'active',
    userCount: 25,
    createdAt: '2024-01-15',
    lastActivity: '2025-06-11'
  },
  {
    id: '2',
    name: 'TechCorp Ltd.',
    domain: 'techcorp.io',
    plan: 'professional',
    status: 'active',
    userCount: 12,
    createdAt: '2024-03-22',
    lastActivity: '2025-06-10'
  },
  {
    id: '3',
    name: 'StartupXYZ',
    domain: 'startupxyz.com',
    plan: 'starter',
    status: 'trial',
    userCount: 5,
    createdAt: '2025-06-01',
    lastActivity: '2025-06-11'
  }
];

const TenantsManagement: React.FC = () => {
  const [tenants] = useState<Tenant[]>(mockTenants);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.domain.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = selectedPlan === 'all' || tenant.plan === selectedPlan;
    const matchesStatus = selectedStatus === 'all' || tenant.status === selectedStatus;
    
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case 'enterprise': return 'success';
      case 'professional': return 'warning';
      case 'starter': return 'info';
      default: return 'default';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'trial': return 'warning';
      case 'suspended': return 'error';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenant Management"
        subtitle="Manage organizations and their subscriptions"
        actions={[
          <button
            key="add-tenant"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Add Tenant
          </button>
        ]}
      />

      {/* Filters */}
      <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-600">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tenants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              >
                <option value="all">All Plans</option>
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Tenants List */}
      <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-600">
        <div className="p-6 border-b border-gray-600 bg-gradient-to-r from-gray-800/80 to-gray-700/80">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <BuildingOfficeIcon className="h-6 w-6 text-blue-400" />
            Tenants ({filteredTenants.length})
          </h2>
        </div>
        <div className="p-6 bg-gray-900/30">
          {filteredTenants.length === 0 ? (
            <div className="text-center py-8">
              <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No tenants found</h3>
              <p className="text-gray-400 text-sm">Try adjusting your search criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Organization</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Plan</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Users</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Created</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Last Activity</th>
                    <th className="text-right py-3 px-4 text-gray-300 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTenants.map((tenant) => (
                    <tr key={tenant.id} className="border-b border-gray-700/50 hover:bg-gray-800/30 transition-colors">
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-medium text-white">{tenant.name}</div>
                          <div className="text-sm text-gray-400">{tenant.domain}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant={getPlanBadgeVariant(tenant.plan)}>
                          {tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant={getStatusBadgeVariant(tenant.status)}>
                          {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-gray-300">
                          <UserGroupIcon className="w-4 h-4" />
                          {tenant.userCount}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-300">
                        {new Date(tenant.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4 text-gray-300">
                        {new Date(tenant.lastActivity).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-lg transition-colors">
                            <CogIcon className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-lg transition-colors">
                            <EllipsisVerticalIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default TenantsManagement; 