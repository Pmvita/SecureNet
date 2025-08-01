import React, { useState, useEffect } from 'react';
import { useAuth } from '../../features/auth/context/AuthContext';
import { 
  ExclamationTriangleIcon,
  PowerIcon,
  PauseIcon,
  PlayIcon,
  ShieldExclamationIcon,
  WrenchScrewdriverIcon,
  BellAlertIcon,
  ClockIcon,
  ServerIcon,
  UserGroupIcon,
  ArrowPathIcon,
  StopIcon
} from '@heroicons/react/24/outline';

interface SystemStatus {
  platform_status: 'operational' | 'maintenance' | 'emergency' | 'degraded';
  maintenance_mode: boolean;
  emergency_shutdown: boolean;
  api_status: 'healthy' | 'degraded' | 'down';
  database_status: 'healthy' | 'degraded' | 'down';
  last_emergency_action?: {
    action: string;
    timestamp: string;
    user: string;
    reason: string;
  };
}

interface EmergencyAction {
  id: string;
  name: string;
  description: string;
  type: 'shutdown' | 'maintenance' | 'alert' | 'rollback';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confirmation_required: boolean;
  estimated_downtime?: string;
}

const EmergencyControls: React.FC = () => {
  const { user } = useAuth();
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [confirmationModal, setConfirmationModal] = useState<{
    action: EmergencyAction;
    reason: string;
  } | null>(null);

  const emergencyActions: EmergencyAction[] = [
    {
      id: 'emergency_shutdown',
      name: 'Emergency Shutdown',
      description: 'Immediately shut down all platform services',
      type: 'shutdown',
      severity: 'critical',
      confirmation_required: true,
      estimated_downtime: 'Indefinite'
    },
    {
      id: 'maintenance_mode',
      name: 'Maintenance Mode',
      description: 'Put platform in maintenance mode (read-only)',
      type: 'maintenance',
      severity: 'high',
      confirmation_required: true,
      estimated_downtime: '30 minutes - 2 hours'
    },
    {
      id: 'api_circuit_breaker',
      name: 'API Circuit Breaker',
      description: 'Temporarily disable API endpoints to prevent cascading failures',
      type: 'shutdown',
      severity: 'high',
      confirmation_required: true,
      estimated_downtime: '15-30 minutes'
    },
    {
      id: 'global_alert',
      name: 'Global Alert',
      description: 'Send emergency notification to all customers and staff',
      type: 'alert',
      severity: 'medium',
      confirmation_required: true
    },
    {
      id: 'rollback_deployment',
      name: 'Emergency Rollback',
      description: 'Rollback to previous stable deployment version',
      type: 'rollback',
      severity: 'high',
      confirmation_required: true,
      estimated_downtime: '10-15 minutes'
    },
    {
      id: 'database_readonly',
      name: 'Database Read-Only Mode',
      description: 'Set database to read-only to prevent data corruption',
      type: 'maintenance',
      severity: 'high',
      confirmation_required: true,
      estimated_downtime: '1-2 hours'
    }
  ];

  useEffect(() => {
    fetchSystemStatus();
    // Refresh status every 30 seconds
    const interval = setInterval(fetchSystemStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSystemStatus = async () => {
    try {
      setLoading(true);
      // Mock data - in real implementation would fetch from monitoring APIs
      setSystemStatus({
        platform_status: 'operational',
        maintenance_mode: false,
        emergency_shutdown: false,
        api_status: 'healthy',
        database_status: 'healthy',
        last_emergency_action: {
          action: 'Maintenance Mode Activated',
          timestamp: '2024-07-28T14:30:00Z',
          user: 'PierreMvita',
          reason: 'Scheduled database optimization'
        }
      });
    } catch (error) {
      console.error('Error fetching system status:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeEmergencyAction = async (action: EmergencyAction, reason: string) => {
    try {
      setActionInProgress(action.id);
      // In real implementation would call emergency action APIs
      console.log(`Executing ${action.name}: ${reason}`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update system status based on action
      setSystemStatus(prev => {
        if (!prev) return prev;
        
        const newStatus = { ...prev };
        
        switch (action.id) {
          case 'emergency_shutdown':
            newStatus.emergency_shutdown = true;
            newStatus.platform_status = 'emergency';
            break;
          case 'maintenance_mode':
            newStatus.maintenance_mode = true;
            newStatus.platform_status = 'maintenance';
            break;
          default:
            break;
        }
        
        newStatus.last_emergency_action = {
          action: action.name,
          timestamp: new Date().toISOString(),
          user: user?.username || 'Unknown',
          reason
        };
        
        return newStatus;
      });
      
      setConfirmationModal(null);
    } catch (error) {
      console.error('Error executing emergency action:', error);
    } finally {
      setActionInProgress(null);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'border-blue-500 bg-blue-500/10 text-blue-400';
      case 'medium': return 'border-yellow-500 bg-yellow-500/10 text-yellow-400';
      case 'high': return 'border-orange-500 bg-orange-500/10 text-orange-400';
      case 'critical': return 'border-red-500 bg-red-500/10 text-red-400';
      default: return 'border-gray-500 bg-gray-500/10 text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
      case 'healthy':
        return 'text-green-400 bg-green-400/10';
      case 'degraded':
      case 'maintenance':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'down':
      case 'emergency':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'shutdown': return <PowerIcon className="w-5 h-5" />;
      case 'maintenance': return <WrenchScrewdriverIcon className="w-5 h-5" />;
      case 'alert': return <BellAlertIcon className="w-5 h-5" />;
      case 'rollback': return <ArrowPathIcon className="w-5 h-5" />;
      default: return <ExclamationTriangleIcon className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading emergency controls...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-400" />
            <h1 className="text-3xl font-bold text-white">Emergency Controls</h1>
          </div>
          <p className="text-gray-400 mb-4">
            Critical system controls for emergency situations and platform-wide incidents
          </p>
          <div className="p-4 bg-red-900/20 border border-red-700/30 rounded-lg">
            <p className="text-red-300 text-sm">
              ⚠️ <strong>FOUNDER ONLY:</strong> These controls can affect the entire platform. Use with extreme caution and proper justification.
            </p>
          </div>
        </div>

        {/* System Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <ServerIcon className="w-8 h-8 text-blue-400" />
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(systemStatus?.platform_status || 'operational')}`}>
                {systemStatus?.platform_status || 'operational'}
              </span>
            </div>
            <h3 className="text-white font-semibold">Platform Status</h3>
            <p className="text-gray-400 text-sm">Overall system health</p>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <WrenchScrewdriverIcon className="w-8 h-8 text-yellow-400" />
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                systemStatus?.maintenance_mode ? 'text-yellow-400 bg-yellow-400/10' : 'text-green-400 bg-green-400/10'
              }`}>
                {systemStatus?.maintenance_mode ? 'Active' : 'Inactive'}
              </span>
            </div>
            <h3 className="text-white font-semibold">Maintenance Mode</h3>
            <p className="text-gray-400 text-sm">Platform maintenance status</p>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <ShieldExclamationIcon className="w-8 h-8 text-red-400" />
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                systemStatus?.emergency_shutdown ? 'text-red-400 bg-red-400/10' : 'text-green-400 bg-green-400/10'
              }`}>
                {systemStatus?.emergency_shutdown ? 'Shutdown' : 'Normal'}
              </span>
            </div>
            <h3 className="text-white font-semibold">Emergency Status</h3>
            <p className="text-gray-400 text-sm">Emergency shutdown status</p>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <UserGroupIcon className="w-8 h-8 text-purple-400" />
              <span className="text-white font-bold">2,847</span>
            </div>
            <h3 className="text-white font-semibold">Active Customers</h3>
            <p className="text-gray-400 text-sm">Currently affected users</p>
          </div>
        </div>

        {/* Last Emergency Action */}
        {systemStatus?.last_emergency_action && (
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Last Emergency Action</h2>
            <div className="flex items-start gap-4">
              <ClockIcon className="w-6 h-6 text-gray-400 mt-1" />
              <div>
                <h3 className="text-white font-medium">{systemStatus.last_emergency_action.action}</h3>
                <p className="text-gray-400 text-sm mb-2">
                  By {systemStatus.last_emergency_action.user} • {new Date(systemStatus.last_emergency_action.timestamp).toLocaleString()}
                </p>
                <p className="text-gray-300">{systemStatus.last_emergency_action.reason}</p>
              </div>
            </div>
          </div>
        )}

        {/* Emergency Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-6">Emergency Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {emergencyActions.map((action) => (
              <div key={action.id} className={`bg-gray-900 border-2 rounded-lg p-6 ${getSeverityColor(action.severity)}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getActionIcon(action.type)}
                    <h3 className="text-white font-semibold">{action.name}</h3>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${getSeverityColor(action.severity)}`}>
                    {action.severity}
                  </span>
                </div>
                
                <p className="text-gray-300 text-sm mb-4">{action.description}</p>
                
                {action.estimated_downtime && (
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                    <ClockIcon className="w-4 h-4" />
                    <span>Estimated downtime: {action.estimated_downtime}</span>
                  </div>
                )}
                
                <button
                  onClick={() => setConfirmationModal({ action, reason: '' })}
                  disabled={actionInProgress === action.id}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                    action.severity === 'critical' 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : action.severity === 'high'
                      ? 'bg-orange-600 hover:bg-orange-700 text-white'
                      : 'bg-gray-600 hover:bg-gray-700 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {actionInProgress === action.id ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Executing...
                    </div>
                  ) : (
                    `Execute ${action.name}`
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* System Health Indicators */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-6">System Health Indicators</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">API Services</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(systemStatus?.api_status || 'healthy')}`}>
                  {systemStatus?.api_status || 'healthy'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Database Cluster</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(systemStatus?.database_status || 'healthy')}`}>
                  {systemStatus?.database_status || 'healthy'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        {confirmationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-400" />
                <h3 className="text-xl font-bold text-white">Confirm Emergency Action</h3>
              </div>
              
              <p className="text-gray-300 mb-4">
                Are you sure you want to execute <strong>{confirmationModal.action.name}</strong>?
              </p>
              
              <p className="text-gray-400 text-sm mb-6">
                {confirmationModal.action.description}
              </p>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Reason for emergency action (required):
                </label>
                <textarea
                  value={confirmationModal.reason}
                  onChange={(e) => setConfirmationModal(prev => prev ? {...prev, reason: e.target.value} : null)}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Explain the reason for this emergency action..."
                />
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setConfirmationModal(null)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => executeEmergencyAction(confirmationModal.action, confirmationModal.reason)}
                  disabled={!confirmationModal.reason.trim() || actionInProgress !== null}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg font-medium"
                >
                  Execute
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmergencyControls;