import React, { useState } from 'react';
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
} from '@heroicons/react/24/outline';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'admin' | 'analyst' | 'viewer';
  status: 'active' | 'inactive' | 'suspended';
  lastLogin: string;
  createdAt: string;
  department?: string;
  title?: string;
  phone?: string;
  avatar?: string;
  permissions: string[];
  activityLog: Array<{
    id: string;
    action: string;
    timestamp: string;
    ip: string;
    userAgent: string;
  }>;
}

// Mock data for development
const mockProfile: UserProfile = {
  id: '1',
  username: 'admin',
  email: 'admin@securenet.com',
  name: 'Administrator',
  role: 'admin',
  status: 'active',
  lastLogin: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(), // 90 days ago
  department: 'Information Security',
  title: 'Security Administrator',
  phone: '+1 (555) 123-4567',
  permissions: [
    'manage_settings',
    'view_logs',
    'manage_security',
    'manage_network',
    'view_anomalies',
    'manage_users',
  ],
  activityLog: [
    {
      id: '1',
      action: 'Login',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    },
    {
      id: '2',
      action: 'Updated security settings',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    },
    {
      id: '3',
      action: 'Viewed network monitoring',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    },
    {
      id: '4',
      action: 'Login',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      ip: '192.168.1.105',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    },
  ],
};

export const ProfilePage: React.FC = () => {
  // Check if we're in development mode
  const DEV_MODE = import.meta.env.VITE_MOCK_DATA === 'true';
  
  // Initialize profile data based on environment
  const [profile, setProfile] = useState<UserProfile>(DEV_MODE ? mockProfile : {
    id: '',
    username: '',
    email: '',
    name: '',
    role: 'viewer',
    status: 'active',
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    department: '',
    title: '',
    phone: '',
    permissions: [],
    activityLog: [],
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: profile.name,
    email: profile.email,
    phone: profile.phone || '',
    department: profile.department || '',
    title: profile.title || '',
  });

  // TODO: In real API mode, fetch profile data from backend
  React.useEffect(() => {
    if (!DEV_MODE) {
      // Here you would fetch real profile data from the API
      // For now, we'll use a placeholder to avoid errors
      console.log('Real API mode: Would fetch profile data from /api/profile');
      // Example API call (uncomment when backend endpoint exists):
      // fetchProfileData().then(setProfile);
    }
  }, [DEV_MODE]);

  const handleSave = () => {
    setProfile({ ...profile, ...editForm });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm({
      name: profile.name,
      email: profile.email,
      phone: profile.phone || '',
      department: profile.department || '',
      title: profile.title || '',
    });
    setIsEditing(false);
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { label: 'Administrator', color: 'bg-red-500', icon: ShieldCheckIcon },
      analyst: { label: 'Security Analyst', color: 'bg-blue-500', icon: DocumentTextIcon },
      viewer: { label: 'Viewer', color: 'bg-green-500', icon: UserCircleIcon },
    };
    const config = roleConfig[role as keyof typeof roleConfig];
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
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Save Changes
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
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Last login</span>
                  <span className="text-white">
                    {new Date(profile.lastLogin).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Permissions</span>
                  <span className="text-white">{profile.permissions.length}</span>
                </div>
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
              <button className="flex items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                <KeyIcon className="w-5 h-5 mr-3 text-blue-400" />
                <div className="text-left">
                  <p className="text-white font-medium">Change Password</p>
                  <p className="text-sm text-gray-400">Update your account password</p>
                </div>
              </button>

              <button className="flex items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                <ShieldCheckIcon className="w-5 h-5 mr-3 text-green-400" />
                <div className="text-left">
                  <p className="text-white font-medium">Two-Factor Auth</p>
                  <p className="text-sm text-gray-400">Enable 2FA for your account</p>
                </div>
              </button>

              <button className="flex items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                <DocumentTextIcon className="w-5 h-5 mr-3 text-purple-400" />
                <div className="text-left">
                  <p className="text-white font-medium">API Keys</p>
                  <p className="text-sm text-gray-400">Manage your API access keys</p>
                </div>
              </button>

              <button className="flex items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                <ClockIcon className="w-5 h-5 mr-3 text-yellow-400" />
                <div className="text-left">
                  <p className="text-white font-medium">Session Management</p>
                  <p className="text-sm text-gray-400">View active sessions</p>
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
          {profile.activityLog.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-white font-medium">{activity.action}</p>
                  <p className="text-sm text-gray-400">
                    {new Date(activity.timestamp).toLocaleString()} • IP: {activity.ip}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Permissions */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <ShieldCheckIcon className="w-5 h-5 mr-2" />
          Permissions
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {profile.permissions.map((permission) => (
            <span
              key={permission}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-900 text-blue-300"
            >
              {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}; 