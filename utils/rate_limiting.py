"""
Rate Limiting Utility for SecureNet API
Provides rate limiting functionality for API endpoints
"""

import time
import asyncio
from typing import Dict, Optional
from functools import wraps
from fastapi import HTTPException, Request
import logging

logger = logging.getLogger(__name__)

class RateLimiter:
    """Simple in-memory rate limiter for API endpoints"""
    
    def __init__(self):
        self.requests = {}
        self.limits = {}
    
    def add_limit(self, endpoint: str, max_requests: int, window_seconds: int):
        """Add a rate limit for an endpoint"""
        self.limits[endpoint] = {
            'max_requests': max_requests,
            'window_seconds': window_seconds
        }
    
    def is_allowed(self, endpoint: str, identifier: str) -> bool:
        """Check if a request is allowed based on rate limits"""
        if endpoint not in self.limits:
            return True
        
        limit = self.limits[endpoint]
        key = f"{endpoint}:{identifier}"
        current_time = time.time()
        
        if key not in self.requests:
            self.requests[key] = []
        
        # Remove old requests outside the window
        self.requests[key] = [
            req_time for req_time in self.requests[key]
            if current_time - req_time < limit['window_seconds']
        ]
        
        # Check if we're under the limit
        if len(self.requests[key]) < limit['max_requests']:
            self.requests[key].append(current_time)
            return True
        
        return False
    
    def get_remaining(self, endpoint: str, identifier: str) -> int:
        """Get remaining requests for an endpoint"""
        if endpoint not in self.limits:
            return 999999
        
        limit = self.limits[endpoint]
        key = f"{endpoint}:{identifier}"
        current_time = time.time()
        
        if key not in self.requests:
            return limit['max_requests']
        
        # Remove old requests outside the window
        self.requests[key] = [
            req_time for req_time in self.requests[key]
            if current_time - req_time < limit['window_seconds']
        ]
        
        return max(0, limit['max_requests'] - len(self.requests[key]))

# Global rate limiter instance
rate_limiter = RateLimiter()

# Add default rate limits for billing endpoints
rate_limiter.add_limit('/api/billing/subscriptions/create', 10, 60)
rate_limiter.add_limit('/api/billing/subscriptions/update', 5, 60)
rate_limiter.add_limit('/api/billing/subscriptions/cancel', 3, 60)
rate_limiter.add_limit('/api/billing/usage/track', 100, 60)

def rate_limit(max_requests: int, window_seconds: int = 60):
    """Decorator for rate limiting API endpoints"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request from args or kwargs
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if not request:
                for value in kwargs.values():
                    if isinstance(value, Request):
                        request = value
                        break
            
            if not request:
                # If no request found, just call the function
                return await func(*args, **kwargs)
            
            # Get client IP as identifier
            client_ip = request.client.host if request.client else 'unknown'
            endpoint = request.url.path
            
            # Check rate limit
            if not rate_limiter.is_allowed(endpoint, client_ip):
                remaining = rate_limiter.get_remaining(endpoint, client_ip)
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "Rate limit exceeded",
                        "endpoint": endpoint,
                        "remaining_requests": remaining,
                        "retry_after": window_seconds
                    }
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

async def check_rate_limit(request: Request, endpoint: str, max_requests: int, window_seconds: int = 60) -> Dict:
    """Check rate limit for a specific request"""
    client_ip = request.client.host if request.client else 'unknown'
    
    if not rate_limiter.is_allowed(endpoint, client_ip):
        remaining = rate_limiter.get_remaining(endpoint, client_ip)
        return {
            "allowed": False,
            "remaining": remaining,
            "retry_after": window_seconds
        }
    
    return {
        "allowed": True,
        "remaining": rate_limiter.get_remaining(endpoint, client_ip),
        "retry_after": 0
    } 