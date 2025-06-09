import React from 'react';
import type { BaseProps } from '@/types';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'placeholder'>, BaseProps {
  label?: string;
  options: SelectOption[];
  error?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
}

export const Select: React.FC<SelectProps> = ({
  id,
  label,
  options,
  error,
  className,
  onChange,
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange?.(e.target.value);
  };

  return (
    <div className={`select-wrapper ${className || ''}`}>
      {label && (
        <label htmlFor={id} className="select-label">
          {label}
          {props.required && <span className="required-mark">*</span>}
        </label>
      )}
      <select
        id={id}
        className={`select ${error ? 'error' : ''}`}
        onChange={handleChange}
        {...props}
      >
        {props.placeholder && (
          <option value="" disabled>
            {props.placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && <div className="select-error">{error}</div>}
      <style>{`
        .select-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .select-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-primary);
        }

        .required-mark {
          color: var(--error);
          margin-left: 0.25rem;
        }

        .select {
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: 0.375rem;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 0.875rem;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8.825L1.175 4 2.05 3.125 6 7.075 9.95 3.125 10.825 4z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
          padding-right: 2rem;
        }

        .select:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 2px var(--primary-color-light);
        }

        .select.error {
          border-color: var(--error);
        }

        .select.error:focus {
          box-shadow: 0 0 0 2px var(--error-light);
        }

        .select:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          background-color: var(--bg-secondary);
        }

        .select-error {
          font-size: 0.75rem;
          color: var(--error);
        }
      `}</style>
    </div>
  );
}; 