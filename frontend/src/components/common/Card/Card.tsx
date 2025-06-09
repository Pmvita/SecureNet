import * as React from 'react';
import { cn } from '@/lib/utils';
import type { CardProps } from './Card.types';
import { cardVariants } from './Card.variants';

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({
    className,
    variant,
    padding,
    radius,
    shadow,
    border,
    interactive = false,
    disabled = false,
    isLoading = false,
    selected = false,
    fullWidth = false,
    children,
    'data-testid': dataTestId,
    'data-cy': dataCy,
    'data-role': dataRole,
    'data-variant': dataVariant,
    'data-padding': dataPadding,
    'data-radius': dataRadius,
    'data-shadow': dataShadow,
    'data-border': dataBorder,
    'data-interactive': dataInteractive,
    'data-disabled': dataDisabled,
    'data-loading': dataLoading,
    'data-selected': dataSelected,
    'data-full-width': dataFullWidth,
    ...props
  }, ref) => {
    const cardClassName = cn(
      cardVariants({
        variant,
        padding,
        radius,
        shadow,
        border,
        interactive,
        disabled,
        loading: isLoading,
        selected,
        fullWidth,
        className,
      })
    );

    return (
      <div
        ref={ref}
        className={cardClassName}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-disabled={disabled}
        aria-busy={isLoading}
        aria-selected={selected}
        data-testid={dataTestId}
        data-cy={dataCy}
        data-role={dataRole}
        data-variant={dataVariant || variant}
        data-padding={dataPadding || padding}
        data-radius={dataRadius || radius}
        data-shadow={dataShadow || shadow}
        data-border={dataBorder || border}
        data-interactive={dataInteractive ?? interactive}
        data-disabled={dataDisabled ?? disabled}
        data-loading={dataLoading ?? isLoading}
        data-selected={dataSelected ?? selected}
        data-full-width={dataFullWidth ?? fullWidth}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card'; 