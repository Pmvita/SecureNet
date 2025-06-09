import { cn } from '@/lib/utils';
import type { ModalFooterProps } from './Modal.types';

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      className={cn(
        'mt-4 flex items-center justify-end gap-2 border-t border-gray-700 p-4',
        className
      )}
    >
      {children}
    </div>
  );
} 