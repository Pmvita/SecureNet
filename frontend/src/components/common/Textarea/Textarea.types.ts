import { TextareaHTMLAttributes } from 'react';

export type TextareaSize = 'sm' | 'md' | 'lg';

export const sizeClasses = {
  sm: {
    textarea: 'px-3 py-2 text-sm',
    label: 'text-sm',
  },
  md: {
    textarea: 'px-4 py-2.5 text-base',
    label: 'text-base',
  },
  lg: {
    textarea: 'px-4 py-3 text-lg',
    label: 'text-lg',
  },
} as const;

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  /**
   * The label text for the textarea
   */
  label?: string;

  /**
   * The description text for the textarea
   */
  description?: string;

  /**
   * The error message to display
   */
  error?: string;

  /**
   * The size of the textarea
   * @default 'md'
   */
  size?: TextareaSize;

  /**
   * Custom class name for the textarea container
   */
  className?: string;

  /**
   * Custom class name for the textarea label
   */
  labelClassName?: string;

  /**
   * Custom class name for the textarea description
   */
  descriptionClassName?: string;

  /**
   * Custom class name for the textarea error message
   */
  errorClassName?: string;

  /**
   * Custom class name for the textarea input
   */
  textareaClassName?: string;

  /**
   * Custom class name for the textarea wrapper
   */
  wrapperClassName?: string;
} 