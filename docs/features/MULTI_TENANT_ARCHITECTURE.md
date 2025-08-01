# 🏢 Multi-Tenant Architecture

## 📋 Overview

SecureNet's Multi-Tenant Architecture enables the platform to serve multiple organizations (tenants) securely and efficiently. This system provides complete data isolation, resource management, and tenant-specific configurations while maintaining a single codebase.

## 🎯 Key Features

### **🏗️ Core Architecture**
- **Database Isolation** - Each tenant has isolated data with tenant_id foreign keys
- **Resource Quotas** - Tier-based resource limits (users, devices, storage, API calls)
- **Tenant Settings** - Configurable settings per organization
- **Audit Logging** - Complete audit trail for all tenant activities
- **Health Monitoring** - Real-time tenant health and usage monitoring

### **🔒 Security & Compliance**
- **Data Isolation** - Complete separation of tenant data
- **Role-Based Access** - Tenant-specific user roles and permissions
- **Audit Trails** - Comprehensive logging of all tenant activities
- **Encrypted Settings** - Sensitive tenant settings are encrypted
- **API Key Management** - Tenant-specific API keys with permissions

### **📊 Resource Management**
- **Usage Tracking** - Real-time resource usage monitoring
- **Quota Enforcement** - Automatic quota limits based on subscription tier
- **Billing Integration** - Usage-based billing and subscription management
- **Health Monitoring** - Tenant health status and alerts

---

## 🏗️ Database Schema

### **Core Tables**

#### **Organizations (Enhanced)**
```sql
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT gen_random_uuid();
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tenant_status tenant_status DEFAULT 'active';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tenant_tier tenant_tier DEFAULT 'free';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS locale VARCHAR(10) DEFAULT 'en-US';
```

#### **Tenant Resource Quotas**
```sql
CREATE TABLE tenant_resource_quotas (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES organizations(tenant_id) ON DELETE CASCADE,
    resource_type resource_type NOT NULL,
    quota_limit INTEGER NOT NULL DEFAULT 0,
    current_usage INTEGER NOT NULL DEFAULT 0,
    reset_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, resource_type)
);
```

