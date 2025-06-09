#!/usr/bin/env python3
import sqlite3
import os
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_database():
    """Initialize the database with the initial schema."""
    db_path = Path("data/logs.db")
    schema_path = Path("data/init_schema.sql")
    
    # Create data directory if it doesn't exist
    db_path.parent.mkdir(parents=True, exist_ok=True)
    
    if not schema_path.exists():
        logger.error(f"Schema file not found at {schema_path}")
        return False
    
    try:
        # Read schema file
        with open(schema_path) as f:
            schema_sql = f.read()
        
        # Connect to database (this will create it if it doesn't exist)
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Begin transaction
        cursor.execute("BEGIN TRANSACTION")
        
        try:
            # Split and execute each statement
            for statement in schema_sql.split(';'):
                if statement.strip():
                    cursor.execute(statement)
            
            # Commit transaction
            conn.commit()
            logger.info("Successfully initialized database")
            return True
            
        except sqlite3.Error as e:
            # Rollback on error
            conn.rollback()
            logger.error(f"Error initializing database: {str(e)}")
            return False
            
        finally:
            conn.close()
            
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return False

if __name__ == "__main__":
    success = init_database()
    exit(0 if success else 1) 