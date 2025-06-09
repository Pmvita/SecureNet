import React from 'react';
import type { BaseProps } from '@/types';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps extends BaseProps {
  title?: string;
  message: string;
  variant?: AlertVariant;
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const Alert: React.FC<AlertProps> = ({
  title,
  message,
  variant = 'info',
  onClose,
  action,
  className,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return `
          background-color: var(--success-light);
          border-color: var(--success);
          color: var(--success-dark);
        `;
      case 'warning':
        return `
          background-color: var(--warning-light);
          border-color: var(--warning);
          color: var(--warning-dark);
        `;
      case 'error':
        return `
          background-color: var(--error-light);
          border-color: var(--error);
          color: var(--error-dark);
        `;
      default:
        return `
          background-color: var(--info-light);
          border-color: var(--info);
          color: var(--info-dark);
        `;
    }
  };

  return (
    <div
      className={`alert ${className || ''}`}
      role="alert"
      {...props}
    >
      <div className="alert-content">
        {title && <h4 className="alert-title">{title}</h4>}
        <p className="alert-message">{message}</p>
      </div>
      <div className="alert-actions">
        {action && (
          <button
            type="button"
            className="alert-action"
            onClick={action.onClick}
          >
            {action.label}
          </button>
        )}
        {onClose && (
          <button
            type="button"
            className="alert-close"
            onClick={onClose}
            aria-label="Close alert"
          >
            ×
          </button>
        )}
      </div>
      <style>{`
        .alert {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 1rem;
          border: 1px solid;
          border-radius: 0.5rem;
          ${getVariantStyles()}
        }

        .alert-content {
          flex: 1;
          min-width: 0;
        }

        .alert-title {
          margin: 0 0 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .alert-message {
          margin: 0;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .alert-actions {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-left: 1rem;
        }

        .alert-action {
          padding: 0.25rem 0.75rem;
          border: 1px solid currentColor;
          border-radius: 0.25rem;
          background: transparent;
          color: currentColor;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s ease;
        }

        .alert-action:hover {
          opacity: 0.8;
        }

        .alert-close {
          padding: 0.25rem;
          border: none;
          background: transparent;
          color: currentColor;
          font-size: 1.25rem;
          line-height: 1;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.2s ease;
        }

        .alert-close:hover {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}; 