"""
SecureNet Week 2 Day 2: Backend Performance Optimization
Redis API caching, enhanced rate limiting, and background job processing
"""

import asyncio
import time
import json
import hashlib
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from functools import wraps
import redis.asyncio as redis
from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from utils.cache_service import cache_service

logger = logging.getLogger(__name__)

class Week2APICache:
    """Redis-based API endpoint caching for Week 2 Day 2"""
    
    def __init__(self):
        self.endpoint_ttls = {
            "/api/dashboard": 60,
            "/api/security": 120, 
            "/api/network": 180,
            "/api/logs": 300,
            "/api/notifications": 180
        }
        self.stats = {"hits": 0, "misses": 0, "total": 0}
    
    async def get_cached_response(self, endpoint: str, params: str = "") -> Optional[Any]:
        """Get cached API response"""
        cache_key = f"api:{endpoint}:{hashlib.md5(params.encode()).hexdigest()[:8]}"
        
        try:
            cached = await cache_service.get(cache_key)
            if cached:
                self.stats["hits"] += 1
                self.stats["total"] += 1
                logger.debug(f"Cache HIT: {endpoint}")
                return cached
            else:
                self.stats["misses"] += 1
                self.stats["total"] += 1
                logger.debug(f"Cache MISS: {endpoint}")
                return None
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return None
    
    async def cache_response(self, endpoint: str, params: str, data: Any) -> bool:
        """Cache API response with appropriate TTL"""
        cache_key = f"api:{endpoint}:{hashlib.md5(params.encode()).hexdigest()[:8]}"
        ttl = self.endpoint_ttls.get(endpoint, 300)
        
        try:
            success = await cache_service.set(cache_key, data, ttl)
            if success:
                logger.debug(f"Cached: {endpoint} (TTL: {ttl}s)")
            return success
        except Exception as e:
            logger.error(f"Cache set error: {e}")
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache performance statistics"""
        hit_rate = (self.stats["hits"] / max(self.stats["total"], 1)) * 100
        return {
            **self.stats,
            "hit_rate": round(hit_rate, 2)
        }

class Week2RateLimiter:
    """Enhanced rate limiting for Week 2 Day 2"""
    
    def __init__(self):
        self.limits = {
            "default": 100,  # requests per minute
            "auth": 10,
            "scans": 5,
            "admin": 200
        }
        self.stats = {"total": 0, "blocked": 0}
    
    async def check_limit(self, client_ip: str, endpoint: str, user_role: str = None) -> Dict[str, Any]:
        """Check if request is within rate limits"""
        # Determine limit based on endpoint and user role
        if endpoint.startswith("/api/auth"):
            limit = self.limits["auth"]
        elif "scan" in endpoint:
            limit = self.limits["scans"]
        elif user_role in ["platform_owner", "security_admin"]:
            limit = self.limits["admin"]
        else:
            limit = self.limits["default"]
        
        # Redis key for rate limiting
        minute = int(time.time()) // 60
        key = f"rate_limit:{client_ip}:{endpoint}:{minute}"
        
        try:
            current = await cache_service.redis_client.incr(key)
            if current == 1:
                await cache_service.redis_client.expire(key, 120)
            
            self.stats["total"] += 1
            
            if current > limit:
                self.stats["blocked"] += 1
                return {
                    "allowed": False,
                    "limit": limit,
                    "remaining": 0,
                    "message": f"Rate limit exceeded: {current}/{limit}"
                }
            
            return {
                "allowed": True,
                "limit": limit,
                "remaining": limit - current
            }
            
        except Exception as e:
            logger.error(f"Rate limit check error: {e}")
            return {"allowed": True, "limit": limit, "remaining": limit}
    
    def get_stats(self) -> Dict[str, Any]:
        """Get rate limiting statistics"""
        block_rate = (self.stats["blocked"] / max(self.stats["total"], 1)) * 100
        return {
            **self.stats,
            "block_rate": round(block_rate, 2)
        }

class Week2BackgroundJobs:
    """Background job processing for Week 2 Day 2"""
    
    def __init__(self):
        self.job_queue = asyncio.Queue(maxsize=100)
        self.stats = {"submitted": 0, "completed": 0, "failed": 0}
        self.processing = False
    
    async def start(self):
        """Start background job processing"""
        if not self.processing:
            self.processing = True
            asyncio.create_task(self._process_jobs())
            logger.info("Background job processor started")
    
    async def stop(self):
        """Stop background job processing"""
        self.processing = False
        logger.info("Background job processor stopped")
    
    async def submit_job(self, job_type: str, data: Dict[str, Any]) -> str:
        """Submit a job for background processing"""
        job_id = f"{job_type}_{int(time.time())}"
        job = {
            "id": job_id,
            "type": job_type,
            "data": data,
            "submitted_at": datetime.now()
        }
        
        try:
            await self.job_queue.put(job)
            self.stats["submitted"] += 1
            logger.info(f"Job submitted: {job_id}")
            return job_id
        except Exception as e:
            logger.error(f"Job submission failed: {e}")
            return ""
    
    async def _process_jobs(self):
        """Process jobs from the queue"""
        while self.processing:
            try:
                if not self.job_queue.empty():
                    job = await asyncio.wait_for(self.job_queue.get(), timeout=1.0)
                    await self._execute_job(job)
                else:
                    await asyncio.sleep(0.1)
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Job processing error: {e}")
    
    async def _execute_job(self, job: Dict[str, Any]):
        """Execute a single job"""
        try:
            job_type = job["type"]
            logger.info(f"Processing job: {job['id']} ({job_type})")
            
            # Simulate job processing based on type
            if job_type == "security_scan":
                await asyncio.sleep(2)  # Simulate scan time
                result = {"vulnerabilities": 3, "status": "completed"}
            elif job_type == "log_analysis":
                await asyncio.sleep(3)  # Simulate analysis time
                result = {"anomalies": 1, "status": "completed"}
            elif job_type == "cache_warm":
                await asyncio.sleep(1)  # Simulate cache warming
                result = {"endpoints_warmed": 5, "status": "completed"}
            else:
                await asyncio.sleep(1)  # Generic processing
                result = {"status": "completed"}
            
            self.stats["completed"] += 1
            logger.info(f"Job completed: {job['id']}")
            
        except Exception as e:
            self.stats["failed"] += 1
            logger.error(f"Job failed: {job['id']} - {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get job processing statistics"""
        return {
            **self.stats,
            "queue_size": self.job_queue.qsize()
        }

