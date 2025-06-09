import type { BaseProps } from '@/types';
import type { ReactNode } from 'react';

export type DropdownPosition = 'top' | 'bottom' | 'left' | 'right';
export type DropdownAlignment = 'start' | 'center' | 'end';
export type DropdownTrigger = 'click' | 'hover';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  onClick?: () => void;
  children?: DropdownItem[];
}

export interface DropdownProps extends BaseProps {
  /** The trigger element that opens the dropdown */
  trigger: ReactNode;
  /** Array of items to display in the dropdown */
  items: DropdownItem[];
  /** Whether the dropdown is open */
  isOpen?: boolean;
  /** Callback when dropdown opens */
  onOpen?: () => void;
  /** Callback when dropdown closes */
  onClose?: () => void;
  /** Position of the dropdown relative to trigger */
  position?: DropdownPosition;
  /** Alignment of the dropdown relative to trigger */
  alignment?: DropdownAlignment;
  /** How the dropdown is triggered */
  triggerType?: DropdownTrigger;
  /** Whether to show a divider between items */
  showDividers?: boolean;
  /** Whether to close the dropdown when an item is clicked */
  closeOnSelect?: boolean;
  /** Custom class name for the dropdown menu */
  menuClassName?: string;
  /** Custom class name for dropdown items */
  itemClassName?: string;
  /** Whether the dropdown is disabled */
  disabled?: boolean;
  /** Maximum height of the dropdown menu */
  maxHeight?: string;
  /** Whether to show a loading state */
  isLoading?: boolean;
  /** Placeholder text when no items are available */
  emptyText?: string;
} 