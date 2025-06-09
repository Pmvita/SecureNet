import * as React from 'react';
import { cn } from '@/lib/utils';
import type { TextareaProps } from './Textarea.types';
import { sizeClasses } from './Textarea.types';

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    label,
    description,
    error,
    size = 'md',
    className,
    labelClassName,
    descriptionClassName,
    errorClassName,
    textareaClassName,
    wrapperClassName,
    disabled,
    required,
    ...props
  }, ref) => {
    const sizeClass = sizeClasses[size];

    return (
      <div className={cn('relative', className)}>
        {(label || description) && (
          <div className="mb-2">
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
          </div>
        )}
        <div className={cn('relative', wrapperClassName)}>
          <textarea
            ref={ref}
            className={cn(
              'w-full rounded-lg border bg-gray-800 text-gray-100 placeholder-gray-400 transition-colors',
              sizeClass.textarea,
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-600 hover:border-gray-500 focus:border-primary-500 focus:ring-primary-500/20',
              disabled && 'cursor-not-allowed opacity-50',
              textareaClassName
            )}
            disabled={disabled}
            required={required}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error
                ? `${props.id}-error`
                : description
                ? `${props.id}-description`
                : undefined
            }
            {...props}
          />
        </div>
        {error && (
          <p
            id={props.id ? `${props.id}-error` : undefined}
            className={cn(
              'mt-1 text-sm text-red-500',
              errorClassName
            )}
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea'; 