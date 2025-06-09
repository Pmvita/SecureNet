import { InputHTMLAttributes, ReactNode } from 'react';

export type InputSize = 'sm' | 'md' | 'lg';

export const sizeClasses = {
  sm: {
    input: 'px-3 py-1.5 text-sm',
    label: 'text-sm',
  },
  md: {
    input: 'px-4 py-2 text-base',
    label: 'text-base',
  },
  lg: {
    input: 'px-4 py-2.5 text-lg',
    label: 'text-lg',
  },
} as const;

export type InputType = 
  | 'text'
  | 'password'
  | 'email'
  | 'number'
  | 'tel'
  | 'url'
  | 'search'
  | 'date'
  | 'datetime-local'
  | 'time'
  | 'month'
  | 'week'
  | 'color'
  | 'file';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  /**
   * The type of input
   * @default 'text'
   */
  type?: InputType;

  /**
   * The label text for the input
   */
  label?: string;

  /**
   * The description text for the input
   */
  description?: string;

  /**
   * The error message to display
   */
  error?: string;

  /**
   * The size of the input
   * @default 'md'
   */
  size?: InputSize;

  /**
   * Whether the input is required
   * @default false
   */
  required?: boolean;

  /**
   * Whether the input is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Whether the input is read-only
   * @default false
   */
  readOnly?: boolean;

  /**
   * Icon to display at the start of the input
   */
  startIcon?: ReactNode;

  /**
   * Icon to display at the end of the input
   */
  endIcon?: ReactNode;

  /**
   * Whether to show a clear button when the input has a value
   * @default false
   */
  clearable?: boolean;

  /**
   * Custom class name for the input container
   */
  className?: string;

  /**
   * Custom class name for the input label
   */
  labelClassName?: string;

  /**
   * Custom class name for the input description
   */
  descriptionClassName?: string;

  /**
   * Custom class name for the input error message
   */
  errorClassName?: string;

  /**
   * Custom class name for the input element
   */
  inputClassName?: string;

  /**
   * Custom class name for the input wrapper
   */
  wrapperClassName?: string;

  /**
   * Custom class name for the input label wrapper
   */
  labelWrapperClassName?: string;

  /**
   * Custom class name for the input description wrapper
   */
  descriptionWrapperClassName?: string;

  /**
   * Custom class name for the input error wrapper
   */
  errorWrapperClassName?: string;

  /**
   * Custom class name for the input icon wrapper
   */
  iconWrapperClassName?: string;

  /**
   * Custom class name for the input start icon
   */
  startIconClassName?: string;

  /**
   * Custom class name for the input end icon
   */
  endIconClassName?: string;

  /**
   * Custom class name for the input clear button
   */
  clearClassName?: string;

  /**
   * Custom class name for the input clear button wrapper
   */
  clearWrapperClassName?: string;

  /**
   * Custom class name for the input clear button icon
   */
  clearIconClassName?: string;

  /**
   * Custom class name for the input clear button hover state
   */
  clearHoverClassName?: string;

  /**
   * Custom class name for the input clear button focus state
   */
  clearFocusClassName?: string;

  /**
   * Custom class name for the input clear button active state
   */
  clearActiveClassName?: string;

  /**
   * Custom class name for the input clear button disabled state
   */
  clearDisabledClassName?: string;

  /**
   * Custom class name for the input clear button icon wrapper
   */
  clearIconWrapperClassName?: string;

  /**
   * Custom class name for the input clear button icon hover state
   */
  clearIconHoverClassName?: string;

  /**
   * Custom class name for the input clear button icon focus state
   */
  clearIconFocusClassName?: string;

  /**
   * Custom class name for the input clear button icon active state
   */
  clearIconActiveClassName?: string;

  /**
   * Custom class name for the input clear button icon disabled state
   */
  clearIconDisabledClassName?: string;
} 