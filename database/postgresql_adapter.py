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
import time

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

# Enhanced connection pool configuration for production
PRODUCTION_POOL_CONFIG = {
    "min_connections": 10,
    "max_connections": 100,
    "max_idle": 30,  # Maximum idle time in seconds
    "retry_attempts": 3,
    "retry_delay": 1.0,  # Seconds between retries
    "connection_timeout": 10,  # Connection timeout in seconds
    "command_timeout": 30,  # SQL command timeout in seconds
}

# Performance monitoring configuration
PERFORMANCE_MONITORING = {
    "slow_query_threshold": 50,  # Log queries slower than 50ms
    "enable_query_stats": True,
    "log_connections": True,
    "log_disconnections": True,
}

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
            # Check if tables already exist
            with self._engine.connect() as conn:
                result = conn.execute(text("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'"))
                tables_exist = result.scalar() > 0
            
            if tables_exist:
                logger.info("Database tables already exist, skipping schema creation")
                return
            
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
            # Don't raise the exception, just log it and continue
            logger.info("Continuing with existing database schema")
    
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
        try:
            async with self.get_async_connection() as conn:
                query = """
                    INSERT INTO users (
                        id, username, email, password_hash, first_name, last_name, 
                        phone, role, organization_id, organization_name, is_active, 
                        created_at, license_type, is_organization_owner
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                    RETURNING *
                """
                row = await conn.fetchrow(
                    query,
                    user_data["id"],
                    user_data["username"],
                    user_data["email"],
                    user_data["password_hash"],
                    user_data.get("first_name"),
                    user_data.get("last_name"),
                    user_data.get("phone"),
                    user_data["role"],
                    user_data["organization_id"],
                    user_data.get("organization_name"),
                    user_data.get("is_active", True),
                    user_data.get("created_at", datetime.now(timezone.utc)),
                    user_data.get("license_type"),
                    user_data.get("is_organization_owner", False)
                )
                return dict(row)
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            raise
    
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
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email address"""
        try:
            async with self.get_async_connection() as conn:
                query = """
                    SELECT u.*, o.name as organization_name, o.plan_type
                    FROM users u
                    LEFT JOIN organizations o ON u.organization_id = o.id
                    WHERE u.email = $1 AND u.is_active = true
                """
                row = await conn.fetchrow(query, email)
                return dict(row) if row else None
        except Exception as e:
            logger.error(f"Error getting user by email: {e}")
            return None
    
    # Organization Management
    async def create_organization(self, org_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new organization"""
        try:
            async with self.get_async_connection() as conn:
                query = """
                    INSERT INTO organizations (
                        id, name, status, plan_type, created_at, company_size, industry
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING *
                """
                row = await conn.fetchrow(
                    query,
                    org_data["id"],
                    org_data["name"],
                    org_data.get("status", "active"),
                    org_data.get("plan_type", "basic_user"),
                    org_data.get("created_at", datetime.now(timezone.utc)),
                    org_data.get("company_size"),
                    org_data.get("industry")
                )
                return dict(row)
        except Exception as e:
            logger.error(f"Error creating organization: {e}")
            raise
    
    async def get_organization_by_id(self, org_id: str) -> Optional[Dict[str, Any]]:
        """Get organization by ID"""
        async with self.get_async_connection() as conn:
            row = await conn.fetchrow("""
                SELECT * FROM organizations WHERE id = $1
            """, uuid.UUID(org_id))
            
            return dict(row) if row else None
    
    async def update_organization_setup(self, org_id: str, setup_data: Dict[str, Any]) -> bool:
        """Update organization with setup information"""
        try:
            async with self.get_async_connection() as conn:
                query = """
                    UPDATE organizations 
                    SET network_ranges = $2, security_policies = $3, 
                        compliance_frameworks = $4, scan_frequency = $5,
                        setup_completed = $6, setup_completed_at = $7,
                        updated_at = $8
                    WHERE id = $1
                """
                await conn.execute(
                    query,
                    org_id,
                    json.dumps(setup_data.get("network_ranges", [])),
                    json.dumps(setup_data.get("security_policies", [])),
                    json.dumps(setup_data.get("compliance_frameworks", [])),
                    setup_data.get("scan_frequency", "daily"),
                    setup_data.get("setup_completed", False),
                    setup_data.get("setup_completed_at"),
                    datetime.now(timezone.utc)
                )
                return True
        except Exception as e:
            logger.error(f"Error updating organization setup: {e}")
            return False
    
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
        # Parse DATABASE_URL if available, otherwise use individual env vars
        database_url = os.getenv("DATABASE_URL")
        if database_url:
            # Parse DATABASE_URL: postgresql+asyncpg://user:pass@host:port/db?sslmode=disable
            import urllib.parse
            parsed = urllib.parse.urlparse(database_url)
            
            # Extract SSL mode from query parameters
            query_params = urllib.parse.parse_qs(parsed.query)
            ssl_mode = query_params.get('sslmode', ['disable'])[0]
            
            config = DatabaseConfig(
                host=parsed.hostname or "localhost",
                port=parsed.port or 5432,
                database=parsed.path.lstrip('/') or "securenet",
                username=parsed.username or "securenet",
                password=parsed.password or "",
                ssl_mode=ssl_mode
            )
        else:
            # Fallback to individual environment variables
            config = DatabaseConfig(
                host=os.getenv("POSTGRES_HOST", "localhost"),
                port=int(os.getenv("POSTGRES_PORT", "5432")),
                database=os.getenv("POSTGRES_DB", "securenet"),
                username=os.getenv("POSTGRES_USER", "securenet"),
                password=os.getenv("POSTGRES_PASSWORD", ""),
                ssl_mode=os.getenv("POSTGRES_SSL_MODE", "disable")
            )
        db_adapter = PostgreSQLAdapter(config)
    return db_adapter

