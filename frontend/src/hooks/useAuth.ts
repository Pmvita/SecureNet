import { useState, useCallback, useEffect } from 'react';
import { authApi, userApi } from '../lib/api/endpoints';
import type { UserProfile, ApiError } from '../types';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: ApiError | null;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  reset: () => void;
}

const TOKEN_KEY = 'auth_token';
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useAuth(): AuthState & AuthActions {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem(TOKEN_KEY),
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const reset = useCallback(() => {
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    localStorage.removeItem(TOKEN_KEY);
  }, []);

  const setAuthState = useCallback((updates: Partial<AuthState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const login = useCallback(async ({ email, password }: LoginCredentials) => {
    try {
      setAuthState({ isLoading: true, error: null });
      const response = await authApi.login(email, password);
      const { token, user } = response.data;
      localStorage.setItem(TOKEN_KEY, token);
      setAuthState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      setAuthState({
        error: error as ApiError,
        isLoading: false,
      });
      throw error;
    }
  }, [setAuthState]);

  const logout = useCallback(async () => {
    try {
      setAuthState({ isLoading: true });
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      reset();
    }
  }, [reset, setAuthState]);

  const refreshToken = useCallback(async () => {
    if (!state.token) return;

    try {
      const response = await authApi.refreshToken();
      const { token } = response.data;
      localStorage.setItem(TOKEN_KEY, token);
      setAuthState({ token });
    } catch (error) {
      console.error('Token refresh error:', error);
      reset();
    }
  }, [state.token, reset, setAuthState]);

  const updateProfile = useCallback(async (profile: Partial<UserProfile>) => {
    try {
      setAuthState({ isLoading: true, error: null });
      const response = await userApi.updateProfile(profile);
      setAuthState({
        user: response.data,
        isLoading: false,
      });
    } catch (error) {
      setAuthState({
        error: error as ApiError,
        isLoading: false,
      });
      throw error;
    }
  }, [setAuthState]);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      if (!state.token) {
        setAuthState({ isLoading: false });
        return;
      }

      try {
        const response = await authApi.getCurrentUser();
        setAuthState({
          user: response.data,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error) {
        console.error('Auth initialization error:', error);
        reset();
      }
    };

    initializeAuth();
  }, [state.token, reset, setAuthState]);

  // Set up token refresh interval
  useEffect(() => {
    if (!state.token) return;

    const intervalId = setInterval(() => {
      refreshToken();
    }, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [state.token, refreshToken]);

  // Set up token validation on window focus
  useEffect(() => {
    if (!state.token) return;

    const validateToken = async () => {
      try {
        const response = await authApi.validateToken(state.token!);
        if (!response.data.valid) {
          reset();
        }
      } catch (error) {
        console.error('Token validation error:', error);
        reset();
      }
    };

    const handleFocus = () => {
      validateToken();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [state.token, reset]);

  return {
    ...state,
    login,
    logout,
    refreshToken,
    updateProfile,
    reset,
  };
}

// Example usage:
/*
function LoginForm() {
  const { login, isLoading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({
        email: 'user@example.com',
        password: 'password123',
      });
      // Redirect or show success message
    } catch (error) {
      // Error is handled by the hook
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div>Error: {error.message}</div>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}

function Profile() {
  const { user, updateProfile, logout } = useAuth();

  if (!user) return null;

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <button onClick={() => updateProfile({ name: 'New Name' })}>
        Update Name
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
*/ 