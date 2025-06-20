"""
SecureNet Enterprise Monitoring Dashboard
Day 3 Sprint 1: DevOps Monitoring Setup and Performance Metrics
"""

import asyncio
import logging
import time
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
import psutil
import redis.asyncio as redis
from utils.cache_service import cache_service
from utils.api_optimization import api_health_monitor, performance_middleware
from database.postgresql_adapter import get_db_connection

logger = logging.getLogger(__name__)

class EnterpriseMonitor:
    """
    Enterprise-grade monitoring and metrics collection
    Real-time system health, performance, and security monitoring
    """
    
    def __init__(self):
        self.metrics_cache = {}
        self.performance_metrics = {}  # Store performance_metrics data
        self.alert_thresholds = {
            "cpu_usage": 85.0,
            "memory_usage": 90.0,
            "disk_usage": 80.0,
            "response_time": 500,  # ms
            "error_rate": 0.05,    # 5%
            "active_connections": 1000
        }
        self.monitoring_active = True
        
    async def collect_system_metrics(self) -> Dict[str, Any]:
        """Collect comprehensive system performance metrics"""
        try:
            # CPU Metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            cpu_freq = psutil.cpu_freq()
            
            # Memory Metrics
            memory = psutil.virtual_memory()
            swap = psutil.swap_memory()
            
            # Disk Metrics
            disk_usage = psutil.disk_usage('/')
            disk_io = psutil.disk_io_counters()
            
            # Network Metrics
            network_io = psutil.net_io_counters()
            network_connections = len(psutil.net_connections())
            
            # Process Metrics
            process_count = len(psutil.pids())
            
            metrics = {
                "timestamp": datetime.now().isoformat(),
                "system": {
                    "cpu": {
                        "usage_percent": cpu_percent,
                        "count": cpu_count,
                        "frequency_mhz": cpu_freq.current if cpu_freq else 0
                    },
                    "memory": {
                        "total_gb": round(memory.total / (1024**3), 2),
                        "available_gb": round(memory.available / (1024**3), 2),
                        "used_gb": round(memory.used / (1024**3), 2),
                        "usage_percent": memory.percent,
                        "swap_total_gb": round(swap.total / (1024**3), 2),
                        "swap_used_gb": round(swap.used / (1024**3), 2),
                        "swap_percent": swap.percent
                    },
                    "disk": {
                        "total_gb": round(disk_usage.total / (1024**3), 2),
                        "used_gb": round(disk_usage.used / (1024**3), 2),
                        "free_gb": round(disk_usage.free / (1024**3), 2),
                        "usage_percent": (disk_usage.used / disk_usage.total) * 100,
                        "read_bytes": disk_io.read_bytes if disk_io else 0,
                        "write_bytes": disk_io.write_bytes if disk_io else 0
                    },
                    "network": {
                        "bytes_sent": network_io.bytes_sent,
                        "bytes_recv": network_io.bytes_recv,
                        "packets_sent": network_io.packets_sent,
                        "packets_recv": network_io.packets_recv,
                        "active_connections": network_connections
                    },
                    "processes": {
                        "count": process_count
                    }
                }
            }
            
            # Cache metrics for dashboard
            await cache_service.set("system_metrics", metrics, ttl=60)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Failed to collect system metrics: {e}")
            return {"error": str(e), "timestamp": datetime.now().isoformat()}
    
    async def collect_application_metrics(self) -> Dict[str, Any]:
        """Collect SecureNet application-specific metrics"""
        try:
            # Database metrics
            db_metrics = await self._get_database_metrics()
            
            # Redis metrics
            redis_metrics = await self._get_redis_metrics()
            
            # API metrics from performance middleware
            api_health = await api_health_monitor.get_api_health()
            
            # Security metrics
            security_metrics = await self._get_security_metrics()
            
            metrics = {
                "timestamp": datetime.now().isoformat(),
                "application": {
                    "database": db_metrics,
                    "cache": redis_metrics,
                    "api": api_health,
                    "security": security_metrics
                }
            }
            
            await cache_service.set("app_metrics", metrics, ttl=30)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Failed to collect application metrics: {e}")
            return {"error": str(e), "timestamp": datetime.now().isoformat()}
    
    async def _get_database_metrics(self) -> Dict[str, Any]:
        """Get database performance metrics"""
        try:
            async with get_db_connection() as conn:
                # Connection count
                result = await conn.fetch("SELECT count(*) as connections FROM pg_stat_activity")
                active_connections = result[0]['connections']
                
                # Database size
                result = await conn.fetch("SELECT pg_database_size(current_database()) as size")
                db_size = result[0]['size']
                
                # Query performance
                result = await conn.fetch("""
                    SELECT 
                        schemaname,
                        tablename,
                        n_tup_ins as inserts,
                        n_tup_upd as updates,
                        n_tup_del as deletes,
                        seq_scan + idx_scan as total_scans
                    FROM pg_stat_user_tables 
                    ORDER BY total_scans DESC 
                    LIMIT 5
                """)
                
                table_stats = [dict(row) for row in result]
                
                return {
                    "status": "healthy",
                    "active_connections": active_connections,
                    "database_size_mb": round(db_size / (1024*1024), 2),
                    "table_statistics": table_stats,
                    "response_time_ms": 25  # This would be calculated from actual query time
                }
                
        except Exception as e:
            logger.error(f"Database metrics error: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def _get_redis_metrics(self) -> Dict[str, Any]:
        """Get Redis cache performance metrics"""
        try:
            redis_client = cache_service.redis_client
            info = await redis_client.info()
            
            return {
                "status": "healthy",
                "used_memory_mb": round(info.get('used_memory', 0) / (1024*1024), 2),
                "connected_clients": info.get('connected_clients', 0),
                "total_commands_processed": info.get('total_commands_processed', 0),
                "keyspace_hits": info.get('keyspace_hits', 0),
                "keyspace_misses": info.get('keyspace_misses', 0),
                "hit_rate": info.get('keyspace_hits', 0) / max(info.get('keyspace_hits', 0) + info.get('keyspace_misses', 0), 1),
                "uptime_seconds": info.get('uptime_in_seconds', 0)
            }
            
        except Exception as e:
            logger.error(f"Redis metrics error: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def _get_security_metrics(self) -> Dict[str, Any]:
        """Get security-specific metrics"""
        try:
            # This would integrate with your security monitoring
            return {
                "active_threats": 2,
                "blocked_ips": 15,
                "failed_login_attempts": 8,
                "security_score": 95,
                "last_scan": "2024-01-15T10:30:00Z",
                "vulnerabilities": {
                    "critical": 0,
                    "high": 1,
                    "medium": 3,
                    "low": 7
                }
            }
            
        except Exception as e:
            logger.error(f"Security metrics error: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def check_health_alerts(self, metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check metrics against thresholds and generate alerts"""
        alerts = []
        
        try:
            system_metrics = metrics.get("system", {})
            
            # CPU usage alert
            cpu_usage = system_metrics.get("cpu", {}).get("usage_percent", 0)
            if cpu_usage > self.alert_thresholds["cpu_usage"]:
                alerts.append({
                    "level": "warning",
                    "metric": "cpu_usage",
                    "current_value": cpu_usage,
                    "threshold": self.alert_thresholds["cpu_usage"],
                    "message": f"High CPU usage: {cpu_usage}%"
                })
            
            # Memory usage alert
            memory_usage = system_metrics.get("memory", {}).get("usage_percent", 0)
            if memory_usage > self.alert_thresholds["memory_usage"]:
                alerts.append({
                    "level": "critical" if memory_usage > 95 else "warning",
                    "metric": "memory_usage",
                    "current_value": memory_usage,
                    "threshold": self.alert_thresholds["memory_usage"],
                    "message": f"High memory usage: {memory_usage}%"
                })
            
            # Disk usage alert
            disk_usage = system_metrics.get("disk", {}).get("usage_percent", 0)
            if disk_usage > self.alert_thresholds["disk_usage"]:
                alerts.append({
                    "level": "warning",
                    "metric": "disk_usage",
                    "current_value": disk_usage,
                    "threshold": self.alert_thresholds["disk_usage"],
                    "message": f"High disk usage: {disk_usage:.1f}%"
                })
            
            # Network connections alert
            connections = system_metrics.get("network", {}).get("active_connections", 0)
            if connections > self.alert_thresholds["active_connections"]:
                alerts.append({
                    "level": "warning",
                    "metric": "active_connections",
                    "current_value": connections,
                    "threshold": self.alert_thresholds["active_connections"],
                    "message": f"High connection count: {connections}"
                })
                
        except Exception as e:
            logger.error(f"Alert checking error: {e}")
            alerts.append({
                "level": "error",
                "metric": "monitoring",
                "message": f"Failed to check alerts: {e}"
            })
        
        return alerts
    
    async def get_dashboard_data(self) -> Dict[str, Any]:
        """Get comprehensive dashboard data"""
        try:
            # Collect all metrics
            system_metrics = await self.collect_system_metrics()
            app_metrics = await self.collect_application_metrics()
            
            # Check for alerts
            alerts = await self.check_health_alerts(system_metrics)
            
            # Get historical data (simplified for demo)
            historical_data = await self._get_historical_metrics()
            
            dashboard_data = {
                "timestamp": datetime.now().isoformat(),
                "status": "healthy",
                "system_metrics": system_metrics,
                "application_metrics": app_metrics,
                "alerts": alerts,
                "historical_data": historical_data,
                "summary": {
                    "total_alerts": len(alerts),
                    "critical_alerts": len([a for a in alerts if a.get("level") == "critical"]),
                    "system_health": "good" if len(alerts) == 0 else "warning",
                    "uptime_hours": 24,  # This would be calculated from actual uptime
                    "monitoring_active": self.monitoring_active
                }
            }
            
            return dashboard_data
            
        except Exception as e:
            logger.error(f"Dashboard data collection failed: {e}")
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def _get_historical_metrics(self) -> Dict[str, Any]:
        """Get historical metrics for charts (last 24 hours)"""
        # This would typically pull from a time-series database
        # For now, generating sample data
        now = datetime.now()
        data_points = []
        
        for i in range(24):
            timestamp = now - timedelta(hours=i)
            data_points.append({
                "timestamp": timestamp.isoformat(),
                "cpu_usage": 45 + (i % 10) * 3,  # Sample data
                "memory_usage": 60 + (i % 8) * 2,
                "response_time": 120 + (i % 5) * 10,
                "active_connections": 50 + (i % 6) * 5
            })
        
        return {
            "cpu_usage_24h": data_points,
            "memory_usage_24h": data_points,
            "response_time_24h": data_points,
            "connection_count_24h": data_points
        }

# Background monitoring task
async def monitoring_background_task():
    """Background task for continuous monitoring"""
    monitor = EnterpriseMonitor()
    
    while True:
        try:
            # Collect metrics every 30 seconds
            await monitor.collect_system_metrics()
            await monitor.collect_application_metrics()
            
            # Sleep for 30 seconds
            await asyncio.sleep(30)
            
        except Exception as e:
            logger.error(f"Monitoring background task error: {e}")
            await asyncio.sleep(60)  # Wait longer on error

# FastAPI monitoring endpoints
monitoring_app = FastAPI(title="SecureNet Enterprise Monitoring")

@monitoring_app.get("/health")
async def health_check():
    """Basic health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@monitoring_app.get("/metrics")
async def get_metrics():
    """Get current system and application metrics"""
    monitor = EnterpriseMonitor()
    system_metrics = await monitor.collect_system_metrics()
    app_metrics = await monitor.collect_application_metrics()
    
    return {
        "system": system_metrics,
        "application": app_metrics
    }

@monitoring_app.get("/dashboard")
async def get_dashboard():
    """Get comprehensive dashboard data"""
    monitor = EnterpriseMonitor()
    return await monitor.get_dashboard_data()

@monitoring_app.get("/alerts")
async def get_alerts():
    """Get current alerts"""
    monitor = EnterpriseMonitor()
    system_metrics = await monitor.collect_system_metrics()
    alerts = await monitor.check_health_alerts(system_metrics)
    
    return {
        "alerts": alerts,
        "count": len(alerts),
        "timestamp": datetime.now().isoformat()
    }

# Global monitoring instance
enterprise_monitor = EnterpriseMonitor() 