import React from 'react';
import { cn } from '@/utils/cn';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  variant?: 'default' | 'compact';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  variant = 'default',
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        variant === 'default' ? 'py-12' : 'py-6',
        className
      )}
      {...props}
    >
      {icon && (
        <div className={cn('mb-4', variant === 'compact' && 'mb-2')}>
          {icon}
        </div>
      )}
      <h3
        className={cn(
          'text-base font-semibold text-gray-900',
          variant === 'compact' && 'text-sm'
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            'mt-1 text-sm text-gray-500',
            variant === 'compact' && 'mt-0.5 text-xs'
          )}
        >
          {description}
        </p>
      )}
      {action && (
        <div className={cn('mt-6', variant === 'compact' && 'mt-4')}>
          {action}
        </div>
      )}
    </div>
  );
}; 