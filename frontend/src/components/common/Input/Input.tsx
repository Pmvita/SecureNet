import * as React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import type { InputProps } from './Input.types';
import { sizeClasses } from './Input.types';

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    type = 'text',
    label,
    description,
    error,
    size = 'md',
    required = false,
    disabled = false,
    readOnly = false,
    startIcon,
    endIcon,
    clearable = false,
    className,
    labelClassName,
    descriptionClassName,
    errorClassName,
    inputClassName,
    wrapperClassName,
    labelWrapperClassName,
    descriptionWrapperClassName,
    errorWrapperClassName,
    iconWrapperClassName,
    startIconClassName,
    endIconClassName,
    clearClassName,
    clearWrapperClassName,
    clearIconClassName,
    clearHoverClassName,
    clearFocusClassName,
    clearActiveClassName,
    clearDisabledClassName,
    clearIconWrapperClassName,
    clearIconHoverClassName,
    clearIconFocusClassName,
    clearIconActiveClassName,
    clearIconDisabledClassName,
    ...props
  }, ref) => {
    const [value, setValue] = React.useState(props.value || props.defaultValue || '');
    const sizeClass = sizeClasses[size];

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setValue(event.target.value);
      props.onChange?.(event);
    };

    const handleClear = (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const input = event.currentTarget.parentElement?.querySelector('input');
      if (input) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(input, '');
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }

      setValue('');
      props.onChange?.({
        target: { value: '' },
      } as React.ChangeEvent<HTMLInputElement>);
    };

    return (
      <div
        className={cn('relative', wrapperClassName)}
      >
        {(label || description) && (
          <div className={cn('mb-2', labelWrapperClassName)}>
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

        <div className="relative">
          {startIcon && (
            <div
              className={cn(
                'absolute inset-y-0 left-0 flex items-center pl-3',
                iconWrapperClassName
              )}
            >
              <span
                className={cn(
                  'text-gray-400',
                  startIconClassName
                )}
              >
                {startIcon}
              </span>
            </div>
          )}

          <input
            ref={ref}
            type={type}
            className={cn(
              'w-full rounded-lg border bg-gray-800 text-gray-100 placeholder-gray-400 transition-colors',
              sizeClass.input,
              startIcon && 'pl-10',
              (endIcon || (clearable && value)) && 'pr-10',
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-600 hover:border-gray-500 focus:border-primary-500 focus:ring-primary-500/20',
              disabled && 'cursor-not-allowed opacity-50',
              readOnly && 'cursor-default',
              inputClassName
            )}
            disabled={disabled}
            readOnly={readOnly}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error
                ? `${props.id}-error`
                : description
                ? `${props.id}-description`
                : undefined
            }
            {...props}
            value={value}
            onChange={handleChange}
          />

          {endIcon && !(clearable && value) && (
            <div
              className={cn(
                'absolute inset-y-0 right-0 flex items-center pr-3',
                iconWrapperClassName
              )}
            >
              <span
                className={cn(
                  'text-gray-400',
                  endIconClassName
                )}
              >
                {endIcon}
              </span>
            </div>
          )}

          {clearable && value && (
            <div
              className={cn(
                'absolute inset-y-0 right-0 flex items-center pr-3',
                clearWrapperClassName
              )}
            >
              <button
                type="button"
                className={cn(
                  'rounded-full p-1 text-gray-400 hover:text-gray-200',
                  disabled && 'cursor-not-allowed opacity-50',
                  clearClassName
                )}
                onClick={handleClear}
                disabled={disabled}
                aria-label="Clear input"
              >
                <XMarkIcon
                  className={cn(
                    'h-4 w-4',
                    clearIconClassName
                  )}
                />
              </button>
            </div>
          )}
        </div>

        {error && (
          <div
            className={cn('mt-1', errorWrapperClassName)}
          >
            <p
              id={props.id ? `${props.id}-error` : undefined}
              className={cn(
                'text-sm text-red-500',
                errorClassName
              )}
            >
              {error}
            </p>
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input'; 