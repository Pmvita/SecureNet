import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LockClosedIcon } from '@heroicons/react/24/outline';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
}

// Development mode bypass
const DEV_MODE = import.meta.env.VITE_MOCK_DATA === 'true';

// Role-based permissions mapping
const ROLE_PERMISSIONS = {
  // Founder role - unlimited access
  platform_founder: ['*'], // Wildcard - unlimited access to everything
  founder: ['*'], // Backup founder account
  // New role names
  platform_owner: ['system_admin', 'manage_settings', 'manage_users', 'manage_organizations', 'view_audit_logs'],
  security_admin: ['manage_settings', 'manage_org_users', 'view_org_data'],
  soc_analyst: ['view_dashboard', 'view_logs', 'view_network'],
  // Legacy role names for backward compatibility
  superadmin: ['system_admin', 'manage_settings', 'manage_users', 'manage_organizations', 'view_audit_logs'],
  manager: ['manage_settings', 'manage_org_users', 'view_org_data'],
  platform_admin: ['manage_settings', 'manage_org_users', 'view_org_data'],
  analyst: ['view_dashboard', 'view_logs', 'view_network'],
  end_user: ['view_dashboard', 'view_logs', 'view_network'],
  admin: ['system_admin', 'manage_settings'],
  user: ['view_dashboard', 'view_logs']
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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page but save the attempted url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredPermissions.length > 0 && user) {
    // FOUNDER HAS UNLIMITED ACCESS - Check if user has required permissions based on their role
    const userRole = user.role?.toLowerCase(); // Case-insensitive role checking
    const userPermissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS] || [];
    
    // Founder has unlimited access to everything
    const isFounder = userRole === 'platform_founder' || userRole === 'founder';
    const hasWildcardAccess = userPermissions.includes('*');
    const hasSpecificPermissions = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );
    
    const hasRequiredPermissions = isFounder || hasWildcardAccess || hasSpecificPermissions;

    if (!hasRequiredPermissions) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <div className="text-center">
            <LockClosedIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-gray-400">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}; 