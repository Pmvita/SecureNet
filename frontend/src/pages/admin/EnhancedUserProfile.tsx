/**
 * Week 4 Day 5: Enhanced User Profile with Groups & Expiration
 * SecureNet Production Launch - User Profile Management Interface
 * 
 * This component provides enhanced user profile management with:
 * - User group membership display and management
 * - Account expiration information and controls
 * - Permission visualization
 * - Activity tracking
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

interface UserProfile {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  account_type: string;
  account_expires_at: string | null;
  password_expires_at: string | null;
  contract_duration_months: number | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  account_status: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
  organization_name: string;
  phone: string | null;
  department: string | null;
  manager_email: string | null;
}

interface UserGroup {
  id: string;
  name: string;
  description: string;
  group_type: string;
  access_level: string;
  permissions: Record<string, boolean>;
  is_system_group: boolean;
  joined_at: string;
  role_in_group: string;
}

interface UserActivity {
  id: string;
  action: string;
  timestamp: string;
  details: string;
  ip_address: string;
  user_agent: string;
}

interface EnhancedUserProfileProps {
  userId: string;
  onClose?: () => void;
}

const EnhancedUserProfile: React.FC<EnhancedUserProfileProps> = ({ userId, onClose }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [extendForm, setExtendForm] = useState({
    extend_months: 6,
    reason: '',
    notify_user: true
  });

  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});

  useEffect(() => {
    loadUserProfile();
    loadUserGroups();
    loadUserActivity();
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      // Mock API call - replace with actual API
      const response = await fetch(`/api/users/${userId}`);
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setEditForm(userData);
      } else {
        throw new Error('Failed to load user profile');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      
      // Mock data for demonstration
      const mockUser: UserProfile = {
        id: userId,
        username: 'john.contractor',
        email: 'john.contractor@company.com',
        first_name: 'John',
        last_name: 'Contractor',
        role: 'soc_analyst',
        account_type: 'contractor_6m',
        account_expires_at: '2024-12-31T00:00:00Z',
        password_expires_at: '2024-11-30T00:00:00Z',
        contract_duration_months: 6,
        contract_start_date: '2024-06-01T00:00:00Z',
        contract_end_date: '2024-12-31T00:00:00Z',
        account_status: 'active',
        is_active: true,
        last_login: '2024-12-15T10:30:00Z',
        created_at: '2024-06-01T00:00:00Z',
        updated_at: '2024-12-15T10:30:00Z',
        organization_name: 'SecureNet Demo Corp',
        phone: '+1-555-0123',
        department: 'Security Operations',
        manager_email: 'manager@company.com'
      };
      
      setUser(mockUser);
      setEditForm(mockUser);
    } finally {
      setLoading(false);
    }
  };

  const loadUserGroups = async () => {
    try {
      // Mock API call for user groups
      const mockGroups: UserGroup[] = [
        {
          id: '1',
          name: 'Security Teams',
          description: 'SOC Analysts and Security Operations',
          group_type: 'department',
          access_level: 'security_ops',
          permissions: { view_threats: true, manage_alerts: true, incident_response: true },
          is_system_group: true,
          joined_at: '2024-06-01T00:00:00Z',
          role_in_group: 'member'
        },
        {
          id: '2',
          name: '6-Month Contractors',
          description: 'Short-term contract employees',
          group_type: 'contractor',
          access_level: 'business',
          permissions: { view_dashboard: true, limited_access: true },
          is_system_group: true,
          joined_at: '2024-06-01T00:00:00Z',
          role_in_group: 'member'
        }
      ];
      
      setUserGroups(mockGroups);
    } catch (error) {
      console.error('Error loading user groups:', error);
    }
  };

  const loadUserActivity = async () => {
    try {
      // Mock API call for user activity
      const mockActivity: UserActivity[] = [
        {
          id: '1',
          action: 'Login',
          timestamp: '2024-12-15T10:30:00Z',
          details: 'Successful login from Chrome browser',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 Chrome/119.0.0.0'
        },
        {
          id: '2',
          action: 'View Dashboard',
          timestamp: '2024-12-15T10:35:00Z',
          details: 'Accessed main security dashboard',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 Chrome/119.0.0.0'
        },
        {
          id: '3',
          action: 'View Threats',
          timestamp: '2024-12-15T10:40:00Z',
          details: 'Viewed threat intelligence feed',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 Chrome/119.0.0.0'
        }
      ];
      
      setUserActivity(mockActivity);
    } catch (error) {
      console.error('Error loading user activity:', error);
    }
  };

  const handleExtendAccount = async () => {
    try {
      // Mock API call for account extension
      console.log('Extending account:', {
        user_id: userId,
        ...extendForm
      });

      setAlert({ 
        type: 'success', 
        message: `Account extended by ${extendForm.extend_months} months` 
      });
      
      setShowExtendModal(false);
      setExtendForm({
        extend_months: 6,
        reason: '',
        notify_user: true
      });
      
      loadUserProfile();
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to extend account' });
    }
  };

  const handleUpdateProfile = async () => {
    try {
      // Mock API call for profile update
      console.log('Updating profile:', editForm);

      setAlert({ type: 'success', message: 'Profile updated successfully' });
      setShowEditModal(false);
      loadUserProfile();
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to update profile' });
    }
  };

  const getDaysUntilExpiry = (expirationDate: string | null): number => {
    if (!expirationDate) return -1;
    const today = new Date();
    const expiry = new Date(expirationDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getExpirationStatus = (daysUntilExpiry: number) => {
    if (daysUntilExpiry < 0) return { variant: 'error' as const, label: 'EXPIRED' };
    if (daysUntilExpiry <= 1) return { variant: 'error' as const, label: 'CRITICAL' };
    if (daysUntilExpiry <= 7) return { variant: 'warning' as const, label: 'URGENT' };
    if (daysUntilExpiry <= 14) return { variant: 'warning' as const, label: 'WARNING' };
    return { variant: 'success' as const, label: 'NORMAL' };
  };

  const getAccessLevelColor = (level: string) => {
    const colors = {
      'platform_admin': 'error',
      'security_ops': 'warning',
      'it_ops': 'info',
      'business': 'success',
      'external': 'default'
    };
    return colors[level as keyof typeof colors] || 'default';
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert
          type="error"
          title="User Not Found"
          message="The requested user profile could not be found."
        />
      </div>
    );
  }

  const daysUntilExpiry = getDaysUntilExpiry(user.account_expires_at);
  const expirationStatus = getExpirationStatus(daysUntilExpiry);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {user.first_name} {user.last_name}
          </h1>
          <p className="text-gray-600">{user.email} • {user.username}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge 
              variant={user.is_active ? 'success' : 'error'} 
              label={user.is_active ? 'Active' : 'Inactive'} 
              size="sm" 
            />
            <Badge 
              variant="info" 
              label={user.role.replace('_', ' ').toUpperCase()} 
              size="sm" 
            />
            <Badge 
              variant="default" 
              label={user.account_type.replace('_', ' ')} 
              size="sm" 
            />
            {user.account_expires_at && (
              <Badge 
                variant={expirationStatus.variant} 
                label={expirationStatus.label} 
                size="sm" 
              />
            )}
          </div>
        </div>

        <div className="flex gap-3">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowEditModal(true)}>
            Edit Profile
          </Button>
          {user.account_expires_at && (
            <Button onClick={() => setShowExtendModal(true)}>
              Extend Account
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

      {/* Expiration Warning */}
      {user.account_expires_at && daysUntilExpiry <= 14 && (
        <Alert
          type={daysUntilExpiry <= 1 ? 'error' : 'warning'}
          title={daysUntilExpiry <= 0 ? 'Account Expired' : 'Account Expiring Soon'}
          message={
            daysUntilExpiry <= 0
              ? `This account expired ${Math.abs(daysUntilExpiry)} day(s) ago.`
              : `This account will expire in ${daysUntilExpiry} day(s).`
          }
        />
      )}

      {/* Main Content */}
      <Tabs
        items={[
          { 
            id: 'profile', 
            label: 'Profile Information', 
            content: (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <Card>
                  <div className="p-4 border-b">
                    <h3 className="font-semibold">Basic Information</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Full Name</label>
                      <p className="text-gray-900">{user.first_name} {user.last_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Email</label>
                      <p className="text-gray-900">{user.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Phone</label>
                      <p className="text-gray-900">{user.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Department</label>
                      <p className="text-gray-900">{user.department || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Manager</label>
                      <p className="text-gray-900">{user.manager_email || 'Not assigned'}</p>
                    </div>
                  </div>
                </Card>

                {/* Account Information */}
                <Card>
                  <div className="p-4 border-b">
                    <h3 className="font-semibold">Account Information</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Username</label>
                      <p className="text-gray-900">{user.username}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Role</label>
                      <p className="text-gray-900">{user.role.replace('_', ' ').toUpperCase()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Account Type</label>
                      <p className="text-gray-900">{user.account_type.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Status</label>
                      <p className="text-gray-900">{user.account_status}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Last Login</label>
                      <p className="text-gray-900">
                        {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Contract Information */}
                {user.account_expires_at && (
                  <Card className="lg:col-span-2">
                    <div className="p-4 border-b">
                      <h3 className="font-semibold">Contract & Expiration Information</h3>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Contract Start</label>
                        <p className="text-gray-900">
                          {user.contract_start_date 
                            ? new Date(user.contract_start_date).toLocaleDateString()
                            : 'Not specified'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Contract End</label>
                        <p className="text-gray-900">
                          {user.contract_end_date 
                            ? new Date(user.contract_end_date).toLocaleDateString()
                            : 'Not specified'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Contract Duration</label>
                        <p className="text-gray-900">
                          {user.contract_duration_months 
                            ? `${user.contract_duration_months} months`
                            : 'Not specified'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Account Expires</label>
                        <p className="text-gray-900">
                          {new Date(user.account_expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Days Until Expiry</label>
                        <p className={`font-semibold ${
                          daysUntilExpiry <= 1 ? 'text-red-600' :
                          daysUntilExpiry <= 7 ? 'text-orange-600' :
                          daysUntilExpiry <= 14 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {daysUntilExpiry > 0 ? `${daysUntilExpiry} days` : 'Expired'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Password Expires</label>
                        <p className="text-gray-900">
                          {user.password_expires_at 
                            ? new Date(user.password_expires_at).toLocaleDateString()
                            : 'No expiration'}
                        </p>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            )
          },
          { 
            id: 'groups', 
            label: 'Group Memberships',
            badge: { label: userGroups.length.toString() },
            content: (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">User Groups ({userGroups.length})</h3>
                  <Button size="sm" onClick={() => setShowGroupModal(true)}>
                    Manage Groups
                  </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {userGroups.map(group => (
                    <Card key={group.id}>
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold">{group.name}</h4>
                            <p className="text-sm text-gray-600">{group.description}</p>
                          </div>
                          {group.is_system_group && (
                            <Badge variant="info" label="System" size="sm" />
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge 
                            variant="default" 
                            label={group.group_type.replace('_', ' ')} 
                            size="sm" 
                          />
                          <Badge 
                            variant={getAccessLevelColor(group.access_level) as any}
                            label={group.access_level.replace('_', ' ').toUpperCase()}
                            size="sm" 
                          />
                          <Badge 
                            variant="default" 
                            label={group.role_in_group} 
                            size="sm" 
                          />
                        </div>

                        <div className="text-xs text-gray-500">
                          Joined: {new Date(group.joined_at).toLocaleDateString()}
                        </div>

                        <div className="mt-3">
                          <details className="text-xs">
                            <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                              View Permissions
                            </summary>
                            <div className="mt-2 space-y-1">
                              {Object.entries(group.permissions).map(([permission, granted]) => (
                                <div key={permission} className="flex justify-between">
                                  <span>{permission.replace('_', ' ')}</span>
                                  <span className={granted ? 'text-green-600' : 'text-red-600'}>
                                    {granted ? '✓' : '✗'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )
          },
          { 
            id: 'activity', 
            label: 'Activity Log',
            badge: { label: userActivity.length.toString() },
            content: (
              <div className="space-y-4">
                <h3 className="font-semibold">Recent Activity</h3>
                <div className="space-y-3">
                  {userActivity.map(activity => (
                    <Card key={activity.id}>
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{activity.action}</div>
                            <div className="text-sm text-gray-600">{activity.details}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(activity.timestamp).toLocaleString()} • {activity.ip_address}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )
          }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Extend Account Modal */}
      <Modal
        isOpen={showExtendModal}
        onClose={() => setShowExtendModal(false)}
        title="Extend Account"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Extend the account expiration for {user.first_name} {user.last_name}
          </p>

          <Select
            label="Extension Period"
            value={extendForm.extend_months.toString()}
            onChange={(value: string | string[]) => setExtendForm(prev => ({ 
              ...prev, 
              extend_months: parseInt(Array.isArray(value) ? value[0] : value) 
            }))}
            options={[
              { value: '1', label: '1 Month' },
              { value: '3', label: '3 Months' },
              { value: '6', label: '6 Months' },
              { value: '12', label: '12 Months' }
            ]}
          />

          <Input
            label="Reason for Extension"
            value={extendForm.reason}
            onChange={(e) => setExtendForm(prev => ({ ...prev, reason: e.target.value }))}
            placeholder="Enter reason for account extension..."
          />

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="notify-user-extend"
              checked={extendForm.notify_user}
              onChange={(e) => setExtendForm(prev => ({ ...prev, notify_user: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <label htmlFor="notify-user-extend" className="text-sm">
              Notify user via email
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowExtendModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleExtendAccount}>
              Extend Account
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Profile"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={editForm.first_name || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
            />
            <Input
              label="Last Name"
              value={editForm.last_name || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
            />
          </div>

          <Input
            label="Email"
            type="email"
            value={editForm.email || ''}
            onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={editForm.phone || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
            />
            <Input
              label="Department"
              value={editForm.department || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, department: e.target.value }))}
            />
          </div>

          <Input
            label="Manager Email"
            type="email"
            value={editForm.manager_email || ''}
            onChange={(e) => setEditForm(prev => ({ ...prev, manager_email: e.target.value }))}
          />

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProfile}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EnhancedUserProfile; 