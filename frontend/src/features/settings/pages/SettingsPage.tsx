import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/common/Card';
import { useSettings } from '../api/useSettings';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  CogIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  BellIcon,
  DocumentTextIcon,
  ServerIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserCircleIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Switch } from '@/components/common/Switch';

interface SettingsMetric {
  id: string;
  title: string;
  value: string | number;
  change?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

interface SettingItem {
  id: string;
  label: string;
  description?: string;
  type: 'text' | 'number' | 'select' | 'switch' | 'textarea' | 'password';
  value: any;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  min?: number;
  max?: number;
  required?: boolean;
}

interface SettingCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  settings: SettingItem[];
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { settings, isLoading, error, updateSettings, isUpdating } = useSettings();
  const [activeCategory, setActiveCategory] = React.useState('system');
  const [formValues, setFormValues] = React.useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = React.useState(false);

  // Initialize form values
  React.useEffect(() => {
    if (settings && Object.keys(formValues).length === 0) {
      const initialValues: Record<string, any> = {};
      
      // Flatten settings structure
      Object.entries(settings).forEach(([categoryKey, categorySettings]) => {
        if (typeof categorySettings === 'object' && categorySettings !== null) {
          Object.entries(categorySettings).forEach(([settingKey, value]) => {
            initialValues[`${categoryKey}.${settingKey}`] = value;
          });
        }
      });
      
      setFormValues(initialValues);
    }
  }, [settings, formValues]);

  // Check for authentication
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate('/login', { replace: true });
    return null;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-red-500 mb-2">Error Loading Settings</h2>
        <p className="text-gray-400 mb-4">{error.message}</p>
        <Button variant="primary" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Calculate metrics
  const metrics: SettingsMetric[] = [
    {
      id: 'system_health',
      title: 'System Health',
      value: settings?.system?.health_status || 'Good',
      icon: CheckCircleIcon,
      color: 'text-green-400',
      bgColor: 'bg-gradient-to-r from-green-500/20 to-green-600/20',
    },
    {
      id: 'active_modules',
      title: 'Active Modules',
      value: [
        settings?.network_monitoring?.enabled,
        settings?.security_scanning?.enabled,
        settings?.notifications?.enabled,
      ].filter(Boolean).length,
      icon: ServerIcon,
      color: 'text-blue-400',
      bgColor: 'bg-gradient-to-r from-blue-500/20 to-blue-600/20',
    },
    {
      id: 'last_backup',
      title: 'Last Backup',
      value: '2 hours ago',
      icon: ClockIcon,
      color: 'text-purple-400',
      bgColor: 'bg-gradient-to-r from-purple-500/20 to-purple-600/20',
    },
    {
      id: 'config_version',
      title: 'Config Version',
      value: 'v2.1.3',
      icon: DocumentTextIcon,
      color: 'text-orange-400',
      bgColor: 'bg-gradient-to-r from-orange-500/20 to-orange-600/20',
    },
  ];

