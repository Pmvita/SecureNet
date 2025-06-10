import React, { useState } from 'react';
import {
  BellIcon,
  CheckIcon,
  XMarkIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  timestamp: string;
  read: boolean;
  category: 'security' | 'system' | 'network' | 'user';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// Mock notifications data
const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Critical Security Alert',
    message: 'Multiple failed login attempts detected from IP 192.168.1.50',
    type: 'error',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    read: false,
    category: 'security',
    priority: 'critical',
  },
  {
    id: '2',
    title: 'Network Scan Completed',
    message: 'Scheduled network scan completed successfully. 15 devices discovered.',
    type: 'success',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    read: false,
    category: 'network',
    priority: 'medium',
  },
  {
    id: '3',
    title: 'System Update Available',
    message: 'SecureNet v2.1.1 is available for download.',
    type: 'info',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    read: true,
    category: 'system',
    priority: 'low',
  },
  {
    id: '4',
    title: 'Anomaly Detected',
    message: 'Unusual traffic pattern detected on port 443.',
    type: 'warning',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    read: false,
    category: 'security',
    priority: 'high',
  },
  {
    id: '5',
    title: 'User Account Created',
    message: 'New user account "analyst2" has been created.',
    type: 'info',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    read: true,
    category: 'user',
    priority: 'low',
  },
  {
    id: '6',
    title: 'Database Backup Completed',
    message: 'Daily database backup completed successfully.',
    type: 'success',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    read: true,
    category: 'system',
    priority: 'low',
  },
];

export const NotificationsPage: React.FC = () => {
  // Check if we're in development mode
  const DEV_MODE = import.meta.env.VITE_MOCK_DATA === 'true';
  
  // Initialize notifications based on environment
  const [notifications, setNotifications] = useState<Notification[]>(DEV_MODE ? mockNotifications : []);
  const [filter, setFilter] = useState<'all' | 'unread' | 'security' | 'system' | 'network' | 'user'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // TODO: In real API mode, fetch notifications from backend
  React.useEffect(() => {
    if (!DEV_MODE) {
      // Here you would fetch real notifications from the API
      console.log('Real API mode: Would fetch notifications from /api/notifications');
      // Example API call (uncomment when backend endpoint exists):
      // fetchNotifications().then(setNotifications);
    }
  }, [DEV_MODE]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <XMarkIcon className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />;
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-blue-400" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'border-red-500 bg-red-900/20';
      case 'warning':
        return 'border-yellow-500 bg-yellow-900/20';
      case 'success':
        return 'border-green-500 bg-green-900/20';
      default:
        return 'border-blue-500 bg-blue-900/20';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const config = {
      critical: { label: 'Critical', color: 'bg-red-600' },
      high: { label: 'High', color: 'bg-orange-600' },
      medium: { label: 'Medium', color: 'bg-yellow-600' },
      low: { label: 'Low', color: 'bg-gray-600' },
    };
    const { label, color } = config[priority as keyof typeof config];
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${color}`}>
        {label}
      </span>
    );
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const filteredNotifications = notifications.filter(notif => {
    const matchesFilter = filter === 'all' || 
                         (filter === 'unread' && !notif.read) ||
                         notif.category === filter;
    
    const matchesSearch = searchQuery === '' || 
                         notif.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         notif.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center">
            <BellIcon className="w-7 h-7 mr-3" />
            Notifications
            {unreadCount > 0 && (
              <span className="ml-3 px-2 py-1 bg-red-500 text-white text-sm rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-gray-400 mt-1">
            Manage your system notifications and alerts
          </p>
        </div>
        
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <CheckIcon className="w-4 h-4 mr-2" />
            Mark All Read
          </button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center space-x-2">
            <FunnelIcon className="w-4 h-4 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'unread' | 'security' | 'system' | 'network' | 'user')}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Notifications</option>
              <option value="unread">Unread Only</option>
              <option value="security">Security</option>
              <option value="system">System</option>
              <option value="network">Network</option>
              <option value="user">User</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
            <BellIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No notifications found</h3>
            <p className="text-gray-400">
              {searchQuery ? 'Try adjusting your search terms.' : 'All caught up! No new notifications.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-gray-800 rounded-xl border p-4 transition-all hover:bg-gray-750 ${
                !notification.read 
                  ? `${getTypeColor(notification.type)} border-l-4` 
                  : 'border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getTypeIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className={`text-sm font-medium ${
                        notification.read ? 'text-gray-300' : 'text-white'
                      }`}>
                        {notification.title}
                      </h3>
                      {getPriorityBadge(notification.priority)}
                      <span className="text-xs text-gray-400 capitalize">
                        {notification.category}
                      </span>
                    </div>
                    
                    <p className={`text-sm ${
                      notification.read ? 'text-gray-400' : 'text-gray-300'
                    }`}>
                      {notification.message}
                    </p>
                    
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(notification.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 ml-4">
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                      title="Mark as read"
                    >
                      <CheckIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete notification"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stats */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-white">{notifications.length}</p>
            <p className="text-sm text-gray-400">Total</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-400">{unreadCount}</p>
            <p className="text-sm text-gray-400">Unread</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-400">
              {notifications.filter(n => n.category === 'security').length}
            </p>
            <p className="text-sm text-gray-400">Security</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-400">
              {notifications.filter(n => n.priority === 'critical' || n.priority === 'high').length}
            </p>
            <p className="text-sm text-gray-400">High Priority</p>
          </div>
        </div>
      </div>
    </div>
  );
}; 