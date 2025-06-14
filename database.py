import json
import uuid
from datetime import datetime, timedelta
import secrets
import sqlite3
import os
import logging
from typing import Optional, List, Dict, Tuple
import asyncio
import random
import time
from enum import Enum

import aiosqlite
from src.security import get_password_hash

# Configure logging for the database module
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Add handler if none exists
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

class PlanType(Enum):
    """Subscription plan types for SaaS billing."""
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"

class OrganizationStatus(Enum):
    """Organization status types."""
    ACTIVE = "active"
    SUSPENDED = "suspended"
    TRIAL = "trial"
    EXPIRED = "expired"

class UserRole(Enum):
    """User role types for 3-tier RBAC system."""
    SUPERADMIN = "superadmin"      # Full platform access, tenant management
    MANAGER = "manager"            # Organization admin with advanced controls (previously platform_admin)
    ANALYST = "analyst"            # Standard tenant user (previously end_user)

class Database:
    _instances = {}  # Process-specific instances
    _initialized = {}  # Process-specific initialization flags

    def __new__(cls, db_path="data/securenet.db"):
        pid = os.getpid()
        if pid not in cls._instances:
            cls._instances[pid] = super(Database, cls).__new__(cls)
            cls._initialized[pid] = False
        return cls._instances[pid]

    def __init__(self, db_path="data/securenet.db"):
        pid = os.getpid()
        if not self._initialized.get(pid, False):
            self.db_path = db_path
            self._ensure_db_directory()
            self._initialized[pid] = True

    def _ensure_db_directory(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)

    def get_db(self):
        return sqlite3.connect(self.db_path)

    async def init_db(self):
        async with aiosqlite.connect(self.db_path) as conn:
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS assets (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    type VARCHAR(50) NOT NULL,
                    status VARCHAR(50) NOT NULL,
                    ip_address VARCHAR(45),
                    mac_address VARCHAR(17),
                    last_seen TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS health_trends (
                    id SERIAL PRIMARY KEY,
                    metric_name VARCHAR(50) NOT NULL,
                    value FLOAT NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS alerts (
                    id SERIAL PRIMARY KEY,
                    type VARCHAR(50) NOT NULL,
                    severity VARCHAR(20) NOT NULL,
                    message TEXT NOT NULL,
                    source VARCHAR(255),
                    status VARCHAR(20) DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    resolved_at TIMESTAMP
                )
            ''')
            await conn.commit()

    async def get_db_async(self):
        return aiosqlite.connect(self.db_path)

    def _init_db(self):
        """Internal method to initialize database."""
        try:
            self._ensure_db_directory()
            self.initialize_db()  # This will call create_tables
            self._initialized[os.getpid()] = True
            logger.info("Database initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing database: {str(e)}")
            raise

    @classmethod
    def cleanup(cls):
        """Clean up process-specific instance."""
        process_id = os.getpid()
        if process_id in cls._instances:
            instance = cls._instances[process_id]
            if hasattr(instance, '_pool') and instance._pool:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.create_task(instance._pool.close())
                else:
                    loop.run_until_complete(instance._pool.close())
            del cls._instances[process_id]
            if process_id in cls._initialized:
                del cls._initialized[process_id]

    # ===== MULTI-TENANT ORGANIZATION MANAGEMENT =====
    
    async def create_organization(self, name: str, owner_email: str, plan: PlanType = PlanType.FREE) -> str:
        """Create a new organization for multi-tenant SaaS."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                org_id = str(uuid.uuid4())
                api_key = f"sk-{secrets.token_urlsafe(32)}"
                
                await conn.execute("""
                    INSERT INTO organizations (
                        id, name, owner_email, status, plan_type, 
                        api_key, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    org_id, name, owner_email, OrganizationStatus.TRIAL.value,
                    plan.value, api_key, datetime.now().isoformat(),
                    datetime.now().isoformat()
                ))
                
                await conn.commit()
                logger.info(f"Created organization: {name} with ID: {org_id}")
                return org_id
        except Exception as e:
            logger.error(f"Error creating organization: {str(e)}")
            raise

    async def get_organization_by_api_key(self, api_key: str) -> Optional[Dict]:
        """Get organization by API key for tenant scoping."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.execute("""
                    SELECT id, name, owner_email, status, plan_type, device_limit,
                           created_at, updated_at
                    FROM organizations 
                    WHERE api_key = ? AND status != 'suspended'
                """, (api_key,))
                
                row = await cursor.fetchone()
                if row:
                    return {
                        'id': row[0],
                        'name': row[1],
                        'owner_email': row[2],
                        'status': row[3],
                        'plan_type': row[4],
                        'device_limit': row[5],
                        'created_at': row[6],
                        'updated_at': row[7]
                    }
                return None
        except Exception as e:
            logger.error(f"Error getting organization by API key: {str(e)}")
            return None

    async def get_organization_usage(self, org_id: str) -> Dict:
        """Get organization usage metrics for billing."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                # Count devices
                cursor = await conn.execute("""
                    SELECT COUNT(*) FROM network_devices WHERE organization_id = ?
                """, (org_id,))
                device_count = (await cursor.fetchone())[0] or 0
                
                # Count scans this month
                start_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                cursor = await conn.execute("""
                    SELECT COUNT(*) FROM security_scans 
                    WHERE organization_id = ? AND created_at >= ?
                """, (org_id, start_of_month.isoformat()))
                scan_count = (await cursor.fetchone())[0] or 0
                
                # Count logs this month
                cursor = await conn.execute("""
                    SELECT COUNT(*) FROM logs 
                    WHERE organization_id = ? AND timestamp >= ?
                """, (org_id, start_of_month.isoformat()))
                log_count = (await cursor.fetchone())[0] or 0
                
                return {
                    'device_count': device_count,
                    'scan_count_this_month': scan_count,
                    'log_count_this_month': log_count,
                    'period': start_of_month.strftime('%Y-%m')
                }
        except Exception as e:
            logger.error(f"Error getting organization usage: {str(e)}")
            return {}

    async def add_user_to_organization(self, org_id: str, user_id: int, role: str = "member") -> bool:
        """Add user to organization with role."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                await conn.execute("""
                    INSERT OR REPLACE INTO org_users (organization_id, user_id, role, created_at)
                    VALUES (?, ?, ?, ?)
                """, (org_id, user_id, role, datetime.now().isoformat()))
                
                await conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error adding user to organization: {str(e)}")
            return False

    async def get_user_organizations(self, user_id: int) -> List[Dict]:
        """Get all organizations for a user."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.execute("""
                    SELECT o.id, o.name, o.status, o.plan_type, ou.role
                    FROM organizations o
                    JOIN org_users ou ON o.id = ou.organization_id
                    WHERE ou.user_id = ?
                """, (user_id,))
                
                rows = await cursor.fetchall()
                return [{
                    'organization_id': row[0],  # changed from 'id' to 'organization_id'
                    'name': row[1],
                    'status': row[2],
                    'plan_type': row[3],
                    'role': row[4]
                } for row in rows]
        except Exception as e:
            logger.error(f"Error getting user organizations: {str(e)}")
            return []

    # ===== ENHANCED LOG SOURCE MANAGEMENT WITH ORG SCOPING =====
    
    def get_log_sources(self, org_id: str = None):
        """Get all configured log sources, optionally scoped to organization."""
        with self.get_db() as db:
            cursor = db.cursor()
            if org_id:
                cursor.execute("""
                    SELECT id, name, type, config, format, format_pattern, status,
                           last_update, logs_per_minute, tags
                    FROM log_sources
                    WHERE organization_id = ? OR organization_id IS NULL
                    ORDER BY name
                """, (org_id,))
            else:
                cursor.execute("""
                    SELECT id, name, type, config, format, format_pattern, status,
                           last_update, logs_per_minute, tags
                    FROM log_sources
                    ORDER BY name
                """)
            sources = []
            for row in cursor.fetchall():
                source = {
                    'id': row[0],
                    'name': row[1],
                    'type': row[2],
                    'config': json.loads(row[3]),
                    'format': row[4],
                    'format_pattern': row[5],
                    'status': row[6],
                    'last_update': row[7],
                    'logs_per_minute': row[8],
                    'tags': json.loads(row[9]) if row[9] else []
                }
                sources.append(source)
            return sources

    def get_log_source(self, source_id, org_id: str = None):
        """Get a specific log source by ID, optionally scoped to organization."""
        with self.get_db() as db:
            cursor = db.cursor()
            if org_id:
                cursor.execute("""
                    SELECT id, name, type, config, format, format_pattern, status,
                           last_update, logs_per_minute, tags
                    FROM log_sources
                    WHERE id = ? AND (organization_id = ? OR organization_id IS NULL)
                """, (source_id, org_id))
            else:
                cursor.execute("""
                    SELECT id, name, type, config, format, format_pattern, status,
                           last_update, logs_per_minute, tags
                    FROM log_sources
                    WHERE id = ?
                """, (source_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return {
                'id': row[0],
                'name': row[1],
                'type': row[2],
                'config': json.loads(row[3]),
                'format': row[4],
                'format_pattern': row[5],
                'status': row[6],
                'last_update': row[7],
                'logs_per_minute': row[8],
                'tags': json.loads(row[9]) if row[9] else []
            }

    def create_log_source(self, source, org_id: str = None):
        """Create a new log source, optionally scoped to organization."""
        with self.get_db() as db:
            cursor = db.cursor()
            source_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO log_sources (
                    id, name, type, config, format, format_pattern,
                    status, last_update, logs_per_minute, tags, organization_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                source_id,
                source['name'],
                source['type'],
                json.dumps(source['config']),
                source['format'],
                source.get('format_pattern'),
                'inactive',
                datetime.utcnow().isoformat(),
                0,
                json.dumps(source.get('tags', [])),
                org_id
            ))
            db.commit()
            return source_id

    def update_log_source(self, source_id, source, org_id: str = None):
        """Update an existing log source, optionally scoped to organization."""
        with self.get_db() as db:
            cursor = db.cursor()
            if org_id:
                cursor.execute("""
                    UPDATE log_sources 
                    SET name = ?, type = ?, config = ?, format = ?, 
                        format_pattern = ?, tags = ?, last_update = ?
                    WHERE id = ? AND (organization_id = ? OR organization_id IS NULL)
                """, (
                    source['name'], source['type'], json.dumps(source['config']),
                    source['format'], source.get('format_pattern'),
                    json.dumps(source.get('tags', [])), datetime.utcnow().isoformat(),
                    source_id, org_id
                ))
            else:
                cursor.execute("""
                    UPDATE log_sources 
                    SET name = ?, type = ?, config = ?, format = ?, 
                        format_pattern = ?, tags = ?, last_update = ?
                    WHERE id = ?
                """, (
                    source['name'], source['type'], json.dumps(source['config']),
                    source['format'], source.get('format_pattern'),
                    json.dumps(source.get('tags', [])), datetime.utcnow().isoformat(),
                    source_id
                ))
            db.commit()

    def _ensure_db_directory(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)

    def get_db(self):
        return sqlite3.connect(self.db_path)

    async def init_db(self):
        async with aiosqlite.connect(self.db_path) as conn:
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS assets (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    type VARCHAR(50) NOT NULL,
                    status VARCHAR(50) NOT NULL,
                    ip_address VARCHAR(45),
                    mac_address VARCHAR(17),
                    last_seen TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS health_trends (
                    id SERIAL PRIMARY KEY,
                    metric_name VARCHAR(50) NOT NULL,
                    value FLOAT NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS alerts (
                    id SERIAL PRIMARY KEY,
                    type VARCHAR(50) NOT NULL,
                    severity VARCHAR(20) NOT NULL,
                    message TEXT NOT NULL,
                    source VARCHAR(255),
                    status VARCHAR(20) DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    resolved_at TIMESTAMP
                )
            ''')
            await conn.commit()

    async def get_db_async(self):
        return aiosqlite.connect(self.db_path)

    def _init_db(self):
        """Internal method to initialize database."""
        try:
            self._ensure_db_directory()
            self.initialize_db()  # This will call create_tables
            self._initialized[os.getpid()] = True
            logger.info("Database initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing database: {str(e)}")
            raise

    @classmethod
    def cleanup(cls):
        """Clean up process-specific instance."""
        process_id = os.getpid()
        if process_id in cls._instances:
            instance = cls._instances[process_id]
            if instance._pool:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.create_task(instance._pool.close())
                else:
                    loop.run_until_complete(instance._pool.close())
            del cls._instances[process_id]
            if process_id in cls._initialized:
                del cls._initialized[process_id]

    # Log Source Management
    def get_log_sources(self):
        """Get all configured log sources."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                SELECT id, name, type, config, format, format_pattern, status,
                       last_update, logs_per_minute, tags
                FROM log_sources
                ORDER BY name
            """)
            sources = []
            for row in cursor.fetchall():
                source = {
                    'id': row[0],
                    'name': row[1],
                    'type': row[2],
                    'config': json.loads(row[3]),
                    'format': row[4],
                    'format_pattern': row[5],
                    'status': row[6],
                    'last_update': row[7],
                    'logs_per_minute': row[8],
                    'tags': json.loads(row[9]) if row[9] else []
                }
                sources.append(source)
            return sources

    def get_log_source(self, source_id):
        """Get a specific log source by ID."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                SELECT id, name, type, config, format, format_pattern, status,
                       last_update, logs_per_minute, tags
                FROM log_sources
                WHERE id = ?
            """, (source_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return {
                'id': row[0],
                'name': row[1],
                'type': row[2],
                'config': json.loads(row[3]),
                'format': row[4],
                'format_pattern': row[5],
                'status': row[6],
                'last_update': row[7],
                'logs_per_minute': row[8],
                'tags': json.loads(row[9]) if row[9] else []
            }

    def create_log_source(self, source):
        """Create a new log source."""
        with self.get_db() as db:
            cursor = db.cursor()
            source_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO log_sources (
                    id, name, type, config, format, format_pattern,
                    status, last_update, logs_per_minute, tags
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                source_id,
                source['name'],
                source['type'],
                json.dumps(source['config']),
                source['format'],
                source.get('format_pattern'),
                'inactive',
                datetime.utcnow().isoformat(),
                0,
                json.dumps(source.get('tags', []))
            ))
            db.commit()
            return source_id

    def update_log_source(self, source_id, source):
        """Update an existing log source."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                UPDATE log_sources
                SET name = ?, type = ?, config = ?, format = ?, format_pattern = ?,
                    tags = ?
                WHERE id = ?
            """, (
                source['name'],
                source['type'],
                json.dumps(source['config']),
                source['format'],
                source.get('format_pattern'),
                json.dumps(source.get('tags', [])),
                source_id
            ))
            db.commit()
            return cursor.rowcount > 0

    def delete_log_source(self, source_id):
        """Delete a log source."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("DELETE FROM log_sources WHERE id = ?", (source_id,))
            db.commit()
            return cursor.rowcount > 0

    def toggle_log_source(self, source_id):
        """Toggle a log source's status between active and inactive."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                UPDATE log_sources
                SET status = CASE WHEN status = 'active' THEN 'inactive' ELSE 'active' END,
                    last_update = ?
                WHERE id = ?
            """, (datetime.utcnow().isoformat(), source_id))
            db.commit()
            return cursor.rowcount > 0

    def update_log_source_stats(self, source_id, logs_count):
        """Update log source statistics."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                UPDATE log_sources
                SET logs_per_minute = ?,
                    last_update = ?
                WHERE id = ?
            """, (logs_count, datetime.utcnow().isoformat(), source_id))
            db.commit()

    # Log Storage
    def store_log(self, log):
        """Store a log entry."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                INSERT INTO logs (
                    id, timestamp, level, source, message,
                    received_at, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                log['id'],
                log['timestamp'],
                log['level'],
                log['source'],
                log['message'],
                log['received_at'],
                json.dumps(log.get('metadata', {}))
            ))
            db.commit()

    def get_logs(self, source_id=None, level=None, start_time=None, end_time=None, limit=1000):
        """Get logs with optional filtering."""
        with self.get_db() as db:
            cursor = db.cursor()
            query = ["SELECT * FROM logs WHERE 1=1"]
            params = []
            
            if source_id:
                query.append("AND source = ?")
                params.append(source_id)
            if level:
                query.append("AND level = ?")
                params.append(level)
            if start_time:
                query.append("AND timestamp >= ?")
                params.append(start_time)
            if end_time:
                query.append("AND timestamp <= ?")
                params.append(end_time)
            
            query.append("ORDER BY timestamp DESC LIMIT ?")
            params.append(limit)
            
            cursor.execute(" ".join(query), params)
            logs = []
            for row in cursor.fetchall():
                log = {
                    'id': row[0],
                    'timestamp': row[1],
                    'level': row[2],
                    'source': row[3],
                    'message': row[4],
                    'received_at': row[5],
                    'metadata': json.loads(row[6]) if row[6] else {}
                }
                logs.append(log)
            return logs

    async def get_log_stats(self, start_time: Optional[str] = None, end_time: Optional[str] = None) -> Dict:
        """Get log statistics."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.cursor()

                # Build query conditions
                conditions = []
                params = []
                if start_time:
                    conditions.append("timestamp >= ?")
                    params.append(start_time)
                if end_time:
                    conditions.append("timestamp <= ?")
                    params.append(end_time)

                where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

                # Get total logs
                await cursor.execute(f"SELECT COUNT(*) FROM logs {where_clause}", params)
                total_logs = (await cursor.fetchone())[0] or 0

                # Get logs by level
                await cursor.execute(f"""
                    SELECT level, COUNT(*) as count 
                    FROM logs {where_clause}
                    GROUP BY level
                """, params)
                logs_by_level = {
                    'debug': 0,
                    'info': 0,
                    'warning': 0,
                    'error': 0,
                    'critical': 0
                }
                for row in await cursor.fetchall():
                    level, count = row
                    logs_by_level[level] = count

                # Get logs by category
                await cursor.execute(f"""
                    SELECT category, COUNT(*) as count 
                    FROM logs {where_clause}
                    GROUP BY category
            """, params)
                logs_by_category = {
                    'security': 0,
                    'network': 0,
                    'system': 0,
                    'application': 0
                }
                for row in await cursor.fetchall():
                    category, count = row
                    logs_by_category[category] = count

                # Get logs by source
                await cursor.execute(f"""
                    SELECT source_id, COUNT(*) as count 
                    FROM logs {where_clause}
                    GROUP BY source_id
            """, params)
                logs_by_source = {}
                for row in await cursor.fetchall():
                    source_id, count = row
                    logs_by_source[source_id] = count

                await cursor.close()
                
                return {
                    'total_logs': total_logs,
                    'logs_by_level': logs_by_level,
                    'logs_by_category': logs_by_category,
                    'logs_by_source': logs_by_source
                }
        except Exception as e:
            logger.error(f"Error getting log stats: {str(e)}")
            return {
                'total_logs': 0,
                'logs_by_level': {
                    'debug': 0,
                    'info': 0,
                    'warning': 0,
                    'error': 0,
                    'critical': 0
                },
                'logs_by_category': {
                    'security': 0,
                    'network': 0,
                    'system': 0,
                    'application': 0
                },
                'logs_by_source': {}
            }

    def get_threats_trend(self, days: int = 7) -> float:
        """Calculate the trend in threats over the specified number of days."""
        try:
            with self.get_db() as db:
                cursor = db.cursor()
                
                # Get current period count
                cursor.execute("""
                    SELECT COUNT(*) FROM scan_findings
                    WHERE timestamp >= datetime('now', ?)
                    AND severity IN ('critical', 'high')
                """, (f'-{days} days',))
                current_count = cursor.fetchone()[0] or 0
                
                # Get previous period count
                cursor.execute("""
                    SELECT COUNT(*) FROM scan_findings
                    WHERE timestamp >= datetime('now', ?)
                    AND timestamp < datetime('now', ?)
                    AND severity IN ('critical', 'high')
                """, (f'-{days*2} days', f'-{days} days'))
                previous_count = cursor.fetchone()[0] or 0
                
                if previous_count == 0:
                    return 0.0
                
                return ((current_count - previous_count) / previous_count) * 100
        except Exception as e:
            logger.error(f"Error calculating threats trend: {str(e)}")
            return 0.0

    async def get_threats_trend_async(self, days: int = 7) -> float:
        """Asynchronous version of get_threats_trend."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.execute("""
                    SELECT COUNT(*) FROM scan_findings
                    WHERE timestamp >= datetime('now', ?)
                    AND severity IN ('critical', 'high')
                """, (f'-{days} days',))
                current_count = (await cursor.fetchone())[0] or 0
                await cursor.close()
                
                cursor = await conn.execute("""
                    SELECT COUNT(*) FROM scan_findings
                    WHERE timestamp >= datetime('now', ?)
                    AND timestamp < datetime('now', ?)
                    AND severity IN ('critical', 'high')
                """, (f'-{days*2} days', f'-{days} days'))
                previous_count = (await cursor.fetchone())[0] or 0
                await cursor.close()
                
                if previous_count == 0:
                    return 0.0
                
                return ((current_count - previous_count) / previous_count) * 100
        except Exception as e:
            logger.error(f"Error calculating threats trend: {str(e)}")
            return 0.0

    def validate_api_key(self, api_key: str) -> bool:
        """Validate the provided API key against stored key."""
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT value FROM settings WHERE key = 'api_key'")
                result = cursor.fetchone()
                if not result:
                    return False
                stored_key = result[0]
                return api_key == stored_key
        except Exception as e:
            logger.error(f"Error validating API key: {str(e)}")
            return False

    def get_network_health(self) -> dict:
        """Get current network health metrics."""
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                
                # Get active devices count
                cursor.execute("""
                    SELECT COUNT(*) FROM network_devices 
                    WHERE status = 'active' 
                    AND last_seen >= datetime('now', '-5 minutes')
                """)
                active_devices = cursor.fetchone()[0] or 0
                
                # Get total devices count
                cursor.execute("SELECT COUNT(*) FROM network_devices")
                total_devices = cursor.fetchone()[0] or 0
                
                # Get active connections
                cursor.execute("""
                    SELECT COUNT(*) FROM network_connections 
                    WHERE status = 'active'
                """)
                active_connections = cursor.fetchone()[0] or 0
                
                # Get blocked connections in last hour
                cursor.execute("""
                    SELECT COUNT(*) FROM network_connections 
                    WHERE status = 'blocked' 
                    AND end_time >= datetime('now', '-1 hour')
                """)
                blocked_connections = cursor.fetchone()[0] or 0
                
                # Calculate health score (0-100)
                if total_devices == 0:
                    health_score = 100  # No devices means perfect health
                else:
                    device_health = (active_devices / total_devices) * 100
                    connection_health = 100 - (blocked_connections / max(active_connections, 1)) * 100
                    health_score = (device_health + connection_health) / 2
                
                return {
                    'score': round(health_score, 1),
                    'active_devices': active_devices,
                    'total_devices': total_devices,
                    'active_connections': active_connections,
                    'blocked_connections': blocked_connections,
                    'status': 'healthy' if health_score >= 80 else 'warning' if health_score >= 50 else 'critical'
                }
        except Exception as e:
            logger.error(f"Error getting network health: {str(e)}")
            return {
                'score': 0,
                'active_devices': 0,
                'total_devices': 0,
                'active_connections': 0,
                'blocked_connections': 0,
                'status': 'unknown'
            }

    def get_network_devices(self) -> dict:
        """Get all network devices and their connections."""
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                
                # Get all devices (order matches table definition)
                cursor.execute("""
                    SELECT id, name, type, ip_address, mac_address, status, last_seen, metadata, created_at, updated_at
                    FROM network_devices
                    ORDER BY name
                """)
                devices = []
                for row in cursor.fetchall():
                    device = {
                        'id': row[0],
                        'name': row[1],
                        'type': row[2],
                        'ip_address': row[3],
                        'mac_address': row[4],
                        'status': row[5],
                        'last_seen': row[6],
                        'metadata': json.loads(row[7]) if row[7] else {},
                        'created_at': row[8],
                        'updated_at': row[9]
                    }
                    devices.append(device)

                # Get all connections
                cursor.execute("""
                    SELECT 
                        nc.id,
                        nc.source_device_id,
                        sd.name as source_device,
                        nc.target_device_id,
                        td.name as target_device,
                        nc.protocol,
                        nc.port,
                        nc.status,
                        nc.last_seen,
                        nc.metadata
                    FROM network_connections nc
                    JOIN network_devices sd ON nc.source_device_id = sd.id
                    JOIN network_devices td ON nc.target_device_id = td.id
                    ORDER BY nc.last_seen DESC
                """)
                connections = []
                for row in cursor.fetchall():
                    connection = {
                        'id': row[0],
                        'source_device_id': row[1],
                        'source_device': row[2],
                        'target_device_id': row[3],
                        'target_device': row[4],
                        'protocol': row[5],
                        'port': row[6],
                        'status': row[7],
                        'last_seen': row[8],
                        'metadata': json.loads(row[9]) if row[9] else {}
                    }
                    connections.append(connection)

                # Get traffic data for the last hour
                cursor.execute("""
                    SELECT 
                        timestamp,
                        SUM(bytes_sent) as bytes_out,
                        SUM(bytes_received) as bytes_in,
                        COUNT(*) as packet_count
                    FROM network_traffic
                    WHERE timestamp >= datetime('now', '-1 hour')
                    GROUP BY strftime('%Y-%m-%d %H:%M', timestamp)
                    ORDER BY timestamp DESC
                    LIMIT 60
                """)
                traffic = []
                for row in cursor.fetchall():
                    traffic.append({
                        'timestamp': row[0],
                        'bytes_out': row[1] or 0,
                        'bytes_in': row[2] or 0,
                        'packet_count': row[3] or 0
                    })

                # Get protocol distribution
                cursor.execute("""
                    SELECT protocol, COUNT(*) as count
                    FROM network_connections
                    WHERE status = 'active'
                    GROUP BY protocol
                """)
                protocols = []
                for row in cursor.fetchall():
                    protocols.append({
                        'name': row[0],
                        'count': row[1]
                    })

                # Calculate stats
                stats = {
                    'total_devices': len(devices),
                    'active_devices': sum(1 for d in devices if d['status'] == 'active'),
                    'average_latency': 0,  # This would need to be calculated from metrics
                    'total_traffic': sum(t['bytes_out'] + t['bytes_in'] for t in traffic)
                }

                return {
                    'devices': devices,
                    'connections': connections,
                    'traffic': traffic,
                    'protocols': protocols,
                    'stats': stats
                }
        except Exception as e:
            logger.error(f"Error getting network data: {str(e)}")
            return {
                'devices': [],
                'connections': [],
                'traffic': [],
                'protocols': [],
                'stats': {
                    'total_devices': 0,
                    'active_devices': 0,
                    'average_latency': 0,
                    'total_traffic': 0
                }
            }

    def update_scan(self, scan_id: str, scan_data: dict):
        """Update scan details in the database."""
        try:
            with self.get_db() as db:
                cursor = db.cursor()
                cursor.execute("""
                    UPDATE scans
                    SET type = ?, target = ?, status = ?, started_at = ?, config = ?
                    WHERE id = ?
                """, (
                    scan_data["type"],
                    scan_data["target"],
                    scan_data["status"],
                    scan_data["started_at"],
                    json.dumps(scan_data["config"]),
                    scan_id
                ))
                db.commit()
                return True
        except Exception as e:
            logger.error(f"Error updating scan: {str(e)}")
            return False

    def get_report(self, report_id: str) -> Optional[dict]:
        """Get report details from the database."""
        try:
            with self.get_db() as db:
                cursor = db.cursor()
                cursor.execute("""
                    SELECT id, type, format, time_range, status, created_at, url
                    FROM reports
                    WHERE id = ?
                """, (report_id,))
                row = cursor.fetchone()
                if row:
                    return {
                        "id": row[0],
                        "type": row[1],
                        "format": row[2],
                        "time_range": row[3],
                        "status": row[4],
                        "created_at": row[5],
                        "url": row[6]
                    }
                return None
        except Exception as e:
            logger.error(f"Error getting report: {str(e)}")
            return None

    def get_maintenance_schedules(self) -> List[dict]:
        """Get all scheduled maintenance windows."""
        try:
            with self.get_db() as db:
                cursor = db.cursor()
                cursor.execute("""
                    SELECT id, start_time, end_time, type, description, status
                    FROM maintenance
                    WHERE status = 'scheduled'
                    ORDER BY start_time ASC
                """)
                rows = cursor.fetchall()
                return [{
                    "id": row[0],
                    "start_time": row[1],
                    "end_time": row[2],
                    "type": row[3],
                    "description": row[4],
                    "status": row[5]
                } for row in rows]
        except Exception as e:
            logger.error(f"Error getting maintenance schedules: {str(e)}")
            return []

    def cancel_maintenance(self, maintenance_id: str) -> bool:
        """Cancel a scheduled maintenance window."""
        try:
            with self.get_db() as db:
                cursor = db.cursor()
                cursor.execute("""
                    UPDATE maintenance
                    SET status = 'cancelled'
                    WHERE id = ? AND status = 'scheduled'
                """, (maintenance_id,))
                db.commit()
                return cursor.rowcount > 0
        except Exception as e:
            logger.error(f"Error cancelling maintenance: {str(e)}")
            return False

    def create_tables(self):
        """Create all necessary database tables with multi-tenant support."""
        try:
            with self.get_db() as db:
                cursor = db.cursor()

                # Create organizations table for multi-tenancy
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS organizations (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        owner_email TEXT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'trial',
                        plan_type TEXT NOT NULL DEFAULT 'free',
                        device_limit INTEGER DEFAULT 10,
                        api_key TEXT UNIQUE NOT NULL,
                        trial_ends_at TEXT,
                        billing_email TEXT,
                        stripe_customer_id TEXT,
                        stripe_subscription_id TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                """)

                # Create org_users table for organization membership
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS org_users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        organization_id TEXT NOT NULL,
                        user_id INTEGER NOT NULL,
                        role TEXT NOT NULL DEFAULT 'member',
                        created_at TEXT NOT NULL,
                        FOREIGN KEY (organization_id) REFERENCES organizations(id),
                        FOREIGN KEY (user_id) REFERENCES users(id),
                        UNIQUE(organization_id, user_id)
                    )
                """)

                # Create billing_usage table for usage tracking
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS billing_usage (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        organization_id TEXT NOT NULL,
                        month TEXT NOT NULL,
                        device_count INTEGER DEFAULT 0,
                        scan_count INTEGER DEFAULT 0,
                        log_count INTEGER DEFAULT 0,
                        api_requests INTEGER DEFAULT 0,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        FOREIGN KEY (organization_id) REFERENCES organizations(id),
                        UNIQUE(organization_id, month)
                    )
                """)

                # Create log_sources table with organization scoping
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS log_sources (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL,
                        status TEXT NOT NULL,
                        config TEXT,
                        format TEXT,
                        format_pattern TEXT,
                        last_seen TEXT,
                        last_update TEXT,
                        logs_count INTEGER DEFAULT 0,
                        logs_per_minute INTEGER DEFAULT 0,
                        tags TEXT,
                        organization_id TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        FOREIGN KEY (organization_id) REFERENCES organizations(id)
                    )
                """)

                # Create logs table with organization scoping
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS logs (
                        id TEXT PRIMARY KEY,
                        source_id TEXT NOT NULL,
                        level TEXT NOT NULL,
                        message TEXT NOT NULL,
                        timestamp TEXT NOT NULL,
                        category TEXT DEFAULT 'system',
                        source TEXT DEFAULT 'system',
                        metadata TEXT,
                        organization_id TEXT,
                        FOREIGN KEY (source_id) REFERENCES log_sources(id),
                        FOREIGN KEY (organization_id) REFERENCES organizations(id)
                    )
                """)

                # Create network_devices table with organization scoping
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS network_devices (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL,
                        ip_address TEXT NOT NULL,
                        mac_address TEXT,
                        status TEXT NOT NULL,
                        last_seen TEXT,
                        metadata TEXT,
                        organization_id TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        FOREIGN KEY (organization_id) REFERENCES organizations(id)
                    )
                """)

                # Create network_connections table with organization scoping
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS network_connections (
                        id TEXT PRIMARY KEY,
                        source_device_id TEXT NOT NULL,
                        target_device_id TEXT NOT NULL,
                        status TEXT NOT NULL,
                        protocol TEXT,
                        port INTEGER,
                        last_seen TEXT,
                        metadata TEXT,
                        organization_id TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        FOREIGN KEY (source_device_id) REFERENCES network_devices(id),
                        FOREIGN KEY (target_device_id) REFERENCES network_devices(id),
                        FOREIGN KEY (organization_id) REFERENCES organizations(id)
                    )
                """)

                # Create network_traffic table with organization scoping
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS network_traffic (
                        id TEXT PRIMARY KEY,
                        source_device_id TEXT NOT NULL,
                        target_device_id TEXT NOT NULL,
                        protocol TEXT NOT NULL,
                        bytes_sent INTEGER DEFAULT 0,
                        bytes_received INTEGER DEFAULT 0,
                        timestamp TEXT NOT NULL,
                        metadata TEXT,
                        organization_id TEXT,
                        FOREIGN KEY (source_device_id) REFERENCES network_devices(id),
                        FOREIGN KEY (target_device_id) REFERENCES network_devices(id),
                        FOREIGN KEY (organization_id) REFERENCES organizations(id)
                    )
                """)

                # Create anomalies table with organization scoping
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS anomalies (
                        id TEXT PRIMARY KEY,
                        timestamp TEXT NOT NULL,
                        type TEXT NOT NULL,
                        severity TEXT NOT NULL,
                        status TEXT NOT NULL,
                        source TEXT NOT NULL,
                        description TEXT NOT NULL,
                        evidence TEXT,
                        resolution TEXT,
                        metadata TEXT,
                        organization_id TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        FOREIGN KEY (organization_id) REFERENCES organizations(id)
                    )
                """)

                # Create indexes
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_source_id ON logs(source_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_network_devices_status ON network_devices(status)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_network_devices_last_seen ON network_devices(last_seen)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_network_connections_status ON network_connections(status)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_network_traffic_timestamp ON network_traffic(timestamp)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_anomalies_timestamp ON anomalies(timestamp)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON anomalies(severity)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_anomalies_status ON anomalies(status)")

                # Create network_metrics table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS network_metrics (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        source_device_id TEXT NOT NULL,
                        target_device_id TEXT NOT NULL,
                        metric_type TEXT NOT NULL,
                        value REAL NOT NULL,
                        timestamp TEXT NOT NULL,
                        metadata TEXT,
                        created_at TEXT NOT NULL,
                        FOREIGN KEY (source_device_id) REFERENCES network_devices(id),
                        FOREIGN KEY (target_device_id) REFERENCES network_devices(id)
                    )
                """)

                # Create security_scans table with organization scoping
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS security_scans (
                        id TEXT PRIMARY KEY,
                        timestamp TEXT NOT NULL,
                        type TEXT NOT NULL,
                        status TEXT NOT NULL,
                        target TEXT NOT NULL,
                        progress REAL DEFAULT 0,
                        findings_count INTEGER DEFAULT 0,
                        start_time TEXT NOT NULL,
                        end_time TEXT,
                        metadata TEXT,
                        organization_id TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        FOREIGN KEY (organization_id) REFERENCES organizations(id)
                    )
                """)

                # Create security_findings table with organization scoping
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS security_findings (
                        id TEXT PRIMARY KEY,
                        scan_id TEXT NOT NULL,
                        type TEXT NOT NULL,
                        severity TEXT NOT NULL,
                        description TEXT NOT NULL,
                        details TEXT,
                        timestamp TEXT NOT NULL,
                        status TEXT NOT NULL,
                        remediation TEXT,
                        organization_id TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        FOREIGN KEY (scan_id) REFERENCES security_scans(id),
                        FOREIGN KEY (organization_id) REFERENCES organizations(id)
                    )
                """)

                # Create ML models table for AI/ML pipeline
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS ml_models (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL,
                        version TEXT NOT NULL,
                        file_path TEXT NOT NULL,
                        organization_id TEXT,
                        training_data_path TEXT,
                        accuracy REAL,
                        status TEXT NOT NULL DEFAULT 'trained',
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        FOREIGN KEY (organization_id) REFERENCES organizations(id)
                    )
                """)

                # Create ML training sessions table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS ml_training_sessions (
                        id TEXT PRIMARY KEY,
                        model_id TEXT NOT NULL,
                        data_size INTEGER NOT NULL,
                        accuracy REAL,
                        training_time REAL,
                        status TEXT NOT NULL,
                        organization_id TEXT,
                        created_at TEXT NOT NULL,
                        completed_at TEXT,
                        FOREIGN KEY (model_id) REFERENCES ml_models(id),
                        FOREIGN KEY (organization_id) REFERENCES organizations(id)
                    )
                """)

                # Create notifications table with organization scoping
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS notifications (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        title TEXT NOT NULL,
                        message TEXT NOT NULL,
                        category TEXT NOT NULL DEFAULT 'system',
                        severity TEXT NOT NULL DEFAULT 'info',
                        read BOOLEAN NOT NULL DEFAULT 0,
                        organization_id TEXT,
                        user_id INTEGER,
                        metadata TEXT,
                        created_at TEXT NOT NULL,
                        FOREIGN KEY (organization_id) REFERENCES organizations(id),
                        FOREIGN KEY (user_id) REFERENCES users(id)
                    )
                """)

                # Create CVE data tables with organization scoping
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS cve_data (
                        cve_id TEXT PRIMARY KEY,
                        description TEXT,
                        cvss_v3_score REAL,
                        cvss_v3_severity TEXT,
                        cvss_v3_vector TEXT,
                        published_date TEXT,
                        last_modified TEXT,
                        cwe_ids TEXT,
                        affected_products TEXT,
                        reference_urls TEXT,
                        exploitability_score REAL,
                        impact_score REAL,
                        is_kev BOOLEAN DEFAULT 0,
                        created_at TEXT NOT NULL
                    )
                """)

                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS device_vulnerabilities (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        device_ip TEXT NOT NULL,
                        device_name TEXT,
                        device_type TEXT,
                        cve_id TEXT NOT NULL,
                        severity TEXT NOT NULL,
                        score REAL,
                        risk_level TEXT,
                        remediation_priority INTEGER,
                        affected_services TEXT,
                        detection_confidence REAL,
                        organization_id TEXT,
                        created_at TEXT NOT NULL,
                        FOREIGN KEY (cve_id) REFERENCES cve_data(cve_id),
                        FOREIGN KEY (organization_id) REFERENCES organizations(id)
                    )
                """)

                # Create comprehensive indexes for multi-tenant queries
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_organizations_api_key ON organizations(api_key)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_org_users_org_id ON org_users(organization_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_org_users_user_id ON org_users(user_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_billing_usage_org_month ON billing_usage(organization_id, month)")
                
                # Existing indexes with organization scoping
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_org_timestamp ON logs(organization_id, timestamp)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_source_id ON logs(source_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_network_devices_org_status ON network_devices(organization_id, status)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_network_devices_last_seen ON network_devices(last_seen)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_network_connections_org_status ON network_connections(organization_id, status)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_network_traffic_org_timestamp ON network_traffic(organization_id, timestamp)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_anomalies_org_timestamp ON anomalies(organization_id, timestamp)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON anomalies(severity)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_anomalies_status ON anomalies(status)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_security_scans_org_status ON security_scans(organization_id, status)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_security_scans_timestamp ON security_scans(timestamp)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_security_findings_org_scan ON security_findings(organization_id, scan_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_security_findings_severity ON security_findings(severity)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_security_findings_status ON security_findings(status)")
                
                # ML and notification indexes
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_ml_models_org_type ON ml_models(organization_id, type)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_ml_training_org_model ON ml_training_sessions(organization_id, model_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_notifications_org_read ON notifications(organization_id, read)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_device_vulnerabilities_org_severity ON device_vulnerabilities(organization_id, severity)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_cve_data_severity ON cve_data(cvss_v3_severity)")

            db.commit()
            logger.info("Multi-tenant database schema initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing database schema: {str(e)}")
            raise

    async def get_health_trend(self, metric_name: str, hours: int = 24) -> List[Dict]:
        """Get health trend data for a specific metric"""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                # Create health_trends table if it doesn't exist
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS health_trends (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        metric_name TEXT NOT NULL,
                        value REAL NOT NULL,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Get trend data
                cursor = await conn.execute("""
                    SELECT value, timestamp 
                    FROM health_trends 
                    WHERE metric_name = ? 
                    AND timestamp >= datetime('now', ? || ' hours')
                    ORDER BY timestamp ASC
                """, (metric_name, -hours))
                
                rows = await cursor.fetchall()
                await cursor.close()
                
                # Convert rows to list of dicts
                return [{
                    'value': row[0],
                    'timestamp': row[1]
                } for row in rows]
        except Exception as e:
            logger.error(f"Error getting health trend: {str(e)}")
            return []

    async def get_security_metrics(self) -> Dict:
        """Get security metrics including real network data analysis"""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                conn.row_factory = aiosqlite.Row  # Enable dictionary-style access
                
                # Get active scans
                cursor = await conn.execute("""
                    SELECT COUNT(*) as count
                    FROM security_scans
                    WHERE status = 'running'
                """)
                active_scans = (await cursor.fetchone())['count'] or 0
                await cursor.close()
                
                # Get total findings
                cursor = await conn.execute("SELECT COUNT(*) as count FROM security_findings")
                total_findings = (await cursor.fetchone())['count'] or 0
                await cursor.close()
                
                # Get critical findings
                cursor = await conn.execute("""
                    SELECT COUNT(*) as count
                    FROM security_findings
                    WHERE severity = 'critical'
                """)
                critical_findings = (await cursor.fetchone())['count'] or 0
                await cursor.close()
                
                # Get real network devices for security analysis
                devices = await self.get_network_devices()
                open_ports_count = 0
                router_count = 0
                active_devices = 0
                
                for device in devices:
                    if device.get('device_type') == 'Router':
                        router_count += 1
                    if device.get('status') == 'online':
                        active_devices += 1
                    open_ports = device.get('open_ports', [])
                    if open_ports:
                        open_ports_count += len(open_ports)
                
                # Calculate security score based on real network data
                cursor = await conn.execute("""
                    SELECT 
                        CASE 
                            WHEN COUNT(*) = 0 THEN 100
                            ELSE 100 - (
                                (COUNT(CASE WHEN severity = 'critical' THEN 1 END) * 15) +
                                (COUNT(CASE WHEN severity = 'high' THEN 1 END) * 8) +
                                (COUNT(CASE WHEN severity = 'medium' THEN 1 END) * 3) +
                                (COUNT(CASE WHEN severity = 'low' THEN 1 END) * 1)
                            )
                        END as base_score
                    FROM security_findings
                    WHERE status = 'active'
                """)
                base_score = (await cursor.fetchone())['base_score'] or 100
                await cursor.close()
                
                # Adjust score based on real network security factors
                security_score = base_score
                
                # Deduct points for excessive open ports
                if open_ports_count > 10:
                    security_score -= (open_ports_count - 10) * 2
                
                # Add points for having routers (good network structure)
                if router_count > 0:
                    security_score += 5
                
                # Deduct points if no devices are active
                if len(devices) > 0 and active_devices == 0:
                    security_score -= 20
                
                security_score = max(0, min(100, security_score))
                
                # Get last scan info
                cursor = await conn.execute("""
                    SELECT id, status, start_time
                    FROM security_scans
                    ORDER BY start_time DESC
                    LIMIT 1
                """)
                last_scan_row = await cursor.fetchone()
                last_scan = None
                scan_status = 'idle'
                if last_scan_row:
                    last_scan = {
                        'id': last_scan_row['id'],
                        'status': last_scan_row['status'],
                        'start_time': last_scan_row['start_time']
                    }
                    scan_status = last_scan_row['status']
                await cursor.close()
                
                return {
                    'active_scans': active_scans,
                    'total_findings': total_findings,
                    'critical_findings': critical_findings,
                    'security_score': int(security_score),
                    'last_scan': last_scan,
                    'scan_status': scan_status,
                    'open_ports_detected': open_ports_count,
                    'network_devices': len(devices),
                    'active_devices': active_devices,
                    'routers_detected': router_count
                }
        except Exception as e:
            logger.error(f"Error getting security metrics: {str(e)}")
            return {
                'active_scans': 0,
                'total_findings': 0,
                'critical_findings': 0,
                'security_score': 85,
                'last_scan': None,
                'scan_status': 'idle',
                'open_ports_detected': 0,
                'network_devices': 0,
                'active_devices': 0,
                'routers_detected': 0
            }

    async def get_recent_alerts(self, limit: int = 50) -> List[Dict]:
        """Get recent alerts"""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                query = '''
                    SELECT id, type, severity, message, source, status, created_at, resolved_at
                    FROM alerts
                    ORDER BY created_at DESC
                    LIMIT $1
                '''
                rows = await conn.execute(query, limit)
                await conn.commit()
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting recent alerts: {str(e)}")
            return []

    def _calculate_security_score(self, asset_counts: Dict, alert_counts: Dict) -> int:
        """Calculate overall security score based on assets and alerts"""
        # Base score starts at 100
        score = 100
        
        # Deduct points for inactive assets
        inactive_assets = asset_counts.get('inactive', 0)
        score -= inactive_assets * 5
        
        # Deduct points for alerts based on severity
        severity_weights = {
            'critical': 10,
            'high': 5,
            'medium': 3,
            'low': 1
        }
        
        for severity, count in alert_counts.items():
            score -= count * severity_weights.get(severity, 0)
        
        # Ensure score stays within 0-100 range
        return max(0, min(100, score)) 

    def get_protected_assets(self) -> dict:
        """Get count of protected network devices."""
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                
                # Get total devices
                cursor.execute("SELECT COUNT(*) FROM network_devices")
                total_devices = cursor.fetchone()[0] or 0
                
                # Get protected devices (those with active security measures)
                cursor.execute("""
                    SELECT COUNT(*) FROM network_devices 
                    WHERE status = 'active' 
                    AND last_seen >= datetime('now', '-5 minutes')
                """)
                protected_devices = cursor.fetchone()[0] or 0
                
                return {
                    'total': total_devices,
                    'protected': protected_devices,
                    'unprotected': total_devices - protected_devices
                }
        except Exception as e:
            logger.error(f"Error getting protected assets: {str(e)}")
            return {
                'total': 0,
                'protected': 0,
                'unprotected': 0
            }

    def get_assets_status(self) -> dict:
        """Get status distribution of network assets."""
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT status, COUNT(*) as count
                    FROM network_devices
                    GROUP BY status
                """)
                status_counts = {row[0]: row[1] for row in cursor.fetchall()}
                
                return {
                    'active': status_counts.get('active', 0),
                    'inactive': status_counts.get('inactive', 0),
                    'maintenance': status_counts.get('maintenance', 0),
                    'blocked': status_counts.get('blocked', 0)
                }
        except Exception as e:
            logger.error(f"Error getting assets status: {str(e)}")
            return {
                'active': 0,
                'inactive': 0,
                'maintenance': 0,
                'blocked': 0
            }

    async def get_active_scans_async(self) -> List[Dict]:
        """Get all active security scans asynchronously."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.execute("""
                    SELECT id, type, target, status, progress, findings_count,
                           start_time, metadata
                    FROM scans
                    WHERE status = 'running'
                    ORDER BY start_time DESC
                """)
                rows = await cursor.fetchall()
                await cursor.close()
                
                scans = []
                for row in rows:
                    scan = {
                        'id': row[0],
                        'type': row[1],
                        'target': row[2],
                        'status': row[3],
                        'progress': row[4],
                        'findings_count': row[5],
                        'start_time': row[6],
                        'metadata': json.loads(row[7]) if row[7] else {}
                    }
                    scans.append(scan)
                return scans
        except Exception as e:
            logger.error(f"Error getting active scans: {str(e)}")
            return []

    async def get_recent_findings_async(self, limit: int = 50) -> List[Dict]:
        """Get recent security findings asynchronously."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                conn.row_factory = aiosqlite.Row  # Enable dictionary-style access
                cursor = await conn.execute("""
                    SELECT f.id, f.scan_id, f.timestamp, f.type, f.severity,
                           f.description, f.details, f.status, f.remediation,
                           s.type as scan_type, s.target as scan_target
                    FROM security_findings f
                    JOIN security_scans s ON f.scan_id = s.id
                    ORDER BY f.timestamp DESC
                    LIMIT ?
                """, (limit,))
                rows = await cursor.fetchall()
                await cursor.close()
                
                findings = []
                for row in rows:
                    finding = {
                        'id': row['id'],
                        'scan_id': row['scan_id'],
                        'timestamp': row['timestamp'],
                        'type': row['type'],
                        'severity': row['severity'],
                        'description': row['description'],
                        'details': json.loads(row['details']) if row['details'] else {},
                        'status': row['status'],
                        'remediation': row['remediation'],
                        'scan_type': row['scan_type'],
                        'scan_target': row['scan_target']
                    }
                    findings.append(finding)
                return findings
        except Exception as e:
            logger.error(f"Error getting recent findings: {str(e)}")
            return []

    async def get_scan_statistics_async(self) -> Dict:
        """Get scan statistics asynchronously."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                # Get total scans
                cursor = await conn.execute("SELECT COUNT(*) FROM scans")
                total_scans = (await cursor.fetchone())[0] or 0
                await cursor.close()
                
                # Get scans by status
                cursor = await conn.execute("""
                    SELECT status, COUNT(*) as count
                    FROM scans
                    GROUP BY status
                """)
                status_counts = {row[0]: row[1] for row in await cursor.fetchall()}
                await cursor.close()
                
                # Get scans by type
                cursor = await conn.execute("""
                    SELECT type, COUNT(*) as count
                    FROM scans
                    GROUP BY type
                """)
                type_counts = {row[0]: row[1] for row in await cursor.fetchall()}
                await cursor.close()
                
                # Get findings by severity
                cursor = await conn.execute("""
                    SELECT severity, COUNT(*) as count
                    FROM scan_findings
                    GROUP BY severity
                """)
                severity_counts = {row[0]: row[1] for row in await cursor.fetchall()}
                await cursor.close()
                
                return {
                    'total_scans': total_scans,
                    'status_distribution': status_counts,
                    'type_distribution': type_counts,
                    'severity_distribution': severity_counts
                }
        except Exception as e:
            logger.error(f"Error getting scan statistics: {str(e)}")
            return {
                'total_scans': 0,
                'status_distribution': {},
                'type_distribution': {},
                'severity_distribution': {}
            }

    def _migrate_logs_table(self):
        """Migrate logs table to new schema if needed."""
        try:
            with self.get_db() as db:
                cursor = db.cursor()
                
                # Check if we need to migrate
                cursor.execute("PRAGMA table_info(logs)")
                columns = {row[1]: row for row in cursor.fetchall()}
                
                if 'source_id' not in columns or 'category' not in columns:
                    logger.info("Migrating logs table to new schema...")
                    
                    # Create temporary table with new schema
                    cursor.execute("""
                        CREATE TABLE logs_new (
                            id TEXT PRIMARY KEY,
                            source_id TEXT NOT NULL,
                            level TEXT NOT NULL,
                            message TEXT NOT NULL,
                            timestamp TEXT NOT NULL,
                            category TEXT DEFAULT 'system',
                            metadata TEXT,
                            FOREIGN KEY (source_id) REFERENCES log_sources(id)
                        )
                    """)
                    
                    # Create a default log source if none exists
                    cursor.execute("SELECT COUNT(*) FROM log_sources")
                    if cursor.fetchone()[0] == 0:
                        default_source_id = str(uuid.uuid4())
                        cursor.execute("""
                            INSERT INTO log_sources (
                                id, name, type, status, created_at
                            ) VALUES (?, ?, ?, ?, ?)
                        """, (
                            default_source_id,
                            'Legacy Logs',
                            'system',
                            'active',
                            datetime.utcnow().isoformat()
                        ))
                    else:
                        cursor.execute("SELECT id FROM log_sources LIMIT 1")
                        default_source_id = cursor.fetchone()[0]
                    
                    # Check if source column exists
                    has_source_column = 'source' in columns
                    
                    # Copy data to new table with conditional source handling
                    if has_source_column:
                        cursor.execute("""
                            INSERT INTO logs_new (
                                id, source_id, level, message, timestamp, category, metadata
                            )
                            SELECT 
                                COALESCE(id, hex(randomblob(16))),
                                ?,
                                level,
                                message,
                                COALESCE(timestamp, datetime('now')),
                                CASE 
                                    WHEN level IN ('error', 'critical') THEN 'security'
                                    WHEN source LIKE '%network%' THEN 'network'
                                    WHEN source LIKE '%app%' THEN 'application'
                                    ELSE 'system'
                                END,
                                json_object(
                                    'received_at', received_at,
                                    'acknowledged', acknowledged,
                                    'acknowledged_at', acknowledged_at,
                                    'processed_at', processed_at,
                                    'detection_run_at', detection_run_at,
                                    'alert_sent_at', alert_sent_at,
                                    'original_source', source
                                )
                            FROM logs
                        """, (default_source_id,))
                    else:
                        cursor.execute("""
                            INSERT INTO logs_new (
                                id, source_id, level, message, timestamp, category, metadata
                            )
                            SELECT 
                                COALESCE(id, hex(randomblob(16))),
                                ?,
                                level,
                                message,
                                COALESCE(timestamp, datetime('now')),
                                CASE 
                                    WHEN level IN ('error', 'critical') THEN 'security'
                                    ELSE 'system'
                                END,
                                json_object(
                                    'received_at', received_at,
                                    'acknowledged', acknowledged,
                                    'acknowledged_at', acknowledged_at,
                                    'processed_at', processed_at,
                                    'detection_run_at', detection_run_at,
                                    'alert_sent_at', alert_sent_at
                                )
                            FROM logs
                        """, (default_source_id,))
                    
                    # Drop old table and rename new one
                    cursor.execute("DROP TABLE logs")
                    cursor.execute("ALTER TABLE logs_new RENAME TO logs")
                    
                    # Create new indexes
                    cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)")
                    cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level)")
                    cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_source_id ON logs(source_id)")
                    cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_category ON logs(category)")
                    
                    db.commit()
                    logger.info("Logs table migration completed successfully")
                else:
                    logger.info("Logs table already has new schema")
        except Exception as e:
            logger.error(f"Error migrating logs table: {str(e)}")
            raise

    def create_default_admin(self):
        """Create default admin user if no users exist."""
        try:
            with self.get_db() as db:
                cursor = db.cursor()
                # Check if any users exist
                cursor.execute("SELECT COUNT(*) FROM users")
                if cursor.fetchone()[0] == 0:
                    # Create default admin user
                    cursor.execute("""
                        INSERT INTO users (
                            username, password_hash, email, role, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    """, (
                        'admin',
                        get_password_hash('admin123'),
                        'admin@securenet.local',
                        'admin',
                        datetime.utcnow().isoformat(),
                        datetime.utcnow().isoformat()
                    ))
                    db.commit()
                    logger.info("Default admin user created successfully")
        except Exception as e:
            logger.error(f"Error creating default admin user: {str(e)}")
            raise

    async def initialize_db(self):
        """Initialize the database and create default users with proper roles."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.cursor()
                # Ensure schema is up to date before any queries
                await self.update_db_schema()

                # Seed the 3 default development users
                await self.seed_default_users()

                # Update schema (skip sample data for real network monitoring)
                await self.update_db_schema()
                # await self.insert_sample_data()  # Disabled for real network scanning
                logger.info("Database initialized successfully - ready for real network scanning")
        except Exception as e:
            logger.error(f"Error initializing database: {str(e)}")
            raise

    def get_user_by_username(self, username: str) -> Optional[dict]:
        """Get a user by username."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                SELECT id, username, password_hash, email, role, api_key, last_login, created_at, updated_at
                FROM users
                WHERE username = ?
            """, (username,))
            row = cursor.fetchone()
            if not row:
                return None
            return {
                "id": row[0],
                "username": row[1],
                "password_hash": row[2],
                "email": row[3],
                "role": row[4],
                "api_key": row[5],
                "last_login": row[6],
                "created_at": row[7],
                "updated_at": row[8],
            }

    async def get_anomalies(self, page: int = 1, page_size: int = 20, filters: dict = None) -> List[Dict]:
        """Get anomalies with pagination and filtering."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                conn.row_factory = aiosqlite.Row
                cursor = await conn.cursor()

                # Build query conditions
                conditions = []
                params = []
                if filters:
                    if filters.get('status'):
                        conditions.append("status = ?")
                        params.append(filters['status'])
                    if filters.get('severity'):
                        conditions.append("severity = ?")
                        params.append(filters['severity'])
                    if filters.get('type'):
                        conditions.append("type = ?")
                        params.append(filters['type'])
                    if filters.get('start_date'):
                        conditions.append("timestamp >= ?")
                        params.append(filters['start_date'])
                    if filters.get('end_date'):
                        conditions.append("timestamp <= ?")
                        params.append(filters['end_date'])

                # Build the query
                query = ["SELECT * FROM anomalies"]
                if conditions:
                    query.append("WHERE " + " AND ".join(conditions))
                query.append("ORDER BY timestamp DESC")
                query.append("LIMIT ? OFFSET ?")
                params.extend([page_size, (page - 1) * page_size])

                # Execute query
                await cursor.execute(" ".join(query), params)
                rows = await cursor.fetchall()
                await cursor.close()

                # Convert rows to dictionaries
                anomalies = []
                for row in rows:
                    anomaly = dict(row)
                    if anomaly.get('metadata'):
                        anomaly['metadata'] = json.loads(anomaly['metadata'])
                    anomalies.append(anomaly)

                return anomalies
        except Exception as e:
            logger.error(f"Error getting anomalies: {str(e)}")
            return []

    async def get_anomalies_count(self, filters: dict = None) -> int:
        """Get total count of anomalies with optional filtering."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.cursor()

                # Build query conditions
                conditions = []
                params = []
                if filters:
                    if filters.get('status'):
                        conditions.append("status = ?")
                        params.append(filters['status'])
                    if filters.get('severity'):
                        conditions.append("severity = ?")
                        params.append(filters['severity'])
                    if filters.get('type'):
                        conditions.append("type = ?")
                        params.append(filters['type'])
                    if filters.get('start_date'):
                        conditions.append("timestamp >= ?")
                        params.append(filters['start_date'])
                    if filters.get('end_date'):
                        conditions.append("timestamp <= ?")
                        params.append(filters['end_date'])

                # Build the query
                query = ["SELECT COUNT(*) FROM anomalies"]
                if conditions:
                    query.append("WHERE " + " AND ".join(conditions))

                # Execute query
                await cursor.execute(" ".join(query), params)
                count = (await cursor.fetchone())[0]
                await cursor.close()

                return count or 0
        except Exception as e:
            logger.error(f"Error getting anomalies count: {str(e)}")
            return 0

    async def get_recent_scans(self, limit: int = 10) -> List[Dict]:
        """Get recent security scans."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                conn.row_factory = aiosqlite.Row
                cursor = await conn.execute("""
                    SELECT id, timestamp, type, target, status, progress, findings_count,
                           start_time, end_time, metadata
                    FROM security_scans
                    ORDER BY start_time DESC
                    LIMIT ?
                """, (limit,))
                rows = await cursor.fetchall()
                await cursor.close()
                
                scans = []
                for row in rows:
                    scan = dict(row)
                    if scan.get('metadata'):
                        scan['metadata'] = json.loads(scan['metadata'])
                    # Add progress field for frontend compatibility
                    scan['progress'] = 100 if scan.get('status') == 'completed' else 0
                    scans.append(scan)
                return scans
        except Exception as e:
            logger.error(f"Error getting recent scans: {str(e)}")
            return []

    async def store_security_scan(self, scan_data: Dict) -> bool:
        """Store a security scan in the database."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                now = datetime.now().isoformat()
                await conn.execute("""
                    INSERT INTO security_scans (id, timestamp, type, target, status, progress,
                                               findings_count, start_time, end_time, metadata,
                                               created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    scan_data.get('id'),
                    scan_data.get('start_time', now),
                    scan_data.get('type'),
                    scan_data.get('target'),
                    scan_data.get('status'),
                    100.0 if scan_data.get('status') == 'completed' else 0.0,
                    scan_data.get('findings_count', 0),
                    scan_data.get('start_time', now),
                    scan_data.get('end_time', now if scan_data.get('status') == 'completed' else None),
                    json.dumps(scan_data.get('metadata', {})),
                    now,
                    now
                ))
                await conn.commit()
                logger.info(f"Stored security scan: {scan_data.get('id')}")
                return True
        except Exception as e:
            logger.error(f"Error storing security scan: {str(e)}")
            return False

    async def store_security_finding(self, finding_data: Dict) -> bool:
        """Store a security finding in the database."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                now = datetime.now().isoformat()
                finding_id = f"finding_{finding_data.get('scan_id')}_{int(time.time())}"
                await conn.execute("""
                    INSERT INTO security_findings (id, scan_id, type, severity, description,
                                                  details, timestamp, status, remediation,
                                                  created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    finding_id,
                    finding_data.get('scan_id'),
                    finding_data.get('type'),
                    finding_data.get('severity'),
                    finding_data.get('description'),
                    json.dumps(finding_data.get('metadata', {})),
                    now,
                    finding_data.get('status', 'active'),
                    finding_data.get('metadata', {}).get('recommendation', ''),
                    now,
                    now
                ))
                await conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error storing security finding: {str(e)}")
            return False

    async def initialize_network_monitoring(self) -> None:
        """Initialize network monitoring tables and settings."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                # Create network_metrics table if it doesn't exist
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS network_metrics (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        source_device_id TEXT NOT NULL,
                        target_device_id TEXT NOT NULL,
                        metric_type TEXT NOT NULL,
                        value REAL NOT NULL,
                        timestamp TEXT NOT NULL,
                        metadata TEXT,
                        created_at TEXT NOT NULL,
                        FOREIGN KEY (source_device_id) REFERENCES network_devices(id),
                        FOREIGN KEY (target_device_id) REFERENCES network_devices(id)
                    )
                """)
                
                # Create network_devices table if it doesn't exist
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS network_devices (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL,
                        ip_address TEXT,
                        mac_address TEXT,
                        status TEXT NOT NULL,
                        last_seen TEXT,
                        metadata TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                """)
                
                # Create indexes
                await conn.execute("CREATE INDEX IF NOT EXISTS idx_network_metrics_source_device ON network_metrics(source_device_id)")
                await conn.execute("CREATE INDEX IF NOT EXISTS idx_network_metrics_target_device ON network_metrics(target_device_id)")
                await conn.execute("CREATE INDEX IF NOT EXISTS idx_network_metrics_type ON network_metrics(metric_type)")
                await conn.execute("CREATE INDEX IF NOT EXISTS idx_network_metrics_timestamp ON network_metrics(timestamp)")
                
                await conn.commit()
                logger.info("Network monitoring tables initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing network monitoring: {str(e)}")
            raise

    async def store_security_scan_config(self, config: Dict) -> str:
        """Store security scan configuration and return scan ID."""
        try:
            scan_id = str(uuid.uuid4())
            async with aiosqlite.connect(self.db_path) as conn:
                await conn.execute("""
                    INSERT INTO security_scans (
                        id, timestamp, type, status, target, progress,
                        findings_count, start_time, metadata, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    scan_id,
                    datetime.utcnow().isoformat(),
                    config.get('type', 'vulnerability'),
                    'pending',
                    config.get('target', ''),
                    0.0,
                    0,
                    datetime.utcnow().isoformat(),
                    json.dumps(config),
                    datetime.utcnow().isoformat(),
                    datetime.utcnow().isoformat()
                ))
                await conn.commit()
                return scan_id
        except Exception as e:
            logger.error(f"Error storing security scan config: {str(e)}")
            raise

    async def get_settings(self) -> Dict:
        """Get all system settings."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                conn.row_factory = aiosqlite.Row
                cursor = await conn.cursor()
                
                # Create settings table if it doesn't exist
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS settings (
                        key TEXT PRIMARY KEY,
                        value TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                """)
                
                # Get all settings
                await cursor.execute("SELECT key, value FROM settings")
                rows = await cursor.fetchall()
                
                settings = {}
                for row in rows:
                    try:
                        settings[row['key']] = json.loads(row['value'])
                    except json.JSONDecodeError:
                        # Fallback for non-JSON values
                        settings[row['key']] = row['value']
                
                # Return default settings if none exist
                if not settings:
                    default_settings = {
                        'system': {
                            'app_name': 'SecureNet',
                            'theme': 'dark',
                            'auto_refresh': True,
                            'refresh_interval': 30
                        },
                        'network_monitoring': {
                            'enabled': True,
                            'interval': 300,
                            'timeout': 30,
                            'interface': 'auto',
                            'ip_ranges': '192.168.1.0/24,10.0.0.0/8',
                            'discovery_method': 'ping_arp',
                            'max_devices': 1000,
                            'traffic_analysis': False,
                            'packet_capture': False,
                            'capture_filter': 'tcp port 80 or tcp port 443',
                            'dns_monitoring': True,
                            'port_scan_detection': True,
                            'bandwidth_threshold': 100
                        },
                        'security_scanning': {
                            'enabled': True,
                            'interval': 3600,
                            'severity_threshold': 'medium'
                        },
                        'notifications': {
                            'enabled': True,
                            'email': '',
                            'slack_webhook': ''
                        },
                        'logging': {
                            'level': 'info',
                            'retention_days': 30,
                            'audit_enabled': True
                        }
                    }
                    return default_settings
                
                return settings
        except Exception as e:
            logger.error(f"Error getting settings: {str(e)}")
            raise

    async def update_settings(self, settings: Dict) -> None:
        """Update system settings."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                # Create settings table if it doesn't exist
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS settings (
                        key TEXT PRIMARY KEY,
                        value TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                """)
                
                # Update or insert settings
                for key, value in settings.items():
                    await conn.execute("""
                        INSERT INTO settings (key, value, updated_at)
                        VALUES (?, ?, ?)
                        ON CONFLICT(key) DO UPDATE SET
                            value = excluded.value,
                            updated_at = excluded.updated_at
                    """, (
                        key,
                        json.dumps(value),
                        datetime.utcnow().isoformat()
                    ))
                
                await conn.commit()
                logger.info("Settings updated successfully")
        except Exception as e:
            logger.error(f"Error updating settings: {str(e)}")
            raise

    def insert_sample_devices(self):
        """Insert sample network devices for testing."""
        try:
            with self.get_db() as db:
                cursor = db.cursor()
                now = datetime.utcnow().isoformat()
                
                # Sample devices
                devices = [
                    ('dev_001', 'Router-01', 'router', '192.168.1.1', '00:11:22:33:44:55', 'active', now, json.dumps({'vendor': 'Cisco', 'model': 'ISR4321'}), now, now),
                    ('dev_002', 'Switch-01', 'switch', '192.168.1.2', '00:11:22:33:44:56', 'active', now, json.dumps({'vendor': 'HP', 'model': 'Aruba 2930F'}), now, now),
                    ('dev_003', 'Server-01', 'server', '192.168.1.10', '00:11:22:33:44:57', 'active', now, json.dumps({'os': 'Ubuntu', 'version': '22.04'}), now, now),
                    ('dev_004', 'Workstation-01', 'workstation', '192.168.1.100', '00:11:22:33:44:58', 'active', now, json.dumps({'os': 'Windows', 'version': '11'}), now, now),
                    ('dev_005', 'Printer-01', 'printer', '192.168.1.50', '192.168.1.50', 'inactive', now, json.dumps({'vendor': 'HP', 'model': 'LaserJet Pro'}), now, now)
                ]
                
                # First, ensure the table exists with the correct schema
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS network_devices (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL,
                        ip_address TEXT,
                        mac_address TEXT,
                        status TEXT NOT NULL,
                        last_seen TEXT,
                        metadata TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                """)
                
                # Insert devices
                cursor.executemany("""
                    INSERT INTO network_devices (
                        id, name, type, ip_address, mac_address, status, last_seen, metadata, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, devices)
                
                # Sample connections
                connections = [
                    ('conn_001', 'dev_001', 'dev_002', 'active', 'TCP', 80, now, json.dumps({'bandwidth': '1Gbps'}), now, now),
                    ('conn_002', 'dev_002', 'dev_003', 'active', 'TCP', 443, now, json.dumps({'bandwidth': '1Gbps'}), now, now),
                    ('conn_003', 'dev_003', 'dev_004', 'active', 'TCP', 22, now, json.dumps({'bandwidth': '100Mbps'}), now, now),
                    ('conn_004', 'dev_004', 'dev_005', 'inactive', 'TCP', 9100, now, json.dumps({'bandwidth': '100Mbps'}), now, now)
                ]
                
                # Ensure connections table exists
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS network_connections (
                        id TEXT PRIMARY KEY,
                        source_device_id TEXT NOT NULL,
                        target_device_id TEXT NOT NULL,
                        status TEXT NOT NULL,
                        protocol TEXT,
                        port INTEGER,
                        last_seen TEXT,
                        metadata TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        FOREIGN KEY (source_device_id) REFERENCES network_devices(id),
                        FOREIGN KEY (target_device_id) REFERENCES network_devices(id)
                    )
                """)
                
                # Insert connections
                cursor.executemany("""
                    INSERT INTO network_connections (
                        id, source_device_id, target_device_id, status, protocol, port, last_seen, metadata, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, connections)
                
                # Sample traffic data
                traffic = []
                for i in range(60):  # Last hour of data
                    timestamp = (datetime.utcnow() - timedelta(minutes=i)).isoformat()
                    traffic.append((
                        f'traffic_{i:03d}',
                        'dev_001',
                        'dev_002',
                        'TCP',
                        random.randint(1000, 10000),  # bytes_sent
                        random.randint(1000, 10000),  # bytes_received
                        timestamp,
                        json.dumps({'packet_count': random.randint(100, 1000)})
                    ))
                
                # Ensure traffic table exists
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS network_traffic (
                        id TEXT PRIMARY KEY,
                        source_device_id TEXT NOT NULL,
                        target_device_id TEXT NOT NULL,
                        protocol TEXT NOT NULL,
                        bytes_sent INTEGER DEFAULT 0,
                        bytes_received INTEGER DEFAULT 0,
                        timestamp TEXT NOT NULL,
                        metadata TEXT,
                        FOREIGN KEY (source_device_id) REFERENCES network_devices(id),
                        FOREIGN KEY (target_device_id) REFERENCES network_devices(id)
                    )
                """)
                
                # Insert traffic data
                cursor.executemany("""
                    INSERT INTO network_traffic (
                        id, source_device_id, target_device_id, protocol, bytes_sent, bytes_received, timestamp, metadata
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, traffic)
                
                db.commit()
                logger.info("Sample network data inserted successfully")
                return True
        except Exception as e:
            logger.error(f"Error inserting sample devices: {str(e)}")
            return False

    def reset_user_password(self, username: str, new_password: str) -> bool:
        """Reset a user's password."""
        try:
            with self.get_db() as db:
                cursor = db.cursor()
                # Update password hash
                cursor.execute("""
                    UPDATE users
                    SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE username = ?
                """, (get_password_hash(new_password), username))
                db.commit()
                logger.info(f"Password reset for user '{username}'")
                return True
        except Exception as e:
            logger.error(f"Error resetting password for user '{username}': {str(e)}")
            return False

    async def get_logs(self, page: int = 1, page_size: int = 20, filters: dict = None) -> List[Dict]:
        """Get logs with optional filtering and pagination."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                conn.row_factory = aiosqlite.Row
                cursor = await conn.cursor()

                # Build query conditions
                conditions = []
                params = []
                if filters:
                    if filters.get('level'):
                        conditions.append("level = ?")
                        params.append(filters['level'])
                    if filters.get('category'):
                        conditions.append("category = ?")
                        params.append(filters['category'])
                    if filters.get('source'):
                        conditions.append("source = ?")
                        params.append(filters['source'])
                    if filters.get('start_date'):
                        conditions.append("timestamp >= ?")
                        params.append(filters['start_date'])
                    if filters.get('end_date'):
                        conditions.append("timestamp <= ?")
                        params.append(filters['end_date'])
                    if filters.get('search'):
                        conditions.append("(message LIKE ? OR source LIKE ?)")
                        search_term = f"%{filters['search']}%"
                        params.extend([search_term, search_term])

                # Build the query
                query = ["SELECT * FROM logs"]
                if conditions:
                    query.append("WHERE " + " AND ".join(conditions))
                query.append("ORDER BY timestamp DESC")
                query.append("LIMIT ? OFFSET ?")
                params.extend([page_size, (page - 1) * page_size])

                # Execute query
                await cursor.execute(" ".join(query), params)
                rows = await cursor.fetchall()
                await cursor.close()

                logs = []
                for row in rows:
                    log = dict(row)
                    if log.get('metadata'):
                        log['metadata'] = json.loads(log['metadata'])
                    logs.append(log)

                return logs
        except Exception as e:
            logger.error(f"Error getting logs: {str(e)}")
            return []

    async def get_logs_count(self, filters: dict = None) -> int:
        """Get total count of logs with optional filtering."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.cursor()

                # Build query conditions
                conditions = []
                params = []
                if filters:
                    if filters.get('level'):
                        conditions.append("level = ?")
                        params.append(filters['level'])
                    if filters.get('category'):
                        conditions.append("category = ?")
                        params.append(filters['category'])
                    if filters.get('source'):
                        conditions.append("source = ?")
                        params.append(filters['source'])
                    if filters.get('start_date'):
                        conditions.append("timestamp >= ?")
                        params.append(filters['start_date'])
                    if filters.get('end_date'):
                        conditions.append("timestamp <= ?")
                        params.append(filters['end_date'])
                    if filters.get('search'):
                        conditions.append("(message LIKE ? OR source LIKE ?)")
                        search_term = f"%{filters['search']}%"
                        params.extend([search_term, search_term])

                # Build the query
                query = ["SELECT COUNT(*) FROM logs"]
                if conditions:
                    query.append("WHERE " + " AND ".join(conditions))

                # Execute query
                await cursor.execute(" ".join(query), params)
                count = (await cursor.fetchone())[0]
                await cursor.close()

                return count or 0
        except Exception as e:
            logger.error(f"Error getting logs count: {str(e)}")
            return 0

    async def get_logs_stats(self, start_date: str = None, end_date: str = None) -> Dict:
        """Get log statistics."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.cursor()

                # Build date filter
                date_filter = ""
                params = []
                if start_date or end_date:
                    conditions = []
                    if start_date:
                        conditions.append("timestamp >= ?")
                        params.append(start_date)
                    if end_date:
                        conditions.append("timestamp <= ?")
                        params.append(end_date)
                    date_filter = "WHERE " + " AND ".join(conditions)

                # Get total logs
                await cursor.execute(f"SELECT COUNT(*) FROM logs {date_filter}", params)
                total_logs = (await cursor.fetchone())[0] or 0

                # Get logs by level
                await cursor.execute(f"""
                    SELECT level, COUNT(*) as count
                    FROM logs {date_filter}
                    GROUP BY level
                """, params)
                logs_by_level = {row[0]: row[1] for row in await cursor.fetchall()}

                # Get logs by category
                await cursor.execute(f"""
                    SELECT category, COUNT(*) as count
                    FROM logs {date_filter}
                    GROUP BY category
                """, params)
                logs_by_category = {row[0]: row[1] for row in await cursor.fetchall()}

                # Get logs by source
                await cursor.execute(f"""
                    SELECT source, COUNT(*) as count
                    FROM logs {date_filter}
                    GROUP BY source
                """, params)
                logs_by_source = {row[0]: row[1] for row in await cursor.fetchall()}

                # Get error count and rate
                await cursor.execute(f"""
                    SELECT COUNT(*) as count
                    FROM logs {date_filter}
                    WHERE level IN ('error', 'critical')
                """, params)
                error_count = (await cursor.fetchone())[0] or 0
                error_rate = (error_count / total_logs * 100) if total_logs > 0 else 0

                return {
                    "total_logs": total_logs,
                    "logs_by_level": logs_by_level,
                    "logs_by_category": logs_by_category,
                    "logs_by_source": logs_by_source,
                    "error_count": error_count,
                    "error_rate": error_rate
                }
        except Exception as e:
            logger.error(f"Error getting logs stats: {str(e)}")
            return {
                "total_logs": 0,
                "logs_by_level": {},
                "logs_by_category": {},
                "logs_by_source": {},
                "error_count": 0,
                "error_rate": 0
            }

    async def get_security_metrics(self) -> Dict:
        """Get security metrics."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.cursor()

                # Get active scans count
                await cursor.execute("""
                    SELECT COUNT(*) FROM security_scans
                    WHERE status = 'running'
                """)
                active_scans = (await cursor.fetchone())[0] or 0

                # Get total findings
                await cursor.execute("SELECT COUNT(*) FROM security_findings")
                total_findings = (await cursor.fetchone())[0] or 0

                # Get critical findings
                await cursor.execute("""
                    SELECT COUNT(*) FROM security_findings
                    WHERE severity = 'critical'
                """)
                critical_findings = (await cursor.fetchone())[0] or 0

                # Get last scan
                await cursor.execute("""
                    SELECT end_time FROM security_scans
                    WHERE status = 'completed'
                    ORDER BY end_time DESC
                    LIMIT 1
                """)
                last_scan_row = await cursor.fetchone()
                last_scan = last_scan_row[0] if last_scan_row else None

                # Calculate security score (placeholder implementation)
                security_score = 100 - (critical_findings * 10)  # Simple scoring based on critical findings

                return {
                    "active_scans": active_scans,
                    "total_findings": total_findings,
                    "critical_findings": critical_findings,
                    "security_score": max(0, min(100, security_score)),
                    "last_scan": last_scan,
                    "scan_status": "idle" if active_scans == 0 else "running"
                }
        except Exception as e:
            logger.error(f"Error getting security metrics: {str(e)}")
            return {
                "active_scans": 0,
                "total_findings": 0,
                "critical_findings": 0,
                "security_score": 0,
                "last_scan": None,
                "scan_status": "idle"
            }

    async def get_recent_findings(self, limit: int = 10) -> List[Dict]:
        """Get recent security findings."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                conn.row_factory = aiosqlite.Row
                cursor = await conn.execute("""
                    SELECT id, scan_id, type, severity, status, description,
                           timestamp, source, metadata
                    FROM security_findings
                    ORDER BY timestamp DESC
                    LIMIT ?
                """, (limit,))
                rows = await cursor.fetchall()
                await cursor.close()
                
                findings = []
                for row in rows:
                    finding = dict(row)
                    if finding.get('metadata'):
                        finding['metadata'] = json.loads(finding['metadata'])
                    findings.append(finding)
                return findings
        except Exception as e:
            logger.error(f"Error getting recent findings: {str(e)}")
            return []

    async def get_network_devices(self) -> List[Dict]:
        """Get network devices."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                conn.row_factory = aiosqlite.Row
                cursor = await conn.execute("""
                    SELECT id, name, type, status, last_seen, metadata
                    FROM network_devices
                    ORDER BY last_seen DESC
                """)
                rows = await cursor.fetchall()
                await cursor.close()
                
                devices = []
                for row in rows:
                    device = dict(row)
                    if device.get('metadata'):
                        device['metadata'] = json.loads(device['metadata'])
                    devices.append(device)
                return devices
        except Exception as e:
            logger.error(f"Error getting network devices: {str(e)}")
            return []

    async def get_network_traffic(self, limit: int = 100) -> List[Dict]:
        """Get network traffic data."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                conn.row_factory = aiosqlite.Row
                cursor = await conn.execute("""
                    SELECT timestamp, bytes_in, bytes_out, packets_in, packets_out,
                           source_ip, dest_ip, protocol, metadata
                    FROM network_traffic
                    ORDER BY timestamp DESC
                    LIMIT ?
                """, (limit,))
                rows = await cursor.fetchall()
                await cursor.close()
                
                traffic = []
                for row in rows:
                    entry = dict(row)
                    if entry.get('metadata'):
                        entry['metadata'] = json.loads(entry['metadata'])
                    traffic.append(entry)
                return traffic
        except Exception as e:
            logger.error(f"Error getting network traffic: {str(e)}")
            return []

    async def get_network_protocols(self) -> List[Dict]:
        """Get network protocol distribution."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.cursor()
                await cursor.execute("""
                    SELECT protocol, COUNT(*) as count
                    FROM network_traffic
                    GROUP BY protocol
                    ORDER BY count DESC
                """)
                rows = await cursor.fetchall()
                await cursor.close()

                total = sum(row[1] for row in rows)
                protocols = []
                for protocol, count in rows:
                    protocols.append({
                        "name": protocol,
                        "count": count,
                        "percentage": (count / total * 100) if total > 0 else 0
                    })
                return protocols
        except Exception as e:
            logger.error(f"Error getting network protocols: {str(e)}")
            return []

    async def get_network_stats(self) -> Dict:
        """Get network statistics."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.cursor()

                # Get total devices
                await cursor.execute("SELECT COUNT(*) FROM network_devices")
                total_devices = (await cursor.fetchone())[0] or 0

                # Get active devices
                await cursor.execute("""
                    SELECT COUNT(*) FROM network_devices
                    WHERE status = 'active'
                """)
                active_devices = (await cursor.fetchone())[0] or 0

                # Get total traffic from network_traffic table
                await cursor.execute("""
                    SELECT SUM(bytes_in + bytes_out) as total
                    FROM network_traffic
                """)
                total_traffic = (await cursor.fetchone())[0] or 0

                # Get average latency (placeholder implementation)
                average_latency = 50  # Placeholder value

                await cursor.close()
                
                return {
                    "total_devices": total_devices,
                    "active_devices": active_devices,
                    "total_traffic": total_traffic,
                    "average_latency": average_latency
                }
        except Exception as e:
            logger.error(f"Error getting network stats: {str(e)}")
            return {
                "total_devices": 0,
                "active_devices": 0,
                "total_traffic": 0,
                "average_latency": 0
            }

    async def get_anomalies_stats(self) -> Dict:
        """Get anomalies statistics."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.cursor()

                # Get total anomalies
                await cursor.execute("SELECT COUNT(*) FROM anomalies")
                total = (await cursor.fetchone())[0] or 0

                # Get open anomalies
                await cursor.execute("""
                    SELECT COUNT(*) FROM anomalies
                    WHERE status = 'active'
                """)
                open_count = (await cursor.fetchone())[0] or 0

                # Get critical anomalies
                await cursor.execute("""
                    SELECT COUNT(*) FROM anomalies
                    WHERE severity = 'critical'
                """)
                critical_count = (await cursor.fetchone())[0] or 0

                # Get resolved anomalies
                await cursor.execute("""
                    SELECT COUNT(*) FROM anomalies
                    WHERE status = 'resolved'
                """)
                resolved_count = (await cursor.fetchone())[0] or 0

                # Get anomalies by type
                await cursor.execute("""
                    SELECT type, COUNT(*) as count
                    FROM anomalies
                    GROUP BY type
                """)
                by_type = {row[0]: row[1] for row in await cursor.fetchall()}

                # Get anomalies by severity
                await cursor.execute("""
                    SELECT severity, COUNT(*) as count
                    FROM anomalies
                    GROUP BY severity
                """)
                by_severity = {row[0]: row[1] for row in await cursor.fetchall()}

                return {
                    "total": total,
                    "open": open_count,
                    "critical": critical_count,
                    "resolved": resolved_count,
                    "by_type": by_type,
                    "by_severity": by_severity
                }
        except Exception as e:
            logger.error(f"Error getting anomalies stats: {str(e)}")
            return {
                "total": 0,
                "open": 0,
                "critical": 0,
                "resolved": 0,
                "by_type": {},
                "by_severity": {}
            }

    async def update_db_schema(self):
        """Update database schema."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                # Enable foreign key support
                await conn.execute("PRAGMA foreign_keys = ON")
                cursor = await conn.cursor()

                # Helper function to check if a column exists
                async def column_exists(table: str, column: str) -> bool:
                    await cursor.execute(f"PRAGMA table_info({table})")
                    columns = await cursor.fetchall()
                    return any(col[1] == column for col in columns)

                # Helper function to add a column if it doesn't exist
                async def add_column_if_not_exists(table: str, column: str, definition: str):
                    if not await column_exists(table, column):
                        try:
                            await cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
                        except sqlite3.OperationalError as e:
                            if "duplicate column name" not in str(e).lower():
                                raise

                # Create or update users table
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT UNIQUE NOT NULL,
                        email TEXT UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        role TEXT NOT NULL DEFAULT 'end_user',
                        is_active BOOLEAN NOT NULL DEFAULT 1,
                        last_login TIMESTAMP,
                        last_logout TIMESTAMP,
                        login_count INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                # Create or update logs table
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS logs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        level TEXT NOT NULL,
                        category TEXT NOT NULL,
                        source TEXT NOT NULL,
                        message TEXT NOT NULL,
                        metadata TEXT
                    )
                """)

                # Create or update security_scans table
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS security_scans (
                        id TEXT PRIMARY KEY,
                        timestamp TEXT NOT NULL,
                        type TEXT NOT NULL,
                        status TEXT NOT NULL,
                        target TEXT NOT NULL,
                        progress REAL DEFAULT 0,
                        findings_count INTEGER DEFAULT 0,
                        start_time TEXT NOT NULL,
                        end_time TEXT,
                        metadata TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                """)

                # Create or update security_findings table
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS security_findings (
                        id TEXT PRIMARY KEY,
                        scan_id TEXT NOT NULL,
                        type TEXT NOT NULL,
                        severity TEXT NOT NULL,
                        description TEXT NOT NULL,
                        details TEXT,
                        timestamp TEXT NOT NULL,
                        status TEXT NOT NULL,
                        remediation TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        FOREIGN KEY (scan_id) REFERENCES security_scans(id)
                    )
                """)

                # Create or update network_devices table
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS network_devices (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL,
                        status TEXT NOT NULL,
                        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        metadata TEXT
                    )
                """)

                # Create or update network_traffic table
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS network_traffic (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        source_ip TEXT NOT NULL,
                        dest_ip TEXT NOT NULL,
                        protocol TEXT NOT NULL,
                        bytes_in INTEGER DEFAULT 0,
                        bytes_out INTEGER DEFAULT 0,
                        packets_in INTEGER DEFAULT 0,
                        packets_out INTEGER DEFAULT 0,
                        metadata TEXT
                    )
                """)

                # Create or update anomalies table
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS anomalies (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        type TEXT NOT NULL,
                        severity TEXT NOT NULL,
                        status TEXT NOT NULL,
                        description TEXT NOT NULL,
                        source TEXT NOT NULL,
                        metadata TEXT
                    )
                """)

                # ===== MULTI-TENANT SAAS TABLES =====
                
                # Create organizations table
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS organizations (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        owner_email TEXT NOT NULL,
                        plan_type TEXT NOT NULL DEFAULT 'free',
                        status TEXT NOT NULL DEFAULT 'active',
                        api_key TEXT UNIQUE NOT NULL,
                        device_limit INTEGER NOT NULL DEFAULT 5,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                # Create org_users table
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS org_users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        organization_id TEXT NOT NULL,
                        user_id INTEGER NOT NULL,
                        role TEXT NOT NULL DEFAULT 'member',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(organization_id, user_id)
                    )
                """)

                # Create billing_usage table
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS billing_usage (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        organization_id TEXT NOT NULL,
                        month TEXT NOT NULL,
                        device_count INTEGER DEFAULT 0,
                        scan_count INTEGER DEFAULT 0,
                        log_count INTEGER DEFAULT 0,
                        api_requests INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(organization_id, month)
                    )
                """)

                # Create ml_models table
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS ml_models (
                        id TEXT PRIMARY KEY,
                        organization_id TEXT,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL,
                        accuracy REAL,
                        status TEXT NOT NULL DEFAULT 'training',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                # Create ml_training_sessions table
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS ml_training_sessions (
                        id TEXT PRIMARY KEY,
                        organization_id TEXT,
                        model_id TEXT NOT NULL,
                        data_size INTEGER NOT NULL,
                        accuracy REAL,
                        training_time REAL,
                        status TEXT NOT NULL DEFAULT 'running',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        completed_at TIMESTAMP
                    )
                """)

                # Create notifications table
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS notifications (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        organization_id TEXT,
                        user_id INTEGER,
                        title TEXT NOT NULL,
                        message TEXT NOT NULL,
                        category TEXT NOT NULL DEFAULT 'system',
                        severity TEXT NOT NULL DEFAULT 'info',
                        read BOOLEAN NOT NULL DEFAULT 0,
                        metadata TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                # ===== PROFILE MANAGEMENT TABLES =====

                # Add profile fields to users table
                await add_column_if_not_exists('users', 'name', 'TEXT')
                await add_column_if_not_exists('users', 'phone', 'TEXT')
                await add_column_if_not_exists('users', 'department', 'TEXT')
                await add_column_if_not_exists('users', 'title', 'TEXT')
                await add_column_if_not_exists('users', 'two_factor_enabled', 'BOOLEAN DEFAULT 0')

                # Create user_api_keys table
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS user_api_keys (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        name TEXT NOT NULL,
                        key TEXT NOT NULL,
                        is_active BOOLEAN DEFAULT 1,
                        last_used TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id)
                    )
                """)

                # Create user_sessions table
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS user_sessions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        device TEXT,
                        browser TEXT,
                        location TEXT,
                        ip_address TEXT NOT NULL,
                        is_current BOOLEAN DEFAULT 0,
                        is_active BOOLEAN DEFAULT 1,
                        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id)
                    )
                """)

                # Create user_activity_log table
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS user_activity_log (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        action TEXT NOT NULL,
                        ip_address TEXT NOT NULL,
                        user_agent TEXT,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id)
                    )
                """)

                # Create cve_data table
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS cve_data (
                        id TEXT PRIMARY KEY,
                        description TEXT NOT NULL,
                        severity TEXT NOT NULL,
                        score REAL,
                        published_date TEXT,
                        modified_date TEXT,
                        reference_urls TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                # Create device_vulnerabilities table
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS device_vulnerabilities (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        organization_id TEXT,
                        device_id INTEGER,
                        cve_id TEXT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'open',
                        detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        resolved_at TIMESTAMP
                    )
                """)

                # Add any missing columns to existing tables
                await add_column_if_not_exists("logs", "source", "TEXT NOT NULL DEFAULT 'system'")
                await add_column_if_not_exists("logs", "metadata", "TEXT")
                await add_column_if_not_exists("security_scans", "metadata", "TEXT")
                await add_column_if_not_exists("security_findings", "source", "TEXT NOT NULL DEFAULT 'system'")
                await add_column_if_not_exists("security_findings", "metadata", "TEXT")
                await add_column_if_not_exists("network_devices", "metadata", "TEXT")
                await add_column_if_not_exists("network_traffic", "metadata", "TEXT")
                await add_column_if_not_exists("anomalies", "source", "TEXT NOT NULL DEFAULT 'system'")
                await add_column_if_not_exists("anomalies", "metadata", "TEXT")

                # Add organization_id columns for multi-tenancy
                await add_column_if_not_exists("logs", "organization_id", "TEXT")
                await add_column_if_not_exists("network_devices", "organization_id", "TEXT")
                await add_column_if_not_exists("network_traffic", "organization_id", "TEXT")
                await add_column_if_not_exists("anomalies", "organization_id", "TEXT")
                await add_column_if_not_exists("security_scans", "organization_id", "TEXT")
                await add_column_if_not_exists("security_findings", "organization_id", "TEXT")
                
                # Add missing columns to network_devices
                await add_column_if_not_exists("network_devices", "ip_address", "TEXT")
                await add_column_if_not_exists("network_devices", "mac_address", "TEXT")
                await add_column_if_not_exists("network_devices", "created_at", "TIMESTAMP")
                await add_column_if_not_exists("network_devices", "updated_at", "TIMESTAMP")
                
                # Add missing columns to anomalies
                await add_column_if_not_exists("anomalies", "evidence", "TEXT")
                await add_column_if_not_exists("anomalies", "resolution", "TEXT")
                await add_column_if_not_exists("anomalies", "created_at", "TIMESTAMP")
                
                # Add new role and session tracking columns to users table
                await add_column_if_not_exists("users", "last_logout", "TIMESTAMP")
                await add_column_if_not_exists("users", "login_count", "INTEGER DEFAULT 0")
                
                # Add missing columns to notifications table
                await add_column_if_not_exists("notifications", "read_at", "TIMESTAMP")

                # Create indexes only if the tables exist and have the required columns
                if await column_exists("logs", "timestamp"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)")
                if await column_exists("logs", "level"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level)")
                if await column_exists("logs", "category"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_category ON logs(category)")
                if await column_exists("logs", "source"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_source ON logs(source)")

                if await column_exists("security_scans", "status"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_scans_status ON security_scans(status)")
                if await column_exists("security_scans", "type"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_scans_type ON security_scans(type)")

                if await column_exists("security_findings", "severity"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_findings_severity ON security_findings(severity)")
                if await column_exists("security_findings", "status"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_findings_status ON security_findings(status)")
                if await column_exists("security_findings", "type"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_findings_type ON security_findings(type)")

                if await column_exists("network_devices", "status"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_devices_status ON network_devices(status)")
                if await column_exists("network_devices", "type"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_devices_type ON network_devices(type)")

                if await column_exists("network_traffic", "timestamp"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_traffic_timestamp ON network_traffic(timestamp)")
                if await column_exists("network_traffic", "protocol"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_traffic_protocol ON network_traffic(protocol)")

                if await column_exists("anomalies", "timestamp"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_anomalies_timestamp ON anomalies(timestamp)")
                if await column_exists("anomalies", "severity"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON anomalies(severity)")
                if await column_exists("anomalies", "status"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_anomalies_status ON anomalies(status)")
                if await column_exists("anomalies", "type"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_anomalies_type ON anomalies(type)")

                # Create indexes for multi-tenant tables (only if tables exist)
                try:
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_organizations_api_key ON organizations(api_key)")
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_organizations_owner_email ON organizations(owner_email)")
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_org_users_org_id ON org_users(organization_id)")
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_org_users_user_id ON org_users(user_id)")
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_billing_usage_org_id ON billing_usage(organization_id)")
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_billing_usage_month ON billing_usage(month)")
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_ml_models_org_id ON ml_models(organization_id)")
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_ml_training_sessions_org_id ON ml_training_sessions(organization_id)")
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_notifications_org_id ON notifications(organization_id)")
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)")
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_device_vulnerabilities_org_id ON device_vulnerabilities(organization_id)")
                except sqlite3.OperationalError as e:
                    logger.warning(f"Could not create some indexes: {str(e)}")
                
                # Create indexes for organization_id columns in existing tables
                if await column_exists("logs", "organization_id"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_org_id ON logs(organization_id)")
                if await column_exists("network_devices", "organization_id"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_devices_org_id ON network_devices(organization_id)")
                if await column_exists("network_traffic", "organization_id"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_traffic_org_id ON network_traffic(organization_id)")
                if await column_exists("anomalies", "organization_id"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_anomalies_org_id ON anomalies(organization_id)")
                if await column_exists("security_scans", "organization_id"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_scans_org_id ON security_scans(organization_id)")
                if await column_exists("security_findings", "organization_id"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_findings_org_id ON security_findings(organization_id)")

                await conn.commit()
                logger.info("Database schema updated successfully")
        except Exception as e:
            logger.error(f"Error updating database schema: {str(e)}")
            raise

    async def insert_sample_data(self):
        """Insert sample data for development and testing."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.cursor()

                # Sample logs
                sample_logs = [
                    (datetime.now(), 'info', 'system', 'system', 'System startup complete', '{"component": "core"}'),
                    (datetime.now(), 'warning', 'security', 'firewall', 'Suspicious connection attempt', '{"ip": "192.168.1.100"}'),
                    (datetime.now(), 'error', 'network', 'router', 'Connection timeout', '{"device": "router-1"}'),
                    (datetime.now(), 'critical', 'security', 'ids', 'Potential intrusion detected', '{"severity": "high"}'),
                    (datetime.now(), 'info', 'system', 'database', 'Backup completed', '{"size": "1.2GB"}'),
                ]
                await cursor.executemany("""
                    INSERT INTO logs (timestamp, level, category, source, message, metadata)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, sample_logs)

                # Sample security scan
                scan_time = datetime.now()
                await cursor.execute("""
                    INSERT INTO security_scans (start_time, end_time, status, type, target, findings_count, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (scan_time, scan_time + timedelta(minutes=30), 'completed', 'full', 'network', 5, '{"duration": "30m"}'))

                # Get the scan ID
                scan_id = cursor.lastrowid

                # Sample security findings
                sample_findings = [
                    (scan_id, datetime.now(), 'vulnerability', 'high', 'open', 'SQL Injection vulnerability', 'scanner', '{"cve": "CVE-2023-1234"}'),
                    (scan_id, datetime.now(), 'misconfiguration', 'medium', 'open', 'Weak password policy', 'scanner', '{"policy": "password"}'),
                    (scan_id, datetime.now(), 'malware', 'critical', 'open', 'Ransomware detected', 'scanner', '{"type": "crypto"}'),
                    (scan_id, datetime.now(), 'vulnerability', 'low', 'resolved', 'Outdated software', 'scanner', '{"component": "web-server"}'),
                    (scan_id, datetime.now(), 'misconfiguration', 'medium', 'open', 'Exposed API endpoint', 'scanner', '{"endpoint": "/api/v1"}'),
                ]
                await cursor.executemany("""
                    INSERT INTO security_findings (scan_id, timestamp, type, severity, status, description, source, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, sample_findings)

                # Sample network devices
                sample_devices = [
                    ('router-1', 'router', 'active', datetime.now(), '{"ip": "192.168.1.1", "model": "Cisco"}'),
                    ('switch-1', 'switch', 'active', datetime.now(), '{"ip": "192.168.1.2", "ports": 48}'),
                    ('firewall-1', 'firewall', 'active', datetime.now(), '{"ip": "192.168.1.3", "rules": 150}'),
                    ('server-1', 'server', 'active', datetime.now(), '{"ip": "192.168.1.10", "os": "Linux"}'),
                    ('printer-1', 'printer', 'inactive', datetime.now() - timedelta(hours=1), '{"ip": "192.168.1.20", "model": "HP"}'),
                ]
                await cursor.executemany("""
                    INSERT INTO network_devices (name, type, status, last_seen, metadata)
                    VALUES (?, ?, ?, ?, ?)
                """, sample_devices)

                # Sample network traffic
                sample_traffic = [
                    (datetime.now(), '192.168.1.10', '8.8.8.8', 'HTTP', 1500, 750, 10, 5, '{"port": 80}'),
                    (datetime.now(), '192.168.1.20', '8.8.4.4', 'HTTPS', 2000, 1000, 15, 8, '{"port": 443}'),
                    (datetime.now(), '192.168.1.30', '1.1.1.1', 'DNS', 100, 50, 2, 1, '{"port": 53}'),
                    (datetime.now(), '192.168.1.40', '9.9.9.9', 'SMTP', 500, 250, 5, 3, '{"port": 25}'),
                    (datetime.now(), '192.168.1.50', '208.67.222.222', 'ICMP', 100, 100, 1, 1, '{"type": "echo"}'),
                ]
                await cursor.executemany("""
                    INSERT INTO network_traffic (timestamp, source_ip, dest_ip, protocol, bytes_in, bytes_out, packets_in, packets_out, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, sample_traffic)

                # Sample anomalies
                sample_anomalies = [
                    (datetime.now(), 'traffic_spike', 'high', 'open', 'Unusual network traffic detected', 'ids', '{"threshold": "1000%"}'),
                    (datetime.now(), 'failed_login', 'medium', 'open', 'Multiple failed login attempts', 'auth', '{"user": "admin", "count": 10}'),
                    (datetime.now(), 'port_scan', 'high', 'open', 'Port scanning activity detected', 'ids', '{"source": "192.168.1.100"}'),
                    (datetime.now(), 'data_exfiltration', 'critical', 'open', 'Large data transfer detected', 'ids', '{"size": "1GB"}'),
                    (datetime.now(), 'service_outage', 'medium', 'resolved', 'Service unavailable', 'monitoring', '{"service": "web-server"}'),
                ]
                await cursor.executemany("""
                    INSERT INTO anomalies (timestamp, type, severity, status, description, source, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, sample_anomalies)

                await conn.commit()
                logger.info("Sample data inserted successfully")
        except Exception as e:
            logger.error(f"Error inserting sample data: {str(e)}")
            raise

    # ===== AI/ML PIPELINE MANAGEMENT =====
    
    async def create_ml_model(self, name: str, model_type: str, org_id: str = None) -> str:
        """Create a new ML model for anomaly detection."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                model_id = str(uuid.uuid4())
                version = "1.0.0"
                file_path = f"models/{model_id}_{model_type}.pkl"
                
                await conn.execute("""
                    INSERT INTO ml_models (
                        id, name, type, version, file_path, organization_id,
                        status, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    model_id, name, model_type, version, file_path, org_id,
                    'training', datetime.now().isoformat(), datetime.now().isoformat()
                ))
                
                await conn.commit()
                logger.info(f"Created ML model: {name} with ID: {model_id}")
                return model_id
        except Exception as e:
            logger.error(f"Error creating ML model: {str(e)}")
            raise

    async def start_ml_training_session(self, model_id: str, data_size: int, org_id: str = None) -> str:
        """Start a new ML training session."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                session_id = str(uuid.uuid4())
                
                await conn.execute("""
                    INSERT INTO ml_training_sessions (
                        id, model_id, data_size, status, organization_id, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    session_id, model_id, data_size, 'running', org_id,
                    datetime.now().isoformat()
                ))
                
                await conn.commit()
                logger.info(f"Started ML training session: {session_id}")
                return session_id
        except Exception as e:
            logger.error(f"Error starting ML training session: {str(e)}")
            raise

    async def complete_ml_training_session(self, session_id: str, accuracy: float, training_time: float) -> bool:
        """Complete an ML training session with results."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                await conn.execute("""
                    UPDATE ml_training_sessions 
                    SET accuracy = ?, training_time = ?, status = 'completed',
                        completed_at = ?
                    WHERE id = ?
                """, (accuracy, training_time, datetime.now().isoformat(), session_id))
                
                await conn.commit()
                logger.info(f"Completed ML training session: {session_id}")
                return True
        except Exception as e:
            logger.error(f"Error completing ML training session: {str(e)}")
            return False

    async def get_ml_models(self, org_id: str = None) -> List[Dict]:
        """Get ML models for organization."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                if org_id:
                    cursor = await conn.execute("""
                        SELECT id, name, type, version, file_path, accuracy, status,
                               created_at, updated_at
                        FROM ml_models
                        WHERE organization_id = ? OR organization_id IS NULL
                        ORDER BY created_at DESC
                    """, (org_id,))
                else:
                    cursor = await conn.execute("""
                        SELECT id, name, type, version, file_path, accuracy, status,
                               created_at, updated_at
                        FROM ml_models
                        ORDER BY created_at DESC
                    """)
                
                rows = await cursor.fetchall()
                return [{
                    'id': row[0],
                    'name': row[1],
                    'type': row[2],
                    'version': row[3],
                    'file_path': row[4],
                    'accuracy': row[5],
                    'status': row[6],
                    'created_at': row[7],
                    'updated_at': row[8]
                } for row in rows]
        except Exception as e:
            logger.error(f"Error getting ML models: {str(e)}")
            return []

    # ===== BILLING & USAGE TRACKING =====
    
    async def track_billing_usage(self, org_id: str, usage_type: str, count: int = 1) -> bool:
        """Track usage for billing purposes."""
        try:
            current_month = datetime.now().strftime('%Y-%m')
            
            async with aiosqlite.connect(self.db_path) as conn:
                # Get or create billing record for this month
                cursor = await conn.execute("""
                    SELECT device_count, scan_count, log_count, api_requests
                    FROM billing_usage
                    WHERE organization_id = ? AND month = ?
                """, (org_id, current_month))
                
                row = await cursor.fetchone()
                if row:
                    # Update existing record
                    current_device_count, current_scan_count, current_log_count, current_api_requests = row
                    
                    if usage_type == 'device':
                        current_device_count = max(current_device_count, count)  # Track max devices
                    elif usage_type == 'scan':
                        current_scan_count += count
                    elif usage_type == 'log':
                        current_log_count += count
                    elif usage_type == 'api':
                        current_api_requests += count
                    
                    await conn.execute("""
                        UPDATE billing_usage 
                        SET device_count = ?, scan_count = ?, log_count = ?, 
                            api_requests = ?, updated_at = ?
                        WHERE organization_id = ? AND month = ?
                    """, (
                        current_device_count, current_scan_count, current_log_count,
                        current_api_requests, datetime.now().isoformat(),
                        org_id, current_month
                    ))
                else:
                    # Create new record
                    device_count = count if usage_type == 'device' else 0
                    scan_count = count if usage_type == 'scan' else 0
                    log_count = count if usage_type == 'log' else 0
                    api_requests = count if usage_type == 'api' else 0
                    
                    await conn.execute("""
                        INSERT INTO billing_usage (
                            organization_id, month, device_count, scan_count,
                            log_count, api_requests, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        org_id, current_month, device_count, scan_count,
                        log_count, api_requests, datetime.now().isoformat(),
                        datetime.now().isoformat()
                    ))
                
                await conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error tracking billing usage: {str(e)}")
            return False

    async def get_billing_usage(self, org_id: str, months: int = 12) -> List[Dict]:
        """Get billing usage history for organization."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.execute("""
                    SELECT month, device_count, scan_count, log_count, api_requests
                    FROM billing_usage
                    WHERE organization_id = ?
                    ORDER BY month DESC
                    LIMIT ?
                """, (org_id, months))
                
                rows = await cursor.fetchall()
                return [{
                    'month': row[0],
                    'device_count': row[1],
                    'scan_count': row[2],
                    'log_count': row[3],
                    'api_requests': row[4]
                } for row in rows]
        except Exception as e:
            logger.error(f"Error getting billing usage: {str(e)}")
            return []

    async def update_organization_plan(self, org_id: str, plan_type: str, device_limit: int = None) -> bool:
        """Update organization subscription plan."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                if device_limit is not None:
                    await conn.execute("""
                        UPDATE organizations 
                        SET plan_type = ?, device_limit = ?, updated_at = ?
                        WHERE id = ?
                    """, (plan_type, device_limit, datetime.now().isoformat(), org_id))
                else:
                    await conn.execute("""
                        UPDATE organizations 
                        SET plan_type = ?, updated_at = ?
                        WHERE id = ?
                    """, (plan_type, datetime.now().isoformat(), org_id))
                
                await conn.commit()
                logger.info(f"Updated organization plan: {org_id} to {plan_type}")
                return True
        except Exception as e:
            logger.error(f"Error updating organization plan: {str(e)}")
            return False

    async def check_organization_limits(self, org_id: str) -> Dict:
        """Check if organization is within subscription limits."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                # Get organization info
                cursor = await conn.execute("""
                    SELECT plan_type, device_limit, status
                    FROM organizations
                    WHERE id = ?
                """, (org_id,))
                
                org_row = await cursor.fetchone()
                if not org_row:
                    return {'within_limits': False, 'reason': 'Organization not found'}
                
                plan_type, device_limit, status = org_row
                
                if status == 'suspended':
                    return {'within_limits': False, 'reason': 'Organization suspended'}
                
                # Get current device count
                cursor = await conn.execute("""
                    SELECT COUNT(*) FROM network_devices WHERE organization_id = ?
                """, (org_id,))
                current_devices = (await cursor.fetchone())[0]
                
                # Check device limit
                if current_devices >= device_limit:
                    return {
                        'within_limits': False,
                        'reason': f'Device limit reached ({current_devices}/{device_limit})',
                        'current_devices': current_devices,
                        'device_limit': device_limit
                    }
                
                return {
                    'within_limits': True,
                    'plan_type': plan_type,
                    'current_devices': current_devices,
                    'device_limit': device_limit
                }
        except Exception as e:
            logger.error(f"Error checking organization limits: {str(e)}")
            return {'within_limits': False, 'reason': 'Database error'}

    # ===== ENHANCED NOTIFICATION SYSTEM =====
    
    async def create_notification(self, title: str, message: str, category: str = "system",
                                severity: str = "info", org_id: str = None, user_id: int = None) -> int:
        """Create a new notification with organization scoping."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.execute("""
                    INSERT INTO notifications (
                        title, message, category, severity, organization_id,
                        user_id, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    title, message, category, severity, org_id, user_id,
                    datetime.now().isoformat()
                ))
                
                # Get the inserted row ID
                cursor = await conn.execute("SELECT last_insert_rowid()")
                notification_id = (await cursor.fetchone())[0]
                await conn.commit()
                return notification_id
        except Exception as e:
            logger.error(f"Error creating notification: {str(e)}")
            return None

    async def get_notifications(self, org_id: str = None, user_id: int = None,
                              unread_only: bool = False, limit: int = 50) -> List[Dict]:
        """Get notifications with organization/user scoping."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                query = """
                    SELECT id, title, message, category, severity, read,
                           created_at, metadata
                    FROM notifications
                    WHERE 1=1
                """
                params = []
                
                if org_id:
                    query += " AND organization_id = ?"
                    params.append(org_id)
                
                if user_id:
                    query += " AND (user_id = ? OR user_id IS NULL)"
                    params.append(user_id)
                
                if unread_only:
                    query += " AND read = 0"
                
                query += " ORDER BY created_at DESC LIMIT ?"
                params.append(limit)
                
                cursor = await conn.execute(query, params)
                rows = await cursor.fetchall()
                
                return [{
                    'id': row[0],
                    'title': row[1],
                    'message': row[2],
                    'category': row[3],
                    'severity': row[4],
                    'read': bool(row[5]),
                    'created_at': row[6],
                    'metadata': json.loads(row[7]) if row[7] else {}
                } for row in rows]
        except Exception as e:
            logger.error(f"Error getting notifications: {str(e)}")
            return []

    async def mark_notification_read(self, notification_id: int, org_id: str = None) -> bool:
        """Mark notification as read with organization scoping."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                if org_id:
                    cursor = await conn.execute("""
                        UPDATE notifications SET read = 1
                        WHERE id = ? AND organization_id = ?
                    """, (notification_id, org_id))
                else:
                    cursor = await conn.execute("""
                        UPDATE notifications SET read = 1 WHERE id = ?
                    """, (notification_id,))
                
                await conn.commit()
                return cursor.rowcount > 0
        except Exception as e:
            logger.error(f"Error marking notification read: {str(e)}")
            return False

    # ===== DEFAULT ORGANIZATION SETUP =====
    
    async def ensure_default_organization(self) -> str:
        """Ensure a default organization exists for backward compatibility."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.execute("""
                    SELECT id FROM organizations WHERE owner_email = 'admin@securenet.local'
                """)
                
                org = await cursor.fetchone()
                if org:
                    return org[0]
                
                # Create default organization with dev API key
                org_id = str(uuid.uuid4())
                await conn.execute("""
                    INSERT INTO organizations (
                        id, name, owner_email, status, plan_type, 
                        api_key, device_limit, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    org_id, "SecureNet Default", "admin@securenet.local", 
                    OrganizationStatus.ACTIVE.value, PlanType.ENTERPRISE.value,
                    "sk-dev-api-key-securenet-default", 1000, datetime.now().isoformat(),
                    datetime.now().isoformat()
                ))
                await conn.commit()
                
                # Update device limits for enterprise plan
                await self.update_organization_plan(org_id, "enterprise", 1000)
                
                logger.info(f"Created default organization: {org_id}")
                return org_id
        except Exception as e:
            logger.error(f"Error ensuring default organization: {str(e)}")
            raise

    # ===== ORGANIZATION SCOPED DATA ACCESS =====
    
    async def get_network_devices_scoped(self, org_id: str) -> List[Dict]:
        """Get network devices scoped to organization."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.execute("""
                    SELECT id, name, type, ip_address, mac_address, status,
                           last_seen, metadata, created_at, updated_at
                    FROM network_devices
                    WHERE organization_id = ? OR organization_id IS NULL
                    ORDER BY last_seen DESC
                """, (org_id,))
                
                rows = await cursor.fetchall()
                return [{
                    'id': row[0],
                    'name': row[1],
                    'type': row[2],
                    'ip_address': row[3],
                    'mac_address': row[4],
                    'status': row[5],
                    'last_seen': row[6],
                    'metadata': json.loads(row[7]) if row[7] else {},
                    'created_at': row[8],
                    'updated_at': row[9]
                } for row in rows]
        except Exception as e:
            logger.error(f"Error getting scoped network devices: {str(e)}")
            return []

    async def get_security_scans_scoped(self, org_id: str, limit: int = 50) -> List[Dict]:
        """Get security scans scoped to organization."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.execute("""
                    SELECT id, timestamp, type, status, target, progress,
                           findings_count, start_time, end_time, created_at
                    FROM security_scans
                    WHERE organization_id = ? OR organization_id IS NULL
                    ORDER BY created_at DESC
                    LIMIT ?
                """, (org_id, limit))
                
                rows = await cursor.fetchall()
                return [{
                    'id': row[0],
                    'timestamp': row[1],
                    'type': row[2],
                    'status': row[3],
                    'target': row[4],
                    'progress': row[5],
                    'findings_count': row[6],
                    'start_time': row[7],
                    'end_time': row[8],
                    'created_at': row[9]
                } for row in rows]
        except Exception as e:
            logger.error(f"Error getting scoped security scans: {str(e)}")
            return []

    async def get_anomalies_scoped(self, org_id: str, page: int = 1, page_size: int = 20) -> List[Dict]:
        """Get anomalies scoped to organization."""
        try:
            offset = (page - 1) * page_size
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.execute("""
                    SELECT id, timestamp, type, severity, status, source,
                           description, evidence, resolution, created_at
                    FROM anomalies
                    WHERE organization_id = ? OR organization_id IS NULL
                    ORDER BY timestamp DESC
                    LIMIT ? OFFSET ?
                """, (org_id, page_size, offset))
                
                rows = await cursor.fetchall()
                return [{
                    'id': row[0],
                    'timestamp': row[1],
                    'type': row[2],
                    'severity': row[3],
                    'status': row[4],
                    'source': row[5],
                    'description': row[6],
                    'evidence': row[7],
                    'resolution': row[8],
                    'created_at': row[9]
                } for row in rows]
        except Exception as e:
            logger.error(f"Error getting scoped anomalies: {str(e)}")
            return []

    # ===== ROLE-BASED ACCESS CONTROL & SESSION MANAGEMENT =====
    
    async def update_user_login(self, user_id: int) -> bool:
        """Update user login timestamp and count."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                await conn.execute("""
                    UPDATE users 
                    SET last_login = ?, login_count = login_count + 1, updated_at = ?
                    WHERE id = ?
                """, (datetime.now().isoformat(), datetime.now().isoformat(), user_id))
                
                await conn.commit()
                logger.info(f"Updated login for user {user_id}")
                return True
        except Exception as e:
            logger.error(f"Error updating user login: {str(e)}")
            return False

    async def update_user_logout(self, user_id: int) -> bool:
        """Update user logout timestamp."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                await conn.execute("""
                    UPDATE users 
                    SET last_logout = ?, updated_at = ?
                    WHERE id = ?
                """, (datetime.now().isoformat(), datetime.now().isoformat(), user_id))
                
                await conn.commit()
                logger.info(f"Updated logout for user {user_id}")
                return True
        except Exception as e:
            logger.error(f"Error updating user logout: {str(e)}")
            return False

    async def get_user_with_session_info(self, user_id: int) -> Optional[Dict]:
        """Get user with session and role information."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.execute("""
                    SELECT id, username, email, role, is_active, 
                           last_login, last_logout, login_count, created_at
                    FROM users 
                    WHERE id = ? AND is_active = 1
                """, (user_id,))
                
                row = await cursor.fetchone()
                if row:
                    return {
                        'id': row[0],
                        'username': row[1],
                        'email': row[2],
                        'role': row[3],
                        'is_active': bool(row[4]),
                        'last_login': row[5],
                        'last_logout': row[6],
                        'login_count': row[7] or 0,
                        'created_at': row[8]
                    }
                return None
        except Exception as e:
            logger.error(f"Error getting user session info: {str(e)}")
            return None

    async def update_user_role(self, user_id: int, new_role: str) -> bool:
        """Update user role (superadmin only operation)."""
        try:
            if new_role not in [role.value for role in UserRole]:
                raise ValueError(f"Invalid role: {new_role}")
                
            async with aiosqlite.connect(self.db_path) as conn:
                await conn.execute("""
                    UPDATE users 
                    SET role = ?, updated_at = ?
                    WHERE id = ?
                """, (new_role, datetime.now().isoformat(), user_id))
                
                await conn.commit()
                logger.info(f"Updated role for user {user_id} to {new_role}")
                return True
        except Exception as e:
            logger.error(f"Error updating user role: {str(e)}")
            return False

    async def get_all_users_for_admin(self, requesting_user_role: str) -> List[Dict]:
        """Get all users for admin interface (superadmin only)."""
        try:
            if requesting_user_role != UserRole.SUPERADMIN.value:
                raise PermissionError("Only superadmin can view all users")
                
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.execute("""
                    SELECT u.id, u.username, u.email, u.role, u.is_active,
                           u.last_login, u.last_logout, u.login_count, u.created_at,
                           GROUP_CONCAT(o.name) as organizations
                    FROM users u
                    LEFT JOIN org_users ou ON u.id = ou.user_id
                    LEFT JOIN organizations o ON ou.organization_id = o.id
                    GROUP BY u.id
                    ORDER BY u.created_at DESC
                """)
                
                rows = await cursor.fetchall()
                users = []
                
                for row in rows:
                    users.append({
                        'id': row[0],
                        'username': row[1],
                        'email': row[2],
                        'role': row[3],
                        'is_active': bool(row[4]),
                        'last_login': row[5],
                        'last_logout': row[6],
                        'login_count': row[7] or 0,
                        'created_at': row[8],
                        'organizations': row[9].split(',') if row[9] else []
                    })
                
                return users
        except Exception as e:
            logger.error(f"Error getting all users for admin: {str(e)}")
            return []

    async def get_organization_users(self, org_id: str, requesting_user_role: str) -> List[Dict]:
        """Get users for a specific organization (platform_admin and above)."""
        try:
            if requesting_user_role not in [UserRole.SUPERADMIN.value, UserRole.MANAGER.value]:
                raise PermissionError("Insufficient permissions to view organization users")
                
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.execute("""
                    SELECT u.id, u.username, u.email, u.role, u.is_active,
                           u.last_login, u.last_logout, u.login_count, ou.role as org_role
                    FROM users u
                    JOIN org_users ou ON u.id = ou.user_id
                    WHERE ou.organization_id = ?
                    ORDER BY u.created_at DESC
                """, (org_id,))
                
                rows = await cursor.fetchall()
                users = []
                
                for row in rows:
                    users.append({
                        'id': row[0],
                        'username': row[1],
                        'email': row[2],
                        'role': row[3],
                        'is_active': bool(row[4]),
                        'last_login': row[5],
                        'last_logout': row[6],
                        'login_count': row[7] or 0,
                        'org_role': row[8]
                    })
                
                return users
        except Exception as e:
            logger.error(f"Error getting organization users: {str(e)}")
            return []

    async def create_superadmin_user(self, username: str, email: str, password_hash: str) -> int:
        """Create a superadmin user (for initial setup)."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.execute("""
                    INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at)
                    VALUES (?, ?, ?, ?, 1, ?, ?)
                """, (
                    username, email, password_hash, UserRole.SUPERADMIN.value,
                    datetime.now().isoformat(), datetime.now().isoformat()
                ))
                
                user_id = cursor.lastrowid
                await conn.commit()
                
                logger.info(f"Created superadmin user: {username} (ID: {user_id})")
                return user_id
        except Exception as e:
            logger.error(f"Error creating superadmin user: {str(e)}")
            raise

    async def get_audit_logs(self, requesting_user_role: str, limit: int = 100) -> List[Dict]:
        """Get audit logs for admin interface (superadmin only)."""
        try:
            if requesting_user_role != UserRole.SUPERADMIN.value:
                raise PermissionError("Only superadmin can view audit logs")
                
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.execute("""
                    SELECT l.id, l.timestamp, l.level, l.category, l.source, l.message, 
                           l.metadata, o.name as organization_name
                    FROM logs l
                    LEFT JOIN organizations o ON l.organization_id = o.id
                    WHERE l.category IN ('auth', 'admin', 'security', 'billing')
                    ORDER BY l.timestamp DESC
                    LIMIT ?
                """, (limit,))
                
                rows = await cursor.fetchall()
                logs = []
                
                for row in rows:
                    logs.append({
                        'id': row[0],
                        'timestamp': row[1],
                        'level': row[2],
                        'category': row[3],
                        'source': row[4],
                        'message': row[5],
                        'metadata': row[6],
                        'organization_name': row[7]
                    })
                
                return logs
        except Exception as e:
            logger.error(f"Error getting audit logs: {str(e)}")
            return []

    async def get_all_organizations_for_admin(self, requesting_user_role: str) -> List[Dict]:
        """Get all organizations for admin interface (superadmin only)."""
        try:
            if requesting_user_role != UserRole.SUPERADMIN.value:
                raise PermissionError("Only superadmin can view all organizations")
                
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.execute("""
                    SELECT o.id, o.name, o.owner_email, o.plan_type, o.status,
                           o.device_limit, o.created_at, o.updated_at,
                           COUNT(ou.user_id) as user_count,
                           bu.device_count, bu.scan_count, bu.log_count
                    FROM organizations o
                    LEFT JOIN org_users ou ON o.id = ou.organization_id
                    LEFT JOIN billing_usage bu ON o.id = bu.organization_id 
                        AND bu.month = ?
                    GROUP BY o.id
                    ORDER BY o.created_at DESC
                """, (datetime.now().strftime('%Y-%m'),))
                
                rows = await cursor.fetchall()
                organizations = []
                
                for row in rows:
                    organizations.append({
                        'id': row[0],
                        'name': row[1],
                        'owner_email': row[2],
                        'plan_type': row[3],
                        'status': row[4],
                        'device_limit': row[5],
                        'created_at': row[6],
                        'updated_at': row[7],
                        'user_count': row[8] or 0,
                        'current_usage': {
                            'device_count': row[9] or 0,
                            'scan_count': row[10] or 0,
                            'log_count': row[11] or 0
                        }
                    })
                
                return organizations
        except Exception as e:
            logger.error(f"Error getting all organizations for admin: {str(e)}")
            return []

    def has_permission(self, user_role: str, required_permission: str) -> bool:
        """Check if user role has required permission."""
        permissions = {
            UserRole.SUPERADMIN.value: [
                'view_all_organizations', 'manage_organizations', 'view_all_users',
                'manage_users', 'view_audit_logs', 'manage_billing', 'system_admin'
            ],
            UserRole.MANAGER.value: [
                'view_organization', 'manage_organization_users', 'manage_settings',
                'view_organization_logs', 'manage_alerts', 'view_billing'
            ],
            UserRole.ANALYST.value: [
                'view_dashboard', 'view_logs', 'view_network', 'view_security',
                'view_anomalies', 'view_profile'
            ]
        }
        
        user_permissions = permissions.get(user_role, [])
        return required_permission in user_permissions

    async def seed_default_users(self) -> bool:
        """Seed the 3 default development users with proper roles and organization setup."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.cursor()
                
                # Check if users already exist
                await cursor.execute("SELECT COUNT(*) FROM users")
                user_count = (await cursor.fetchone())[0]
                
                if user_count > 0:
                    logger.info("Users already exist, skipping seeding")
                    return True
                
                # Ensure default organization exists
                default_org_id = await self.ensure_default_organization()
                
                # Create the 3 default users
                users_to_create = [
                    {
                        'username': 'ceo',
                        'email': 'ceo@securenet.ai',
                        'password': 'superadmin123',
                        'role': UserRole.SUPERADMIN.value,
                        'org_id': None  # Superadmin not tied to specific org
                    },
                    {
                        'username': 'admin',
                        'email': 'admin@secureorg.com',
                        'password': 'platform123',
                        'role': UserRole.MANAGER.value,
                        'org_id': default_org_id
                    },
                    {
                        'username': 'user',
                        'email': 'user@secureorg.com',
                        'password': 'enduser123',
                        'role': UserRole.ANALYST.value,
                        'org_id': default_org_id
                    }
                ]
                
                created_users = []
                for user_data in users_to_create:
                    # Create user
                    password_hash = get_password_hash(user_data['password'])
                    await cursor.execute("""
                        INSERT INTO users (
                            username, email, password_hash, role, is_active, 
                            created_at, updated_at, login_count
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        user_data['username'],
                        user_data['email'],
                        password_hash,
                        user_data['role'],
                        1,  # is_active
                        datetime.now().isoformat(),
                        datetime.now().isoformat(),
                        0  # login_count
                    ))
                    
                    # Get the created user ID
                    user_id = cursor.lastrowid
                    created_users.append({
                        'id': user_id,
                        'username': user_data['username'],
                        'email': user_data['email'],
                        'role': user_data['role']
                    })
                    
                    # Add user to organization if specified
                    if user_data['org_id']:
                        await cursor.execute("""
                            INSERT INTO org_users (organization_id, user_id, role, created_at)
                            VALUES (?, ?, ?, ?)
                        """, (
                            user_data['org_id'],
                            user_id,
                            'admin' if user_data['role'] == UserRole.MANAGER.value else 'member',
                            datetime.now().isoformat()
                        ))
                
                await conn.commit()
                
                # Log the creation
                for user in created_users:
                    logger.info(f"Created default user: {user['username']} ({user['role']}) - {user['email']}")
                
                # Create some sample data for org_1
                await self._create_sample_org_data(default_org_id)
                
                logger.info("Successfully seeded 3 default development users")
                return True
                
        except Exception as e:
            logger.error(f"Error seeding default users: {str(e)}")
            return False

    async def _create_sample_org_data(self, org_id: str) -> None:
        """Create sample data for the default organization."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.cursor()
                
                # Create sample logs
                sample_logs = [
                    {
                        'level': 'info',
                        'category': 'system',
                        'source': 'network_scanner',
                        'message': 'Network scan completed successfully',
                        'organization_id': org_id
                    },
                    {
                        'level': 'warning',
                        'category': 'security',
                        'source': 'security_engine',
                        'message': 'Unusual network activity detected',
                        'organization_id': org_id
                    },
                    {
                        'level': 'info',
                        'category': 'auth',
                        'source': 'login_api',
                        'message': 'User authentication successful',
                        'organization_id': org_id
                    }
                ]
                
                for log in sample_logs:
                    await cursor.execute("""
                        INSERT INTO logs (
                            level, category, source, message, organization_id, timestamp
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    """, (
                        log['level'], log['category'], log['source'], 
                        log['message'], log['organization_id'], datetime.now().isoformat()
                    ))
                
                # Create sample security scan
                await cursor.execute("""
                    INSERT INTO security_scans (
                        id, type, status, findings_count, organization_id,
                        start_time, end_time, metadata
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    str(uuid.uuid4()),
                    'vulnerability',
                    'completed',
                    0,
                    org_id,
                    datetime.now().isoformat(),
                    datetime.now().isoformat(),
                    json.dumps({'scan_type': 'sample', 'devices_scanned': 7})
                ))
                
                # Create sample notification
                await cursor.execute("""
                    INSERT INTO notifications (
                        organization_id, title, message, category, severity, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    org_id,
                    'Welcome to SecureNet',
                    'Your organization has been set up successfully with sample data.',
                    'system',
                    'info',
                    datetime.now().isoformat()
                ))
                
                await conn.commit()
                logger.info(f"Created sample data for organization: {org_id}")
                
        except Exception as e:
            logger.error(f"Error creating sample org data: {str(e)}")

    async def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Get user by email address."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.execute("""
                    SELECT id, username, email, role, is_active, created_at
                    FROM users 
                    WHERE email = ? AND is_active = 1
                """, (email,))
                
                row = await cursor.fetchone()
                if row:
                    return {
                        'id': row[0],
                        'username': row[1],
                        'email': row[2],
                        'role': row[3],
                        'is_active': bool(row[4]),
                        'created_at': row[5]
                    }
                return None
        except Exception as e:
            logger.error(f"Error getting user by email: {str(e)}")
            return None

    async def create_user_admin(self, username: str, email: str, password: str, role: str, organization_id: Optional[str] = None) -> Optional[int]:
        """Create a new user (admin operation)."""
        try:
            # Hash the password
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            password_hash = pwd_context.hash(password)
            
            async with aiosqlite.connect(self.db_path) as conn:
                # Create user
                cursor = await conn.execute("""
                    INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at)
                    VALUES (?, ?, ?, ?, 1, ?, ?)
                """, (
                    username, email, password_hash, role,
                    datetime.now().isoformat(), datetime.now().isoformat()
                ))
                
                user_id = cursor.lastrowid
                
                # If organization_id is provided, add user to that organization
                if organization_id:
                    await conn.execute("""
                        INSERT INTO org_users (organization_id, user_id, role, created_at)
                        VALUES (?, ?, ?, ?)
                    """, (organization_id, user_id, 'member', datetime.now().isoformat()))
                else:
                    # Add to default organization if no specific org provided
                    default_org_id = await self.ensure_default_organization()
                    await conn.execute("""
                        INSERT INTO org_users (organization_id, user_id, role, created_at)
                        VALUES (?, ?, ?, ?)
                    """, (default_org_id, user_id, 'member', datetime.now().isoformat()))
                
                await conn.commit()
                logger.info(f"Created user: {username} (ID: {user_id})")
                return user_id
        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            return None

    async def delete_user_admin(self, user_id: int) -> bool:
        """Delete a user (admin operation)."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                # Remove from organization relationships
                await conn.execute("DELETE FROM org_users WHERE user_id = ?", (user_id,))
                
                # Mark user as inactive instead of hard delete to preserve audit trail
                await conn.execute("""
                    UPDATE users 
                    SET is_active = 0, updated_at = ?
                    WHERE id = ?
                """, (datetime.now().isoformat(), user_id))
                
                await conn.commit()
                logger.info(f"Deleted user ID: {user_id}")
                return True
        except Exception as e:
            logger.error(f"Error deleting user: {str(e)}")
            return False

    async def update_user_admin(self, user_id: int, updates: Dict) -> bool:
        """Update user information (admin operation)."""
        try:
            if not updates:
                return True
            
            # Build dynamic update query
            set_clauses = []
            values = []
            
            for field, value in updates.items():
                if field in ['username', 'email', 'role', 'is_active']:
                    set_clauses.append(f"{field} = ?")
                    values.append(value)
            
            if not set_clauses:
                return True
            
            # Add updated_at timestamp
            set_clauses.append("updated_at = ?")
            values.append(datetime.now().isoformat())
            values.append(user_id)
            
            async with aiosqlite.connect(self.db_path) as conn:
                query = f"UPDATE users SET {', '.join(set_clauses)} WHERE id = ?"
                await conn.execute(query, values)
                await conn.commit()
                
                logger.info(f"Updated user ID: {user_id} with changes: {updates}")
                return True
        except Exception as e:
            logger.error(f"Error updating user: {str(e)}")
            return False

    async def store_log(self, log_data: Dict) -> bool:
        """Store a log entry in the database."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                await conn.execute("""
                    INSERT INTO logs (timestamp, level, category, source, message, metadata)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    log_data.get('timestamp', datetime.now().isoformat()),
                    log_data.get('level', 'info'),
                    log_data.get('category', 'system'),
                    log_data.get('source', 'unknown'),
                    log_data.get('message', ''),
                    json.dumps(log_data.get('metadata', {}))
                ))
                await conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error storing log: {str(e)}")
            return False

    # ===== PROFILE MANAGEMENT METHODS =====

    async def update_user_profile(self, user_id: int, update_data: Dict) -> bool:
        """Update user profile information."""
        try:
            # Build dynamic update query
            set_clauses = []
            values = []
            
            for field, value in update_data.items():
                if field in ['name', 'email', 'phone', 'department', 'title']:
                    set_clauses.append(f"{field} = ?")
                    values.append(value)
            
            if not set_clauses:
                return False
            
            # Add updated_at timestamp
            set_clauses.append("updated_at = ?")
            values.append(datetime.now().isoformat())
            values.append(user_id)
            
            query = f"UPDATE users SET {', '.join(set_clauses)} WHERE id = ?"
            
            async with aiosqlite.connect(self.db_path) as conn:
                await conn.execute(query, values)
                await conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error updating user profile: {str(e)}")
            return False

    async def update_user_password(self, user_id: int, new_password: str) -> bool:
        """Update user password."""
        try:
            password_hash = get_password_hash(new_password)
            
            async with aiosqlite.connect(self.db_path) as conn:
                await conn.execute("""
                    UPDATE users 
                    SET password_hash = ?, updated_at = ?
                    WHERE id = ?
                """, (password_hash, datetime.now().isoformat(), user_id))
                await conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error updating user password: {str(e)}")
            return False

    async def update_user_2fa_status(self, user_id: int, enabled: bool) -> bool:
        """Update user's 2FA status."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                await conn.execute("""
                    UPDATE users 
                    SET two_factor_enabled = ?, updated_at = ?
                    WHERE id = ?
                """, (enabled, datetime.now().isoformat(), user_id))
                await conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error updating user 2FA status: {str(e)}")
            return False

    async def get_user_api_keys(self, user_id: int) -> List[Dict]:
        """Get user's API keys."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.execute("""
                    SELECT id, name, key, created_at, last_used
                    FROM user_api_keys
                    WHERE user_id = ? AND is_active = 1
                    ORDER BY created_at DESC
                """, (user_id,))
                
                rows = await cursor.fetchall()
                return [
                    {
                        'id': row[0],
                        'name': row[1],
                        'key_preview': f"{row[2][:8]}...{row[2][-4:]}",  # Show only preview
                        'created_at': row[3],
                        'last_used': row[4]
                    } for row in rows
                ]
        except Exception as e:
            logger.error(f"Error getting user API keys: {str(e)}")
            return []

    async def create_user_api_key(self, user_id: int, name: str, key: str) -> Optional[int]:
        """Create a new API key for user."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.execute("""
                    INSERT INTO user_api_keys (user_id, name, key, created_at, is_active)
                    VALUES (?, ?, ?, ?, 1)
                """, (user_id, name, key, datetime.now().isoformat()))
                
                await conn.commit()
                return cursor.lastrowid
        except Exception as e:
            logger.error(f"Error creating user API key: {str(e)}")
            return None

    async def delete_user_api_key(self, user_id: int, key_id: str) -> bool:
        """Delete user's API key."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.execute("""
                    UPDATE user_api_keys 
                    SET is_active = 0, updated_at = ?
                    WHERE id = ? AND user_id = ?
                """, (datetime.now().isoformat(), key_id, user_id))
                
                await conn.commit()
                return cursor.rowcount > 0
        except Exception as e:
            logger.error(f"Error deleting user API key: {str(e)}")
            return False

    async def get_user_sessions(self, user_id: int) -> List[Dict]:
        """Get user's active sessions."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.execute("""
                    SELECT id, device, browser, location, ip_address, last_active, is_current
                    FROM user_sessions
                    WHERE user_id = ? AND is_active = 1
                    ORDER BY last_active DESC
                """, (user_id,))
                
                rows = await cursor.fetchall()
                return [
                    {
                        'id': row[0],
                        'device': row[1],
                        'browser': row[2],
                        'location': row[3],
                        'ip_address': row[4],
                        'last_active': row[5],
                        'current': bool(row[6])
                    } for row in rows
                ]
        except Exception as e:
            logger.error(f"Error getting user sessions: {str(e)}")
            return []

    async def terminate_user_session(self, user_id: int, session_id: str) -> bool:
        """Terminate a user session."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.execute("""
                    UPDATE user_sessions 
                    SET is_active = 0, updated_at = ?
                    WHERE id = ? AND user_id = ? AND is_current = 0
                """, (datetime.now().isoformat(), session_id, user_id))
                
                await conn.commit()
                return cursor.rowcount > 0
        except Exception as e:
            logger.error(f"Error terminating user session: {str(e)}")
            return False

    async def log_user_activity(self, user_id: int, action: str, ip_address: str, user_agent: str) -> bool:
        """Log user activity."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                await conn.execute("""
                    INSERT INTO user_activity_log (user_id, action, ip_address, user_agent, timestamp)
                    VALUES (?, ?, ?, ?, ?)
                """, (user_id, action, ip_address, user_agent, datetime.now().isoformat()))
                
                await conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error logging user activity: {str(e)}")
            return False

    async def get_user_activity_log(self, user_id: int, limit: int = 50) -> List[Dict]:
        """Get user's activity log."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.execute("""
                    SELECT id, action, ip_address, user_agent, timestamp
                    FROM user_activity_log
                    WHERE user_id = ?
                    ORDER BY timestamp DESC
                    LIMIT ?
                """, (user_id, limit))
                
                rows = await cursor.fetchall()
                return [
                    {
                        'id': row[0],
                        'action': row[1],
                        'ip_address': row[2],
                        'user_agent': row[3],
                        'timestamp': row[4]
                    } for row in rows
                ]
        except Exception as e:
            logger.error(f"Error getting user activity log: {str(e)}")
            return []

    def get_role_permissions(self, role: str) -> List[str]:
        """Get permissions for a user role."""
        role_permissions = {
            'superadmin': [
                'manage_users', 'manage_organizations', 'view_audit_logs',
                'manage_settings', 'view_logs', 'manage_security',
                'manage_network', 'view_anomalies', 'manage_billing'
            ],
            'manager': [
                'manage_org_users', 'manage_settings', 'view_logs',
                'manage_security', 'manage_network', 'view_anomalies'
            ],
            'analyst': [
                'view_logs', 'view_security', 'view_network', 'view_anomalies'
            ],
            'platform_admin': [  # Legacy role mapping
                'manage_org_users', 'manage_settings', 'view_logs',
                'manage_security', 'manage_network', 'view_anomalies'
            ],
            'end_user': [  # Legacy role mapping
                'view_logs', 'view_security', 'view_network', 'view_anomalies'
            ],
            'admin': [  # Legacy role mapping
                'manage_users', 'manage_organizations', 'view_audit_logs',
                'manage_settings', 'view_logs', 'manage_security',
                'manage_network', 'view_anomalies'
            ],
            'user': [  # Legacy role mapping
                'view_logs', 'view_security', 'view_network', 'view_anomalies'
            ]
        }
        return role_permissions.get(role, [])
