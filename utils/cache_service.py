"""
SecureNet Enterprise Cache Service
Day 2 Sprint 1: Redis Caching Implementation for Performance Optimization
"""

import json
import logging
import asyncio
import hashlib
from typing import Any, Optional, Dict, List, Union
from datetime import datetime, timedelta
import redis.asyncio as redis
import os
from functools import wraps

logger = logging.getLogger(__name__)

class CacheService:
    """
    Enterprise Redis caching service for SecureNet
    Implements high-performance caching with TTL management and invalidation strategies
    """
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.connected = False
        
        # Cache configuration
        self.config = {
            "host": os.getenv("REDIS_HOST", "localhost"),
            "port": int(os.getenv("REDIS_PORT", 6379)),
            "db": int(os.getenv("REDIS_DB", 0)),
            "password": os.getenv("REDIS_PASSWORD"),
            "decode_responses": True,
            "socket_keepalive": True,
            "socket_keepalive_options": {},
            "health_check_interval": 30,
            "retry_on_timeout": True,
            "max_connections": 50,
        }
        
        # Default TTL values (in seconds)
        self.default_ttls = {
            "security_findings": 300,      # 5 minutes
            "network_devices": 600,        # 10 minutes  
            "dashboard_metrics": 180,      # 3 minutes
            "user_sessions": 3600,         # 1 hour
            "api_responses": 300,          # 5 minutes
            "vulnerability_data": 1800,    # 30 minutes
            "audit_logs": 900,             # 15 minutes
        }
    
    async def initialize(self) -> bool:
        """Initialize Redis connection with connection pool"""
        try:
            self.redis_client = redis.Redis(
                host=self.config["host"],
                port=self.config["port"],
                db=self.config["db"],
                password=self.config["password"],
                decode_responses=self.config["decode_responses"],
                socket_keepalive=self.config["socket_keepalive"],
                max_connections=self.config["max_connections"],
                retry_on_timeout=self.config["retry_on_timeout"],
            )
            
            # Test connection
            await self.redis_client.ping()
            self.connected = True
            
            logger.info(f"Redis cache service initialized successfully")
            logger.info(f"Redis server: {self.config['host']}:{self.config['port']}")
            logger.info(f"Connection pool: {self.config['max_connections']} max connections")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize Redis cache service: {e}")
            self.connected = False
            return False
    
    async def close(self):
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()
            self.connected = False
            logger.info("Redis cache service closed")
    
    def _generate_key(self, prefix: str, identifier: str, **kwargs) -> str:
        """Generate cache key with optional parameters"""
        key_parts = [prefix, identifier]
        
        if kwargs:
            # Sort kwargs for consistent key generation
            sorted_kwargs = sorted(kwargs.items())
            kwargs_str = "_".join([f"{k}:{v}" for k, v in sorted_kwargs])
            key_parts.append(kwargs_str)
        
        return ":".join(key_parts)
    
    def _serialize_data(self, data: Any) -> str:
        """Serialize data for Redis storage"""
        try:
            if isinstance(data, (dict, list)):
                return json.dumps(data, default=str)
            return str(data)
        except Exception as e:
            logger.error(f"Failed to serialize data: {e}")
            return str(data)
    
    def _deserialize_data(self, data: str) -> Any:
        """Deserialize data from Redis"""
        try:
            return json.loads(data)
        except (json.JSONDecodeError, TypeError):
            return data
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache with optional TTL"""
        if not self.connected:
            return False
        
        try:
            serialized_value = self._serialize_data(value)
            
            if ttl:
                await self.redis_client.setex(key, ttl, serialized_value)
            else:
                await self.redis_client.set(key, serialized_value)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to set cache key {key}: {e}")
            return False
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.connected:
            return None
        
        try:
            value = await self.redis_client.get(key)
            if value is None:
                return None
            
            return self._deserialize_data(value)
            
        except Exception as e:
            logger.error(f"Failed to get cache key {key}: {e}")
            return None
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if not self.connected:
            return False
        
        try:
            result = await self.redis_client.delete(key)
            return result > 0
            
        except Exception as e:
            logger.error(f"Failed to delete cache key {key}: {e}")
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        if not self.connected:
            return False
        
        try:
            return await self.redis_client.exists(key) > 0
        except Exception as e:
            logger.error(f"Failed to check cache key existence {key}: {e}")
            return False
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate all keys matching pattern"""
        if not self.connected:
            return 0
        
        try:
            keys = await self.redis_client.keys(pattern)
            if keys:
                return await self.redis_client.delete(*keys)
            return 0
            
        except Exception as e:
            logger.error(f"Failed to invalidate pattern {pattern}: {e}")
            return 0
    
    # High-level caching methods for specific SecureNet data
    
    async def cache_security_findings(self, findings: List[Dict], org_id: str = None) -> bool:
        """Cache security findings data"""
        key = self._generate_key("security_findings", org_id or "global")
        return await self.set(key, findings, self.default_ttls["security_findings"])
    
    async def get_security_findings(self, org_id: str = None) -> Optional[List[Dict]]:
        """Get cached security findings"""
        key = self._generate_key("security_findings", org_id or "global")
        return await self.get(key)
    
    async def cache_network_devices(self, devices: List[Dict], org_id: str = None) -> bool:
        """Cache network devices data"""
        key = self._generate_key("network_devices", org_id or "global")
        return await self.set(key, devices, self.default_ttls["network_devices"])
    
    async def get_network_devices(self, org_id: str = None) -> Optional[List[Dict]]:
        """Get cached network devices"""
        key = self._generate_key("network_devices", org_id or "global")
        return await self.get(key)
    
    async def cache_dashboard_metrics(self, metrics: Dict, org_id: str = None) -> bool:
        """Cache dashboard metrics"""
        key = self._generate_key("dashboard_metrics", org_id or "global")
        return await self.set(key, metrics, self.default_ttls["dashboard_metrics"])
    
    async def get_dashboard_metrics(self, org_id: str = None) -> Optional[Dict]:
        """Get cached dashboard metrics"""
        key = self._generate_key("dashboard_metrics", org_id or "global")
        return await self.get(key)
    
    async def cache_api_response(self, endpoint: str, params_hash: str, response: Any, ttl: int = None) -> bool:
        """Cache API response data"""
        key = self._generate_key("api_response", endpoint, params=params_hash)
        return await self.set(key, response, ttl or self.default_ttls["api_responses"])
    
    async def get_api_response(self, endpoint: str, params_hash: str) -> Optional[Any]:
        """Get cached API response"""
        key = self._generate_key("api_response", endpoint, params=params_hash)
        return await self.get(key)
    
    async def invalidate_organization_cache(self, org_id: str):
        """Invalidate all cached data for an organization"""
        patterns = [
            f"security_findings:{org_id}*",
            f"network_devices:{org_id}*", 
            f"dashboard_metrics:{org_id}*",
        ]
        
        total_invalidated = 0
        for pattern in patterns:
            total_invalidated += await self.invalidate_pattern(pattern)
        
        logger.info(f"Invalidated {total_invalidated} cache keys for organization {org_id}")
        return total_invalidated
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache performance statistics"""
        if not self.connected:
            return {"connected": False}
        
        try:
            info = await self.redis_client.info()
            
            return {
                "connected": True,
                "used_memory": info.get("used_memory_human", "0B"),
                "connected_clients": info.get("connected_clients", 0),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "hit_rate": self._calculate_hit_rate(
                    info.get("keyspace_hits", 0), 
                    info.get("keyspace_misses", 0)
                ),
                "total_keys": await self.redis_client.dbsize(),
            }
            
        except Exception as e:
            logger.error(f"Failed to get cache stats: {e}")
            return {"connected": False, "error": str(e)}
    
    def _calculate_hit_rate(self, hits: int, misses: int) -> float:
        """Calculate cache hit rate percentage"""
        total = hits + misses
        return (hits / total * 100) if total > 0 else 0.0

# Global cache service instance
cache_service = CacheService()

# Decorator for automatic caching
def cached(ttl: int = 300, key_prefix: str = "auto"):
    """
    Decorator for automatic function result caching
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            func_name = func.__name__
            args_hash = hashlib.md5(str(args + tuple(sorted(kwargs.items()))).encode()).hexdigest()[:8]
            cache_key = f"{key_prefix}:{func_name}:{args_hash}"
            
            # Try to get from cache first
            cached_result = await cache_service.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            await cache_service.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator 