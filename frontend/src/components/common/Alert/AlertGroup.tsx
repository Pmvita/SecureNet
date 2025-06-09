import { cn } from '@/lib/utils';
import type { AlertGroupProps } from './Alert.types';

export function AlertGroup({ children, className }: AlertGroupProps) {
  return (
    <div className={cn('flex flex-col gap-4', className)} role="alertgroup">
      {children}
    </div>
  );
} 