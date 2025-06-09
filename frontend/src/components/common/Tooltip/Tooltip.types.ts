import { ReactNode } from 'react';

export type TooltipSide = 'top' | 'right' | 'bottom' | 'left';
export type TooltipAlign = 'start' | 'center' | 'end';

export interface TooltipPosition {
  x: number;
  y: number;
}

export interface TooltipProps {
  /**
   * The content to be displayed in the tooltip
   */
  content: ReactNode;
  
  /**
   * The element that triggers the tooltip
   */
  children: ReactNode;
  
  /**
   * The position of the tooltip relative to its trigger
   * @default 'top'
   */
  side?: TooltipSide;
  
  /**
   * The alignment of the tooltip relative to its trigger
   * @default 'center'
   */
  align?: TooltipAlign;
  
  /**
   * Delay in milliseconds before showing the tooltip
   * @default 0
   */
  delay?: number;
  
  /**
   * Custom class name for the tooltip container
   */
  className?: string;
  
  /**
   * Custom class name for the tooltip content
   */
  contentClassName?: string;
}

export const sideClasses = {
  top: 'bottom-full left-1/2 -translate-x-1/2 -translate-y-2 mb-2',
  right: 'left-full top-1/2 -translate-y-1/2 translate-x-2 ml-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 translate-y-2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 -translate-x-2 mr-2',
} as const;

export const alignClasses = {
  start: 'origin-start',
  center: 'origin-center',
  end: 'origin-end',
} as const; 