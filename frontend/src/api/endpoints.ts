import type {
  Status,
  AnomalyType,
  DeviceType,
  ScanStatus,
  Severity,
  LogLevel,
} from '@/types';
import type {
  AnomalySchema,
  SecurityScanSchema,
  NetworkDeviceSchema,
  UserProfileSchema,
  ApiErrorSchema,
} from './schemas';

// Common types
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}

// Anomaly endpoints
export interface AnomalyFilters extends PaginationParams {
  status?: Status;
  type?: AnomalyType;
  severity?: Severity;
  search?: string;
  assignedTo?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateAnomalyBody {
  type: AnomalyType;
  severity: Severity;
  title: string;
  description: string;
  source: string;
  details: Record<string, unknown>;
  assignedTo?: string;
}

export interface UpdateAnomalyBody {
  status?: Status;
  assignedTo?: string;
  notes?: string[];
}

// Security endpoints
export interface SecurityScanFilters extends PaginationParams {
  type?: 'vulnerability' | 'compliance' | 'configuration';
  status?: ScanStatus;
  target?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateSecurityScanBody {
  type: 'vulnerability' | 'compliance' | 'configuration';
  target: string;
  scanConfig: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

// Network endpoints
export interface NetworkDeviceFilters extends PaginationParams {
  type?: DeviceType;
  status?: Status;
  search?: string;
  department?: string;
  location?: string;
}

export interface CreateNetworkDeviceBody {
  name: string;
  type: DeviceType;
  ipAddress: string;
  macAddress: string;
  details: {
    manufacturer?: string;
    model?: string;
    os?: string;
    version?: string;
    location?: string;
    department?: string;
    owner?: string;
  };
}

// Log endpoints
export interface LogFilters extends PaginationParams, DateRangeParams {
  level?: LogLevel | LogLevel[];
  source?: string | string[];
  category?: string | string[];
  search?: string;
  tags?: string[];
  correlationId?: string;
  userId?: string;
  ipAddress?: string;
  statusCode?: number;
  method?: string;
  path?: string;
  page?: number;
  pageSize?: number;
}

// User endpoints
export interface UpdateUserProfileBody {
  name?: string;
  email?: string;
  department?: string;
  title?: string;
  phone?: string;
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    notifications?: {
      email?: boolean;
      slack?: boolean;
      webhook?: boolean;
    };
    dashboard?: {
      layout?: string;
      widgets?: string[];
    };
    display?: {
      timezone?: string;
      dateFormat?: string;
      language?: string;
    };
  };
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data: T;
  timestamp: string;
}

export interface SecurityMetrics {
  active_scans: number;
  total_findings: number;
  critical_findings: number;
  security_score: number;
  last_scan: string | null;
  scan_status: string;
}

export interface SecurityScan {
  id: string;
  type: string;
  status: string;
  start_time: string;
  end_time: string | null;
  findings_count: number;
  progress?: number;
}

export interface SecurityFinding {
  id: string;
  type: string;
  severity: string;
  description: string;
  timestamp: string;
}

export interface SecurityResponse {
  metrics: SecurityMetrics;
  recent_scans: SecurityScan[];
  active_scans: SecurityScan[];
  recent_findings: SecurityFinding[];
}

// API Endpoints type definition
export interface ApiEndpoints {
  GET: {
    '/anomalies': {
      params: AnomalyFilters;
      response: {
        items: AnomalySchema[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      };
    };
    '/anomalies/:id': {
      params: { id: string };
      response: AnomalySchema;
    };
    '/anomalies/stats': {
      params: DateRangeParams;
      response: {
        total: number;
        bySeverity: Record<Severity, number>;
        byType: Record<AnomalyType, number>;
        byStatus: Record<Status, number>;
        recentTrends: Array<{
          date: string;
          count: number;
          bySeverity: Record<Severity, number>;
        }>;
      };
    };
    '/security/scans': {
      params: SecurityScanFilters;
      response: {
        items: SecurityScanSchema[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      };
    };
    '/security/scans/:id': {
      params: { id: string };
      response: SecurityScanSchema;
    };
    '/network/devices': {
      params: NetworkDeviceFilters;
      response: {
        items: NetworkDeviceSchema[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      };
    };
    '/network/devices/:id': {
      params: { id: string };
      response: NetworkDeviceSchema;
    };
    '/api/logs': {
      params: LogFilters;
      response: {
        logs: Array<{
          id: string;
          timestamp: string;
          level: LogLevel;
          source_id: string;
          message: string;
          category: 'security' | 'network' | 'system' | 'application';
          metadata: Record<string, unknown>;
          relatedAnomalies?: string[];
          relatedThreats?: string[];
        }>;
        total: number;
        page: number;
        pageSize: number;
      };
    };
    '/api/logs/stats': {
      params: DateRangeParams;
      response: {
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
      };
    };
    '/user/profile': {
      params: Record<string, never>;
      response: UserProfileSchema;
    };
    '/api/auth/me': {
      params: Record<string, never>;
      response: {
        user: {
          id: string;
          username: string;
          email: string;
          role: 'admin' | 'user';
          last_login: string;
        };
      };
    };
    '/api/get-api-key': {
      params: Record<string, never>;
      response: ApiResponse<{ api_key: string }>;
    };
    '/api/security': {
      params: Record<string, never>;
      response: ApiResponse<SecurityResponse>;
    };
    '/api/security/scan': {
      response: ApiResponse<{ id: string; status: string }>;
    };
    '/api/security/threats/{id}/resolve': {
      response: ApiResponse<{ id: string; status: string }>;
    };
    '/api/network': {
      params: Record<string, never>;
      response: ApiResponse<{
        devices: Array<{
          id: string;
          name: string;
          type: string;
          status: string;
          last_seen: string;
        }>;
        traffic: Array<{
          timestamp: string;
          bytes_in: number;
          bytes_out: number;
          packets_in: number;
          packets_out: number;
        }>;
        protocols: Array<{
          name: string;
          count: number;
          percentage: number;
        }>;
        stats: {
          total_devices: number;
          active_devices: number;
          total_traffic: number;
          average_latency: number;
        };
      }>;
    };
    '/api/anomalies/list': {
      params: {
        page?: number;
        pageSize?: number;
        status?: string;
        severity?: string;
        type?: string;
      };
      response: ApiResponse<{
        items: Array<{
          id: string;
          type: string;
          severity: string;
          status: string;
          description: string;
          timestamp: string;
          source: string;
          metrics?: Record<string, unknown>;
        }>;
        total: number;
        page: number;
        page_size: number;
        total_pages: number;
      }>;
    };
    '/api/anomalies/stats': {
      response: ApiResponse<{
        total: number;
        open: number;
        critical: number;
        resolved: number;
        by_type: Record<string, number>;
        by_severity: Record<string, number>;
      }>;
    };
    '/api/settings': {
      response: ApiResponse<{
        api_key: string;
        network_monitoring: {
          enabled: boolean;
          interval: number;
          devices: string[];
        };
        security_scanning: {
          enabled: boolean;
          interval: number;
          types: string[];
        };
        notifications: {
          enabled: boolean;
          email: string;
          slack_webhook: string;
        };
        logging: {
          level: string;
          retention_days: number;
        };
      }>;
    };
  };
  POST: {
    '/anomalies': {
      body: CreateAnomalyBody;
      response: AnomalySchema;
    };
    '/security/scans': {
      body: CreateSecurityScanBody;
      response: SecurityScanSchema;
    };
    '/network/devices': {
      body: CreateNetworkDeviceBody;
      response: NetworkDeviceSchema;
    };
    '/api/auth/login': {
      body: {
        username: string;
        password: string;
      };
      response: ApiResponse<{
        token: string;
        user: {
          id: string;
          username: string;
          email: string;
          role: 'admin' | 'user';
          last_login: string;
        };
      }>;
    };
    '/api/auth/logout': {
      body: Record<string, never>;
      response: {
        message: string;
      };
    };
  };
  PUT: {
    '/anomalies/:id': {
      params: { id: string };
      body: UpdateAnomalyBody;
      response: AnomalySchema;
    };
    '/user/profile': {
      body: UpdateUserProfileBody;
      response: UserProfileSchema;
    };
  };
  DELETE: {
    '/anomalies/:id': {
      params: { id: string };
      response: { success: boolean };
    };
    '/security/scans/:id': {
      params: { id: string };
      response: { success: boolean };
    };
    '/network/devices/:id': {
      params: { id: string };
      response: { success: boolean };
    };
  };
}

// Remove any duplicate endpoint definitions 