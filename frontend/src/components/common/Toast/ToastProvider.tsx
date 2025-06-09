import * as React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import { Toast } from './Toast';
import type { ToastContextValue, ToastProviderProps, ToastProps } from './Toast.types';
import { positionClasses } from './Toast.types';

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  defaultPosition = 'bottom-right',
  defaultDuration = 5000,
  maxToasts = 5,
  containerClassName,
  stackClassName,
}) => {
  const [toasts, setToasts] = React.useState<(ToastProps & { id: string })[]>([]);

  const show = React.useCallback((props: Omit<ToastProps, 'isVisible'>) => {
    const id = uuidv4();
    setToasts((prevToasts) => {
      const newToasts = [
        ...prevToasts,
        {
          ...props,
          id,
          isVisible: true,
          position: props.position || defaultPosition,
          duration: props.duration ?? defaultDuration,
        },
      ];

      if (newToasts.length > maxToasts) {
        return newToasts.slice(-maxToasts);
      }

      return newToasts;
    });
  }, [defaultPosition, defaultDuration, maxToasts]);

  const hide = React.useCallback((id: string) => {
    setToasts((prevToasts) =>
      prevToasts.map((toast) =>
        toast.id === id ? { ...toast, isVisible: false } : toast
      )
    );
  }, []);

  const hideAll = React.useCallback(() => {
    setToasts((prevToasts) =>
      prevToasts.map((toast) => ({ ...toast, isVisible: false }))
    );
  }, []);

  const remove = React.useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  const contextValue = React.useMemo(
    () => ({
      show,
      hide,
      hideAll,
    }),
    [show, hide, hideAll]
  );

  // Group toasts by position
  const toastsByPosition = React.useMemo(() => {
    const groups: Record<string, (ToastProps & { id: string })[]> = {};
    toasts.forEach((toast) => {
      const position = toast.position || defaultPosition;
      if (!groups[position]) {
        groups[position] = [];
      }
      groups[position].push(toast);
    });
    return groups;
  }, [toasts, defaultPosition]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        className={cn(
          'fixed inset-0 z-50 pointer-events-none',
          containerClassName
        )}
      >
        {Object.entries(toastsByPosition).map(([position, positionToasts]) => (
          <div
            key={position}
            className={cn(
              'fixed flex flex-col gap-2',
              positionClasses[position as keyof typeof positionClasses],
              stackClassName
            )}
          >
            {positionToasts.map((toast) => (
              <Toast
                key={toast.id}
                {...toast}
                onDismiss={() => {
                  hide(toast.id);
                  setTimeout(() => remove(toast.id), 300); // Wait for exit animation
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

ToastProvider.displayName = 'ToastProvider'; 