import React from 'react';
import type { BaseProps } from '@/types';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>, BaseProps {
  label?: string;
  error?: string;
  onChange?: (value: string) => void;
}

export const Input: React.FC<InputProps> = ({
  id,
  label,
  error,
  className,
  onChange,
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  return (
    <div className={`input-wrapper ${className || ''}`}>
      {label && (
        <label htmlFor={id} className="input-label">
          {label}
          {props.required && <span className="required-mark">*</span>}
        </label>
      )}
      <input
        id={id}
        className={`input ${error ? 'error' : ''}`}
        onChange={handleChange}
        {...props}
      />
      {error && <div className="input-error">{error}</div>}
      <style>{`
        .input-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .input-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-primary);
        }

        .required-mark {
          color: var(--error);
          margin-left: 0.25rem;
        }

        .input {
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: 0.375rem;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 0.875rem;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .input:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 2px var(--primary-color-light);
        }

        .input.error {
          border-color: var(--error);
        }

        .input.error:focus {
          box-shadow: 0 0 0 2px var(--error-light);
        }

        .input:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          background: var(--bg-secondary);
        }

        .input-error {
          font-size: 0.75rem;
          color: var(--error);
        }
      `}</style>
    </div>
  );
}; 