import React, { useState, useEffect } from 'react';
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
import { useToast } from '../../../components/common/ToastContainer';
import { useRealTimeNotifications } from '../../../hooks/useRealTimeNotifications';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  timestamp: string;
  read: boolean;
  category: 'security' | 'system' | 'network' | 'user';
  priority: 'low' | 'medium' | 'high' | 'critical';
  severity?: string; // Backend uses 'severity' instead of 'priority'
  created_at?: string; // Backend uses 'created_at' instead of 'timestamp'
}

export const NotificationsPage: React.FC = () => {
  const { showToast } = useToast();
  
  // Map backend severity to frontend type
  const mapSeverityToType = (severity: string): 'info' | 'warning' | 'success' | 'error' => {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'success':
        return 'success';
      default:
        return 'info';
    }
  };

  // Map backend severity to frontend priority
  const mapSeverityToPriority = (severity: string): 'low' | 'medium' | 'high' | 'critical' => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'critical';
      case 'warning':
        return 'high';
      case 'success':
        return 'medium';
      default:
        return 'low';
    }
  };
  
  // Use the same real-time notifications hook as the notification icon
  const { 
    notifications: realTimeNotifications, 
    unreadCount, 
    isConnected,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead,
    deleteNotification: deleteRealTimeNotification,
    refresh: refreshNotifications
  } = useRealTimeNotifications();

  const [filter, setFilter] = useState<'all' | 'unread' | 'security' | 'system' | 'network' | 'user'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Transform real-time notifications to match the expected format
  const notifications: Notification[] = realTimeNotifications.map((notif) => ({
    id: notif.id.toString(),
    title: notif.title,
    message: notif.message,
    type: mapSeverityToType(notif.severity),
    timestamp: notif.timestamp,
    read: notif.read,
    category: (notif.category as 'security' | 'system' | 'network' | 'user') || 'system',
    priority: mapSeverityToPriority(notif.severity),
    severity: notif.severity,
    created_at: notif.timestamp,
  }));

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

  const markAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(parseInt(id));
      showToast({
        type: 'success',
        message: 'Notification marked as read',
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      showToast({
        type: 'error',
        message: 'Failed to mark notification as read',
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      showToast({
        type: 'success',
        message: 'All notifications marked as read',
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      showToast({
        type: 'error',
        message: 'Failed to mark all notifications as read',
      });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteRealTimeNotification(parseInt(id));
      showToast({
        type: 'success',
        message: 'Notification deleted',
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
      showToast({
        type: 'error',
        message: 'Failed to delete notification',
      });
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await refreshNotifications();
      showToast({
        type: 'success',
        message: 'Notifications refreshed',
      });
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
      showToast({
        type: 'error',
        message: 'Failed to refresh notifications',
      });
    } finally {
      setIsLoading(false);
    }
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
            <div className={`ml-3 w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} 
                 title={isConnected ? 'Connected' : 'Disconnected'} />
          </h1>
          <p className="text-gray-400 mt-1">
            Manage your system notifications and alerts
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <svg className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
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
        {isLoading ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-white mb-2">Loading notifications...</h3>
            <p className="text-gray-400">Please wait while we fetch your notifications.</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
            <BellIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No notifications found</h3>
            <p className="text-gray-400">
              {searchQuery ? 'Try adjusting your search terms.' : notifications.length === 0 ? 'All caught up! No new notifications.' : 'No notifications match your current filter.'}
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