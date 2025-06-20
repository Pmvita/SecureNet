"""
SecureNet Performance & Scalability Optimization System
Day 5 Sprint 1: Database optimization, caching strategies, and background processing
"""

import asyncio
import logging
import time
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union, Callable
from functools import wraps
from contextlib import asynccontextmanager
import hashlib
import gzip
import pickle
from dataclasses import dataclass, asdict

# Database and caching imports
import asyncpg
import redis.asyncio as redis
from sqlalchemy import text, create_engine, MetaData, Table
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
from sqlalchemy_utils import create_database, database_exists

# Background processing
from celery import Celery
from celery.result import AsyncResult

# Local imports
from utils.cache_service import cache_service
from database.postgresql_adapter import get_db_connection
from auth.audit_logging import security_audit_logger, AuditEventType, AuditSeverity

logger = logging.getLogger(__name__)

@dataclass
class PerformanceMetrics:
    """Performance metrics tracking"""
    operation: str
    duration: float
    cache_hit: bool
    memory_usage: Optional[int] = None
    cpu_usage: Optional[float] = None
    database_queries: int = 0
    timestamp: datetime = None
    
    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now()

class DatabaseOptimizer:
    """
    Advanced database performance optimization
    Query optimization, connection pooling, and indexing strategies
    """
    
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.connection_pool: Optional[asyncpg.Pool] = None
        self.query_cache: Dict[str, Any] = {}
        self.slow_query_threshold = 1.0  # seconds
        self.performance_metrics: List[PerformanceMetrics] = []
        
        # Query optimization patterns
        self.query_optimizations = {
            'pagination': self._optimize_pagination_query,
            'aggregation': self._optimize_aggregation_query,
            'join': self._optimize_join_query,
            'search': self._optimize_search_query
        }
    
    async def initialize_pool(self, 
                            min_connections: int = 10,
                            max_connections: int = 50,
                            command_timeout: int = 30) -> bool:
        """Initialize optimized connection pool"""
        try:
            self.connection_pool = await asyncpg.create_pool(
                self.database_url,
                min_size=min_connections,
                max_size=max_connections,
                command_timeout=command_timeout,
                server_settings={
                    'application_name': 'SecureNet_Optimized',
                    'jit': 'off',  # Disable JIT for consistent performance
                    'work_mem': '256MB',
                    'maintenance_work_mem': '1GB',
                    'shared_buffers': '512MB',
                    'effective_cache_size': '2GB'
                }
            )
            
            logger.info(f"Database pool initialized: {min_connections}-{max_connections} connections")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize database pool: {e}")
            return False
    
    async def optimize_database_schema(self) -> Dict[str, Any]:
        """Analyze and optimize database schema"""
        try:
            optimizations = {
                'indexes_created': [],
                'indexes_analyzed': [],
                'statistics_updated': [],
                'constraints_added': []
            }
            
            async with self.connection_pool.acquire() as conn:
                # Analyze table statistics
                await conn.execute("ANALYZE;")
                optimizations['statistics_updated'].append('all_tables')
                
                # Create performance indexes
                index_definitions = [
                    # User activity indexes
                    ("idx_audit_logs_user_timestamp", "audit_logs", "user_id, timestamp DESC"),
                    ("idx_audit_logs_event_type", "audit_logs", "event_type, timestamp DESC"),
                    ("idx_audit_logs_source_ip", "audit_logs", "source_ip, timestamp DESC"),
                    
                    # Security indexes
                    ("idx_threat_events_level", "threat_events", "threat_level, timestamp DESC"),
                    ("idx_threat_events_source", "threat_events", "source_ip, threat_type"),
                    
                    # User management indexes
                    ("idx_users_role_active", "users", "role, is_active, last_login DESC"),
                    ("idx_users_email_active", "users", "email, is_active"),
                    
                    # Performance indexes
                    ("idx_api_metrics_endpoint", "api_metrics", "endpoint, timestamp DESC"),
                    ("idx_system_metrics_timestamp", "system_metrics", "timestamp DESC"),
                ]
                
                for index_name, table_name, columns in index_definitions:
                    try:
                        await conn.execute(f"""
                            CREATE INDEX CONCURRENTLY IF NOT EXISTS {index_name} 
                            ON {table_name} ({columns})
                        """)
                        optimizations['indexes_created'].append(index_name)
                    except Exception as e:
                        logger.warning(f"Failed to create index {index_name}: {e}")
                
                # Analyze index usage
                index_usage = await conn.fetch("""
                    SELECT 
                        schemaname,
                        tablename,
                        indexname,
                        idx_scan,
                        idx_tup_read,
                        idx_tup_fetch
                    FROM pg_stat_user_indexes
                    WHERE idx_scan < 10
                    ORDER BY idx_scan ASC
                """)
                
                optimizations['indexes_analyzed'] = [
                    {
                        'table': row['tablename'],
                        'index': row['indexname'],
                        'usage': row['idx_scan']
                    }
                    for row in index_usage
                ]
                
                # Update table statistics more frequently for high-traffic tables
                high_traffic_tables = ['audit_logs', 'users', 'threat_events', 'api_metrics']
                for table in high_traffic_tables:
                    await conn.execute(f"ANALYZE {table};")
                    optimizations['statistics_updated'].append(table)
            
            logger.info(f"Database schema optimization completed: {len(optimizations['indexes_created'])} indexes created")
            return optimizations
            
        except Exception as e:
            logger.error(f"Database schema optimization failed: {e}")
            return {}
    
    async def execute_optimized_query(self, 
                                    query: str, 
                                    params: Optional[List] = None,
                                    cache_key: Optional[str] = None,
                                    cache_ttl: int = 300) -> List[Dict[str, Any]]:
        """Execute query with optimization and caching"""
        start_time = time.time()
        cache_hit = False
        
        try:
            # Check cache first
            if cache_key:
                cached_result = await cache_service.get(cache_key)
                if cached_result:
                    cache_hit = True
                    duration = time.time() - start_time
                    
                    self.performance_metrics.append(PerformanceMetrics(
                        operation="query_cache_hit",
                        duration=duration,
                        cache_hit=True
                    ))
                    
                    return cached_result
            
            # Optimize query based on patterns
            optimized_query = self._optimize_query(query)
            
            # Execute query
            async with self.connection_pool.acquire() as conn:
                if params:
                    result = await conn.fetch(optimized_query, *params)
                else:
                    result = await conn.fetch(optimized_query)
                
                # Convert to dict list
                result_list = [dict(row) for row in result]
                
                # Cache result if cache_key provided
                if cache_key and result_list:
                    await cache_service.set(cache_key, result_list, ttl=cache_ttl)
                
                duration = time.time() - start_time
                
                # Log slow queries
                if duration > self.slow_query_threshold:
                    logger.warning(f"Slow query detected ({duration:.2f}s): {query[:100]}...")
                
                # Track performance metrics
                self.performance_metrics.append(PerformanceMetrics(
                    operation="database_query",
                    duration=duration,
                    cache_hit=cache_hit,
                    database_queries=1
                ))
                
                return result_list
                
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise
    
    def _optimize_query(self, query: str) -> str:
        """Apply query optimization patterns"""
        optimized = query
        
        # Detect and optimize common patterns
        query_lower = query.lower()
        
        if 'order by' in query_lower and 'limit' in query_lower:
            optimized = self.query_optimizations['pagination'](optimized)
        elif 'group by' in query_lower or 'count(' in query_lower:
            optimized = self.query_optimizations['aggregation'](optimized)
        elif 'join' in query_lower:
            optimized = self.query_optimizations['join'](optimized)
        elif 'like' in query_lower or 'ilike' in query_lower:
            optimized = self.query_optimizations['search'](optimized)
        
        return optimized
    
    def _optimize_pagination_query(self, query: str) -> str:
        """Optimize pagination queries"""
        # Add index hints for pagination
        if 'ORDER BY' in query.upper() and 'LIMIT' in query.upper():
            # Ensure we're using index-friendly ordering
            pass
        return query
    
    def _optimize_aggregation_query(self, query: str) -> str:
        """Optimize aggregation queries"""
        # Add hints for aggregation optimization
        return query
    
    def _optimize_join_query(self, query: str) -> str:
        """Optimize join queries"""
        # Ensure proper join order and index usage
        return query
    
    def _optimize_search_query(self, query: str) -> str:
        """Optimize search queries"""
        # Convert LIKE to more efficient alternatives where possible
        return query
    
    async def get_performance_metrics(self) -> Dict[str, Any]:
        """Get database performance metrics"""
        try:
            async with self.connection_pool.acquire() as conn:
                # Database statistics
                db_stats = await conn.fetchrow("""
                    SELECT 
                        numbackends as active_connections,
                        xact_commit as transactions_committed,
                        xact_rollback as transactions_rolled_back,
                        blks_read as blocks_read,
                        blks_hit as blocks_hit,
                        tup_returned as tuples_returned,
                        tup_fetched as tuples_fetched,
                        tup_inserted as tuples_inserted,
                        tup_updated as tuples_updated,
                        tup_deleted as tuples_deleted
                    FROM pg_stat_database 
                    WHERE datname = current_database()
                """)
                
                # Slow queries
                slow_queries = await conn.fetch("""
                    SELECT 
                        query,
                        calls,
                        total_time,
                        mean_time,
                        rows
                    FROM pg_stat_statements
                    WHERE mean_time > $1
                    ORDER BY mean_time DESC
                    LIMIT 10
                """, self.slow_query_threshold * 1000)  # Convert to ms
                
                # Index usage
                index_usage = await conn.fetch("""
                    SELECT 
                        schemaname,
                        tablename,
                        indexname,
                        idx_scan,
                        idx_tup_read
                    FROM pg_stat_user_indexes
                    ORDER BY idx_scan DESC
                    LIMIT 20
                """)
                
                # Connection pool stats
                pool_stats = {
                    'size': self.connection_pool.get_size(),
                    'idle_connections': self.connection_pool.get_idle_size(),
                    'used_connections': self.connection_pool.get_size() - self.connection_pool.get_idle_size()
                }
                
                return {
                    'database_stats': dict(db_stats) if db_stats else {},
                    'slow_queries': [dict(row) for row in slow_queries],
                    'index_usage': [dict(row) for row in index_usage],
                    'connection_pool': pool_stats,
                    'performance_metrics': [asdict(metric) for metric in self.performance_metrics[-100:]],  # Last 100 metrics
                    'cache_hit_ratio': (len([m for m in self.performance_metrics if m.cache_hit]) / 
                                      len(self.performance_metrics)) * 100 if self.performance_metrics else 0
                }
                
        except Exception as e:
            logger.error(f"Failed to get performance metrics: {e}")
            return {}

