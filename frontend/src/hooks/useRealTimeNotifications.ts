import { useState, useEffect, useRef, useCallback, startTransition } from 'react';
import { apiClient } from '../api/client';

export interface RealTimeNotification {
  id: number;
  title: string;
  message: string;
  category: 'system' | 'security' | 'network' | 'user';
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: string;
  read: boolean;
  metadata?: Record<string, unknown>;
}

interface NotificationState {
  notifications: RealTimeNotification[];
  unreadCount: number;
  isConnected: boolean;
  connectionError: string | null;
}

export function useRealTimeNotifications() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    isConnected: false,
    connectionError: null,
  });

  // Get API key reactively
  useEffect(() => {
    const key = apiClient.getApiKey();
    startTransition(() => {
      setApiKey(key);
    });
  }, []);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Fetch initial notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/notifications?page=1&page_size=50');
      const data = response.data as { notifications?: RealTimeNotification[] };
      const notifications = data.notifications || [];
      
      startTransition(() => {
        setState(prev => ({
          ...prev,
          notifications,
          unreadCount: notifications.filter((n: RealTimeNotification) => !n.read).length,
        }));
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    if (!apiKey || wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/notifications?api_key=${encodeURIComponent(apiKey)}`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Real-time notifications WebSocket connected');
        startTransition(() => {
          setState(prev => ({
            ...prev,
            isConnected: true,
            connectionError: null,
          }));
        });
        reconnectAttempts.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const notification: RealTimeNotification = JSON.parse(event.data);
          
          startTransition(() => {
            setState(prev => ({
              ...prev,
              notifications: [notification, ...prev.notifications].slice(0, 100), // Keep last 100
              unreadCount: prev.unreadCount + (notification.read ? 0 : 1),
            }));
          });

          // Show browser notification for critical/error notifications
          if ((notification.severity === 'critical' || notification.severity === 'error') && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              new Notification(`SecureNet: ${notification.title}`, {
                body: notification.message,
                icon: '/securenet-logo.png',
                tag: `notification-${notification.id}`,
              });
            }
          }
        } catch (error) {
          console.error('Error parsing notification message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        startTransition(() => {
          setState(prev => ({
            ...prev,
            connectionError: 'Connection error',
          }));
        });
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        startTransition(() => {
          setState(prev => ({
            ...prev,
            isConnected: false,
          }));
        });

        // Attempt to reconnect if not closed normally
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connectWebSocket();
          }, delay);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
              startTransition(() => {
          setState(prev => ({
            ...prev,
            connectionError: 'Failed to connect',
          }));
        });
    }
  }, [apiKey]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      await apiClient.post(`/api/notifications/${notificationId}/read`);
      startTransition(() => {
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(n =>
            n.id === notificationId ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, prev.unreadCount - 1),
        }));
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await apiClient.post('/api/notifications/read-all');
      startTransition(() => {
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: number) => {
    try {
      await apiClient.delete(`/api/notifications/${notificationId}`);
      startTransition(() => {
        setState(prev => {
          const notification = prev.notifications.find(n => n.id === notificationId);
          return {
            ...prev,
            notifications: prev.notifications.filter(n => n.id !== notificationId),
            unreadCount: notification && !notification.read ? prev.unreadCount - 1 : prev.unreadCount,
          };
        });
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  // Request browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  // Initialize
  useEffect(() => {
    // Check if we have a valid API key or auth token
    const hasAuth = apiKey || localStorage.getItem('auth_token');
    if (hasAuth) {
      fetchNotifications();
      connectWebSocket();
      requestNotificationPermission();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [apiKey, fetchNotifications, connectWebSocket, requestNotificationPermission]);

  return {
    ...state,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications,
  };
} 