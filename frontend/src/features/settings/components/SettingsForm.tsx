import React from 'react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Switch } from '@/components/common/Switch';
import type { BaseProps } from '../../../types';

export interface SettingSection {
  id: string;
  title: string;
  description?: string;
  settings: Setting[];
}

export interface Setting {
  id: string;
  label: string;
  description?: string;
  type: 'text' | 'number' | 'select' | 'switch' | 'textarea';
  value: string | number | boolean;
  options?: Array<{
    value: string;
    label: string;
  }>;
  placeholder?: string;
  min?: number;
  max?: number;
  required?: boolean;
  disabled?: boolean;
}

interface SettingsFormProps extends BaseProps {
  sections: SettingSection[];
  onSubmit: (values: Record<string, string | number | boolean>) => void;
  onCancel?: () => void;
  loading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
}

export function SettingsForm({
  sections,
  onSubmit,
  onCancel,
  loading,
  submitLabel = 'Save Changes',
  cancelLabel = 'Cancel',
  className,
  ...props
}: SettingsFormProps) {
  const [values, setValues] = React.useState<Record<string, string | number | boolean>>(() => {
    const initialValues: Record<string, string | number | boolean> = {};
    (sections ?? []).forEach(section => {
      (section.settings ?? []).forEach(setting => {
        initialValues[setting.id] = setting.value;
      });
    });
    return initialValues;
  });

  const handleChange = (id: string, value: string | number | boolean) => {
    setValues(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <form
      className={`settings-form ${className || ''}`}
      onSubmit={handleSubmit}
      {...props}
    >
      {(sections ?? []).map((section) => (
        <div key={section.id} className="settings-section">
          <div className="settings-section-header">
            <h2 className="settings-section-title">{section.title}</h2>
            {section.description && (
              <p className="settings-section-description">{section.description}</p>
            )}
          </div>

          <div className="settings-section-content">
            {(section.settings ?? []).map((setting) => (
              <div key={setting.id} className="setting-item">
                <div className="setting-label-group">
                  <label
                    htmlFor={setting.id}
                    className="setting-label"
                  >
                    {setting.label}
                    {setting.required && <span className="required-mark">*</span>}
                  </label>
                  {setting.description && (
                    <p className="setting-description">{setting.description}</p>
                  )}
                </div>

                <div className="setting-control">
                  {setting.type === 'text' && (
                    <Input
                      id={setting.id}
                      type="text"
                      value={values[setting.id] as string}
                      onChange={(value: string) => handleChange(setting.id, value)}
                      placeholder={setting.placeholder}
                      required={setting.required}
                      disabled={setting.disabled || loading}
                    />
                  )}

                  {setting.type === 'number' && (
                    <Input
                      id={setting.id}
                      type="number"
                      value={values[setting.id] as number}
                      onChange={(value: string) => handleChange(setting.id, Number(value))}
                      placeholder={setting.placeholder}
                      min={setting.min}
                      max={setting.max}
                      required={setting.required}
                      disabled={setting.disabled || loading}
                    />
                  )}

                  {setting.type === 'select' && setting.options && (
                    <Select
                      value={values[setting.id] as string}
                      onChange={(value) => handleChange(setting.id, value)}
                      options={setting.options}
                      placeholder={setting.placeholder}
                      required={setting.required}
                      disabled={setting.disabled || loading}
                    />
                  )}

                  {setting.type === 'switch' && (
                    <Switch
                      checked={values[setting.id] as boolean}
                      onChange={(checked) => handleChange(setting.id, checked)}
                      disabled={setting.disabled || loading}
                    />
                  )}

                  {setting.type === 'textarea' && (
                    <textarea
                      id={setting.id}
                      value={values[setting.id] as string}
                      onChange={(e) => handleChange(setting.id, e.target.value)}
                      placeholder={setting.placeholder}
                      required={setting.required}
                      disabled={setting.disabled || loading}
                      rows={4}
                      className="setting-textarea"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="settings-form-actions">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          isLoading={loading}
        >
          {submitLabel}
        </Button>
      </div>

      <style>{`
        .settings-form {
          max-width: 800px;
        }

        .settings-section {
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
        }

        .settings-section-header {
          margin-bottom: 1.5rem;
        }

        .settings-section-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .settings-section-description {
          margin: 0.5rem 0 0;
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .settings-section-content {
          display: grid;
          gap: 1.5rem;
        }

        .setting-item {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 1.5rem;
          align-items: flex-start;
        }

        .setting-label-group {
          min-width: 0;
        }

        .setting-label {
          display: block;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }

        .required-mark {
          color: var(--error);
          margin-left: 0.25rem;
        }

        .setting-description {
          margin: 0;
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .setting-control {
          min-width: 0;
        }

        .setting-textarea {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid var(--border-color);
          border-radius: 0.25rem;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-family: inherit;
          font-size: 0.875rem;
          resize: vertical;
          transition: border-color 0.2s ease;
        }

        .setting-textarea:focus {
          outline: none;
          border-color: var(--primary-color);
        }

        .setting-textarea:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .settings-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 2rem;
        }

        @media (max-width: 640px) {
          .setting-item {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }

          .settings-form-actions {
            flex-direction: column-reverse;
          }

          .settings-form-actions button {
            width: 100%;
          }
        }
      `}</style>
    </form>
  );
} 