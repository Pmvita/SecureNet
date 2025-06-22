import React, { createContext, useContext, useState, useEffect, startTransition } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiClient, initializeApiClient } from '../../../api/client';
import { useToast } from '../../../components/common/ToastContainer';
import type { ApiEndpoints } from '../../../api/endpoints';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'platform_founder' | 'founder' | 'platform_owner' | 'security_admin' | 'soc_analyst' | 'superadmin' | 'manager' | 'analyst' | 'platform_admin' | 'end_user' | 'admin' | 'user';
  last_login: string;
  last_logout?: string;
  login_count?: number;
  org_id?: string;
  organization_name?: string;
}

interface UserApiResponse {
  id: number;
  username: string;
  email: string;
  role: string;
  last_login: string;
  last_logout?: string;
  login_count?: number;
  org_id?: string;
  organization_name?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {
    throw new Error('useAuth must be used within an AuthProvider');
  },
  logout: async () => {
    throw new Error('useAuth must be used within an AuthProvider');
  },
});

// Export the hook directly as a const arrow function
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Development mode bypass - only when explicitly enabled
const DEV_MODE = import.meta.env.VITE_MOCK_DATA === 'true';
const DEV_USER: User = {
  id: '1',
  username: 'admin',
  email: 'admin@securenet.local',
  role: 'admin',
  last_login: new Date().toISOString(),
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(DEV_MODE ? DEV_USER : null);
  const [isLoading, setIsLoading] = useState(!DEV_MODE);
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const handleAuthError = () => {
    if (!DEV_MODE) {
      localStorage.removeItem('auth_token');
      startTransition(() => {
        setUser(null);
      });
      apiClient.clearApiKey();
      if (!location.pathname.includes('/login')) {
        navigate('/login', { replace: true });
      }
    }
  };

  useEffect(() => {
    // In development mode, skip auth check
    if (DEV_MODE) {
      setIsLoading(false);
      return;
    }

    // Check for existing session and initialize API key on mount
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      console.log('checkAuth: token exists?', !!token, 'DEV_MODE:', DEV_MODE);
      
      if (token) {
        try {
          console.log('checkAuth: calling /api/auth/whoami');
          const response = await apiClient.get('/api/auth/whoami');
          console.log('checkAuth: response received', response);
          
          // The API client interceptor unwraps the response, so response.data contains the user info directly
          const userData = response.data as UserApiResponse;
          console.log('checkAuth: userData parsed', userData);
          
          startTransition(() => {
            setUser({
              id: userData.id.toString(),
              username: userData.username,
              email: userData.email,
              role: userData.role as User['role'],
              last_login: userData.last_login || new Date().toISOString(),
              last_logout: userData.last_logout,
              login_count: userData.login_count,
              org_id: userData.org_id,
              organization_name: userData.organization_name,
            });
          });
          console.log('checkAuth: user set successfully');
          
          // Initialize API key after successful auth check
          console.log('Auth check successful, initializing API client...');
          const apiKeyInitialized = await initializeApiClient();
          console.log('API key initialized after auth check:', apiKeyInitialized);
        } catch (error) {
          console.error('Auth check failed:', error);
          console.error('Error details:', {
            message: (error as Error)?.message,
            status: (error as { response?: { status?: number } })?.response?.status,
            data: (error as { response?: { data?: unknown } })?.response?.data
          });
          // Token is invalid or expired
          handleAuthError();
          showToast({
            type: 'error',
            message: 'Your session has expired. Please log in again.',
          });
        }
      }
      startTransition(() => {
        setIsLoading(false);
      });
    };

    checkAuth();
  }, [showToast]);

  const login = async (username: string, password: string) => {
    try {
      startTransition(() => {
        setIsLoading(true); // Show loading during entire login process
      });
      
      // Make the login request using the special login method
      const backendResponse = await apiClient.loginRequest(username, password);
      
      if (backendResponse.status === 'success') {
        const { token, user } = backendResponse.data;
        localStorage.setItem('auth_token', token);
        
        // Initialize API key BEFORE setting user state and navigating
        console.log('Login successful, initializing API client...');
        const apiKeyInitialized = await initializeApiClient();
        console.log('API key initialized:', apiKeyInitialized);
        
        if (!apiKeyInitialized) {
          console.error('API key initialization failed');
          // Don't proceed with login if API key initialization fails
          localStorage.removeItem('auth_token');
          startTransition(() => {
            setIsLoading(false);
          });
          showToast({
            type: 'error',
            message: 'Failed to initialize API key. Please try logging in again.',
          });
          return;
        }
        
        // Only set user state AFTER API key is successfully initialized
        startTransition(() => {
          setUser({
            id: user.id.toString(),
            username: user.username,
            email: user.email,
            role: user.role as User['role'],
            last_login: user.last_login || new Date().toISOString(),
            last_logout: user.last_logout,
            login_count: user.login_count,
            org_id: user.org_id,
            organization_name: user.organization_name,
          });
          
          setIsLoading(false);
        });
        
        showToast({
          type: 'success',
          message: 'Successfully logged in',
        });

        // Navigate to the page the user was trying to access, or home
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      startTransition(() => {
        setIsLoading(false);
      });
      showToast({
        type: 'error',
        message: 'Invalid username or password',
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiClient.post<ApiEndpoints['POST']['/api/auth/logout']['response']>('/api/auth/logout', {});
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear auth state regardless of dev mode for logout
      localStorage.removeItem('auth_token');
      startTransition(() => {
        setUser(null);
      });
      apiClient.clearApiKey();
      
      // Navigate to login page
      navigate('/login', { replace: true });
      
      showToast({
        type: 'info',
        message: 'Successfully logged out',
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export type { AuthContextType };
export type { User }; 