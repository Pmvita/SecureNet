import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/common/Card';
import { SettingsForm, type SettingSection } from '../components/SettingsForm';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useSettings } from '../api/useSettings';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/features/auth/context/AuthContext';

export function SettingsPage() {
  const navigate = useNavigate();
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const {
    settings,
    isLoading,
    error,
    updateSettings,
    isUpdating,
  } = useSettings();

  // Transform settings into sections
  const sections: SettingSection[] = [
    {
      id: 'network_monitoring',
      title: 'Network Monitoring',
      description: 'Configure network monitoring settings',
      settings: [
        {
          id: 'network_monitoring.enabled',
          label: 'Enable Network Monitoring',
          type: 'switch',
          value: settings.network_monitoring.enabled,
        },
        {
          id: 'network_monitoring.interval',
          label: 'Monitoring Interval (seconds)',
          type: 'number',
          value: settings.network_monitoring.interval,
          min: 60,
          max: 3600,
        },
        {
          id: 'network_monitoring.devices',
          label: 'Monitored Devices',
          type: 'textarea',
          value: settings.network_monitoring.devices.join('\n'),
          placeholder: 'Enter one device per line',
        },
      ],
    },
    {
      id: 'security_scanning',
      title: 'Security Scanning',
      description: 'Configure security scanning settings',
      settings: [
        {
          id: 'security_scanning.enabled',
          label: 'Enable Security Scanning',
          type: 'switch',
          value: settings.security_scanning.enabled,
        },
        {
          id: 'security_scanning.interval',
          label: 'Scan Interval (seconds)',
          type: 'number',
          value: settings.security_scanning.interval,
          min: 300,
          max: 86400,
        },
        {
          id: 'security_scanning.types',
          label: 'Scan Types',
          type: 'textarea',
          value: settings.security_scanning.types.join('\n'),
          placeholder: 'Enter one scan type per line',
        },
      ],
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Configure notification settings',
      settings: [
        {
          id: 'notifications.enabled',
          label: 'Enable Notifications',
          type: 'switch',
          value: settings.notifications.enabled,
        },
        {
          id: 'notifications.email',
          label: 'Notification Email',
          type: 'text',
          value: settings.notifications.email,
          placeholder: 'Enter email address',
        },
        {
          id: 'notifications.slack_webhook',
          label: 'Slack Webhook URL',
          type: 'text',
          value: settings.notifications.slack_webhook,
          placeholder: 'Enter Slack webhook URL',
        },
      ],
    },
    {
      id: 'logging',
      title: 'Logging',
      description: 'Configure logging settings',
      settings: [
        {
          id: 'logging.level',
          label: 'Log Level',
          type: 'select',
          value: settings.logging.level,
          options: [
            { value: 'debug', label: 'Debug' },
            { value: 'info', label: 'Info' },
            { value: 'warning', label: 'Warning' },
            { value: 'error', label: 'Error' },
            { value: 'critical', label: 'Critical' },
          ],
        },
        {
          id: 'logging.retention_days',
          label: 'Log Retention (days)',
          type: 'number',
          value: settings.logging.retention_days,
          min: 1,
          max: 365,
        },
      ],
    },
  ];

  // Transform form values back into settings format
  const handleSubmit = (values: Record<string, string | number | boolean>) => {
    const newSettings = {
      network_monitoring: {
        enabled: values['network_monitoring.enabled'] as boolean,
        interval: values['network_monitoring.interval'] as number,
        devices: (values['network_monitoring.devices'] as string).split('\n').filter(Boolean),
      },
      security_scanning: {
        enabled: values['security_scanning.enabled'] as boolean,
        interval: values['security_scanning.interval'] as number,
        types: (values['security_scanning.types'] as string).split('\n').filter(Boolean),
      },
      notifications: {
        enabled: values['notifications.enabled'] as boolean,
        email: values['notifications.email'] as string,
        slack_webhook: values['notifications.slack_webhook'] as string,
      },
      logging: {
        level: values['logging.level'] as string,
        retention_days: values['logging.retention_days'] as number,
      },
    };
    updateSettings(newSettings);
  };

  // Show loading state while checking authentication
  if (isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <p className="text-gray-400">Loading...</p>
          </div>
        </Card>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    navigate('/login', { replace: true });
    return null;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-500 mb-2">Error Loading Settings</h2>
            <p className="text-gray-400 mb-4">{error.message}</p>
            <Button
              variant="primary"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <p className="text-gray-400">Loading settings...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-gray-400 mt-1">Configure application settings</p>
        </div>
      </div>

      <Card>
        <div className="p-4">
          <SettingsForm
            sections={sections}
            onSubmit={handleSubmit}
            loading={isUpdating}
            submitLabel="Save Changes"
          />
        </div>
      </Card>
    </div>
  );
} 