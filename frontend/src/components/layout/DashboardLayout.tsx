import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  ChartBarIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon,
  BellIcon,
  UserCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  UserIcon,
  SunIcon,
  MoonIcon,
  UsersIcon,
  BuildingOfficeIcon,
  CreditCardIcon,
  ClipboardDocumentListIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../features/auth/context/AuthContext';
import { useRealTimeNotifications } from '../../hooks/useRealTimeNotifications';
import { CommandPalette } from '../CommandPalette';

export interface NavigationItem {
  path: string;
  label: string;
  icon: string;
}

export interface DashboardLayoutProps {
  children: React.ReactNode;
  navigationItems: NavigationItem[];
}

// Icon mapping for modern icons
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'ChartBarIcon': ChartBarIcon,
  'DocumentTextIcon': DocumentTextIcon,
  'ShieldCheckIcon': ShieldCheckIcon,
  'GlobeAltIcon': GlobeAltIcon,
  'ExclamationTriangleIcon': ExclamationTriangleIcon,
  'Cog6ToothIcon': Cog6ToothIcon,
  'CrownIcon': StarIcon,
  'UsersIcon': UsersIcon,
  'BuildingOfficeIcon': BuildingOfficeIcon,
  'CreditCardIcon': CreditCardIcon,
  'ClipboardDocumentListIcon': ClipboardDocumentListIcon,
  // Legacy emoji support (fallback)
  '📊': ChartBarIcon,
  '📝': DocumentTextIcon,
  '🔒': ShieldCheckIcon,
  '🌐': GlobeAltIcon,
  '⚠️': ExclamationTriangleIcon,
  '⚙️': Cog6ToothIcon,
  '👑': StarIcon,
  '👥': UsersIcon,
  '🏢': BuildingOfficeIcon,
  '💳': CreditCardIcon,
  '📋': ClipboardDocumentListIcon,
};

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  navigationItems,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { theme, actualTheme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Real-time notifications
  const { 
    notifications, 
    unreadCount, 
    isConnected, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
  } = useRealTimeNotifications();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Command palette keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Enhanced Sidebar */}
      <aside className={`fixed left-0 top-0 h-full bg-gradient-to-b from-gray-900 to-gray-950 border-r border-gray-800 transition-all duration-300 z-40 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <ShieldCheckIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">SecureNet</h1>
                  <p className="text-xs text-gray-400">Security Operations</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRightIcon className="w-5 h-5" />
              ) : (
                <ChevronLeftIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Search Bar - Hidden on pages with their own search */}
        {!sidebarCollapsed && !location.pathname.match(/\/(logs|security|network|anomalies)/) && (
          <div className="p-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const IconComponent = iconMap[item.icon] || ChartBarIcon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <IconComponent className={`flex-shrink-0 w-5 h-5 ${
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                }`} />
                {!sidebarCollapsed && (
                  <span className="ml-3 truncate">{item.label}</span>
                )}
                {!sidebarCollapsed && isActive && (
                  <div className="ml-auto w-2 h-2 bg-white rounded-full opacity-75"></div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>v2.1.0</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Online</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        {/* Enhanced Top Bar */}
        <header className="sticky top-0 z-30 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Breadcrumb */}
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-semibold text-white">
                  {navigationItems.find((item) => item.path === location.pathname)?.label || 'Dashboard'}
                </h2>
                <div className="hidden sm:flex items-center text-sm text-gray-400">
                  <span>/</span>
                  <span className="ml-2">Security Operations Center</span>
                </div>
              </div>

              {/* Top Bar Actions */}
              <div className="flex items-center space-x-4">
                {/* Theme Toggle */}
                <button
                  onClick={() => {
                    if (theme === 'dark') {
                      setTheme('light');
                    } else if (theme === 'light') {
                      setTheme('system');
                    } else {
                      setTheme('dark');
                    }
                  }}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  title={`Current: ${theme} theme - Click to cycle`}
                >
                  {actualTheme === 'dark' ? (
                    <SunIcon className="w-5 h-5" />
                  ) : (
                    <MoonIcon className="w-5 h-5" />
                  )}
                </button>

                {/* Notifications */}
                <div className="relative" ref={notificationsRef}>
                  <button
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                    title="Notifications"
                  >
                    <BellIcon className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {notificationsOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-gray-800 rounded-xl border border-gray-700 shadow-2xl">
                      <div className="p-4 border-b border-gray-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-semibold text-white">Notifications</h3>
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} 
                                 title={isConnected ? 'Connected' : 'Disconnected'} />
                          </div>
                          <div className="flex items-center space-x-2">
                            {unreadCount > 0 && (
                              <>
                                <button
                                  onClick={markAllAsRead}
                                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  Mark all read
                                </button>
                                <span className="text-sm text-blue-400">{unreadCount} new</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {notifications.slice(0, 5).map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b border-gray-700 last:border-b-0 hover:bg-gray-750 transition-colors cursor-pointer ${
                              !notification.read ? 'bg-gray-750/50' : ''
                            }`}
                            onClick={() => markAsRead(notification.id)}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`w-2 h-2 rounded-full mt-2 ${
                                notification.severity === 'critical' ? 'bg-red-500' :
                                notification.severity === 'warning' ? 'bg-yellow-500' :
                                notification.severity === 'error' ? 'bg-red-400' : 'bg-blue-500'
                              }`}></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white">{notification.title}</p>
                                <p className="text-xs text-gray-300 mt-1">{notification.message}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(notification.timestamp).toLocaleString()}
                                </p>
                              </div>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-3 border-t border-gray-700">
                        <button 
                          onClick={() => {
                            setNotificationsOpen(false);
                            navigate('/notifications');
                          }}
                          className="w-full text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          View all notifications
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* User Menu */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-3 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-white" />
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-medium text-white">{user?.username || 'User'}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        {user?.role === 'platform_owner' && (
                          <>
                            <StarIcon className="w-3 h-3 text-yellow-400" />
                            <span>Platform Owner</span>
                          </>
                        )}
                        {user?.role === 'security_admin' && (
                          <>
                            <Cog6ToothIcon className="w-3 h-3 text-blue-400" />
                            <span>Security Admin</span>
                          </>
                        )}
                        {user?.role === 'soc_analyst' && (
                          <>
                            <UserIcon className="w-3 h-3 text-green-400" />
                            <span>SOC Analyst</span>
                          </>
                        )}
                        {user?.role === 'superadmin' && (
                          <>
                            <StarIcon className="w-3 h-3 text-yellow-400" />
                            <span>Super Admin</span>
                          </>
                        )}
                        {user?.role === 'manager' && (
                          <>
                            <Cog6ToothIcon className="w-3 h-3 text-blue-400" />
                            <span>Manager</span>
                          </>
                        )}
                        {user?.role === 'analyst' && (
                          <>
                            <UserIcon className="w-3 h-3 text-green-400" />
                            <span>Analyst</span>
                          </>
                        )}
                        {user?.role === 'platform_admin' && (
                          <>
                            <Cog6ToothIcon className="w-3 h-3 text-blue-400" />
                            <span>Platform Admin</span>
                          </>
                        )}
                        {user?.role === 'end_user' && (
                          <>
                            <UserIcon className="w-3 h-3 text-green-400" />
                            <span>End User</span>
                          </>
                        )}
                        {user?.role === 'admin' && <span>Administrator</span>}
                        {!user?.role && <span>User</span>}
                        {user?.organization_name && ` • ${user.organization_name}`}
                      </p>
                    </div>
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* User Dropdown */}
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-gray-800 rounded-xl border border-gray-700 shadow-2xl">
                      <div className="p-4 border-b border-gray-700">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{user?.username || 'User'}</p>
                            <p className="text-xs text-gray-400">{user?.email || 'user@securenet.com'}</p>
                            <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                              {user?.role === 'platform_owner' && (
                                <>
                                  <StarIcon className="w-3 h-3 text-yellow-400" />
                                  <span>Platform Owner</span>
                                </>
                              )}
                              {user?.role === 'security_admin' && (
                                <>
                                  <Cog6ToothIcon className="w-3 h-3 text-blue-400" />
                                  <span>Security Admin</span>
                                </>
                              )}
                              {user?.role === 'soc_analyst' && (
                                <>
                                  <UserIcon className="w-3 h-3 text-green-400" />
                                  <span>SOC Analyst</span>
                                </>
                              )}
                              {user?.role === 'superadmin' && (
                                <>
                                  <StarIcon className="w-3 h-3 text-yellow-400" />
                                  <span>Super Admin</span>
                                </>
                              )}
                              {user?.role === 'manager' && (
                                <>
                                  <Cog6ToothIcon className="w-3 h-3 text-blue-400" />
                                  <span>Manager</span>
                                </>
                              )}
                              {user?.role === 'analyst' && (
                                <>
                                  <UserIcon className="w-3 h-3 text-green-400" />
                                  <span>Analyst</span>
                                </>
                              )}
                              {user?.role === 'platform_admin' && (
                                <>
                                  <Cog6ToothIcon className="w-3 h-3 text-blue-400" />
                                  <span>Platform Admin</span>
                                </>
                              )}
                              {user?.role === 'end_user' && (
                                <>
                                  <UserIcon className="w-3 h-3 text-green-400" />
                                  <span>End User</span>
                                </>
                              )}
                              {user?.role === 'admin' && <span>Administrator</span>}
                              {!user?.role && <span>User</span>}
                              {user?.organization_name && ` • ${user.organization_name}`}
                            </p>
                            {user?.last_login && (
                              <p className="text-xs text-gray-500 mt-1">
                                Last login: {new Date(user.last_login).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="py-2">
                        <button 
                          onClick={() => {
                            setUserMenuOpen(false);
                            navigate('/profile');
                          }}
                          className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                        >
                          <UserCircleIcon className="w-4 h-4 mr-3" />
                          Profile Settings
                        </button>
                        <button 
                          onClick={() => {
                            setUserMenuOpen(false);
                            navigate('/preferences');
                          }}
                          className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                        >
                          <Cog6ToothIcon className="w-4 h-4 mr-3" />
                          Preferences
                        </button>
                      </div>
                      <div className="py-2 border-t border-gray-700">
                        <button 
                          onClick={async () => {
                            setUserMenuOpen(false);
                            try {
                              await logout();
                            } catch (error) {
                              console.error('Logout failed:', error);
                            }
                          }}
                          className="w-full flex items-center px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-gray-700 transition-colors"
                        >
                          <ArrowRightOnRectangleIcon className="w-4 h-4 mr-3" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette 
        isOpen={commandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)} 
      />
    </div>
  );
}; 