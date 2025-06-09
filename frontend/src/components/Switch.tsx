import { cn } from '../lib/utils';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  labelClassName?: string;
  descriptionClassName?: string;
}

const sizeClasses = {
  sm: {
    switch: 'h-4 w-7',
    thumb: 'h-3 w-3',
    translate: 'translate-x-3',
  },
  md: {
    switch: 'h-5 w-9',
    thumb: 'h-4 w-4',
    translate: 'translate-x-4',
  },
  lg: {
    switch: 'h-6 w-11',
    thumb: 'h-5 w-5',
    translate: 'translate-x-5',
  },
};

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  className,
  labelClassName,
  descriptionClassName,
}: SwitchProps) {
  const sizeClass = sizeClasses[size];

  return (
    <label
      className={cn(
        'inline-flex items-start gap-3',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <div className="relative inline-flex flex-shrink-0">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <div
          className={cn(
            'relative inline-flex cursor-pointer rounded-full transition-colors duration-200 ease-in-out',
            sizeClass.switch,
            checked
              ? 'bg-primary-500'
              : 'bg-gray-600 peer-focus:ring-2 peer-focus:ring-primary-500/20',
            disabled && 'cursor-not-allowed'
          )}
        >
          <div
            className={cn(
              'pointer-events-none absolute left-0.5 top-0.5 inline-block transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out',
              sizeClass.thumb,
              checked && sizeClass.translate
            )}
          />
        </div>
      </div>
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span
              className={cn(
                'text-sm font-medium text-gray-200',
                labelClassName
              )}
            >
              {label}
            </span>
          )}
          {description && (
            <span
              className={cn(
                'text-sm text-gray-400',
                descriptionClassName
              )}
            >
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  );
}

export interface SwitchGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function SwitchGroup({ children, className }: SwitchGroupProps) {
  return (
    <div
      className={cn('flex flex-col gap-4', className)}
      role="group"
      aria-label="Switch group"
    >
      {children}
    </div>
  );
} 