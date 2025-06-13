import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BellIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  UserIcon,
  KeyIcon,
  ServerIcon,
} from '@heroicons/react/24/outline';

interface NotificationSettings {
  emailNotifications: boolean;
  slackNotifications: boolean;
  criticalAlerts: boolean;
  securityUpdates: boolean;
  systemUpdates: boolean;
  notificationEmail: string;
  slackWebhook?: string;
}

interface SecuritySettings {
  twoFactorAuth: boolean;
  sessionTimeout: number;
  passwordExpiry: number;
  ipWhitelist: string[];
  allowedCountries: string[];
}

interface SystemSettings {
  logRetention: number;
  backupFrequency: string;
  backupLocation: string;
  scanFrequency: string;
  maxConcurrentScans: number;
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  lastLogin: string;
  createdAt: string;
}

import { apiClient } from '../api/client';

async function fetchSettings(): Promise<{
  notifications: NotificationSettings;
  security: SecuritySettings;
  system: SystemSettings;
}> {
  const response = await apiClient.get('/api/settings');
  return response.data;
}

async function fetchUserProfile(): Promise<UserProfile> {
  const response = await apiClient.get('/api/user/profile');
  return response.data;
}

async function updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
  const response = await apiClient.patch('/api/settings/notifications', settings);
  return response.data;
}

async function updateSecuritySettings(settings: Partial<SecuritySettings>): Promise<SecuritySettings> {
  const response = await apiClient.patch('/api/settings/security', settings);
  return response.data;
}

