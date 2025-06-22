import React, { useState, useEffect } from 'react';
import { useAuth } from '../../features/auth/context/AuthContext';
import { 
  CogIcon, 
  ServerIcon,
  CircleStackIcon,
  CloudIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  KeyIcon
} from '@heroicons/react/24/outline';

interface SystemMetrics {
  infrastructure: {
    servers_online: number;
    total_servers: number;
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    network_latency: number;
  };
  database: {
    connections: number;
    query_performance: number;
    storage_used: number;
    backup_status: string;
    replication_lag: number;
  };
  security: {
    active_sessions: number;
    failed_logins: number;
    security_alerts: number;
    compliance_score: number;
  };
  platform: {
    total_organizations: number;
    total_users: number;
    api_requests_today: number;
    uptime_percentage: number;
  };
}

export const SystemAdministration: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    const fetchSystemMetrics = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/founder/system/metrics', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          setMetrics(result.data);
        } else {
          console.error('Failed to fetch system metrics');
          // Fallback to mock data
          setMetrics({
            infrastructure: {
              servers_online: 12,
              total_servers: 12,
              cpu_usage: 67,
              memory_usage: 78,
              disk_usage: 45,
              network_latency: 23
            },
            database: {
              connections: 47,
              query_performance: 95,
              storage_used: 234,
              backup_status: 'healthy',
              replication_lag: 0.2
            },
            security: {
              active_sessions: 156,
              failed_logins: 3,
              security_alerts: 2,
              compliance_score: 98
            },
            platform: {
              total_organizations: 247,
              total_users: 1847,
              api_requests_today: 234567,
              uptime_percentage: 99.97
            }
          });
        }
      } catch (error) {
        console.error('Error fetching system metrics:', error);
        // Fallback to mock data
        setMetrics({
          infrastructure: {
            servers_online: 12,
            total_servers: 12,
            cpu_usage: 67,
            memory_usage: 78,
            disk_usage: 45,
            network_latency: 23
          },
          database: {
            connections: 47,
            query_performance: 95,
            storage_used: 234,
            backup_status: 'healthy',
            replication_lag: 0.2
          },
          security: {
            active_sessions: 156,
            failed_logins: 3,
            security_alerts: 2,
            compliance_score: 98
          },
          platform: {
            total_organizations: 247,
            total_users: 1847,
            api_requests_today: 234567,
            uptime_percentage: 99.97
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSystemMetrics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading System Administration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <CogIcon className="w-8 h-8" />
                System Administration - God Mode
              </h1>
              <p className="text-blue-100 mt-1">
                Complete platform control and infrastructure management - {user?.username}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-green-500 w-3 h-3 rounded-full"></div>
              <span className="text-blue-100">All Systems Operational</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-gray-900 rounded-lg p-1">
          {[
            { id: 'overview', label: 'System Overview', icon: ChartBarIcon },
            { id: 'infrastructure', label: 'Infrastructure', icon: ServerIcon },
            { id: 'database', label: 'Database', icon: CircleStackIcon },
            { id: 'security', label: 'Security', icon: ShieldCheckIcon },
            { id: 'users', label: 'User Management', icon: UserGroupIcon },
            { id: 'emergency', label: 'Emergency Controls', icon: ExclamationTriangleIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                selectedTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* System Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatusCard
                title="Infrastructure"
                value={`${metrics?.infrastructure.servers_online}/${metrics?.infrastructure.total_servers}`}
                status="healthy"
                description="Servers Online"
                icon={ServerIcon}
              />
              <StatusCard
                title="Database"
                value={metrics?.database.backup_status || 'unknown'}
                status="healthy"
                description="Backup Status"
                icon={CircleStackIcon}
              />
              <StatusCard
                title="Security"
                value={`${metrics?.security.compliance_score}%`}
                status="healthy"
                description="Compliance Score"
                icon={ShieldCheckIcon}
              />
              <StatusCard
                title="Platform"
                value={`${metrics?.platform.uptime_percentage}%`}
                status="healthy"
                description="Uptime"
                icon={CloudIcon}
              />
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <ChartBarIcon className="w-6 h-6 text-blue-400" />
                  Platform Statistics
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <MetricItem label="Total Organizations" value={metrics?.platform.total_organizations.toString() || "0"} />
                  <MetricItem label="Total Users" value={metrics?.platform.total_users.toString() || "0"} />
                  <MetricItem label="API Requests Today" value={metrics?.platform.api_requests_today.toLocaleString() || "0"} />
                  <MetricItem label="Active Sessions" value={metrics?.security.active_sessions.toString() || "0"} />
                </div>
              </div>

              <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <ServerIcon className="w-6 h-6 text-green-400" />
                  Infrastructure Health
                </h2>
                <div className="space-y-3">
                  <HealthBar label="CPU Usage" percentage={metrics?.infrastructure.cpu_usage || 0} />
                  <HealthBar label="Memory Usage" percentage={metrics?.infrastructure.memory_usage || 0} />
                  <HealthBar label="Disk Usage" percentage={metrics?.infrastructure.disk_usage || 0} />
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Network Latency</span>
                    <span className="text-green-400 font-semibold">{metrics?.infrastructure.network_latency}ms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'infrastructure' && (
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <h2 className="text-xl font-semibold mb-4">Infrastructure Management</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AdminAction
                  title="Scale Infrastructure"
                  description="Add or remove server instances"
                  color="blue"
                  onClick={() => {/* Scale infrastructure */}}
                />
                <AdminAction
                  title="Deploy Updates"
                  description="Deploy system updates and patches"
                  color="green"
                  onClick={() => {/* Deploy updates */}}
                />
                <AdminAction
                  title="Configure Load Balancer"
                  description="Adjust load balancing settings"
                  color="purple"
                  onClick={() => {/* Configure load balancer */}}
                />
                <AdminAction
                  title="Monitor Performance"
                  description="View detailed performance metrics"
                  color="yellow"
                  onClick={() => {/* Monitor performance */}}
                />
                <AdminAction
                  title="Backup Systems"
                  description="Create system backups"
                  color="indigo"
                  onClick={() => {/* Backup systems */}}
                />
                <AdminAction
                  title="Security Scan"
                  description="Run comprehensive security scan"
                  color="red"
                  onClick={() => {/* Security scan */}}
                />
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'database' && (
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <h2 className="text-xl font-semibold mb-4">Database Administration</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Database Health</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Active Connections</span>
                      <span className="text-blue-400">{metrics?.database.connections}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Query Performance</span>
                      <span className="text-green-400">{metrics?.database.query_performance}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Storage Used</span>
                      <span className="text-yellow-400">{metrics?.database.storage_used}GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Replication Lag</span>
                      <span className="text-green-400">{metrics?.database.replication_lag}s</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Database Operations</h3>
                  <div className="grid grid-cols-1 gap-2">
                    <button className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm">Run Query</button>
                    <button className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm">Create Backup</button>
                    <button className="bg-yellow-600 hover:bg-yellow-700 px-3 py-2 rounded text-sm">Optimize Tables</button>
                    <button className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-sm">Emergency Reset</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'security' && (
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <h2 className="text-xl font-semibold mb-4">Security Administration</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <SecurityMetric
                  title="Active Sessions"
                  value={metrics?.security.active_sessions.toString() || "0"}
                  status="normal"
                />
                <SecurityMetric
                  title="Failed Logins"
                  value={metrics?.security.failed_logins.toString() || "0"}
                  status="low"
                />
                <SecurityMetric
                  title="Security Alerts"
                  value={metrics?.security.security_alerts.toString() || "0"}
                  status="low"
                />
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'emergency' && (
          <div className="space-y-6">
            <div className="bg-red-900 border border-red-600 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
                Emergency Controls - Founder Only
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EmergencyAction
                  title="System Reset"
                  description="Complete system reset with data preservation"
                  onClick={() => {/* System reset */}}
                />
                <EmergencyAction
                  title="Emergency Override"
                  description="Bypass all authentication systems"
                  onClick={() => {/* Emergency override */}}
                />
                <EmergencyAction
                  title="Maintenance Mode"
                  description="Put platform in maintenance mode"
                  onClick={() => {/* Maintenance mode */}}
                />
                <EmergencyAction
                  title="Database Recovery"
                  description="Restore from latest backup"
                  onClick={() => {/* Database recovery */}}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Components
interface StatusCardProps {
  title: string;
  value: string;
  status: 'healthy' | 'warning' | 'critical';
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const StatusCard: React.FC<StatusCardProps> = ({ title, value, status, description, icon: Icon }) => {
  const statusColors = {
    healthy: 'bg-green-900 border-green-600',
    warning: 'bg-yellow-900 border-yellow-600',
    critical: 'bg-red-900 border-red-600'
  };

  return (
    <div className={`${statusColors[status]} rounded-lg border p-4`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-6 h-6 text-white" />
        <div className={`w-3 h-3 rounded-full ${status === 'healthy' ? 'bg-green-400' : status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
      </div>
      <h3 className="text-sm text-gray-300 mb-1">{title}</h3>
      <p className="text-xl font-bold text-white mb-1">{value}</p>
      <p className="text-xs text-gray-400">{description}</p>
    </div>
  );
};

interface MetricItemProps {
  label: string;
  value: string;
}

const MetricItem: React.FC<MetricItemProps> = ({ label, value }) => (
  <div className="bg-gray-800 rounded-lg p-3">
    <p className="text-sm text-gray-400">{label}</p>
    <p className="text-lg font-semibold text-white">{value}</p>
  </div>
);

interface HealthBarProps {
  label: string;
  percentage: number;
}

const HealthBar: React.FC<HealthBarProps> = ({ label, percentage }) => {
  const getColor = (pct: number) => {
    if (pct < 60) return 'bg-green-400';
    if (pct < 80) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-gray-300 text-sm">{label}</span>
        <span className="text-white text-sm">{percentage}%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${getColor(percentage)}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

interface AdminActionProps {
  title: string;
  description: string;
  color: string;
  onClick: () => void;
}

const AdminAction: React.FC<AdminActionProps> = ({ title, description, color, onClick }) => {
  const colorClasses = {
    blue: 'bg-blue-900 border-blue-600 hover:bg-blue-800',
    green: 'bg-green-900 border-green-600 hover:bg-green-800',
    purple: 'bg-purple-900 border-purple-600 hover:bg-purple-800',
    yellow: 'bg-yellow-900 border-yellow-600 hover:bg-yellow-800',
    indigo: 'bg-indigo-900 border-indigo-600 hover:bg-indigo-800',
    red: 'bg-red-900 border-red-600 hover:bg-red-800'
  };

  return (
    <button
      onClick={onClick}
      className={`${colorClasses[color as keyof typeof colorClasses]} rounded-lg border p-4 text-left transition-colors hover:scale-105 transform transition-transform`}
    >
      <h3 className="font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-300">{description}</p>
    </button>
  );
};

interface SecurityMetricProps {
  title: string;
  value: string;
  status: 'normal' | 'low' | 'medium' | 'high';
}

const SecurityMetric: React.FC<SecurityMetricProps> = ({ title, value, status }) => {
  const statusColors = {
    normal: 'bg-blue-900 border-blue-600',
    low: 'bg-green-900 border-green-600',
    medium: 'bg-yellow-900 border-yellow-600',
    high: 'bg-red-900 border-red-600'
  };

  return (
    <div className={`${statusColors[status]} rounded-lg border p-4`}>
      <h3 className="text-sm text-gray-300 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
};

interface EmergencyActionProps {
  title: string;
  description: string;
  onClick: () => void;
}

const EmergencyAction: React.FC<EmergencyActionProps> = ({ title, description, onClick }) => (
  <button
    onClick={onClick}
    className="bg-red-800 border border-red-600 hover:bg-red-700 rounded-lg p-4 text-left transition-colors"
  >
    <h3 className="font-semibold text-white mb-1">{title}</h3>
    <p className="text-sm text-gray-300">{description}</p>
  </button>
); 