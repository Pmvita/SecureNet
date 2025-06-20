/**
 * Week 4 Day 5: Expiration Monitoring Dashboard
 * SecureNet Production Launch - Account Expiration Management Interface
 * 
 * This component provides comprehensive account expiration monitoring with:
 * - Visual timeline of upcoming expirations
 * - Bulk account extension operations
 * - Executive reporting and analytics
 * - Automated notification management
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card/Card';
import { Button } from '../../components/common/Button/Button';
import { Input } from '../../components/common/Input/Input';
import { Select } from '../../components/common/Select/Select';
import { Modal } from '../../components/common/Modal/Modal';
import { Badge } from '../../components/common/Badge/Badge';
import { Alert } from '../../components/common/Alert/Alert';
import { Tabs } from '../../components/common/Tabs/Tabs';

interface ExpiringUser {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  account_type: string;
  account_expires_at: string;
  password_expires_at?: string;
  contract_duration_months?: number;
  days_until_expiry: number;
  organization_name: string;
  manager_email?: string;
  notification_sent: boolean;
  grace_period_days: number;
}

interface ExpirationStats {
  expiring_1_day: number;
  expiring_7_days: number;
  expiring_30_days: number;
  expired_users: number;
  total_monitored: number;
  contractor_accounts: Record<string, number>;
}

const ExpirationMonitoring: React.FC = () => {
  const [expiringUsers, setExpiringUsers] = useState<ExpiringUser[]>([]);
  const [stats, setStats] = useState<ExpirationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBulkExtendModal, setShowBulkExtendModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeTab, setActiveTab] = useState('timeline');
  const [filters, setFilters] = useState({
    days_range: '30',
    account_type: '',
    search: ''
  });

  const [bulkExtensionForm, setBulkExtensionForm] = useState({
    extend_months: 6,
    reason: '',
    notify_users: true
  });

  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadExpirationData();
    loadExpirationStats();
  }, [filters]);

  const loadExpirationData = async () => {
    try {
      setLoading(true);
      
      // Mock API call - replace with actual API
      const response = await fetch(`/api/users/expiring?days=${filters.days_range}`);
      
      if (response.ok) {
        const data = await response.json();
        setExpiringUsers(data.users || []);
      } else {
        throw new Error('Failed to load expiration data');
      }
    } catch (error) {
      console.error('Error loading expiration data:', error);
      
      // Mock data for demonstration
      const mockUsers: ExpiringUser[] = [
        {
          id: '1',
          username: 'contractor.john',
          email: 'john.contractor@company.com',
          first_name: 'John',
          last_name: 'Contractor',
          role: 'soc_analyst',
          account_type: 'contractor_6m',
          account_expires_at: '2024-12-25T00:00:00Z',
          contract_duration_months: 6,
          days_until_expiry: 5,
          organization_name: 'SecureNet Demo Corp',
          manager_email: 'manager@company.com',
          notification_sent: false,
          grace_period_days: 7
        },
        {
          id: '2',
          username: 'temp.jane',
          email: 'jane.temp@company.com',
          first_name: 'Jane',
          last_name: 'Temporary',
          role: 'security_admin',
          account_type: 'temporary_90d',
          account_expires_at: '2024-12-30T00:00:00Z',
          contract_duration_months: 3,
          days_until_expiry: 10,
          organization_name: 'SecureNet Demo Corp',
          notification_sent: true,
          grace_period_days: 7
        },
        {
          id: '3',
          username: 'consultant.bob',
          email: 'bob.consultant@company.com',
          first_name: 'Bob',
          last_name: 'Consultant',
          role: 'platform_owner',
          account_type: 'contractor_1y',
          account_expires_at: '2025-01-15T00:00:00Z',
          contract_duration_months: 12,
          days_until_expiry: 26,
          organization_name: 'SecureNet Demo Corp',
          notification_sent: false,
          grace_period_days: 14
        }
      ];

      setExpiringUsers(mockUsers);
    } finally {
      setLoading(false);
    }
  };

  const loadExpirationStats = async () => {
    try {
      // Mock API call for stats
      const mockStats: ExpirationStats = {
        expiring_1_day: 1,
        expiring_7_days: 2,
        expiring_30_days: 3,
        expired_users: 0,
        total_monitored: 15,
        contractor_accounts: {
          'contractor_6m': 8,
          'contractor_1y': 4,
          'temporary_30d': 1,
          'temporary_60d': 1,
          'temporary_90d': 1
        }
      };
      
      setStats(mockStats);
    } catch (error) {
      console.error('Error loading expiration stats:', error);
    }
  };

  const handleBulkExtendAccounts = async () => {
    if (selectedUsers.length === 0) {
      setAlert({ type: 'error', message: 'Please select users to extend' });
      return;
    }

    try {
      // Mock API call for bulk extension
      console.log('Extending accounts:', {
        user_ids: selectedUsers,
        ...bulkExtensionForm
      });

      setAlert({ 
        type: 'success', 
        message: `Successfully extended ${selectedUsers.length} account(s) by ${bulkExtensionForm.extend_months} months` 
      });
      
      setShowBulkExtendModal(false);
      setSelectedUsers([]);
      setBulkExtensionForm({
        extend_months: 6,
        reason: '',
        notify_users: true
      });
      
      loadExpirationData();
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to extend accounts' });
    }
  };

  const sendExpirationNotification = async (userId: string) => {
    try {
      // Mock API call
      console.log('Sending notification to user:', userId);
      setAlert({ type: 'success', message: 'Notification sent successfully' });
      loadExpirationData();
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to send notification' });
    }
  };

  const filteredUsers = expiringUsers.filter(user => {
    const matchesSearch = user.first_name.toLowerCase().includes(filters.search.toLowerCase()) ||
                         user.last_name.toLowerCase().includes(filters.search.toLowerCase()) ||
                         user.email.toLowerCase().includes(filters.search.toLowerCase());
    const matchesType = !filters.account_type || user.account_type === filters.account_type;
    
    return matchesSearch && matchesType;
  });

  const getUrgencyColor = (daysUntilExpiry: number) => {
    if (daysUntilExpiry <= 1) return 'destructive';
    if (daysUntilExpiry <= 7) return 'warning';
    if (daysUntilExpiry <= 14) return 'info';
    return 'success';
  };

  const getUrgencyLabel = (daysUntilExpiry: number) => {
    if (daysUntilExpiry <= 0) return 'EXPIRED';
    if (daysUntilExpiry <= 1) return 'CRITICAL';
    if (daysUntilExpiry <= 7) return 'URGENT';
    if (daysUntilExpiry <= 14) return 'WARNING';
    return 'NORMAL';
  };

  const groupUsersByUrgency = () => {
    const groups = {
      critical: filteredUsers.filter(u => u.days_until_expiry <= 1),
      urgent: filteredUsers.filter(u => u.days_until_expiry > 1 && u.days_until_expiry <= 7),
      warning: filteredUsers.filter(u => u.days_until_expiry > 7 && u.days_until_expiry <= 14),
      normal: filteredUsers.filter(u => u.days_until_expiry > 14)
    };
    
    return groups;
  };

  const generateReport = () => {
    const groupedUsers = groupUsersByUrgency();
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: stats,
      urgency_breakdown: {
        critical: groupedUsers.critical.length,
        urgent: groupedUsers.urgent.length,
        warning: groupedUsers.warning.length,
        normal: groupedUsers.normal.length
      },
      details: filteredUsers
    };

    // Download as JSON
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expiration-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setAlert({ type: 'success', message: 'Report downloaded successfully' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Expiration Monitoring</h1>
          <p className="text-gray-600">Monitor and manage account expirations across your organization</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => loadExpirationData()}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={generateReport}
          >
            Download Report
          </Button>
          {selectedUsers.length > 0 && (
            <Button
              onClick={() => setShowBulkExtendModal(true)}
            >
              Extend Selected ({selectedUsers.length})
            </Button>
          )}
        </div>
      </div>

      {/* Alert */}
      {alert && (
        <Alert
          type={alert.type}
          title={alert.type === 'success' ? 'Success' : 'Error'}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <div className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.expiring_1_day}</div>
              <div className="text-sm text-gray-600">Expiring Today</div>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.expiring_7_days}</div>
              <div className="text-sm text-gray-600">Expiring This Week</div>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.expiring_30_days}</div>
              <div className="text-sm text-gray-600">Expiring This Month</div>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.expired_users}</div>
              <div className="text-sm text-gray-600">Already Expired</div>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.total_monitored}</div>
              <div className="text-sm text-gray-600">Total Monitored</div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <div className="p-4 border-b">
          <h3 className="font-semibold">Filters</h3>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                     <Select
             label="Time Range"
             value={filters.days_range}
             onChange={(value: string | string[]) => setFilters(prev => ({ ...prev, days_range: Array.isArray(value) ? value[0] : value }))}
             options={[
               { value: '7', label: 'Next 7 days' },
               { value: '14', label: 'Next 14 days' },
               { value: '30', label: 'Next 30 days' },
               { value: '60', label: 'Next 60 days' },
               { value: '90', label: 'Next 90 days' }
             ]}
           />
           <Select
             label="Account Type"
             value={filters.account_type}
             onChange={(value: string | string[]) => setFilters(prev => ({ ...prev, account_type: Array.isArray(value) ? value[0] : value }))}
             options={[
               { value: '', label: 'All Types' },
               { value: 'contractor_6m', label: '6-Month Contractor' },
               { value: 'contractor_1y', label: '1-Year Contractor' },
               { value: 'temporary_30d', label: '30-Day Temporary' },
               { value: 'temporary_60d', label: '60-Day Temporary' },
               { value: 'temporary_90d', label: '90-Day Temporary' }
             ]}
           />
          <Input
            label="Search Users"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            placeholder="Search by name or email..."
          />
        </div>
      </Card>

             {/* Main Content */}
       <Tabs
         items={[
           { 
             id: 'timeline', 
             label: 'Expiration Timeline', 
             content: <div></div>,
             badge: { label: filteredUsers.length.toString() } 
           },
           { id: 'analytics', label: 'Analytics', content: <div></div> },
           { id: 'notifications', label: 'Notifications', content: <div></div> }
         ]}
         activeTab={activeTab}
         onChange={setActiveTab}
       />

      {activeTab === 'timeline' && (
        <div className="space-y-4">
          {/* Bulk Actions */}
          {filteredUsers.length > 0 && (
            <Card>
              <div className="p-4 flex items-center justify-between">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === filteredUsers.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(filteredUsers.map(u => u.id));
                      } else {
                        setSelectedUsers([]);
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <span>Select All ({filteredUsers.length})</span>
                </label>
                {selectedUsers.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => setShowBulkExtendModal(true)}
                    >
                      Extend Selected
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        selectedUsers.forEach(userId => sendExpirationNotification(userId));
                      }}
                    >
                      Send Notifications
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* User List */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }, (_, i) => (
                <Card key={i}>
                  <div className="p-4 animate-pulse">
                    <div className="flex justify-between">
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-6 bg-gray-200 rounded w-16"></div>
                        <div className="h-8 bg-gray-200 rounded w-20"></div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map(user => (
                <Card key={user.id} className="hover:shadow-md transition-shadow">
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers(prev => [...prev, user.id]);
                            } else {
                              setSelectedUsers(prev => prev.filter(id => id !== user.id));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <div>
                          <div className="font-semibold">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                          <div className="text-xs text-gray-500">
                            {user.role} • {user.account_type} • {user.organization_name}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                                                 <div className="text-right">
                           <Badge 
                             variant={getUrgencyColor(user.days_until_expiry) === 'destructive' ? 'error' : 
                                    getUrgencyColor(user.days_until_expiry) === 'warning' ? 'warning' : 
                                    getUrgencyColor(user.days_until_expiry) === 'info' ? 'info' : 'success'}
                             size="sm"
                             label={getUrgencyLabel(user.days_until_expiry)}
                           />
                          <div className="text-sm text-gray-600 mt-1">
                            {user.days_until_expiry > 0 ? `${user.days_until_expiry} days` : 'Expired'}
                          </div>
                          <div className="text-xs text-gray-500">
                            Expires: {new Date(user.account_expires_at).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {!user.notification_sent && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => sendExpirationNotification(user.id)}
                            >
                              Notify
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedUsers([user.id]);
                              setShowBulkExtendModal(true);
                            }}
                          >
                            Extend
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Account Type Distribution */}
          <Card>
            <div className="p-4 border-b">
              <h3 className="font-semibold">Account Type Distribution</h3>
            </div>
            <div className="p-4">
                             {stats?.contractor_accounts && Object.entries(stats.contractor_accounts).map(([type, count]) => (
                 <div key={type} className="flex justify-between items-center py-2">
                   <span className="capitalize">{type.replace('_', ' ')}</span>
                   <Badge variant="default" label={count.toString()} />
                 </div>
               ))}
            </div>
          </Card>

          {/* Expiration Timeline */}
          <Card>
            <div className="p-4 border-b">
              <h3 className="font-semibold">Expiration Timeline</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between">
                <span>Next 24 hours</span>
                <span className="font-semibold text-red-600">{stats?.expiring_1_day || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Next 7 days</span>
                <span className="font-semibold text-orange-600">{stats?.expiring_7_days || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Next 30 days</span>
                <span className="font-semibold text-blue-600">{stats?.expiring_30_days || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Already expired</span>
                <span className="font-semibold text-gray-600">{stats?.expired_users || 0}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Bulk Extension Modal */}
      <Modal
        isOpen={showBulkExtendModal}
        onClose={() => setShowBulkExtendModal(false)}
        title={`Extend ${selectedUsers.length} Account(s)`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <Select
               label="Extension Period"
               value={bulkExtensionForm.extend_months.toString()}
               onChange={(value: string | string[]) => setBulkExtensionForm(prev => ({ ...prev, extend_months: parseInt(Array.isArray(value) ? value[0] : value) }))}
              options={[
                { value: '1', label: '1 Month' },
                { value: '3', label: '3 Months' },
                { value: '6', label: '6 Months' },
                { value: '12', label: '12 Months' }
              ]}
            />
            <div className="flex items-center space-x-2 mt-6">
              <input
                type="checkbox"
                id="notify-users"
                checked={bulkExtensionForm.notify_users}
                onChange={(e) => setBulkExtensionForm(prev => ({ ...prev, notify_users: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="notify-users" className="text-sm">Notify users via email</label>
            </div>
          </div>

          <Input
            label="Reason for Extension"
            value={bulkExtensionForm.reason}
            onChange={(e) => setBulkExtensionForm(prev => ({ ...prev, reason: e.target.value }))}
            placeholder="Enter reason for account extension..."
          />

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowBulkExtendModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkExtendAccounts}>
              Extend Accounts
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ExpirationMonitoring; 