import type { BaseProps } from '@/types';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends BaseProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  label: string;
  icon?: string;
  onClick?: () => void;
  removable?: boolean;
  onRemove?: () => void;
} 