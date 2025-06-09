import React from 'react';
import { Card } from '@/components/common/Card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Alert } from '@/components/common/Alert';
import type { BaseProps, WithLoading, WithError } from '../../../types';

interface StatsCardProps extends Omit<BaseProps, 'onError'>, WithLoading {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  onClick?: () => void;
  error?: string | Error;
}

export function StatsCard({
  title,
  value,
  icon,
  trend,
  description,
  loading,
  error,
  onClick,
  className,
  ...props
}: StatsCardProps) {
  const handleClick = () => {
    if (onClick && !loading && !error) {
      onClick();
    }
  };

  return (
    <Card
      className={`stats-card ${className || ''}`}
      onClick={handleClick}
      {...props}
    >
      {loading ? (
        <div className="stats-card-loading">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <Alert 
          type="error" 
          title="Error"
          message={error instanceof Error ? error.message : String(error)} 
        />
      ) : (
        <>
          <div className="stats-card-header">
            <h3 className="stats-card-title">{title}</h3>
            {icon && <div className="stats-card-icon">{icon}</div>}
          </div>
          
          <div className="stats-card-content">
            <div className="stats-card-value">{value}</div>
            {trend && (
              <div className={`stats-card-trend ${trend.isPositive ? 'positive' : 'negative'}`}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </div>
            )}
          </div>
          
          {description && (
            <p className="stats-card-description">{description}</p>
          )}
        </>
      )}

      <style>{`
        .stats-card {
          padding: 1.5rem;
          cursor: ${onClick ? 'pointer' : 'default'};
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .stats-card:hover {
          transform: ${onClick ? 'translateY(-2px)' : 'none'};
          box-shadow: ${onClick ? 'var(--shadow-lg)' : 'var(--shadow-md)'};
        }

        .stats-card-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 120px;
        }

        .stats-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .stats-card-title {
          margin: 0;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .stats-card-icon {
          font-size: 1.25rem;
          color: var(--primary-color);
        }

        .stats-card-content {
          display: flex;
          align-items: baseline;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .stats-card-value {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .stats-card-trend {
          font-size: 0.875rem;
          font-weight: 500;
          padding: 0.25rem 0.5rem;
          border-radius: 1rem;
        }

        .stats-card-trend.positive {
          background-color: var(--success-light);
          color: var(--success);
        }

        .stats-card-trend.negative {
          background-color: var(--error-light);
          color: var(--error);
        }

        .stats-card-description {
          margin: 0;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
      `}</style>
    </Card>
  );
} 