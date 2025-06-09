import { HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

export type RadioSize = 'sm' | 'md' | 'lg';

export const sizeClasses = {
  sm: {
    radio: 'h-4 w-4',
    label: 'text-sm',
  },
  md: {
    radio: 'h-5 w-5',
    label: 'text-base',
  },
  lg: {
    radio: 'h-6 w-6',
    label: 'text-lg',
  },
} as const;

export interface RadioOption {
  /**
   * The value of the radio option
   */
  value: string;

  /**
   * The label to display for the radio option
   */
  label: string;

  /**
   * The description text for the radio option
   */
  description?: string;

  /**
   * Whether the radio option is disabled
   */
  disabled?: boolean;

  /**
   * Icon to display next to the radio option
   */
  icon?: ReactNode;
}

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  /**
   * The label text for the radio
   */
  label?: string;

  /**
   * The description text for the radio
   */
  description?: string;

  /**
   * The error message to display
   */
  error?: string;

  /**
   * The size of the radio
   * @default 'md'
   */
  size?: RadioSize;

  /**
   * Custom class name for the radio container
   */
  className?: string;

  /**
   * Custom class name for the radio label
   */
  labelClassName?: string;

  /**
   * Custom class name for the radio description
   */
  descriptionClassName?: string;

  /**
   * Custom class name for the radio error message
   */
  errorClassName?: string;

  /**
   * Custom class name for the radio input
   */
  inputClassName?: string;

  /**
   * Custom class name for the radio wrapper
   */
  wrapperClassName?: string;
}

export interface RadioGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /**
   * The name attribute for the radio group
   */
  name?: string;

  /**
   * The available options for the radio group
   */
  options: RadioOption[];

  /**
   * The currently selected value
   */
  value: string;

  /**
   * Callback fired when the value changes
   */
  onChange: (value: string) => void;

  /**
   * The label text for the radio group
   */
  label?: string;

  /**
   * The description text for the radio group
   */
  description?: string;

  /**
   * The error message to display
   */
  error?: string;

  /**
   * The size of the radio buttons
   * @default 'md'
   */
  size?: RadioSize;

  /**
   * Whether the radio group is required
   * @default false
   */
  required?: boolean;

  /**
   * Custom class name for the radio group container
   */
  className?: string;

  /**
   * Custom class name for the radio group label
   */
  labelClassName?: string;

  /**
   * Custom class name for the radio group description
   */
  descriptionClassName?: string;

  /**
   * Custom class name for the radio group error message
   */
  errorClassName?: string;

  /**
   * Custom class name for the radio group options container
   */
  optionsClassName?: string;

  /**
   * Custom class name for individual radio options
   */
  optionClassName?: string;
} 