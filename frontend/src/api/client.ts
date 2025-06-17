import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { ApiEndpoints } from './endpoints';
import { validateApiError } from './schemas';

// Custom error types
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public details: Record<string, unknown>) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Type for API response data
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data: T;
  timestamp: string;
}

// Type-safe API client
export class ApiClient {
  private client: AxiosInstance;
  private apiKey: string | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.client = axios.create({
      baseURL: 'http://127.0.0.1:8000',  // Add base URL for the backend
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    
    // Set dev API key immediately in development mode (but not in Enterprise mode)
    if ((process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') && 
        import.meta.env.VITE_MOCK_DATA === 'true') {
      this.setApiKey('dev-api-key');
    }
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        if (this.apiKey) {
          config.headers['X-API-Key'] = this.apiKey;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Return the full response for login endpoint
        if (response.config.url === '/api/auth/login') {
          return response;
        }
        // Don't unwrap the response here - let the API methods handle it
        return response;
      },
      (error) => {
        if (error.response?.data?.status === 'error') {
          return Promise.reject(new ApiError(
            error.response.data.data,
            'API_ERROR',
            error.response.status
          ));
        }
        if (error.response?.status === 401 || error.response?.status === 403) {
          // In mock mode, only clear on 401 (not 403) to avoid API key issues
          if (import.meta.env.VITE_MOCK_DATA === 'true') {
            if (error.response?.status === 401) {
              localStorage.removeItem('auth_token');
              if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
              }
            }
            // Don't clear API key or redirect on 403 in mock mode
            return Promise.reject(error);
          }
          
          // In production mode, be more careful about clearing auth state
          // Only clear on 401 (unauthorized)
          if (error.response?.status === 401) {
            // 401 means the JWT token is invalid/expired
            localStorage.removeItem('auth_token');
            this.clearApiKey();
            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
          } else if (error.response?.status === 403) {
            // For 403 errors, only clear auth state if it's NOT the API key endpoint
            // API key 403 errors are expected for soc_analyst users
            const isApiKeyRequest = error.config?.url?.includes('/api/get-api-key');
            if (!isApiKeyRequest && !this.apiKey && this.isInitialized) {
              // 403 on non-API-key endpoint without API key means we need to re-authenticate
              localStorage.removeItem('auth_token');
              this.clearApiKey();
              if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
              }
            }
            // If it's an API key request or we have an API key, it's just a permission issue
            // Don't clear auth state in these cases
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async initialize(): Promise<boolean> {
    // Only initialize once successfully - for users with API keys, check both conditions
    // For users without API keys (like soc_analyst), just check isInitialized
    if (this.isInitialized) {
      console.log('API client already initialized, skipping...');
      return true;
    }

    // In development mode with mock data, set a default API key and token
    const isMockMode = import.meta.env.VITE_MOCK_DATA === 'true';
    
    if (isMockMode) {
      this.setApiKey('dev-api-key');
      // Set a dev token if none exists
      if (!localStorage.getItem('auth_token')) {
        localStorage.setItem('auth_token', 'dev-token');
      }
      this.isInitialized = true;
      console.log('API client initialized in development mode with dev-api-key');
      return true;
    }

    // Check if we have an auth token
    const token = localStorage.getItem('auth_token');
    console.log('Initializing API client... Token exists:', !!token);
    
    if (!token) {
      console.log('No auth token found, skipping API key initialization');
      this.isInitialized = false;
      return false;
    }

    try {
      console.log('Attempting to get API key...');
      const response = await this.client.get<ApiResponse<{ api_key: string }>>('/api/get-api-key');
      console.log('API key response received:', response);
      
      if (response?.data?.data?.api_key) {
        this.setApiKey(response.data.data.api_key);
        console.log('API key set successfully:', response.data.data.api_key.substring(0, 10) + '...');
        this.isInitialized = true;
        console.log('API client initialization complete with API key');
        return true;
      } else {
        console.warn('No API key in response:', response);
        this.isInitialized = false;
        return false;
      }
    } catch (error) {
      console.error('Failed to get API key:', error);
      
      // Check if this is a 403 error (user doesn't have permission for API key)
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        console.log('User does not have API key permissions (soc_analyst role) - continuing without API key');
        this.isInitialized = true; // Allow initialization to succeed for analyst users
        return true; // Return success for 403 errors
      }
      
      this.isInitialized = false;
      return false;
    }
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    // Handle the backend's wrapped response format
    if (response.data && typeof response.data === "object" && "status" in response.data && "data" in response.data) {
      return response.data as ApiResponse<T>;
    }
    // Fallback for unexpected response format
    return { status: 'success', data: response.data as T, timestamp: new Date().toISOString() };
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    // Handle the backend's wrapped response format
    if (response.data && typeof response.data === "object" && "status" in response.data && "data" in response.data) {
      return response.data as ApiResponse<T>;
    }
    // Fallback for unexpected response format
    return { status: 'success', data: response.data as T, timestamp: new Date().toISOString() };
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    // Handle the backend's wrapped response format
    if (response.data && typeof response.data === "object" && "status" in response.data && "data" in response.data) {
      return response.data as ApiResponse<T>;
    }
    // Fallback for unexpected response format
    return { status: 'success', data: response.data as T, timestamp: new Date().toISOString() };
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    // Handle the backend's wrapped response format
    if (response.data && typeof response.data === "object" && "status" in response.data && "data" in response.data) {
      return response.data as ApiResponse<T>;
    }
    // Fallback for unexpected response format
    return { status: 'success', data: response.data as T, timestamp: new Date().toISOString() };
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    // Handle the backend's wrapped response format
    if (response.data && typeof response.data === "object" && "status" in response.data && "data" in response.data) {
      return response.data as ApiResponse<T>;
    }
    // Fallback for unexpected response format
    return { status: 'success', data: response.data as T, timestamp: new Date().toISOString() };
  }

  async loginRequest(username: string, password: string): Promise<{ status: string; data: { token: string; user: any }; timestamp: string }> {
    // Special method for login that returns the raw axios response
    const response = await this.client.post('/api/auth/login', { username, password });
    return response.data;
  }

  setApiKey(key: string): void {
    this.apiKey = key;
    this.client.defaults.headers['X-API-Key'] = key;
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  clearApiKey(): void {
    this.apiKey = null;
    delete this.client.defaults.headers['X-API-Key'];
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();

// Initialize the API client
export async function initializeApiClient(): Promise<boolean> {
  try {
    const result = await apiClient.initialize();
    if (result) {
      console.log('API client initialized successfully');
    } else {
      console.log('API client initialization failed');
    }
    return result;
  } catch (error) {
    console.error('Failed to initialize API client:', error);
    console.error('Error details:', {
      message: (error as Error)?.message,
      status: (error as { response?: { status?: number } })?.response?.status,
      data: (error as { response?: { data?: unknown } })?.response?.data
    });
    return false;
  }
}

// Error handling utility
export function handleApiError(error: unknown): Error {
  if (error instanceof ApiError || error instanceof NetworkError) {
    return error;
  }
  if (error instanceof Error) {
    return new ApiError(error.message, 'UNKNOWN_ERROR', 0);
  }
  return new ApiError('An unexpected error occurred', 'UNKNOWN_ERROR', 0);
}

// Type for logs response
export interface LogsResponse {
  logs: Array<{
    id: string;
    timestamp: string;
    level: 'debug' | 'info' | 'warning' | 'error' | 'critical';
    source_id: string;
    message: string;
    category: 'security' | 'network' | 'system' | 'application';
    metadata: Record<string, unknown>;
  }>;
  total: number;
  page: number;
  pageSize: number;
}

// Type for logs stats response
export interface LogsStatsResponse {
  total_logs: number;
  logs_by_level: {
    debug: number;
    info: number;
    warning: number;
    error: number;
    critical: number;
  };
  logs_by_category: {
    security: number;
    network: number;
    system: number;
    application: number;
  };
  logs_by_source: Record<string, number>;
  error_count: number;
  error_rate: number;
}

// Extend the ApiEndpoints type to include response types
declare module './endpoints' {
  interface ApiEndpoints {
    '/api/logs': {
      GET: {
        params: {
          level?: string[];
          category?: string[];
          source?: string[];
          startDate?: string;
          endDate?: string;
          search?: string;
          page?: number;
          pageSize?: number;
        };
        response: LogsResponse;
      };
    };
    '/api/logs/stats': {
      GET: {
        params: {
          startDate?: string;
          endDate?: string;
        };
        response: LogsStatsResponse;
      };
    };
  }
}

// Type-safe API client methods
export const typedApiClient = {
  get: async <T extends keyof ApiEndpoints['GET']>(
    url: T,
    config?: { params?: ApiEndpoints['GET'][T]['params'] }
  ): Promise<ApiResponse<ApiEndpoints['GET'][T]['response']>> => {
    return apiClient.get(url, { params: config?.params });
  },
  post: async <T extends keyof ApiEndpoints['POST']>(
    url: T,
    data: ApiEndpoints['POST'][T]['body'],
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<ApiEndpoints['POST'][T]['response']>> => {
    return apiClient.post(url, data, config);
  },
  put: async <T extends keyof ApiEndpoints['PUT']>(
    url: T,
    data: ApiEndpoints['PUT'][T]['body'],
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<ApiEndpoints['PUT'][T]['response']>> => {
    return apiClient.put(url, data, config);
  },
  delete: async <T extends keyof ApiEndpoints['DELETE']>(
    url: T,
    config?: { params?: ApiEndpoints['DELETE'][T]['params'] }
  ): Promise<ApiResponse<ApiEndpoints['DELETE'][T]['response']>> => {
    return apiClient.delete(url, { params: config?.params });
  },
}; 