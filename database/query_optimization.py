#!/usr/bin/env python3
"""
Query Optimization Module for SecureNet
Week 5 Day 2: Backend Performance Optimization

Provides advanced query optimization capabilities:
- Query analysis and optimization recommendations
- Automatic query rewriting for better performance
- Index usage optimization
- Query caching and result optimization
"""

import sqlite3
import time
import hashlib
import json
from typing import Dict, List, Tuple, Any, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class QueryOptimizer:
    """Advanced query optimization system"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.query_cache = {}
        self.optimization_rules = {}
        self.performance_stats = {}
        
    def get_connection(self):
        """Get optimized database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        
        # Apply performance pragmas
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA synchronous = NORMAL")
        conn.execute("PRAGMA cache_size = 10000")
        conn.execute("PRAGMA temp_store = MEMORY")
        conn.execute("PRAGMA mmap_size = 268435456")
        
        return conn
    
    def analyze_query_performance(self, query: str, params: tuple = None) -> Dict[str, Any]:
        """Analyze query performance and provide optimization insights"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Enable query plan analysis
            cursor.execute("EXPLAIN QUERY PLAN " + query, params or ())
            query_plan = cursor.fetchall()
            
            # Execute query with timing
            start_time = time.time()
            cursor.execute(query, params or ())
            results = cursor.fetchall()
            execution_time = (time.time() - start_time) * 1000  # Convert to ms
            
            # Analyze the query plan
            analysis = {
                'execution_time_ms': round(execution_time, 2),
                'rows_returned': len(results),
                'query_plan': [dict(row) for row in query_plan],
                'optimization_suggestions': self._generate_optimization_suggestions(query_plan, query),
                'uses_index': any('USING INDEX' in str(row) for row in query_plan),
                'has_table_scan': any('SCAN TABLE' in str(row) for row in query_plan),
                'complexity_score': self._calculate_complexity_score(query_plan)
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing query: {str(e)}")
            return {'error': str(e)}
        finally:
            conn.close()
    
    def _generate_optimization_suggestions(self, query_plan: List, query: str) -> List[str]:
        """Generate optimization suggestions based on query plan analysis"""
        suggestions = []
        
        for row in query_plan:
            detail = str(row).upper()
            
            # Check for table scans
            if 'SCAN TABLE' in detail:
                table_name = self._extract_table_name(detail)
                suggestions.append(f"Consider adding an index to table '{table_name}' for better performance")
            
            # Check for missing indexes
            if 'USING INDEX' not in detail and 'WHERE' in query.upper():
                suggestions.append("Query may benefit from additional indexes on WHERE clause columns")
            
            # Check for joins without indexes
            if 'JOIN' in query.upper() and 'USING INDEX' not in detail:
                suggestions.append("Consider adding indexes on JOIN columns for better performance")
        
        # Check for SELECT *
        if 'SELECT *' in query.upper():
            suggestions.append("Consider selecting only required columns instead of SELECT *")
        
        # Check for complex subqueries
        if query.upper().count('SELECT') > 1:
            suggestions.append("Complex subqueries detected - consider query restructuring or CTEs")
        
        return suggestions
    
    def _extract_table_name(self, detail: str) -> str:
        """Extract table name from query plan detail"""
        parts = detail.split()
        for i, part in enumerate(parts):
            if part == 'TABLE' and i + 1 < len(parts):
                return parts[i + 1]
        return "unknown"
    
    def _calculate_complexity_score(self, query_plan: List) -> int:
        """Calculate query complexity score (1-10, higher = more complex)"""
        score = 1
        
        for row in query_plan:
            detail = str(row).upper()
            
            # Add complexity for table scans
            if 'SCAN TABLE' in detail:
                score += 2
            
            # Add complexity for joins
            if 'JOIN' in detail:
                score += 1
            
            # Add complexity for subqueries
            if 'SUBQUERY' in detail:
                score += 2
        
        return min(score, 10)
    
    def optimize_user_management_queries(self) -> Dict[str, str]:
        """Provide optimized versions of common user management queries"""
        optimized_queries = {
            # Original vs Optimized user queries
            'get_user_with_groups_original': """
                SELECT u.*, GROUP_CONCAT(ug.group_name) as groups
                FROM users u
                LEFT JOIN user_group_memberships ugm ON u.id = ugm.user_id
                LEFT JOIN user_groups ug ON ugm.group_id = ug.id
                WHERE u.status = 'active'
                GROUP BY u.id
            """,
            
            'get_user_with_groups_optimized': """
                SELECT u.*, 
                       COALESCE(g.groups, '') as groups
                FROM users u
                LEFT JOIN (
                    SELECT ugm.user_id,
                           GROUP_CONCAT(ug.group_name) as groups
                    FROM user_group_memberships ugm
                    JOIN user_groups ug ON ugm.group_id = ug.id
                    WHERE ugm.status = 'active'
                    GROUP BY ugm.user_id
                ) g ON u.id = g.user_id
                WHERE u.status = 'active'
            """,
            
            'get_user_permissions_original': """
                SELECT u.username, sp.permission_name
                FROM users u
                JOIN user_role_permissions urp ON u.role = urp.role_id
                JOIN system_permissions sp ON urp.permission_id = sp.id
                WHERE u.id = ?
            """,
            
            'get_user_permissions_optimized': """
                WITH user_role AS (
                    SELECT role FROM users WHERE id = ? LIMIT 1
                )
                SELECT sp.permission_name
                FROM user_role ur
                JOIN user_role_permissions urp ON ur.role = urp.role_id
                JOIN system_permissions sp ON urp.permission_id = sp.id
            """,
            
            'bulk_user_update_original': """
                UPDATE users SET status = 'inactive' WHERE department = ?
            """,
            
            'bulk_user_update_optimized': """
                UPDATE users 
                SET status = 'inactive', 
                    updated_at = datetime('now')
                WHERE department = ? 
                AND status = 'active'
            """,
            
            'group_membership_stats_original': """
                SELECT ug.group_name, COUNT(ugm.user_id) as member_count
                FROM user_groups ug
                LEFT JOIN user_group_memberships ugm ON ug.id = ugm.group_id
                GROUP BY ug.id, ug.group_name
                ORDER BY member_count DESC
            """,
            
            'group_membership_stats_optimized': """
                SELECT ug.group_name, 
                       COUNT(CASE WHEN ugm.status = 'active' THEN ugm.user_id END) as active_members,
                       COUNT(ugm.user_id) as total_members
                FROM user_groups ug
                LEFT JOIN user_group_memberships ugm ON ug.id = ugm.group_id
                GROUP BY ug.id, ug.group_name
                ORDER BY active_members DESC
            """
        }
        
        return optimized_queries
    
    def create_recommended_indexes(self) -> List[str]:
        """Generate recommended indexes for optimal performance"""
        recommended_indexes = [
            # User management indexes
            "CREATE INDEX IF NOT EXISTS idx_users_status_department ON users(status, department)",
            "CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status)",
            "CREATE INDEX IF NOT EXISTS idx_users_created_updated ON users(created_at, updated_at)",
            
            # Group management indexes
            "CREATE INDEX IF NOT EXISTS idx_user_group_memberships_composite ON user_group_memberships(user_id, group_id, status)",
            "CREATE INDEX IF NOT EXISTS idx_user_groups_name_status ON user_groups(group_name, status)",
            
            # Permission indexes
            "CREATE INDEX IF NOT EXISTS idx_user_role_permissions_composite ON user_role_permissions(role_id, permission_id)",
            "CREATE INDEX IF NOT EXISTS idx_system_permissions_category_name ON system_permissions(category, permission_name)",
            
            # Activity and audit indexes
            "CREATE INDEX IF NOT EXISTS idx_user_activity_logs_composite ON user_activity_logs(user_id, activity_type, timestamp)",
            "CREATE INDEX IF NOT EXISTS idx_group_membership_history_composite ON group_membership_history(group_id, user_id, changed_at)",
            
            # Analytics indexes
            "CREATE INDEX IF NOT EXISTS idx_permission_usage_stats_composite ON permission_usage_stats(permission_id, usage_count)",
            "CREATE INDEX IF NOT EXISTS idx_compliance_metrics_framework_score ON compliance_metrics(framework_name, score)",
            
            # Performance monitoring indexes
            "CREATE INDEX IF NOT EXISTS idx_query_performance_logs_composite ON query_performance_logs(query_type, execution_time_ms, timestamp)",
            "CREATE INDEX IF NOT EXISTS idx_system_performance_metrics_composite ON system_performance_metrics(metric_name, timestamp, metric_value)"
        ]
        
        return recommended_indexes
    
    def implement_query_caching(self, query: str, params: tuple = None, ttl_seconds: int = 300) -> Any:
        """Implement intelligent query result caching"""
        cache_key = self._generate_cache_key(query, params)
        
        # Check if result is in cache and not expired
        if cache_key in self.query_cache:
            cached_result = self.query_cache[cache_key]
            if datetime.now() < cached_result['expires_at']:
                cached_result['hits'] += 1
                return cached_result['data']
            else:
                # Remove expired entry
                del self.query_cache[cache_key]
        
        # Execute query and cache result
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            start_time = time.time()
            cursor.execute(query, params or ())
            results = cursor.fetchall()
            execution_time = time.time() - start_time
            
            # Convert to serializable format
            serializable_results = [dict(row) for row in results]
            
            # Cache the result
            self.query_cache[cache_key] = {
                'data': serializable_results,
                'cached_at': datetime.now(),
                'expires_at': datetime.now() + timedelta(seconds=ttl_seconds),
                'hits': 0,
                'execution_time': execution_time
            }
            
            return serializable_results
            
        except Exception as e:
            logger.error(f"Error executing cached query: {str(e)}")
            return []
        finally:
            conn.close()
    
    def _generate_cache_key(self, query: str, params: tuple = None) -> str:
        """Generate unique cache key for query and parameters"""
        query_normalized = ' '.join(query.split())  # Normalize whitespace
        params_str = str(params) if params else ''
        combined = f"{query_normalized}|{params_str}"
        return hashlib.md5(combined.encode()).hexdigest()
    
    def get_cache_statistics(self) -> Dict[str, Any]:
        """Get query cache performance statistics"""
        total_entries = len(self.query_cache)
        total_hits = sum(entry['hits'] for entry in self.query_cache.values())
        
        if total_entries == 0:
            return {
                'total_entries': 0,
                'total_hits': 0,
                'hit_ratio': 0,
                'cache_size_mb': 0
            }
        
        # Calculate cache size (approximate)
        cache_size_bytes = sum(
            len(json.dumps(entry['data'], default=str)) 
            for entry in self.query_cache.values()
        )
        
        return {
            'total_entries': total_entries,
            'total_hits': total_hits,
            'hit_ratio': round(total_hits / (total_hits + total_entries) * 100, 2),
            'cache_size_mb': round(cache_size_bytes / (1024 * 1024), 2),
            'avg_execution_time_ms': round(
                sum(entry['execution_time'] for entry in self.query_cache.values()) / total_entries * 1000, 2
            )
        }
    
    def optimize_database_structure(self) -> Dict[str, List[str]]:
        """Analyze and optimize database structure"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        optimizations = {
            'indexes_created': [],
            'views_created': [],
            'pragmas_applied': [],
            'maintenance_performed': []
        }
        
        try:
            # Create recommended indexes
            for index_sql in self.create_recommended_indexes():
                try:
                    cursor.execute(index_sql)
                    index_name = index_sql.split('idx_')[1].split(' ')[0] if 'idx_' in index_sql else 'unknown'
                    optimizations['indexes_created'].append(index_name)
                except Exception as e:
                    logger.warning(f"Index creation warning: {str(e)}")
            
            # Create optimized views
            view_queries = [
                ("active_users_view", """
                    CREATE VIEW IF NOT EXISTS active_users_view AS
                    SELECT u.*, COUNT(ugm.group_id) as group_count
                    FROM users u
                    LEFT JOIN user_group_memberships ugm ON u.id = ugm.user_id AND ugm.status = 'active'
                    WHERE u.status = 'active'
                    GROUP BY u.id
                """),
                ("user_permissions_view", """
                    CREATE VIEW IF NOT EXISTS user_permissions_view AS
                    SELECT u.id as user_id, u.username, sp.permission_name, sp.category
                    FROM users u
                    JOIN user_role_permissions urp ON u.role = urp.role_id
                    JOIN system_permissions sp ON urp.permission_id = sp.id
                    WHERE u.status = 'active'
                """),
                ("group_stats_view", """
                    CREATE VIEW IF NOT EXISTS group_stats_view AS
                    SELECT 
                        ug.id,
                        ug.group_name,
                        COUNT(CASE WHEN ugm.status = 'active' THEN 1 END) as active_members,
                        COUNT(ugm.user_id) as total_members,
                        MAX(ugm.joined_at) as last_member_added
                    FROM user_groups ug
                    LEFT JOIN user_group_memberships ugm ON ug.id = ugm.group_id
                    GROUP BY ug.id, ug.group_name
                """)
            ]
            
            for view_name, view_sql in view_queries:
                try:
                    cursor.execute(view_sql)
                    optimizations['views_created'].append(view_name)
                except Exception as e:
                    logger.warning(f"View creation warning: {str(e)}")
            
            # Apply performance pragmas
            performance_pragmas = [
                "PRAGMA optimize",
                "PRAGMA analysis_limit = 1000",
                "PRAGMA auto_vacuum = INCREMENTAL"
            ]
            
            for pragma in performance_pragmas:
                try:
                    cursor.execute(pragma)
                    optimizations['pragmas_applied'].append(pragma)
                except Exception as e:
                    logger.warning(f"Pragma application warning: {str(e)}")
            
            # Perform maintenance
            maintenance_tasks = [
                "VACUUM",
                "ANALYZE",
                "PRAGMA incremental_vacuum"
            ]
            
            for task in maintenance_tasks:
                try:
                    cursor.execute(task)
                    optimizations['maintenance_performed'].append(task)
                except Exception as e:
                    logger.warning(f"Maintenance task warning: {str(e)}")
            
            conn.commit()
            
        except Exception as e:
            logger.error(f"Error optimizing database structure: {str(e)}")
            conn.rollback()
        finally:
            conn.close()
        
        return optimizations
    
    def benchmark_queries(self, queries: Dict[str, str], iterations: int = 10) -> Dict[str, Dict[str, float]]:
        """Benchmark query performance"""
        results = {}
        
        for query_name, query in queries.items():
            execution_times = []
            
            for _ in range(iterations):
                conn = self.get_connection()
                cursor = conn.cursor()
                
                try:
                    start_time = time.time()
                    cursor.execute(query)
                    cursor.fetchall()  # Fetch all results
                    execution_time = (time.time() - start_time) * 1000  # Convert to ms
                    execution_times.append(execution_time)
                except Exception as e:
                    logger.error(f"Error benchmarking query {query_name}: {str(e)}")
                    execution_times.append(float('inf'))
                finally:
                    conn.close()
            
            # Calculate statistics
            valid_times = [t for t in execution_times if t != float('inf')]
            if valid_times:
                results[query_name] = {
                    'avg_time_ms': round(sum(valid_times) / len(valid_times), 2),
                    'min_time_ms': round(min(valid_times), 2),
                    'max_time_ms': round(max(valid_times), 2),
                    'success_rate': len(valid_times) / iterations * 100
                }
            else:
                results[query_name] = {
                    'avg_time_ms': float('inf'),
                    'min_time_ms': float('inf'),
                    'max_time_ms': float('inf'),
                    'success_rate': 0
                }
        
        return results

# Utility functions for query optimization
def optimize_query_for_user_management(query: str) -> str:
    """Apply common optimizations to user management queries"""
    # Remove unnecessary whitespace
    optimized = ' '.join(query.split())
    
    # Add LIMIT if not present for potentially large result sets
    if 'SELECT' in optimized.upper() and 'LIMIT' not in optimized.upper():
        if any(keyword in optimized.upper() for keyword in ['users', 'user_activity_logs', 'group_membership_history']):
            optimized += ' LIMIT 1000'
    
    return optimized

def create_query_optimizer(db_path: str) -> QueryOptimizer:
    """Factory function to create a QueryOptimizer instance"""
    return QueryOptimizer(db_path)

# Export main classes and functions
__all__ = ['QueryOptimizer', 'optimize_query_for_user_management', 'create_query_optimizer'] 