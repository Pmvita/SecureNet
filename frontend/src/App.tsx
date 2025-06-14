import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastProvider } from './components/common/ToastContainer';
import { AuthProvider, useAuth } from './features/auth/context/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './features/auth/components/ProtectedRoute';
import { LoginPage } from './features/auth/pages/LoginPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardPage } from './features/dashboard/pages/DashboardPage';
import LogsPage from './features/logs/pages/LogsPage';
import { SecurityPage } from './features/security/pages/SecurityPage';
import { NetworkPage } from './features/network/pages/NetworkPage';
import { AnomaliesPage } from './features/anomalies/pages/AnomaliesPage';
import { SettingsPage } from './features/settings/pages/SettingsPage';
import { ProfilePage } from './features/profile/pages/ProfilePage';
import { PreferencesPage } from './features/preferences/pages/PreferencesPage';
import { NotificationsPage } from './features/notifications/pages/NotificationsPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import UsersManagement from './pages/admin/UsersManagement';
import TenantsManagement from './pages/admin/TenantsManagement';
import BillingManagement from './pages/admin/BillingManagement';
import AuditLogs from './pages/admin/AuditLogs';
import LoadingSpinner from './components/LoadingSpinner';
import {
  ChartBarIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon,
  StarIcon,
  UsersIcon,
  BuildingOfficeIcon,
  CreditCardIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { AppErrorBoundary } from './components/error/AppErrorBoundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';


// Development mode bypass
const DEV_MODE = import.meta.env.VITE_MOCK_DATA === 'true';

// Main App Routes Component (needs to be inside AuthProvider)
const AppRoutes: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // Navigation items for the sidebar - role-based
  const getNavigationItems = () => {
    const baseItems = [
      { path: '/', label: 'Dashboard', icon: 'ChartBarIcon' },
      { path: '/logs', label: 'Logs', icon: 'DocumentTextIcon' },
      { path: '/security', label: 'Security', icon: 'ShieldCheckIcon' },
      { path: '/network', label: 'Network', icon: 'GlobeAltIcon' },
      { path: '/anomalies', label: 'Anomalies', icon: 'ExclamationTriangleIcon' },
      { path: '/settings', label: 'Settings', icon: 'Cog6ToothIcon' },
    ];

    // Add admin navigation items for users with system_admin permissions
    // Check for both new and legacy roles
    if (user?.role === 'platform_owner' || user?.role === 'security_admin' || 
        user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'manager' || user?.role === 'platform_admin') {
      return [
        ...baseItems,
        { path: '/admin', label: 'Admin Dashboard', icon: 'StarIcon' },
        { path: '/admin/users', label: 'Users', icon: 'UsersIcon' },
        { path: '/admin/tenants', label: 'Tenants', icon: 'BuildingOfficeIcon' },
        { path: '/admin/billing', label: 'Billing', icon: 'CreditCardIcon' },
        { path: '/admin/audit', label: 'Audit Logs', icon: 'ClipboardDocumentListIcon' },
      ];
    }

    return baseItems;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Login Route */}
      <Route 
        path="/login" 
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
        } 
      />
      
      {/* Protected Dashboard Routes */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <DashboardLayout navigationItems={getNavigationItems()}>
              <Routes>
                <Route index element={<DashboardPage />} />
                <Route path="logs" element={<LogsPage />} />
                <Route path="security" element={<SecurityPage />} />
                <Route path="network" element={<NetworkPage />} />
                <Route path="anomalies" element={<AnomaliesPage />} />
                <Route
                  path="settings"
                  element={
                    <ProtectedRoute requiredPermissions={['manage_settings']}>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="preferences" element={<PreferencesPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                
                {/* Admin Routes - Only accessible by superadmin */}
                <Route
                  path="admin"
                  element={
                    <ProtectedRoute requiredPermissions={['system_admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="admin/users"
                  element={
                    <ProtectedRoute requiredPermissions={['system_admin']}>
                      <UsersManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="admin/tenants"
                  element={
                    <ProtectedRoute requiredPermissions={['system_admin']}>
                      <TenantsManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="admin/billing"
                  element={
                    <ProtectedRoute requiredPermissions={['system_admin']}>
                      <BillingManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="admin/audit"
                  element={
                    <ProtectedRoute requiredPermissions={['system_admin']}>
                      <AuditLogs />
                    </ProtectedRoute>
                  }
                />
                
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

const App: React.FC = () => {
  // In development mode, we don't need to initialize the API client at app level
  // API client initialization happens after login in AuthContext
  const [isInitialized] = useState(true);
  const [error] = useState<string | null>(null);

  // Remove the useEffect that was causing conflicts with login-based initialization

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-300">Initializing application...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center p-8 bg-gray-900 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Create a client
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    },
  });

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <Router>
              <AuthProvider>
                <AppRoutes />
              </AuthProvider>
            </Router>
          </ToastProvider>
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </AppErrorBoundary>
  );
};

export default App; 