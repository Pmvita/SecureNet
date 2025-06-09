import * as React from 'react';
import { cn } from '@/lib/utils';
import type { SelectGroupProps } from './Select.types';

export const SelectGroup = React.forwardRef<HTMLDivElement, SelectGroupProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col gap-4', className)}
      role="group"
      aria-label="Select group"
      {...props}
    >
      {children}
    </div>
  )
);

SelectGroup.displayName = 'SelectGroup'; 