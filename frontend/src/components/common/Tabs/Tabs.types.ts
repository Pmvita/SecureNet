import type { BaseProps } from '@/types';
import type { ReactNode } from 'react';

export type TabVariant = 'line' | 'enclosed' | 'soft-rounded' | 'solid-rounded';
export type TabSize = 'sm' | 'md' | 'lg';
export type TabPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TabItem {
  /** Unique identifier for the tab */
  id: string;
  /** Label to display in the tab */
  label: string;
  /** Optional icon to display before the label */
  icon?: string;
  /** Content to display when the tab is active */
  content: ReactNode;
  /** Whether the tab is disabled */
  disabled?: boolean;
  /** Optional badge to display on the tab */
  badge?: {
    label: string;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  };
}

export interface TabsProps extends BaseProps {
  /** Array of tab items */
  items: TabItem[];
  /** Currently active tab ID */
  activeTab?: string;
  /** Callback when active tab changes */
  onChange?: (tabId: string) => void;
  /** Visual style of the tabs */
  variant?: TabVariant;
  /** Size of the tabs */
  size?: TabSize;
  /** Position of the tabs relative to content */
  position?: TabPosition;
  /** Whether to show a border around the tabs */
  bordered?: boolean;
  /** Whether to show a line under the active tab */
  showLine?: boolean;
  /** Whether the tabs are full width */
  fullWidth?: boolean;
  /** Custom class name for the tabs container */
  tabsClassName?: string;
  /** Custom class name for the tab buttons */
  tabClassName?: string;
  /** Custom class name for the content container */
  contentClassName?: string;
  /** Whether the tabs are disabled */
  disabled?: boolean;
  /** Whether to show a loading state */
  isLoading?: boolean;
  /** Whether to preserve tab content when switching tabs */
  preserveContent?: boolean;
} 