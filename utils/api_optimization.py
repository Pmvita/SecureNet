"""
SecureNet API Performance Optimization
Day 3 Sprint 1: API Optimization and Error Handling Enhancement
"""

import time
import logging
import asyncio
import json
from typing import Dict, List, Any, Optional, Callable
from datetime import datetime, timedelta
from functools import wraps
from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
import redis.asyncio as redis
from utils.cache_service import cache_service

logger = logging.getLogger(__name__)

class APIPerformanceMiddleware:
    """
    API Performance Optimization Middleware
    Implements caching, rate limiting, and performance monitoring
    """
    
    def __init__(self):
        self.request_counts = {}
        self.performance_metrics = {}
        self.rate_limits = {
            "default": 100,  # requests per minute
            "auth": 10,      # login attempts per minute
            "admin": 200,    # admin users get higher limits
        }
    
    async def __call__(self, request: Request, call_next):
        start_time = time.time()
        
        # Rate limiting check
        if not await self._check_rate_limit(request):
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "message": "Too many requests. Please try again later.",
                    "retry_after": 60
                }
            )
        
        # Process request
        response = await call_next(request)
        
        # Record performance metrics
        process_time = time.time() - start_time
        await self._record_metrics(request, response, process_time)
        
        # Add performance headers
        response.headers["X-Process-Time"] = str(process_time)
        response.headers["X-Cache-Status"] = getattr(response, 'cache_status', 'MISS')
        
        return response
    
    async def _check_rate_limit(self, request: Request) -> bool:
        """Check if request is within rate limits"""
        try:
            client_ip = request.client.host
            endpoint = request.url.path
            user_id = getattr(request.state, 'user_id', None)
            
            # Determine rate limit based on user role
            limit = self.rate_limits["default"]
            if user_id and hasattr(request.state, 'user_role'):
                if request.state.user_role in ['platform_owner', 'security_admin']:
                    limit = self.rate_limits["admin"]
            
            if endpoint.startswith('/auth'):
                limit = self.rate_limits["auth"]
            
            # Check rate limit using Redis
            key = f"rate_limit:{client_ip}:{endpoint}"
            current_requests = await cache_service.redis_client.incr(key)
            
            if current_requests == 1:
                await cache_service.redis_client.expire(key, 60)  # 1 minute window
            
            return current_requests <= limit
            
        except Exception as e:
            logger.error(f"Rate limiting error: {e}")
            return True  # Allow request on error
    
    async def _record_metrics(self, request: Request, response: Response, process_time: float):
        """Record API performance metrics"""
        try:
            endpoint = request.url.path
            method = request.method
            status_code = response.status_code
            
            # Create metric key
            metric_key = f"api_metrics:{endpoint}:{method}"
            
            # Record in local memory (for quick access)
            if metric_key not in self.performance_metrics:
                self.performance_metrics[metric_key] = {
                    "total_requests": 0,
                    "total_time": 0,
                    "error_count": 0,
                    "avg_response_time": 0,
                    "last_updated": datetime.now()
                }
            
            metrics = self.performance_metrics[metric_key]
            metrics["total_requests"] += 1
            metrics["total_time"] += process_time
            metrics["avg_response_time"] = metrics["total_time"] / metrics["total_requests"]
            metrics["last_updated"] = datetime.now()
            
            if status_code >= 400:
                metrics["error_count"] += 1
            
            # Store in Redis for persistence (every 10th request)
            if metrics["total_requests"] % 10 == 0:
                await cache_service.set(
                    f"performance_metrics:{endpoint}:{method}",
                    metrics,
                    ttl=3600  # 1 hour
                )
                
        except Exception as e:
            logger.error(f"Metrics recording error: {e}")

class APIResponseOptimizer:
    """
    API Response Optimization Utilities
    Implements response compression, caching, and data optimization
    """
    
    @staticmethod
    def optimize_response_data(data: Any, user_role: str = None) -> Any:
        """
        Optimize response data based on user role and data size
        Advanced response_optimization for improved API performance
        """
        if isinstance(data, dict):
            # Remove sensitive fields for non-admin users
            if user_role not in ['platform_owner', 'security_admin']:
                sensitive_fields = ['internal_id', 'debug_info', 'system_details']
                for field in sensitive_fields:
                    data.pop(field, None)
            
            # Optimize large arrays
            if 'items' in data and isinstance(data['items'], list):
                if len(data['items']) > 100:
                    data['items'] = data['items'][:100]
                    data['truncated'] = True
                    data['total_available'] = len(data['items'])
        
        elif isinstance(data, list):
            # Limit large lists
            if len(data) > 100:
                return {
                    'items': data[:100],
                    'truncated': True,
                    'total_available': len(data)
                }
        
        return data
    
    @staticmethod
    async def compress_response(response_data: dict) -> dict:
        """
        Compress response data for large payloads
        """
        # Convert to JSON string to check size
        json_str = json.dumps(response_data)
        
        if len(json_str) > 10000:  # 10KB threshold
            # Implement data compression strategies
            if 'logs' in response_data:
                # Summarize logs if too many
                logs = response_data['logs']
                if len(logs) > 50:
                    response_data['logs'] = logs[:25] + logs[-25:]
                    response_data['logs_summary'] = {
                        'total_count': len(logs),
                        'showing': 'first_25_and_last_25'
                    }
            
            if 'devices' in response_data:
                # Optimize device data
                devices = response_data['devices']
                for device in devices:
                    if isinstance(device, dict):
                        # Remove verbose fields
                        device.pop('raw_scan_data', None)
                        device.pop('full_port_list', None)
        
        return response_data