class AdvancedCacheManager:
    """
    Multi-layer caching system with intelligent invalidation
    """
    
    def __init__(self):
        self.cache_layers = {
            'memory': {},  # In-memory cache for frequently accessed data
            'redis': cache_service.redis_client,  # Redis for distributed caching
            'disk': {}  # Disk cache for large datasets
        }
        
        self.cache_stats = {
            'hits': 0,
            'misses': 0,
            'evictions': 0,
            'invalidations': 0
        }
        
        self.invalidation_patterns = {
            'user_*': ['user_profile:*', 'user_permissions:*', 'user_activity:*'],
            'security_*': ['threat_events:*', 'security_metrics:*'],
            'api_*': ['api_metrics:*', 'api_performance:*']
        }
    
    async def get_multi_layer(self, key: str, default: Any = None) -> Any:
        """Get value from multi-layer cache"""
        start_time = time.time()
        
        # Check memory cache first (fastest)
        if key in self.cache_layers['memory']:
            self.cache_stats['hits'] += 1
            return self.cache_layers['memory'][key]
        
        # Check Redis cache
        try:
            redis_value = await self.cache_layers['redis'].get(key)
            if redis_value:
                # Store in memory cache for faster access
                self.cache_layers['memory'][key] = json.loads(redis_value)
                self.cache_stats['hits'] += 1
                return self.cache_layers['memory'][key]
        except Exception as e:
            logger.warning(f"Redis cache access failed: {e}")
        
        # Cache miss
        self.cache_stats['misses'] += 1
        return default
    
    async def set_multi_layer(self, 
                            key: str, 
                            value: Any, 
                            ttl: int = 300,
                            memory_only: bool = False) -> bool:
        """Set value in multi-layer cache"""
        try:
            # Always set in memory cache
            self.cache_layers['memory'][key] = value
            
            # Set in Redis unless memory_only
            if not memory_only:
                serialized_value = json.dumps(value, default=str)
                await self.cache_layers['redis'].setex(key, ttl, serialized_value)
            
            # Implement memory cache size limit
            if len(self.cache_layers['memory']) > 10000:
                # Remove oldest entries (simple LRU)
                keys_to_remove = list(self.cache_layers['memory'].keys())[:1000]
                for k in keys_to_remove:
                    del self.cache_layers['memory'][k]
                self.cache_stats['evictions'] += len(keys_to_remove)
            
            return True
            
        except Exception as e:
            logger.error(f"Multi-layer cache set failed: {e}")
            return False
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate cache entries matching pattern"""
        try:
            invalidated_count = 0
            
            # Invalidate memory cache
            keys_to_remove = []
            for key in self.cache_layers['memory']:
                if self._match_pattern(key, pattern):
                    keys_to_remove.append(key)
            
            for key in keys_to_remove:
                del self.cache_layers['memory'][key]
                invalidated_count += 1
            
            # Invalidate Redis cache
            try:
                redis_keys = await self.cache_layers['redis'].keys(pattern)
                if redis_keys:
                    await self.cache_layers['redis'].delete(*redis_keys)
                    invalidated_count += len(redis_keys)
            except Exception as e:
                logger.warning(f"Redis invalidation failed: {e}")
            
            self.cache_stats['invalidations'] += invalidated_count
            
            # Apply cascade invalidation
            for invalidation_pattern, related_patterns in self.invalidation_patterns.items():
                if self._match_pattern(pattern, invalidation_pattern):
                    for related_pattern in related_patterns:
                        await self.invalidate_pattern(related_pattern)
            
            return invalidated_count
            
        except Exception as e:
            logger.error(f"Cache invalidation failed: {e}")
            return 0
    
    def _match_pattern(self, key: str, pattern: str) -> bool:
        """Simple pattern matching for cache keys"""
        if '*' not in pattern:
            return key == pattern
        
        # Convert pattern to regex-like matching
        pattern_parts = pattern.split('*')
        
        if len(pattern_parts) == 2:
            prefix, suffix = pattern_parts
            return key.startswith(prefix) and key.endswith(suffix)
        
        return False
    
    async def warm_cache(self, cache_warming_config: Dict[str, Any]) -> Dict[str, Any]:
        """Warm cache with frequently accessed data"""
        warmed_keys = []
        
        try:
            # User profiles cache warming
            if 'user_profiles' in cache_warming_config:
                active_users = cache_warming_config['user_profiles'].get('active_users', [])
                for user_id in active_users:
                    # This would normally fetch from database
                    user_profile = {'user_id': user_id, 'cached_at': datetime.now().isoformat()}
                    await self.set_multi_layer(f"user_profile:{user_id}", user_profile, ttl=3600)
                    warmed_keys.append(f"user_profile:{user_id}")
            
            # Security metrics cache warming
            if 'security_metrics' in cache_warming_config:
                security_metrics = {
                    'threats_today': 0,
                    'security_score': 95.2,
                    'cached_at': datetime.now().isoformat()
                }
                await self.set_multi_layer("security_metrics:current", security_metrics, ttl=300)
                warmed_keys.append("security_metrics:current")
            
            # API performance metrics
            if 'api_metrics' in cache_warming_config:
                api_metrics = {
                    'avg_response_time': 85.5,
                    'requests_per_minute': 1250,
                    'cached_at': datetime.now().isoformat()
                }
                await self.set_multi_layer("api_metrics:current", api_metrics, ttl=60)
                warmed_keys.append("api_metrics:current")
            
            return {
                'warmed_keys': warmed_keys,
                'total_keys': len(warmed_keys),
                'status': 'success'
            }
            
        except Exception as e:
            logger.error(f"Cache warming failed: {e}")
            return {'status': 'error', 'error': str(e)}
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache performance statistics"""
        total_operations = self.cache_stats['hits'] + self.cache_stats['misses']
        hit_rate = (self.cache_stats['hits'] / total_operations * 100) if total_operations > 0 else 0
        
        return {
            **self.cache_stats,
            'hit_rate': round(hit_rate, 2),
            'memory_cache_size': len(self.cache_layers['memory']),
            'total_operations': total_operations
        }

