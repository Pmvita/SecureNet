import { z } from 'zod';
import type { 
  Status, 
  AnomalyType, 
  DeviceType, 
  ScanStatus, 
  NotificationChannel,
  Severity,
  LogLevel,
  Theme
} from '@/types';

// Base schemas
export const severitySchema = z.enum(['critical', 'high', 'medium', 'low']);
export const statusSchema = z.enum(['active', 'resolved', 'investigating', 'ignored']);
export const anomalyTypeSchema = z.enum(['network', 'security', 'system', 'application']);
export const deviceTypeSchema = z.enum(['server', 'router', 'switch', 'firewall', 'endpoint', 'other']);
export const scanStatusSchema = z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']);
export const notificationChannelSchema = z.enum(['email', 'slack', 'webhook']);
export const logLevelSchema = z.enum(['debug', 'info', 'warning', 'error', 'critical']);
export const themeSchema = z.enum(['light', 'dark', 'system']);

// Common schemas
export const paginatedResponseSchema = <T extends z.ZodType>(schema: T) =>
  z.object({
    items: z.array(schema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
  });

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.any()).optional(),
});

// Anomaly schemas
export const anomalyMetricsSchema = z.object({
  confidence: z.number(),
  impact: z.number(),
  frequency: z.number(),
});

export const anomalySchema = z.object({
  id: z.string(),
  type: anomalyTypeSchema,
  severity: severitySchema,
  status: statusSchema,
  title: z.string(),
  description: z.string(),
  source: z.string(),
  timestamp: z.string(),
  lastUpdated: z.string(),
  details: z.record(z.any()),
  assignedTo: z.string().optional(),
  notes: z.array(z.string()).optional(),
  relatedAnomalies: z.array(z.string()).optional(),
  metrics: anomalyMetricsSchema.optional(),
});

export const anomalyStatsSchema = z.object({
  total: z.number(),
  bySeverity: z.record(severitySchema, z.number()),
  byType: z.record(anomalyTypeSchema, z.number()),
  byStatus: z.record(statusSchema, z.number()),
  recentTrends: z.array(z.object({
    date: z.string(),
    count: z.number(),
    bySeverity: z.record(severitySchema, z.number()),
  })),
});

// Security schemas
export const securityFindingSchema = z.object({
  id: z.string(),
  type: z.string(),
  severity: severitySchema,
  status: statusSchema,
  title: z.string(),
  description: z.string(),
  location: z.string(),
  evidence: z.string(),
  recommendation: z.string(),
  cwe: z.string().optional(),
  cvss: z.number().optional(),
  timestamp: z.string(),
  remediation: z.object({
    status: z.enum(['pending', 'in_progress', 'completed']),
    assignedTo: z.string().optional(),
    dueDate: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
});

export const securityScanSchema = z.object({
  id: z.string(),
  type: z.enum(['vulnerability', 'compliance', 'configuration']),
  status: scanStatusSchema,
  startTime: z.string(),
  endTime: z.string().optional(),
  target: z.string(),
  findings: z.array(securityFindingSchema),
  summary: z.object({
    total: z.number(),
    critical: z.number(),
    high: z.number(),
    medium: z.number(),
    low: z.number(),
  }),
  scanConfig: z.object({
    name: z.string(),
    description: z.string(),
    parameters: z.record(z.any()),
  }),
  progress: z.object({
    current: z.number(),
    total: z.number(),
    stage: z.string(),
  }).optional(),
});

// Network schemas
export const networkDeviceDetailsSchema = z.object({
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  os: z.string().optional(),
  version: z.string().optional(),
  location: z.string().optional(),
  department: z.string().optional(),
  owner: z.string().optional(),
});

export const networkDeviceMetricsSchema = z.object({
  bandwidth: z.object({
    incoming: z.number(),
    outgoing: z.number(),
  }),
  latency: z.number(),
  packetLoss: z.number(),
  cpuUsage: z.number().optional(),
  memoryUsage: z.number().optional(),
});

export const networkDeviceSecuritySchema = z.object({
  riskLevel: severitySchema,
  vulnerabilities: z.number(),
  lastScan: z.string(),
  complianceStatus: z.string(),
});

export const networkDeviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: deviceTypeSchema,
  status: statusSchema,
  ipAddress: z.string(),
  macAddress: z.string(),
  lastSeen: z.string(),
  details: networkDeviceDetailsSchema,
  metrics: networkDeviceMetricsSchema.optional(),
  security: networkDeviceSecuritySchema.optional(),
});

// User schemas
export const userPreferencesSchema = z.object({
  theme: themeSchema,
  notifications: z.object({
    email: z.boolean(),
    slack: z.boolean(),
    webhook: z.boolean(),
  }),
  dashboard: z.object({
    layout: z.string(),
    widgets: z.array(z.string()),
  }),
  display: z.object({
    timezone: z.string(),
    dateFormat: z.string(),
    language: z.string(),
  }),
});

export const userProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['admin', 'analyst', 'viewer']),
  status: z.enum(['active', 'inactive', 'suspended']),
  lastLogin: z.string(),
  preferences: userPreferencesSchema,
  permissions: z.array(z.string()),
  department: z.string().optional(),
  title: z.string().optional(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
});

// Export types derived from schemas
export type AnomalySchema = z.infer<typeof anomalySchema>;
export type SecurityScanSchema = z.infer<typeof securityScanSchema>;
export type NetworkDeviceSchema = z.infer<typeof networkDeviceSchema>;
export type UserProfileSchema = z.infer<typeof userProfileSchema>;
export type ApiErrorSchema = z.infer<typeof apiErrorSchema>;

// Validation functions
export const validateAnomaly = (data: unknown): AnomalySchema => {
  return anomalySchema.parse(data);
};

export const validateSecurityScan = (data: unknown): SecurityScanSchema => {
  return securityScanSchema.parse(data);
};

export const validateNetworkDevice = (data: unknown): NetworkDeviceSchema => {
  return networkDeviceSchema.parse(data);
};

export const validateUserProfile = (data: unknown): UserProfileSchema => {
  return userProfileSchema.parse(data);
};

export const validateApiError = (data: unknown): ApiErrorSchema => {
  return apiErrorSchema.parse(data);
}; 