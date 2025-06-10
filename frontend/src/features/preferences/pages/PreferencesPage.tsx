import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cog6ToothIcon,
  ComputerDesktopIcon,
  BellIcon,
  PaintBrushIcon,
  SunIcon,
  MoonIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../../../contexts/ThemeContext';

interface Preferences {
  notifications: {
    desktop: boolean;
    email: boolean;
    sounds: boolean;
    security: boolean;
    system: boolean;
  };
  dashboard: {
    autoRefresh: boolean;
    refreshInterval: number;
    compactMode: boolean;
    showTooltips: boolean;
  };
}

// Mock data for development
const mockPreferences: Preferences = {
  notifications: {
    desktop: true,
    email: true,
    sounds: false,
    security: true,
    system: true,
  },
  dashboard: {
    autoRefresh: true,
    refreshInterval: 30,
    compactMode: false,
    showTooltips: true,
  },
};

export const PreferencesPage: React.FC = () => {
  // Check if we're in development mode
  const DEV_MODE = import.meta.env.VITE_MOCK_DATA === 'true';
  
  // Initialize preferences based on environment
  const [preferences, setPreferences] = useState<Preferences>(DEV_MODE ? mockPreferences : {
    notifications: {
      desktop: false,
      email: false,
      sounds: false,
      security: false,
      system: false,
    },
    dashboard: {
      autoRefresh: false,
      refreshInterval: 30,
      compactMode: false,
      showTooltips: true,
    },
  });
  
  const [hasChanges, setHasChanges] = useState(false);
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  // TODO: In real API mode, fetch preferences from backend
  React.useEffect(() => {
    if (!DEV_MODE) {
      // Here you would fetch real preferences from the API
      console.log('Real API mode: Would fetch preferences from /api/preferences');
      // Example API call (uncomment when backend endpoint exists):
      // fetchPreferences().then(setPreferences);
    }
  }, [DEV_MODE]);

  const updatePreference = (path: string, value: boolean | number) => {
    setPreferences(prev => {
      if (path === 'notifications.desktop') {
        return { ...prev, notifications: { ...prev.notifications, desktop: value as boolean } };
      }
      if (path === 'notifications.email') {
        return { ...prev, notifications: { ...prev.notifications, email: value as boolean } };
      }
      if (path === 'notifications.sounds') {
        return { ...prev, notifications: { ...prev.notifications, sounds: value as boolean } };
      }
      if (path === 'notifications.security') {
        return { ...prev, notifications: { ...prev.notifications, security: value as boolean } };
      }
      if (path === 'dashboard.autoRefresh') {
        return { ...prev, dashboard: { ...prev.dashboard, autoRefresh: value as boolean } };
      }
      if (path === 'dashboard.compactMode') {
        return { ...prev, dashboard: { ...prev.dashboard, compactMode: value as boolean } };
      }
      if (path === 'dashboard.refreshInterval') {
        return { ...prev, dashboard: { ...prev.dashboard, refreshInterval: value as number } };
      }
      return prev;
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    console.log('Saving preferences:', preferences);
    setHasChanges(false);
  };

  const handleReset = () => {
    setPreferences(DEV_MODE ? mockPreferences : {
      notifications: {
        desktop: false,
        email: false,
        sounds: false,
        security: false,
        system: false,
      },
      dashboard: {
        autoRefresh: false,
        refreshInterval: 30,
        compactMode: false,
        showTooltips: true,
      },
    });
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Preferences</h1>
          <p className="text-gray-400 mt-1">
            Customize your SecureNet experience
          </p>
        </div>
        
        {hasChanges && (
          <div className="flex items-center space-x-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Appearance Settings */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <PaintBrushIcon className="w-5 h-5 mr-2" />
          Appearance
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Theme
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setTheme('light')}
                className={`flex items-center p-3 rounded-lg border transition-colors ${
                  theme === 'light' 
                    ? 'border-blue-500 bg-blue-900/20' 
                    : 'border-gray-600 bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <SunIcon className="w-5 h-5 mr-2 text-yellow-400" />
                <span className="text-white">Light</span>
              </button>
              
              <button
                onClick={() => setTheme('dark')}
                className={`flex items-center p-3 rounded-lg border transition-colors ${
                  theme === 'dark' 
                    ? 'border-blue-500 bg-blue-900/20' 
                    : 'border-gray-600 bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <MoonIcon className="w-5 h-5 mr-2 text-blue-400" />
                <span className="text-white">Dark</span>
              </button>
              
              <button
                onClick={() => setTheme('system')}
                className={`flex items-center p-3 rounded-lg border transition-colors ${
                  theme === 'system' 
                    ? 'border-blue-500 bg-blue-900/20' 
                    : 'border-gray-600 bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <ComputerDesktopIcon className="w-5 h-5 mr-2 text-purple-400" />
                <span className="text-white">System</span>
              </button>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Current theme: <span className="font-medium">{theme}</span>
              {theme === 'system' && ' (follows your system preference)'}
            </p>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <BellIcon className="w-5 h-5 mr-2" />
          Notifications
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-300">Desktop Notifications</label>
                <p className="text-sm text-gray-400">Show notifications in your browser</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.notifications.desktop}
                  onChange={(e) => updatePreference('notifications.desktop', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-300">Email Notifications</label>
                <p className="text-sm text-gray-400">Receive notifications via email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.notifications.email}
                  onChange={(e) => updatePreference('notifications.email', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-300">Sound Notifications</label>
                <p className="text-sm text-gray-400">Play sounds for alerts</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.notifications.sounds}
                  onChange={(e) => updatePreference('notifications.sounds', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-300">Security Alerts</label>
                <p className="text-sm text-gray-400">Critical security notifications</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.notifications.security}
                  onChange={(e) => updatePreference('notifications.security', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Settings */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <CpuChipIcon className="w-5 h-5 mr-2" />
          Dashboard
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-300">Auto Refresh</label>
                <p className="text-sm text-gray-400">Automatically refresh dashboard data</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.dashboard.autoRefresh}
                  onChange={(e) => updatePreference('dashboard.autoRefresh', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-300">Compact Mode</label>
                <p className="text-sm text-gray-400">Show more data in less space</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.dashboard.compactMode}
                  onChange={(e) => updatePreference('dashboard.compactMode', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {preferences.dashboard.autoRefresh && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Refresh Interval (seconds)
              </label>
              <select
                value={preferences.dashboard.refreshInterval}
                onChange={(e) => updatePreference('dashboard.refreshInterval', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={300}>5 minutes</option>
                <option value={600}>10 minutes</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Cog6ToothIcon className="w-5 h-5 mr-2" />
          Quick Actions
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={() => navigate('/settings')}
            className="flex items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <Cog6ToothIcon className="w-5 h-5 mr-3 text-blue-400" />
            <div className="text-left">
              <p className="text-white font-medium">System Settings</p>
              <p className="text-sm text-gray-400">Configure system-wide settings</p>
            </div>
          </button>

          <button 
            onClick={() => navigate('/profile')}
            className="flex items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <BellIcon className="w-5 h-5 mr-3 text-green-400" />
            <div className="text-left">
              <p className="text-white font-medium">Profile Settings</p>
              <p className="text-sm text-gray-400">Manage your account information</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}; 