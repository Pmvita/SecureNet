import { HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

export type CheckboxSize = 'sm' | 'md' | 'lg';

export const sizeClasses = {
  sm: {
    checkbox: 'h-4 w-4',
    label: 'text-sm',
  },
  md: {
    checkbox: 'h-5 w-5',
    label: 'text-base',
  },
  lg: {
    checkbox: 'h-6 w-6',
    label: 'text-lg',
  },
} as const;

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  /**
   * The label text for the checkbox
   */
  label?: string;

  /**
   * The description text for the checkbox
   */
  description?: string;

  /**
   * The error message to display
   */
  error?: string;

  /**
   * The size of the checkbox
   * @default 'md'
   */
  size?: CheckboxSize;

  /**
   * Custom class name for the checkbox container
   */
  className?: string;

  /**
   * Custom class name for the checkbox label
   */
  labelClassName?: string;

  /**
   * Custom class name for the checkbox description
   */
  descriptionClassName?: string;

  /**
   * Custom class name for the checkbox error message
   */
  errorClassName?: string;

  /**
   * Custom class name for the checkbox input
   */
  inputClassName?: string;

  /**
   * Custom class name for the checkbox wrapper
   */
  wrapperClassName?: string;
}

export interface CheckboxGroupProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The checkboxes to display in the group
   */
  children: ReactNode;

  /**
   * The label text for the checkbox group
   */
  label?: string;

  /**
   * The description text for the checkbox group
   */
  description?: string;

  /**
   * The error message to display
   */
  error?: string;

  /**
   * Custom class name for the checkbox group label
   */
  labelClassName?: string;

  /**
   * Custom class name for the checkbox group description
   */
  descriptionClassName?: string;

  /**
   * Custom class name for the checkbox group error message
   */
  errorClassName?: string;
} 