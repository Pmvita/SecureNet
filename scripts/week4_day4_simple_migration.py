#!/usr/bin/env python3
"""
Week 4 Day 4: Simplified Enterprise User Groups & Account Expiration Migration
SecureNet Production Launch - Database Schema Updates (SQLite Compatible)
"""

import os
import sys
import sqlite3
import uuid
from datetime import datetime, timedelta

def run_week4_day4_migration():
    """Execute the Week 4 Day 4 migration for SQLite"""
    
    print("🚀 Week 4 Day 4: Enterprise User Groups & Account Expiration Migration")
    
    # Connect to SQLite database
    db_path = "data/securenet.db"
    if not os.path.exists(db_path):
        print(f"❌ Database not found at {db_path}")
        return False
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("\n📋 Step 1: Creating User Groups Table...")
        
        # Create user_groups table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_groups (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                organization_id TEXT NOT NULL,
                name VARCHAR(100) NOT NULL,
                description VARCHAR(500),
                group_type VARCHAR(50) DEFAULT 'custom',
                permissions TEXT DEFAULT '{}',
                access_level VARCHAR(50) DEFAULT 'business',
                is_active BOOLEAN DEFAULT 1,
                is_system_group BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(organization_id, name)
            )
        """)
        
        print("✅ User groups table created")
        
        print("\n📋 Step 2: Creating User Group Memberships Table...")
        
        # Create user_group_memberships table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_group_memberships (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                user_id TEXT NOT NULL,
                group_id TEXT NOT NULL,
                role_in_group VARCHAR(50) DEFAULT 'member',
                is_active BOOLEAN DEFAULT 1,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, group_id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (group_id) REFERENCES user_groups(id)
            )
        """)
        
        print("✅ User group memberships table created")
        
        print("\n⏰ Step 3: Adding Account Expiration Fields...")
        
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(users)")
        existing_columns = [row[1] for row in cursor.fetchall()]
        
        # Add account expiration fields
        expiration_fields = [
            ("account_expires_at", "TIMESTAMP"),
            ("password_expires_at", "TIMESTAMP"),
            ("contract_duration_months", "INTEGER"),
            ("account_type", "VARCHAR(50) DEFAULT 'permanent'"),
            ("renewal_required", "BOOLEAN DEFAULT 0"),
            ("contract_start_date", "TIMESTAMP"),
            ("contract_end_date", "TIMESTAMP"),
            ("account_status", "VARCHAR(50) DEFAULT 'active'")
        ]
        
        for field_name, field_type in expiration_fields:
            if field_name not in existing_columns:
                try:
                    cursor.execute(f"ALTER TABLE users ADD COLUMN {field_name} {field_type}")
                    print(f"✅ Added field: {field_name}")
                except Exception as e:
                    print(f"⚠️  Field {field_name} already exists or error: {e}")
        
        print("\n🏢 Step 4: Creating Default System User Groups...")
        
        # Get the first organization
        cursor.execute("SELECT id FROM organizations LIMIT 1")
        org_result = cursor.fetchone()
        
        if not org_result:
            print("⚠️  No organizations found. Creating default organization...")
            org_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO organizations (id, name, slug, primary_contact_email)
                VALUES (?, 'SecureNet Enterprise', 'securenet-enterprise', 'admin@securenet.ai')
            """, (org_id,))
        else:
            org_id = org_result[0]
        
        # Default user groups
        default_groups = [
            {
                'name': 'Sales Team',
                'description': 'Sales Development Reps, Account Executives, Sales Engineers, Directors',
                'group_type': 'department',
                'access_level': 'business',
                'permissions': '{"sales_pipeline": true, "customer_prospects": true, "demo_environments": true}'
            },
            {
                'name': 'Customer Success',
                'description': 'Customer Success Managers, Engineers, Onboarding Specialists',
                'group_type': 'department',
                'access_level': 'business',
                'permissions': '{"customer_health": true, "support_tickets": true, "usage_analytics": true}'
            },
            {
                'name': 'Support Team',
                'description': 'Tier 1/2/3 Support, Technical Support Engineers',
                'group_type': 'department',
                'access_level': 'it_ops',
                'permissions': '{"support_tickets": true, "customer_environments": true, "system_logs": true}'
            },
            {
                'name': 'Engineering',
                'description': 'Frontend, Backend, DevOps, Security, ML Engineers',
                'group_type': 'department',
                'access_level': 'security_ops',
                'permissions': '{"platform_development": true, "production_monitoring": true, "database_access": true}'
            },
            {
                'name': 'Executive',
                'description': 'CEO, CTO, VPs, Leadership team',
                'group_type': 'department',
                'access_level': 'platform_admin',
                'permissions': '{"executive_dashboards": true, "business_intelligence": true, "financial_reporting": true}'
            },
            {
                'name': 'Security Teams',
                'description': 'SOC Analysts, CISO, Security Directors, Incident Response',
                'group_type': 'customer',
                'access_level': 'security_ops',
                'permissions': '{"threat_detection": true, "security_analysis": true, "incident_response": true}'
            },
            {
                'name': 'IT Operations',
                'description': 'CIO, Network Engineers, System Administrators',
                'group_type': 'customer',
                'access_level': 'it_ops',
                'permissions': '{"network_monitoring": true, "device_management": true, "user_management": true}'
            },
            {
                'name': '6-Month Contractors',
                'description': 'Penetration testers, short-term security consultants',
                'group_type': 'contractor',
                'access_level': 'security_ops',
                'permissions': '{"security_assessment": true, "vulnerability_testing": true, "limited_scope": true}'
            },
            {
                'name': '1-Year Contractors',
                'description': 'Project engineers, long-term consultants',
                'group_type': 'contractor',
                'access_level': 'it_ops',
                'permissions': '{"project_access": true, "extended_scope": true, "system_integration": true}'
            },
            {
                'name': 'Temporary Access',
                'description': 'External auditors, emergency responders, vendor support',
                'group_type': 'contractor',
                'access_level': 'external',
                'permissions': '{"limited_duration": true, "supervised_access": true, "audit_trail": true}'
            }
        ]
        
        groups_created = 0
        for group_data in default_groups:
            group_id = str(uuid.uuid4())
            
            try:
                cursor.execute("""
                    INSERT INTO user_groups 
                    (id, organization_id, name, description, group_type, access_level, permissions, is_system_group)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                """, (
                    group_id, org_id, group_data['name'], group_data['description'],
                    group_data['group_type'], group_data['access_level'], group_data['permissions']
                ))
                groups_created += 1
                print(f"✅ Created group: {group_data['name']}")
                
            except Exception as e:
                print(f"⚠️  Group '{group_data['name']}' already exists or error: {e}")
        
        print(f"✅ Created {groups_created} default system user groups")
        
        print("\n📊 Step 5: Creating Indexes...")
        
        # Create indexes
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_user_groups_org ON user_groups(organization_id)",
            "CREATE INDEX IF NOT EXISTS idx_user_groups_type ON user_groups(group_type)",
            "CREATE INDEX IF NOT EXISTS idx_user_groups_access ON user_groups(access_level)",
            "CREATE INDEX IF NOT EXISTS idx_memberships_user ON user_group_memberships(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_memberships_group ON user_group_memberships(group_id)",
            "CREATE INDEX IF NOT EXISTS idx_users_account_expires ON users(account_expires_at)",
            "CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type)",
            "CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status)"
        ]
        
        for index in indexes:
            try:
                cursor.execute(index)
                print(f"✅ Created index")
            except Exception as e:
                print(f"⚠️  Index warning: {e}")
        
        print("\n🎯 Step 6: Creating Expiration View...")
        
        # Create view for users expiring soon
        cursor.execute("""
            CREATE VIEW IF NOT EXISTS users_expiring_soon AS
            SELECT 
                id as user_id,
                username,
                email,
                account_type,
                account_expires_at,
                CAST(julianday(account_expires_at) - julianday('now') AS INTEGER) as days_remaining
            FROM users
            WHERE account_expires_at IS NOT NULL
              AND account_expires_at > datetime('now')
              AND account_expires_at <= datetime('now', '+30 days')
              AND is_active = 1
            ORDER BY account_expires_at ASC
        """)
        
        print("✅ Expiration view created")
        
        # Commit all changes
        conn.commit()
        
        print("\n🎉 Week 4 Day 4 Migration Completed Successfully!")
        print("\n📊 Migration Summary:")
        print("✅ User groups tables created")
        print("✅ Account expiration fields added")
        print("✅ Default system groups created")
        print("✅ Database indexes created")
        print("✅ Expiration monitoring view created")
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
        conn.rollback()
        return False
        
    finally:
        conn.close()

def show_migration_status():
    """Show current migration status"""
    print("📊 Checking migration status...")
    
    db_path = "data/securenet.db"
    if not os.path.exists(db_path):
        print(f"❌ Database not found at {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'user_group%'")
        tables = cursor.fetchall()
        print(f"📋 User group tables: {[t[0] for t in tables]}")
        
        # Check user groups count
        cursor.execute("SELECT COUNT(*) FROM user_groups")
        group_count = cursor.fetchone()[0]
        print(f"👥 Total user groups: {group_count}")
        
        # Check users with expiration fields
        cursor.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in cursor.fetchall()]
        expiration_columns = [col for col in columns if 'expire' in col or 'contract' in col or 'account_type' in col]
        print(f"⏰ Expiration fields: {expiration_columns}")
        
    except Exception as e:
        print(f"⚠️  Status check error: {e}")
    finally:
        conn.close()

def main():
    """Main migration execution"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Week 4 Day 4 Simplified User Groups & Account Expiration Migration')
    parser.add_argument('--status', action='store_true', help='Show migration status')
    
    args = parser.parse_args()
    
    if args.status:
        show_migration_status()
    else:
        success = run_week4_day4_migration()
        sys.exit(0 if success else 1)

if __name__ == '__main__':
    main() 