#!/usr/bin/env python3
"""
seed_users.py

Purpose:
- Seed the database with 3 default development users for role-based access testing
- Create sample data for the default organization

Usage:
$ python seed_users.py
"""

import asyncio
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the project root to the path so we can import our modules
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(project_root)

from database.database_factory import db
import logging
from passlib.context import CryptContext

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

async def create_default_users_postgresql(db):
    """Create default users for PostgreSQL database."""
    try:
        # Create default organization first
        org_id = await db.create_organization(
            name="SecureNet Enterprise",
            owner_email="ceo@securenet.ai",
            plan="ENTERPRISE"
        )
        
        # Define default users
        users = [
            {
                "username": "PierreMvita",
                "email": "pierre@securenet.ai",
                "password": "FounderAccess2025!",
                "role": "platform_founder"
            },
            {
                "username": "founder",
                "email": "founder@securenet.ai",
                "password": "SecureNetFounder2025!",
                "role": "platform_founder"
            },
            {
                "username": "ceo",
                "email": "ceo@securenet.ai", 
                "password": "superadmin123",
                "role": "platform_owner"
            },
            {
                "username": "admin",
                "email": "admin@secureorg.com",
                "password": "platform123", 
                "role": "security_admin"
            },
            {
                "username": "user",
                "email": "user@secureorg.com",
                "password": "enduser123",
                "role": "soc_analyst"
            }
        ]
        
        # Create users
        for user_data in users:
            password_hash = pwd_context.hash(user_data["password"])
            
            # Import UserRole enum
            from database.database_postgresql import UserRole
            role_enum = getattr(UserRole, user_data["role"].upper())
            
            await db.create_user(
                username=user_data["username"],
                email=user_data["email"],
                password_hash=password_hash,
                role=role_enum,
                organization_id=org_id
            )
            
        logger.info(f"✅ Created {len(users)} users in organization {org_id}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to create PostgreSQL users: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Seed the database with default users and sample data."""
    try:
        logger.info("Starting user seeding process...")
        
        # Initialize database
        await db.initialize()
        
        # Seed default users (check if method exists)
        if hasattr(db, 'seed_default_users'):
            success = await db.seed_default_users()
        else:
            # Create users manually for PostgreSQL
            success = await create_default_users_postgresql(db)
        
        if success:
            logger.info("✅ Successfully seeded default users:")
            logger.info("   🏆 FOUNDER: pierre@securenet.ai / FounderAccess2025! (Pierre Mvita)")
            logger.info("   🏆 FOUNDER BACKUP: founder@securenet.ai / SecureNetFounder2025!")
            logger.info("   👑 Platform Owner: ceo@securenet.ai / superadmin123")
            logger.info("   🔵 Security Admin: admin@secureorg.com / platform123") 
            logger.info("   🟢 SOC Analyst: user@secureorg.com / enduser123")
            logger.info("")
            logger.info("🚀 Pierre Mvita (Founder) has UNLIMITED ACCESS to everything!")
            logger.info("🚀 You can now login with any of these accounts!")
        else:
            logger.error("❌ Failed to seed default users")
            return 1
            
        return 0
        
    except Exception as e:
        logger.error(f"❌ Error during user seeding: {str(e)}")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code) 