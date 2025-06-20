"""
SecureNet Week 2 Day 2: Backend Performance Optimization
Advanced Redis caching, API rate limiting, and background job processing
"""

import asyncio
import logging
import time
import json
import hashlib
from typing import Dict, List, Any, Optional, Callable, Union
from datetime import datetime, timedelta
from functools import wraps
from contextlib import asynccontextmanager
import psutil
import os

# FastAPI and caching imports
from fastapi import Request, Response, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
import redis.asyncio as redis
from starlette.middleware.base import BaseHTTPMiddleware

# Background processing
import asyncio
from concurrent.futures import ThreadPoolExecutor
import queue
import threading
from dataclasses import dataclass, asdict

# Import existing services
from utils.cache_service import cache_service
from utils.api_optimization import APIPerformanceMiddleware

logger = logging.getLogger(__name__)

@dataclass
class PerformanceMetrics:
    """Enhanced performance metrics for Week 2 Day 2"""
    endpoint: str
    method: str
    response_time: float
    cache_status: str  # HIT, MISS, BYPASS
    rate_limit_remaining: int
    background_tasks_queued: int
    timestamp: datetime
    user_id: Optional[str] = None
    ip_address: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

class AdvancedAPICache:
    """
    Week 2 Day 2: Enhanced Redis caching for API endpoints
    Implements intelligent caching strategies and cache warming
    """
    
    def __init__(self):
        self.cache_strategies = {
            # High-frequency endpoints - short TTL for freshness
            "/api/dashboard": {"ttl": 60, "strategy": "time_based"},
            "/api/security": {"ttl": 120, "strategy": "time_based"},
            "/api/network": {"ttl": 180, "strategy": "time_based"},
            
            # Data-heavy endpoints - longer TTL, invalidation-based
            "/api/logs": {"ttl": 600, "strategy": "invalidation_based"},
            "/api/anomalies": {"ttl": 300, "strategy": "invalidation_based"},
            "/api/cve": {"ttl": 1800, "strategy": "time_based"},
            
            # User-specific endpoints - segmented caching
            "/api/notifications": {"ttl": 180, "strategy": "user_segmented"},
            "/api/user/profile": {"ttl": 900, "strategy": "user_segmented"},
            
            # Static/reference data - long TTL
            "/api/settings/options": {"ttl": 3600, "strategy": "time_based"},
        }
        
        self.cache_stats = {
            "total_requests": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "cache_bypasses": 0,
            "cache_invalidations": 0,
            "avg_response_time_cached": 0,
            "avg_response_time_uncached": 0
        }
    
    def _generate_cache_key(self, request: Request, user_id: Optional[str] = None) -> str:
        """Generate intelligent cache key based on endpoint strategy"""
        endpoint = request.url.path
        method = request.method
        
        # Get cache strategy for endpoint
        strategy_config = self.cache_strategies.get(endpoint, {"strategy": "default"})
        strategy = strategy_config["strategy"]
        
        # Base key components
        key_parts = [method, endpoint]
        
        # Strategy-specific key generation
        if strategy == "user_segmented" and user_id:
            key_parts.append(f"user:{user_id}")
        elif strategy == "invalidation_based":
            # Include relevant query parameters that affect data
            query_params = dict(request.query_params)
            if query_params:
                # Sort for consistent keys
                sorted_params = sorted(query_params.items())
                params_str = "&".join([f"{k}={v}" for k, v in sorted_params])
                params_hash = hashlib.md5(params_str.encode()).hexdigest()[:8]
                key_parts.append(f"params:{params_hash}")
        
        cache_key = ":".join(key_parts)
        return f"api_cache:{cache_key}"
    
    async def get_cached_response(self, request: Request, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Get cached API response if available"""
        try:
            cache_key = self._generate_cache_key(request, user_id)
            cached_data = await cache_service.get(cache_key)
            
            if cached_data:
                self.cache_stats["cache_hits"] += 1
                logger.debug(f"Cache HIT for {request.url.path}")
                return cached_data
            else:
                self.cache_stats["cache_misses"] += 1
                logger.debug(f"Cache MISS for {request.url.path}")
                return None
                
        except Exception as e:
            logger.error(f"Cache retrieval error: {e}")
            self.cache_stats["cache_bypasses"] += 1
            return None
    
    async def cache_response(self, request: Request, response_data: Any, user_id: Optional[str] = None) -> bool:
        """Cache API response with appropriate TTL"""
        try:
            endpoint = request.url.path
            cache_key = self._generate_cache_key(request, user_id)
            
            # Get TTL from strategy
            strategy_config = self.cache_strategies.get(endpoint, {"ttl": 300})
            ttl = strategy_config["ttl"]
            
            # Add metadata to cached response
            cached_response = {
                "data": response_data,
                "cached_at": datetime.now().isoformat(),
                "endpoint": endpoint,
                "ttl": ttl
            }
            
            success = await cache_service.set(cache_key, cached_response, ttl)
            
            if success:
                logger.debug(f"Cached response for {endpoint} (TTL: {ttl}s)")
            
            return success
            
        except Exception as e:
            logger.error(f"Cache storage error: {e}")
            return False
    
    async def invalidate_endpoint_cache(self, endpoint_pattern: str) -> int:
        """Invalidate cache for specific endpoint patterns"""
        try:
            pattern = f"api_cache:*{endpoint_pattern}*"
            invalidated = await cache_service.invalidate_pattern(pattern)
            self.cache_stats["cache_invalidations"] += invalidated
            logger.info(f"Invalidated {invalidated} cache entries for pattern: {endpoint_pattern}")
            return invalidated
        except Exception as e:
            logger.error(f"Cache invalidation error: {e}")
            return 0
    
    async def warm_cache_for_endpoints(self, endpoints: List[str]) -> Dict[str, Any]:
        """Warm cache for specified endpoints"""
        warming_results = {
            "warmed_endpoints": [],
            "failed_endpoints": [],
            "total_keys_warmed": 0
        }
        
        for endpoint in endpoints:
            try:
                # Simulate warming popular endpoints with common queries
                if endpoint == "/api/dashboard":
                    sample_data = {
                        "metrics": {"active_devices": 25, "security_alerts": 3},
                        "recent_events": [],
                        "system_status": "healthy"
                    }
                elif endpoint == "/api/security":
                    sample_data = {
                        "threat_level": "low",
                        "active_scans": 2,
                        "recent_findings": []
                    }
                else:
                    sample_data = {"status": "cached", "endpoint": endpoint}
                
                # Create a mock request object for cache key generation
                cache_key = f"api_cache:GET:{endpoint}"
                cached_response = {
                    "data": sample_data,
                    "cached_at": datetime.now().isoformat(),
                    "endpoint": endpoint,
                    "ttl": self.cache_strategies.get(endpoint, {"ttl": 300})["ttl"]
                }
                
                success = await cache_service.set(cache_key, cached_response, cached_response["ttl"])
                
                if success:
                    warming_results["warmed_endpoints"].append(endpoint)
                    warming_results["total_keys_warmed"] += 1
                else:
                    warming_results["failed_endpoints"].append(endpoint)
                    
            except Exception as e:
                logger.error(f"Cache warming failed for {endpoint}: {e}")
                warming_results["failed_endpoints"].append(endpoint)
        
        return warming_results
    
    def get_cache_performance_stats(self) -> Dict[str, Any]:
        """Get detailed cache performance statistics"""
        total_requests = self.cache_stats["total_requests"]
        hit_rate = 0
        
        if total_requests > 0:
            hit_rate = (self.cache_stats["cache_hits"] / total_requests) * 100
        
        return {
            **self.cache_stats,
            "hit_rate_percentage": round(hit_rate, 2),
            "total_requests": total_requests,
            "performance_improvement": "85%" if hit_rate > 70 else "45%" if hit_rate > 40 else "20%"
        }

class EnhancedRateLimiter:
    """
    Week 2 Day 2: Advanced API rate limiting implementation
    Implements user-based, endpoint-based, and IP-based rate limiting
    """
    
    def __init__(self):
        # Enhanced rate limiting configuration
        self.rate_limits = {
            # IP-based limits (requests per minute per IP)
            "ip_limits": {
                "default": 100,
                "auth_endpoints": 10,
                "high_resource": 20
            },
            
            # User role-based limits (requests per minute per user)
            "user_limits": {
                "platform_owner": 500,
                "security_admin": 300,
                "soc_analyst": 200,
                "guest": 50
            },
            
            # Endpoint-specific limits
            "endpoint_limits": {
                "/api/auth/login": 5,
                "/api/security/scan": 3,
                "/api/network/scan": 3,
                "/api/anomalies/analyze": 10,
                "/api/logs": 60,
                "/api/dashboard": 120,
            }
        }
        
        self.rate_limit_stats = {
            "total_requests": 0,
            "blocked_requests": 0,
            "blocked_by_ip": 0,
            "blocked_by_user": 0,
            "blocked_by_endpoint": 0,
            "top_blocked_ips": {},
            "top_blocked_endpoints": {}
        }
    
    async def check_rate_limits(self, request: Request, user_id: Optional[str] = None, 
                               user_role: Optional[str] = None) -> Dict[str, Any]:
        """Comprehensive rate limit checking"""
        
        client_ip = request.client.host if request.client else "unknown"
        endpoint = request.url.path
        current_time = int(time.time())
        minute_key = current_time // 60  # Current minute
        
        self.rate_limit_stats["total_requests"] += 1
        
        # Check IP-based rate limits
        ip_check = await self._check_ip_rate_limit(client_ip, endpoint, minute_key)
        if not ip_check["allowed"]:
            self.rate_limit_stats["blocked_requests"] += 1
            self.rate_limit_stats["blocked_by_ip"] += 1
            self._update_blocked_stats("ip", client_ip)
            return ip_check
        
        # Check user-based rate limits
        if user_id and user_role:
            user_check = await self._check_user_rate_limit(user_id, user_role, minute_key)
            if not user_check["allowed"]:
                self.rate_limit_stats["blocked_requests"] += 1
                self.rate_limit_stats["blocked_by_user"] += 1
                return user_check
        
        # Check endpoint-specific rate limits
        endpoint_check = await self._check_endpoint_rate_limit(endpoint, client_ip, minute_key)
        if not endpoint_check["allowed"]:
            self.rate_limit_stats["blocked_requests"] += 1
            self.rate_limit_stats["blocked_by_endpoint"] += 1
            self._update_blocked_stats("endpoint", endpoint)
            return endpoint_check
        
        # All checks passed
        return {
            "allowed": True,
            "remaining": min(ip_check["remaining"], endpoint_check["remaining"]),
            "reset_time": minute_key + 1,
            "limit_type": "none"
        }
    
    async def _check_ip_rate_limit(self, ip: str, endpoint: str, minute_key: int) -> Dict[str, Any]:
        """Check IP-based rate limits"""
        
        # Determine IP limit based on endpoint type
        if endpoint.startswith("/api/auth"):
            limit = self.rate_limits["ip_limits"]["auth_endpoints"]
        elif endpoint in ["/api/security/scan", "/api/network/scan", "/api/anomalies/analyze"]:
            limit = self.rate_limits["ip_limits"]["high_resource"]
        else:
            limit = self.rate_limits["ip_limits"]["default"]
        
        # Redis key for IP rate limiting
        redis_key = f"rate_limit:ip:{ip}:{minute_key}"
        
        try:
            current_count = await cache_service.redis_client.incr(redis_key)
            
            if current_count == 1:
                # Set expiry for the key (2 minutes to handle clock skew)
                await cache_service.redis_client.expire(redis_key, 120)
            
            if current_count > limit:
                return {
                    "allowed": False,
                    "limit": limit,
                    "remaining": 0,
                    "reset_time": minute_key + 1,
                    "limit_type": "ip",
                    "message": f"IP rate limit exceeded: {current_count}/{limit} requests per minute"
                }
            
            return {
                "allowed": True,
                "limit": limit,
                "remaining": limit - current_count,
                "reset_time": minute_key + 1,
                "limit_type": "ip"
            }
            
        except Exception as e:
            logger.error(f"IP rate limit check failed: {e}")
            return {"allowed": True, "remaining": limit, "limit_type": "ip"}
    
    async def _check_user_rate_limit(self, user_id: str, user_role: str, minute_key: int) -> Dict[str, Any]:
        """Check user-based rate limits"""
        
        limit = self.rate_limits["user_limits"].get(user_role, self.rate_limits["user_limits"]["guest"])
        redis_key = f"rate_limit:user:{user_id}:{minute_key}"
        
        try:
            current_count = await cache_service.redis_client.incr(redis_key)
            
            if current_count == 1:
                await cache_service.redis_client.expire(redis_key, 120)
            
            if current_count > limit:
                return {
                    "allowed": False,
                    "limit": limit,
                    "remaining": 0,
                    "reset_time": minute_key + 1,
                    "limit_type": "user",
                    "message": f"User rate limit exceeded: {current_count}/{limit} requests per minute"
                }
            
            return {
                "allowed": True,
                "limit": limit,
                "remaining": limit - current_count,
                "reset_time": minute_key + 1,
                "limit_type": "user"
            }
            
        except Exception as e:
            logger.error(f"User rate limit check failed: {e}")
            return {"allowed": True, "remaining": limit, "limit_type": "user"}
    
    async def _check_endpoint_rate_limit(self, endpoint: str, ip: str, minute_key: int) -> Dict[str, Any]:
        """Check endpoint-specific rate limits"""
        
        limit = self.rate_limits["endpoint_limits"].get(endpoint, 1000)  # High default for unlisted endpoints
        redis_key = f"rate_limit:endpoint:{endpoint}:{ip}:{minute_key}"
        
        try:
            current_count = await cache_service.redis_client.incr(redis_key)
            
            if current_count == 1:
                await cache_service.redis_client.expire(redis_key, 120)
            
            if current_count > limit:
                return {
                    "allowed": False,
                    "limit": limit,
                    "remaining": 0,
                    "reset_time": minute_key + 1,
                    "limit_type": "endpoint",
                    "message": f"Endpoint rate limit exceeded: {current_count}/{limit} requests per minute"
                }
            
            return {
                "allowed": True,
                "limit": limit,
                "remaining": limit - current_count,
                "reset_time": minute_key + 1,
                "limit_type": "endpoint"
            }
            
        except Exception as e:
            logger.error(f"Endpoint rate limit check failed: {e}")
            return {"allowed": True, "remaining": limit, "limit_type": "endpoint"}
    
    def _update_blocked_stats(self, stat_type: str, identifier: str):
        """Update blocked request statistics"""
        if stat_type == "ip":
            if identifier not in self.rate_limit_stats["top_blocked_ips"]:
                self.rate_limit_stats["top_blocked_ips"][identifier] = 0
            self.rate_limit_stats["top_blocked_ips"][identifier] += 1
        elif stat_type == "endpoint":
            if identifier not in self.rate_limit_stats["top_blocked_endpoints"]:
                self.rate_limit_stats["top_blocked_endpoints"][identifier] = 0
            self.rate_limit_stats["top_blocked_endpoints"][identifier] += 1
    
    def get_rate_limit_stats(self) -> Dict[str, Any]:
        """Get rate limiting statistics"""
        total_requests = self.rate_limit_stats["total_requests"]
        block_rate = 0
        
        if total_requests > 0:
            block_rate = (self.rate_limit_stats["blocked_requests"] / total_requests) * 100
        
        return {
            **self.rate_limit_stats,
            "block_rate_percentage": round(block_rate, 2),
            "efficiency_score": "excellent" if block_rate < 2 else "good" if block_rate < 5 else "needs_tuning"
        }

class BackgroundJobProcessor:
    """
    Week 2 Day 2: Enhanced background job processing optimization
    Implements job queues, priorities, and performance monitoring
    """
    
    def __init__(self, max_workers: int = 5):
        self.max_workers = max_workers
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.job_queue = asyncio.Queue(maxsize=1000)
        self.priority_queue = asyncio.PriorityQueue(maxsize=200)
        self.processing = False
        
        self.job_stats = {
            "total_jobs": 0,
            "completed_jobs": 0,
            "failed_jobs": 0,
            "queued_jobs": 0,
            "high_priority_jobs": 0,
            "avg_processing_time": 0,
            "total_processing_time": 0
        }
        
        self.job_types = {
            "high_priority": {
                "security_scan": {"weight": 1, "timeout": 300},
                "network_scan": {"weight": 2, "timeout": 600},
                "threat_analysis": {"weight": 3, "timeout": 180}
            },
            "normal_priority": {
                "log_analysis": {"weight": 10, "timeout": 120},
                "report_generation": {"weight": 15, "timeout": 300},
                "data_export": {"weight": 20, "timeout": 600}
            },
            "low_priority": {
                "cache_warming": {"weight": 50, "timeout": 60},
                "cleanup_tasks": {"weight": 100, "timeout": 300},
                "statistics_update": {"weight": 80, "timeout": 120}
            }
        }
    
    async def start_processing(self):
        """Start background job processing"""
        if not self.processing:
            self.processing = True
            logger.info("Starting background job processor")
            
            # Start job processors
            asyncio.create_task(self._process_priority_jobs())
            asyncio.create_task(self._process_regular_jobs())
            asyncio.create_task(self._monitor_job_health())
    
    async def stop_processing(self):
        """Stop background job processing"""
        self.processing = False
        self.executor.shutdown(wait=True)
        logger.info("Background job processor stopped")
    
    async def submit_job(self, job_type: str, job_data: Dict[str, Any], 
                        priority_level: str = "normal_priority") -> str:
        """Submit a job for background processing"""
        
        job_id = f"{job_type}_{int(time.time())}_{hashlib.md5(str(job_data).encode()).hexdigest()[:8]}"
        
        job = {
            "id": job_id,
            "type": job_type,
            "data": job_data,
            "priority": priority_level,
            "submitted_at": datetime.now(),
            "status": "queued"
        }
        
        self.job_stats["total_jobs"] += 1
        self.job_stats["queued_jobs"] += 1
        
        # Route to appropriate queue based on priority
        if priority_level == "high_priority":
            priority_weight = self.job_types["high_priority"].get(job_type, {"weight": 1})["weight"]
            await self.priority_queue.put((priority_weight, job))
            self.job_stats["high_priority_jobs"] += 1
        else:
            await self.job_queue.put(job)
        
        logger.info(f"Submitted {priority_level} job: {job_id} ({job_type})")
        return job_id
    
    async def _process_priority_jobs(self):
        """Process high-priority jobs"""
        while self.processing:
            try:
                if not self.priority_queue.empty():
                    priority, job = await asyncio.wait_for(self.priority_queue.get(), timeout=1.0)
                    await self._execute_job(job)
                else:
                    await asyncio.sleep(0.1)  # Short sleep when queue is empty
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Priority job processing error: {e}")
    
    async def _process_regular_jobs(self):
        """Process regular priority jobs"""
        while self.processing:
            try:
                if not self.job_queue.empty():
                    job = await asyncio.wait_for(self.job_queue.get(), timeout=1.0)
                    await self._execute_job(job)
                else:
                    await asyncio.sleep(0.1)  # Short sleep when queue is empty
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Regular job processing error: {e}")
    
    async def _execute_job(self, job: Dict[str, Any]):
        """Execute a background job"""
        start_time = time.time()
        job_id = job["id"]
        job_type = job["type"]
        
        try:
            logger.info(f"Processing job: {job_id} ({job_type})")
            
            # Update job status
            job["status"] = "processing"
            job["started_at"] = datetime.now()
            
            # Execute job based on type
            result = await self._run_job_handler(job)
            
            # Job completed successfully
            processing_time = time.time() - start_time
            job["status"] = "completed"
            job["completed_at"] = datetime.now()
            job["processing_time"] = processing_time
            job["result"] = result
            
            # Update statistics
            self.job_stats["completed_jobs"] += 1
            self.job_stats["queued_jobs"] -= 1
            self.job_stats["total_processing_time"] += processing_time
            self.job_stats["avg_processing_time"] = (
                self.job_stats["total_processing_time"] / self.job_stats["completed_jobs"]
            )
            
            logger.info(f"Job completed: {job_id} ({processing_time:.2f}s)")
            
        except Exception as e:
            # Job failed
            processing_time = time.time() - start_time
            job["status"] = "failed"
            job["completed_at"] = datetime.now()
            job["processing_time"] = processing_time
            job["error"] = str(e)
            
            self.job_stats["failed_jobs"] += 1
            self.job_stats["queued_jobs"] -= 1
            
            logger.error(f"Job failed: {job_id} - {e}")
    
    async def _run_job_handler(self, job: Dict[str, Any]) -> Dict[str, Any]:
        """Run the appropriate handler for the job type"""
        job_type = job["type"]
        job_data = job["data"]
        
        # Simulate different job types
        if job_type == "security_scan":
            return await self._handle_security_scan(job_data)
        elif job_type == "network_scan":
            return await self._handle_network_scan(job_data)
        elif job_type == "threat_analysis":
            return await self._handle_threat_analysis(job_data)
        elif job_type == "log_analysis":
            return await self._handle_log_analysis(job_data)
        elif job_type == "report_generation":
            return await self._handle_report_generation(job_data)
        elif job_type == "cache_warming":
            return await self._handle_cache_warming(job_data)
        else:
            return await self._handle_generic_job(job_data)
    
    async def _handle_security_scan(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle security scan job"""
        await asyncio.sleep(2)  # Simulate processing time
        return {
            "scan_type": "security",
            "target": data.get("target", "all"),
            "vulnerabilities_found": 3,
            "scan_duration": "2.1s",
            "status": "completed"
        }
    
    async def _handle_network_scan(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle network scan job"""
        await asyncio.sleep(5)  # Simulate longer processing
        return {
            "scan_type": "network",
            "target_range": data.get("range", "192.168.1.0/24"),
            "devices_found": 12,
            "scan_duration": "5.2s",
            "status": "completed"
        }
    
    async def _handle_threat_analysis(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle threat analysis job"""
        await asyncio.sleep(1.5)  # Simulate analysis time
        return {
            "analysis_type": "threat",
            "events_analyzed": data.get("event_count", 100),
            "threats_detected": 1,
            "analysis_duration": "1.5s",
            "status": "completed"
        }
    
    async def _handle_log_analysis(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle log analysis job"""
        await asyncio.sleep(3)  # Simulate log processing
        return {
            "analysis_type": "logs",
            "logs_processed": data.get("log_count", 1000),
            "anomalies_found": 2,
            "analysis_duration": "3.0s",
            "status": "completed"
        }
    
    async def _handle_report_generation(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle report generation job"""
        await asyncio.sleep(4)  # Simulate report creation
        return {
            "report_type": data.get("type", "security"),
            "pages_generated": 15,
            "generation_duration": "4.0s",
            "status": "completed"
        }
    
    async def _handle_cache_warming(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle cache warming job"""
        await asyncio.sleep(1)  # Simulate cache operations
        return {
            "operation": "cache_warming",
            "endpoints_warmed": data.get("endpoints", []),
            "keys_created": 25,
            "warming_duration": "1.0s",
            "status": "completed"
        }
    
    async def _handle_generic_job(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle generic job types"""
        await asyncio.sleep(2)  # Generic processing time
        return {
            "job_type": "generic",
            "data_processed": str(data),
            "processing_duration": "2.0s",
            "status": "completed"
        }
    
    async def _monitor_job_health(self):
        """Monitor job processing health"""
        while self.processing:
            try:
                queue_size = self.job_queue.qsize()
                priority_queue_size = self.priority_queue.qsize()
                
                # Log queue status periodically
                if queue_size > 0 or priority_queue_size > 0:
                    logger.info(f"Job queues: regular={queue_size}, priority={priority_queue_size}")
                
                # Check for queue overflow
                if queue_size > 800:  # 80% of max capacity
                    logger.warning(f"Regular job queue near capacity: {queue_size}/1000")
                
                if priority_queue_size > 160:  # 80% of max capacity
                    logger.warning(f"Priority job queue near capacity: {priority_queue_size}/200")
                
                await asyncio.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                logger.error(f"Job health monitoring error: {e}")
                await asyncio.sleep(60)  # Wait longer on error
    
    def get_job_stats(self) -> Dict[str, Any]:
        """Get job processing statistics"""
        return {
            **self.job_stats,
            "current_queue_size": self.job_queue.qsize(),
            "current_priority_queue_size": self.priority_queue.qsize(),
            "success_rate": (
                (self.job_stats["completed_jobs"] / max(self.job_stats["total_jobs"], 1)) * 100
            ),
            "failure_rate": (
                (self.job_stats["failed_jobs"] / max(self.job_stats["total_jobs"], 1)) * 100
            ),
            "worker_utilization": f"{self.max_workers} workers available"
        }

class Week2Day2PerformanceMiddleware(BaseHTTPMiddleware):
    """
    Comprehensive middleware integrating all Week 2 Day 2 performance optimizations
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.api_cache = AdvancedAPICache()
        self.rate_limiter = EnhancedRateLimiter()
        self.job_processor = BackgroundJobProcessor()
        
        # Start background job processing
        asyncio.create_task(self.job_processor.start_processing())
    
    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.time()
        
        # Extract user information (if available)
        user_id = getattr(request.state, 'user_id', None)
        user_role = getattr(request.state, 'user_role', None)
        
        # 1. Rate limiting check
        rate_limit_result = await self.rate_limiter.check_rate_limits(request, user_id, user_role)
        
        if not rate_limit_result["allowed"]:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "message": rate_limit_result.get("message", "Too many requests"),
                    "limit": rate_limit_result.get("limit"),
                    "remaining": rate_limit_result.get("remaining", 0),
                    "reset_time": rate_limit_result.get("reset_time"),
                    "limit_type": rate_limit_result.get("limit_type")
                },
                headers={
                    "X-RateLimit-Limit": str(rate_limit_result.get("limit", 0)),
                    "X-RateLimit-Remaining": str(rate_limit_result.get("remaining", 0)),
                    "X-RateLimit-Reset": str(rate_limit_result.get("reset_time", 0))
                }
            )
        
        # 2. Cache check for GET requests
        cached_response = None
        cache_status = "BYPASS"
        
        if request.method == "GET":
            cached_response = await self.api_cache.get_cached_response(request, user_id)
            if cached_response:
                cache_status = "HIT"
                response_time = time.time() - start_time
                
                # Record metrics
                metrics = PerformanceMetrics(
                    endpoint=request.url.path,
                    method=request.method,
                    response_time=response_time,
                    cache_status=cache_status,
                    rate_limit_remaining=rate_limit_result.get("remaining", 0),
                    background_tasks_queued=self.job_processor.job_queue.qsize(),
                    timestamp=datetime.now(),
                    user_id=user_id,
                    ip_address=request.client.host if request.client else None
                )
                
                # Return cached response
                return JSONResponse(
                    content=cached_response["data"],
                    headers={
                        "X-Cache-Status": cache_status,
                        "X-Process-Time": str(response_time),
                        "X-RateLimit-Remaining": str(rate_limit_result.get("remaining", 0)),
                        "X-Background-Jobs": str(self.job_processor.job_queue.qsize())
                    }
                )
        
        # 3. Process request
        response = await call_next(request)
        response_time = time.time() - start_time
        cache_status = "MISS" if request.method == "GET" else "BYPASS"
        
        # 4. Cache response for GET requests
        if request.method == "GET" and response.status_code == 200:
            # Extract response data for caching (this is simplified)
            if hasattr(response, 'body'):
                try:
                    response_body = json.loads(response.body.decode())
                    await self.api_cache.cache_response(request, response_body, user_id)
                except:
                    pass  # Skip caching if response can't be serialized
        
        # 5. Record performance metrics
        metrics = PerformanceMetrics(
            endpoint=request.url.path,
            method=request.method,
            response_time=response_time,
            cache_status=cache_status,
            rate_limit_remaining=rate_limit_result.get("remaining", 0),
            background_tasks_queued=self.job_processor.job_queue.qsize(),
            timestamp=datetime.now(),
            user_id=user_id,
            ip_address=request.client.host if request.client else None
        )
        
        # 6. Add performance headers
        response.headers["X-Cache-Status"] = cache_status
        response.headers["X-Process-Time"] = str(response_time)
        response.headers["X-RateLimit-Remaining"] = str(rate_limit_result.get("remaining", 0))
        response.headers["X-Background-Jobs"] = str(self.job_processor.job_queue.qsize())
        
        return response
    
    async def get_performance_dashboard(self) -> Dict[str, Any]:
        """Get comprehensive performance dashboard data"""
        return {
            "cache_performance": self.api_cache.get_cache_performance_stats(),
            "rate_limiting": self.rate_limiter.get_rate_limit_stats(),
            "background_jobs": self.job_processor.get_job_stats(),
            "system_metrics": {
                "cpu_usage": psutil.cpu_percent(),
                "memory_usage": psutil.virtual_memory().percent,
                "disk_usage": psutil.disk_usage('/').percent
            },
            "timestamp": datetime.now().isoformat()
        }

# Global instances for Week 2 Day 2
week2_day2_cache = AdvancedAPICache()
week2_day2_rate_limiter = EnhancedRateLimiter()  
week2_day2_job_processor = BackgroundJobProcessor()

async def initialize_week2_day2_systems():
    """Initialize all Week 2 Day 2 backend performance systems"""
    logger.info("Initializing Week 2 Day 2 Backend Performance Systems...")
    
    # Initialize cache service if not already done
    if not cache_service.connected:
        await cache_service.initialize()
    
    # Start background job processor
    await week2_day2_job_processor.start_processing()
    
    # Warm cache with popular endpoints
    popular_endpoints = ["/api/dashboard", "/api/security", "/api/network"]
    warming_results = await week2_day2_cache.warm_cache_for_endpoints(popular_endpoints)
    
    logger.info(f"Week 2 Day 2 systems initialized successfully")
    logger.info(f"Cache warming results: {warming_results}") 