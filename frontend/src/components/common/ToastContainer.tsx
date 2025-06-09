import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
      <style>{`
        .toast-container {
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-width: 24rem;
        }
      `}</style>
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 300); // Wait for exit animation
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          background: 'var(--success-light)',
          borderColor: 'var(--success)',
          icon: '✓'
        };
      case 'error':
        return {
          background: 'var(--error-light)',
          borderColor: 'var(--error)',
          icon: '✕'
        };
      case 'warning':
        return {
          background: 'var(--warning-light)',
          borderColor: 'var(--warning)',
          icon: '⚠'
        };
      case 'info':
        return {
          background: 'var(--info-light)',
          borderColor: 'var(--info)',
          icon: 'ℹ'
        };
    }
  };

  const styles = getToastStyles(toast.type);

  return (
    <div
      className={`toast ${isExiting ? 'exiting' : ''}`}
      style={{
        background: styles.background,
        borderColor: styles.borderColor
      }}
    >
      <div className="toast-icon">{styles.icon}</div>
      <div className="toast-message">{toast.message}</div>
      <button className="toast-close" onClick={() => onRemove(toast.id)}>
        ×
      </button>
      <style>{`
        .toast {
          display: flex;
          align-items: center;
          padding: 1rem;
          border-radius: 0.5rem;
          border-left: 4px solid;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          animation: slideIn 0.3s ease-out;
          background: white;
        }

        .toast.exiting {
          animation: slideOut 0.3s ease-in forwards;
        }

        .toast-icon {
          margin-right: 0.75rem;
          font-size: 1.25rem;
          line-height: 1;
        }

        .toast-message {
          flex: 1;
          font-size: 0.875rem;
          color: var(--text-primary);
        }

        .toast-close {
          margin-left: 0.75rem;
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 1.25rem;
          line-height: 1;
          cursor: pointer;
          padding: 0.25rem;
          opacity: 0.6;
          transition: opacity 0.2s;
        }

        .toast-close:hover {
          opacity: 1;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

// Toast context and hook
interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}; 