import React from 'react';
import { Button } from '@/components/common/Button';
import type { BaseProps } from '../../types';

interface PageHeaderProps extends BaseProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
  onBack?: () => void;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumbs,
  onBack,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header className={`page-header ${className || ''}`} {...props}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="page-header-breadcrumbs" aria-label="Breadcrumb">
          <ol>
            {breadcrumbs.map((crumb, index) => (
              <li key={index}>
                {crumb.href ? (
                  <a href={crumb.href}>{crumb.label}</a>
                ) : (
                  <span>{crumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 && (
                  <span className="breadcrumb-separator">/</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="page-header-content">
        <div className="page-header-title-group">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="back-button"
            >
              ← Back
            </Button>
          )}
          <div>
            <h1 className="page-header-title">{title}</h1>
            {subtitle && (
              <p className="page-header-subtitle">{subtitle}</p>
            )}
          </div>
        </div>

        {actions && (
          <div className="page-header-actions">
            {actions}
          </div>
        )}
      </div>

      <style>{`
        .page-header {
          margin-bottom: 2rem;
        }

        .page-header-breadcrumbs {
          margin-bottom: 1rem;
        }

        .page-header-breadcrumbs ol {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
          padding: 0;
          list-style: none;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .page-header-breadcrumbs a {
          color: var(--text-secondary);
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .page-header-breadcrumbs a:hover {
          color: var(--text-primary);
        }

        .breadcrumb-separator {
          color: var(--border-color);
        }

        .page-header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }

        .page-header-title-group {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }

        .back-button {
          margin-top: 0.25rem;
        }

        .page-header-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.2;
        }

        .page-header-subtitle {
          margin: 0.5rem 0 0;
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .page-header-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        @media (max-width: 640px) {
          .page-header-content {
            flex-direction: column;
            align-items: stretch;
          }

          .page-header-actions {
            margin-top: 1rem;
          }
        }
      `}</style>
    </header>
  );
} 