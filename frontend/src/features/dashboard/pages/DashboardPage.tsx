import React, { useState, useMemo, useRef } from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { useLogs, LogEntry } from '../../logs/api/useLogs';
import { useNetwork } from '../../network/api/useNetwork';
import { useSecurity } from '../../security/api/useSecurity';
import { useAnomalies } from '../../anomalies/api/useAnomalies';
import { useSecurityAlerts } from '../hooks/useSecurityAlerts';
import { SecurityAlertsDropdown, type SecurityAlert } from '../components/SecurityAlertsDropdown';
import { formatDistanceToNow, format } from 'date-fns';
import {
  ShieldCheckIcon,
  ShieldExclamationIcon,
  ServerIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
  EyeIcon,
  ArrowPathIcon,
  BellIcon,
  CpuChipIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  BugAntIcon,
  FireIcon,
  SignalIcon,
  WifiIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

// Status indicators
const securityLevelConfig = {
  high: { 
    variant: 'success' as const, 
    icon: ShieldCheckIcon, 
    color: 'text-green-400',
    bgColor: 'bg-green-400/10 border-green-400/20',
    label: 'Secure'
  },
  medium: { 
    variant: 'warning' as const, 
    icon: ShieldExclamationIcon, 
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10 border-yellow-400/20',
    label: 'Warning'
  },
  low: { 
    variant: 'error' as const, 
    icon: ExclamationTriangleIcon, 
    color: 'text-red-400',
    bgColor: 'bg-red-400/10 border-red-400/20',
    label: 'Critical'
  },
};

const severityConfig = {
  critical: { color: 'text-red-400', bgColor: 'bg-red-400/10', variant: 'error' as const },
  high: { color: 'text-orange-400', bgColor: 'bg-orange-400/10', variant: 'error' as const },
  medium: { color: 'text-yellow-400', bgColor: 'bg-yellow-400/10', variant: 'warning' as const },
  low: { color: 'text-blue-400', bgColor: 'bg-blue-400/10', variant: 'info' as const },
  info: { color: 'text-green-400', bgColor: 'bg-green-400/10', variant: 'success' as const },
};

export function DashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [alertsDropdownOpen, setAlertsDropdownOpen] = useState(false);
  const alertsButtonRef = useRef<HTMLDivElement>(null);
  
  // Fetch data from all services
  const { data: logsData, isLoading: logsLoading } = useLogs({ 
    page: 1, 
    pageSize: 5,
    refreshInterval: 30000 
  });
  
  const { 
    metrics: networkMetrics, 
    devices, 
    connections,
    isLoading: networkLoading 
  } = useNetwork({ refreshInterval: 30000 });
  
  const { 
    metrics: securityMetrics, 
    recentScans, 
    recentFindings,
    isLoading: securityLoading 
  } = useSecurity();
  
  const { 
    anomalies, 
    metrics: anomalyMetrics,
    isLoading: anomaliesLoading 
  } = useAnomalies();

  // Security alerts functionality
  const { 
    alerts: securityAlerts, 
    stats: alertStats, 
    markAsRead, 
    markAllAsRead 
  } = useSecurityAlerts();

  // Calculate overall security score
  const securityScore = useMemo(() => {
    console.log('SecurityMetrics in dashboard:', securityMetrics);
    if (!securityMetrics) return 0;
    return securityMetrics.security_score || 85;
  }, [securityMetrics]);

  // Get security level based on score
  const securityLevel = useMemo(() => {
    if (securityScore >= 80) return 'high';
    if (securityScore >= 60) return 'medium';
    return 'low';
  }, [securityScore]);

  // Recent critical logs
  const criticalLogs = useMemo(() => {
    return (logsData?.logs || []).filter(log => 
      log.level === 'error' || log.level === 'critical'
    ).slice(0, 3);
  }, [logsData?.logs]);

  // Recent active anomalies
  const activeAnomalies = useMemo(() => {
    return anomalies.filter(anomaly => anomaly.status === 'active').slice(0, 3);
  }, [anomalies]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    window.location.reload();
  };

  const isLoading = logsLoading || networkLoading || securityLoading || anomaliesLoading;

  // Debug logging
  console.log('Dashboard state:', {
    securityMetrics,
    securityLoading,
    networkMetrics,
    anomalyMetrics,
    isLoading
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Security Operations Center</h1>
          <p className="text-gray-400 mt-1">Real-time security monitoring and threat detection</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handleRefresh}
            className="flex items-center gap-2"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </Button>
          <div className="relative" ref={alertsButtonRef}>
            <Button
              variant="primary"
              onClick={() => setAlertsDropdownOpen(!alertsDropdownOpen)}
              className="flex items-center gap-2 relative"
            >
              <BellIcon className="h-4 w-4" />
              Alerts
              {alertStats.unread > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {alertStats.unread}
                </span>
              )}
            </Button>
            
            <SecurityAlertsDropdown
              isOpen={alertsDropdownOpen}
              onClose={() => setAlertsDropdownOpen(false)}
              alerts={securityAlerts}
              onAlertClick={(alert: SecurityAlert) => {
                markAsRead(alert.id);
                setAlertsDropdownOpen(false);
              }}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
            />
          </div>
        </div>
      </div>

      {/* Security Status Overview */}
      <Card className={`${securityLevelConfig[securityLevel].bgColor} transition-all duration-300`}>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {React.createElement(securityLevelConfig[securityLevel].icon, {
                className: `h-12 w-12 ${securityLevelConfig[securityLevel].color}`
              })}
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Security Status: {securityLevelConfig[securityLevel].label}
                </h2>
                <p className="text-gray-400 mt-1">
                  Overall security score: {securityScore}/100
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-white">{securityScore}</div>
              <div className="text-sm text-gray-400">Security Score</div>
            </div>
          </div>
          
          {/* Security Score Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Security Health</span>
              <span>{securityScore}%</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ease-out ${
                  securityScore >= 80 ? 'bg-green-400' :
                  securityScore >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                }`}
                style={{ width: `${securityScore}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {/* Security Metrics */}
        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-400">Active Threats</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {securityMetrics?.critical_findings || 0}
                </p>
              </div>
              <FireIcon className="h-8 w-8 text-red-400" />
            </div>
            {!securityLoading && (
              <div className="mt-2 text-xs text-gray-400">
                Last scan: {securityMetrics?.last_scan ? 
                  formatDistanceToNow(new Date(securityMetrics.last_scan)) + ' ago' : 
                  'Never'
                }
              </div>
            )}
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-400">Anomalies</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {anomalyMetrics?.open || 0}
                </p>
              </div>
              <BugAntIcon className="h-8 w-8 text-orange-400" />
            </div>
            <div className="mt-2 text-xs text-gray-400">
              {anomalyMetrics?.critical || 0} critical
            </div>
          </div>
        </Card>

        {/* Network Metrics */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-400">Network Devices</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {networkMetrics?.totalDevices || 0}
                </p>
              </div>
              <ServerIcon className="h-8 w-8 text-blue-400" />
            </div>
            <div className="mt-2 text-xs text-gray-400">
              {networkMetrics?.activeDevices || 0} online
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-400">Connections</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {networkMetrics?.activeConnections || 0}
                </p>
              </div>
              <WifiIcon className="h-8 w-8 text-purple-400" />
            </div>
            <div className="mt-2 text-xs text-gray-400">
              {networkMetrics?.blockedConnections || 0} blocked
            </div>
          </div>
        </Card>

        {/* System Metrics */}
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-400">System Health</p>
                <p className="text-2xl font-bold text-white mt-1">98%</p>
              </div>
              <CpuChipIcon className="h-8 w-8 text-green-400" />
            </div>
            <div className="mt-2 text-xs text-gray-400">
              All services operational
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border-cyan-500/20">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-cyan-400">Log Events</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {logsData?.logs?.length || 0}
                </p>
              </div>
              <DocumentTextIcon className="h-8 w-8 text-cyan-400" />
            </div>
            <div className="mt-2 text-xs text-gray-400">
              {criticalLogs.length} critical
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Security Alerts */}
        <div className="xl:col-span-1">
          <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-600">
            <div className="p-6 border-b border-gray-600 bg-gradient-to-r from-gray-800/80 to-gray-700/80">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <ShieldExclamationIcon className="h-6 w-6 text-red-400" />
                  Security Alerts
                </h2>
                <Badge variant="error" className="text-xs">
                  {activeAnomalies.length} Active
                </Badge>
              </div>
            </div>
            <div className="p-6 bg-gray-900/30">
              {activeAnomalies.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircleIcon className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Active Alerts</h3>
                  <p className="text-gray-400 text-sm">Your security posture is strong</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeAnomalies.map((anomaly) => (
                    <div
                      key={anomaly.id}
                      className={`p-3 rounded-lg border transition-colors hover:border-gray-600 ${
                        severityConfig[anomaly.severity as keyof typeof severityConfig]?.bgColor || 
                        'bg-gray-800/50 border-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge 
                              variant={severityConfig[anomaly.severity as keyof typeof severityConfig]?.variant || 'default'}
                              className="text-xs"
                            >
                              {anomaly.severity}
                            </Badge>
                            <span className="text-xs text-gray-400 font-mono">{anomaly.type}</span>
                          </div>
                          <h4 className="text-sm font-medium text-white mb-1">
                            {anomaly.description}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <ClockIcon className="h-3 w-3" />
                            {formatDistanceToNow(new Date(anomaly.timestamp))} ago
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Recent Logs */}
        <div className="xl:col-span-1">
          <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-600">
            <div className="p-6 border-b border-gray-600 bg-gradient-to-r from-gray-800/80 to-gray-700/80">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <DocumentTextIcon className="h-6 w-6 text-orange-400" />
                  Critical Logs
                </h2>
                <Badge variant="error" className="text-xs">
                  {criticalLogs.length} Critical
                </Badge>
              </div>
            </div>
            <div className="p-6 bg-gray-900/30">
              {criticalLogs.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircleIcon className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Critical Logs</h3>
                  <p className="text-gray-400 text-sm">System is running smoothly</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {criticalLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge 
                              variant={log.level === 'critical' ? 'error' : 'warning'}
                              className="text-xs"
                            >
                              {log.level}
                            </Badge>
                            <span className="text-xs text-gray-400">{log.source}</span>
                          </div>
                          <p className="text-sm text-white mb-1 line-clamp-2">
                            {log.message}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <ClockIcon className="h-3 w-3" />
                            {formatDistanceToNow(new Date(log.timestamp))} ago
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* System Status */}
        <div className="xl:col-span-1">
          <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-600">
            <div className="p-6 border-b border-gray-600 bg-gradient-to-r from-gray-800/80 to-gray-700/80">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <CpuChipIcon className="h-6 w-6 text-green-400" />
                System Performance
              </h2>
            </div>
            <div className="p-6 bg-gray-900/30">
              <div className="space-y-4">
                {/* Network Performance */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Network Latency</span>
                    <span className="text-sm text-white font-medium">
                      {networkMetrics?.averageLatency?.toFixed(1) || '0.0'}ms
                    </span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-400 transition-all duration-1000"
                      style={{ width: '15%' }}
                    />
                  </div>
                </div>

                {/* Bandwidth Usage */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Bandwidth Usage</span>
                    <span className="text-sm text-white font-medium">
                      {networkMetrics?.bandwidthUsage?.toFixed(1) || '0.0'} Mbps
                    </span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-400 transition-all duration-1000"
                      style={{ width: '45%' }}
                    />
                  </div>
                </div>

                {/* Security Scans */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Security Coverage</span>
                    <span className="text-sm text-white font-medium">
                      {securityScore}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${
                        securityScore >= 80 ? 'bg-green-400' :
                        securityScore >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${securityScore}%` }}
                    />
                  </div>
                </div>

                {/* Threat Detection */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Threat Detection</span>
                    <span className="text-sm text-white font-medium">Active</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-400 transition-all duration-1000"
                      style={{ width: '92%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-6 pt-4 border-t border-gray-700">
                <h3 className="text-sm font-medium text-white mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" size="sm" className="text-xs">
                    <ShieldCheckIcon className="h-3 w-3 mr-1" />
                    Security Scan
                  </Button>
                  <Button variant="secondary" size="sm" className="text-xs">
                    <GlobeAltIcon className="h-3 w-3 mr-1" />
                    Network Scan
                  </Button>
                  <Button variant="secondary" size="sm" className="text-xs">
                    <DocumentTextIcon className="h-3 w-3 mr-1" />
                    Export Logs
                  </Button>
                  <Button variant="secondary" size="sm" className="text-xs">
                    <ChartBarIcon className="h-3 w-3 mr-1" />
                    View Reports
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Activity Timeline */}
      <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-600">
        <div className="p-6 border-b border-gray-600 bg-gradient-to-r from-gray-800/80 to-gray-700/80">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <ClockIcon className="h-6 w-6 text-purple-400" />
            Recent Activity
          </h2>
        </div>
        <div className="p-6 bg-gray-900/30">
          <div className="space-y-4">
            {/* Combine recent logs and anomalies for timeline */}
            {[
              ...criticalLogs.map(log => ({
                id: log.id,
                type: 'log',
                title: log.message,
                subtitle: `${log.level} from ${log.source}`,
                timestamp: log.timestamp,
                severity: log.level,
                icon: DocumentTextIcon
              })),
              ...activeAnomalies.map(anomaly => ({
                id: anomaly.id,
                type: 'anomaly',
                title: anomaly.description,
                subtitle: `${anomaly.severity} ${anomaly.type} anomaly`,
                timestamp: anomaly.timestamp,
                severity: anomaly.severity,
                icon: BugAntIcon
              }))
            ]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 5)
            .map((item, index) => (
              <div key={item.id} className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    item.severity === 'critical' || item.severity === 'error' ? 'bg-red-400/20' :
                    item.severity === 'high' || item.severity === 'warning' ? 'bg-yellow-400/20' :
                    'bg-blue-400/20'
                  }`}>
                    <item.icon className={`h-4 w-4 ${
                      item.severity === 'critical' || item.severity === 'error' ? 'text-red-400' :
                      item.severity === 'high' || item.severity === 'warning' ? 'text-yellow-400' :
                      'text-blue-400'
                    }`} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{item.title}</p>
                  <p className="text-xs text-gray-400">{item.subtitle}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(item.timestamp))} ago
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Badge 
                    variant={
                      item.severity === 'critical' || item.severity === 'error' ? 'error' :
                      item.severity === 'high' || item.severity === 'warning' ? 'warning' :
                      'default'
                    }
                    className="text-xs"
                  >
                    {item.severity}
                  </Badge>
                </div>
              </div>
            ))}
            
            {criticalLogs.length === 0 && activeAnomalies.length === 0 && (
              <div className="text-center py-8">
                <CheckCircleIcon className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Recent Activity</h3>
                <p className="text-gray-400 text-sm">All systems are operating normally</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
} 