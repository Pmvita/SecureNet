import * as React from 'react';
import { cn } from '@/lib/utils';
import type { InputGroupProps } from './Input.types';

export const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col gap-4', className)}
      role="group"
      aria-label="Input group"
      {...props}
    >
      {children}
    </div>
  )
);

InputGroup.displayName = 'InputGroup'; 