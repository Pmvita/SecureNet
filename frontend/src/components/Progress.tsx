import { cn } from '../lib/utils';

export interface ProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  showValue?: boolean;
  className?: string;
  barClassName?: string;
  valueClassName?: string;
}

const sizeClasses = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

const variantClasses = {
  primary: 'bg-primary-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
};

export function Progress({
  value,
  max = 100,
  size = 'md',
  variant = 'primary',
  showValue = false,
  className,
  barClassName,
  valueClassName,
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn('relative w-full', className)}>
      <div
        className={cn(
          'w-full overflow-hidden rounded-full bg-gray-700',
          sizeClasses[size]
        )}
      >
        <div
          className={cn(
            'flex h-full items-center justify-center rounded-full transition-all duration-300 ease-in-out',
            variantClasses[variant],
            barClassName
          )}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        >
          {showValue && (
            <span
              className={cn(
                'text-xs font-medium text-white',
                percentage > 50 ? 'text-white' : 'text-gray-900',
                valueClassName
              )}
            >
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export interface CircularProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  showValue?: boolean;
  className?: string;
  circleClassName?: string;
  valueClassName?: string;
}

const circleSizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

export function CircularProgress({
  value,
  max = 100,
  size = 'md',
  variant = 'primary',
  showValue = false,
  className,
  circleClassName,
  valueClassName,
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = size === 'sm' ? 14 : size === 'md' ? 20 : 26;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn('relative inline-flex', circleSizeClasses[size], className)}>
      <svg
        className="transform -rotate-90"
        width={size === 'sm' ? 32 : size === 'md' ? 48 : 64}
        height={size === 'sm' ? 32 : size === 'md' ? 48 : 64}
      >
        <circle
          className="stroke-gray-700"
          strokeWidth={size === 'sm' ? 2 : size === 'md' ? 3 : 4}
          fill="none"
          r={radius}
          cx={size === 'sm' ? 16 : size === 'md' ? 24 : 32}
          cy={size === 'sm' ? 16 : size === 'md' ? 24 : 32}
        />
        <circle
          className={cn(
            'transition-all duration-300 ease-in-out',
            variantClasses[variant],
            circleClassName
          )}
          strokeWidth={size === 'sm' ? 2 : size === 'md' ? 3 : 4}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          r={radius}
          cx={size === 'sm' ? 16 : size === 'md' ? 24 : 32}
          cy={size === 'sm' ? 16 : size === 'md' ? 24 : 32}
        />
      </svg>
      {showValue && (
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center text-xs font-medium',
            valueClassName
          )}
        >
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

const spinnerSizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function Spinner({
  size = 'md',
  variant = 'primary',
  className,
}: SpinnerProps) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-gray-700',
        variantClasses[variant],
        'border-t-transparent',
        spinnerSizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
} 