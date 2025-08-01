// Multi-Tenant System Types
// Phase 3: Production Platform - Multi-Tenant Architecture

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
  CANCELLED = 'cancelled'
}

export enum TenantTier {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
  MSP = 'msp'
}

export enum ResourceType {
  USERS = 'users',
  DEVICES = 'devices',
  STORAGE_GB = 'storage_gb',
  API_CALLS = 'api_calls',
  ALERTS_PER_MONTH = 'alerts_per_month'
}

export interface TenantInfo {
  tenant_id: string;
  organization_name: string;
  tenant_status: TenantStatus;
  tenant_tier: TenantTier;
  created_at: string;
  billing_email?: string;
  contact_phone?: string;
  timezone: string;
  locale: string;
}

export interface TenantQuota {
  resource_type: ResourceType;
  quota_limit: number;
  current_usage: number;
  reset_date: string;
  usage_percentage: number;
}

export interface TenantUsageLog {
  resource_type: ResourceType;
  usage_amount: number;
  usage_date: string;
  description?: string;
  created_at: string;
}

export interface TenantAuditLog {
  user_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface TenantSetting {
  setting_key: string;
  setting_value: string;
  setting_type: string;
  is_encrypted: boolean;
}

export interface TenantHealth {
  tenant_id: string;
  organization_name: string;
  status: string;
  tier: string;
  overall_health: 'healthy' | 'warning' | 'critical' | 'unknown';
  quota_health: Record<string, {
    usage_percentage: number;
    status: 'good' | 'healthy' | 'warning' | 'critical';
  }>;
  last_updated: string;
}

export interface TenantCreateRequest {
  organization_name: string;
  tenant_tier: TenantTier;
  billing_email?: string;
  contact_phone?: string;
  timezone?: string;
  locale?: string;
}

export interface TenantUpdateRequest {
  organization_name?: string;
  tenant_status?: TenantStatus;
  tenant_tier?: TenantTier;
  billing_email?: string;
  contact_phone?: string;
  timezone?: string;
  locale?: string;
}

export interface TenantSettingUpdateRequest {
  setting_value: string;
  is_encrypted?: boolean;
}

export interface TenantQuotaResponse {
  resource_type: ResourceType;
  quota_limit: number;
  current_usage: number;
  reset_date: string;
  usage_percentage: number;
}

export interface TenantUsageLogResponse {
  resource_type: ResourceType;
  usage_amount: number;
  usage_date: string;
  description?: string;
  created_at: string;
}

export interface TenantAuditLogResponse {
  user_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface TenantSettingResponse {
  setting_key: string;
  setting_value: string;
  setting_type: string;
  is_encrypted: boolean;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
}

// Filter and search types
export interface TenantFilters {
  status?: TenantStatus;
  tier?: TenantTier;
  search?: string;
  created_after?: string;
  created_before?: string;
}

export interface TenantListParams {
  page?: number;
  limit?: number;
  filters?: TenantFilters;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// Dashboard metrics
export interface TenantMetrics {
  total_tenants: number;
  active_tenants: number;
  suspended_tenants: number;
  pending_tenants: number;
  total_revenue: number;
  average_usage_percentage: number;
  top_tier_distribution: Record<TenantTier, number>;
  health_distribution: Record<string, number>;
}

// Quota usage tracking
export interface QuotaUsage {
  resource_type: ResourceType;
  current_usage: number;
  quota_limit: number;
  usage_percentage: number;
  is_over_limit: boolean;
  reset_date: string;
  days_until_reset: number;
}

// Tenant statistics
export interface TenantStats {
  tenant_id: string;
  total_users: number;
  total_devices: number;
  total_alerts: number;
  api_calls_this_month: number;
  storage_used_gb: number;
  last_activity: string;
  uptime_percentage: number;
}

// Billing information
export interface TenantBilling {
  tenant_id: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  current_period_start?: string;
  current_period_end?: string;
  billing_cycle: string;
  amount_cents: number;
  currency: string;
  status: string;
}

// Integration information
export interface TenantIntegration {
  id: number;
  tenant_id: string;
  integration_type: string;
  integration_name: string;
  config_data: Record<string, any>;
  is_active: boolean;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

// Branding information
export interface TenantBranding {
  id: number;
  tenant_id: string;
  logo_url?: string;
  favicon_url?: string;
  primary_color: string;
  secondary_color: string;
  company_name?: string;
  support_email?: string;
  support_phone?: string;
  custom_domain?: string;
  created_at: string;
  updated_at: string;
}

// API key information
export interface TenantApiKey {
  id: number;
  tenant_id: string;
  key_name: string;
  api_key_hash: string;
  permissions: string[];
  is_active: boolean;
  last_used_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

// Webhook information
export interface TenantWebhook {
  id: number;
  tenant_id: string;
  webhook_url: string;
  events: string[];
  secret_key?: string;
  is_active: boolean;
  last_triggered_at?: string;
  failure_count: number;
  created_at: string;
  updated_at: string;
} 