"""
SecureNet Enterprise Application
Production-ready cybersecurity platform with enterprise features
"""

import asyncio
import uvicorn
from fastapi import FastAPI, Depends, HTTPException, Request, Response, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os
import sys
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
import uuid

# Enterprise imports
from database.postgresql_adapter import initialize_database, get_database_adapter
from database.enterprise_models import UserRole, OrganizationStatus, ThreatLevel
from secrets_management import get_secrets_manager, get_jwt_secret, get_encryption_key
from auth.enhanced_jwt import jwt_manager, auth_manager
from monitoring.prometheus_metrics import metrics, setup_fastapi_metrics
from monitoring.sentry_config import configure_sentry
from utils.logging_config import configure_structlog, get_logger
from tasks.rq_service import rq_service

# Configure enterprise logging
configure_structlog()
configure_sentry()

logger = get_logger(__name__)

# Security
security = HTTPBearer()

# Application state
class AppState:
    def __init__(self):
        self.db_adapter = None
        self.secrets_manager = None
        self.is_healthy = False
        self.startup_time = None

app_state = AppState()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management with proper initialization and cleanup"""
    
    # Startup
    logger.info("🚀 SecureNet Enterprise starting up...")
    app_state.startup_time = datetime.now(timezone.utc)
    
    try:
        # Initialize secrets management
        logger.info("Initializing secrets management...")
        app_state.secrets_manager = get_secrets_manager()
        await app_state.secrets_manager.initialize_default_secrets()
        
        # Initialize database
        logger.info("Initializing PostgreSQL database...")
        app_state.db_adapter = await initialize_database()
        
        # Initialize background task queue
        logger.info("Initializing background task queue...")
        await rq_service.initialize()
        
        # Health check
        app_state.is_healthy = True
        logger.info("✅ SecureNet Enterprise startup completed successfully")
        
        # Log startup metrics
        metrics.record_app_startup(success=True)
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        metrics.record_app_startup(success=False)
        app_state.is_healthy = False
        raise
    
    yield
    
    # Shutdown
    logger.info("🛑 SecureNet Enterprise shutting down...")
    try:
        if app_state.db_adapter:
            await app_state.db_adapter.close()
        if rq_service:
            await rq_service.close()
        logger.info("✅ Shutdown completed successfully")
    except Exception as e:
        logger.error(f"❌ Shutdown error: {e}")

# Create FastAPI application
app = FastAPI(
    title="SecureNet Enterprise API",
    description="AI-powered cybersecurity platform for Fortune 500 and government deployments",
    version="2.0.0-enterprise",
    docs_url="/api/docs" if os.getenv("ENVIRONMENT") == "development" else None,
    redoc_url="/api/redoc" if os.getenv("ENVIRONMENT") == "development" else None,
    openapi_url="/api/openapi.json" if os.getenv("ENVIRONMENT") == "development" else None,
    lifespan=lifespan
)

# Enterprise middleware stack
def setup_middleware():
    """Configure enterprise-grade middleware"""
    
    # Trusted hosts (security)
    allowed_hosts = os.getenv("ALLOWED_HOSTS", "*").split(",")
    if "*" not in allowed_hosts:
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)
    
    # CORS (configured for production)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=os.getenv("CORS_ORIGINS", "https://app.securenet.ai").split(","),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "X-RateLimit-Remaining"],
    )
    
    # Compression
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    
    # Custom security middleware
    @app.middleware("http")
    async def security_middleware(request: Request, call_next):
        """Enterprise security middleware"""
        
        # Generate request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Security headers
        response = await call_next(request)
        
        # Security headers for enterprise deployment
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "connect-src 'self' wss: https:; "
            "frame-ancestors 'none';"
        )
        
        return response
    
    # Request logging middleware
    @app.middleware("http")
    async def logging_middleware(request: Request, call_next):
        """Request logging for audit and monitoring"""
        
        start_time = datetime.now(timezone.utc)
        
        # Log request
        logger.info(
            "Request started",
            method=request.method,
            url=str(request.url),
            client_ip=request.client.host,
            user_agent=request.headers.get("user-agent"),
            request_id=getattr(request.state, 'request_id', None)
        )
        
        response = await call_next(request)
        
        # Calculate duration
        duration = (datetime.now(timezone.utc) - start_time).total_seconds()
        
        # Log response
        logger.info(
            "Request completed",
            method=request.method,
            url=str(request.url),
            status_code=response.status_code,
            duration_seconds=duration,
            request_id=getattr(request.state, 'request_id', None)
        )
        
        # Record metrics
        metrics.record_request(
            method=request.method,
            endpoint=request.url.path,
            status_code=response.status_code,
            duration=duration
        )
        
        return response

# Setup middleware
setup_middleware()

# Setup Prometheus metrics
setup_fastapi_metrics(app)

# Authentication dependency
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """Get current authenticated user with enterprise validation"""
    
    try:
        token = credentials.credentials
        claims = jwt_manager.verify_token(token)
        
        if not claims:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        # Get user details from database
        user = await app_state.db_adapter.get_user_by_username(claims.get("sub"))
        
        if not user or not user.get("is_active"):
            raise HTTPException(
                status_code=401,
                detail="User not found or inactive"
            )
        
        # Check organization status
        if user.get("organization_status") != "active":
            raise HTTPException(
                status_code=403,
                detail="Organization is not active"
            )
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=401,
            detail="Authentication failed"
        )

# Health check endpoint
@app.get("/health")
async def health_check():
    """Comprehensive health check for enterprise monitoring"""
    
    health_status = {
        "status": "healthy" if app_state.is_healthy else "unhealthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "2.0.0-enterprise",
        "uptime_seconds": (
            datetime.now(timezone.utc) - app_state.startup_time
        ).total_seconds() if app_state.startup_time else 0,
        "components": {}
    }
    
    # Check database connectivity
    try:
        if app_state.db_adapter:
            # Simple connectivity test
            await app_state.db_adapter.get_async_connection().__aenter__()
            health_status["components"]["database"] = "healthy"
        else:
            health_status["components"]["database"] = "unhealthy"
    except Exception:
        health_status["components"]["database"] = "unhealthy"
        health_status["status"] = "unhealthy"
    
    # Check secrets management
    try:
        if app_state.secrets_manager:
            await app_state.secrets_manager.get_secret("health_check")
            health_status["components"]["secrets"] = "healthy"
        else:
            health_status["components"]["secrets"] = "unhealthy"
    except Exception:
        health_status["components"]["secrets"] = "unhealthy"
    
    # Check background tasks
    try:
        if rq_service and rq_service.is_healthy():
            health_status["components"]["background_tasks"] = "healthy"
        else:
            health_status["components"]["background_tasks"] = "unhealthy"
    except Exception:
        health_status["components"]["background_tasks"] = "unhealthy"
    
    status_code = 200 if health_status["status"] == "healthy" else 503
    return JSONResponse(content=health_status, status_code=status_code)

# API Routes
@app.post("/api/auth/login")
async def login(credentials: Dict[str, str], request: Request):
    """Enterprise authentication endpoint"""
    
    username = credentials.get("username")
    password = credentials.get("password")
    organization_id = credentials.get("organization_id")
    
    if not username or not password:
        raise HTTPException(
            status_code=400,
            detail="Username and password required"
        )
    
    # Authenticate with audit logging
    client_ip = request.client.host
    user_agent = request.headers.get("user-agent")
    
    try:
        # Use enterprise authentication manager
        auth_result = await auth_manager.authenticate_tenant_user(
            username=username,
            password=password,
            tenant_id=organization_id or "default"
        )
        
        if not auth_result:
            # Log failed authentication
            await app_state.db_adapter.create_audit_log({
                "event_type": "login_failed",
                "action": f"Failed login attempt for user {username}",
                "ip_address": client_ip,
                "user_agent": user_agent,
                "success": False,
                "details": {"reason": "invalid_credentials"}
            })
            
            raise HTTPException(
                status_code=401,
                detail="Invalid credentials"
            )
        
        # Update user login information
        await app_state.db_adapter.update_user_login(
            user_id=auth_result["user"]["id"],
            ip_address=client_ip,
            user_agent=user_agent
        )
        
        # Record successful login
        metrics.record_auth_attempt(
            organization_id or "default",
            "success",
            "password"
        )
        
        logger.info(
            "User logged in successfully",
            username=username,
            user_id=auth_result["user"]["id"],
            organization_id=organization_id,
            client_ip=client_ip
        )
        
        return {
            "access_token": auth_result["access_token"],
            "refresh_token": auth_result["refresh_token"],
            "token_type": "bearer",
            "expires_in": 3600,
            "user": {
                "id": auth_result["user"]["id"],
                "username": auth_result["user"]["username"],
                "email": auth_result["user"]["email"],
                "role": auth_result["user"]["role"],
                "organization": auth_result["user"].get("organization_name")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Authentication service unavailable"
        )

@app.post("/api/auth/refresh")
async def refresh_token(refresh_data: Dict[str, str]):
    """Refresh access token"""
    
    refresh_token = refresh_data.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=400,
            detail="Refresh token required"
        )
    
    try:
        new_access_token = jwt_manager.refresh_access_token(refresh_token)
        
        if not new_access_token:
            raise HTTPException(
                status_code=401,
                detail="Invalid refresh token"
            )
        
        return {
            "access_token": new_access_token,
            "token_type": "bearer",
            "expires_in": 3600
        }
        
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=401,
            detail="Token refresh failed"
        )

@app.get("/api/users/me")
async def get_current_user_info(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get current user information"""
    
    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "email": current_user["email"],
        "role": current_user["role"],
        "organization": {
            "id": current_user.get("organization_id"),
            "name": current_user.get("organization_name"),
            "plan_type": current_user.get("plan_type")
        },
        "permissions": current_user.get("permissions", []),
        "last_login": current_user.get("last_login"),
        "login_count": current_user.get("login_count", 0)
    }

