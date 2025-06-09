import React, { forwardRef } from 'react';
import type { TabItem } from './Tabs.types';
import { Badge } from '@/components/common/Badge/Badge';
import styles from './Tabs.module.css';
import clsx from 'clsx';

interface TabButtonProps {
  item: TabItem;
  isActive: boolean;
  isDisabled: boolean;
  onClick: (id: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => void;
  index: number;
  variant: 'line' | 'enclosed' | 'soft-rounded' | 'solid-rounded';
  size: 'sm' | 'md' | 'lg';
  position: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const TabButton = forwardRef<HTMLButtonElement, TabButtonProps>(({
  item,
  isActive,
  isDisabled,
  onClick,
  onKeyDown,
  index,
  variant,
  size,
  position,
  className,
}, ref) => {
  const buttonClasses = clsx(
    styles.tabButton,
    styles[`tabButton${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
    styles[`tabButton${size.charAt(0).toUpperCase() + size.slice(1)}`],
    styles[`tabButton${position.charAt(0).toUpperCase() + position.slice(1)}`],
    isActive && styles[`tabButton${variant.charAt(0).toUpperCase() + variant.slice(1)}Active`],
    isActive && styles[`tabButton${position.charAt(0).toUpperCase() + position.slice(1)}Active`],
    isActive && styles.tabButtonActive,
    isDisabled && styles.tabButtonDisabled,
    className
  );

  return (
    <button
      ref={ref}
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${item.id}`}
      id={`tab-${item.id}`}
      tabIndex={isActive ? 0 : -1}
      disabled={isDisabled}
      aria-disabled={isDisabled ? 'true' : undefined}
      onClick={() => onClick(item.id)}
      onKeyDown={(e) => onKeyDown(e, index)}
      className={buttonClasses}
    >
      {item.icon && <span className={styles.tabIcon}>{item.icon}</span>}
      <span className={styles.tabLabel}>{item.label}</span>
      {item.badge && (
        <Badge
          variant={item.badge.variant || 'default'}
          size="sm"
          label={item.badge.label}
          className={styles.tabBadge}
        />
      )}
    </button>
  );
});

TabButton.displayName = 'TabButton'; 