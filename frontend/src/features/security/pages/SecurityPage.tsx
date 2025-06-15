import React, { useState, useMemo } from 'react';
import { useSecurity, type SecurityScan, type ThreatAlert } from '../api/useSecurity';
import { SecurityErrorBoundary } from '../../../components/error/SecurityErrorBoundary';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { useToast } from '@/hooks/useToast';
import { formatDistanceToNow, format } from 'date-fns';
import {
  ShieldCheckIcon,
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  BugAntIcon,
  EyeIcon,
  ArrowPathIcon,
  PlayIcon,
  PauseIcon,
  DocumentTextIcon,
  ServerIcon,
  GlobeAltIcon,
  ComputerDesktopIcon,
  LockClosedIcon,
  KeyIcon,
  UserIcon,
  ClockIcon,
  ChartBarIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { SecurityEventsGrid } from '@/components/grids/SecurityEventsGrid';

// Security level configurations
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

// Scan status configurations
const scanStatusConfig = {
  pending: { 
    variant: 'warning' as const, 
    icon: ClockIcon, 
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    label: 'Pending'
  },
  running: { 
    variant: 'info' as const, 
    icon: PlayIcon, 
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    label: 'Running'
  },
  completed: { 
    variant: 'success' as const, 
    icon: CheckCircleIcon, 
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    label: 'Completed'
  },
  failed: { 
    variant: 'error' as const, 
    icon: XCircleIcon, 
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    label: 'Failed'
  },
};

// Threat severity configurations
const severityConfig = {
  low: { 
    variant: 'info' as const, 
    icon: InformationCircleIcon, 
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    label: 'Low'
  },
  medium: { 
    variant: 'warning' as const, 
    icon: ExclamationTriangleIcon, 
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    label: 'Medium'
  },
  high: { 
    variant: 'error' as const, 
    icon: ExclamationCircleIcon, 
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10',
    label: 'High'
  },
  critical: { 
    variant: 'error' as const, 
    icon: ShieldExclamationIcon, 
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    label: 'Critical'
  },
};

// Scan type configurations
const scanTypeConfig = {
  'vulnerability': { icon: BugAntIcon, color: 'text-orange-400', label: 'Vulnerability Scan' },
  'malware': { icon: ShieldExclamationIcon, color: 'text-red-400', label: 'Malware Scan' },
  'network': { icon: GlobeAltIcon, color: 'text-blue-400', label: 'Network Scan' },
  'network_security': { icon: ShieldCheckIcon, color: 'text-blue-400', label: 'Network Security Scan' },
  'compliance': { icon: DocumentTextIcon, color: 'text-green-400', label: 'Compliance Check' },
  'penetration': { icon: UserIcon, color: 'text-purple-400', label: 'Penetration Test' },
  'firewall': { icon: ShieldCheckIcon, color: 'text-cyan-400', label: 'Firewall Analysis' },
};

// Target type configurations
const targetTypeConfig = {
  'endpoint': { icon: ComputerDesktopIcon, color: 'text-gray-400' },
  'server': { icon: ServerIcon, color: 'text-blue-400' },
  'network': { icon: GlobeAltIcon, color: 'text-green-400' },
  'database': { icon: ServerIcon, color: 'text-purple-400' },
  'application': { icon: DocumentTextIcon, color: 'text-orange-400' },
};

interface ThreatDetailsModalProps {
  threat: ThreatAlert | null;
  isOpen: boolean;
  onClose: () => void;
}

const ThreatDetailsModal: React.FC<ThreatDetailsModalProps> = ({ threat, isOpen, onClose }) => {
  if (!isOpen || !threat) return null;

  const severityConf = severityConfig[threat.severity];

  return (
    <SecurityErrorBoundary context="Threat Details Modal">
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${severityConf.bgColor}`}>
                  {React.createElement(severityConf.icon, {
                    className: `h-6 w-6 ${severityConf.color}`
                  })}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{threat.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={severityConf.variant} className="text-xs">
                      {severityConf.label}
                    </Badge>
                    <span className="text-sm text-gray-400">{threat.category}</span>
                    <span className="text-sm text-gray-400">
                      {format(new Date(threat.first_seen), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" onClick={onClose}>
                <XCircleIcon className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
              <div className="bg-gray-800 p-4 rounded-lg">
                <p className="text-gray-300">{threat.description}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Threat Information</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-400">Threat ID</span>
                    <div className="text-white font-mono">{threat.id}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Category</span>
                    <div className="text-white">{threat.category}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Source</span>
                    <div className="text-white">{threat.source}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Confidence</span>
                    <div className="text-white">{threat.confidence}%</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Timeline</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-400">First Seen</span>
                    <div className="text-white">{format(new Date(threat.first_seen), 'yyyy-MM-dd HH:mm:ss')}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Last Seen</span>
                    <div className="text-white">{format(new Date(threat.last_seen), 'yyyy-MM-dd HH:mm:ss')}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Status</span>
                    <div className="text-white capitalize">{threat.status}</div>
                  </div>
                </div>
              </div>
            </div>
            
            {threat.indicators && threat.indicators.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Indicators of Compromise</h3>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="space-y-2">
                    {threat.indicators.map((indicator, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-gray-300 font-mono">{indicator}</span>
                        <Badge variant="default" className="text-xs">IoC</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex gap-3">
              <Button variant="primary" className="flex-1">
                <DocumentTextIcon className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
              <Button variant="secondary" className="flex-1">
                <EyeIcon className="h-4 w-4 mr-2" />
                View Recommendations
              </Button>
            </div>
          </div>
        </div>
      </div>
    </SecurityErrorBoundary>
  );
};

interface ScanDetailsModalProps {
  scan: SecurityScan | null;
  isOpen: boolean;
  onClose: () => void;
}

const ScanDetailsModal: React.FC<ScanDetailsModalProps> = ({ scan, isOpen, onClose }) => {
  if (!isOpen || !scan) return null;

  const statusConf = scanStatusConfig[scan.status];
  const typeConf = scanTypeConfig[scan.type];

  return (
    <SecurityErrorBoundary context="Scan Details Modal">
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${typeConf.color.replace('text-', 'bg-').replace('-400', '-400/10')}`}>
                  {React.createElement(typeConf.icon, {
                    className: `h-6 w-6 ${typeConf.color}`
                  })}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{typeConf.label}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={statusConf.variant} className="text-xs">
                      {statusConf.label}
                    </Badge>
                    <span className="text-sm text-gray-400">{scan.target}</span>
                    <span className="text-sm text-gray-400">
                      {format(new Date(scan.created_at), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" onClick={onClose}>
                <XCircleIcon className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Scan Information</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-400">Scan ID</span>
                    <div className="text-white font-mono">{scan.id}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Type</span>
                    <div className="text-white">{typeConf.label}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Target</span>
                    <div className="text-white">{scan.target}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Status</span>
                    <div className="text-white">{statusConf.label}</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Results Summary</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-400">Critical Findings</span>
                    <div className="text-red-400 font-semibold">{scan.findings?.critical || 0}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">High Risk</span>
                    <div className="text-orange-400 font-semibold">{scan.findings?.high || 0}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Medium Risk</span>
                    <div className="text-yellow-400 font-semibold">{scan.findings?.medium || 0}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Low Risk</span>
                    <div className="text-blue-400 font-semibold">{scan.findings?.low || 0}</div>
                  </div>
                </div>
              </div>
            </div>
            
            {scan.status === 'running' && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Progress</h3>
                <Progress 
                  value={scan.progress || 0} 
                  className="w-full"
                  variant="primary"
                />
                <p className="text-sm text-gray-400 mt-1">
                  {scan.progress || 0}% complete
                </p>
              </div>
            )}
            
            <div className="flex gap-3">
              <Button variant="primary" className="flex-1">
                <DocumentTextIcon className="h-4 w-4 mr-2" />
                Export Results
              </Button>
              <Button variant="secondary" className="flex-1">
                <EyeIcon className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </div>
          </div>
        </div>
      </div>
    </SecurityErrorBoundary>
  );
};

export const SecurityPage: React.FC = () => {
  const [selectedThreat, setSelectedThreat] = useState<any>(null);
  const [showThreatDetails, setShowThreatDetails] = useState(false);
  const [selectedScan, setSelectedScan] = useState<any>(null);
  const [showScanDetails, setShowScanDetails] = useState(false);

  const {
    recentScans,
    recentFindings,
    metrics,
    isLoading,
    error,
    refetch,
    runScan,
    isScanning,
  } = useSecurity();

  const { toast } = useToast();

  // Create local variables for backward compatibility
  const threats = recentFindings || [];
  const scans = recentScans || [];
  const isStartingScan = isScanning;

  // Calculate security metrics
  const securityMetrics = useMemo(() => {
    const threats = recentFindings || [];
    const scans = recentScans || [];
    
    const activeThreats = threats.filter((threat: any) => threat.status === 'active');
    const criticalThreats = threats.filter((threat: any) => threat.severity === 'critical');
    const recentScansList = scans.filter((scan: any) => {
      const scanDate = new Date(scan.start_time || scan.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return scanDate >= weekAgo;
    });
    
    return {
      totalThreats: threats.length,
      activeThreats: activeThreats.length,
      criticalThreats: criticalThreats.length,
      recentScans: recentScansList.length,
      lastScanTime: scans.length > 0 ? (scans[0].end_time || scans[0].start_time) : null,
    };
  }, [recentFindings, recentScans]);

  const handleThreatClick = (threat: ThreatAlert) => {
    setSelectedThreat(threat);
    setShowThreatDetails(true);
  };

  const handleScanClick = (scan: SecurityScan) => {
    setSelectedScan(scan);
    setShowScanDetails(true);
  };

  const handleStartScan = async (type: string, target: string) => {
    try {
      await runScan();
      toast({
        title: 'Scan Started',
        description: `${type} scan initiated for ${target}`,
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Scan Failed',
        description: 'Failed to start security scan',
        variant: 'error',
      });
    }
  };

  if (isLoading) {
    return (
      <SecurityErrorBoundary context="Security Page Loading">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <ShieldCheckIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Loading Security Data</h2>
            <p className="text-gray-400">Fetching security scans and threat intelligence...</p>
          </div>
        </div>
      </SecurityErrorBoundary>
    );
  }

  if (error) {
    return (
      <SecurityErrorBoundary context="Security Page Error">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <ShieldExclamationIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Security Data Unavailable</h2>
            <p className="text-gray-400 mb-4">
              {error.message || 'Failed to load security information'}
            </p>
            <Button onClick={() => refetch()} variant="primary">
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </SecurityErrorBoundary>
    );
  }

  return (
    <SecurityErrorBoundary context="Security Management">
      <div className="min-h-screen bg-gray-950 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">Security Management</h1>
                <p className="text-gray-400 mt-1">
                  Monitor security scans, threats, and system vulnerabilities
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-gray-800 rounded-lg p-1 border border-gray-700">
                  <button
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors bg-primary-600 text-white"
                  >
                    <ShieldCheckIcon className="h-4 w-4" />
                    Security
                  </button>
                  <button
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-400 hover:text-white"
                  >
                    <BugAntIcon className="h-4 w-4" />
                    Scans
                  </button>
                </div>
                
                <Button onClick={() => refetch()} variant="secondary" disabled={isLoading}>
                  <ArrowPathIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button 
                  onClick={() => handleStartScan('vulnerability', 'all')}
                  variant="primary"
                  disabled={isStartingScan}
                >
                  <PlayIcon className="h-4 w-4 mr-2" />
                  {isStartingScan ? 'Starting...' : 'Start Scan'}
                </Button>
              </div>
            </div>
          </div>

          {/* Security Metrics */}
          <SecurityErrorBoundary context="Security Metrics">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20 p-6">
                <div className="flex items-center">
                  <ShieldCheckIcon className="h-8 w-8 text-red-400" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-red-400">Active Threats</p>
                    <p className="text-2xl font-bold text-white">{securityMetrics.activeThreats}</p>
                  </div>
                </div>
              </Card>
              
              <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20 p-6">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-8 w-8 text-orange-400" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-orange-400">Critical</p>
                    <p className="text-2xl font-bold text-white">{securityMetrics.criticalThreats}</p>
                  </div>
                </div>
              </Card>
              
              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20 p-6">
                <div className="flex items-center">
                  <BugAntIcon className="h-8 w-8 text-blue-400" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-400">Recent Scans</p>
                    <p className="text-2xl font-bold text-white">{securityMetrics.recentScans}</p>
                  </div>
                </div>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20 p-6">
                <div className="flex items-center">
                  <ClockIcon className="h-8 w-8 text-purple-400" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-purple-400">Last Scan</p>
                    <p className="text-sm font-bold text-white">
                      {securityMetrics.lastScanTime 
                        ? formatDistanceToNow(new Date(securityMetrics.lastScanTime)) + ' ago'
                        : 'Never'
                      }
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </SecurityErrorBoundary>

          {/* Recent Threats */}
          <SecurityErrorBoundary context="Recent Threats">
            <Card className="bg-gradient-to-br from-red-950/20 to-gray-900/50 border-red-900/30 hover:border-red-800/50 transition-all duration-300 mb-8">
              <div className="p-6 border-b border-red-900/30 bg-gradient-to-r from-red-950/30 to-gray-800/50">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <ShieldExclamationIcon className="h-6 w-6 text-red-400" />
                    Recent Threats
                  </h2>
                  <Badge variant="error" className="text-xs">
                    {(recentFindings || []).filter((t: any) => t.status === 'active').length} Active
                  </Badge>
                </div>
              </div>
              
              <div className="p-6">
                {(recentFindings || []).length === 0 ? (
                  <div className="text-center py-8">
                    <ShieldCheckIcon className="h-12 w-12 text-green-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No Active Threats</h3>
                    <p className="text-gray-400">Your system is currently secure with no detected threats.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(recentFindings || []).slice(0, 5).map((threat: any) => {
                      const severityConf = severityConfig[threat.severity] || severityConfig.low;
                      return (
                        <div
                          key={threat.id}
                          className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
                          onClick={() => handleThreatClick(threat)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${severityConf.bgColor}`}>
                              {React.createElement(severityConf.icon, {
                                className: `h-5 w-5 ${severityConf.color}`
                              })}
                            </div>
                            <div>
                              <h4 className="font-medium text-white">{threat.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={severityConf.variant} className="text-xs">
                                  {severityConf.label}
                                </Badge>
                                <span className="text-sm text-gray-400">{threat.category}</span>
                                <span className="text-sm text-gray-400">
                                  {formatDistanceToNow(new Date(threat.first_seen))} ago
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </SecurityErrorBoundary>

          {/* Security Scans */}
          <SecurityErrorBoundary context="Security Scans">
            <Card className="bg-gradient-to-br from-blue-950/20 to-gray-900/50 border-blue-900/30 hover:border-blue-800/50 transition-all duration-300">
              <div className="p-6 border-b border-blue-900/30 bg-gradient-to-r from-blue-950/30 to-gray-800/50">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <BugAntIcon className="h-6 w-6 text-blue-400" />
                    Security Scans
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStartScan('malware', 'all')}
                      disabled={isStartingScan}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors bg-orange-500/20 text-orange-300 border border-orange-500/50 hover:bg-orange-500/30 disabled:opacity-50"
                    >
                      <BugAntIcon className="h-3 w-3" />
                      Malware Scan
                    </button>
                    <button
                      onClick={() => handleStartScan('vulnerability', 'all')}
                      disabled={isStartingScan}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors bg-blue-500/20 text-blue-300 border border-blue-500/50 hover:bg-blue-500/30 disabled:opacity-50"
                    >
                      <PlayIcon className="h-3 w-3" />
                      Full Scan
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {(recentScans || []).length === 0 ? (
                  <div className="text-center py-8">
                    <BugAntIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No Security Scans</h3>
                    <p className="text-gray-400 mb-4">Start your first security scan to analyze system vulnerabilities.</p>
                    <Button
                      onClick={() => handleStartScan('vulnerability', 'all')}
                      variant="primary"
                      disabled={isStartingScan}
                    >
                      <PlayIcon className="h-4 w-4 mr-2" />
                      {isStartingScan ? 'Starting...' : 'Start First Scan'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {scans.map(scan => {
                      const statusConf = scanStatusConfig[scan.status] || scanStatusConfig.completed;
                      const typeConf = scanTypeConfig[scan.type] || { icon: BugAntIcon, color: 'text-gray-400', label: 'Unknown Scan' };
                      return (
                        <div
                          key={scan.id}
                          className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
                          onClick={() => handleScanClick(scan)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${typeConf.color.replace('text-', 'bg-').replace('-400', '-400/10')}`}>
                              {React.createElement(typeConf.icon, {
                                className: `h-5 w-5 ${typeConf.color}`
                              })}
                            </div>
                            <div>
                              <h4 className="font-medium text-white">{typeConf.label}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={statusConf.variant} className="text-xs">
                                  {statusConf.label}
                                </Badge>
                                <span className="text-sm text-gray-400">{scan.target}</span>
                                <span className="text-sm text-gray-400">
                                  {formatDistanceToNow(new Date(scan.start_time || scan.created_at))} ago
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {scan.status === 'running' && scan.progress && (
                              <div className="w-20 bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${scan.progress}%` }}
                                />
                              </div>
                            )}
                            <Button variant="ghost" size="sm">
                              <EyeIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </SecurityErrorBoundary>

          {/* Phase 3: Enterprise Security Events Grid */}
          <SecurityErrorBoundary context="Enterprise Security Events">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Enterprise Security Events</h2>
                  <p className="text-sm text-gray-400 mt-1">Advanced security event management and analysis</p>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">Phase 3</span>
                  <span>Enterprise Components</span>
                </div>
              </div>

              {/* Security Events Grid */}
              <SecurityEventsGrid height={600} className="w-full" />
            </div>
          </SecurityErrorBoundary>

          {/* Modals */}
          <ThreatDetailsModal
            threat={selectedThreat}
            isOpen={showThreatDetails}
            onClose={() => setShowThreatDetails(false)}
          />
          
          <ScanDetailsModal
            scan={selectedScan}
            isOpen={showScanDetails}
            onClose={() => setShowScanDetails(false)}
          />
        </div>
      </div>
    </SecurityErrorBoundary>
  );
};