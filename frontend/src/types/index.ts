// Common types
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type Status = 'active' | 'resolved' | 'investigating' | 'ignored';
export type AnomalyType = 'network' | 'security' | 'system' | 'application';
export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';
export type DeviceType = 'server' | 'router' | 'switch' | 'firewall' | 'endpoint' | 'other';
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type NotificationChannel = 'email' | 'slack' | 'webhook';
export type Theme = 'light' | 'dark' | 'system';

// API response types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Anomaly types
export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: Severity;
  status: Status;
  title: string;
  description: string;
  source: string;
  timestamp: string;
  lastUpdated: string;
  details: Record<string, any>;
  assignedTo?: string;
  notes?: string[];
  relatedAnomalies?: string[];
  metrics?: {
    confidence: number;
    impact: number;
    frequency: number;
  };
}

export interface AnomalyStats {
  total: number;
  bySeverity: Record<Severity, number>;
  byType: Record<AnomalyType, number>;
  byStatus: Record<Status, number>;
  recentTrends: Array<{
    date: string;
    count: number;
    bySeverity: Record<Severity, number>;
  }>;
}

// Security types
export interface SecurityScan {
  id: string;
  type: 'vulnerability' | 'compliance' | 'configuration';
  status: ScanStatus;
  startTime: string;
  endTime?: string;
  target: string;
  findings: SecurityFinding[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  scanConfig: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
  progress?: {
    current: number;
    total: number;
    stage: string;
  };
}

export interface SecurityFinding {
  id: string;
  type: string;
  severity: Severity;
  status: Status;
  title: string;
  description: string;
  location: string;
  evidence: string;
  recommendation: string;
  cwe?: string;
  cvss?: number;
  timestamp: string;
  remediation?: {
    status: 'pending' | 'in_progress' | 'completed';
    assignedTo?: string;
    dueDate?: string;
    notes?: string;
  };
}

export interface SecurityStats {
  overallScore: number;
  activeThreats: number;
  totalFindings: number;
  bySeverity: Record<Severity, number>;
  byType: Record<string, number>;
  recentScans: SecurityScan[];
  topVulnerabilities: SecurityFinding[];
  complianceStatus: Record<string, {
    status: 'compliant' | 'non_compliant' | 'partial';
    score: number;
    lastChecked: string;
  }>;
}

// Network types
export interface NetworkDevice {
  id: string;
  name: string;
  type: DeviceType;
  status: Status;
  ipAddress: string;
  macAddress: string;
  lastSeen: string;
  details: {
    manufacturer?: string;
    model?: string;
    os?: string;
    version?: string;
    location?: string;
    department?: string;
    owner?: string;
  };
  metrics?: {
    bandwidth: {
      incoming: number;
      outgoing: number;
    };
    latency: number;
    packetLoss: number;
    cpuUsage?: number;
    memoryUsage?: number;
  };
  security?: {
    riskLevel: Severity;
    vulnerabilities: number;
    lastScan: string;
    complianceStatus: string;
  };
}

export interface NetworkStats {
  totalDevices: number;
  activeDevices: number;
  byType: Record<DeviceType, number>;
  byStatus: Record<Status, number>;
  bandwidth: {
    total: number;
    used: number;
    byDevice: Record<string, {
      incoming: number;
      outgoing: number;
    }>;
  };
  security: {
    atRiskDevices: number;
    nonCompliantDevices: number;
    recentIncidents: number;
  };
  performance: {
    averageLatency: number;
    packetLoss: number;
    bandwidthUtilization: number;
  };
}

// Log types
export interface Log {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
  category: string;
  details: Record<string, any>;
  tags: string[];
  correlationId?: string;
  sessionId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  duration?: number;
  statusCode?: number;
  method?: string;
  path?: string;
}

export interface LogFilters {
  startDate?: string;
  endDate?: string;
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
}

// Settings types
export interface NotificationSettings {
  channels: {
    email: {
      enabled: boolean;
      recipients: string[];
      frequency: 'realtime' | 'daily' | 'weekly';
      severity: Severity[];
    };
    slack: {
      enabled: boolean;
      webhook: string;
      channel: string;
      severity: Severity[];
    };
    webhook: {
      enabled: boolean;
      url: string;
      headers: Record<string, string>;
      severity: Severity[];
    };
  };
  rules: Array<{
    id: string;
    name: string;
    description: string;
    conditions: Array<{
      field: string;
      operator: 'equals' | 'contains' | 'matches' | 'greater_than' | 'less_than';
      value: any;
    }>;
    actions: Array<{
      type: NotificationChannel;
      config: Record<string, any>;
    }>;
    enabled: boolean;
  }>;
}

export interface SecuritySettings {
  scanSchedule: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    targets: string[];
  };
  complianceRules: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    severity: Severity;
    enabled: boolean;
    parameters: Record<string, any>;
  }>;
  firewallRules: Array<{
    id: string;
    name: string;
    description: string;
    action: 'allow' | 'deny';
    source: string;
    destination: string;
    protocol: string;
    ports: string;
    enabled: boolean;
  }>;
  accessControl: {
    ipWhitelist: string[];
    mfaRequired: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
  };
}

export interface SystemSettings {
  general: {
    systemName: string;
    timezone: string;
    dateFormat: string;
    language: string;
  };
  backup: {
    enabled: boolean;
    schedule: string;
    retention: number;
    location: string;
    encryption: boolean;
  };
  maintenance: {
    window: string;
    autoUpdate: boolean;
    updateChannel: 'stable' | 'beta' | 'alpha';
  };
  logging: {
    level: LogLevel;
    retention: number;
    format: 'json' | 'text';
    destinations: string[];
  };
  performance: {
    maxConcurrentScans: number;
    maxLogSize: number;
    cacheSize: number;
    compression: boolean;
  };
}

// User types
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'platform_owner' | 'security_admin' | 'soc_analyst';
  status: 'active' | 'inactive' | 'suspended';
  lastLogin: string;
  preferences: {
    theme: Theme;
    notifications: {
      email: boolean;
      slack: boolean;
      webhook: boolean;
    };
    dashboard: {
      layout: string;
      widgets: string[];
    };
    display: {
      timezone: string;
      dateFormat: string;
      language: string;
    };
  };
  permissions: string[];
  department?: string;
  title?: string;
  phone?: string;
  avatar?: string;
}

// Component prop types
export interface BaseProps {
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  'data-testid'?: string;
}

export interface WithLoading {
  loading?: boolean;
  loadingText?: string;
}

export interface WithError {
  error?: string | Error;
  onError?: (error: Error) => void;
}

export interface WithDisabled {
  disabled?: boolean;
}

export interface WithRequired {
  required?: boolean;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (
  ...args: any
) => Promise<infer R>
  ? R
  : any; 