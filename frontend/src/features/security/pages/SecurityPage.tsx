import React, { useState } from 'react';
import { useSecurity } from '../api/useSecurity';
import type { SecurityScan, SecurityFinding } from '../../../types';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Alert } from '@/components/common/Alert';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

interface MetricDisplay {
  title: string;
  value: number;
  status: 'good' | 'warning' | 'error';
  trend: {
    isPositive: boolean;
    value: number;
  } | null;
}

export const SecurityPage: React.FC = () => {
  const [selectedThreat, setSelectedThreat] = useState<string | null>(null);
  const { toast } = useToast();

  const {
    metrics,
    recentScans,
    activeScans,
    recentFindings,
    isLoading,
    isError,
    error,
    runScan,
    isScanning,
  } = useSecurity();

  // Transform metrics object into array for display
  const metricsArray: MetricDisplay[] = [
    {
      title: 'Active Scans',
      value: metrics.active_scans || 0,
      status: metrics.active_scans > 0 ? 'warning' : 'good',
      trend: null
    },
    {
      title: 'Total Findings',
      value: metrics.total_findings || 0,
      status: metrics.total_findings > 0 ? 'warning' : 'good',
      trend: null
    },
    {
      title: 'Critical Findings',
      value: metrics.critical_findings || 0,
      status: metrics.critical_findings > 0 ? 'error' : 'good',
      trend: null
    },
    {
      title: 'Security Score',
      value: metrics.security_score || 0,
      status: metrics.security_score >= 80 ? 'good' : metrics.security_score >= 60 ? 'warning' : 'error',
      trend: null
    }
  ];

  const handleRunScan = async () => {
    try {
      await runScan();
      toast({
        title: 'Security scan started successfully',
        description: '',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Failed to start security scan',
        description: '',
        variant: 'error',
      });
    }
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-500 mb-2">Error Loading Security Data</h2>
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
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Security</h1>
        <Button
          variant="primary"
          onClick={handleRunScan}
          disabled={isScanning}
        >
          {isScanning ? 'Scanning...' : 'Run Security Scan'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricsArray.map((metric) => (
          <Card key={metric.title}>
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-500">{metric.title}</h3>
              <p className="mt-2 text-3xl font-semibold">{metric.value}</p>
              {metric.trend && (
                <div className="mt-1 flex items-center space-x-2">
                  <span
                    className={`text-sm ${
                      metric.trend.isPositive ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {metric.trend.isPositive ? '↑' : '↓'} {Math.abs(metric.trend.value)}%
                  </span>
                  <Badge variant={metric.status === 'good' ? 'success' : metric.status === 'warning' ? 'warning' : 'error'}>
                    {metric.status}
                  </Badge>
                </div>
              )}
              {!metric.trend && (
                <div className="mt-1">
                  <Badge variant={metric.status === 'good' ? 'success' : metric.status === 'warning' ? 'warning' : 'error'}>
                    {metric.status}
                  </Badge>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Active Scans</h2>
            {activeScans.length === 0 ? (
              <EmptyState
                title="No Active Scans"
                description="Start a new security scan to begin monitoring."
                action={
                  <Button
                    variant="primary"
                    onClick={handleRunScan}
                    disabled={isScanning}
                  >
                    {isScanning ? 'Scanning...' : 'Start Scan'}
                  </Button>
                }
              />
            ) : (
              <div className="space-y-4">
                {activeScans.map((scan) => (
                  <div
                    key={scan.id}
                    className="p-4 bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{scan.type}</h3>
                      <Badge variant="info">Running</Badge>
                    </div>
                    <p className="text-sm text-gray-400">
                      Started: {new Date(scan.start_time).toLocaleString()}
                    </p>
                    {scan.progress && (
                      <div className="mt-2">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>{scan.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
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

        <Card>
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Recent Findings</h2>
            {recentFindings.length === 0 ? (
              <EmptyState
                title="No Recent Findings"
                description="No security findings have been detected recently."
              />
            ) : (
              <div className="space-y-4">
                {recentFindings.map((finding) => (
                  <div
                    key={finding.id}
                    className="p-4 bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{finding.type}</h3>
                      <Badge
                        variant={
                          finding.severity === 'critical'
                            ? 'error'
                            : finding.severity === 'high'
                            ? 'warning'
                            : 'default'
                        }
                      >
                        {finding.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">
                      {finding.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      Detected: {new Date(finding.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}; 