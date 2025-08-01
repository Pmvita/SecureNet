-- Advanced Billing System Migration
-- SecureNet Phase 3: Production Platform - Advanced Billing System

-- Add unique constraint on tenant_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'organizations_tenant_id_key'
    ) THEN
        ALTER TABLE organizations ADD CONSTRAINT organizations_tenant_id_key UNIQUE (tenant_id);
    END IF;
END $$;

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(tenant_id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'draft',
    billing_reason VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    stripe_invoice_id VARCHAR(255),
    metadata JSONB DEFAULT '{}'
);

-- Create invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price_cents INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create billing webhooks table
CREATE TABLE IF NOT EXISTS billing_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(tenant_id) ON DELETE CASCADE,
    webhook_type VARCHAR(100) NOT NULL,
    webhook_url VARCHAR(500) NOT NULL,
    secret_key VARCHAR(255),
    events JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create billing events table for audit trail
CREATE TABLE IF NOT EXISTS billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(tenant_id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    stripe_event_id VARCHAR(255),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage tracking table for detailed usage analytics
CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(tenant_id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL,
    usage_amount INTEGER NOT NULL,
    usage_date DATE NOT NULL,
    usage_hour INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_webhooks_tenant_id ON billing_webhooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_tenant_id ON billing_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_event_type ON billing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_tenant_id ON usage_tracking(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_resource_type ON usage_tracking(resource_type);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_date ON usage_tracking(usage_date);

-- Add triggers for updated_at columns
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_billing_webhooks_updated_at BEFORE UPDATE ON billing_webhooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default billing webhook for system events
INSERT INTO billing_webhooks (tenant_id, webhook_type, webhook_url, events) VALUES 
('00000000-0000-0000-0000-000000000000', 'system', 'https://api.securenet.ai/webhooks/billing', 
 '["invoice.payment_succeeded", "invoice.payment_failed", "customer.subscription.updated", "customer.subscription.deleted"]')
ON CONFLICT DO NOTHING; 