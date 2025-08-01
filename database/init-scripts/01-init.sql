-- SecureNet Database Initialization Script
-- Creates the initial database schema and default data

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'platform_founder',
        'platform_owner', 
        'security_admin',
        'soc_analyst',
        'founder'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_plan AS ENUM (
        'free',
        'pro',
        'enterprise',
        'msp'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_level AS ENUM (
        'info',
        'warning',
        'error',
        'critical'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255),
    subscription_plan subscription_plan DEFAULT 'free',
    device_limit INTEGER DEFAULT 10,
    scan_limit INTEGER DEFAULT 100,
    log_retention_days INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'soc_analyst',
    organization_id INTEGER REFERENCES organizations(id),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    job_title VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    level audit_level NOT NULL DEFAULT 'info',
    category VARCHAR(50) NOT NULL,
    source VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    user_id INTEGER REFERENCES users(id),
    organization_id INTEGER REFERENCES organizations(id)
);

-- Create user_groups table
CREATE TABLE IF NOT EXISTS user_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    organization_id INTEGER REFERENCES organizations(id),
    group_type VARCHAR(50) DEFAULT 'department',
    access_level VARCHAR(50) DEFAULT 'business',
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_group_members table
CREATE TABLE IF NOT EXISTS user_group_members (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    group_id INTEGER REFERENCES user_groups(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, group_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_level ON audit_logs(level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_user_groups_organization ON user_groups(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_group_members_user ON user_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_user_group_members_group ON user_group_members(group_id);

-- Create default organization
INSERT INTO organizations (name, slug, domain, subscription_plan, device_limit, scan_limit, log_retention_days)
VALUES ('SecureNet Enterprise', 'securenet-enterprise', 'securenet.ai', 'enterprise', 1000, 10000, 365)
ON CONFLICT (slug) DO NOTHING;

-- Create default users (passwords will be set by the application)
INSERT INTO users (username, email, password_hash, role, organization_id, first_name, last_name, job_title)
VALUES 
    ('PierreMvita', 'pierre@securenet.ai', 'placeholder_hash', 'platform_founder', 1, 'Pierre', 'Mvita', 'Founder & CEO'),
    ('founder', 'founder@securenet.ai', 'placeholder_hash', 'platform_founder', 1, 'System', 'Founder', 'System Founder'),
    ('admin', 'admin@securenet.ai', 'placeholder_hash', 'platform_owner', 1, 'System', 'Admin', 'Platform Administrator'),
    ('user', 'user@securenet.ai', 'placeholder_hash', 'soc_analyst', 1, 'System', 'User', 'Security Analyst')
ON CONFLICT (username) DO NOTHING;

-- Create default user groups
INSERT INTO user_groups (name, description, organization_id, group_type, access_level)
VALUES 
    ('Executive Team', 'C-level executives and founders', 1, 'executive', 'strategic'),
    ('Security Operations', 'Security analysts and operators', 1, 'department', 'operational'),
    ('IT Operations', 'IT administrators and engineers', 1, 'department', 'operational'),
    ('Business Users', 'General business users', 1, 'department', 'business')
ON CONFLICT DO NOTHING;

-- Add users to default groups
INSERT INTO user_group_members (user_id, group_id)
SELECT u.id, g.id 
FROM users u, user_groups g 
WHERE u.username = 'PierreMvita' AND g.name = 'Executive Team'
ON CONFLICT DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_groups_updated_at BEFORE UPDATE ON user_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO securenet;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO securenet;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO securenet; 