  // Define setting categories
  const categories: SettingCategory[] = [
    {
      id: 'system',
      title: 'System Configuration',
      description: 'Core system settings and preferences',
      icon: CogIcon,
      color: 'text-blue-400',
      settings: [
        {
          id: 'system.timezone',
          label: 'System Timezone',
          description: 'Set the system timezone for logs and reports',
          type: 'select',
          value: formValues['system.timezone'] || 'UTC',
          options: [
            { value: 'UTC', label: 'UTC' },
            { value: 'America/New_York', label: 'Eastern Time' },
            { value: 'America/Chicago', label: 'Central Time' },
            { value: 'America/Denver', label: 'Mountain Time' },
            { value: 'America/Los_Angeles', label: 'Pacific Time' },
          ],
        },
        {
          id: 'system.language',
          label: 'System Language',
          type: 'select',
          value: formValues['system.language'] || 'en',
          options: [
            { value: 'en', label: 'English' },
            { value: 'es', label: 'Spanish' },
            { value: 'fr', label: 'French' },
            { value: 'de', label: 'German' },
          ],
        },
        {
          id: 'system.theme',
          label: 'Theme',
          type: 'select',
          value: formValues['system.theme'] || 'dark',
          options: [
            { value: 'dark', label: 'Dark Mode' },
            { value: 'light', label: 'Light Mode' },
            { value: 'auto', label: 'Auto (System)' },
          ],
        },
      ],
    },
    {
      id: 'network',
      title: 'Network Monitoring',
      description: 'Configure network monitoring and scanning',
      icon: GlobeAltIcon,
      color: 'text-green-400',
      settings: [
        {
          id: 'network_monitoring.enabled',
          label: 'Enable Network Monitoring',
          description: 'Monitor network devices and connections',
          type: 'switch',
          value: formValues['network_monitoring.enabled'] ?? true,
        },
        {
          id: 'network_monitoring.interval',
          label: 'Monitoring Interval (seconds)',
          description: 'How often to check network status',
          type: 'number',
          value: formValues['network_monitoring.interval'] || 300,
          min: 60,
          max: 3600,
        },
        {
          id: 'network_monitoring.timeout',
          label: 'Connection Timeout (seconds)',
          type: 'number',
          value: formValues['network_monitoring.timeout'] || 30,
          min: 5,
          max: 120,
        },
        {
          id: 'network_monitoring.interface',
          label: 'Network Interface',
          description: 'Primary network interface to monitor',
          type: 'select',
          value: formValues['network_monitoring.interface'] || 'auto',
          options: [
            { value: 'auto', label: 'Auto-detect' },
            { value: 'eth0', label: 'Ethernet (eth0)' },
            { value: 'wlan0', label: 'WiFi (wlan0)' },
            { value: 'all', label: 'Monitor all interfaces' },
          ],
        },
        {
          id: 'network_monitoring.ip_ranges',
          label: 'IP Ranges to Monitor',
          description: 'Comma-separated list of IP ranges (e.g., 192.168.1.0/24)',
          type: 'textarea',
          value: formValues['network_monitoring.ip_ranges'] || '192.168.1.0/24,10.0.0.0/8',
          placeholder: '192.168.1.0/24, 10.0.0.0/8, 172.16.0.0/12',
        },
        {
          id: 'network_monitoring.discovery_method',
          label: 'Device Discovery Method',
          description: 'How to discover devices on the network',
          type: 'select',
          value: formValues['network_monitoring.discovery_method'] || 'ping_arp',
          options: [
            { value: 'ping_arp', label: 'Ping + ARP scanning' },
            { value: 'ping_only', label: 'Ping scanning only' },
            { value: 'arp_only', label: 'ARP scanning only' },
            { value: 'passive', label: 'Passive monitoring' },
          ],
        },
        {
          id: 'network_monitoring.max_devices',
          label: 'Maximum Devices to Track',
          description: 'Limit the number of devices tracked simultaneously',
          type: 'number',
          value: formValues['network_monitoring.max_devices'] || 1000,
          min: 10,
          max: 10000,
        },
        {
          id: 'network_monitoring.traffic_analysis',
          label: 'Enable Traffic Analysis',
          description: 'Analyze network traffic patterns and bandwidth usage',
          type: 'switch',
          value: formValues['network_monitoring.traffic_analysis'] ?? false,
        },
        {
          id: 'network_monitoring.packet_capture',
          label: 'Enable Packet Capture',
          description: 'Capture packets for deep inspection (requires elevated privileges)',
          type: 'switch',
          value: formValues['network_monitoring.packet_capture'] ?? false,
        },
        {
          id: 'network_monitoring.capture_filter',
          label: 'Packet Capture Filter',
          description: 'BPF filter expression for packet capture',
          type: 'text',
          value: formValues['network_monitoring.capture_filter'] || 'tcp port 80 or tcp port 443',
          placeholder: 'tcp port 80 or tcp port 443 or icmp',
        },
        {
          id: 'network_monitoring.dns_monitoring',
          label: 'Enable DNS Monitoring',
          description: 'Monitor DNS queries and responses',
          type: 'switch',
          value: formValues['network_monitoring.dns_monitoring'] ?? true,
        },
        {
          id: 'network_monitoring.port_scan_detection',
          label: 'Port Scan Detection',
          description: 'Detect potential port scanning activities',
          type: 'switch',
          value: formValues['network_monitoring.port_scan_detection'] ?? true,
        },
        {
          id: 'network_monitoring.bandwidth_threshold',
          label: 'Bandwidth Alert Threshold (Mbps)',
          description: 'Alert when bandwidth usage exceeds this threshold',
          type: 'number',
          value: formValues['network_monitoring.bandwidth_threshold'] || 100,
          min: 1,
          max: 10000,
        },
      ],
    },
    {
      id: 'security',
      title: 'Security Settings',
      description: 'Configure security scanning and policies',
      icon: ShieldCheckIcon,
      color: 'text-red-400',
      settings: [
        {
          id: 'security_scanning.enabled',
          label: 'Enable Security Scanning',
          description: 'Perform automated security scans',
          type: 'switch',
          value: formValues['security_scanning.enabled'] ?? true,
        },
        {
          id: 'security_scanning.interval',
          label: 'Scan Interval (seconds)',
          description: 'How often to perform security scans',
          type: 'number',
          value: formValues['security_scanning.interval'] || 3600,
          min: 300,
          max: 86400,
        },
        {
          id: 'security_scanning.severity_threshold',
          label: 'Alert Severity Threshold',
          type: 'select',
          value: formValues['security_scanning.severity_threshold'] || 'medium',
          options: [
            { value: 'low', label: 'Low and above' },
            { value: 'medium', label: 'Medium and above' },
            { value: 'high', label: 'High and above' },
            { value: 'critical', label: 'Critical only' },
          ],
        },
      ],
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Configure alerts and notification channels',
      icon: BellIcon,
      color: 'text-yellow-400',
      settings: [
        {
          id: 'notifications.enabled',
          label: 'Enable Notifications',
          description: 'Send alerts for security events',
          type: 'switch',
          value: formValues['notifications.enabled'] ?? true,
        },
        {
          id: 'notifications.email',
          label: 'Notification Email',
          type: 'text',
          value: formValues['notifications.email'] || '',
          placeholder: 'admin@company.com',
        },
        {
          id: 'notifications.slack_webhook',
          label: 'Slack Webhook URL',
          type: 'text',
          value: formValues['notifications.slack_webhook'] || '',
          placeholder: 'https://hooks.slack.com/...',
        },
      ],
    },
    {
      id: 'logging',
      title: 'Logging & Audit',
      description: 'Configure logging levels and retention',
      icon: DocumentTextIcon,
      color: 'text-purple-400',
      settings: [
        {
          id: 'logging.level',
          label: 'Log Level',
          description: 'Minimum log level to record',
          type: 'select',
          value: formValues['logging.level'] || 'info',
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
          description: 'How long to keep log files',
          type: 'number',
          value: formValues['logging.retention_days'] || 30,
          min: 1,
          max: 365,
        },
        {
          id: 'logging.audit_enabled',
          label: 'Enable Audit Logging',
          description: 'Log all user actions and system changes',
          type: 'switch',
          value: formValues['logging.audit_enabled'] ?? true,
        },
      ],
    },
  ];

