import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import type { AlertProps, AlertType } from './Alert.types';
import { alertStyles } from './Alert.types';

const icons = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationCircleIcon,
  info: InformationCircleIcon,
} as const;

export function Alert({
  type,
  title,
  message,
  onClose,
  className,
  titleClassName,
  messageClassName,
  iconClassName,
  closeButtonClassName,
}: AlertProps) {
  const Icon = icons[type];
  const style = alertStyles[type];

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        style.container,
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <Icon
          className={cn('h-5 w-5 flex-shrink-0', style.icon, iconClassName)}
          aria-hidden="true"
        />
        <div className="flex-1">
          <h3
            className={cn(
              'text-sm font-medium',
              style.title,
              titleClassName
            )}
          >
            {title}
          </h3>
          {message && (
            <p
              className={cn(
                'mt-1 text-sm',
                style.message,
                messageClassName
              )}
            >
              {message}
            </p>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            className={cn(
              'ml-auto flex-shrink-0 rounded-lg p-1 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500',
              closeButtonClassName
            )}
            onClick={onClose}
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
} 