import { HTMLAttributes, ReactNode } from 'react';

export type SelectSize = 'sm' | 'md' | 'lg';

export const sizeClasses = {
  sm: {
    select: 'px-3 py-1.5 text-sm',
    label: 'text-sm',
  },
  md: {
    select: 'px-4 py-2 text-base',
    label: 'text-base',
  },
  lg: {
    select: 'px-4 py-2.5 text-lg',
    label: 'text-lg',
  },
} as const;

export interface SelectOption {
  /**
   * The value of the option
   */
  value: string;

  /**
   * The label to display for the option
   */
  label: string;

  /**
   * Whether the option is disabled
   */
  disabled?: boolean;

  /**
   * Icon to display next to the option
   */
  icon?: ReactNode;

  /**
   * Description text for the option
   */
  description?: string;

  /**
   * Group the option belongs to
   */
  group?: string;
}

export interface SelectProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /**
   * The available options for the select
   */
  options: SelectOption[];

  /**
   * The currently selected value(s)
   */
  value: string | string[];

  /**
   * Callback fired when the value changes
   */
  onChange: (value: string | string[]) => void;

  /**
   * The label text for the select
   */
  label?: string;

  /**
   * The description text for the select
   */
  description?: string;

  /**
   * The error message to display
   */
  error?: string;

  /**
   * The size of the select
   * @default 'md'
   */
  size?: SelectSize;

  /**
   * Whether the select is required
   * @default false
   */
  required?: boolean;

  /**
   * Whether the select is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Whether multiple options can be selected
   * @default false
   */
  multiple?: boolean;

  /**
   * Placeholder text when no option is selected
   */
  placeholder?: string;

  /**
   * Whether to show a search input for filtering options
   * @default false
   */
  searchable?: boolean;

  /**
   * Whether to show a clear button
   * @default false
   */
  clearable?: boolean;

  /**
   * Custom class name for the select container
   */
  className?: string;

  /**
   * Custom class name for the select label
   */
  labelClassName?: string;

  /**
   * Custom class name for the select description
   */
  descriptionClassName?: string;

  /**
   * Custom class name for the select error message
   */
  errorClassName?: string;

  /**
   * Custom class name for the select trigger button
   */
  triggerClassName?: string;

  /**
   * Custom class name for the select dropdown
   */
  dropdownClassName?: string;

  /**
   * Custom class name for the select option
   */
  optionClassName?: string;

  /**
   * Custom class name for the select search input
   */
  searchClassName?: string;

  /**
   * Custom class name for the select group
   */
  groupClassName?: string;

  /**
   * Custom class name for the select group label
   */
  groupLabelClassName?: string;

  /**
   * Custom class name for the select selected value
   */
  selectedClassName?: string;

  /**
   * Custom class name for the select placeholder
   */
  placeholderClassName?: string;

  /**
   * Custom class name for the select clear button
   */
  clearClassName?: string;

  /**
   * Custom class name for the select dropdown wrapper
   */
  dropdownWrapperClassName?: string;

  /**
   * Custom class name for the select options wrapper
   */
  optionsWrapperClassName?: string;

  /**
   * Custom class name for the select no options message
   */
  noOptionsClassName?: string;

  /**
   * Custom class name for the select loading message
   */
  loadingClassName?: string;

  /**
   * Custom class name for the select error message wrapper
   */
  errorWrapperClassName?: string;

  /**
   * Custom class name for the select label wrapper
   */
  labelWrapperClassName?: string;

  /**
   * Custom class name for the select description wrapper
   */
  descriptionWrapperClassName?: string;

  /**
   * Custom class name for the select trigger wrapper
   */
  triggerWrapperClassName?: string;

  /**
   * Custom class name for the select value wrapper
   */
  valueWrapperClassName?: string;

  /**
   * Custom class name for the select icon wrapper
   */
  iconWrapperClassName?: string;

  /**
   * Custom class name for the select chevron icon
   */
  chevronClassName?: string;

  /**
   * Custom class name for the select check icon
   */
  checkClassName?: string;

  /**
   * Custom class name for the select search wrapper
   */
  searchWrapperClassName?: string;

  /**
   * Custom class name for the select group wrapper
   */
  groupWrapperClassName?: string;

  /**
   * Custom class name for the select option wrapper
   */
  optionWrapperClassName?: string;

  /**
   * Custom class name for the select option label
   */
  optionLabelClassName?: string;

  /**
   * Custom class name for the select option description
   */
  optionDescriptionClassName?: string;

  /**
   * Custom class name for the select option icon
   */
  optionIconClassName?: string;

  /**
   * Custom class name for the select option check
   */
  optionCheckClassName?: string;

  /**
   * Custom class name for the select option disabled
   */
  optionDisabledClassName?: string;

  /**
   * Custom class name for the select option selected
   */
  optionSelectedClassName?: string;

  /**
   * Custom class name for the select option hover
   */
  optionHoverClassName?: string;

  /**
   * Custom class name for the select option focus
   */
  optionFocusClassName?: string;

  /**
   * Custom class name for the select option active
   */
  optionActiveClassName?: string;

  /**
   * Custom class name for the select option group
   */
  optionGroupClassName?: string;

  /**
   * Custom class name for the select option group label
   */
  optionGroupLabelClassName?: string;

  /**
   * Custom class name for the select option group options
   */
  optionGroupOptionsClassName?: string;

  /**
   * Custom class name for the select option group options wrapper
   */
  optionGroupOptionsWrapperClassName?: string;

  /**
   * Custom class name for the select option group options list
   */
  optionGroupOptionsListClassName?: string;

  /**
   * Custom class name for the select option group options item
   */
  optionGroupOptionsItemClassName?: string;

  /**
   * Custom class name for the select option group options item label
   */
  optionGroupOptionsItemLabelClassName?: string;

  /**
   * Custom class name for the select option group options item description
   */
  optionGroupOptionsItemDescriptionClassName?: string;

  /**
   * Custom class name for the select option group options item icon
   */
  optionGroupOptionsItemIconClassName?: string;

  /**
   * Custom class name for the select option group options item check
   */
  optionGroupOptionsItemCheckClassName?: string;

  /**
   * Custom class name for the select option group options item disabled
   */
  optionGroupOptionsItemDisabledClassName?: string;

  /**
   * Custom class name for the select option group options item selected
   */
  optionGroupOptionsItemSelectedClassName?: string;

  /**
   * Custom class name for the select option group options item hover
   */
  optionGroupOptionsItemHoverClassName?: string;

  /**
   * Custom class name for the select option group options item focus
   */
  optionGroupOptionsItemFocusClassName?: string;

  /**
   * Custom class name for the select option group options item active
   */
  optionGroupOptionsItemActiveClassName?: string;
}

export interface SelectGroupProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The selects to display in the group
   */
  children: ReactNode;
} 