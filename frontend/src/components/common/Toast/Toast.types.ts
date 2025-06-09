import { HTMLAttributes, ReactNode } from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export type ToastPosition = 
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export const variantClasses = {
  success: {
    container: 'bg-green-500/10 border-green-500/20 text-green-500',
    icon: 'text-green-500',
    close: 'text-green-500/70 hover:text-green-500 hover:bg-green-500/10',
  },
  error: {
    container: 'bg-red-500/10 border-red-500/20 text-red-500',
    icon: 'text-red-500',
    close: 'text-red-500/70 hover:text-red-500 hover:bg-red-500/10',
  },
  warning: {
    container: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500',
    icon: 'text-yellow-500',
    close: 'text-yellow-500/70 hover:text-yellow-500 hover:bg-yellow-500/10',
  },
  info: {
    container: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
    icon: 'text-blue-500',
    close: 'text-blue-500/70 hover:text-blue-500 hover:bg-blue-500/10',
  },
} as const;

export const positionClasses = {
  'top-left': 'top-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  'bottom-right': 'bottom-4 right-4',
} as const;

export interface ToastProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /**
   * The title of the toast
   */
  title?: string;

  /**
   * The message content of the toast
   */
  message?: string;

  /**
   * The variant of the toast
   * @default 'info'
   */
  variant?: ToastVariant;

  /**
   * The position of the toast
   * @default 'bottom-right'
   */
  position?: ToastPosition;

  /**
   * Whether the toast is visible
   * @default true
   */
  isVisible?: boolean;

  /**
   * Whether the toast can be dismissed
   * @default true
   */
  dismissible?: boolean;

  /**
   * The duration in milliseconds after which the toast will automatically dismiss
   * Set to 0 to disable auto-dismiss
   * @default 5000
   */
  duration?: number;

  /**
   * Icon to display in the toast
   */
  icon?: ReactNode;

  /**
   * Action button to display in the toast
   */
  action?: ReactNode;

  /**
   * Callback fired when the toast is dismissed
   */
  onDismiss?: () => void;

  /**
   * Custom class name for the toast container
   */
  className?: string;

  /**
   * Custom class name for the toast title
   */
  titleClassName?: string;

  /**
   * Custom class name for the toast message
   */
  messageClassName?: string;

  /**
   * Custom class name for the toast icon
   */
  iconClassName?: string;

  /**
   * Custom class name for the toast close button
   */
  closeClassName?: string;

  /**
   * Custom class name for the toast action
   */
  actionClassName?: string;

  /**
   * Custom class name for the toast wrapper
   */
  wrapperClassName?: string;

  /**
   * Custom class name for the toast content wrapper
   */
  contentWrapperClassName?: string;

  /**
   * Custom class name for the toast icon wrapper
   */
  iconWrapperClassName?: string;

  /**
   * Custom class name for the toast close button wrapper
   */
  closeWrapperClassName?: string;

  /**
   * Custom class name for the toast action wrapper
   */
  actionWrapperClassName?: string;

  /**
   * Custom class name for the toast title wrapper
   */
  titleWrapperClassName?: string;

  /**
   * Custom class name for the toast message wrapper
   */
  messageWrapperClassName?: string;

  /**
   * Custom class name for the toast progress bar
   */
  progressClassName?: string;

  /**
   * Custom class name for the toast progress bar wrapper
   */
  progressWrapperClassName?: string;

  /**
   * Custom class name for the toast progress bar track
   */
  progressTrackClassName?: string;

  /**
   * Custom class name for the toast progress bar fill
   */
  progressFillClassName?: string;
}

export interface ToastContextValue {
  /**
   * Show a toast notification
   */
  show: (props: Omit<ToastProps, 'isVisible'>) => void;

  /**
   * Hide a toast notification
   */
  hide: (id: string) => void;

  /**
   * Hide all toast notifications
   */
  hideAll: () => void;
}

export interface ToastProviderProps {
  /**
   * The children to render
   */
  children: ReactNode;

  /**
   * The default position for toasts
   * @default 'bottom-right'
   */
  defaultPosition?: ToastPosition;

  /**
   * The default duration for toasts in milliseconds
   * @default 5000
   */
  defaultDuration?: number;

  /**
   * The maximum number of toasts to show at once
   * @default 5
   */
  maxToasts?: number;

  /**
   * Custom class name for the toast container
   */
  containerClassName?: string;

  /**
   * Custom class name for the toast stack
   */
  stackClassName?: string;
} 