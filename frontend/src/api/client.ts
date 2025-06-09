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
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        // Add API key if available
        if (this.apiKey) {
          config.headers['X-API-Key'] = this.apiKey;
        }
        return config;
      },
      (error) => Promise.reject(new NetworkError('Failed to send request'))
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Return the full response for login endpoint
        if (response.config.url === '/api/auth/login') {
          return response;
        }
        // Unwrap the backend's response for other endpoints
        if (response.data && (typeof response.data === "object") && ("status" in response.data) && ("data" in response.data)) {
          return { ...response, data: response.data.data };
        }
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
          // Clear both auth token and API key on auth errors
          localStorage.removeItem('auth_token');
          this.clearApiKey();
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async initialize(): Promise<void> {
    // Only initialize once
    if (this.isInitialized) {
      return;
    }

    // In development mode, set a default API key and token
    if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
      this.setApiKey('dev-api-key');
      // Set a dev token if none exists
      if (!localStorage.getItem('auth_token')) {
        localStorage.setItem('auth_token', 'dev-token');
      }
      this.isInitialized = true;
      return;
    }

    // Check if we have an auth token
    const token = localStorage.getItem('auth_token');
    if (!token) {
      this.isInitialized = true;
      return;
    }

    // Try to get the API key, but don't block initialization if it fails
    try {
      const response = await this.client.get<ApiResponse<{ api_key: string }>>('/api/get-api-key');
      if (response?.data?.data?.api_key) {
        this.setApiKey(response.data.data.api_key);
      }
    } catch (error) {
      console.warn('Failed to get API key:', error);
      // Don't throw the error, just log it
      // The API key is not required for all endpoints
    } finally {
      this.isInitialized = true;
    }
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data;
  }

  setApiKey(key: string): void {
    this.apiKey = key;
    this.client.defaults.headers['X-API-Key'] = key;
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
    await apiClient.initialize();
    return true;
  } catch (error) {
    console.error('Failed to initialize API client:', error);
    // Don't throw the error, just return false
    // The API key is not required for all endpoints
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