import React from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Progress } from '@/components/common/Progress';
import type { NetworkDevice, BaseProps } from '../../../types';
import { formatDistanceToNow } from 'date-fns';
import {
  ComputerDesktopIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  PrinterIcon,
  ShieldCheckIcon,
  ServerIcon,
  EyeIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';

interface NetworkDeviceCardProps extends BaseProps {
  device: NetworkDevice;
  onViewDetails?: (id: string) => void;
  onUpdateStatus?: (id: string, status: NetworkDevice['status']) => void;
  showActions?: boolean;
  loading?: boolean;
}

const statusColors: Record<NetworkDevice['status'], string> = {
  active: 'var(--success)',
  investigating: 'var(--warning)',
  resolved: 'var(--success)',
  ignored: 'var(--text-secondary)',
};

const severityColors: Record<string, string> = {
  critical: 'var(--error)',
  high: 'var(--warning)',
  medium: 'var(--warning)',
  low: 'var(--success)',
  info: 'var(--info)',
};

// Device type icon mapping
const deviceTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  endpoint: ComputerDesktopIcon,
  server: ServerIcon,
  router: GlobeAltIcon,
  mobile: DevicePhoneMobileIcon,
  firewall: ShieldCheckIcon,
  printer: PrinterIcon,
  unknown: ComputerDesktopIcon,
};

export function NetworkDeviceCard({
  device,
  onViewDetails,
  onUpdateStatus,
  showActions = true,
  loading,
  className,
  ...props
}: NetworkDeviceCardProps) {
  const handleViewDetails = () => {
    onViewDetails?.(device.id);
  };

  const handleStatusChange = (newStatus: NetworkDevice['status']) => {
    onUpdateStatus?.(device.id, newStatus);
  };

  return (
    <Card
      className={`network-device-card ${loading ? 'loading' : ''} ${className || ''}`}
      {...props}
    >
      {loading ? (
        <div className="network-device-card-loading">
          <div className="loading-spinner" />
        </div>
      ) : (
        <>
          <div className="network-device-card-header">
            <div className="network-device-card-title">
              <span className="device-icon">
                {React.createElement(deviceTypeIcons[device.type], { className: 'h-6 w-6' })}
              </span>
              <h3>{device.name}</h3>
              <Badge
                color={statusColors[device.status]}
                variant={device.status === 'active' ? 'success' : 'default'}
              >
                {device.status.toUpperCase()}
              </Badge>
            </div>
            <div className="network-device-card-meta">
              <span className="device-type">{device.type}</span>
              <span className="device-ip">{device.ipAddress}</span>
            </div>
          </div>

          <div className="network-device-card-details">
            <div className="detail-item">
              <span className="detail-label">MAC Address</span>
              <span className="detail-value">{device.macAddress}</span>
            </div>
            {device.details.manufacturer && (
              <div className="detail-item">
                <span className="detail-label">Manufacturer</span>
                <span className="detail-value">{device.details.manufacturer}</span>
              </div>
            )}
            {device.details.model && (
              <div className="detail-item">
                <span className="detail-label">Model</span>
                <span className="detail-value">{device.details.model}</span>
              </div>
            )}
            {device.details.location && (
              <div className="detail-item">
                <span className="detail-label">Location</span>
                <span className="detail-value">{device.details.location}</span>
              </div>
            )}
          </div>

          {device.metrics && (
            <div className="network-device-card-metrics">
              <div className="metrics-section">
                <h4>Bandwidth</h4>
                <div className="metrics-grid">
                  <div className="metric-item">
                    <span className="metric-label">Incoming</span>
                    <span className="metric-value">
                      {device.metrics.bandwidth.incoming.toFixed(2)} Mbps
                    </span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Outgoing</span>
                    <span className="metric-value">
                      {device.metrics.bandwidth.outgoing.toFixed(2)} Mbps
                    </span>
                  </div>
                </div>
              </div>

              <div className="metrics-section">
                <h4>Performance</h4>
                <div className="metrics-grid">
                  <div className="metric-item">
                    <span className="metric-label">Latency</span>
                    <span className="metric-value">
                      {device.metrics.latency.toFixed(1)} ms
                    </span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Packet Loss</span>
                    <span className="metric-value">
                      {device.metrics.packetLoss.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {device.metrics.cpuUsage !== undefined && (
                <div className="metrics-section">
                  <h4>System</h4>
                  <div className="metrics-grid">
                    <div className="metric-item">
                      <span className="metric-label">CPU Usage</span>
                      <div className="metric-progress">
                        <Progress
                          value={device.metrics.cpuUsage}
                          max={100}
                          className="progress-bar"
                        />
                        <span className="progress-value">{device.metrics.cpuUsage}%</span>
                      </div>
                    </div>
                    {device.metrics.memoryUsage !== undefined && (
                      <div className="metric-item">
                        <span className="metric-label">Memory Usage</span>
                        <div className="metric-progress">
                          <Progress
                            value={device.metrics.memoryUsage}
                            max={100}
                            className="progress-bar"
                          />
                          <span className="progress-value">{device.metrics.memoryUsage}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {device.security && (
            <div className="network-device-card-security">
              <h4>Security Status</h4>
              <div className="security-metrics">
                <div className="security-item">
                  <span className="security-label">Risk Level</span>
                  <Badge
                    color={severityColors[device.security.riskLevel]}
                    variant={device.security.riskLevel === 'critical' ? 'error' : 'default'}
                  >
                    {device.security.riskLevel.toUpperCase()}
                  </Badge>
                </div>
                <div className="security-item">
                  <span className="security-label">Vulnerabilities</span>
                  <span className="security-value">{device.security.vulnerabilities}</span>
                </div>
                <div className="security-item">
                  <span className="security-label">Last Scan</span>
                  <span className="security-value">
                    {new Date(device.security.lastScan).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {showActions && (
            <div className="network-device-card-actions">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleViewDetails}
              >
                View Details
              </Button>
              
              {device.status === 'active' && (
                <Button
                  variant="warning"
                  size="sm"
                  onClick={() => handleStatusChange('investigating')}
                >
                  Start Investigation
                </Button>
              )}
              
              {device.status === 'investigating' && (
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
        .network-device-card {
          padding: 1.25rem;
        }

        .network-device-card.loading {
          min-height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .network-device-card-loading {
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

        .network-device-card-header {
          margin-bottom: 1rem;
        }

        .network-device-card-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .device-icon {
          font-size: 1.5rem;
        }

        .network-device-card-title h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .network-device-card-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .device-type {
          text-transform: capitalize;
        }

        .network-device-card-details {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
          margin-bottom: 1rem;
          padding: 1rem;
          background: var(--bg-secondary);
          border-radius: 0.5rem;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .detail-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .detail-value {
          font-size: 0.875rem;
          color: var(--text-primary);
        }

        .network-device-card-metrics {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .metrics-section {
          padding: 1rem;
          background: var(--bg-secondary);
          border-radius: 0.5rem;
        }

        .metrics-section h4 {
          margin: 0 0 0.75rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .metric-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
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

        .metric-progress {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .progress-bar {
          flex: 1;
          height: 0.5rem;
        }

        .progress-value {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-secondary);
          min-width: 2.5rem;
          text-align: right;
        }

        .network-device-card-security {
          margin-bottom: 1rem;
          padding: 1rem;
          background: var(--bg-secondary);
          border-radius: 0.5rem;
        }

        .network-device-card-security h4 {
          margin: 0 0 0.75rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .security-metrics {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .security-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .security-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .security-value {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-primary);
        }

        .network-device-card-actions {
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