  const handleInputChange = (settingId: string, value: any) => {
    setFormValues(prev => ({ ...prev, [settingId]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    // Transform flat form values back to nested structure
    const newSettings = {
      system: {},
      network_monitoring: {},
      security_scanning: {},
      notifications: {},
      logging: {},
    } as any;

    Object.entries(formValues).forEach(([key, value]) => {
      const [category, setting] = key.split('.');
      if (newSettings[category]) {
        newSettings[category][setting] = value;
      }
    });

    await updateSettings(newSettings);
    setHasChanges(false);
  };

  const handleReset = () => {
    if (settings) {
      const resetValues: Record<string, any> = {};
      Object.entries(settings).forEach(([categoryKey, categorySettings]) => {
        if (typeof categorySettings === 'object' && categorySettings !== null) {
          Object.entries(categorySettings).forEach(([settingKey, value]) => {
            resetValues[`${categoryKey}.${settingKey}`] = value;
          });
        }
      });
      setFormValues(resetValues);
      setHasChanges(false);
    }
  };

  const renderSettingControl = (setting: SettingItem) => {
    const baseClasses = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent";
    
    switch (setting.type) {
      case 'switch':
        return (
          <Switch
            checked={setting.value}
            onChange={(checked) => handleInputChange(setting.id, checked)}
          />
        );
      case 'select':
        return (
          <Select
            value={setting.value}
            onChange={(value) => handleInputChange(setting.id, value)}
            options={setting.options || []}
            className="w-full"
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={setting.value}
            onChange={(value: string) => handleInputChange(setting.id, Number(value))}
            min={setting.min}
            max={setting.max}
            className="w-full"
          />
        );
      case 'textarea':
        return (
          <textarea
            value={setting.value}
            onChange={(e) => handleInputChange(setting.id, e.target.value)}
            placeholder={setting.placeholder}
            rows={4}
            className={baseClasses}
          />
        );
      case 'password':
        return (
          <Input
            type="password"
            value={setting.value}
            onChange={(value: string) => handleInputChange(setting.id, value)}
            placeholder={setting.placeholder}
            className="w-full"
          />
        );
      default:
        return (
          <Input
            type="text"
            value={setting.value}
            onChange={(value: string) => handleInputChange(setting.id, value)}
            placeholder={setting.placeholder}
            className="w-full"
          />
        );
    }
  };

  const activeSettings = categories.find(cat => cat.id === activeCategory);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">System Configuration</h1>
          <p className="text-gray-400">Manage system settings and preferences</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={!hasChanges || isUpdating}
          >
            Reset Changes
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!hasChanges}
            isLoading={isUpdating}
          >
            Save Configuration
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <Card key={metric.id} className={`${metric.bgColor} border-gray-700`}>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{metric.title}</p>
                  <p className="text-2xl font-bold text-white mt-1">{metric.value}</p>
                </div>
                <metric.icon className={`h-8 w-8 ${metric.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Settings Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories Sidebar */}
        <div className="lg:col-span-1">
          <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-600">
            <div className="p-6 border-b border-gray-600 bg-gradient-to-r from-gray-800/80 to-gray-700/80">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <CogIcon className="h-6 w-6 text-blue-400" />
                Settings Categories
              </h3>
            </div>
            <div className="p-6 bg-gray-900/30">
            <nav className="space-y-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                    activeCategory === category.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <category.icon className={`h-5 w-5 ${category.color}`} />
                  <span className="font-medium">{category.title}</span>
                </button>
              ))}
            </nav>
            </div>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          {activeSettings && (
            <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-600">
              <div className="p-6 border-b border-gray-600 bg-gradient-to-r from-gray-800/80 to-gray-700/80">
                <div className="flex items-center gap-3 mb-2">
                  <activeSettings.icon className={`h-6 w-6 ${activeSettings.color}`} />
                  <h2 className="text-2xl font-bold text-white">{activeSettings.title}</h2>
                </div>
                <p className="text-gray-400">{activeSettings.description}</p>
              </div>

              <div className="p-6 bg-gray-900/30">

              <div className="space-y-6">
                {activeSettings.settings.map((setting) => (
                  <div key={setting.id} className="flex items-start justify-between py-4 border-b border-gray-700 last:border-b-0">
                    <div className="flex-1 mr-6">
                      <label className="block text-sm font-medium text-white mb-1">
                        {setting.label}
                        {setting.required && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      {setting.description && (
                        <p className="text-sm text-gray-400 mb-2">{setting.description}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0" style={{ minWidth: '200px' }}>
                      {renderSettingControl(setting)}
                    </div>
                  </div>
                ))}
              </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Save Changes Notification */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <span>You have unsaved changes</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={handleReset}>
              Reset
            </Button>
            <Button size="sm" variant="primary" onClick={handleSave} isLoading={isUpdating}>
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 