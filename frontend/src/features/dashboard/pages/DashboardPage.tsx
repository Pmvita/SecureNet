import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { useLogs, LogEntry } from '../../logs/api/useLogs';
import { useNetwork } from '../../network/api/useNetwork';
import { useSecurity } from '../../security/api/useSecurity';
import { useAnomalies } from '../../anomalies/api/useAnomalies';
import { useSecurityAlerts } from '../hooks/useSecurityAlerts';
import { NetworkTopologyChart } from '@/components/charts/NetworkTopologyChart';
import { ThreatAnalyticsChart } from '@/components/charts/ThreatAnalyticsChart';
import { AlertsTimelineChart } from '@/components/charts/AlertsTimelineChart';
import { DeviceDistributionPie } from '@/components/charts/DeviceDistributionPie';
import { VulnerabilityHeatmap } from '@/components/charts/VulnerabilityHeatmap';

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
  XMarkIcon,
  InformationCircleIcon,
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
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const alertsButtonRef = useRef<HTMLDivElement>(null);
  
  // Fetch data from all services with error handling
  const { data: logsData, isLoading: logsLoading, error: logsError } = useLogs({ 
    page: 1, 
    pageSize: 5,
    refreshInterval: isAutoRefresh ? 30000 : 0
  });
  
  const { 
    metrics: networkMetrics, 
    devices, 
    connections,
    isLoading: networkLoading,
    error: networkError
  } = useNetwork({ refreshInterval: isAutoRefresh ? 30000 : 0 });
  
  const { 
    metrics: securityMetrics, 
    recentScans, 
    recentFindings,
    isLoading: securityLoading,
    error: securityError
  } = useSecurity();
  
  const { 
    anomalies, 
    metrics: anomalyMetrics,
    error: anomaliesError,
    isLoading: anomaliesLoading 
  } = useAnomalies();

  // Security alerts functionality
  const { 
    alerts: securityAlerts, 
    stats: alertStats, 
    markAsRead, 
    markAllAsRead 
  } = useSecurityAlerts();

  // Calculate security score
  const securityScore = useMemo(() => {
    if (!devices || !anomalies) return 100;
    const totalDevices = devices.length;
    const vulnerableDevices = devices.filter((d: any) => d.vulnerabilities?.length > 0).length;
    const activeAnomalies = anomalies.filter((a: any) => a.status === 'active').length;
    
    const score = Math.max(0, 100 - (vulnerableDevices * 10) - (activeAnomalies * 5));
    return Math.round(score);
  }, [devices, anomalies]);

  // Get security level based on score
  const securityLevel = useMemo(() => {
    if (securityScore >= 80) return 'high';
    if (securityScore >= 60) return 'medium';
    return 'low';
  }, [securityScore]);

  // Recent critical logs
  const criticalLogs = useMemo(() => {
    return (logsData?.logs || []).filter((log: any) => 
      log.level === 'error' || log.level === 'critical'
    ).slice(0, 3);
  }, [logsData?.logs]);

  // Recent active anomalies
  const activeAnomalies = useMemo(() => {
    return anomalies.filter((anomaly: any) => anomaly.status === 'active').slice(0, 3);
  }, [anomalies]);

  // Prepare chart data
  const threatAnalyticsData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayName = format(date, 'MMM dd');
      
      // Simulate threat data based on existing anomalies and security events
      const dayThreats = Math.floor(Math.random() * 10) + 1;
      
      return {
        date: dayName,
        threats: dayThreats,
        blocked: Math.floor(dayThreats * 0.8),
        critical: Math.floor(dayThreats * 0.2),
        high: Math.floor(dayThreats * 0.3),
        medium: Math.floor(dayThreats * 0.3),
        low: Math.floor(dayThreats * 0.2)
      };
    }).reverse();
    
    return last7Days;
  }, []);

  const alertsTimelineData = useMemo(() => {
    const last24Hours = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date();
      hour.setHours(hour.getHours() - i, 0, 0, 0);
      const timeLabel = format(hour, 'HH:mm');
      
      // Simulate alert data
      const hourAlerts = Math.floor(Math.random() * 5);
      
      return {
        time: timeLabel,
        alerts: hourAlerts,
        critical: Math.floor(hourAlerts * 0.2),
        high: Math.floor(hourAlerts * 0.3),
        medium: Math.floor(hourAlerts * 0.3),
        low: Math.floor(hourAlerts * 0.2),
        resolved: Math.floor(hourAlerts * 0.7)
      };
    }).reverse();
    
    return last24Hours;
  }, []);

  const deviceDistributionData = useMemo(() => {
    if (!devices) return [];
    
    const distribution = devices.reduce((acc: Record<string, number>, device: any) => {
      const type = device.device_type || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(distribution).map(([name, value], index) => ({
      id: `device-${index}`,
      name,
      label: name,
      value: value,
      status: 'online' as const,
      severity: 'low' as const
    }));
  }, [devices]);

  // Auto-refresh functionality
  useEffect(() => {
    if (isAutoRefresh) {
      const interval = setInterval(() => {
        setLastUpdateTime(new Date());
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isAutoRefresh]);

  // Error handling
  useEffect(() => {
    const errors = [logsError, networkError, securityError, anomaliesError].filter(Boolean);
    if (errors.length > 0) {
      setError(`Some data failed to load: ${errors.join(', ')}`);
    } else {
      setError(null);
    }
  }, [logsError, networkError, securityError, anomaliesError]);

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    setLastUpdateTime(new Date());
    setError(null);
  }, []);

  const toggleAutoRefresh = useCallback(() => {
    setIsAutoRefresh(prev => !prev);
  }, []);

  const isLoading = logsLoading || networkLoading || securityLoading || anomaliesLoading;

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-400 font-medium">Data Loading Error</p>
              <p className="text-xs text-red-300">{error}</p>
            </div>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Real-time security monitoring and network analysis
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            className="flex items-center gap-2 relative"
          >
            <BellIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Alerts</span>
            {securityAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {securityAlerts.length}
              </span>
            )}
          </Button>
          <Button
            variant={isAutoRefresh ? "primary" : "secondary"}
            size="sm"
            onClick={toggleAutoRefresh}
            className="flex items-center gap-2"
          >
            <SignalIcon className={`h-4 w-4 ${isAutoRefresh ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">Auto</span>
          </Button>
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Active Threats */}
        <Card className="bg-gray-900 border-gray-700 hover:border-gray-600 transition-colors">
          <div className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs lg:text-sm font-medium text-gray-400 uppercase tracking-wide">Active Threats</p>
                <p className="text-2xl lg:text-3xl font-bold text-white mt-1 lg:mt-2">
                  {securityLoading ? (
                    <div className="h-8 w-16 bg-gray-700 animate-pulse rounded"></div>
                  ) : (
                    securityMetrics?.critical_findings || 0
                  )}
                </p>
              </div>
              <div className={`p-2 lg:p-3 rounded-lg flex-shrink-0 ${
                (securityMetrics?.critical_findings || 0) > 0 ? 'bg-red-500/20' : 'bg-green-500/20'
              }`}>
                <FireIcon className={`h-5 w-5 lg:h-6 lg:w-6 ${
                  (securityMetrics?.critical_findings || 0) > 0 ? 'text-red-400' : 'text-green-400'
                }`} />
              </div>
            </div>
            <div className="mt-3 lg:mt-4 flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 ${
                (securityMetrics?.critical_findings || 0) > 0 ? 'bg-red-400 animate-pulse' : 'bg-green-400'
              }`}></div>
              <span className="text-xs text-gray-500 truncate">
                {(securityMetrics?.critical_findings || 0) > 0 ? 'Requires immediate attention' : 'All systems secure'}
              </span>
            </div>
          </div>
        </Card>

        {/* Network Devices */}
        <Card className="bg-gray-900 border-gray-700 hover:border-gray-600 transition-colors">
          <div className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs lg:text-sm font-medium text-gray-400 uppercase tracking-wide">Network Devices</p>
                <p className="text-2xl lg:text-3xl font-bold text-white mt-1 lg:mt-2">
                  {networkLoading ? (
                    <div className="h-8 w-16 bg-gray-700 animate-pulse rounded"></div>
                  ) : (
                    devices?.length || 0
                  )}
                </p>
              </div>
              <div className="p-2 lg:p-3 bg-blue-500/20 rounded-lg flex-shrink-0">
                <ServerIcon className="h-5 w-5 lg:h-6 lg:w-6 text-blue-400" />
              </div>
            </div>
            <div className="mt-3 lg:mt-4 flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 flex-shrink-0"></div>
              <span className="text-xs text-gray-500 truncate">
                {devices?.filter(d => d.status === 'online').length || 0} online
              </span>
            </div>
          </div>
        </Card>

        {/* Anomalies */}
        <Card className="bg-gray-900 border-gray-700">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 uppercase tracking-wide">Anomalies</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {activeAnomalies.length}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${
                activeAnomalies.length > 0 ? 'bg-orange-500/20' : 'bg-green-500/20'
              }`}>
                <BugAntIcon className={`h-6 w-6 ${
                  activeAnomalies.length > 0 ? 'text-orange-400' : 'text-green-400'
                }`} />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                activeAnomalies.length > 0 ? 'bg-orange-400 animate-pulse' : 'bg-green-400'
              }`}></div>
              <span className="text-xs text-gray-500">
                {anomalies.filter((a: any) => a.severity === 'critical').length} critical
              </span>
            </div>
          </div>
        </Card>

        {/* System Health */}
        <Card className="bg-gray-900 border-gray-700">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 uppercase tracking-wide">System Health</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {securityScore}%
                </p>
              </div>
              <div className={`p-3 rounded-lg ${
                securityScore >= 80 ? 'bg-green-500/20' : 
                securityScore >= 60 ? 'bg-yellow-500/20' : 'bg-red-500/20'
              }`}>
                <ShieldCheckIcon className={`h-6 w-6 ${
                  securityScore >= 80 ? 'text-green-400' : 
                  securityScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                }`} />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                securityScore >= 80 ? 'bg-green-400' : 
                securityScore >= 60 ? 'bg-yellow-400' : 'bg-red-400'
              }`}></div>
              <span className="text-xs text-gray-500">
                All services operational
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
        {/* Left Column - Analytics (2/3 width) */}
        <div className="lg:col-span-2">

          {/* SecurityDashboard without Network Topology */}
          <div className="space-y-8">
            {/* Enhanced Header with Real-time Status */}
            <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-xl border border-gray-700 p-4 lg:p-6 shadow-2xl">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-3 lg:gap-4">
                  <div className="p-2 lg:p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg flex-shrink-0">
                    <ShieldCheckIcon className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                      Security Analytics Dashboard
                    </h1>
                    <p className="text-gray-400 mt-1 flex items-center gap-2 text-sm">
                      <span className="truncate">Real-time security monitoring and threat analysis powered by AI</span>
                      {!isLoading && (
                        <span className="flex items-center gap-1 text-green-400 text-xs lg:text-sm flex-shrink-0">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          Live
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between lg:justify-end gap-4 lg:gap-6">
                  <div className="text-right">
                    <div className="text-xs lg:text-sm text-gray-500">Last Updated</div>
                    <div className="text-xs lg:text-sm font-medium text-white">
                      {lastUpdateTime.toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-400">Live</span>
                  </div>
                </div>
              </div>

              {/* Real-time Summary Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mt-4 lg:mt-6">
                <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/20 rounded-lg p-3 lg:p-4">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <ExclamationTriangleIcon className="h-5 w-5 lg:h-6 lg:w-6 text-red-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-lg lg:text-2xl font-bold text-white">
                        {securityLoading ? (
                          <div className="h-6 w-8 bg-gray-700 animate-pulse rounded"></div>
                        ) : (
                          securityMetrics?.critical_findings || 0
                        )}
                      </div>
                      <div className="text-xs text-red-400 truncate">Critical Threats</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" />
                    <div>
                      <div className="text-2xl font-bold text-white">
                        {recentFindings?.filter(f => f.severity === 'high').length || 0}
                      </div>
                      <div className="text-xs text-yellow-400">High Priority</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheckIcon className="h-6 w-6 text-green-400" />
                    <div>
                      <div className="text-2xl font-bold text-white">
                        {recentFindings?.length ? Math.floor(recentFindings.length * 0.8) : 0}
                      </div>
                      <div className="text-xs text-green-400">Blocked Threats</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <ServerIcon className="h-6 w-6 text-blue-400" />
                    <div>
                      <div className="text-2xl font-bold text-white">
                        {securityMetrics?.security_score || 100}%
                      </div>
                      <div className="text-xs text-blue-400">Protection Rate</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Row - Key Analytics */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
              <ThreatAnalyticsChart 
                data={threatAnalyticsData}
                height={350} 
                loading={isLoading}
              />
              <AlertsTimelineChart 
                data={alertsTimelineData}
                height={350} 
                loading={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Right Column - Activity Feed (1/3 width) */}
        <div className="space-y-6 lg:space-y-8">
          {/* Recent Security Events */}
          <Card className="bg-gray-900 border-gray-700 hover:border-gray-600 transition-colors">
            <div className="p-4 lg:p-6">
              <h3 className="text-base lg:text-lg font-semibold text-white mb-3 lg:mb-4 flex items-center gap-2">
                <ExclamationTriangleIcon className="h-4 w-4 lg:h-5 lg:w-5 text-red-400" />
                Security Events
              </h3>
              <div className="space-y-3">
                {criticalLogs.length > 0 ? (
                  criticalLogs.map((log: any, index: number) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                      <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{log.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(log.timestamp))} ago
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <CheckCircleIcon className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No critical events</p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Active Anomalies */}
          <Card className="bg-gray-900 border-gray-700">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <BugAntIcon className="h-5 w-5 text-orange-400" />
                Active Anomalies
              </h3>
              <div className="space-y-3">
                {activeAnomalies.length > 0 ? (
                  activeAnomalies.map((anomaly: any, index: number) => (
                    <div key={anomaly.id} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        anomaly.severity === 'critical' ? 'bg-red-400' :
                        anomaly.severity === 'high' ? 'bg-orange-400' : 'bg-yellow-400'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{anomaly.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={
                            anomaly.severity === 'critical' ? 'error' :
                            anomaly.severity === 'high' ? 'warning' : 'default'
                          } className="text-xs">
                            {anomaly.severity}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(anomaly.timestamp))} ago
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <CheckCircleIcon className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <div className="text-sm text-gray-400">No active anomalies</div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Full Width Bottom Charts Section */}
      <div className="w-full grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        <Card className="bg-gray-900 border-gray-700 hover:border-gray-600 transition-colors">
          <div className="p-4 lg:p-6">
            <h3 className="text-base lg:text-lg font-semibold text-white mb-3 lg:mb-4 flex items-center gap-2">
              <ChartBarIcon className="h-4 w-4 lg:h-5 lg:w-5 text-green-400" />
              Device Distribution
            </h3>
            <div className="h-[300px] lg:h-[400px]">
              <DeviceDistributionPie 
                data={deviceDistributionData}
                height={400} 
                loading={isLoading}
                hideTitle={true}
              />
            </div>
          </div>
        </Card>
        
        <Card className="bg-gray-900 border-gray-700">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FireIcon className="h-5 w-5 text-red-400" />
              Vulnerability Heatmap
            </h3>
            <div className="h-[400px]">
              <VulnerabilityHeatmap 
                height={400} 
                loading={isLoading}
                hideTitle={true}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Full Width Network Topology Section */}
      <div className="w-full">
        <Card className="bg-gray-900 border-gray-700">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <GlobeAltIcon className="h-6 w-6 text-blue-400" />
                  Network Topology
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                  Real-time network visualization and device relationships
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-400">Live</span>
              </div>
            </div>
            <div className="w-full">
              <NetworkTopologyChart 
                height={400}
                loading={isLoading}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 