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

# Add the current directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import Database
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    """Seed the database with default users and sample data."""
    try:
        logger.info("Starting user seeding process...")
        
        # Initialize database
        db = Database()
        await db.update_db_schema()
        
        # Seed default users
        success = await db.seed_default_users()
        
        if success:
            logger.info("✅ Successfully seeded default users:")
            logger.info("   👑 Super Admin: ceo@securenet.ai / superadmin123")
            logger.info("   🛠 Platform Admin: admin@secureorg.com / platform123") 
            logger.info("   👤 End User: user@secureorg.com / enduser123")
            logger.info("")
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