"""
SecureNet PostgreSQL Enterprise Database Adapter
Replaces SQLite with enterprise-grade PostgreSQL operations
"""

import asyncio
import asyncpg
import psycopg2
from psycopg2.extras import RealDictCursor, Json
from psycopg2.pool import ThreadedConnectionPool
from sqlalchemy import create_engine, MetaData, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from contextlib import asynccontextmanager, contextmanager
from typing import Dict, Any, List, Optional, Union
import json
import logging
import os
from datetime import datetime, timezone
import uuid
from dataclasses import dataclass

from database.enterprise_models import (
    Base, Organization, User, NetworkDevice, SecurityFinding, 
    AuditLog, ComplianceControl, SecurityScan,
    UserRole, OrganizationStatus, PlanType, ThreatLevel
)

logger = logging.getLogger(__name__)

@dataclass
class DatabaseConfig:
    """Database configuration for enterprise deployment"""
    host: str = "localhost"
    port: int = 5432
    database: str = "securenet"
    username: str = "securenet"
    password: str = ""
    
    # Connection pool settings
    min_connections: int = 5
    max_connections: int = 50
    connection_timeout: int = 30
    command_timeout: int = 60
    
    # Performance settings
    pool_size: int = 20
    max_overflow: int = 30
    pool_timeout: int = 30
    pool_recycle: int = 3600
    
    # SSL settings
    ssl_mode: str = "require"
    ssl_cert: Optional[str] = None
    ssl_key: Optional[str] = None
    ssl_ca: Optional[str] = None

