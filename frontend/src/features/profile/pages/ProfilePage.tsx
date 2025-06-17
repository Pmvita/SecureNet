import React, { useState, useEffect } from 'react';
import {
  UserCircleIcon,
  PencilIcon,
  KeyIcon,
  ShieldCheckIcon,
  ClockIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  CameraIcon,
  CheckCircleIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  StarIcon,
  Cog6ToothIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../auth/context/AuthContext';
import { apiClient } from '../../../api/client';
import { useToast } from '../../../components/common/ToastContainer';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  name?: string;
  role: 'platform_owner' | 'security_admin' | 'soc_analyst' | 'superadmin' | 'manager' | 'analyst' | 'platform_admin' | 'end_user' | 'admin' | 'user';
  status: 'active' | 'inactive' | 'suspended';
  last_login?: string;
  last_logout?: string;
  login_count?: number;
  created_at?: string;
  department?: string;
  title?: string;
  phone?: string;
  two_factor_enabled?: boolean;
  org_id?: string;
  organization_name?: string;
}

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (currentPassword: string, newPassword: string) => Promise<void>;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    try {
      setIsLoading(true);
      await onSubmit(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (error) {
      setError((error as Error).message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Change Password</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-900 border border-red-700 text-red-300 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showCurrentPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showNewPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showConfirmPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnable: () => Promise<void>;
  onDisable: () => Promise<void>;
  isEnabled: boolean;
}

const TwoFactorModal: React.FC<TwoFactorModalProps> = ({ isOpen, onClose, onEnable, onDisable, isEnabled }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');

  const handleToggle2FA = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      if (isEnabled) {
        await onDisable();
      } else {
        await onEnable();
        // In a real implementation, you'd get the QR code from the API
        setQrCode('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
      }
    } catch (error) {
      setError((error as Error).message || 'Failed to toggle 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Two-Factor Authentication</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-900 border border-red-700 text-red-300 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="text-center">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
              isEnabled ? 'bg-green-900' : 'bg-gray-700'
            }`}>
              <ShieldCheckIcon className={`w-8 h-8 ${isEnabled ? 'text-green-400' : 'text-gray-400'}`} />
            </div>
            <p className="text-white font-medium mb-2">
              Two-Factor Authentication is {isEnabled ? 'Enabled' : 'Disabled'}
            </p>
            <p className="text-gray-400 text-sm">
              {isEnabled 
                ? 'Your account is protected with 2FA. You can disable it if needed.'
                : 'Add an extra layer of security to your account by enabling 2FA.'
              }
            </p>
          </div>

          {!isEnabled && qrCode && (
            <div className="text-center">
              <p className="text-gray-300 text-sm mb-2">Scan this QR code with your authenticator app:</p>
              <div className="bg-white p-4 rounded-lg inline-block">
                <img src={qrCode} alt="2FA QR Code" className="w-32 h-32" />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Enter verification code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleToggle2FA}
              disabled={isLoading}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                isEnabled 
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isLoading ? 'Processing...' : (isEnabled ? 'Disable 2FA' : 'Enable 2FA')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ApiKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ApiKeysModal: React.FC<ApiKeysModalProps> = ({ isOpen, onClose }) => {
  const [apiKeys, setApiKeys] = useState([
    { id: '1', name: 'Production API', key: 'sk_prod_...', created: '2025-06-01', lastUsed: '2025-06-12' },
    { id: '2', name: 'Development API', key: 'sk_dev_...', created: '2025-05-15', lastUsed: '2025-06-10' },
  ]);
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    
    setIsCreating(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: `sk_${Date.now()}_...`,
      created: new Date().toISOString().split('T')[0],
      lastUsed: 'Never',
    };
    
    setApiKeys([...apiKeys, newKey]);
    setNewKeyName('');
    setIsCreating(false);
  };

  const handleDeleteKey = (id: string) => {
    setApiKeys(apiKeys.filter(key => key.id !== id));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">API Keys Management</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Create new API key */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">Create New API Key</h4>
            <div className="flex space-x-3">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Enter key name (e.g., Production API)"
                className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleCreateKey}
                disabled={!newKeyName.trim() || isCreating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>

          {/* Existing API keys */}
          <div className="space-y-3">
            <h4 className="text-white font-medium">Your API Keys</h4>
            {apiKeys.map((key) => (
              <div key={key.id} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-white font-medium">{key.name}</h5>
                    <p className="text-gray-400 text-sm font-mono">{key.key}</p>
                    <div className="flex space-x-4 text-xs text-gray-500 mt-1">
                      <span>Created: {key.created}</span>
                      <span>Last used: {key.lastUsed}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteKey(key.id)}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SessionsModal: React.FC<SessionsModalProps> = ({ isOpen, onClose }) => {
  const [sessions] = useState([
    {
      id: '1',
      device: 'MacBook Pro',
      browser: 'Chrome 120.0',
      location: 'San Francisco, CA',
      ip: '192.168.1.100',
      lastActive: '2025-06-12T19:50:00Z',
      current: true,
    },
    {
      id: '2',
      device: 'iPhone 15',
      browser: 'Safari Mobile',
      location: 'San Francisco, CA',
      ip: '192.168.1.105',
      lastActive: '2025-06-12T15:30:00Z',
      current: false,
    },
  ]);

  const handleTerminateSession = (sessionId: string) => {
    // In a real implementation, you'd call an API to terminate the session
    console.log('Terminating session:', sessionId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Active Sessions</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h5 className="text-white font-medium">{session.device}</h5>
                    {session.current && (
                      <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400 space-y-1">
                    <p>{session.browser} • {session.location}</p>
                    <p>IP: {session.ip}</p>
                    <p>Last active: {new Date(session.lastActive).toLocaleString()}</p>
                  </div>
                </div>
                {!session.current && (
                  <button
                    onClick={() => handleTerminateSession(session.id)}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                  >
                    Terminate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    title: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showApiKeysModal, setShowApiKeysModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  // Load profile data from API
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const response = await apiClient.get('/api/user/profile');
        const responseData = response.data as { status: string; data: UserProfile };
        
        if (responseData.status === 'success') {
          const userProfile = responseData.data;
          setProfile(userProfile);
          setEditForm({
            name: userProfile.name || '',
            email: userProfile.email,
            phone: userProfile.phone || '',
            department: userProfile.department || '',
            title: userProfile.title || '',
          });
          setIs2FAEnabled(userProfile.two_factor_enabled || false);
        } else {
          // Fallback to user context data if API fails
          setProfile({
            id: user.id.toString(),
            username: user.username,
            email: user.email,
            name: user.username || '',
            role: user.role,
            status: 'active',
            last_login: user.last_login || '',
            created_at: user.last_login || '',
            department: '',
            title: '',
            phone: '',
            two_factor_enabled: false,
            org_id: user.org_id,
            organization_name: user.organization_name,
          });
          setEditForm({
            name: user.username || '',
            email: user.email,
            phone: '',
            department: '',
            title: '',
          });
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
        // Fallback to user context data
        if (user) {
          setProfile({
            id: user.id.toString(),
            username: user.username,
            email: user.email,
            name: user.username || '',
            role: user.role,
            status: 'active',
            last_login: user.last_login || '',
            created_at: user.last_login || '',
            department: '',
            title: '',
            phone: '',
            two_factor_enabled: false,
            org_id: user.org_id,
            organization_name: user.organization_name,
          });
          setEditForm({
            name: user.username || '',
            email: user.email,
            phone: '',
            department: '',
            title: '',
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleSave = async () => {
    if (!profile) return;
    
    try {
      setIsSaving(true);
      
      // Update profile via API
      const response = await apiClient.put('/api/user/profile', editForm);
      const responseData = response.data as { status: string; data: UserProfile };
      
      if (responseData.status === 'success') {
        setProfile(responseData.data);
        setIsEditing(false);
        
        showToast({
          type: 'success',
          message: 'Profile updated successfully',
        });
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      showToast({
        type: 'error',
        message: 'Failed to update profile',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (!profile) return;
    
    setEditForm({
      name: profile.name || '',
      email: profile.email,
      phone: profile.phone || '',
      department: profile.department || '',
      title: profile.title || '',
    });
    setIsEditing(false);
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const response = await apiClient.post('/api/auth/change-password', { 
        current_password: currentPassword, 
        new_password: newPassword 
      });
      const responseData = response.data as { status: string; data: { message: string } };
      
      if (responseData.status === 'success') {
        showToast({
          type: 'success',
          message: 'Password changed successfully',
        });
      } else {
        throw new Error('Failed to change password');
      }
    } catch (error) {
      console.error('Failed to change password:', error);
      throw new Error('Failed to change password. Please check your current password.');
    }
  };

  const handleEnable2FA = async () => {
    try {
      const response = await apiClient.post('/api/auth/2fa/enable', {});
      const responseData = response.data as { status: string; data: { message: string } };
      
      if (responseData.status === 'success') {
        setIs2FAEnabled(true);
        showToast({
          type: 'success',
          message: 'Two-factor authentication enabled',
        });
      } else {
        throw new Error('Failed to enable 2FA');
      }
    } catch (error) {
      console.error('Failed to enable 2FA:', error);
      throw new Error('Failed to enable two-factor authentication');
    }
  };

  const handleDisable2FA = async () => {
    try {
      const response = await apiClient.post('/api/auth/2fa/disable', {});
      const responseData = response.data as { status: string; data: { message: string } };
      
      if (responseData.status === 'success') {
        setIs2FAEnabled(false);
        showToast({
          type: 'success',
          message: 'Two-factor authentication disabled',
        });
      } else {
        throw new Error('Failed to disable 2FA');
      }
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
      throw new Error('Failed to disable two-factor authentication');
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      platform_owner: { 
        label: '🏢 Platform Owner (CISO)', 
        color: 'bg-red-500', 
        icon: StarIcon,
        description: 'Strategic oversight, compliance management, global tenant administration'
      },
      security_admin: { 
        label: '🛡️ Security Admin (SOC Manager)', 
        color: 'bg-blue-500', 
        icon: Cog6ToothIcon,
        description: 'SOC management, user provisioning, security policy enforcement'
      },
      soc_analyst: { 
        label: '🔍 SOC Analyst (Security Analyst)', 
        color: 'bg-green-500', 
        icon: UserIcon,
        description: 'Threat monitoring, incident response, security event analysis'
      },
      // Legacy roles
      superadmin: { label: 'Super Admin (Legacy)', color: 'bg-red-500', icon: StarIcon },
      manager: { label: 'Manager (Legacy)', color: 'bg-blue-500', icon: Cog6ToothIcon },
      analyst: { label: 'Analyst (Legacy)', color: 'bg-green-500', icon: UserIcon },
      platform_admin: { label: 'Platform Admin (Legacy)', color: 'bg-blue-500', icon: Cog6ToothIcon },
      end_user: { label: 'End User (Legacy)', color: 'bg-green-500', icon: UserIcon },
      admin: { label: 'Administrator', color: 'bg-red-500', icon: StarIcon },
      user: { label: 'User', color: 'bg-green-500', icon: UserIcon },
    };
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.user;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Active', color: 'bg-green-500' },
      inactive: { label: 'Inactive', color: 'bg-gray-500' },
      suspended: { label: 'Suspended', color: 'bg-red-500' },
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${config.color}`}>
        <div className="w-2 h-2 bg-white rounded-full mr-1"></div>
        {config.label}
      </span>
    );
  };

  if (isLoading || !profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Profile Settings</h1>
          <p className="text-gray-400 mt-1">
            Manage your account information and security settings
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              Edit Profile
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profile Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="text-center">
              {/* Avatar */}
              <div className="relative mx-auto w-24 h-24 mb-4">
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <UserCircleIcon className="w-12 h-12 text-white" />
                </div>
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors">
                  <CameraIcon className="w-4 h-4 text-gray-300" />
                </button>
              </div>

              {/* Basic Info */}
              <h2 className="text-xl font-semibold text-white">{profile.name}</h2>
              <p className="text-gray-400 mb-3">@{profile.username}</p>
              
              {/* Badges */}
              <div className="space-y-2 mb-4">
                {getRoleBadge(profile.role)}
                {getStatusBadge(profile.status)}
              </div>

              {/* Quick Stats */}
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Member since</span>
                  <span className="text-white">
                    {new Date(profile.created_at || '').toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Last login</span>
                  <span className="text-white">
                    {new Date(profile.last_login || '').toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Login count</span>
                  <span className="text-white">{profile.login_count || 0}</span>
                </div>
                {profile.organization_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Organization</span>
                    <span className="text-white text-xs">{profile.organization_name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <UserCircleIcon className="w-5 h-5 mr-2" />
              Personal Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-white bg-gray-700 px-3 py-2 rounded-lg">{profile.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-white bg-gray-700 px-3 py-2 rounded-lg flex items-center">
                    <EnvelopeIcon className="w-4 h-4 mr-2 text-gray-400" />
                    {profile.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter phone number"
                  />
                ) : (
                  <p className="text-white bg-gray-700 px-3 py-2 rounded-lg flex items-center">
                    <PhoneIcon className="w-4 h-4 mr-2 text-gray-400" />
                    {profile.phone || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Department
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter department"
                  />
                ) : (
                  <p className="text-white bg-gray-700 px-3 py-2 rounded-lg flex items-center">
                    <BuildingOfficeIcon className="w-4 h-4 mr-2 text-gray-400" />
                    {profile.department || 'Not specified'}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Job Title
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter job title"
                  />
                ) : (
                  <p className="text-white bg-gray-700 px-3 py-2 rounded-lg flex items-center">
                    <DocumentTextIcon className="w-4 h-4 mr-2 text-gray-400" />
                    {profile.title || 'Not specified'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Security Actions */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <ShieldCheckIcon className="w-5 h-5 mr-2" />
              Security Actions
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => setShowPasswordModal(true)}
                className="flex items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <KeyIcon className="w-5 h-5 mr-3 text-blue-400" />
                <div className="text-left">
                  <p className="text-white font-medium">Change Password</p>
                  <p className="text-sm text-gray-400">Update your account password</p>
                </div>
              </button>

              <button 
                onClick={() => setShow2FAModal(true)}
                className="flex items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <ShieldCheckIcon className="w-5 h-5 mr-3 text-green-400" />
                <div className="text-left">
                  <p className="text-white font-medium">Two-Factor Auth</p>
                  <p className="text-sm text-gray-400">
                    {is2FAEnabled ? 'Manage 2FA settings' : 'Enable 2FA for your account'}
                  </p>
                </div>
              </button>

              <button 
                onClick={() => setShowApiKeysModal(true)}
                className="flex items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <DocumentTextIcon className="w-5 h-5 mr-3 text-purple-400" />
                <div className="text-left">
                  <p className="text-white font-medium">API Keys</p>
                  <p className="text-sm text-gray-400">Manage your API access keys</p>
                </div>
              </button>

              <button 
                onClick={() => setShowSessionsModal(true)}
                className="flex items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <ClockIcon className="w-5 h-5 mr-3 text-yellow-400" />
                <div className="text-left">
                  <p className="text-white font-medium">Session Management</p>
                  <p className="text-sm text-gray-400">View and manage active sessions</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <ClockIcon className="w-5 h-5 mr-2" />
          Recent Activity
        </h3>
        
        <div className="space-y-3">
          <div className="text-center py-8">
            <ClockIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No recent activity to display</p>
            <p className="text-sm text-gray-500">Activity logs will appear here as you use the platform</p>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSubmit={handleChangePassword}
      />

      <TwoFactorModal
        isOpen={show2FAModal}
        onClose={() => setShow2FAModal(false)}
        onEnable={handleEnable2FA}
        onDisable={handleDisable2FA}
        isEnabled={is2FAEnabled}
      />

      {/* API Keys Modal - TODO: Implement */}
      {showApiKeysModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">API Keys</h3>
              <button
                onClick={() => setShowApiKeysModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="text-center py-8">
              <KeyIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">API Keys management coming soon</p>
              <p className="text-sm text-gray-500">Create and manage your API access keys</p>
            </div>
          </div>
        </div>
      )}

      {/* Sessions Modal - TODO: Implement */}
      {showSessionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Active Sessions</h3>
              <button
                onClick={() => setShowSessionsModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="text-center py-8">
              <ClockIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Session management coming soon</p>
              <p className="text-sm text-gray-500">View and manage your active sessions</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 