import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiClient, initializeApiClient } from '../../../api/client';
import { useToast } from '../../../components/common/ToastContainer';
import type { ApiEndpoints } from '../../../api/endpoints';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  last_login: string;
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

// Development mode bypass
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
      setUser(null);
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
      if (token) {
        try {
          const response = await apiClient.get<ApiEndpoints['GET']['/api/auth/me']['response']>('/api/auth/me');
          setUser(response.data.user);
          // Initialize API key after successful auth check
          await initializeApiClient();
        } catch (error) {
          // Token is invalid or expired
          handleAuthError();
          showToast({
            type: 'error',
            message: 'Your session has expired. Please log in again.',
          });
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [navigate, location.pathname, showToast]);

  const login = async (username: string, password: string) => {
    try {
      // The response is now the full response with status and data
      type LoginResponse = {
        status: 'success' | 'error';
        data: {
          token: string;
          user: User;
        };
        timestamp: string;
      };
      
      const response = await apiClient.post<LoginResponse>('/api/auth/login', { username, password });
      if (response.data.status === 'success') {
        const { token, user } = response.data.data;
        localStorage.setItem('auth_token', token);
        setUser(user);
        
        // Initialize API key after successful login
        const apiKeyInitialized = await initializeApiClient();
        if (!apiKeyInitialized) {
          showToast({
            type: 'error',
            message: 'Failed to initialize API key. Some features may not work.',
          });
        }
        
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
      handleAuthError();
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