async function updateSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
  const response = await apiClient.patch('/api/settings/system', settings);
  return response.data;
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'notifications' | 'security' | 'system' | 'profile'>('notifications');
  const queryClient = useQueryClient();

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: fetchUserProfile,
  });

  const updateNotificationsMutation = useMutation({
    mutationFn: updateNotificationSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const updateSecurityMutation = useMutation({
    mutationFn: updateSecuritySettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const updateSystemMutation = useMutation({
    mutationFn: updateSystemSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const tabs = [
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'system', name: 'System', icon: Cog6ToothIcon },
    { id: 'profile', name: 'Profile', icon: UserIcon },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
      </div>

      {/* Tabs */}
      <div className="glass-card">
        <nav className="flex space-x-4 p-4" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center px-3 py-2 text-sm font-medium rounded-md
                ${
                  activeTab === tab.id
                    ? 'bg-primary-500/10 text-primary-500'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }
              `}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="glass-card p-6">
        {settingsLoading || profileLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-700 rounded w-1/4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-700 rounded w-5/6"></div>
              <div className="h-4 bg-gray-700 rounded w-4/6"></div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Notifications Settings */}
            {activeTab === 'notifications' && settings && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-white mb-4">Notification Preferences</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-300">Email Notifications</label>
                        <p className="text-sm text-gray-400">Receive notifications via email</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={settings.notifications.emailNotifications}
                          onChange={(e) =>
                            updateNotificationsMutation.mutate({
                              emailNotifications: e.target.checked,
                            })
                          }
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-300">Slack Notifications</label>
                        <p className="text-sm text-gray-400">Receive notifications via Slack</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={settings.notifications.slackNotifications}
                          onChange={(e) =>
                            updateNotificationsMutation.mutate({
                              slackNotifications: e.target.checked,
                            })
                          }
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                      </label>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300">Notification Email</label>
                        <input
                          type="email"
                          value={settings.notifications.notificationEmail}
                          onChange={(e) =>
                            updateNotificationsMutation.mutate({
                              notificationEmail: e.target.value,
                            })
                          }
                          className="mt-1 block w-full rounded-md bg-dark-100 border-gray-700 text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        />
                      </div>

                      {settings.notifications.slackNotifications && (
                        <div>
                          <label className="block text-sm font-medium text-gray-300">Slack Webhook URL</label>
                          <input
                            type="text"
                            value={settings.notifications.slackWebhook}
                            onChange={(e) =>
                              updateNotificationsMutation.mutate({
                                slackWebhook: e.target.value,
                              })
                            }
                            className="mt-1 block w-full rounded-md bg-dark-100 border-gray-700 text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-medium text-white mb-4">Alert Types</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-300">Critical Alerts</label>
                        <p className="text-sm text-gray-400">Receive notifications for critical security alerts</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={settings.notifications.criticalAlerts}
                          onChange={(e) =>
                            updateNotificationsMutation.mutate({
                              criticalAlerts: e.target.checked,
                            })
                          }
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-300">Security Updates</label>
                        <p className="text-sm text-gray-400">Receive notifications for security updates</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={settings.notifications.securityUpdates}
                          onChange={(e) =>
                            updateNotificationsMutation.mutate({
                              securityUpdates: e.target.checked,
                            })
                          }
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-300">System Updates</label>
                        <p className="text-sm text-gray-400">Receive notifications for system updates</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={settings.notifications.systemUpdates}
                          onChange={(e) =>
                            updateNotificationsMutation.mutate({
                              systemUpdates: e.target.checked,
                            })
                          }
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && settings && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-white mb-4">Authentication</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-300">Two-Factor Authentication</label>
                        <p className="text-sm text-gray-400">Enable 2FA for additional security</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={settings.security.twoFactorAuth}
                          onChange={(e) =>
                            updateSecurityMutation.mutate({
                              twoFactorAuth: e.target.checked,
                            })
                          }
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300">Session Timeout (minutes)</label>
                      <input
                        type="number"
                        value={settings.security.sessionTimeout}
                        onChange={(e) =>
                          updateSecurityMutation.mutate({
                            sessionTimeout: parseInt(e.target.value),
                          })
                        }
                        className="mt-1 block w-full rounded-md bg-dark-100 border-gray-700 text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300">Password Expiry (days)</label>
                      <input
                        type="number"
                        value={settings.security.passwordExpiry}
                        onChange={(e) =>
                          updateSecurityMutation.mutate({
                            passwordExpiry: parseInt(e.target.value),
                          })
                        }
                        className="mt-1 block w-full rounded-md bg-dark-100 border-gray-700 text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-medium text-white mb-4">Access Control</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300">IP Whitelist</label>
                      <textarea
                        value={(settings.security.ipWhitelist ?? []).join('\n')}
                        onChange={(e) =>
                          updateSecurityMutation.mutate({
                            ipWhitelist: e.target.value.split('\n').filter(Boolean),
                          })
                        }
                        rows={4}
                        className="mt-1 block w-full rounded-md bg-dark-100 border-gray-700 text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        placeholder="Enter IP addresses (one per line)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300">Allowed Countries</label>
                      <textarea
                        value={(settings.security.allowedCountries ?? []).join('\n')}
                        onChange={(e) =>
                          updateSecurityMutation.mutate({
                            allowedCountries: e.target.value.split('\n').filter(Boolean),
                          })
                        }
                        rows={4}
                        className="mt-1 block w-full rounded-md bg-dark-100 border-gray-700 text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        placeholder="Enter country codes (one per line)"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* System Settings */}
            {activeTab === 'system' && settings && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-white mb-4">System Configuration</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300">Log Retention (days)</label>
                      <input
                        type="number"
                        value={settings.system.logRetention}
                        onChange={(e) =>
                          updateSystemMutation.mutate({
                            logRetention: parseInt(e.target.value),
                          })
                        }
                        className="mt-1 block w-full rounded-md bg-dark-100 border-gray-700 text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300">Backup Frequency</label>
                      <select
                        value={settings.system.backupFrequency}
                        onChange={(e) =>
                          updateSystemMutation.mutate({
                            backupFrequency: e.target.value,
                          })
                        }
                        className="mt-1 block w-full rounded-md bg-dark-100 border-gray-700 text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300">Backup Location</label>
                      <input
                        type="text"
                        value={settings.system.backupLocation}
                        onChange={(e) =>
                          updateSystemMutation.mutate({
                            backupLocation: e.target.value,
                          })
                        }
                        className="mt-1 block w-full rounded-md bg-dark-100 border-gray-700 text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300">Scan Frequency</label>
                      <select
                        value={settings.system.scanFrequency}
                        onChange={(e) =>
                          updateSystemMutation.mutate({
                            scanFrequency: e.target.value,
                          })
                        }
                        className="mt-1 block w-full rounded-md bg-dark-100 border-gray-700 text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      >
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300">Max Concurrent Scans</label>
                      <input
                        type="number"
                        value={settings.system.maxConcurrentScans}
                        onChange={(e) =>
                          updateSystemMutation.mutate({
                            maxConcurrentScans: parseInt(e.target.value),
                          })
                        }
                        className="mt-1 block w-full rounded-md bg-dark-100 border-gray-700 text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* User Profile */}
            {activeTab === 'profile' && profile && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-white mb-4">User Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300">Username</label>
                      <p className="mt-1 text-sm text-white">{profile.username}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300">Email</label>
                      <p className="mt-1 text-sm text-white">{profile.email}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300">Role</label>
                      <p className="mt-1 text-sm text-white capitalize">{profile.role}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300">Last Login</label>
                      <p className="mt-1 text-sm text-white">
                        {new Date(profile.lastLogin).toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300">Account Created</label>
                      <p className="mt-1 text-sm text-white">
                        {new Date(profile.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-700">
                  <h2 className="text-lg font-medium text-white mb-4">Account Actions</h2>
                  <div className="space-y-4">
                    <button className="btn-primary">
                      Change Password
                    </button>
                    <button className="btn-primary">
                      Update Email
                    </button>
                    {profile.role === 'admin' && (
                      <button className="btn-primary">
                        Manage Users
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 