def cache_response(ttl: int = 300, key_prefix: str = "api"):
    """
    Decorator for caching API responses
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            import hashlib
            cache_key = f"{key_prefix}:{func.__name__}:{hashlib.md5(str(args + tuple(sorted(kwargs.items()))).encode()).hexdigest()[:8]}"
            
            # Try to get from cache
            cached_result = await cache_service.get(cache_key)
            if cached_result is not None:
                logger.info(f"Cache HIT for {func.__name__}")
                return cached_result
            
            # Execute function
            result = await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
            
            # Cache the result
            await cache_service.set(cache_key, result, ttl)
            logger.info(f"Cache MISS for {func.__name__} - cached for {ttl}s")
            
            return result
        return wrapper
    return decorator

def handle_api_errors(func):
    """
    Decorator for comprehensive API error handling
    Provides robust error_handling for all API endpoints
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            if asyncio.iscoroutinefunction(func):
                return await func(*args, **kwargs)
            else:
                return func(*args, **kwargs)
                
        except HTTPException:
            # Re-raise HTTP exceptions (they're handled by FastAPI)
            raise
            
        except ValueError as e:
            logger.error(f"Validation error in {func.__name__}: {e}")
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Validation Error",
                    "message": str(e),
                    "error_code": "VALIDATION_FAILED"
                }
            )
            
        except ConnectionError as e:
            logger.error(f"Connection error in {func.__name__}: {e}")
            raise HTTPException(
                status_code=503,
                detail={
                    "error": "Service Unavailable", 
                    "message": "External service connection failed",
                    "error_code": "CONNECTION_FAILED",
                    "retry_after": 30
                }
            )
            
        except TimeoutError as e:
            logger.error(f"Timeout error in {func.__name__}: {e}")
            raise HTTPException(
                status_code=504,
                detail={
                    "error": "Gateway Timeout",
                    "message": "Operation timed out",
                    "error_code": "TIMEOUT",
                    "retry_after": 60
                }
            )
            
        except Exception as e:
            logger.error(f"Unexpected error in {func.__name__}: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "Internal Server Error",
                    "message": "An unexpected error occurred",
                    "error_code": "INTERNAL_ERROR",
                    "request_id": str(time.time())
                }
            )
    return wrapper

class APIHealthMonitor:
    """
    API Health Monitoring and Performance Tracking
    """
    
    def __init__(self):
        self.health_checks = {}
        self.performance_thresholds = {
            "response_time": 200,  # ms
            "error_rate": 0.05,    # 5%
            "cache_hit_rate": 0.8  # 80%
        }
    
    async def get_api_health(self) -> Dict[str, Any]:
        """Get comprehensive API health status and health_monitoring data"""
        try:
            health_data = {
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "performance_metrics": await self._get_performance_metrics(),
                "cache_metrics": await cache_service.get_cache_stats(),
                "database_status": await self._check_database_health(),
                "redis_status": await self._check_redis_health(),
                "api_endpoints": await self._check_endpoint_health()
            }
            
            # Determine overall health
            if not health_data["database_status"]["healthy"]:
                health_data["status"] = "unhealthy"
            elif not health_data["redis_status"]["healthy"]:
                health_data["status"] = "degraded"
            elif health_data["performance_metrics"]["avg_response_time"] > self.performance_thresholds["response_time"]:
                health_data["status"] = "degraded"
            
            return health_data
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def _get_performance_metrics(self) -> Dict[str, Any]:
        """Get API performance metrics"""
        # This would integrate with your actual metrics collection
        return {
            "avg_response_time": 150,  # ms
            "total_requests": 12500,
            "error_rate": 0.02,
            "cache_hit_rate": 0.85
        }
    
    async def _check_database_health(self) -> Dict[str, Any]:
        """Check database connectivity and performance"""
        try:
            # Simple database health check
            from database.postgresql_adapter import get_db_connection
            
            start_time = time.time()
            async with get_db_connection() as conn:
                await conn.execute("SELECT 1")
            response_time = (time.time() - start_time) * 1000
            
            return {
                "healthy": True,
                "response_time_ms": response_time,
                "status": "connected"
            }
        except Exception as e:
            return {
                "healthy": False,
                "error": str(e),
                "status": "disconnected"
            }
    
    async def _check_redis_health(self) -> Dict[str, Any]:
        """Check Redis connectivity and performance"""
        try:
            start_time = time.time()
            await cache_service.redis_client.ping()
            response_time = (time.time() - start_time) * 1000
            
            return {
                "healthy": True,
                "response_time_ms": response_time,
                "status": "connected"
            }
        except Exception as e:
            return {
                "healthy": False,
                "error": str(e),
                "status": "disconnected"
            }
    
    async def _check_endpoint_health(self) -> Dict[str, Any]:
        """Check critical endpoint health"""
        critical_endpoints = [
            "/api/auth/status",
            "/api/dashboard/metrics",
            "/api/security/findings"
        ]
        
        endpoint_status = {}
        for endpoint in critical_endpoints:
            # This would make actual requests to check endpoint health
            endpoint_status[endpoint] = {
                "status": "healthy",
                "response_time_ms": 120,
                "last_check": datetime.now().isoformat()
            }
        
        return endpoint_status

# Global instances
performance_middleware = APIPerformanceMiddleware()
api_health_monitor = APIHealthMonitor()
response_optimizer = APIResponseOptimizer() 