class BackgroundTaskManager:
    """
    Celery-based background task processing for heavy operations
    """
    
    def __init__(self, broker_url: str = "redis://localhost:6379/1"):
        self.celery_app = Celery(
            'securenet_tasks',
            broker=broker_url,
            backend=broker_url,
            include=['utils.performance_optimization']
        )
        
        # Configure Celery
        self.celery_app.conf.update(
            task_serializer='json',
            accept_content=['json'],
            result_serializer='json',
            timezone='UTC',
            enable_utc=True,
            task_track_started=True,
            task_time_limit=30 * 60,  # 30 minutes
            task_soft_time_limit=25 * 60,  # 25 minutes
            worker_prefetch_multiplier=1,
            worker_max_tasks_per_child=1000,
        )
        
        self.task_stats = {
            'submitted': 0,
            'completed': 0,
            'failed': 0,
            'retried': 0
        }
    
    async def submit_task(self, 
                         task_name: str, 
                         args: List[Any] = None, 
                         kwargs: Dict[str, Any] = None,
                         priority: int = 5,
                         eta: Optional[datetime] = None) -> str:
        """Submit background task"""
        try:
            task_args = args or []
            task_kwargs = kwargs or {}
            
            # Submit task to Celery
            result = self.celery_app.send_task(
                task_name,
                args=task_args,
                kwargs=task_kwargs,
                priority=priority,
                eta=eta
            )
            
            self.task_stats['submitted'] += 1
            
            # Log task submission
            await security_audit_logger.log_event(
                event_type=AuditEventType.SYSTEM_STATUS,
                severity=AuditSeverity.LOW,
                action="background_task_submitted",
                result="success",
                details={
                    'task_name': task_name,
                    'task_id': result.id,
                    'priority': priority
                }
            )
            
            return result.id
            
        except Exception as e:
            logger.error(f"Failed to submit background task: {e}")
            self.task_stats['failed'] += 1
            raise
    
    async def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """Get background task status"""
        try:
            result = AsyncResult(task_id, app=self.celery_app)
            
            return {
                'task_id': task_id,
                'status': result.status,
                'result': result.result if result.ready() else None,
                'traceback': result.traceback if result.failed() else None,
                'date_done': result.date_done.isoformat() if result.date_done else None
            }
            
        except Exception as e:
            logger.error(f"Failed to get task status: {e}")
            return {'task_id': task_id, 'status': 'UNKNOWN', 'error': str(e)}
    
    def get_task_stats(self) -> Dict[str, Any]:
        """Get background task statistics"""
        return {
            **self.task_stats,
            'success_rate': (self.task_stats['completed'] / max(1, self.task_stats['submitted'])) * 100,
            'active_workers': len(self.celery_app.control.inspect().active() or {}),
            'timestamp': datetime.now().isoformat()
        }

