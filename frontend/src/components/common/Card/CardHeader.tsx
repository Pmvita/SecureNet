import * as React from 'react';
import { cn } from '@/lib/utils';
import type { CardHeaderProps } from './Card.types';

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({
    className,
    withBorder = true,
    children,
    'data-testid': dataTestId,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col space-y-1.5',
          withBorder && 'border-b border-border pb-4',
          className
        )}
        data-testid={dataTestId}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader'; 