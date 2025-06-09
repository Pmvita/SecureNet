import React, { useState, useMemo } from 'react';
import { useSecurity } from '../api/useSecurity';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { useToast } from '@/hooks/useToast';
import { formatDistanceToNow } from 'date-fns';
import {
  ShieldCheckIcon,
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  BugAntIcon,
  PlayIcon,
  MagnifyingGlassIcon,
  DocumentChartBarIcon,
  FireIcon,
  CheckCircleIcon,
  ClockIcon,
  ServerIcon,
} from '@heroicons/react/24/outline';

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

export const SecurityPage: React.FC = () => {
  const { toast } = useToast();

  const {
    metrics,
    activeScans,
    recentScans,
    recentFindings,
    isLoading,
    isError,
    error,
    runScan,
    isScanning,
  } = useSecurity();

  // Calculate security score and level
  const securityScore = useMemo(() => {
    return metrics?.security_score || 85;
  }, [metrics]);

  const securityLevel = useMemo(() => {
    if (securityScore >= 80) return 'high';
    if (securityScore >= 60) return 'medium';
    return 'low';
  }, [securityScore]);

  const handleRunScan = async () => {
    try {
      await runScan();
      toast({
        title: 'Security scan started successfully',
        description: 'Full scan initiated',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Failed to start security scan',
        description: 'Please try again later',
        variant: 'error',
      });
    }
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <Card className="w-full max-w-md">
          <div className="text-center p-6">
            <ExclamationTriangleIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-400 mb-2">Error Loading Security Data</h2>
            <p className="text-gray-400 mb-4">{error?.message || 'An unexpected error occurred'}</p>
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Security Management</h1>
          <p className="text-gray-400 mt-1">Comprehensive threat detection and vulnerability management</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex items-center gap-2">
            <DocumentChartBarIcon className="h-4 w-4" />
            Security Report
          </Button>
          <Button
            variant="primary"
            onClick={handleRunScan}
            disabled={isScanning}
            className="flex items-center gap-2"
          >
            <PlayIcon className="h-4 w-4" />
            {isScanning ? 'Scanning...' : 'Run Full Scan'}
          </Button>
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
                  Overall security posture: {securityScore}/100
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
              <span>Security Posture</span>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-400">Critical Threats</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {metrics?.critical_findings || 0}
                </p>
              </div>
              <FireIcon className="h-8 w-8 text-red-400" />
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Requires immediate attention
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-400">Total Findings</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {metrics?.total_findings || 0}
                </p>
              </div>
              <ExclamationTriangleIcon className="h-8 w-8 text-orange-400" />
            </div>
            <div className="mt-2 text-xs text-gray-400">
              All security findings
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-400">Active Scans</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {metrics?.active_scans || 0}
                </p>
              </div>
              <MagnifyingGlassIcon className="h-8 w-8 text-blue-400" />
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Currently running
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border-cyan-500/20">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-cyan-400">Last Scan</p>
                <p className="text-sm font-bold text-white mt-1">
                  {metrics?.last_scan ? 
                    formatDistanceToNow(new Date(metrics.last_scan)) + ' ago' : 
                    'Never'
                  }
                </p>
              </div>
              <ClockIcon className="h-8 w-8 text-cyan-400" />
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Security assessment
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Active Scans */}
        <Card>
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <MagnifyingGlassIcon className="h-5 w-5" />
                Active Scans
              </h2>
              <Badge variant="info" className="text-xs">
                {activeScans?.length || 0} Running
              </Badge>
            </div>
          </div>
          <div className="p-4">
            {!activeScans || activeScans.length === 0 ? (
              <div className="text-center py-8">
                <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Active Scans</h3>
                <p className="text-gray-400 text-sm mb-4">Start a security scan to monitor threats</p>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={handleRunScan}
                  disabled={isScanning}
                >
                  <BugAntIcon className="h-3 w-3 mr-1" />
                  Start Scan
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeScans.map((scan) => (
                  <div
                    key={scan.id}
                    className="p-3 bg-gray-800/50 rounded-lg border border-gray-700"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BugAntIcon className="h-5 w-5 text-blue-400" />
                        <div>
                          <h4 className="text-sm font-medium text-white">
                            {scan.type} Scan
                          </h4>
                          <p className="text-xs text-gray-400">
                            Started {formatDistanceToNow(new Date(scan.start_time))} ago
                          </p>
                        </div>
                      </div>
                      <Badge variant="info" className="text-xs">
                        {scan.progress || 0}%
                      </Badge>
                    </div>
                    
                    {scan.progress && (
                      <div className="mt-3">
                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-400 transition-all duration-500"
                            style={{ width: `${scan.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Security Findings */}
        <Card>
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <BugAntIcon className="h-5 w-5" />
                Recent Findings
              </h2>
              <Badge variant="error" className="text-xs">
                {recentFindings?.length || 0} Active
              </Badge>
            </div>
          </div>
          
          <div className="p-4">
            {!recentFindings || recentFindings.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircleIcon className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Security Issues</h3>
                <p className="text-gray-400 text-sm">Your security posture is strong</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentFindings.slice(0, 5).map((finding) => (
                  <div
                    key={finding.id}
                    className="p-4 rounded-lg border bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="error" className="text-xs">
                            {finding.severity}
                          </Badge>
                          <span className="text-xs text-gray-400">{finding.type}</span>
                        </div>
                        <p className="text-xs text-gray-400 mb-2">
                          {finding.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>
                            <ClockIcon className="h-3 w-3 inline mr-1" />
                            {formatDistanceToNow(new Date(finding.timestamp))} ago
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <FireIcon className="h-5 w-5 text-red-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Recent Scan History */}
      <Card>
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ClockIcon className="h-5 w-5" />
            Recent Scan History
          </h2>
        </div>
        <div className="p-4">
          {!recentScans || recentScans.length === 0 ? (
            <div className="text-center py-8">
              <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Scan History</h3>
              <p className="text-gray-400 text-sm">Start your first security scan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Scan Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Findings</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {recentScans.slice(0, 5).map((scan) => (
                    <tr key={scan.id} className="border-b border-gray-800">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <ServerIcon className="h-4 w-4 text-blue-400" />
                          <span className="text-sm text-white">
                            {scan.type} Scan
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge 
                          variant={
                            scan.status === 'completed' ? 'success' :
                            scan.status === 'failed' ? 'error' :
                            scan.status === 'running' ? 'info' : 'default'
                          }
                          className="text-xs"
                        >
                          {scan.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-white">
                          {scan.findings_count || 0}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-400">
                          {formatDistanceToNow(new Date(scan.start_time))} ago
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};