import * as React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/solid';
import { cn } from '@/lib/utils';
import type { ToastProps, ToastVariant } from './Toast.types';
import { variantClasses } from './Toast.types';

const variantIcons: Record<ToastVariant, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  success: CheckCircleIcon,
  error: ExclamationCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
};

export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({
    title,
    message,
    variant = 'info',
    isVisible = true,
    dismissible = true,
    duration = 5000,
    icon,
    action,
    onDismiss,
    className,
    titleClassName,
    messageClassName,
    iconClassName,
    closeClassName,
    actionClassName,
    wrapperClassName,
    contentWrapperClassName,
    iconWrapperClassName,
    closeWrapperClassName,
    actionWrapperClassName,
    titleWrapperClassName,
    messageWrapperClassName,
    progressClassName,
    progressWrapperClassName,
    progressTrackClassName,
    progressFillClassName,
    ...props
  }, ref) => {
    const [progress, setProgress] = React.useState(100);
    const [isExiting, setIsExiting] = React.useState(false);
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const progressRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const variantClass = variantClasses[variant];
    const DefaultIcon = variantIcons[variant];

    React.useEffect(() => {
      if (!isVisible) {
        setIsExiting(true);
        const timer = setTimeout(() => {
          onDismiss?.();
        }, 300); // Match the transition duration
        return () => clearTimeout(timer);
      }
    }, [isVisible, onDismiss]);

    React.useEffect(() => {
      if (duration > 0) {
        const startTime = Date.now();
        const endTime = startTime + duration;

        const updateProgress = () => {
          const now = Date.now();
          const remaining = endTime - now;
          const newProgress = (remaining / duration) * 100;

          if (newProgress <= 0) {
            setProgress(0);
            setIsExiting(true);
            setTimeout(() => {
              onDismiss?.();
            }, 300); // Match the transition duration
            return;
          }

          setProgress(newProgress);
          progressRef.current = setTimeout(updateProgress, 10);
        };

        progressRef.current = setTimeout(updateProgress, 10);

        timeoutRef.current = setTimeout(() => {
          setIsExiting(true);
          setTimeout(() => {
            onDismiss?.();
          }, 300); // Match the transition duration
        }, duration);

        return () => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          if (progressRef.current) {
            clearTimeout(progressRef.current);
          }
        };
      }
    }, [duration, onDismiss]);

    const handleDismiss = () => {
      setIsExiting(true);
      setTimeout(() => {
        onDismiss?.();
      }, 300); // Match the transition duration
    };

    if (!isVisible && !isExiting) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(
          'relative w-full max-w-sm transform overflow-hidden rounded-lg border shadow-lg transition-all duration-300 ease-in-out',
          variantClass.container,
          isExiting ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100',
          wrapperClassName
        )}
        role="alert"
        aria-live="assertive"
        {...props}
      >
        <div className={cn('flex p-4', contentWrapperClassName)}>
          <div className={cn('mr-3 flex-shrink-0', iconWrapperClassName)}>
            {icon ? (
              React.isValidElement(icon) ? (
                icon
              ) : (
                <DefaultIcon
                  className={cn('h-5 w-5', variantClass.icon, iconClassName)}
                  aria-hidden="true"
                />
              )
            ) : (
              <DefaultIcon
                className={cn('h-5 w-5', variantClass.icon, iconClassName)}
                aria-hidden="true"
              />
            )}
          </div>

          <div className="flex-1">
            {title && (
              <div className={cn('font-medium', titleWrapperClassName)}>
                <h3 className={cn(titleClassName)}>
                  {title}
                </h3>
              </div>
            )}
            {message && (
              <div className={cn('mt-1', messageWrapperClassName)}>
                <p className={cn('text-sm', messageClassName)}>
                  {message}
                </p>
              </div>
            )}
            {action && (
              <div className={cn('mt-3', actionWrapperClassName)}>
                {action}
              </div>
            )}
          </div>

          {dismissible && (
            <div className={cn('ml-4 flex-shrink-0', closeWrapperClassName)}>
              <button
                type="button"
                className={cn(
                  'inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2',
                  variantClass.close,
                  closeClassName
                )}
                onClick={handleDismiss}
                aria-label="Dismiss"
              >
                <XMarkIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {duration > 0 && (
          <div
            className={cn(
              'h-1 w-full bg-gray-200/20',
              progressWrapperClassName
            )}
          >
            <div
              className={cn(
                'h-full transition-all duration-100 ease-linear',
                variantClass.container,
                progressTrackClassName
              )}
            >
              <div
                className={cn(
                  'h-full',
                  progressFillClassName
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }
);

Toast.displayName = 'Toast'; 