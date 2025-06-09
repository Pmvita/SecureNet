import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
}

// Development mode bypass
const DEV_MODE = process.env.REACT_APP_MOCK_DATA === 'true';
const DEV_USER = {
  id: '1',
  username: 'admin',
  email: 'admin@securenet.local',
  role: 'admin' as const,
  last_login: new Date().toISOString(),
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermissions = [],
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // In development mode, bypass authentication
  if (DEV_MODE) {
    // Store a fake token to prevent other auth checks from failing
    if (!localStorage.getItem('auth_token')) {
      localStorage.setItem('auth_token', 'dev-token');
    }
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <style>{`
          .loading-screen {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-primary);
          }

          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--border-color);
            border-top-color: var(--primary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page but save the attempted url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredPermissions.length > 0 && user) {
    // For now, only admin role has all permissions
    const hasRequiredPermissions = user.role === 'admin';

    if (!hasRequiredPermissions) {
      return (
        <div className="unauthorized-screen">
          <h1>Access Denied</h1>
          <p>You don't have permission to access this page.</p>
          <style>{`
            .unauthorized-screen {
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              background: var(--bg-primary);
              padding: 1rem;
              text-align: center;
            }

            h1 {
              color: var(--error);
              margin: 0 0 1rem;
            }

            p {
              color: var(--text-secondary);
              margin: 0;
            }
          `}</style>
        </div>
      );
    }
  }

  return <>{children}</>;
}; 