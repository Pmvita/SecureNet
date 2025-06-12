import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
}

// Development mode bypass
const DEV_MODE = import.meta.env.VITE_MOCK_DATA === 'true';

// Role-based permissions mapping
const ROLE_PERMISSIONS = {
  superadmin: ['system_admin', 'manage_settings', 'manage_users', 'manage_organizations', 'view_audit_logs'],
  platform_admin: ['manage_settings', 'manage_org_users', 'view_org_data'],
  end_user: ['view_dashboard', 'view_logs', 'view_network'],
  admin: ['system_admin', 'manage_settings'], // Legacy admin role
  user: ['view_dashboard', 'view_logs'] // Legacy user role
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
            background: rgb(3 7 18);
          }

          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgb(55 65 81);
            border-top-color: rgb(59 130 246);
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
    // Check if user has required permissions based on their role
    const userPermissions = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [];
    const hasRequiredPermissions = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );

    if (!hasRequiredPermissions) {
      return (
        <div className="unauthorized-screen">
          <div className="unauthorized-content">
            <h1>🔒 Access Denied</h1>
            <p>You don't have permission to access this page.</p>
            <p className="role-info">
              Current role: <span className="role-badge">{user.role}</span>
            </p>
            <button 
              onClick={() => window.history.back()}
              className="back-button"
            >
              Go Back
            </button>
          </div>
          <style>{`
            .unauthorized-screen {
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: rgb(3 7 18);
              padding: 1rem;
            }

            .unauthorized-content {
              text-align: center;
              background: rgb(17 24 39);
              padding: 2rem;
              border-radius: 0.75rem;
              border: 1px solid rgb(55 65 81);
              max-width: 400px;
            }

            h1 {
              color: rgb(239 68 68);
              margin: 0 0 1rem;
              font-size: 1.5rem;
              font-weight: bold;
            }

            p {
              color: rgb(156 163 175);
              margin: 0 0 1rem;
            }

            .role-info {
              margin: 1.5rem 0;
            }

            .role-badge {
              background: rgb(59 130 246);
              color: white;
              padding: 0.25rem 0.5rem;
              border-radius: 0.375rem;
              font-size: 0.875rem;
              font-weight: 500;
            }

            .back-button {
              background: rgb(55 65 81);
              color: white;
              border: none;
              padding: 0.5rem 1rem;
              border-radius: 0.375rem;
              cursor: pointer;
              transition: background-color 0.2s;
            }

            .back-button:hover {
              background: rgb(75 85 99);
            }
          `}</style>
        </div>
      );
    }
  }

  return <>{children}</>;
}; 