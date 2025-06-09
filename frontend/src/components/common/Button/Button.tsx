import * as React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { ButtonProps, IconProps } from './Button.types';
import { buttonVariants } from './Button.variants';

const renderIcon = (icon: React.ReactNode | IconProps, className?: string) => {
  if (!icon) return null;

  if (React.isValidElement(icon)) {
    return <span className={className}>{icon}</span>;
  }

  if (typeof icon === 'object' && 'icon' in icon) {
    const IconComponent = icon.icon;
    return (
      <IconComponent
        className={cn('h-4 w-4', className)}
        {...icon.iconProps}
        aria-hidden="true"
      />
    );
  }

  return null;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant,
    size,
    asChild = false,
    isLoading = false,
    leftIcon,
    rightIcon,
    children,
    disabled = false,
    fullWidth = false,
    href,
    to,
    type = 'button',
    'aria-label': ariaLabel,
    'data-testid': dataTestId,
    'data-cy': dataCy,
    'data-role': dataRole,
    'data-variant': dataVariant,
    'data-size': dataSize,
    'data-loading': dataLoading,
    'data-disabled': dataDisabled,
    'data-full-width': dataFullWidth,
    ...props
  }, ref) => {
    const Comp = asChild
      ? React.Fragment
      : to
      ? (Link as React.ComponentType<React.ComponentProps<typeof Link>>)
      : href
      ? 'a'
      : 'button';

    const buttonRef = React.useCallback(
      (node: HTMLButtonElement | HTMLAnchorElement | null) => {
        if (typeof ref === 'function') {
          ref(node as HTMLButtonElement);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node as HTMLButtonElement;
        }
      },
      [ref]
    );

    const isDisabled = disabled || isLoading;

    const buttonClassName = cn(
      buttonVariants({
        variant,
        size,
        fullWidth,
        isLoading,
        isDisabled,
        className,
      })
    );

    const content = (
      <>
        {isLoading && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          </div>
        )}
        {!isLoading && renderIcon(leftIcon, 'mr-2')}
        <span className={cn(isLoading && 'invisible')}>{children}</span>
        {!isLoading && renderIcon(rightIcon, 'ml-2')}
      </>
    );

    const buttonProps = {
      ref: buttonRef,
      className: buttonClassName,
      href,
      to,
      type,
      disabled: isDisabled,
      'aria-label': ariaLabel || (typeof children === 'string' ? children : undefined),
      'aria-disabled': isDisabled,
      'aria-busy': isLoading,
      'data-testid': dataTestId,
      'data-cy': dataCy,
      'data-role': dataRole,
      'data-variant': dataVariant || variant,
      'data-size': dataSize || size,
      'data-loading': dataLoading ?? isLoading,
      'data-disabled': dataDisabled ?? isDisabled,
      'data-full-width': dataFullWidth ?? fullWidth,
      ...props,
    };

    if (asChild) {
      return <>{content}</>;
    }

    return <Comp {...buttonProps}>{content}</Comp>;
  }
);

Button.displayName = 'Button'; 