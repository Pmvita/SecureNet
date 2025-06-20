#!/usr/bin/env python3
"""
Week 4 Day 4: Enterprise User Groups & Account Expiration Migration
SecureNet Production Launch - Database Schema Updates

This migration adds comprehensive user group management and account expiration
capabilities required for enterprise customer deployment.
"""

import os
import sys
import uuid
from datetime import datetime, timedelta
from sqlalchemy import (
    create_engine, MetaData, Table, Column, String, Boolean, Integer, 
    TIMESTAMP, ForeignKey, Index, UniqueConstraint, CheckConstraint,
    text, func
)
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID, JSONB, ENUM
from sqlalchemy.orm import sessionmaker

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class Week4Day4UserGroupsMigration:
    """Enterprise User Groups & Account Expiration Migration"""
    
    def __init__(self, database_url: str = None):
        self.database_url = database_url or os.getenv(
            'DATABASE_URL', 
            'sqlite:///data/securenet.db'
        )
        self.engine = create_engine(self.database_url)
        self.metadata = MetaData()
        
        # Create session factory
        Session = sessionmaker(bind=self.engine)
        self.session = Session()
        
        print("🚀 Week 4 Day 4: Enterprise User Groups & Account Expiration Migration")
        print(f"📊 Database: {self.database_url}")
    
    def create_user_groups_tables(self):
        """Create user groups and membership tables"""
        print("\n📋 Creating User Groups Tables...")
        
        # User Groups table
        user_groups = Table(
            'user_groups',
            self.metadata,
            Column('id', PostgresUUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
            Column('organization_id', PostgresUUID(as_uuid=True), 
                   ForeignKey('organizations.id'), nullable=False),
            
            # Group details
            Column('name', String(100), nullable=False),
            Column('description', String(500), nullable=True),
            Column('group_type', String(50), nullable=False, default='custom'),  # system, department, project, custom
            
            # Permissions and access
            Column('permissions', JSONB, default=dict),
            Column('access_level', String(50), nullable=False, default='business'),  # platform_admin, security_ops, it_ops, business, external
            Column('default_permissions', JSONB, default=dict),
            
            # Group hierarchy
            Column('parent_group_id', PostgresUUID(as_uuid=True), 
                   ForeignKey('user_groups.id'), nullable=True),
            Column('group_path', String(500), nullable=True),  # For hierarchical queries
            Column('level', Integer, default=1, nullable=False),
            
            # Group status
            Column('is_active', Boolean, default=True, nullable=False),
            Column('is_system_group', Boolean, default=False, nullable=False),
            Column('max_members', Integer, nullable=True),
            
            # Metadata
            Column('tags', JSONB, default=list),
            Column('custom_fields', JSONB, default=dict),
            
            # Audit fields
            Column('created_at', TIMESTAMP(timezone=True), server_default=func.now()),
            Column('updated_at', TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now()),
            Column('created_by', PostgresUUID(as_uuid=True), ForeignKey('users.id')),
            Column('updated_by', PostgresUUID(as_uuid=True), ForeignKey('users.id')),
            
            # Constraints
            UniqueConstraint('organization_id', 'name', name='unique_org_group_name'),
            CheckConstraint('level > 0', name='positive_level'),
            Index('idx_user_groups_org', 'organization_id'),
            Index('idx_user_groups_type', 'group_type'),
            Index('idx_user_groups_access', 'access_level'),
            Index('idx_user_groups_active', 'is_active'),
            Index('idx_user_groups_parent', 'parent_group_id'),
        )
        
        # User Group Memberships table
        user_group_memberships = Table(
            'user_group_memberships',
            self.metadata,
            Column('id', PostgresUUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
            Column('user_id', PostgresUUID(as_uuid=True), 
                   ForeignKey('users.id'), nullable=False),
            Column('group_id', PostgresUUID(as_uuid=True), 
                   ForeignKey('user_groups.id'), nullable=False),
            
            # Membership details
            Column('role_in_group', String(50), default='member', nullable=False),  # admin, manager, member, viewer
            Column('is_primary_group', Boolean, default=False, nullable=False),
            Column('is_active', Boolean, default=True, nullable=False),
            
            # Membership lifecycle
            Column('joined_at', TIMESTAMP(timezone=True), server_default=func.now()),
            Column('expires_at', TIMESTAMP(timezone=True), nullable=True),
            Column('last_activity', TIMESTAMP(timezone=True), nullable=True),
            
            # Permission overrides
            Column('permission_overrides', JSONB, default=dict),
            Column('access_restrictions', JSONB, default=dict),
            
            # Audit fields
            Column('added_by', PostgresUUID(as_uuid=True), ForeignKey('users.id')),
            Column('updated_by', PostgresUUID(as_uuid=True), ForeignKey('users.id')),
            Column('created_at', TIMESTAMP(timezone=True), server_default=func.now()),
            Column('updated_at', TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now()),
            
            # Constraints
            UniqueConstraint('user_id', 'group_id', name='unique_user_group_membership'),
            Index('idx_memberships_user', 'user_id'),
            Index('idx_memberships_group', 'group_id'),
            Index('idx_memberships_active', 'is_active'),
            Index('idx_memberships_primary', 'is_primary_group'),
            Index('idx_memberships_expires', 'expires_at'),
        )
        
        # Create the tables
        user_groups.create(self.engine, checkfirst=True)
        user_group_memberships.create(self.engine, checkfirst=True)
        
        print("✅ User Groups tables created successfully")
        return user_groups, user_group_memberships
    
    def add_account_expiration_fields(self):
        """Add account and password expiration fields to users table"""
        print("\n⏰ Adding Account Expiration Fields...")
        
        # SQLite and PostgreSQL have different ALTER TABLE syntax
        if 'sqlite' in self.database_url.lower():
            # SQLite doesn't support adding multiple columns in one statement
            alter_statements = [
                "ALTER TABLE users ADD COLUMN account_expires_at TIMESTAMP",
                "ALTER TABLE users ADD COLUMN password_expires_at TIMESTAMP", 
                "ALTER TABLE users ADD COLUMN contract_duration_months INTEGER",
                "ALTER TABLE users ADD COLUMN account_type VARCHAR(50) DEFAULT 'permanent'",
                "ALTER TABLE users ADD COLUMN renewal_required BOOLEAN DEFAULT FALSE",
                "ALTER TABLE users ADD COLUMN auto_extend_enabled BOOLEAN DEFAULT FALSE",
                "ALTER TABLE users ADD COLUMN manager_user_id VARCHAR(36)",
                "ALTER TABLE users ADD COLUMN contract_start_date TIMESTAMP",
                "ALTER TABLE users ADD COLUMN contract_end_date TIMESTAMP",
                "ALTER TABLE users ADD COLUMN expiration_notification_sent BOOLEAN DEFAULT FALSE",
                "ALTER TABLE users ADD COLUMN grace_period_days INTEGER DEFAULT 7",
                "ALTER TABLE users ADD COLUMN account_status VARCHAR(50) DEFAULT 'active'"
            ]
        else:
            # PostgreSQL supports multiple columns
            alter_statements = [
                """
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS account_expires_at TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS password_expires_at TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS contract_duration_months INTEGER,
                ADD COLUMN IF NOT EXISTS account_type VARCHAR(50) DEFAULT 'permanent',
                ADD COLUMN IF NOT EXISTS renewal_required BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS auto_extend_enabled BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS manager_user_id UUID REFERENCES users(id),
                ADD COLUMN IF NOT EXISTS contract_start_date TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS contract_end_date TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS expiration_notification_sent BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS grace_period_days INTEGER DEFAULT 7,
                ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'active'
                """
            ]
        
        # Execute the ALTER TABLE statements
        with self.engine.connect() as conn:
            for statement in alter_statements:
                try:
                    conn.execute(text(statement))
                    conn.commit()
                except Exception as e:
                    print(f"⚠️  Warning: {e}")
                    # Continue with other statements
        
        # Create indexes for the new fields
        index_statements = [
            "CREATE INDEX IF NOT EXISTS idx_users_account_expires ON users(account_expires_at)",
            "CREATE INDEX IF NOT EXISTS idx_users_password_expires ON users(password_expires_at)",
            "CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type)",
            "CREATE INDEX IF NOT EXISTS idx_users_contract_end ON users(contract_end_date)",
            "CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status)",
            "CREATE INDEX IF NOT EXISTS idx_users_manager ON users(manager_user_id)"
        ]
        
        with self.engine.connect() as conn:
            for statement in index_statements:
                try:
                    conn.execute(text(statement))
                    conn.commit()
                except Exception as e:
                    print(f"⚠️  Index warning: {e}")
        
        print("✅ Account expiration fields added successfully")
    
    def create_default_user_groups(self):
        """Create default system user groups based on Enterprise User Management requirements"""
        print("\n🏢 Creating Default System User Groups...")
        
        # Default groups based on our Enterprise User Management documentation
        default_groups = [
            # Internal SecureNet Company Groups
            {
                'name': 'Sales Team',
                'description': 'Sales Development Reps, Account Executives, Sales Engineers, Directors',
                'group_type': 'department',
                'access_level': 'business',
                'is_system_group': True,
                'permissions': {
                    'sales_pipeline': True,
                    'customer_prospects': True,
                    'demo_environments': True,
                    'sales_analytics': True
                }
            },
            {
                'name': 'Customer Success',
                'description': 'Customer Success Managers, Engineers, Onboarding Specialists',
                'group_type': 'department', 
                'access_level': 'business',
                'is_system_group': True,
                'permissions': {
                    'customer_health': True,
                    'support_tickets': True,
                    'usage_analytics': True,
                    'billing_readonly': True
                }
            },
            {
                'name': 'Support Team',
                'description': 'Tier 1/2/3 Support, Technical Support Engineers',
                'group_type': 'department',
                'access_level': 'it_ops',
                'is_system_group': True,
                'permissions': {
                    'support_tickets': True,
                    'customer_environments': True,
                    'system_logs': True,
                    'knowledge_base': True
                }
            },
            {
                'name': 'Engineering',
                'description': 'Frontend, Backend, DevOps, Security, ML Engineers',
                'group_type': 'department',
                'access_level': 'security_ops',
                'is_system_group': True,
                'permissions': {
                    'platform_development': True,
                    'production_monitoring': True,
                    'database_access': True,
                    'cicd_management': True
                }
            },
            {
                'name': 'Executive',
                'description': 'CEO, CTO, VPs, Leadership team',
                'group_type': 'department',
                'access_level': 'platform_admin',
                'is_system_group': True,
                'permissions': {
                    'executive_dashboards': True,
                    'business_intelligence': True,
                    'financial_reporting': True,
                    'strategic_planning': True
                }
            },
            {
                'name': 'Corporate Functions',
                'description': 'Finance, HR, Legal, Compliance, Operations',
                'group_type': 'department',
                'access_level': 'business',
                'is_system_group': True,
                'permissions': {
                    'financial_dashboards': True,
                    'compliance_reporting': True,
                    'vendor_management': True,
                    'policy_access': True
                }
            },
            
            # Customer Organization Groups  
            {
                'name': 'Security Teams',
                'description': 'SOC Analysts, CISO, Security Directors, Incident Response',
                'group_type': 'customer',
                'access_level': 'security_ops',
                'is_system_group': True,
                'permissions': {
                    'threat_detection': True,
                    'security_analysis': True,
                    'incident_response': True,
                    'threat_intelligence': True
                }
            },
            {
                'name': 'IT Operations',
                'description': 'CIO, Network Engineers, System Administrators',
                'group_type': 'customer',
                'access_level': 'it_ops',
                'is_system_group': True,
                'permissions': {
                    'network_monitoring': True,
                    'device_management': True,
                    'user_management': True,
                    'system_configuration': True
                }
            },
            {
                'name': 'Business Stakeholders',
                'description': 'Executives, Compliance Officers, Risk Managers',
                'group_type': 'customer',
                'access_level': 'business',
                'is_system_group': True,
                'permissions': {
                    'executive_dashboards': True,
                    'compliance_status': True,
                    'risk_assessment': True,
                    'audit_access': True
                }
            },
            
            # Contractor Groups
            {
                'name': '6-Month Contractors',
                'description': 'Penetration testers, short-term security consultants',
                'group_type': 'contractor',
                'access_level': 'security_ops',
                'is_system_group': True,
                'permissions': {
                    'security_assessment': True,
                    'vulnerability_testing': True,
                    'limited_scope': True
                }
            },
            {
                'name': '1-Year Contractors',
                'description': 'Project engineers, long-term consultants',
                'group_type': 'contractor',
                'access_level': 'it_ops',
                'is_system_group': True,
                'permissions': {
                    'project_access': True,
                    'extended_scope': True,
                    'system_integration': True
                }
            },
            {
                'name': 'Temporary Access',
                'description': 'External auditors, emergency responders, vendor support',
                'group_type': 'contractor',
                'access_level': 'external',
                'is_system_group': True,
                'permissions': {
                    'limited_duration': True,
                    'supervised_access': True,
                    'audit_trail': True
                }
            }
        ]
        
        # Get the first organization for system groups
        with self.engine.connect() as conn:
            result = conn.execute(text("SELECT id FROM organizations LIMIT 1"))
            org_row = result.fetchone()
            
            if not org_row:
                print("⚠️  No organizations found. Creating default organization...")
                org_id = str(uuid.uuid4())
                conn.execute(text("""
                    INSERT INTO organizations (id, name, slug, primary_contact_email)
                    VALUES (:id, 'SecureNet Enterprise', 'securenet-enterprise', 'admin@securenet.ai')
                """), {'id': org_id})
                conn.commit()
            else:
                org_id = str(org_row[0])
        
        # Insert default groups
        groups_created = 0
        with self.engine.connect() as conn:
            for group_data in default_groups:
                group_id = str(uuid.uuid4())
                
                try:
                    conn.execute(text("""
                        INSERT INTO user_groups 
                        (id, organization_id, name, description, group_type, access_level, 
                         is_system_group, permissions, is_active, level)
                        VALUES 
                        (:id, :org_id, :name, :description, :group_type, :access_level,
                         :is_system_group, :permissions, true, 1)
                    """), {
                        'id': group_id,
                        'org_id': org_id,
                        'name': group_data['name'],
                        'description': group_data['description'],
                        'group_type': group_data['group_type'],
                        'access_level': group_data['access_level'],
                        'is_system_group': group_data['is_system_group'],
                        'permissions': str(group_data['permissions']).replace("'", '"')
                    })
                    groups_created += 1
                    print(f"✅ Created group: {group_data['name']}")
                    
                except Exception as e:
                    print(f"⚠️  Group '{group_data['name']}' already exists or error: {e}")
            
            conn.commit()
        
        print(f"✅ Created {groups_created} default system user groups")
    
    def create_account_type_enum(self):
        """Create account type enumeration for PostgreSQL"""
        if 'postgresql' in self.database_url.lower():
            print("\n🔧 Creating Account Type Enum...")
            with self.engine.connect() as conn:
                try:
                    conn.execute(text("""
                        CREATE TYPE account_type_enum AS ENUM (
                            'permanent',
                            'contractor_6m',
                            'contractor_1y', 
                            'temporary_30d',
                            'temporary_60d',
                            'temporary_90d'
                        )
                    """))
                    conn.commit()
                    print("✅ Account type enum created")
                except Exception as e:
                    print(f"⚠️  Account type enum already exists or error: {e}")
    
    def create_expiration_functions(self):
        """Create database functions for account expiration management"""
        print("\n⚙️ Creating Expiration Management Functions...")
        
        if 'postgresql' in self.database_url.lower():
            # PostgreSQL stored procedures
            functions = [
                """
                CREATE OR REPLACE FUNCTION check_account_expirations()
                RETURNS TABLE(
                    user_id UUID,
                    username VARCHAR,
                    email VARCHAR,
                    account_expires_at TIMESTAMP WITH TIME ZONE,
                    days_until_expiry INTEGER
                ) AS $$
                BEGIN
                    RETURN QUERY
                    SELECT 
                        u.id,
                        u.username,
                        u.email,
                        u.account_expires_at,
                        EXTRACT(DAYS FROM (u.account_expires_at - NOW()))::INTEGER
                    FROM users u
                    WHERE u.account_expires_at IS NOT NULL
                      AND u.account_expires_at > NOW()
                      AND u.account_expires_at <= NOW() + INTERVAL '30 days'
                      AND u.is_active = true
                    ORDER BY u.account_expires_at ASC;
                END;
                $$ LANGUAGE plpgsql;
                """,
                
                """
                CREATE OR REPLACE FUNCTION extend_user_account(
                    p_user_id UUID,
                    p_extend_months INTEGER
                ) RETURNS BOOLEAN AS $$
                DECLARE
                    current_expiry TIMESTAMP WITH TIME ZONE;
                BEGIN
                    SELECT account_expires_at INTO current_expiry
                    FROM users WHERE id = p_user_id;
                    
                    IF current_expiry IS NULL THEN
                        current_expiry := NOW();
                    END IF;
                    
                    UPDATE users 
                    SET account_expires_at = current_expiry + (p_extend_months || ' months')::INTERVAL,
                        updated_at = NOW(),
                        expiration_notification_sent = FALSE
                    WHERE id = p_user_id;
                    
                    RETURN FOUND;
                END;
                $$ LANGUAGE plpgsql;
                """,
                
                """
                CREATE OR REPLACE FUNCTION get_users_expiring_soon(p_days INTEGER DEFAULT 7)
                RETURNS TABLE(
                    user_id UUID,
                    username VARCHAR,
                    email VARCHAR,
                    account_type VARCHAR,
                    days_remaining INTEGER
                ) AS $$
                BEGIN
                    RETURN QUERY
                    SELECT 
                        u.id,
                        u.username,
                        u.email,
                        u.account_type,
                        EXTRACT(DAYS FROM (u.account_expires_at - NOW()))::INTEGER
                    FROM users u
                    WHERE u.account_expires_at IS NOT NULL
                      AND u.account_expires_at <= NOW() + (p_days || ' days')::INTERVAL
                      AND u.account_expires_at > NOW()
                      AND u.is_active = true
                    ORDER BY u.account_expires_at ASC;
                END;
                $$ LANGUAGE plpgsql;
                """
            ]
            
            with self.engine.connect() as conn:
                for func in functions:
                    try:
                        conn.execute(text(func))
                        conn.commit()
                    except Exception as e:
                        print(f"⚠️  Function error: {e}")
            
            print("✅ PostgreSQL expiration functions created")
        
        else:
            # SQLite views for similar functionality
            views = [
                """
                CREATE VIEW IF NOT EXISTS users_expiring_soon AS
                SELECT 
                    id as user_id,
                    username,
                    email,
                    account_type,
                    CAST(julianday(account_expires_at) - julianday('now') AS INTEGER) as days_remaining
                FROM users
                WHERE account_expires_at IS NOT NULL
                  AND account_expires_at > datetime('now')
                  AND account_expires_at <= datetime('now', '+30 days')
                  AND is_active = 1
                ORDER BY account_expires_at ASC
                """
            ]
            
            with self.engine.connect() as conn:
                for view in views:
                    try:
                        conn.execute(text(view))
                        conn.commit()
                    except Exception as e:
                        print(f"⚠️  View error: {e}")
            
            print("✅ SQLite expiration views created")
    
    def run_migration(self):
        """Execute the complete Week 4 Day 4 migration"""
        print("🚀 Starting Week 4 Day 4 Enterprise User Groups & Account Expiration Migration\n")
        
        try:
            # Step 1: Create account type enum (PostgreSQL only)
            self.create_account_type_enum()
            
            # Step 2: Create user groups tables
            self.create_user_groups_tables()
            
            # Step 3: Add account expiration fields to users table
            self.add_account_expiration_fields()
            
            # Step 4: Create default system user groups
            self.create_default_user_groups()
            
            # Step 5: Create expiration management functions
            self.create_expiration_functions()
            
            print("\n🎉 Week 4 Day 4 Migration Completed Successfully!")
            print("\n📊 Migration Summary:")
            print("✅ User groups tables created")
            print("✅ Account expiration fields added")
            print("✅ Default system groups created")
            print("✅ Expiration management functions added")
            print("\n🔄 Next Steps:")
            print("- Implement User Groups CRUD API endpoints")
            print("- Create automated expiration checking background job")
            print("- Build email notification system")
            print("- Develop frontend user management interface")
            
            return True
            
        except Exception as e:
            print(f"\n❌ Migration failed: {e}")
            import traceback
            traceback.print_exc()
            return False
        
        finally:
            self.session.close()
    
    def rollback_migration(self):
        """Rollback the migration (for testing purposes)"""
        print("🔄 Rolling back Week 4 Day 4 migration...")
        
        rollback_statements = [
            "DROP TABLE IF EXISTS user_group_memberships",
            "DROP TABLE IF EXISTS user_groups",
            "DROP VIEW IF EXISTS users_expiring_soon",
            "DROP FUNCTION IF EXISTS check_account_expirations()",
            "DROP FUNCTION IF EXISTS extend_user_account(UUID, INTEGER)",
            "DROP FUNCTION IF EXISTS get_users_expiring_soon(INTEGER)",
            "DROP TYPE IF EXISTS account_type_enum"
        ]
        
        with self.engine.connect() as conn:
            for statement in rollback_statements:
                try:
                    conn.execute(text(statement))
                    conn.commit()
                except Exception as e:
                    print(f"⚠️  Rollback warning: {e}")
        
        print("✅ Migration rolled back")

def main():
    """Main migration execution"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Week 4 Day 4 User Groups & Account Expiration Migration')
    parser.add_argument('--rollback', action='store_true', help='Rollback the migration')
    parser.add_argument('--database-url', help='Database URL override')
    
    args = parser.parse_args()
    
    migration = Week4Day4UserGroupsMigration(args.database_url)
    
    if args.rollback:
        migration.rollback_migration()
    else:
        success = migration.run_migration()
        sys.exit(0 if success else 1)

if __name__ == '__main__':
    main() 