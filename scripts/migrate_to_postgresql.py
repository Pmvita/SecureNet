#!/usr/bin/env python3
"""
Migration Script: SQLite to PostgreSQL
Migrates SecureNet from SQLite to PostgreSQL for enterprise deployment
"""

import os
import sys
import asyncio
import logging
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database_postgresql import db
from models import *
import subprocess

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def check_postgresql_connection():
    """Check if PostgreSQL is accessible"""
    try:
        await db.initialize()
        logger.info("✅ PostgreSQL connection successful")
        return True
    except Exception as e:
        logger.error(f"❌ PostgreSQL connection failed: {e}")
        return False

async def run_migrations():
    """Run Alembic migrations to create schema"""
    try:
        logger.info("Running Alembic migrations...")
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent
        )
        
        if result.returncode == 0:
            logger.info("✅ Database schema created successfully")
            return True
        else:
            logger.error(f"❌ Migration failed: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"❌ Migration error: {e}")
        return False

async def create_default_organization():
    """Create default organization for migration"""
    try:
        # Check if default organization exists
        org = await db.get_organization_by_api_key("sk-dev-api-key-securenet-default")
        if org:
            logger.info(f"✅ Default organization already exists: {org['id']}")
            return org['id']
        
        # Create default organization
        org_id = await db.create_organization(
            name="SecureNet Default",
            owner_email="admin@securenet.local",
            plan=PlanType.ENTERPRISE
        )
        
        # Update with known API key
        async with db.get_session() as session:
            await session.execute(
                update(Organization).where(Organization.id == org_id).values(
                    api_key="sk-dev-api-key-securenet-default"
                )
            )
        
        logger.info(f"✅ Created default organization: {org_id}")
        return org_id
        
    except Exception as e:
        logger.error(f"❌ Failed to create default organization: {e}")
        raise

async def create_default_users(org_id: str):
    """Create default users for the organization"""
    try:
        from src.security import get_password_hash
        
        default_users = [
            {
                "username": "ceo",
                "email": "ceo@securenet.local",
                "password": "superadmin123",
                "role": UserRole.PLATFORM_OWNER
            },
            {
                "username": "admin",
                "email": "admin@securenet.local", 
                "password": "platform123",
                "role": UserRole.SECURITY_ADMIN
            },
            {
                "username": "user",
                "email": "user@securenet.local",
                "password": "enduser123", 
                "role": UserRole.SOC_ANALYST
            }
        ]
        
        for user_data in default_users:
            # Check if user exists
            existing_user = await db.get_user_by_username(user_data["username"])
            if existing_user:
                logger.info(f"✅ User {user_data['username']} already exists")
                continue
            
            # Create user
            password_hash = get_password_hash(user_data["password"])
            user_id = await db.create_user(
                username=user_data["username"],
                email=user_data["email"],
                password_hash=password_hash,
                role=user_data["role"],
                organization_id=org_id
            )
            
            logger.info(f"✅ Created user: {user_data['username']} (ID: {user_id})")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to create default users: {e}")
        raise

async def create_sample_data(org_id: str):
    """Create sample data for demonstration"""
    try:
        # Create sample network devices
        sample_devices = [
            {
                "name": "Router-Main",
                "ip_address": "192.168.1.1",
                "mac_address": "00:11:22:33:44:55",
                "device_type": "router",
                "vendor": "Cisco",
                "model": "ISR4331",
                "status": "online",
                "is_online": True
            },
            {
                "name": "Switch-Core",
                "ip_address": "192.168.1.2", 
                "mac_address": "00:11:22:33:44:56",
                "device_type": "switch",
                "vendor": "Cisco",
                "model": "Catalyst 2960",
                "status": "online",
                "is_online": True
            },
            {
                "name": "Server-Web",
                "ip_address": "192.168.1.10",
                "mac_address": "00:11:22:33:44:57",
                "device_type": "server",
                "vendor": "Dell",
                "model": "PowerEdge R740",
                "os_info": "Ubuntu 22.04 LTS",
                "status": "online",
                "is_online": True
            }
        ]
        
        for device_data in sample_devices:
            device_id = await db.store_network_device(device_data, org_id)
            logger.info(f"✅ Created sample device: {device_data['name']} (ID: {device_id})")
        
        # Create sample security scan
        scan_data = {
            "scan_type": "network_discovery",
            "target": "192.168.1.0/24",
            "status": ScanStatus.COMPLETED,
            "progress": 100,
            "findings_count": 3,
            "vulnerabilities_found": 1,
            "started_at": datetime.now() - timedelta(hours=1),
            "completed_at": datetime.now(),
            "duration_seconds": 3600
        }
        
        scan_id = await db.create_security_scan(scan_data, org_id)
        logger.info(f"✅ Created sample security scan: {scan_id}")
        
        # Create sample security finding
        finding_data = {
            "finding_type": "open_port",
            "severity": ThreatSeverity.MEDIUM,
            "title": "SSH Service Exposed",
            "description": "SSH service is accessible from external networks",
            "port": 22,
            "service": "ssh",
            "protocol": "tcp",
            "status": "open",
            "remediation": "Consider restricting SSH access to specific IP ranges"
        }
        
        finding_id = await db.store_security_finding(finding_data, scan_id)
        logger.info(f"✅ Created sample security finding: {finding_id}")
        
        # Create sample notification
        notification_id = await db.create_notification(
            title="Welcome to SecureNet Enterprise",
            message="Your PostgreSQL migration has been completed successfully. All systems are operational.",
            org_id=org_id,
            category="system",
            severity="info"
        )
        logger.info(f"✅ Created welcome notification: {notification_id}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to create sample data: {e}")
        raise

def update_environment_config():
    """Update .env file to use PostgreSQL"""
    try:
        env_file = Path(".env")
        
        if env_file.exists():
            # Read current .env
            with open(env_file, 'r') as f:
                lines = f.readlines()
            
            # Update DATABASE_URL
            updated_lines = []
            database_url_updated = False
            
            for line in lines:
                if line.startswith("DATABASE_URL="):
                    updated_lines.append("DATABASE_URL=postgresql://securenet:securenet@localhost:5432/securenet\n")
                    database_url_updated = True
                elif line.startswith("MLFLOW_TRACKING_URI=") and "sqlite" in line:
                    updated_lines.append("MLFLOW_TRACKING_URI=postgresql://securenet:securenet@localhost:5432/mlflow\n")
                else:
                    updated_lines.append(line)
            
            # Add DATABASE_URL if not found
            if not database_url_updated:
                updated_lines.append("DATABASE_URL=postgresql://securenet:securenet@localhost:5432/securenet\n")
            
            # Write updated .env
            with open(env_file, 'w') as f:
                f.writelines(updated_lines)
            
            logger.info("✅ Updated .env file with PostgreSQL configuration")
        else:
            # Create new .env file
            env_content = """# SecureNet PostgreSQL Configuration
DATABASE_URL=postgresql://securenet:securenet@localhost:5432/securenet
MLFLOW_TRACKING_URI=postgresql://securenet:securenet@localhost:5432/mlflow
DEV_MODE=false
SECRET_KEY=your-secret-key-here
JWT_SECRET=your-jwt-secret-here
ENCRYPTION_KEY=your-encryption-key-here
"""
            with open(env_file, 'w') as f:
                f.write(env_content)
            
            logger.info("✅ Created .env file with PostgreSQL configuration")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to update environment configuration: {e}")
        return False

async def main():
    """Main migration function"""
    logger.info("🚀 Starting SQLite to PostgreSQL migration")
    logger.info("=" * 60)
    
    try:
        # Step 1: Check PostgreSQL connection
        logger.info("1. Checking PostgreSQL connection...")
        if not await check_postgresql_connection():
            logger.error("❌ Migration failed: Cannot connect to PostgreSQL")
            logger.info("\nPlease ensure PostgreSQL is running and accessible:")
            logger.info("  - Install PostgreSQL: brew install postgresql (macOS)")
            logger.info("  - Start PostgreSQL: brew services start postgresql")
            logger.info("  - Create database: createdb securenet")
            logger.info("  - Create user: createuser -s securenet")
            return False
        
        # Step 2: Run migrations
        logger.info("\n2. Creating database schema...")
        if not await run_migrations():
            logger.error("❌ Migration failed: Schema creation failed")
            return False
        
        # Step 3: Create default organization
        logger.info("\n3. Creating default organization...")
        org_id = await create_default_organization()
        
        # Step 4: Create default users
        logger.info("\n4. Creating default users...")
        await create_default_users(org_id)
        
        # Step 5: Create sample data
        logger.info("\n5. Creating sample data...")
        await create_sample_data(org_id)
        
        # Step 6: Update environment configuration
        logger.info("\n6. Updating environment configuration...")
        update_environment_config()
        
        # Success
        logger.info("\n" + "=" * 60)
        logger.info("✅ PostgreSQL migration completed successfully!")
        logger.info("\nNext steps:")
        logger.info("1. Restart your SecureNet application")
        logger.info("2. Login with default credentials:")
        logger.info("   - Platform Owner: ceo / superadmin123")
        logger.info("   - Security Admin: admin / platform123")
        logger.info("   - SOC Analyst: user / enduser123")
        logger.info("3. Update your production configuration")
        logger.info("\nDatabase URL: postgresql://securenet:securenet@localhost:5432/securenet")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Migration failed with error: {e}")
        return False
    
    finally:
        await db.close()

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1) 