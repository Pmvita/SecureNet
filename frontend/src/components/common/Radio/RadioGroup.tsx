import * as React from 'react';
import { cn } from '@/lib/utils';
import type { RadioGroupProps, RadioOption } from './Radio.types';
import { Radio } from './Radio';

export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({
    options,
    value,
    onChange,
    label,
    description,
    error,
    size = 'md',
    required = false,
    className,
    labelClassName,
    descriptionClassName,
    errorClassName,
    optionsClassName,
    optionClassName,
    ...props
  }, ref) => {
    const handleChange = (optionValue: string) => {
      onChange(optionValue);
    };

    return (
      <div
        ref={ref}
        className={cn('flex flex-col gap-4', className)}
        role="radiogroup"
        aria-label={label}
        aria-required={required}
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
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}
        <div className={cn('flex flex-col gap-2', optionsClassName)}>
          {options.map((option) => (
            <Radio
              key={option.value}
              name={props.name}
              value={option.value}
              checked={value === option.value}
              onChange={() => handleChange(option.value)}
              label={option.label}
              description={option.description}
              disabled={option.disabled}
              size={size}
              className={optionClassName}
              required={required}
            />
          ))}
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
    );
  }
);

RadioGroup.displayName = 'RadioGroup'; 