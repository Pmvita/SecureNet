import { cn } from '@/lib/utils';
import type { ToastContainerProps } from './Toast.types';
import { Toast } from './Toast';

export function ToastContainer({
  toasts,
  onClose,
  className,
}: ToastContainerProps) {
  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 flex flex-col gap-2',
        className
      )}
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
} 