# Cache response decorator for easy use
def cache_api_response(ttl: int = 300):
    """Decorator to cache API responses"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key from function and args
            key = f"func:{func.__name__}:{hash(str(args))}"
            
            # Try cache first
            cached = await cache_service.get(key)
            if cached:
                return cached
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            await cache_service.set(key, result, ttl)
            return result
        return wrapper
    return decorator

# Rate limit decorator
def rate_limit(requests_per_minute: int = 60):
    """Decorator to add rate limiting to endpoints"""
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            client_ip = request.client.host if request.client else "unknown"
            endpoint = request.url.path
            
            # Check rate limit
            limiter = Week2RateLimiter()
            result = await limiter.check_limit(client_ip, endpoint)
            
            if not result["allowed"]:
                raise HTTPException(
                    status_code=429,
                    detail=result["message"]
                )
            
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator

# Global instances
api_cache = Week2APICache()
rate_limiter = Week2RateLimiter() 
job_processor = Week2BackgroundJobs()

async def initialize_week2_day2():
    """Initialize Week 2 Day 2 performance systems"""
    logger.info("Initializing Week 2 Day 2 Backend Performance...")
    
    # Initialize cache service
    if not cache_service.connected:
        await cache_service.initialize()
    
    # Start background job processor
    await job_processor.start()
    
    logger.info("Week 2 Day 2 Backend Performance initialized successfully")

async def get_performance_metrics() -> Dict[str, Any]:
    """Get comprehensive performance metrics"""
    return {
        "api_cache": api_cache.get_stats(),
        "rate_limiting": rate_limiter.get_stats(), 
        "background_jobs": job_processor.get_stats(),
        "timestamp": datetime.now().isoformat()
    } 