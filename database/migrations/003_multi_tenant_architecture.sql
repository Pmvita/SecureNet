-- SecureNet Multi-Tenant Architecture Migration
-- Phase 3: Production Platform - Multi-Tenant Database Schema

-- Create tenant-specific enums
CREATE TYPE tenant_status AS ENUM ('active', 'suspended', 'pending', 'cancelled');
CREATE TYPE tenant_tier AS ENUM ('free', 'pro', 'enterprise', 'msp');
CREATE TYPE resource_type AS ENUM ('users', 'devices', 'storage_gb', 'api_calls', 'alerts_per_month');

-- Enhanced organizations table for multi-tenancy
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT gen_random_uuid();
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tenant_status tenant_status DEFAULT 'active';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tenant_tier tenant_tier DEFAULT 'free';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS locale VARCHAR(10) DEFAULT 'en-US';

-- Create tenant resource quotas table
CREATE TABLE IF NOT EXISTS tenant_resource_quotas (
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

-- Create tenant usage tracking table
CREATE TABLE IF NOT EXISTS tenant_usage_logs (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES organizations(tenant_id) ON DELETE CASCADE,
    resource_type resource_type NOT NULL,
    usage_amount INTEGER NOT NULL,
    usage_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tenant billing table
CREATE TABLE IF NOT EXISTS tenant_billing (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES organizations(tenant_id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    amount_cents INTEGER NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tenant settings table
CREATE TABLE IF NOT EXISTS tenant_settings (
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

-- Create tenant audit logs table
CREATE TABLE IF NOT EXISTS tenant_audit_logs (
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

-- Create tenant integrations table
CREATE TABLE IF NOT EXISTS tenant_integrations (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES organizations(tenant_id) ON DELETE CASCADE,
    integration_type VARCHAR(100) NOT NULL,
    integration_name VARCHAR(255) NOT NULL,
    config_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tenant custom branding table
CREATE TABLE IF NOT EXISTS tenant_branding (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES organizations(tenant_id) ON DELETE CASCADE,
    logo_url VARCHAR(500),
    favicon_url VARCHAR(500),
    primary_color VARCHAR(7) DEFAULT '#3B82F6',
    secondary_color VARCHAR(7) DEFAULT '#1F2937',
    company_name VARCHAR(255),
    support_email VARCHAR(255),
    support_phone VARCHAR(50),
    custom_domain VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tenant API keys table
CREATE TABLE IF NOT EXISTS tenant_api_keys (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES organizations(tenant_id) ON DELETE CASCADE,
    key_name VARCHAR(255) NOT NULL,
    api_key_hash VARCHAR(255) NOT NULL,
    permissions JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tenant webhooks table
CREATE TABLE IF NOT EXISTS tenant_webhooks (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES organizations(tenant_id) ON DELETE CASCADE,
    webhook_url VARCHAR(500) NOT NULL,
    events JSONB NOT NULL DEFAULT '[]',
    secret_key VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_tenant_id ON organizations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_organizations_tenant_status ON organizations(tenant_status);
CREATE INDEX IF NOT EXISTS idx_organizations_tenant_tier ON organizations(tenant_tier);
CREATE INDEX IF NOT EXISTS idx_tenant_resource_quotas_tenant_id ON tenant_resource_quotas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_usage_logs_tenant_id ON tenant_usage_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_usage_logs_date ON tenant_usage_logs(usage_date);
CREATE INDEX IF NOT EXISTS idx_tenant_billing_tenant_id ON tenant_billing(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant_id ON tenant_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_logs_tenant_id ON tenant_audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_logs_created_at ON tenant_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_tenant_integrations_tenant_id ON tenant_integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_branding_tenant_id ON tenant_branding(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_tenant_id ON tenant_api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_webhooks_tenant_id ON tenant_webhooks(tenant_id);

-- Insert default resource quotas for each tier
INSERT INTO tenant_resource_quotas (tenant_id, resource_type, quota_limit, reset_date) 
SELECT 
    o.tenant_id,
    'users'::resource_type,
    CASE 
        WHEN o.tenant_tier = 'starter' THEN 5
        WHEN o.tenant_tier = 'professional' THEN 50
        WHEN o.tenant_tier = 'business' THEN 500
        WHEN o.tenant_tier = 'enterprise' THEN 1000
        WHEN o.tenant_tier = 'msp' THEN 1000
    END,
    DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
FROM organizations o
ON CONFLICT (tenant_id, resource_type) DO NOTHING;

INSERT INTO tenant_resource_quotas (tenant_id, resource_type, quota_limit, reset_date) 
SELECT 
    o.tenant_id,
    'devices'::resource_type,
    CASE 
        WHEN o.tenant_tier = 'starter' THEN 25
        WHEN o.tenant_tier = 'professional' THEN 250
        WHEN o.tenant_tier = 'business' THEN 2500
        WHEN o.tenant_tier = 'enterprise' THEN 5000
        WHEN o.tenant_tier = 'msp' THEN 10000
    END,
    DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
FROM organizations o
ON CONFLICT (tenant_id, resource_type) DO NOTHING;

INSERT INTO tenant_resource_quotas (tenant_id, resource_type, quota_limit, reset_date) 
SELECT 
    o.tenant_id,
    'storage_gb'::resource_type,
    CASE 
        WHEN o.tenant_tier = 'starter' THEN 5
        WHEN o.tenant_tier = 'professional' THEN 25
        WHEN o.tenant_tier = 'business' THEN 100
        WHEN o.tenant_tier = 'enterprise' THEN 500
        WHEN o.tenant_tier = 'msp' THEN 1000
    END,
    DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
FROM organizations o
ON CONFLICT (tenant_id, resource_type) DO NOTHING;

INSERT INTO tenant_resource_quotas (tenant_id, resource_type, quota_limit, reset_date) 
SELECT 
    o.tenant_id,
    'api_calls'::resource_type,
    CASE 
        WHEN o.tenant_tier = 'starter' THEN 5000
        WHEN o.tenant_tier = 'professional' THEN 25000
        WHEN o.tenant_tier = 'business' THEN 100000
        WHEN o.tenant_tier = 'enterprise' THEN 500000
        WHEN o.tenant_tier = 'msp' THEN 1000000
    END,
    DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
FROM organizations o
ON CONFLICT (tenant_id, resource_type) DO NOTHING;

INSERT INTO tenant_resource_quotas (tenant_id, resource_type, quota_limit, reset_date) 
SELECT 
    o.tenant_id,
    'alerts_per_month'::resource_type,
    CASE 
        WHEN o.tenant_tier = 'starter' THEN 500
        WHEN o.tenant_tier = 'professional' THEN 2500
        WHEN o.tenant_tier = 'business' THEN 10000
        WHEN o.tenant_tier = 'enterprise' THEN 50000
        WHEN o.tenant_tier = 'msp' THEN 100000
    END,
    DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
FROM organizations o
ON CONFLICT (tenant_id, resource_type) DO NOTHING;

-- Insert default settings for each tenant
INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, setting_type) 
SELECT 
    o.tenant_id,
    'security_level',
    CASE 
        WHEN o.tenant_tier = 'free' THEN 'basic'
        WHEN o.tenant_tier = 'pro' THEN 'standard'
        WHEN o.tenant_tier = 'enterprise' THEN 'advanced'
        WHEN o.tenant_tier = 'msp' THEN 'enterprise'
    END,
    'string'
FROM organizations o
ON CONFLICT (tenant_id, setting_key) DO NOTHING;

INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, setting_type) 
SELECT 
    o.tenant_id,
    'retention_days',
    CASE 
        WHEN o.tenant_tier = 'free' THEN '30'
        WHEN o.tenant_tier = 'pro' THEN '90'
        WHEN o.tenant_tier = 'enterprise' THEN '365'
        WHEN o.tenant_tier = 'msp' THEN '730'
    END,
    'integer'
FROM organizations o
ON CONFLICT (tenant_id, setting_key) DO NOTHING;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_resource_quotas_updated_at BEFORE UPDATE ON tenant_resource_quotas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_billing_updated_at BEFORE UPDATE ON tenant_billing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_settings_updated_at BEFORE UPDATE ON tenant_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_integrations_updated_at BEFORE UPDATE ON tenant_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_branding_updated_at BEFORE UPDATE ON tenant_branding FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_api_keys_updated_at BEFORE UPDATE ON tenant_api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_webhooks_updated_at BEFORE UPDATE ON tenant_webhooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO securenet;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO securenet;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO securenet; 