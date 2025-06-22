import React, { Suspense, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastProvider } from './components/common/ToastContainer';
import { AuthProvider, useAuth } from './features/auth/context/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './features/auth/components/ProtectedRoute';
import { LoginPage } from './features/auth/pages/LoginPage';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Auth pages
const SignupPage = React.lazy(() => import('./features/auth/pages/SignupPage').then(module => ({ default: module.SignupPage })));
const OnboardingPage = React.lazy(() => import('./features/auth/pages/OnboardingPage').then(module => ({ default: module.OnboardingPage })));

// Day 2 Sprint 1: Lazy loading for code splitting
const DashboardPage = React.lazy(() => import('./features/dashboard/pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const LogsPage = React.lazy(() => import('./features/logs/pages/LogsPage'));
const SecurityPage = React.lazy(() => import('./features/security/pages/SecurityPage').then(module => ({ default: module.SecurityPage })));
const NetworkPage = React.lazy(() => import('./features/network/pages/NetworkPage').then(module => ({ default: module.NetworkPage })));
const AnomaliesPage = React.lazy(() => import('./features/anomalies/pages/AnomaliesPage').then(module => ({ default: module.AnomaliesPage })));
const SettingsPage = React.lazy(() => import('./features/settings/pages/SettingsPage').then(module => ({ default: module.SettingsPage })));
const ProfilePage = React.lazy(() => import('./features/profile/pages/ProfilePage').then(module => ({ default: module.ProfilePage })));
const PreferencesPage = React.lazy(() => import('./features/preferences/pages/PreferencesPage').then(module => ({ default: module.PreferencesPage })));
const NotificationsPage = React.lazy(() => import('./features/notifications/pages/NotificationsPage').then(module => ({ default: module.NotificationsPage })));

// Admin pages - separate chunk
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const UsersManagement = React.lazy(() => import('./pages/admin/UsersManagement'));
const TenantsManagement = React.lazy(() => import('./pages/admin/TenantsManagement'));
const BillingManagement = React.lazy(() => import('./pages/admin/BillingManagement'));
const AuditLogs = React.lazy(() => import('./pages/admin/AuditLogs'));

// Founder pages - ultimate access
const FounderDashboard = React.lazy(() => import('./pages/founder/FounderDashboard').then(module => ({ default: module.FounderDashboard })));
const FinancialControl = React.lazy(() => import('./pages/founder/FinancialControl').then(module => ({ default: module.FinancialControl })));
const SystemAdministration = React.lazy(() => import('./pages/founder/SystemAdministration').then(module => ({ default: module.SystemAdministration })));
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

    // Get user role in lowercase for consistent comparison
    const userRole = user?.role?.toLowerCase();

    // Add founder navigation items for ultimate access
    if (userRole === 'platform_founder' || userRole === 'founder') {
      return [
        ...baseItems,
        { path: '/founder', label: '🏆 Executive Command Center', icon: 'StarIcon' },
        { path: '/founder/financial', label: '💰 Financial Control', icon: 'CreditCardIcon' },
        { path: '/founder/system', label: '⚙️ System Administration', icon: 'Cog6ToothIcon' },
        { path: '/admin', label: 'Admin Dashboard', icon: 'StarIcon' },
        { path: '/admin/users', label: 'Users', icon: 'UsersIcon' },
        { path: '/admin/tenants', label: 'Tenants', icon: 'BuildingOfficeIcon' },
        { path: '/admin/billing', label: 'Billing', icon: 'CreditCardIcon' },
        { path: '/admin/audit', label: 'Audit Logs', icon: 'ClipboardDocumentListIcon' },
      ];
    }

    // Add admin navigation items for users with system_admin permissions
    // Check for both new and legacy roles (case-insensitive)
    if (userRole === 'platform_owner' || userRole === 'security_admin' || 
        userRole === 'superadmin' || userRole === 'admin' || userRole === 'manager' || userRole === 'platform_admin') {
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
      
      {/* Signup Route */}
      <Route 
        path="/signup" 
        element={
          isAuthenticated ? <Navigate to="/" replace /> : (
            <Suspense fallback={<LoadingSpinner />}>
              <SignupPage />
            </Suspense>
          )
        } 
      />
      
      {/* Onboarding Route */}
      <Route 
        path="/onboarding" 
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <OnboardingPage />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      
      {/* Protected Dashboard Routes */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <DashboardLayout navigationItems={getNavigationItems()}>
              <Routes>
                <Route index element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <DashboardPage />
                  </Suspense>
                } />
                <Route path="logs" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <LogsPage />
                  </Suspense>
                } />
                <Route path="security" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <SecurityPage />
                  </Suspense>
                } />
                <Route path="network" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <NetworkPage />
                  </Suspense>
                } />
                <Route path="anomalies" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <AnomaliesPage />
                  </Suspense>
                } />
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

                {/* Founder Routes - Ultimate Access Only */}
                <Route
                  path="founder"
                  element={
                    <ProtectedRoute requiredPermissions={['founder_unlimited_access']}>
                      <Suspense fallback={<LoadingSpinner />}>
                        <FounderDashboard />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="founder/financial"
                  element={
                    <ProtectedRoute requiredPermissions={['founder_financial_control']}>
                      <Suspense fallback={<LoadingSpinner />}>
                        <FinancialControl />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="founder/system"
                  element={
                    <ProtectedRoute requiredPermissions={['founder_system_administration']}>
                      <Suspense fallback={<LoadingSpinner />}>
                        <SystemAdministration />
                      </Suspense>
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