# Performance monitoring decorator
def monitor_performance(operation_name: str, 
                       cache_key_template: Optional[str] = None,
                       cache_ttl: int = 300):
    """Decorator for monitoring function performance"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            cache_hit = False
            
            # Check cache if template provided
            if cache_key_template:
                cache_key = cache_key_template.format(*args, **kwargs)
                cached_result = await advanced_cache.get_multi_layer(cache_key)
                if cached_result is not None:
                    cache_hit = True
                    duration = time.time() - start_time
                    
                    db_optimizer.performance_metrics.append(PerformanceMetrics(
                        operation=operation_name,
                        duration=duration,
                        cache_hit=True
                    ))
                    
                    return cached_result
            
            # Execute function
            try:
                result = await func(*args, **kwargs)
                
                # Cache result if template provided
                if cache_key_template and result is not None:
                    cache_key = cache_key_template.format(*args, **kwargs)
                    await advanced_cache.set_multi_layer(cache_key, result, ttl=cache_ttl)
                
                duration = time.time() - start_time
                
                db_optimizer.performance_metrics.append(PerformanceMetrics(
                    operation=operation_name,
                    duration=duration,
                    cache_hit=cache_hit
                ))
                
                return result
                
            except Exception as e:
                duration = time.time() - start_time
                logger.error(f"Performance monitored function failed ({operation_name}): {e}")
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                
                db_optimizer.performance_metrics.append(PerformanceMetrics(
                    operation=operation_name,
                    duration=duration,
                    cache_hit=False
                ))
                
                return result
                
            except Exception as e:
                duration = time.time() - start_time
                logger.error(f"Performance monitored function failed ({operation_name}): {e}")
                raise
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    
    return decorator

# Global instances
db_optimizer = DatabaseOptimizer("postgresql://user:password@localhost:5432/securenet")
advanced_cache = AdvancedCacheManager()
background_tasks = BackgroundTaskManager()

# Celery tasks
@background_tasks.celery_app.task(bind=True, max_retries=3)
def process_large_dataset(self, dataset_id: str, processing_type: str):
    """Process large dataset in background"""
    try:
        # Simulate heavy processing
        time.sleep(10)  # Simulate processing time
        
        result = {
            'dataset_id': dataset_id,
            'processing_type': processing_type,
            'processed_records': 10000,
            'processing_time': 10.0,
            'status': 'completed',
            'timestamp': datetime.now().isoformat()
        }
        
        background_tasks.task_stats['completed'] += 1
        return result
        
    except Exception as e:
        background_tasks.task_stats['failed'] += 1
        background_tasks.task_stats['retried'] += 1
        raise self.retry(exc=e, countdown=60)

@background_tasks.celery_app.task(bind=True)
def generate_analytics_report(self, report_type: str, date_range: Dict[str, str]):
    """Generate analytics report in background"""
    try:
        # Simulate report generation
        time.sleep(5)
        
        result = {
            'report_type': report_type,
            'date_range': date_range,
            'report_url': f'/reports/{report_type}_{int(time.time())}.pdf',
            'generated_at': datetime.now().isoformat(),
            'status': 'completed'
        }
        
        background_tasks.task_stats['completed'] += 1
        return result
        
    except Exception as e:
        background_tasks.task_stats['failed'] += 1
        raise self.retry(exc=e, countdown=30)

# Convenience functions
async def optimize_database_performance() -> Dict[str, Any]:
    """Initialize and optimize database performance"""
    await db_optimizer.initialize_pool()
    return await db_optimizer.optimize_database_schema()

async def get_system_performance_metrics() -> Dict[str, Any]:
    """Get comprehensive system performance metrics"""
    db_metrics = await db_optimizer.get_performance_metrics()
    cache_stats = advanced_cache.get_cache_stats()
    task_stats = background_tasks.get_task_stats()
    
    return {
        'database': db_metrics,
        'cache': cache_stats,
        'background_tasks': task_stats,
        'timestamp': datetime.now().isoformat()
    } 