import React from 'react';
import type { BaseProps } from '@/types';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>, BaseProps {
  label?: string;
  onChange?: (checked: boolean) => void;
}

export const Switch: React.FC<SwitchProps> = ({
  id,
  label,
  checked,
  disabled,
  className,
  onChange,
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.checked);
  };

  return (
    <label className={`switch-wrapper ${className || ''}`}>
      <input
        type="checkbox"
        id={id}
        className="switch-input"
        checked={checked}
        disabled={disabled}
        onChange={handleChange}
        {...props}
      />
      <span className="switch-track">
        <span className="switch-thumb" />
      </span>
      {label && <span className="switch-label">{label}</span>}
      <style>{`
        .switch-wrapper {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
        }

        .switch-input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .switch-track {
          position: relative;
          display: inline-block;
          width: 2.5rem;
          height: 1.25rem;
          background: var(--bg-secondary);
          border-radius: 1rem;
          transition: background-color 0.2s ease;
        }

        .switch-thumb {
          position: absolute;
          top: 0.125rem;
          left: 0.125rem;
          width: 1rem;
          height: 1rem;
          background: white;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s ease;
        }

        .switch-input:checked + .switch-track {
          background: var(--primary-color);
        }

        .switch-input:checked + .switch-track .switch-thumb {
          transform: translateX(1.25rem);
        }

        .switch-input:disabled + .switch-track {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .switch-label {
          font-size: 0.875rem;
          color: var(--text-primary);
          user-select: none;
        }

        .switch-wrapper:has(.switch-input:disabled) {
          cursor: not-allowed;
        }

        .switch-wrapper:has(.switch-input:disabled) .switch-label {
          opacity: 0.5;
        }
      `}</style>
    </label>
  );
}; 