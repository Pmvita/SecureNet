import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  title?: string;
  duration?: number;
  createdAt: number;
}

interface NotificationOptions {
  type?: NotificationType;
  title?: string;
  duration?: number;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (message: string, options?: NotificationOptions) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

const DEFAULT_DURATIONS: Record<NotificationType, number> = {
  success: 5000,
  error: 8000,
  warning: 6000,
  info: 4000,
};

export function useNotifications(): NotificationState {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timeoutRefs = useRef<Record<string, NodeJS.Timeout>>({});

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
    if (timeoutRefs.current[id]) {
      clearTimeout(timeoutRefs.current[id]);
      delete timeoutRefs.current[id];
    }
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    Object.values(timeoutRefs.current).forEach(clearTimeout);
    timeoutRefs.current = {};
  }, []);

  const addNotification = useCallback((message: string, options: NotificationOptions = {}) => {
    const id = uuidv4();
    const type = options.type || 'info';
    const duration = options.duration ?? DEFAULT_DURATIONS[type];

    const notification: Notification = {
      id,
      type,
      message,
      title: options.title,
      duration,
      createdAt: Date.now(),
    };

    setNotifications(prev => [...prev, notification]);

    if (duration > 0) {
      timeoutRefs.current[id] = setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, [removeNotification]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach(clearTimeout);
    };
  }, []);

  // Auto-remove expired notifications
  useEffect(() => {
    const now = Date.now();
    const expiredNotifications = notifications.filter(
      notification => notification.duration && notification.createdAt + notification.duration < now
    );

    if (expiredNotifications.length > 0) {
      expiredNotifications.forEach(notification => {
        removeNotification(notification.id);
      });
    }
  }, [notifications, removeNotification]);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
  };
}

// Example usage:
/*
function NotificationExample() {
  const { notifications, addNotification, removeNotification } = useNotifications();

  const showSuccess = () => {
    addNotification('Operation completed successfully!', {
      type: 'success',
      title: 'Success',
    });
  };

  const showError = () => {
    addNotification('An error occurred while processing your request.', {
      type: 'error',
      title: 'Error',
      duration: 10000, // Override default duration
    });
  };

  return (
    <div>
      <button onClick={showSuccess}>Show Success</button>
      <button onClick={showError}>Show Error</button>

      <div className="notifications">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`notification notification-${notification.type}`}
          >
            {notification.title && (
              <h4 className="notification-title">{notification.title}</h4>
            )}
            <p className="notification-message">{notification.message}</p>
            <button
              className="notification-close"
              onClick={() => removeNotification(notification.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <style jsx>{`
        .notifications {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
        }

        .notification {
          padding: 12px 16px;
          margin-bottom: 8px;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          min-width: 300px;
          max-width: 400px;
          position: relative;
          animation: slideIn 0.3s ease-out;
        }

        .notification-success {
          background-color: #d4edda;
          border: 1px solid #c3e6cb;
          color: #155724;
        }

        .notification-error {
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          color: #721c24;
        }

        .notification-warning {
          background-color: #fff3cd;
          border: 1px solid #ffeeba;
          color: #856404;
        }

        .notification-info {
          background-color: #d1ecf1;
          border: 1px solid #bee5eb;
          color: #0c5460;
        }

        .notification-title {
          margin: 0 0 4px;
          font-size: 14px;
          font-weight: 600;
        }

        .notification-message {
          margin: 0;
          font-size: 14px;
        }

        .notification-close {
          position: absolute;
          top: 8px;
          right: 8px;
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          opacity: 0.5;
          padding: 0;
          line-height: 1;
        }

        .notification-close:hover {
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
      `}</style>
    </div>
  );
}
*/ 