import * as React from 'react';
import { cn } from '@/lib/utils';
import type { RadioProps } from './Radio.types';
import { sizeClasses } from './Radio.types';

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({
    label,
    description,
    error,
    size = 'md',
    className,
    labelClassName,
    descriptionClassName,
    errorClassName,
    inputClassName,
    wrapperClassName,
    disabled,
    required,
    ...props
  }, ref) => {
    const sizeClass = sizeClasses[size];

    return (
      <div className={cn('relative', className)}>
        <div className={cn('flex items-start gap-3', wrapperClassName)}>
          <div className="flex h-6 items-center">
            <input
              ref={ref}
              type="radio"
              className={cn(
                'border bg-gray-800 text-primary-500 transition-colors',
                sizeClass.radio,
                error
                  ? 'border-red-500 focus:ring-red-500/20'
                  : 'border-gray-600 hover:border-gray-500 focus:ring-primary-500/20',
                disabled && 'cursor-not-allowed opacity-50',
                inputClassName
              )}
              disabled={disabled}
              required={required}
              {...props}
            />
          </div>
          {(label || description) && (
            <div className="flex flex-col">
              {label && (
                <label
                  className={cn(
                    'font-medium text-gray-200',
                    sizeClass.label,
                    disabled && 'cursor-not-allowed opacity-50',
                    labelClassName
                  )}
                >
                  {label}
                  {required && <span className="ml-1 text-red-500">*</span>}
                </label>
              )}
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
          )}
        </div>
      </div>
    );
  }
);

Radio.displayName = 'Radio'; 