class PostgreSQLAdapter:
    """Enterprise PostgreSQL database adapter"""
    
    def __init__(self, config: DatabaseConfig):
        self.config = config
        self._engine = None
        self._session_factory = None
        self._connection_pool = None
        self._async_pool = None
        
    @property
    def database_url(self) -> str:
        """Generate PostgreSQL connection URL"""
        url = f"postgresql://{self.config.username}:{self.config.password}@{self.config.host}:{self.config.port}/{self.config.database}"
        
        params = []
        if self.config.ssl_mode:
            params.append(f"sslmode={self.config.ssl_mode}")
        if self.config.ssl_cert:
            params.append(f"sslcert={self.config.ssl_cert}")
        if self.config.ssl_key:
            params.append(f"sslkey={self.config.ssl_key}")
        if self.config.ssl_ca:
            params.append(f"sslrootcert={self.config.ssl_ca}")
            
        if params:
            url += "?" + "&".join(params)
            
        return url
    
    async def initialize(self):
        """Initialize database connections and schema"""
        try:
            # Create SQLAlchemy engine
            self._engine = create_engine(
                self.database_url,
                poolclass=QueuePool,
                pool_size=self.config.pool_size,
                max_overflow=self.config.max_overflow,
                pool_timeout=self.config.pool_timeout,
                pool_recycle=self.config.pool_recycle,
                pool_pre_ping=True,
                echo=False  # Set to True for SQL debugging
            )
            
            # Create session factory
            self._session_factory = sessionmaker(
                bind=self._engine,
                autocommit=False,
                autoflush=False
            )
            
            # Create async connection pool
            self._async_pool = await asyncpg.create_pool(
                host=self.config.host,
                port=self.config.port,
                user=self.config.username,
                password=self.config.password,
                database=self.config.database,
                min_size=self.config.min_connections,
                max_size=self.config.max_connections,
                command_timeout=self.config.command_timeout,
                ssl=self.config.ssl_mode if self.config.ssl_mode != "disable" else None
            )
            
            # Create sync connection pool
            self._connection_pool = ThreadedConnectionPool(
                minconn=self.config.min_connections,
                maxconn=self.config.max_connections,
                host=self.config.host,
                port=self.config.port,
                user=self.config.username,
                password=self.config.password,
                database=self.config.database
            )
            
            logger.info("PostgreSQL adapter initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize PostgreSQL adapter: {e}")
            raise
    
    async def create_schema(self):
        """Create database schema and initial data"""
        try:
            # Create tables
            Base.metadata.create_all(self._engine)
            
            # Create additional indexes and functions
            with self._engine.connect() as conn:
                # Create search vector update function
                conn.execute(text("""
                    CREATE OR REPLACE FUNCTION update_security_finding_search_vector()
                    RETURNS TRIGGER AS $$
                    BEGIN
                        NEW.search_vector := to_tsvector('english', 
                            COALESCE(NEW.title, '') || ' ' || 
                            COALESCE(NEW.description, '') || ' ' ||
                            COALESCE(NEW.cve_id, '')
                        );
                        RETURN NEW;
                    END;
                    $$ LANGUAGE plpgsql;
                """))
                
                # Create trigger for search vector updates
                conn.execute(text("""
                    DROP TRIGGER IF EXISTS security_finding_search_vector_trigger ON security_findings;
                    CREATE TRIGGER security_finding_search_vector_trigger
                        BEFORE INSERT OR UPDATE ON security_findings
                        FOR EACH ROW EXECUTE PROCEDURE update_security_finding_search_vector();
                """))
                
                # Create additional indexes
                conn.execute(text("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active ON users (id) WHERE is_active = true;"))
                conn.execute(text("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_devices_active ON network_devices (id) WHERE status = 'active';"))
                conn.execute(text("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_findings_org_severity_status ON security_findings (organization_id, severity, status);"))
                
                conn.commit()
            
            logger.info("Database schema created successfully")
            
        except Exception as e:
            logger.error(f"Failed to create database schema: {e}")
            raise
    
    @contextmanager
    def get_session(self) -> Session:
        """Get a database session"""
        session = self._session_factory()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
    
    @asynccontextmanager
    async def get_async_connection(self):
        """Get an async database connection"""
        async with self._async_pool.acquire() as conn:
            yield conn
    
    def get_sync_connection(self):
        """Get a sync database connection"""
        return self._connection_pool.getconn()
    
    def return_sync_connection(self, conn):
        """Return a sync database connection to the pool"""
        self._connection_pool.putconn(conn)
    
    # User Management
    async def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user"""
        async with self.get_async_connection() as conn:
            user_id = uuid.uuid4()
            
            await conn.execute("""
                INSERT INTO users (
                    id, organization_id, username, email, password_hash,
                    first_name, last_name, role, is_active, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            """, 
            user_id,
            uuid.UUID(user_data['organization_id']),
            user_data['username'],
            user_data['email'],
            user_data['password_hash'],
            user_data.get('first_name'),
            user_data.get('last_name'),
            user_data.get('role', 'soc_analyst'),
            user_data.get('is_active', True),
            datetime.now(timezone.utc)
            )
            
            # Log user creation
            await self.create_audit_log({
                'organization_id': user_data['organization_id'],
                'event_type': 'user_created',
                'resource_type': 'user',
                'resource_id': str(user_id),
                'action': f"Created user {user_data['username']}",
                'success': True
            })
            
            return {'id': str(user_id), **user_data}
    
    async def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username"""
        async with self.get_async_connection() as conn:
            row = await conn.fetchrow("""
                SELECT u.*, o.name as organization_name, o.plan_type
                FROM users u
                LEFT JOIN organizations o ON u.organization_id = o.id
                WHERE u.username = $1 AND u.is_active = true
            """, username)
            
            return dict(row) if row else None
    
    async def update_user_login(self, user_id: str, ip_address: str = None, user_agent: str = None):
        """Update user login information"""
        async with self.get_async_connection() as conn:
            await conn.execute("""
                UPDATE users SET 
                    last_login = $1,
                    login_count = login_count + 1,
                    failed_login_attempts = 0
                WHERE id = $2
            """, datetime.now(timezone.utc), uuid.UUID(user_id))
            
            # Log successful login
            await self.create_audit_log({
                'user_id': user_id,
                'event_type': 'login_success',
                'action': 'User logged in successfully',
                'ip_address': ip_address,
                'user_agent': user_agent,
                'success': True
            })
    
    # Organization Management
    async def create_organization(self, org_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new organization"""
        async with self.get_async_connection() as conn:
            org_id = uuid.uuid4()
            
            await conn.execute("""
                INSERT INTO organizations (
                    id, name, slug, status, plan_type, primary_contact_email,
                    device_limit, user_limit, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """,
            org_id,
            org_data['name'],
            org_data['slug'],
            org_data.get('status', 'active'),
            org_data.get('plan_type', 'free'),
            org_data['primary_contact_email'],
            org_data.get('device_limit', 10),
            org_data.get('user_limit', 5),
            datetime.now(timezone.utc)
            )
            
            return {'id': str(org_id), **org_data}
    
    async def get_organization_by_id(self, org_id: str) -> Optional[Dict[str, Any]]:
        """Get organization by ID"""
        async with self.get_async_connection() as conn:
            row = await conn.fetchrow("""
                SELECT * FROM organizations WHERE id = $1
            """, uuid.UUID(org_id))
            
            return dict(row) if row else None
    
    # Device Management
    async def create_device(self, device_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new network device"""
        async with self.get_async_connection() as conn:
            device_id = uuid.uuid4()
            
            await conn.execute("""
                INSERT INTO network_devices (
                    id, organization_id, name, ip_address, mac_address,
                    device_type, status, discovery_method, created_at, last_seen
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            """,
            device_id,
            uuid.UUID(device_data['organization_id']),
            device_data['name'],
            device_data['ip_address'],
            device_data.get('mac_address'),
            device_data['device_type'],
            device_data.get('status', 'active'),
            device_data.get('discovery_method', 'scan'),
            datetime.now(timezone.utc),
            datetime.now(timezone.utc)
            )
            
            return {'id': str(device_id), **device_data}
    
    async def get_devices_by_organization(self, org_id: str, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """Get devices for an organization"""
        async with self.get_async_connection() as conn:
            rows = await conn.fetch("""
                SELECT * FROM network_devices 
                WHERE organization_id = $1 
                ORDER BY last_seen DESC
                LIMIT $2 OFFSET $3
            """, uuid.UUID(org_id), limit, offset)
            
            return [dict(row) for row in rows]
    
    async def update_device_risk_score(self, device_id: str):
        """Update device risk score based on vulnerabilities"""
        async with self.get_async_connection() as conn:
            # Calculate risk score
            risk_data = await conn.fetchrow("""
                SELECT 
                    COUNT(*) as total_vulns,
                    COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
                    COUNT(*) FILTER (WHERE severity = 'high') as high_count,
                    COUNT(*) FILTER (WHERE severity = 'medium') as medium_count
                FROM security_findings 
                WHERE device_id = $1 AND status = 'open'
            """, uuid.UUID(device_id))
            
            # Calculate weighted risk score
            risk_score = (
                (risk_data['critical_count'] * 10) +
                (risk_data['high_count'] * 5) +
                (risk_data['medium_count'] * 2)
            )
            risk_score = min(risk_score, 100)  # Cap at 100
            
            # Update device
            await conn.execute("""
                UPDATE network_devices SET
                    risk_score = $1,
                    vulnerability_count = $2,
                    updated_at = $3
                WHERE id = $4
            """, 
            risk_score, 
            risk_data['total_vulns'],
            datetime.now(timezone.utc),
            uuid.UUID(device_id)
            )
    
    # Security Findings
    async def create_security_finding(self, finding_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new security finding"""
        async with self.get_async_connection() as conn:
            finding_id = uuid.uuid4()
            
            await conn.execute("""
                INSERT INTO security_findings (
                    id, organization_id, device_id, finding_type, severity,
                    title, description, cve_id, cvss_score, risk_score,
                    status, discovered_at, detection_method
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            """,
            finding_id,
            uuid.UUID(finding_data['organization_id']),
            uuid.UUID(finding_data['device_id']) if finding_data.get('device_id') else None,
            finding_data['finding_type'],
            finding_data['severity'],
            finding_data['title'],
            finding_data.get('description'),
            finding_data.get('cve_id'),
            finding_data.get('cvss_score'),
            finding_data['risk_score'],
            finding_data.get('status', 'open'),
            datetime.now(timezone.utc),
            finding_data['detection_method']
            )
            
            # Update device risk score if applicable
            if finding_data.get('device_id'):
                await self.update_device_risk_score(finding_data['device_id'])
            
            return {'id': str(finding_id), **finding_data}
    
    async def search_security_findings(self, org_id: str, query: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Search security findings using full-text search"""
        async with self.get_async_connection() as conn:
            rows = await conn.fetch("""
                SELECT sf.*, nd.name as device_name, nd.ip_address
                FROM security_findings sf
                LEFT JOIN network_devices nd ON sf.device_id = nd.id
                WHERE sf.organization_id = $1 
                AND sf.search_vector @@ to_tsquery('english', $2)
                ORDER BY sf.discovered_at DESC
                LIMIT $3
            """, uuid.UUID(org_id), query, limit)
            
            return [dict(row) for row in rows]
    
    # Audit Logging
    async def create_audit_log(self, log_data: Dict[str, Any]):
        """Create an audit log entry"""
        async with self.get_async_connection() as conn:
            await conn.execute("""
                INSERT INTO audit_logs (
                    id, organization_id, user_id, event_type, resource_type,
                    resource_id, action, ip_address, user_agent, success,
                    details, timestamp, retention_date
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            """,
            uuid.uuid4(),
            uuid.UUID(log_data['organization_id']) if log_data.get('organization_id') else None,
            uuid.UUID(log_data['user_id']) if log_data.get('user_id') else None,
            log_data['event_type'],
            log_data.get('resource_type'),
            log_data.get('resource_id'),
            log_data['action'],
            log_data.get('ip_address'),
            log_data.get('user_agent'),
            log_data['success'],
            Json(log_data.get('details', {})),
            datetime.now(timezone.utc),
            datetime.now(timezone.utc).replace(year=datetime.now().year + 7)  # 7-year retention
            )
    
    async def get_audit_logs(self, org_id: str, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """Get audit logs for an organization"""
        async with self.get_async_connection() as conn:
            rows = await conn.fetch("""
                SELECT al.*, u.username, u.email
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE al.organization_id = $1
                ORDER BY al.timestamp DESC
                LIMIT $2 OFFSET $3
            """, uuid.UUID(org_id), limit, offset)
            
            return [dict(row) for row in rows]
    
    # Metrics and Analytics
    async def get_security_metrics(self, org_id: str) -> Dict[str, Any]:
        """Get security metrics for an organization"""
        async with self.get_async_connection() as conn:
            metrics = await conn.fetchrow("""
                SELECT 
                    COUNT(DISTINCT nd.id) as total_devices,
                    COUNT(DISTINCT nd.id) FILTER (WHERE nd.status = 'active') as active_devices,
                    COUNT(sf.id) as total_findings,
                    COUNT(sf.id) FILTER (WHERE sf.severity = 'critical' AND sf.status = 'open') as critical_open,
                    COUNT(sf.id) FILTER (WHERE sf.severity = 'high' AND sf.status = 'open') as high_open,
                    AVG(nd.risk_score) as avg_risk_score
                FROM network_devices nd
                LEFT JOIN security_findings sf ON nd.id = sf.device_id
                WHERE nd.organization_id = $1
            """, uuid.UUID(org_id))
            
            return dict(metrics)
    
    async def close(self):
        """Close database connections"""
        try:
            if self._async_pool:
                await self._async_pool.close()
            if self._connection_pool:
                self._connection_pool.closeall()
            if self._engine:
                self._engine.dispose()
            logger.info("PostgreSQL adapter closed successfully")
        except Exception as e:
            logger.error(f"Error closing PostgreSQL adapter: {e}")

# Global database adapter instance
db_adapter: Optional[PostgreSQLAdapter] = None

def get_database_adapter() -> PostgreSQLAdapter:
    """Get the global database adapter"""
    global db_adapter
    if db_adapter is None:
        config = DatabaseConfig(
            host=os.getenv("POSTGRES_HOST", "localhost"),
            port=int(os.getenv("POSTGRES_PORT", "5432")),
            database=os.getenv("POSTGRES_DB", "securenet"),
            username=os.getenv("POSTGRES_USER", "securenet"),
            password=os.getenv("POSTGRES_PASSWORD", ""),
        )
        db_adapter = PostgreSQLAdapter(config)
    return db_adapter

async def initialize_database():
    """Initialize the database adapter"""
    adapter = get_database_adapter()
    await adapter.initialize()
    await adapter.create_schema()
    return adapter 