import * as React from 'react';
import { cn } from '@/lib/utils';
import type { CheckboxGroupProps } from './Checkbox.types';

export const CheckboxGroup = React.forwardRef<HTMLDivElement, CheckboxGroupProps>(
  ({
    children,
    label,
    description,
    error,
    className,
    labelClassName,
    descriptionClassName,
    errorClassName,
    ...props
  }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col gap-4', className)}
      role="group"
      aria-label={label}
      {...props}
    >
      {label && (
        <label
          className={cn(
            'text-sm font-medium text-gray-200',
            labelClassName
          )}
        >
          {label}
        </label>
      )}
      <div className="flex flex-col gap-2">
        {children}
      </div>
      {description && !error && (
        <p
          className={cn(
            'text-sm text-gray-400',
            descriptionClassName
          )}
        >
          {description}
        </p>
      )}
      {error && (
        <p
          className={cn(
            'text-sm text-red-500',
            errorClassName
          )}
        >
          {error}
        </p>
      )}
    </div>
  )
);

CheckboxGroup.displayName = 'CheckboxGroup'; 