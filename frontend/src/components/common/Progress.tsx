import React from 'react';
import type { BaseProps } from '@/types';

export interface ProgressProps extends BaseProps {
  value: number;
  max?: number;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  showValue = false,
  size = 'md',
  variant = 'default',
  className,
  ...props
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const getVariantColor = () => {
    switch (variant) {
      case 'success':
        return 'var(--success)';
      case 'warning':
        return 'var(--warning)';
      case 'error':
        return 'var(--error)';
      default:
        return 'var(--primary-color)';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'height: 0.25rem;';
      case 'lg':
        return 'height: 1rem;';
      default:
        return 'height: 0.5rem;';
    }
  };

  return (
    <div className={`progress-wrapper ${className || ''}`} {...props}>
      <div className="progress-track">
        <div
          className="progress-bar"
          style={{
            width: `${percentage}%`,
            backgroundColor: getVariantColor(),
          }}
        />
      </div>
      {showValue && (
        <div className="progress-value">
          {Math.round(percentage)}%
        </div>
      )}
      <style>{`
        .progress-wrapper {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .progress-track {
          flex: 1;
          background: var(--bg-secondary);
          border-radius: 9999px;
          overflow: hidden;
          ${getSizeStyles()}
        }

        .progress-bar {
          height: 100%;
          border-radius: 9999px;
          transition: width 0.3s ease;
        }

        .progress-value {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
          min-width: 3rem;
          text-align: right;
        }
      `}</style>
    </div>
  );
}; 