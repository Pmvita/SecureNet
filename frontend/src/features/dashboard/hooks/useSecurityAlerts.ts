import { useMemo, useState } from 'react';
import { useSecurity } from '../../security/api/useSecurity';
import { useAnomalies, type Anomaly } from '../../anomalies/api/useAnomalies';
import { useLogs } from '../../logs/api/useLogs';
import { useNetwork, type NetworkDevice } from '../../network/api/useNetwork';
import type { SecurityAlert } from '../components/SecurityAlertsDropdown';

// Log entry type from the API
interface LogEntry {
  id: string;
  level: string;
  message: string;
  timestamp: string;
  source?: string;
  component?: string;
}

export function useSecurityAlerts() {
  const [readAlerts, setReadAlerts] = useState<Set<string>>(new Set());
  
  // Fetch data from different sources
  const { recentFindings, metrics: securityMetrics } = useSecurity();
  const { anomalies } = useAnomalies();
  const { data: logsData } = useLogs({ page: 1, pageSize: 50 });
  const { devices } = useNetwork();

  // Transform security findings into alerts
  const securityAlerts = useMemo(() => {
    return (recentFindings || []).map(finding => ({
      id: `security-${finding.id}`,
      title: `Security Vulnerability Detected`,
      description: finding.description || 'A security vulnerability has been identified in your system.',
      severity: (finding.severity?.toLowerCase() as 'critical' | 'high' | 'medium' | 'low') || 'medium',
      category: 'vulnerability' as const,
      timestamp: finding.timestamp || new Date().toISOString(),
      read: readAlerts.has(`security-${finding.id}`),
      source: 'Security Scanner',
      affectedAssets: ['Unknown Asset'], // Using a default since asset property doesn't exist
    }));
  }, [recentFindings, readAlerts]);

  // Transform anomalies into alerts
  const anomalyAlerts = useMemo(() => {
    return anomalies
      .filter((anomaly: Anomaly) => anomaly.status === 'active')
      .map((anomaly: Anomaly) => ({
        id: `anomaly-${anomaly.id}`,
        title: `${anomaly.type.charAt(0).toUpperCase() + anomaly.type.slice(1)} Anomaly Detected`,
        description: anomaly.description || 'An unusual pattern has been detected in system behavior.',
        severity: (anomaly.severity?.toLowerCase() as 'critical' | 'high' | 'medium' | 'low') || 'medium',
        category: 'anomaly' as const,
        timestamp: anomaly.timestamp || new Date().toISOString(),
        read: readAlerts.has(`anomaly-${anomaly.id}`),
        source: 'Anomaly Detection System',
        affectedAssets: [], // Not available in the anomaly type
      }));
  }, [anomalies, readAlerts]);

  // Transform critical logs into alerts
  const logAlerts = useMemo(() => {
    const criticalLogs = (logsData?.logs || []).filter(
      (log: LogEntry) => log.level === 'error' || log.level === 'critical'
    );
    
    return criticalLogs.slice(0, 10).map((log: LogEntry) => ({
      id: `log-${log.id}`,
      title: `System ${log.level === 'critical' ? 'Critical' : 'Error'} Event`,
      description: log.message || 'A critical system event has been logged.',
      severity: log.level === 'critical' ? 'critical' as const : 'high' as const,
      category: 'system' as const,
      timestamp: log.timestamp || new Date().toISOString(),
      read: readAlerts.has(`log-${log.id}`),
      source: log.source || 'System Logs',
      affectedAssets: log.component ? [log.component] : [],
    }));
  }, [logsData?.logs, readAlerts]);

  // Transform network device issues into alerts
  const networkAlerts = useMemo(() => {
    const problematicDevices = devices.filter(
      (device: NetworkDevice) => device.status === 'offline' || device.status === 'warning'
    );
    
    return problematicDevices.map((device: NetworkDevice) => ({
      id: `network-${device.id}`,
      title: `Network Device ${device.status === 'offline' ? 'Offline' : 'Warning'}`,
      description: `Device ${device.name} (${device.ipAddress || 'Unknown IP'}) is currently ${device.status}.`,
      severity: device.status === 'offline' ? 'high' as const : 'medium' as const,
      category: 'network' as const,
      timestamp: device.lastSeen || new Date().toISOString(),
      read: readAlerts.has(`network-${device.id}`),
      source: 'Network Monitor',
      affectedAssets: [device.name, device.ipAddress || 'Unknown IP'],
    }));
  }, [devices, readAlerts]);

  // Generate compliance alerts based on security metrics
  const complianceAlerts = useMemo(() => {
    const alerts: SecurityAlert[] = [];
    
    if (securityMetrics?.security_score && securityMetrics.security_score < 70) {
      alerts.push({
        id: 'compliance-score',
        title: 'Security Score Below Threshold',
        description: `Current security score (${securityMetrics.security_score}%) is below the recommended threshold of 70%.`,
        severity: securityMetrics.security_score < 50 ? 'critical' : 'high',
        category: 'compliance',
        timestamp: new Date().toISOString(),
        read: readAlerts.has('compliance-score'),
        source: 'Compliance Monitor',
        affectedAssets: ['Security Infrastructure'],
      });
    }

    if (securityMetrics?.critical_findings && securityMetrics.critical_findings > 0) {
      alerts.push({
        id: 'compliance-critical',
        title: 'Critical Security Findings',
        description: `${securityMetrics.critical_findings} critical security findings require immediate attention.`,
        severity: 'critical',
        category: 'compliance',
        timestamp: new Date().toISOString(),
        read: readAlerts.has('compliance-critical'),
        source: 'Security Audit',
        affectedAssets: ['Security Infrastructure'],
      });
    }

    return alerts;
  }, [securityMetrics, readAlerts]);

  // Combine all alerts and sort by priority and timestamp
  const allAlerts = useMemo(() => {
    const combined = [
      ...securityAlerts,
      ...anomalyAlerts,
      ...logAlerts,
      ...networkAlerts,
      ...complianceAlerts,
    ];

    // Sort by severity priority and then by timestamp (newest first)
    const severityOrder: Record<'critical' | 'high' | 'medium' | 'low', number> = { 
      critical: 0, 
      high: 1, 
      medium: 2, 
      low: 3 
    };
    
    return combined.sort((a, b) => {
      // First sort by read status (unread first)
      if (a.read !== b.read) {
        return a.read ? 1 : -1;
      }
      
      // Then by severity
      const aSeverity = a.severity as keyof typeof severityOrder;
      const bSeverity = b.severity as keyof typeof severityOrder;
      const severityDiff = severityOrder[aSeverity] - severityOrder[bSeverity];
      if (severityDiff !== 0) {
        return severityDiff;
      }
      
      // Finally by timestamp (newest first)
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [securityAlerts, anomalyAlerts, logAlerts, networkAlerts, complianceAlerts]);

  // Alert management functions
  const markAsRead = (alertId: string) => {
    setReadAlerts(prev => new Set([...prev, alertId]));
  };

  const markAllAsRead = () => {
    const allAlertIds = allAlerts.map(alert => alert.id);
    setReadAlerts(new Set(allAlertIds));
  };

  const markAsUnread = (alertId: string) => {
    setReadAlerts(prev => {
      const newSet = new Set(prev);
      newSet.delete(alertId);
      return newSet;
    });
  };

  // Statistics
  const alertStats = useMemo(() => ({
    total: allAlerts.length,
    unread: allAlerts.filter(alert => !alert.read).length,
    critical: allAlerts.filter(alert => alert.severity === 'critical').length,
    high: allAlerts.filter(alert => alert.severity === 'high').length,
    medium: allAlerts.filter(alert => alert.severity === 'medium').length,
    low: allAlerts.filter(alert => alert.severity === 'low').length,
    byCategory: {
      threat: allAlerts.filter(alert => alert.category === 'threat').length,
      vulnerability: allAlerts.filter(alert => alert.category === 'vulnerability').length,
      anomaly: allAlerts.filter(alert => alert.category === 'anomaly').length,
      compliance: allAlerts.filter(alert => alert.category === 'compliance').length,
      network: allAlerts.filter(alert => alert.category === 'network').length,
      system: allAlerts.filter(alert => alert.category === 'system').length,
    },
  }), [allAlerts]);

  return {
    alerts: allAlerts,
    stats: alertStats,
    markAsRead,
    markAllAsRead,
    markAsUnread,
    isLoading: false, // Could be enhanced to track loading states from individual hooks
  };
} 