#### **Tenant Usage Logs**
```sql
CREATE TABLE tenant_usage_logs (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES organizations(tenant_id) ON DELETE CASCADE,
    resource_type resource_type NOT NULL,
    usage_amount INTEGER NOT NULL,
    usage_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **Tenant Settings**
```sql
CREATE TABLE tenant_settings (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES organizations(tenant_id) ON DELETE CASCADE,
    setting_key VARCHAR(255) NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(50) DEFAULT 'string',
    is_encrypted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, setting_key)
);
```

#### **Tenant Audit Logs**
```sql
CREATE TABLE tenant_audit_logs (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES organizations(tenant_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🎯 Tenant Tiers & Resource Limits

### **Free Tier**
- **Users**: 5
- **Devices**: 10
- **Storage**: 1 GB
- **API Calls**: 1,000/month
- **Alerts**: 100/month
- **Retention**: 30 days
- **Security Level**: Basic

### **Professional Tier ($299/month)**
- **Users**: 50
- **Devices**: 100
- **Storage**: 10 GB
- **API Calls**: 10,000/month
- **Alerts**: 1,000/month
- **Retention**: 90 days
- **Security Level**: Standard

### **Business Tier ($799/month)**
- **Users**: 500
- **Devices**: 1,000
- **Storage**: 100 GB
- **API Calls**: 100,000/month
- **Alerts**: 10,000/month
- **Retention**: 365 days
- **Security Level**: Advanced

### **Enterprise Tier ($1,999/month)**
- **Users**: 1,000
- **Devices**: 5,000
- **Storage**: 500 GB
- **API Calls**: 500,000/month
- **Alerts**: 50,000/month
- **Retention**: 730 days
- **Security Level**: Enterprise

### **MSP Bundle ($2,999/month)**
- **Users**: 1,000
- **Devices**: 10,000
- **Storage**: 1 TB
- **API Calls**: 1,000,000/month
- **Alerts**: 100,000/month
- **Retention**: 730 days
- **Security Level**: Enterprise
- **Multi-tenant**: Yes
- **Reseller Capabilities**: Yes

---

## 🔧 API Endpoints

### **Tenant Management**
```typescript
// Create new tenant
POST /api/tenants/
{
  "organization_name": "Acme Corp",
  "tenant_tier": "pro",
  "billing_email": "billing@acme.com",
  "contact_phone": "+1-555-0123",
  "timezone": "America/New_York",
  "locale": "en-US"
}

// Get all tenants
GET /api/tenants/?status=active&tier=pro

// Get current tenant
GET /api/tenants/current

// Get specific tenant
GET /api/tenants/{tenant_id}

// Update tenant
PUT /api/tenants/{tenant_id}
{
  "tenant_tier": "enterprise",
  "billing_email": "new-billing@acme.com"
}

// Update tenant status
POST /api/tenants/{tenant_id}/status/suspended
```

### **Resource Management**
```typescript
// Get tenant quotas
GET /api/tenants/{tenant_id}/quotas

// Get usage logs
GET /api/tenants/{tenant_id}/usage-logs?limit=100&offset=0

// Get tenant health
GET /api/tenants/{tenant_id}/health

// Check quota availability
POST /api/tenants/{tenant_id}/quotas/check
{
  "resource_type": "users",
  "amount": 1
}

// Increment usage
POST /api/tenants/{tenant_id}/usage/increment
{
  "resource_type": "api_calls",
  "amount": 1,
  "description": "API endpoint call"
}
```

### **Settings Management**
```typescript
// Get all settings
GET /api/tenants/{tenant_id}/settings

// Get specific setting
GET /api/tenants/{tenant_id}/settings/security_level

// Update setting
PUT /api/tenants/{tenant_id}/settings/security_level
{
  "setting_value": "advanced",
  "is_encrypted": false
}
```

### **Audit & Monitoring**
```typescript
// Get audit logs
GET /api/tenants/{tenant_id}/audit-logs?limit=100&offset=0

// Get tenant metrics
GET /api/tenants/metrics
```

---

## 🏗️ Backend Implementation

### **Tenant Manager Class**
```python
class TenantManager:
    """Multi-tenant management system for SecureNet"""
    
    async def create_tenant(self, organization_name: str, tenant_tier: TenantTier = TenantTier.FREE) -> str:
        """Create a new tenant with default quotas and settings"""
        
    async def get_tenant_info(self, tenant_id: str) -> Optional[TenantInfo]:
        """Get tenant information"""
        
    async def update_tenant_status(self, tenant_id: str, status: TenantStatus) -> bool:
        """Update tenant status"""
        
    async def check_quota(self, tenant_id: str, resource_type: ResourceType, amount: int = 1) -> bool:
        """Check if tenant has quota available"""
        
    async def increment_usage(self, tenant_id: str, resource_type: ResourceType, amount: int = 1) -> bool:
        """Increment resource usage for tenant"""
        
    async def get_tenant_setting(self, tenant_id: str, setting_key: str) -> Optional[str]:
        """Get tenant setting value"""
        
    async def set_tenant_setting(self, tenant_id: str, setting_key: str, setting_value: str) -> bool:
        """Set tenant setting value"""
        
    async def log_audit_event(self, tenant_id: str, user_id: str, action: str, **kwargs) -> bool:
        """Log audit event for tenant"""
```

### **Middleware Integration**
```python
async def get_tenant_context(request: Request) -> str:
    """Extract tenant context from request"""
    user = await get_current_user(request)
    if not user.organization_id:
        raise HTTPException(status_code=400, detail="User not associated with organization")
    
    # Get tenant_id from organization
    db = await get_database()
    result = await db.fetch_one(
        "SELECT tenant_id FROM organizations WHERE id = $1",
        user.organization_id
    )
    
    return result['tenant_id']

async def require_tenant_quota(resource_type: ResourceType, amount: int = 1):
    """Middleware to check tenant quota before processing request"""
    async def quota_checker(request: Request):
        tenant_id = await get_tenant_context(request)
        tenant_manager = TenantManager(await get_database())
        
        if not await tenant_manager.check_quota(tenant_id, resource_type, amount):
            raise HTTPException(
                status_code=429, 
                detail=f"Quota exceeded for {resource_type.value}"
            )
        
        # Increment usage after successful request
        await tenant_manager.increment_usage(tenant_id, resource_type, amount)
    
    return quota_checker
```

---

## 🎨 Frontend Implementation

### **Tenant Management Component**
```typescript
const TenantManagement: React.FC = () => {
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'quotas' | 'settings' | 'audit'>('overview');
  
  // Fetch tenants
  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: tenantApi.getAllTenants,
  });
  
  // Fetch selected tenant details
  const { data: tenantInfo } = useQuery({
    queryKey: ['tenant', selectedTenant],
    queryFn: () => tenantApi.getTenant(selectedTenant!),
    enabled: !!selectedTenant,
  });
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Tenant List Sidebar */}
      <TenantList 
        tenants={tenants || []}
        selectedTenant={selectedTenant}
        onSelectTenant={setSelectedTenant}
      />
      
      {/* Main Content */}
      <div className="lg:col-span-3">
        {activeTenant && (
          <>
            <TenantHeader tenant={tenantInfo} />
            <TenantTabs activeTab={activeTab} onTabChange={setActiveTab} />
            <TenantContent 
              tenant={tenantInfo}
              activeTab={activeTab}
            />
          </>
        )}
      </div>
    </div>
  );
};
```

### **Quota Management**
```typescript
const TenantQuotas: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { data: quotas } = useQuery({
    queryKey: ['tenant-quotas', tenantId],
    queryFn: () => tenantApi.getTenantQuotas(tenantId),
  });
  
  return (
    <div className="space-y-4">
      {quotas?.map(quota => (
        <QuotaCard
          key={quota.resource_type}
          quota={quota}
          onUpgrade={() => handleUpgrade(tenantId)}
        />
      ))}
    </div>
  );
};
```

---

## 🔒 Security Considerations

### **Data Isolation**
- All database queries include `tenant_id` filter
- No cross-tenant data access possible
- Tenant context validated on every request

### **Access Control**
- Users can only access their own tenant's data
- Platform owners can access all tenants
- Role-based permissions within tenant context

### **Audit Logging**
- All tenant activities logged with user context
- IP address and user agent tracking
- Before/after values for data changes

### **Encryption**
- Sensitive tenant settings encrypted at rest
- API keys hashed and encrypted
- Secure transmission of all data

---

## 📊 Monitoring & Analytics

### **Health Metrics**
- **Overall Health**: healthy, warning, critical
- **Resource Usage**: percentage of quota utilization
- **Activity Levels**: API calls, user logins, data processing
- **Error Rates**: failed requests, quota violations

### **Usage Analytics**
- **Resource Consumption**: real-time usage tracking
- **Trend Analysis**: usage patterns over time
- **Capacity Planning**: predict future resource needs
- **Billing Integration**: usage-based billing calculations

### **Alerting**
- **Quota Warnings**: 80% and 95% usage alerts
- **Health Alerts**: critical health status notifications
- **Security Alerts**: suspicious activity detection
- **Billing Alerts**: payment failures, subscription issues

---

## 🚀 Deployment Considerations

### **Database Performance**
- Proper indexing on `tenant_id` columns
- Partitioning for large tenant tables
- Query optimization for multi-tenant queries

### **Caching Strategy**
- Tenant-aware caching with tenant_id prefixes
- Separate cache namespaces per tenant
- Cache invalidation on tenant updates

### **Scaling**
- Horizontal scaling with tenant-aware load balancing
- Database sharding by tenant for large deployments
- Microservices architecture with tenant context

### **Backup & Recovery**
- Tenant-specific backup strategies
- Point-in-time recovery per tenant
- Disaster recovery with tenant isolation

---

## 📈 Business Impact

### **Revenue Generation**
- **Subscription Tiers**: Clear pricing structure
- **Usage-Based Billing**: Pay-as-you-grow model
- **Upselling Opportunities**: Tier upgrade prompts
- **MSP Partnerships**: White-label opportunities

### **Customer Success**
- **Resource Monitoring**: Prevent quota violations
- **Health Monitoring**: Proactive issue detection
- **Usage Analytics**: Customer behavior insights
- **Support Integration**: Tenant-specific support

### **Operational Efficiency**
- **Automated Management**: Self-service tenant operations
- **Bulk Operations**: Multi-tenant administration
- **Audit Compliance**: Complete activity tracking
- **Resource Optimization**: Efficient resource allocation

---

## 🔄 Future Enhancements

### **Advanced Features**
- **Tenant Customization**: White-label branding
- **API Management**: Tenant-specific API keys
- **Integration Hub**: Third-party integrations
- **Advanced Analytics**: Business intelligence

### **Enterprise Features**
- **SSO Integration**: SAML/OAuth2 support
- **LDAP/AD Sync**: Enterprise directory integration
- **Custom Roles**: Tenant-specific role definitions
- **Advanced Security**: MFA, IP restrictions

### **Scalability Features**
- **Multi-Region**: Geographic distribution
- **Database Sharding**: Horizontal scaling
- **Microservices**: Service decomposition
- **Event Streaming**: Real-time data processing

---

## 📚 Related Documentation

- [Enterprise User Management](./ENTERPRISE_USER_MANAGEMENT.md)
- [Customer Onboarding Guide](./CUSTOMER_ONBOARDING_GUIDE.md)
- [API Reference](./API-Reference.md)
- [Security Hardening](./security-hardening.md)
- [Production Launch Checklist](./PRODUCTION_LAUNCH_CHECKLIST.md)

---

**🎉 The Multi-Tenant Architecture provides a solid foundation for SecureNet's growth as a SaaS platform, enabling efficient resource management, secure data isolation, and scalable operations.** 