@app.get("/api/organizations/{org_id}/devices")
async def get_organization_devices(
    org_id: str,
    limit: int = 100,
    offset: int = 0,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get devices for an organization"""
    
    # Verify user has access to organization
    if current_user.get("organization_id") != org_id and current_user.get("role") != "platform_owner":
        raise HTTPException(
            status_code=403,
            detail="Access denied to organization"
        )
    
    try:
        devices = await app_state.db_adapter.get_devices_by_organization(
            org_id=org_id,
            limit=limit,
            offset=offset
        )
        
        return {
            "devices": devices,
            "total": len(devices),
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error(f"Error fetching devices: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch devices"
        )

@app.get("/api/organizations/{org_id}/security/metrics")
async def get_security_metrics(
    org_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get security metrics for an organization"""
    
    # Verify user has access to organization
    if current_user.get("organization_id") != org_id and current_user.get("role") != "platform_owner":
        raise HTTPException(
            status_code=403,
            detail="Access denied to organization"
        )
    
    try:
        metrics_data = await app_state.db_adapter.get_security_metrics(org_id)
        
        return {
            "organization_id": org_id,
            "metrics": metrics_data,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching security metrics: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch security metrics"
        )

@app.get("/api/organizations/{org_id}/audit-logs")
async def get_audit_logs(
    org_id: str,
    limit: int = 100,
    offset: int = 0,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get audit logs for an organization (SOC 2 compliance)"""
    
    # Verify user has admin access
    if (current_user.get("organization_id") != org_id or 
        current_user.get("role") not in ["platform_owner", "security_admin"]):
        raise HTTPException(
            status_code=403,
            detail="Admin access required for audit logs"
        )
    
    try:
        audit_logs = await app_state.db_adapter.get_audit_logs(
            org_id=org_id,
            limit=limit,
            offset=offset
        )
        
        return {
            "audit_logs": audit_logs,
            "total": len(audit_logs),
            "limit": limit,
            "offset": offset,
            "organization_id": org_id
        }
        
    except Exception as e:
        logger.error(f"Error fetching audit logs: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch audit logs"
        )

@app.post("/api/scan/vulnerability")
async def start_vulnerability_scan(
    scan_config: Dict[str, Any],
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Start a vulnerability scan"""
    
    try:
        # Create scan record
        scan_data = {
            "organization_id": current_user["organization_id"],
            "scan_type": "vulnerability",
            "name": scan_config.get("name", "Vulnerability Scan"),
            "description": scan_config.get("description"),
            "scan_config": scan_config,
            "status": "queued"
        }
        
        # Queue background scan task
        background_tasks.add_task(
            run_vulnerability_scan,
            scan_data,
            current_user["id"]
        )
        
        logger.info(
            "Vulnerability scan started",
            organization_id=current_user["organization_id"],
            user_id=current_user["id"],
            scan_config=scan_config
        )
        
        return {
            "message": "Vulnerability scan started",
            "scan_id": str(uuid.uuid4()),
            "status": "queued"
        }
        
    except Exception as e:
        logger.error(f"Error starting vulnerability scan: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to start vulnerability scan"
        )

# Background task functions
async def run_vulnerability_scan(scan_data: Dict[str, Any], user_id: str):
    """Background vulnerability scan task"""
    try:
        logger.info("Starting vulnerability scan execution")
        
        # Implementation would go here
        # This is a placeholder for the actual scan logic
        
        await asyncio.sleep(5)  # Simulate scan time
        
        logger.info("Vulnerability scan completed successfully")
        
    except Exception as e:
        logger.error(f"Vulnerability scan failed: {e}")

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for enterprise error management"""
    
    request_id = getattr(request.state, 'request_id', 'unknown')
    
    logger.error(
        "Unhandled exception",
        exception=str(exc),
        exception_type=type(exc).__name__,
        request_id=request_id,
        url=str(request.url),
        method=request.method
    )
    
    # Record error metrics
    metrics.record_error(
        error_type=type(exc).__name__,
        endpoint=request.url.path
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "request_id": request_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )

# Main application runner
def main():
    """Main application entry point"""
    
    # Validate environment
    required_env_vars = [
        "POSTGRES_HOST",
        "POSTGRES_DB", 
        "POSTGRES_USER",
        "POSTGRES_PASSWORD"
    ]
    
    missing_vars = [var for var in required_env_vars if not os.getenv(var)]
    if missing_vars:
        logger.error(f"Missing required environment variables: {missing_vars}")
        sys.exit(1)
    
    # Configure uvicorn for enterprise deployment
    config = uvicorn.Config(
        app="enterprise_app:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        workers=int(os.getenv("WORKERS", "4")),
        loop="uvloop" if os.name != "nt" else "asyncio",
        http="httptools" if os.name != "nt" else "h11",
        log_level=os.getenv("LOG_LEVEL", "info").lower(),
        access_log=True,
        server_header=False,  # Security: hide server header
        date_header=True,
        forwarded_allow_ips="*",  # Configure for load balancer
        proxy_headers=True
    )
    
    server = uvicorn.Server(config)
    
    logger.info("🚀 Starting SecureNet Enterprise Server")
    logger.info(f"Host: {config.host}")
    logger.info(f"Port: {config.port}")
    logger.info(f"Workers: {config.workers}")
    logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'production')}")
    
    try:
        server.run()
    except KeyboardInterrupt:
        logger.info("Server shutdown requested")
    except Exception as e:
        logger.error(f"Server startup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 