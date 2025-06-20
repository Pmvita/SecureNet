#!/usr/bin/env python3
"""
SecureNet Database Factory

Automatically selects the correct database backend based on environment configuration.
- PostgreSQL for production/enterprise (DATABASE_URL starts with postgresql)
- SQLite for development (DATABASE_URL starts with sqlite or not set)
"""

import os
import logging
from typing import Union

logger = logging.getLogger(__name__)

class DatabaseWrapper:
    """Wrapper to provide a consistent interface between PostgreSQL and SQLite databases."""
    
    def __init__(self, db_instance):
        self._db = db_instance
        self._is_postgresql = hasattr(db_instance, 'initialize')
    
    def __getattr__(self, name):
        """Delegate all other attributes to the wrapped database instance."""
        return getattr(self._db, name)
    
    async def initialize(self):
        """Unified initialization method."""
        if self._is_postgresql:
            return await self._db.initialize()
        else:
            return await self._db.initialize_db()
    
    @property
    def is_postgresql(self):
        """Check if this is a PostgreSQL database."""
        return self._is_postgresql
    
    @property
    def is_sqlite(self):
        """Check if this is a SQLite database."""
        return not self._is_postgresql

def get_database() -> DatabaseWrapper:
    """
    Factory function to get the appropriate database instance based on configuration.
    
    Returns:
        DatabaseWrapper: Wrapped database instance with unified interface
    """
    database_url = os.getenv("DATABASE_URL", "")
    
    if database_url.startswith("postgresql"):
        # Use PostgreSQL database
        try:
            from database.database_postgresql import PostgreSQLDatabase
            logger.info("Using PostgreSQL database backend")
            return DatabaseWrapper(PostgreSQLDatabase())
        except ImportError as e:
            logger.error(f"Failed to import PostgreSQL database: {e}")
            logger.warning("Falling back to SQLite database")
            from database.database import Database
            return DatabaseWrapper(Database())
    else:
        # Use SQLite database (default/fallback)
        try:
            from database.database import Database
            logger.info("Using SQLite database backend")
            return DatabaseWrapper(Database())
        except ImportError as e:
            logger.error(f"Failed to import SQLite database: {e}")
            raise ImportError("No database backend available")

# Create a global database instance
db = get_database()

# For backward compatibility, export the Database class
try:
    if os.getenv("DATABASE_URL", "").startswith("postgresql"):
        from database.database_postgresql import PostgreSQLDatabase as Database
    else:
        from database.database import Database
except ImportError:
    from database.database import Database

__all__ = ['db', 'Database', 'get_database', 'DatabaseWrapper'] 