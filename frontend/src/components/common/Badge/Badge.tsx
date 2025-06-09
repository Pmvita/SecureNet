import React from 'react';
import type { BadgeProps, BadgeVariant, BadgeSize } from './Badge.types';

/**
 * Badge component for displaying status, labels, or tags
 * 
 * @example
 * ```tsx
 * <Badge variant="success" label="Active" />
 * <Badge variant="warning" label="Pending" icon="⚠️" removable onRemove={() => {}} />
 * ```
 */
export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  label,
  icon,
  onClick,
  removable,
  onRemove,
  className,
  ...props
}) => {
  const getVariantStyles = (): string => {
    switch (variant) {
      case 'success':
        return `
          background-color: var(--success-light);
          color: var(--success-dark);
          border-color: var(--success);
        `;
      case 'warning':
        return `
          background-color: var(--warning-light);
          color: var(--warning-dark);
          border-color: var(--warning);
        `;
      case 'error':
        return `
          background-color: var(--error-light);
          color: var(--error-dark);
          border-color: var(--error);
        `;
      case 'info':
        return `
          background-color: var(--info-light);
          color: var(--info-dark);
          border-color: var(--info);
        `;
      default:
        return `
          background-color: var(--bg-secondary);
          color: var(--text-primary);
          border-color: var(--border-color);
        `;
    }
  };

  const getSizeStyles = (): string => {
    switch (size) {
      case 'sm':
        return `
          padding: 0.125rem 0.5rem;
          font-size: 0.75rem;
          border-radius: 0.25rem;
        `;
      case 'lg':
        return `
          padding: 0.375rem 0.75rem;
          font-size: 0.875rem;
          border-radius: 0.5rem;
        `;
      default:
        return `
          padding: 0.25rem 0.625rem;
          font-size: 0.75rem;
          border-radius: 0.375rem;
        `;
    }
  };

  return (
    <span
      className={`badge ${className || ''}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      {...props}
    >
      {icon && <span className="badge-icon">{icon}</span>}
      <span className="badge-label">{label}</span>
      {removable && (
        <button
          type="button"
          className="badge-remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          aria-label={`Remove ${label}`}
        >
          ×
        </button>
      )}
      <style>{`
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          border: 1px solid;
          font-weight: 500;
          white-space: nowrap;
          ${getVariantStyles()}
          ${getSizeStyles()}
        }

        .badge[role="button"] {
          cursor: pointer;
          transition: opacity 0.2s ease;
        }

        .badge[role="button"]:hover {
          opacity: 0.8;
        }

        .badge[role="button"]:focus {
          outline: none;
          box-shadow: 0 0 0 2px var(--primary-color-light);
        }

        .badge-icon {
          display: inline-flex;
          align-items: center;
          font-size: 1em;
        }

        .badge-label {
          line-height: 1;
        }

        .badge-remove {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          margin-left: 0.25rem;
          border: none;
          background: transparent;
          color: currentColor;
          font-size: 1.25em;
          line-height: 1;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.2s ease;
        }

        .badge-remove:hover {
          opacity: 1;
        }

        .badge-remove:focus {
          outline: none;
          opacity: 1;
        }
      `}</style>
    </span>
  );
}; 