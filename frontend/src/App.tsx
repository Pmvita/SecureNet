import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastProvider } from './components/common/ToastContainer';
import { AuthProvider } from './features/auth/context/AuthContext';
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
import { initializeApiClient } from './api/client';
import LoadingSpinner from './components/LoadingSpinner';

// Development mode bypass
const DEV_MODE = import.meta.env.VITE_MOCK_DATA === 'true';

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

  // Navigation items for the sidebar
  const navigationItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/logs', label: 'Logs', icon: '📝' },
    { path: '/security', label: 'Security', icon: '🔒' },
    { path: '/network', label: 'Network', icon: '🌐' },
    { path: '/anomalies', label: 'Anomalies', icon: '⚠️' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-dark-200 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-300">Initializing application...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-200 flex items-center justify-center">
        <div className="text-center p-8 bg-dark-100 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
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
            <Routes>
              {!DEV_MODE && <Route path="/login" element={<LoginPage />} />}
              {DEV_MODE && <Route path="/login" element={<Navigate to="/" replace />} />}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <DashboardLayout navigationItems={navigationItems}>
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
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </Router>
      </ToastProvider>
      <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App; 