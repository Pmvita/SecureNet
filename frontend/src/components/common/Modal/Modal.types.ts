import { ReactNode } from 'react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4',
} as const;

export interface ModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;

  /**
   * Callback fired when the modal is closed
   */
  onClose: () => void;

  /**
   * The title of the modal
   */
  title?: string;

  /**
   * The description of the modal
   */
  description?: string;

  /**
   * The content of the modal
   */
  children: ReactNode;

  /**
   * The size of the modal
   * @default 'md'
   */
  size?: ModalSize;

  /**
   * Whether to show the close button
   * @default true
   */
  showCloseButton?: boolean;

  /**
   * Custom class name for the modal
   */
  className?: string;
}

export interface ModalFooterProps {
  /**
   * The content of the modal footer
   */
  children: ReactNode;

  /**
   * Custom class name for the modal footer
   */
  className?: string;
} 