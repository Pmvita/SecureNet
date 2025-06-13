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
  CheckIcon,
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
        {/* Security Alerts */}
        <div className="xl:col-span-1">
          <Card className="bg-gradient-to-br from-red-950/20 to-gray-900/50 border-red-900/30 hover:border-red-800/50 transition-all duration-300">
            <div className="p-6 border-b border-red-900/30 bg-gradient-to-r from-red-950/30 to-gray-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/20 border border-red-500/30">
                    <ShieldExclamationIcon className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Security Alerts</h2>
                    <p className="text-xs text-red-200/70">Real-time threat monitoring</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeAnomalies.length > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-red-300 font-medium">ACTIVE</span>
                    </div>
                  )}
                  <Badge 
                    variant={activeAnomalies.length > 0 ? "error" : "success"} 
                    className="text-xs font-semibold px-3 py-1"
                  >
                    {activeAnomalies.length} {activeAnomalies.length === 1 ? 'Alert' : 'Alerts'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="p-6 bg-gray-900/20">
              {activeAnomalies.length === 0 ? (
                <div className="text-center py-12">
                  <div className="relative">
                    <CheckCircleIcon className="h-16 w-16 text-green-400 mx-auto mb-4 drop-shadow-lg" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckIcon className="h-3 w-3 text-white" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">All Clear</h3>
                  <p className="text-gray-400 text-sm max-w-xs mx-auto">No active security threats detected. Your systems are secure.</p>
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Security posture: Strong</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeAnomalies.map((anomaly, index) => (
                    <div
                      key={anomaly.id}
                      className={`group relative overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-lg ${
                        anomaly.severity === 'critical' 
                          ? 'bg-gradient-to-r from-red-500/10 to-red-600/5 border-red-500/30 hover:border-red-400/50 hover:shadow-red-500/20' 
                          : anomaly.severity === 'high'
                          ? 'bg-gradient-to-r from-orange-500/10 to-orange-600/5 border-orange-500/30 hover:border-orange-400/50 hover:shadow-orange-500/20'
                          : 'bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 border-yellow-500/30 hover:border-yellow-400/50 hover:shadow-yellow-500/20'
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-3">
                              <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                anomaly.severity === 'critical' 
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                                  : anomaly.severity === 'high'
                                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                  : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                              }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${
                                  anomaly.severity === 'critical' ? 'bg-red-400' : 
                                  anomaly.severity === 'high' ? 'bg-orange-400' : 'bg-yellow-400'
                                }`} />
                                {anomaly.severity.toUpperCase()}
                              </div>
                              <div className="px-2 py-1 bg-gray-700/50 rounded-md">
                                <span className="text-xs text-gray-300 font-mono">{anomaly.type}</span>
                              </div>
                            </div>
                            <h4 className="text-sm font-medium text-white mb-2 leading-relaxed">
                              {anomaly.description}
                            </h4>
                            <div className="flex items-center gap-4 text-xs text-gray-400">
                              <div className="flex items-center gap-1.5">
                                <ClockIcon className="h-3.5 w-3.5" />
                                <span>{formatDistanceToNow(new Date(anomaly.timestamp))} ago</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-1 h-1 bg-gray-500 rounded-full" />
                                <span>ID: {anomaly.id.toString().slice(-6)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 transition-colors group/btn">
                              <EyeIcon className="h-4 w-4 text-gray-400 group-hover/btn:text-white transition-colors" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 pt-4 border-t border-gray-700/50">
                    <button className="w-full text-xs text-gray-400 hover:text-white transition-colors py-2 rounded-lg hover:bg-gray-800/50">
                      View All Security Alerts →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Critical Logs */}
        <div className="xl:col-span-1">
          <Card className="bg-gradient-to-br from-orange-950/20 to-gray-900/50 border-orange-900/30 hover:border-orange-800/50 transition-all duration-300">
            <div className="p-6 border-b border-orange-900/30 bg-gradient-to-r from-orange-950/30 to-gray-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/20 border border-orange-500/30">
                    <DocumentTextIcon className="h-5 w-5 text-orange-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Critical Logs</h2>
                    <p className="text-xs text-orange-200/70">System error monitoring</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {criticalLogs.length > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-orange-300 font-medium">CRITICAL</span>
                    </div>
                  )}
                  <Badge 
                    variant={criticalLogs.length > 0 ? "error" : "success"} 
                    className="text-xs font-semibold px-3 py-1"
                  >
                    {criticalLogs.length} {criticalLogs.length === 1 ? 'Log' : 'Logs'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="p-6 bg-gray-900/20">
              {criticalLogs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="relative">
                    <CheckCircleIcon className="h-16 w-16 text-green-400 mx-auto mb-4 drop-shadow-lg" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckIcon className="h-3 w-3 text-white" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">All Systems Normal</h3>
                  <p className="text-gray-400 text-sm max-w-xs mx-auto">No critical errors detected. All services are operating within normal parameters.</p>
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>System health: Excellent</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {criticalLogs.map((log: LogEntry, index: number) => (
                    <div
                      key={log.id}
                      className={`group relative overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-lg ${
                        log.level === 'critical' 
                          ? 'bg-gradient-to-r from-red-500/10 to-red-600/5 border-red-500/30 hover:border-red-400/50 hover:shadow-red-500/20' 
                          : 'bg-gradient-to-r from-orange-500/10 to-orange-600/5 border-orange-500/30 hover:border-orange-400/50 hover:shadow-orange-500/20'
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-3">
                              <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                log.level === 'critical' 
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                                  : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                              }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${
                                  log.level === 'critical' ? 'bg-red-400' : 'bg-orange-400'
                                }`} />
                                {log.level.toUpperCase()}
                              </div>
                              <div className="px-2 py-1 bg-gray-700/50 rounded-md">
                                <span className="text-xs text-gray-300 font-mono">{log.source}</span>
                              </div>
                            </div>
                            <p className="text-sm font-medium text-white mb-2 leading-relaxed line-clamp-2">
                              {log.message}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-400">
                              <div className="flex items-center gap-1.5">
                                <ClockIcon className="h-3.5 w-3.5" />
                                <span>{formatDistanceToNow(new Date(log.timestamp))} ago</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-1 h-1 bg-gray-500 rounded-full" />
                                <span>ID: {log.id.toString().slice(-6)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 transition-colors group/btn">
                              <EyeIcon className="h-4 w-4 text-gray-400 group-hover/btn:text-white transition-colors" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 pt-4 border-t border-gray-700/50">
                    <button className="w-full text-xs text-gray-400 hover:text-white transition-colors py-2 rounded-lg hover:bg-gray-800/50">
                      View All System Logs →
                    </button>
                  </div>
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
                <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                  <FireIcon className="h-4 w-4 text-orange-400" />
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  {/* Security Scan */}
                  <button className="w-full group relative overflow-hidden rounded-lg bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/20 hover:border-red-400/40 transition-all duration-200 hover:shadow-lg hover:shadow-red-500/10">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    <div className="relative p-3 flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                        <ShieldCheckIcon className="h-4 w-4 text-red-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-white group-hover:text-red-100 transition-colors">Security Scan</div>
                        <div className="text-xs text-gray-400 group-hover:text-red-200/70 transition-colors">Run comprehensive security analysis</div>
                      </div>
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                          <ArrowPathIcon className="h-3 w-3 text-red-400" />
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Network Scan */}
                  <button className="w-full group relative overflow-hidden rounded-lg bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20 hover:border-blue-400/40 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/10">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    <div className="relative p-3 flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                        <GlobeAltIcon className="h-4 w-4 text-blue-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-white group-hover:text-blue-100 transition-colors">Network Scan</div>
                        <div className="text-xs text-gray-400 group-hover:text-blue-200/70 transition-colors">Discover network devices and topology</div>
                      </div>
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <WifiIcon className="h-3 w-3 text-blue-400" />
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Export Logs */}
                  <button className="w-full group relative overflow-hidden rounded-lg bg-gradient-to-r from-green-500/10 to-green-600/10 border border-green-500/20 hover:border-green-400/40 transition-all duration-200 hover:shadow-lg hover:shadow-green-500/10">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    <div className="relative p-3 flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                        <DocumentTextIcon className="h-4 w-4 text-green-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-white group-hover:text-green-100 transition-colors">Export Logs</div>
                        <div className="text-xs text-gray-400 group-hover:text-green-200/70 transition-colors">Download system logs and reports</div>
                      </div>
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                          <ArrowPathIcon className="h-3 w-3 text-green-400 rotate-45" />
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* View Reports */}
                  <button className="w-full group relative overflow-hidden rounded-lg bg-gradient-to-r from-purple-500/10 to-purple-600/10 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/10">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    <div className="relative p-3 flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                        <ChartBarIcon className="h-4 w-4 text-purple-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-white group-hover:text-purple-100 transition-colors">View Reports</div>
                        <div className="text-xs text-gray-400 group-hover:text-purple-200/70 transition-colors">Access analytics and insights</div>
                      </div>
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <EyeIcon className="h-3 w-3 text-purple-400" />
                        </div>
                      </div>
                    </div>
                  </button>
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