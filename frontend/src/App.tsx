import React, { useEffect, useState } from 'react';
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
import { initializeApiClient } from './api/client';
import LoadingSpinner from './components/LoadingSpinner';

// Development mode bypass
const DEV_MODE = import.meta.env.VITE_MOCK_DATA === 'true';

// Main App Routes Component (needs to be inside AuthProvider)
const AppRoutes: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // Navigation items for the sidebar - role-based
  const getNavigationItems = () => {
    const baseItems = [
      { path: '/', label: 'Dashboard', icon: '📊' },
      { path: '/logs', label: 'Logs', icon: '📝' },
      { path: '/security', label: 'Security', icon: '🔒' },
      { path: '/network', label: 'Network', icon: '🌐' },
      { path: '/anomalies', label: 'Anomalies', icon: '⚠️' },
      { path: '/settings', label: 'Settings', icon: '⚙️' },
    ];

    // Add admin navigation items for users with system_admin permissions
    // Check for both 'superadmin' and 'admin' roles (legacy support)
    if (user?.role === 'superadmin' || user?.role === 'admin') {
      return [
        ...baseItems,
        { path: '/admin', label: 'Admin Dashboard', icon: '👑' },
        { path: '/admin/users', label: 'Users', icon: '👥' },
        { path: '/admin/tenants', label: 'Tenants', icon: '🏢' },
        { path: '/admin/billing', label: 'Billing', icon: '💳' },
        { path: '/admin/audit', label: 'Audit Logs', icon: '📋' },
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
  const [isInitialized, setIsInitialized] = useState(DEV_MODE);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        // In development mode, skip API client initialization
        if (DEV_MODE) {
          setIsInitialized(true);
          return;
        }

        const success = await initializeApiClient();
        if (!success) {
          setError('Failed to initialize API client. Please check your connection and try again.');
        }
        setIsInitialized(true);
      } catch (err) {
        console.error('Initialization error:', err);
        setError('An unexpected error occurred while initializing the application.');
        setIsInitialized(true);
      }
    };

    if (!DEV_MODE) {
      init();
    }
  }, []);

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

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <Router>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </Router>
        </ToastProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App; 