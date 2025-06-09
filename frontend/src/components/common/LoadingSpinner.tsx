import React from 'react';
import type { BaseProps } from '@/types';

export interface LoadingSpinnerProps extends BaseProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'light';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'default',
  className,
  ...props
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'width: 1rem; height: 1rem; border-width: 2px;';
      case 'lg':
        return 'width: 2.5rem; height: 2.5rem; border-width: 3px;';
      default:
        return 'width: 1.5rem; height: 1.5rem; border-width: 2px;';
    }
  };

  const getVariantColor = () => {
    switch (variant) {
      case 'primary':
        return 'var(--primary-color)';
      case 'light':
        return 'white';
      default:
        return 'var(--text-secondary)';
    }
  };

  return (
    <div
      className={`loading-spinner ${className || ''}`}
      role="status"
      aria-label="Loading"
      {...props}
    >
      <style>{`
        .loading-spinner {
          display: inline-block;
          border: 2px solid transparent;
          border-top-color: ${getVariantColor()};
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          ${getSizeStyles()}
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}; 