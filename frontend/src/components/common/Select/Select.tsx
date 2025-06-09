import * as React from 'react';
import { ChevronDownIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { SelectProps, SelectOption } from './Select.types';
import { sizeClasses } from './Select.types';

export const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({
    options,
    value,
    onChange,
    label,
    description,
    error,
    size = 'md',
    required = false,
    disabled = false,
    multiple = false,
    placeholder = 'Select an option',
    searchable = false,
    clearable = false,
    className,
    labelClassName,
    descriptionClassName,
    errorClassName,
    triggerClassName,
    dropdownClassName,
    optionClassName,
    searchClassName,
    groupClassName,
    groupLabelClassName,
    selectedClassName,
    placeholderClassName,
    clearClassName,
    dropdownWrapperClassName,
    optionsWrapperClassName,
    noOptionsClassName,
    loadingClassName,
    errorWrapperClassName,
    labelWrapperClassName,
    descriptionWrapperClassName,
    triggerWrapperClassName,
    valueWrapperClassName,
    iconWrapperClassName,
    chevronClassName,
    checkClassName,
    searchWrapperClassName,
    groupWrapperClassName,
    optionWrapperClassName,
    optionLabelClassName,
    optionDescriptionClassName,
    optionIconClassName,
    optionCheckClassName,
    optionDisabledClassName,
    optionSelectedClassName,
    optionHoverClassName,
    optionFocusClassName,
    optionActiveClassName,
    optionGroupClassName,
    optionGroupLabelClassName,
    optionGroupOptionsClassName,
    optionGroupOptionsWrapperClassName,
    optionGroupOptionsListClassName,
    optionGroupOptionsItemClassName,
    optionGroupOptionsItemLabelClassName,
    optionGroupOptionsItemDescriptionClassName,
    optionGroupOptionsItemIconClassName,
    optionGroupOptionsItemCheckClassName,
    optionGroupOptionsItemDisabledClassName,
    optionGroupOptionsItemSelectedClassName,
    optionGroupOptionsItemHoverClassName,
    optionGroupOptionsItemFocusClassName,
    optionGroupOptionsItemActiveClassName,
    ...props
  }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const searchRef = React.useRef<HTMLInputElement>(null);
    const sizeClass = sizeClasses[size];

    // Close dropdown when clicking outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node) &&
          triggerRef.current &&
          !triggerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when dropdown opens
    React.useEffect(() => {
      if (isOpen && searchable && searchRef.current) {
        searchRef.current.focus();
      }
    }, [isOpen, searchable]);

    // Filter options based on search query
    const filteredOptions = React.useMemo(() => {
      if (!searchQuery) return options;

      const query = searchQuery.toLowerCase();
      return options.filter((option) =>
        option.label.toLowerCase().includes(query) ||
        option.description?.toLowerCase().includes(query)
      );
    }, [options, searchQuery]);

    // Group options if they have group property
    const groupedOptions = React.useMemo(() => {
      const groups = new Map<string, SelectOption[]>();
      const ungrouped: SelectOption[] = [];

      filteredOptions.forEach((option) => {
        if (option.group) {
          const group = groups.get(option.group) || [];
          group.push(option);
          groups.set(option.group, group);
        } else {
          ungrouped.push(option);
        }
      });

      return { groups, ungrouped };
    }, [filteredOptions]);

    const handleSelect = (option: SelectOption) => {
      if (disabled || option.disabled) return;

      if (multiple) {
        const currentValue = Array.isArray(value) ? value : [];
        const newValue = currentValue.includes(option.value)
          ? currentValue.filter((v) => v !== option.value)
          : [...currentValue, option.value];
        onChange(newValue);
      } else {
        onChange(option.value);
        setIsOpen(false);
      }
    };

    const handleClear = (event: React.MouseEvent) => {
      event.stopPropagation();
      onChange(multiple ? [] : '');
    };

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(event.target.value);
    };

    const isSelected = (option: SelectOption) => {
      if (multiple) {
        return Array.isArray(value) && value.includes(option.value);
      }
      return value === option.value;
    };

    const getSelectedLabel = () => {
      if (multiple) {
        if (!Array.isArray(value) || value.length === 0) return placeholder;
        return value
          .map((v) => options.find((o) => o.value === v)?.label)
          .filter(Boolean)
          .join(', ');
      }
      return options.find((o) => o.value === value)?.label || placeholder;
    };

    return (
      <div
        ref={ref}
        className={cn('relative', className)}
        {...props}
      >
        {(label || description) && (
          <div className={cn('mb-2', labelWrapperClassName)}>
            {label && (
              <label
                className={cn(
                  'font-medium text-gray-200',
                  sizeClass.label,
                  disabled && 'cursor-not-allowed opacity-50',
                  labelClassName
                )}
              >
                {label}
                {required && <span className="ml-1 text-red-500">*</span>}
              </label>
            )}
            {description && !error && (
              <p
                className={cn(
                  'text-sm text-gray-400',
                  descriptionClassName
                )}
              >
                {description}
              </p>
            )}
          </div>
        )}

        <div className={cn('relative', triggerWrapperClassName)}>
          <button
            ref={triggerRef}
            type="button"
            className={cn(
              'w-full rounded-lg border bg-gray-800 text-left transition-colors',
              sizeClass.select,
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-600 hover:border-gray-500 focus:border-primary-500 focus:ring-primary-500/20',
              disabled && 'cursor-not-allowed opacity-50',
              triggerClassName
            )}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error
                ? `${props.id}-error`
                : description
                ? `${props.id}-description`
                : undefined
            }
          >
            <div className={cn('flex items-center justify-between', valueWrapperClassName)}>
              <span
                className={cn(
                  'block truncate',
                  !value || (Array.isArray(value) && value.length === 0)
                    ? 'text-gray-400'
                    : 'text-gray-100',
                  placeholderClassName
                )}
              >
                {getSelectedLabel()}
              </span>
              <div className={cn('flex items-center', iconWrapperClassName)}>
                {clearable && value && (
                  <button
                    type="button"
                    className={cn(
                      'mr-1 rounded-full p-1 text-gray-400 hover:text-gray-200',
                      clearClassName
                    )}
                    onClick={handleClear}
                    aria-label="Clear selection"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
                <ChevronDownIcon
                  className={cn(
                    'h-5 w-5 text-gray-400 transition-transform',
                    isOpen && 'rotate-180',
                    chevronClassName
                  )}
                />
              </div>
            </div>
          </button>

          {isOpen && (
            <div
              ref={dropdownRef}
              className={cn(
                'absolute z-50 mt-1 w-full rounded-lg border border-gray-600 bg-gray-800 shadow-lg',
                dropdownWrapperClassName
              )}
              role="listbox"
            >
              {searchable && (
                <div className={cn('border-b border-gray-600 p-2', searchWrapperClassName)}>
                  <input
                    ref={searchRef}
                    type="text"
                    className={cn(
                      'w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-gray-100 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20',
                      searchClassName
                    )}
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={handleSearch}
                  />
                </div>
              )}

              <div
                className={cn(
                  'max-h-60 overflow-auto p-1',
                  optionsWrapperClassName
                )}
              >
                {filteredOptions.length === 0 ? (
                  <div
                    className={cn(
                      'py-2 px-3 text-sm text-gray-400',
                      noOptionsClassName
                    )}
                  >
                    No options found
                  </div>
                ) : (
                  <>
                    {groupedOptions.ungrouped.length > 0 && (
                      <div className={cn('py-1', groupWrapperClassName)}>
                        {groupedOptions.ungrouped.map((option) => (
                          <div
                            key={option.value}
                            className={cn(
                              'flex cursor-pointer items-center rounded-md px-3 py-2 text-sm transition-colors',
                              option.disabled
                                ? 'cursor-not-allowed opacity-50'
                                : 'hover:bg-gray-700',
                              isSelected(option) && 'bg-primary-500/10 text-primary-500',
                              optionWrapperClassName
                            )}
                            onClick={() => handleSelect(option)}
                            role="option"
                            aria-selected={isSelected(option)}
                            aria-disabled={option.disabled}
                          >
                            {option.icon && (
                              <span
                                className={cn(
                                  'mr-2 flex-shrink-0',
                                  optionIconClassName
                                )}
                              >
                                {option.icon}
                              </span>
                            )}
                            <div className="flex-grow">
                              <div
                                className={cn(
                                  'font-medium',
                                  optionLabelClassName
                                )}
                              >
                                {option.label}
                              </div>
                              {option.description && (
                                <div
                                  className={cn(
                                    'text-xs text-gray-400',
                                    optionDescriptionClassName
                                  )}
                                >
                                  {option.description}
                                </div>
                              )}
                            </div>
                            {isSelected(option) && (
                              <CheckIcon
                                className={cn(
                                  'ml-2 h-4 w-4 flex-shrink-0 text-primary-500',
                                  checkClassName
                                )}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {Array.from(groupedOptions.groups.entries()).map(([group, options]) => (
                      <div
                        key={group}
                        className={cn('py-1', groupWrapperClassName)}
                      >
                        <div
                          className={cn(
                            'px-3 py-1.5 text-xs font-medium text-gray-400',
                            groupLabelClassName
                          )}
                        >
                          {group}
                        </div>
                        {options.map((option) => (
                          <div
                            key={option.value}
                            className={cn(
                              'flex cursor-pointer items-center rounded-md px-3 py-2 text-sm transition-colors',
                              option.disabled
                                ? 'cursor-not-allowed opacity-50'
                                : 'hover:bg-gray-700',
                              isSelected(option) && 'bg-primary-500/10 text-primary-500',
                              optionWrapperClassName
                            )}
                            onClick={() => handleSelect(option)}
                            role="option"
                            aria-selected={isSelected(option)}
                            aria-disabled={option.disabled}
                          >
                            {option.icon && (
                              <span
                                className={cn(
                                  'mr-2 flex-shrink-0',
                                  optionIconClassName
                                )}
                              >
                                {option.icon}
                              </span>
                            )}
                            <div className="flex-grow">
                              <div
                                className={cn(
                                  'font-medium',
                                  optionLabelClassName
                                )}
                              >
                                {option.label}
                              </div>
                              {option.description && (
                                <div
                                  className={cn(
                                    'text-xs text-gray-400',
                                    optionDescriptionClassName
                                  )}
                                >
                                  {option.description}
                                </div>
                              )}
                            </div>
                            {isSelected(option) && (
                              <CheckIcon
                                className={cn(
                                  'ml-2 h-4 w-4 flex-shrink-0 text-primary-500',
                                  checkClassName
                                )}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div
            className={cn('mt-1', errorWrapperClassName)}
          >
            <p
              id={props.id ? `${props.id}-error` : undefined}
              className={cn(
                'text-sm text-red-500',
                errorClassName
              )}
            >
              {error}
            </p>
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select'; 