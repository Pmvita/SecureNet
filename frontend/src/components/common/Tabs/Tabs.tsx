import React, { useState, useCallback, useRef, useMemo, memo } from 'react';
import type { TabsProps, TabItem, TabVariant, TabSize, TabPosition } from './Tabs.types';
import { Badge } from '@/components/common/Badge/Badge';
import type { BadgeProps } from '@/components/common/Badge/Badge.types';
import { LoadingSpinner } from '../LoadingSpinner';
import { TabButton } from './TabButton';
import { ErrorBoundary } from '../ErrorBoundary';
import type { ErrorBoundaryProps } from '../ErrorBoundary/ErrorBoundary';
import styles from './Tabs.module.css';
import clsx from 'clsx';

// Memoized tab content component to prevent unnecessary re-renders
const TabContent = memo<{
  content: React.ReactNode;
  isLoading: boolean;
  className: string;
}>(({ content, isLoading, className }) => (
  <div
    role="tabpanel"
    className={className}
  >
    {isLoading ? (
      <div className={styles.tabLoading}>
        <LoadingSpinner size="md" />
      </div>
    ) : (
      content
    )}
  </div>
));

TabContent.displayName = 'TabContent';

// Memoized preserved content component
const PreservedContent = memo<{
  items: TabItem[];
  activeTab: string;
}>(({ items, activeTab }) => (
  <>
    {items.map(item => (
      <div
        key={item.id}
        style={{ display: item.id === activeTab ? 'block' : 'none' }}
      >
        {item.content}
      </div>
    ))}
  </>
));

PreservedContent.displayName = 'PreservedContent';

/**
 * Tabs component for organizing content into separate views
 * 
 * @example
 * ```tsx
 * <Tabs
 *   items={[
 *     { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
 *     { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div> }
 *   ]}
 * />
 * ```
 */
export const Tabs = memo<TabsProps>(({
  items,
  activeTab: controlledActiveTab,
  onChange,
  variant = 'line',
  size = 'md',
  position = 'top',
  bordered = false,
  showLine = true,
  fullWidth = false,
  tabsClassName,
  tabClassName,
  contentClassName,
  disabled = false,
  isLoading = false,
  preserveContent = false,
  className,
  ...props
}) => {
  // Validate items prop
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Tabs component requires a non-empty array of items');
  }

  // Validate item IDs are unique
  const itemIds = useMemo(() => new Set(items.map(item => item.id)), [items]);
  if (itemIds.size !== items.length) {
    throw new Error('Tabs component requires unique IDs for each item');
  }

  const [uncontrolledActiveTab, setUncontrolledActiveTab] = useState(items[0]?.id);
  const isControlled = controlledActiveTab !== undefined;
  const activeTab = isControlled ? controlledActiveTab : uncontrolledActiveTab;
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Validate controlled activeTab
  if (isControlled && !items.some(item => item.id === controlledActiveTab)) {
    throw new Error('Controlled activeTab must match one of the item IDs');
  }

  const handleTabChange = useCallback((tabId: string) => {
    if (disabled) return;
    if (!isControlled) {
      setUncontrolledActiveTab(tabId);
    }
    onChange?.(tabId);
  }, [disabled, isControlled, onChange]);

  // Keyboard navigation handler
  const handleTabKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    const enabledTabs = items.filter(item => !item.disabled && !disabled);
    const enabledIndexes = items.map((item, i) => (!item.disabled && !disabled ? i : null)).filter(i => i !== null) as number[];
    const currentEnabledIdx = enabledIndexes.indexOf(idx);
    let nextIdx = idx;

    if (event.key === 'ArrowRight') {
      nextIdx = enabledIndexes[(currentEnabledIdx + 1) % enabledIndexes.length];
      event.preventDefault();
      tabRefs.current[nextIdx]?.focus();
    } else if (event.key === 'ArrowLeft') {
      nextIdx = enabledIndexes[(currentEnabledIdx - 1 + enabledIndexes.length) % enabledIndexes.length];
      event.preventDefault();
      tabRefs.current[nextIdx]?.focus();
    } else if (event.key === 'Home') {
      nextIdx = enabledIndexes[0];
      event.preventDefault();
      tabRefs.current[nextIdx]?.focus();
    } else if (event.key === 'End') {
      nextIdx = enabledIndexes[enabledIndexes.length - 1];
      event.preventDefault();
      tabRefs.current[nextIdx]?.focus();
    }
  }, [items, disabled]);

  const containerClasses = useMemo(() => clsx(
    styles.tabsContainer,
    styles[`tabsContainer${position.charAt(0).toUpperCase() + position.slice(1)}`],
    className
  ), [position, className]);

  const tabsListClasses = useMemo(() => clsx(
    styles.tabsList,
    styles[`tabsList${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
    styles[`tabsList${position.charAt(0).toUpperCase() + position.slice(1)}`],
    fullWidth && styles.tabsListFullWidth,
    tabsClassName
  ), [variant, position, fullWidth, tabsClassName]);

  const contentClasses = useMemo(() => clsx(
    styles.tabContent,
    bordered && styles.tabContentBordered,
    contentClassName
  ), [bordered, contentClassName]);

  const activeContent = useMemo(() => 
    items.find(item => item.id === activeTab)?.content,
    [items, activeTab]
  );

  const errorBoundaryProps: ErrorBoundaryProps = useMemo(() => ({
    children: (
      <div
        className={containerClasses}
        role="tablist"
        {...props}
      >
        <div className={tabsListClasses}>
          {items.map((item, idx) => (
            <TabButton
              key={item.id}
              ref={(el: HTMLButtonElement | null) => {
                if (tabRefs.current) {
                  tabRefs.current[idx] = el;
                }
              }}
              item={item}
              isActive={item.id === activeTab}
              isDisabled={Boolean(disabled || item.disabled)}
              onClick={handleTabChange}
              onKeyDown={handleTabKeyDown}
              index={idx}
              variant={variant}
              size={size}
              position={position}
              className={tabClassName}
            />
          ))}
        </div>
        {preserveContent ? (
          <PreservedContent items={items} activeTab={activeTab} />
        ) : (
          <TabContent
            content={activeContent}
            isLoading={isLoading}
            className={contentClasses}
          />
        )}
      </div>
    ),
    fallback: (
      <div className={styles.errorContainer} role="alert">
        <p>Failed to render tabs. Please check the console for more details.</p>
      </div>
    ),
    resetOnPropsChange: true,
  }), [containerClasses, tabsListClasses, items, activeTab, disabled, handleTabChange, handleTabKeyDown, variant, size, position, tabClassName, preserveContent, isLoading, contentClasses, activeContent, props]);

  return (
    <ErrorBoundary {...errorBoundaryProps} />
  );
});

Tabs.displayName = 'Tabs'; 