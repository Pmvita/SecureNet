import * as React from 'react';
import { cn } from '@/lib/utils';
import type { CardContentProps } from './Card.types';

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({
    className,
    withPadding = true,
    children,
    'data-testid': dataTestId,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex-1',
          withPadding && 'pt-6',
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

CardContent.displayName = 'CardContent'; 