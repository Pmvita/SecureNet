import * as React from 'react';
import { cn } from '@/lib/utils';
import type { CardDescriptionProps } from './Card.types';

export const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({
    className,
    children,
    'data-testid': dataTestId,
    ...props
  }, ref) => {
    return (
      <p
        ref={ref}
        className={cn(
          'text-sm text-muted-foreground',
          className
        )}
        data-testid={dataTestId}
        {...props}
      >
        {children}
      </p>
    );
  }
);

CardDescription.displayName = 'CardDescription'; 