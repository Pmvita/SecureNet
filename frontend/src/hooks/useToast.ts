import { useCallback } from 'react';
import { useNotifications } from './useNotifications';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const useToast = () => {
  const { addNotification } = useNotifications();

  const toast = useCallback(
    ({ title, description, variant = 'info', duration = 5000, action }: ToastOptions) => {
      addNotification(description || '', {
        type: variant,
        title,
        duration,
      });
    },
    [addNotification]
  );

  return { toast };
}; 