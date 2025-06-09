import * as React from 'react';
import { cn } from '@/lib/utils';
import type { CardTitleProps } from './Card.types';

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({
    className,
    as: Component = 'h3',
    children,
    'data-testid': dataTestId,
    ...props
  }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          'text-lg font-semibold leading-none tracking-tight',
          className
        )}
        data-testid={dataTestId}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

CardTitle.displayName = 'CardTitle'; 