import { ReactNode } from 'react';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export const alertStyles = {
  success: {
    container: 'bg-green-500/10 border-green-500/20',
    icon: 'text-green-500',
    title: 'text-green-500',
    message: 'text-green-400',
  },
  error: {
    container: 'bg-red-500/10 border-red-500/20',
    icon: 'text-red-500',
    title: 'text-red-500',
    message: 'text-red-400',
  },
  warning: {
    container: 'bg-yellow-500/10 border-yellow-500/20',
    icon: 'text-yellow-500',
    title: 'text-yellow-500',
    message: 'text-yellow-400',
  },
  info: {
    container: 'bg-blue-500/10 border-blue-500/20',
    icon: 'text-blue-500',
    title: 'text-blue-500',
    message: 'text-blue-400',
  },
} as const;

export interface AlertProps {
  /**
   * The type of alert to display
   */
  type: AlertType;

  /**
   * The title of the alert
   */
  title: string;

  /**
   * Optional message to display below the title
   */
  message?: string;

  /**
   * Callback fired when the close button is clicked
   */
  onClose?: () => void;

  /**
   * Custom class name for the alert container
   */
  className?: string;

  /**
   * Custom class name for the alert title
   */
  titleClassName?: string;

  /**
   * Custom class name for the alert message
   */
  messageClassName?: string;

  /**
   * Custom class name for the alert icon
   */
  iconClassName?: string;

  /**
   * Custom class name for the close button
   */
  closeButtonClassName?: string;
}

export interface AlertGroupProps {
  /**
   * The alerts to display in the group
   */
  children: ReactNode;

  /**
   * Custom class name for the alert group
   */
  className?: string;
} 