import React, { useState } from 'react';
import { useAnomalies, type Anomaly, type AnomalyMetrics } from '../api/useAnomalies';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

export const AnomaliesPage: React.FC = () => {
  const [selectedAnomaly, setSelectedAnomaly] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'resolve' | 'false-positive' | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const { toast } = useToast();

  const {
    anomalies,
    total,
    metrics,
    pageSize,
    isLoading,
    isError,
    error,
    resolveAnomaly,
    markAsFalsePositive,
    runAnalysis,
    isResolving,
    isMarkingFalsePositive,
    isAnalyzing,
  } = useAnomalies({
    filters,
    page,
    pageSize: 10,
  });

  const handleFilterChange = (newFilters: Record<string, string | undefined>) => {
    setFilters((prev) => {
      const updated = { ...prev };
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value === undefined) {
          delete updated[key];
        } else {
          updated[key] = value;
        }
      });
      return updated;
    });
    setPage(1);
  };

  const handleResolve = async (anomalyId: string) => {
    try {
      await resolveAnomaly(anomalyId);
      toast({
        title: 'Anomaly Resolved',
        description: 'The anomaly has been marked as resolved.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to resolve the anomaly. Please try again.',
        variant: 'error',
      });
    }
    setSelectedAnomaly(null);
    setActionType(null);
  };

  const handleMarkAsFalsePositive = async (anomalyId: string) => {
    try {
      await markAsFalsePositive(anomalyId);
      toast({
        title: 'Anomaly Marked as False Positive',
        description: 'The anomaly has been marked as a false positive.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark the anomaly as false positive. Please try again.',
        variant: 'error',
      });
    }
    setSelectedAnomaly(null);
    setActionType(null);
  };

  const handleRunAnalysis = async () => {
    try {
      await runAnalysis();
      toast({
        title: 'Analysis Started',
        description: 'A new anomaly analysis has been initiated.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start the analysis. Please try again.',
        variant: 'error',
      });
    }
  };

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'error';
      case 'investigating':
        return 'warning';
      case 'resolved':
        return 'success';
      case 'false_positive':
        return 'info';
      default:
        return 'default';
    }
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-500 mb-2">Error Loading Anomalies</h2>
            <p className="text-gray-400 mb-4">{error?.message || 'An error occurred while loading anomalies.'}</p>
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Anomalies</h1>
        <Button
          variant="primary"
          onClick={handleRunAnalysis}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
        </Button>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-500">Total Anomalies</h3>
            <p className="mt-2 text-3xl font-semibold">{metrics?.totalAnomalies ?? 0}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-500">Active Anomalies</h3>
            <p className="mt-2 text-3xl font-semibold text-red-500">{metrics?.activeAnomalies ?? 0}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-500">Resolved</h3>
            <p className="mt-2 text-3xl font-semibold text-green-500">{metrics?.resolvedAnomalies ?? 0}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-500">False Positives</h3>
            <p className="mt-2 text-3xl font-semibold text-blue-500">{metrics?.falsePositives ?? 0}</p>
          </div>
        </Card>
      </div>

      {/* Anomalies List */}
      <Card>
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Anomalies</h2>
          {anomalies.length === 0 ? (
            <EmptyState
              title="No Anomalies Found"
              description="Run an analysis to check for anomalies."
              action={
                <Button
                  variant="primary"
                  onClick={handleRunAnalysis}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {anomalies.map((anomaly: Anomaly) => (
                <div
                  key={anomaly.id}
                  className="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <Badge variant={getStatusVariant(anomaly.status)}>
                      {anomaly.status}
                    </Badge>
                    <div>
                      <h3 className="font-medium">{anomaly.title}</h3>
                      <p className="text-sm text-gray-400">{anomaly.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getSeverityVariant(anomaly.severity)}>
                      {anomaly.severity}
                    </Badge>
                    {anomaly.status === 'active' && (
                      <div className="flex space-x-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setSelectedAnomaly(anomaly.id);
                            setActionType('resolve');
                          }}
                          disabled={isResolving}
                        >
                          Resolve
                        </Button>
                        <Button
                          variant="warning"
                          size="sm"
                          onClick={() => {
                            setSelectedAnomaly(anomaly.id);
                            setActionType('false-positive');
                          }}
                          disabled={isMarkingFalsePositive}
                        >
                          Mark as False Positive
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <ConfirmDialog
        isOpen={!!selectedAnomaly}
        onCancel={() => {
          setSelectedAnomaly(null);
          setActionType(null);
        }}
        onConfirm={() => {
          if (selectedAnomaly && actionType) {
            if (actionType === 'resolve') {
              handleResolve(selectedAnomaly);
            } else {
              handleMarkAsFalsePositive(selectedAnomaly);
            }
          }
        }}
        title={actionType === 'resolve' ? 'Resolve Anomaly' : 'Mark as False Positive'}
        message={
          actionType === 'resolve'
            ? 'Are you sure you want to mark this anomaly as resolved?'
            : 'Are you sure you want to mark this anomaly as a false positive?'
        }
        confirmLabel={actionType === 'resolve' ? 'Resolve' : 'Mark as False Positive'}
        cancelLabel="Cancel"
        variant={actionType === 'resolve' ? 'danger' : 'warning'}
        isLoading={isResolving || isMarkingFalsePositive}
      />
    </div>
  );
}; 