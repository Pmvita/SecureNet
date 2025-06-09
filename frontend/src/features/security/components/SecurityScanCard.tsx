import React from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Progress } from '@/components/common/Progress';
import type { SecurityScan, SecurityFinding, BaseProps } from '../../../types';

interface SecurityScanCardProps extends BaseProps {
  scan: SecurityScan;
  onViewDetails?: (id: string) => void;
  onCancelScan?: (id: string) => void;
  onUpdateFinding?: (scanId: string, findingId: string, status: string) => void;
  showActions?: boolean;
  loading?: boolean;
}

const severityColors: Record<SecurityFinding['severity'], string> = {
  critical: 'var(--error)',
  high: 'var(--warning)',
  medium: 'var(--warning-light)',
  low: 'var(--info)',
};

const statusColors: Record<SecurityScan['status'], string> = {
  pending: 'var(--text-secondary)',
  running: 'var(--primary-color)',
  completed: 'var(--success)',
  failed: 'var(--error)',
  cancelled: 'var(--text-secondary)',
};

export function SecurityScanCard({
  scan,
  onViewDetails,
  onCancelScan,
  onUpdateFinding,
  showActions = true,
  loading,
  className,
  ...props
}: SecurityScanCardProps) {
  const handleViewDetails = () => {
    onViewDetails?.(scan.id);
  };

  const handleCancelScan = () => {
    onCancelScan?.(scan.id);
  };

  const handleUpdateFinding = (findingId: string, status: string) => {
    onUpdateFinding?.(scan.id, findingId, status);
  };

  const getProgressPercentage = () => {
    if (!scan.progress) return 0;
    return Math.round((scan.progress.current / scan.progress.total) * 100);
  };

  return (
    <Card
      className={`security-scan-card ${loading ? 'loading' : ''} ${className || ''}`}
      {...props}
    >
      {loading ? (
        <div className="security-scan-card-loading">
          <div className="loading-spinner" />
        </div>
      ) : (
        <>
          <div className="security-scan-card-header">
            <div className="security-scan-card-title">
              <h3>{scan.scanConfig.name}</h3>
              <Badge
                color={statusColors[scan.status]}
                variant={scan.status === 'running' ? 'info' : 'default'}
              >
                {scan.status.toUpperCase()}
              </Badge>
            </div>
            <div className="security-scan-card-meta">
              <span className="scan-type">{scan.type}</span>
              <time className="scan-time">
                {new Date(scan.startTime).toLocaleString()}
              </time>
            </div>
          </div>

          {scan.status === 'running' && scan.progress && (
            <div className="security-scan-card-progress">
              <div className="progress-header">
                <span className="progress-stage">{scan.progress.stage}</span>
                <span className="progress-percentage">{getProgressPercentage()}%</span>
              </div>
              <Progress
                value={getProgressPercentage()}
                max={100}
                className="progress-bar"
              />
            </div>
          )}

          <div className="security-scan-card-summary">
            <div className="summary-item">
              <span className="summary-label">Total Findings</span>
              <span className="summary-value">{scan.summary.total}</span>
            </div>
            <div className="summary-item critical">
              <span className="summary-label">Critical</span>
              <span className="summary-value">{scan.summary.critical}</span>
            </div>
            <div className="summary-item high">
              <span className="summary-label">High</span>
              <span className="summary-value">{scan.summary.high}</span>
            </div>
            <div className="summary-item medium">
              <span className="summary-label">Medium</span>
              <span className="summary-value">{scan.summary.medium}</span>
            </div>
            <div className="summary-item low">
              <span className="summary-label">Low</span>
              <span className="summary-value">{scan.summary.low}</span>
            </div>
          </div>

          {scan.findings?.length > 0 && (
            <div className="security-scan-card-findings">
              <h4>Recent Findings</h4>
              <div className="findings-list">
                {scan.findings.slice(0, 3).map(finding => (
                  <div key={finding.id} className="finding-item">
                    <div className="finding-header">
                      <span className="finding-title">{finding.title}</span>
                      <Badge
                        color={severityColors[finding.severity]}
                        variant={finding.severity === 'critical' ? 'error' : 'default'}
                      >
                        {finding.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="finding-description">{finding.description}</p>
                    {showActions && finding.status === 'active' && (
                      <div className="finding-actions">
                        <Button
                          variant="warning"
                          size="sm"
                          onClick={() => handleUpdateFinding(finding.id, 'investigating')}
                        >
                          Start Investigation
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleUpdateFinding(finding.id, 'ignored')}
                        >
                          Ignore
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {showActions && (
            <div className="security-scan-card-actions">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleViewDetails}
              >
                View Details
              </Button>
              
              {scan.status === 'running' && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleCancelScan}
                >
                  Cancel Scan
                </Button>
              )}
            </div>
          )}
        </>
      )}

      <style>{`
        .security-scan-card {
          padding: 1.25rem;
        }

        .security-scan-card.loading {
          min-height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .security-scan-card-loading {
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

        .security-scan-card-header {
          margin-bottom: 1rem;
        }

        .security-scan-card-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .security-scan-card-title h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .security-scan-card-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .scan-type {
          text-transform: capitalize;
        }

        .security-scan-card-progress {
          margin: 1rem 0;
          padding: 1rem;
          background: var(--bg-secondary);
          border-radius: 0.5rem;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }

        .progress-stage {
          color: var(--text-secondary);
        }

        .progress-percentage {
          font-weight: 500;
          color: var(--text-primary);
        }

        .progress-bar {
          height: 0.5rem;
        }

        .security-scan-card-summary {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 1rem;
          margin: 1rem 0;
          padding: 1rem;
          background: var(--bg-secondary);
          border-radius: 0.5rem;
        }

        .summary-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .summary-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: 0.25rem;
        }

        .summary-value {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .summary-item.critical .summary-value {
          color: var(--error);
        }

        .summary-item.high .summary-value {
          color: var(--warning);
        }

        .summary-item.medium .summary-value {
          color: var(--warning-light);
        }

        .summary-item.low .summary-value {
          color: var(--info);
        }

        .security-scan-card-findings {
          margin-top: 1rem;
        }

        .security-scan-card-findings h4 {
          margin: 0 0 0.75rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .findings-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .finding-item {
          padding: 0.75rem;
          background: var(--bg-secondary);
          border-radius: 0.5rem;
        }

        .finding-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .finding-title {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-primary);
        }

        .finding-description {
          margin: 0;
          font-size: 0.75rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .finding-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }

        .security-scan-card-actions {
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