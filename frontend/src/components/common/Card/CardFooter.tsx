import * as React from 'react';
import { cn } from '@/lib/utils';
import type { CardFooterProps } from './Card.types';

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
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
          'flex items-center justify-between',
          withBorder && 'border-t border-border pt-4',
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

CardFooter.displayName = 'CardFooter'; 