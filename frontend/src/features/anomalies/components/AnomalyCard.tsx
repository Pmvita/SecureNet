import React from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import type { Anomaly, BaseProps, WithLoading } from '../../../types';

interface AnomalyCardProps extends BaseProps {
  anomaly: Anomaly;
  onStatusChange?: (id: string, status: Anomaly['status']) => void;
  onViewDetails?: (id: string) => void;
  showActions?: boolean;
  loading?: boolean;
}

const severityColors: Record<Anomaly['severity'], string> = {
  critical: 'var(--error)',
  high: 'var(--warning)',
  medium: 'var(--warning-light)',
  low: 'var(--info)',
};

const statusColors: Record<Anomaly['status'], string> = {
  active: 'var(--error)',
  investigating: 'var(--warning)',
  resolved: 'var(--success)',
  ignored: 'var(--text-secondary)',
};

export function AnomalyCard({
  anomaly,
  onStatusChange,
  onViewDetails,
  showActions = true,
  loading,
  className,
  ...props
}: AnomalyCardProps) {
  const handleStatusChange = (newStatus: Anomaly['status']) => {
    onStatusChange?.(anomaly.id, newStatus);
  };

  const handleViewDetails = () => {
    onViewDetails?.(anomaly.id);
  };

  return (
    <Card
      className={`anomaly-card ${loading ? 'loading' : ''} ${className || ''}`}
      {...props}
    >
      {loading ? (
        <div className="anomaly-card-loading">
          <div className="loading-spinner" />
        </div>
      ) : (
        <>
          <div className="anomaly-card-header">
            <div className="anomaly-card-title">
              <h3>{anomaly.title}</h3>
              <Badge
                color={severityColors[anomaly.severity]}
                variant={anomaly.severity === 'critical' ? 'error' : 'default'}
              >
                {anomaly.severity.toUpperCase()}
              </Badge>
            </div>
            <Badge
              color={statusColors[anomaly.status]}
              variant={anomaly.status === 'active' ? 'error' : 'default'}
            >
              {anomaly.status.toUpperCase()}
            </Badge>
          </div>

          <div className="anomaly-card-content">
            <p className="anomaly-card-description">{anomaly.description}</p>
            
            <div className="anomaly-card-meta">
              <div className="anomaly-card-info">
                <span className="anomaly-card-type">{anomaly.type}</span>
                <span className="anomaly-card-source">{anomaly.source}</span>
              </div>
              <time className="anomaly-card-time">
                {new Date(anomaly.timestamp).toLocaleString()}
              </time>
            </div>

            {anomaly.metrics && (
              <div className="anomaly-card-metrics">
                <div className="metric">
                  <span className="metric-label">Confidence</span>
                  <span className="metric-value">{anomaly.metrics.confidence}%</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Impact</span>
                  <span className="metric-value">{anomaly.metrics.impact}/10</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Frequency</span>
                  <span className="metric-value">{anomaly.metrics.frequency}/day</span>
                </div>
              </div>
            )}
          </div>

          {showActions && (
            <div className="anomaly-card-actions">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleViewDetails}
              >
                View Details
              </Button>
              
              {anomaly.status === 'active' && (
                <Button
                  variant="warning"
                  size="sm"
                  onClick={() => handleStatusChange('investigating')}
                >
                  Start Investigation
                </Button>
              )}
              
              {anomaly.status === 'investigating' && (
                <>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleStatusChange('resolved')}
                  >
                    Mark Resolved
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleStatusChange('ignored')}
                  >
                    Ignore
                  </Button>
                </>
              )}
            </div>
          )}
        </>
      )}

      <style>{`
        .anomaly-card {
          padding: 1.25rem;
        }

        .anomaly-card.loading {
          min-height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .anomaly-card-loading {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid var(--border-color);
          border-top-color: var(--primary-color);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .anomaly-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .anomaly-card-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .anomaly-card-title h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .anomaly-card-content {
          margin-bottom: 1rem;
        }

        .anomaly-card-description {
          margin: 0 0 1rem;
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .anomaly-card-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .anomaly-card-info {
          display: flex;
          gap: 1rem;
        }

        .anomaly-card-type,
        .anomaly-card-source {
          text-transform: capitalize;
        }

        .anomaly-card-metrics {
          display: flex;
          gap: 1.5rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .metric {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .metric-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .metric-value {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-primary);
        }

        .anomaly-card-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }
      `}</style>
    </Card>
  );
} 