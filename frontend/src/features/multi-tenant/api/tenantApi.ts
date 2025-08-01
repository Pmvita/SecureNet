// Multi-Tenant API Client
// Phase 3: Production Platform - Multi-Tenant Architecture

import { 
  TenantInfo, 
  TenantQuota, 
  TenantUsageLog, 
  TenantAuditLog, 
  TenantSetting,
  TenantHealth,
  TenantCreateRequest,
  TenantUpdateRequest,
  TenantSettingUpdateRequest,
  TenantFilters,
  TenantListParams,
  PaginatedResponse
} from '../types';

const API_BASE = '/api/tenants';

class TenantApi {
  // Get all tenants with optional filtering
  async getAllTenants(filters?: TenantFilters): Promise<TenantInfo[]> {
    const params = new URLSearchParams();
    
    if (filters?.status) params.append('status', filters.status);
    if (filters?.tier) params.append('tier', filters.tier);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.created_after) params.append('created_after', filters.created_after);
    if (filters?.created_before) params.append('created_before', filters.created_before);
    
    const response = await fetch(`${API_BASE}/?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tenants: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Get current tenant information
  async getCurrentTenant(): Promise<TenantInfo> {
    const response = await fetch(`${API_BASE}/current`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch current tenant: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Get specific tenant information
  async getTenant(tenantId: string): Promise<TenantInfo> {
    const response = await fetch(`${API_BASE}/${tenantId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tenant: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Create new tenant
  async createTenant(request: TenantCreateRequest): Promise<{ tenant_id: string; message: string }> {
    const response = await fetch(`${API_BASE}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `Failed to create tenant: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Update tenant information
  async updateTenant(tenantId: string, request: TenantUpdateRequest): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/${tenantId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `Failed to update tenant: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Update tenant status
  async updateTenantStatus(tenantId: string, status: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/${tenantId}/status/${status}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `Failed to update tenant status: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Get tenant quotas
  async getTenantQuotas(tenantId: string): Promise<TenantQuota[]> {
    const response = await fetch(`${API_BASE}/${tenantId}/quotas`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tenant quotas: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Get tenant usage logs
  async getTenantUsageLogs(tenantId: string, limit: number = 100, offset: number = 0): Promise<TenantUsageLog[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });
    
    const response = await fetch(`${API_BASE}/${tenantId}/usage-logs?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch usage logs: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Get tenant audit logs
  async getTenantAuditLogs(tenantId: string, limit: number = 100, offset: number = 0): Promise<TenantAuditLog[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });
    
    const response = await fetch(`${API_BASE}/${tenantId}/audit-logs?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch audit logs: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Get all tenant settings
  async getTenantSettings(tenantId: string): Promise<TenantSetting[]> {
    const response = await fetch(`${API_BASE}/${tenantId}/settings`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tenant settings: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Get specific tenant setting
  async getTenantSetting(tenantId: string, settingKey: string): Promise<TenantSetting> {
    const response = await fetch(`${API_BASE}/${tenantId}/settings/${settingKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tenant setting: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Update tenant setting
  async updateTenantSetting(tenantId: string, settingKey: string, request: TenantSettingUpdateRequest): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/${tenantId}/settings/${settingKey}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `Failed to update tenant setting: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Get tenant health status
  async getTenantHealth(tenantId: string): Promise<TenantHealth> {
    const response = await fetch(`${API_BASE}/${tenantId}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tenant health: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Check quota availability
  async checkQuota(tenantId: string, resourceType: string, amount: number = 1): Promise<boolean> {
    const response = await fetch(`${API_BASE}/${tenantId}/quotas/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        resource_type: resourceType,
        amount: amount
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to check quota: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.available;
  }

  // Increment usage
  async incrementUsage(tenantId: string, resourceType: string, amount: number = 1, description?: string): Promise<boolean> {
    const response = await fetch(`${API_BASE}/${tenantId}/usage/increment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        resource_type: resourceType,
        amount: amount,
        description: description
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to increment usage: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.success;
  }

  // Get tenant metrics (for dashboard)
  async getTenantMetrics(): Promise<{
    total_tenants: number;
    active_tenants: number;
    suspended_tenants: number;
    pending_tenants: number;
    total_revenue: number;
    average_usage_percentage: number;
    top_tier_distribution: Record<string, number>;
    health_distribution: Record<string, number>;
  }> {
    const response = await fetch(`${API_BASE}/metrics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tenant metrics: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Get paginated tenant list
  async getTenantsPaginated(params: TenantListParams): Promise<PaginatedResponse<TenantInfo>> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params.sort_order) queryParams.append('sort_order', params.sort_order);
    
    if (params.filters) {
      if (params.filters.status) queryParams.append('status', params.filters.status);
      if (params.filters.tier) queryParams.append('tier', params.filters.tier);
      if (params.filters.search) queryParams.append('search', params.filters.search);
      if (params.filters.created_after) queryParams.append('created_after', params.filters.created_after);
      if (params.filters.created_before) queryParams.append('created_before', params.filters.created_before);
    }
    
    const response = await fetch(`${API_BASE}/paginated?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch paginated tenants: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Export tenant data
  async exportTenantData(tenantId: string, format: 'json' | 'csv' = 'json'): Promise<Blob> {
    const response = await fetch(`${API_BASE}/${tenantId}/export?format=${format}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to export tenant data: ${response.statusText}`);
    }
    
    return response.blob();
  }

  // Bulk operations
  async bulkUpdateTenants(tenantIds: string[], updates: Partial<TenantUpdateRequest>): Promise<{ success: string[]; failed: string[] }> {
    const response = await fetch(`${API_BASE}/bulk-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        tenant_ids: tenantIds,
        updates: updates
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `Failed to bulk update tenants: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Delete tenant (soft delete)
  async deleteTenant(tenantId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/${tenantId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `Failed to delete tenant: ${response.statusText}`);
    }
    
    return response.json();
  }
}

export const tenantApi = new TenantApi(); 