async def initialize_database():
    """Initialize the database adapter"""
    adapter = get_database_adapter()
    await adapter.initialize()
    await adapter.create_schema()
    return adapter

# Day 1 Performance Optimization Implementation
async def create_optimized_connection_pool():
    """
    Create an optimized connection pool for production workloads
    Implements Day 1 Sprint 1 connection pool optimization
    """
    logger = logging.getLogger(__name__)
    
    pool_config = PRODUCTION_POOL_CONFIG.copy()
    
    try:
        # Create connection pool with optimized settings
        pool = await asyncpg.create_pool(
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", 5432)),
            user=os.getenv("DB_USER", "securenet"),
            password=os.getenv("DB_PASSWORD", "securenet"),
            database=os.getenv("DB_NAME", "securenet"),
            min_size=pool_config["min_connections"],
            max_size=pool_config["max_connections"],
            command_timeout=pool_config["command_timeout"],
            server_settings={
                'application_name': 'SecureNet-Production',
                'timezone': 'UTC',
            }
        )
        
        # Test pool connectivity
        async with pool.acquire() as connection:
            start_time = time.time()
            await connection.fetchval("SELECT 1")
            connection_time = (time.time() - start_time) * 1000
            
            logger.info(f"Database pool initialized successfully")
            logger.info(f"Connection test: {connection_time:.2f}ms")
            logger.info(f"Pool size: {pool_config['min_connections']}-{pool_config['max_connections']}")
        
        return pool
        
    except Exception as e:
        logger.error(f"Failed to create optimized connection pool: {e}")
        raise

async def execute_performance_optimization():
    """
    Execute Day 1 database performance optimization script
    """
    logger = logging.getLogger(__name__)
    
    try:
        # Read the optimization SQL script
        with open("database/performance_optimization.sql", "r") as f:
            optimization_sql = f.read()
        
        # Split into individual statements
        statements = [stmt.strip() for stmt in optimization_sql.split(';') if stmt.strip()]
        
        # Execute each statement
        pool = await create_optimized_connection_pool()
        async with pool.acquire() as connection:
            for i, statement in enumerate(statements):
                if statement.startswith('--') or not statement:
                    continue
                
                try:
                    start_time = time.time()
                    await connection.execute(statement)
                    execution_time = (time.time() - start_time) * 1000
                    
                    logger.info(f"Executed optimization {i+1}: {execution_time:.2f}ms")
                    
                except Exception as e:
                    logger.warning(f"Optimization statement {i+1} failed: {e}")
        
        await pool.close()
        logger.info("Database performance optimization completed successfully")
        
    except Exception as e:
        logger.error(f"Performance optimization failed: {e}")
        raise

# Performance monitoring utilities
async def get_query_performance_stats(pool):
    """
    Get current query performance statistics
    """
    async with pool.acquire() as connection:
        # Check slow queries
        slow_queries = await connection.fetch("""
            SELECT query, calls, total_time, mean_time, rows
            FROM pg_stat_statements
            WHERE mean_time > $1
            ORDER BY mean_time DESC
            LIMIT 10
        """, PERFORMANCE_MONITORING["slow_query_threshold"])
        
        # Check index usage
        index_usage = await connection.fetch("""
            SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
            FROM pg_stat_user_indexes
            WHERE idx_scan < 100  -- Potentially unused indexes
            ORDER BY idx_scan ASC
            LIMIT 10
        """)
        
        return {
            "slow_queries": [dict(record) for record in slow_queries],
            "low_usage_indexes": [dict(record) for record in index_usage]
        } 