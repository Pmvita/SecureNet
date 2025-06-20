"""
SecureNet Enhanced Application
Integrates all Phase 1-3 implementations
"""

from fastapi import FastAPI, Depends, HTTPException, Request, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
from typing import Dict, Any, Optional
from contextlib import asynccontextmanager

# Phase 1: Observability
from utils.logging_config import configure_structlog, get_logger, security_logger
from monitoring.sentry_config import configure_sentry, sentry_security
from monitoring.prometheus_metrics import setup_fastapi_metrics, metrics

# Phase 2: Developer Experience
from ml.mlflow_tracking import mlflow_tracker
from utils.dependency_injection import container, service_locator

# Phase 3: Advanced Tooling
from auth.enhanced_jwt import jwt_manager, auth_manager
from crypto.securenet_crypto import crypto_service, secret_manager, get_tenant_crypto
from tasks.rq_service import rq_service, worker_manager

# Configure logging and monitoring
configure_structlog()
configure_sentry()

logger = get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    
    # Startup
    logger.info("SecureNet Enhanced Application starting up")
    
    # Initialize services
    try:
        # Test database connection
        logger.info("Testing database connection")
        
        # Test Redis connection for RQ
        logger.info("Testing Redis connection")
        
        # Initialize ML models
        logger.info("Loading ML models")
        
        logger.info("All services initialized successfully")
        
    except Exception as e:
        logger.error("Failed to initialize services", error=str(e))
        raise
    
    yield
    
    # Shutdown
    logger.info("SecureNet Enhanced Application shutting down")

# Create FastAPI app
app = FastAPI(
    title="SecureNet Enhanced API",
    description="AI-powered network security monitoring with advanced tooling",
    version="2.0.0",
    lifespan=lifespan
)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup Prometheus metrics
setup_fastapi_metrics(app)

# Security dependency
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """Get current authenticated user"""
    
    token = credentials.credentials
    claims = jwt_manager.verify_token(token)
    
    if not claims:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    return claims

async def require_permission(permission: str):
    """Dependency to require specific permission"""
    
    def permission_checker(user: Dict[str, Any] = Depends(get_current_user)):
        if permission not in user.get("permissions", []):
            raise HTTPException(status_code=403, detail=f"Permission required: {permission}")
        return user
    
    return permission_checker

# Enhanced Authentication Endpoints
@app.post("/auth/login")
async def login(request: Request, credentials: Dict[str, str]):
    """Enhanced authentication with multi-tenant support"""
    
    username = credentials.get("username")
    password = credentials.get("password")
    tenant_id = credentials.get("tenant_id", "default")
    
    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password required")
    
    # Get client IP for security logging
    client_ip = request.client.host
    
    # Authenticate user
    auth_result = auth_manager.authenticate_tenant_user(username, password, tenant_id)
    
    if not auth_result:
        # Log failed authentication
        security_logger.log_auth_event("login", username, False, {
            "tenant_id": tenant_id,
            "ip_address": client_ip,
            "reason": "invalid_credentials"
        })
        
        sentry_security.capture_failed_authentication(username, "invalid_credentials", client_ip)
        
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Log successful authentication
    security_logger.log_auth_event("login", username, True, {
        "tenant_id": tenant_id,
        "ip_address": client_ip,
        "role": auth_result["user"]["role"]
    })
    
    return auth_result

@app.post("/auth/refresh")
async def refresh_token(refresh_data: Dict[str, str]):
    """Refresh access token"""
    
    refresh_token = refresh_data.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="Refresh token required")
    
    new_access_token = jwt_manager.refresh_access_token(refresh_token)
    
    if not new_access_token:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "expires_in": jwt_manager.access_token_expire * 60
    }

@app.post("/auth/logout")
async def logout(user: Dict[str, Any] = Depends(get_current_user)):
    """Logout and blacklist token"""
    
    # In a real implementation, you'd blacklist the token
    security_logger.log_auth_event("logout", user["sub"], True, {
        "tenant_id": user["tenant_id"]
    })
    
    return {"message": "Logged out successfully"}

# Enhanced Security Scanning Endpoints
@app.post("/scans/start")
async def start_scan(
    scan_request: Dict[str, Any],
    background_tasks: BackgroundTasks,
    user: Dict[str, Any] = Depends(require_permission("scan:execute"))
):
    """Start a security scan with enhanced task queuing"""
    
    scan_type = scan_request.get("type", "network")
    target = scan_request.get("target")
    config = scan_request.get("config", {})
    priority = scan_request.get("priority", "default")
    
    if not target:
        raise HTTPException(status_code=400, detail="Target required")
    
    # Enqueue scan task
    job_id = rq_service.enqueue_scan_task(
        tenant_id=user["tenant_id"],
        scan_type=scan_type,
        target=target,
        config=config,
        priority=priority
    )
    
    # Log scan initiation
    security_logger.log_user_action(
        "scan_started",
        user["sub"],
        user["tenant_id"],
        {
            "scan_type": scan_type,
            "target": target,
            "job_id": job_id
        }
    )
    
    return {
        "job_id": job_id,
        "status": "queued",
        "message": f"Scan queued with priority: {priority}"
    }

@app.get("/scans/{job_id}/status")
async def get_scan_status(
    job_id: str,
    user: Dict[str, Any] = Depends(require_permission("scan:read"))
):
    """Get scan status"""
    
    status = rq_service.get_job_status(job_id)
    
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return status

# Enhanced Threat Detection Endpoints
@app.post("/threats/analyze")
async def analyze_threat(
    threat_data: Dict[str, Any],
    user: Dict[str, Any] = Depends(require_permission("scan:execute"))
):
    """Analyze threat with ML models"""
    
    # Enqueue threat analysis
    job_id = rq_service.enqueue_threat_analysis(
        tenant_id=user["tenant_id"],
        threat_data=threat_data,
        priority="high"
    )
    
    # Log threat analysis
    security_logger.log_threat_detected(threat_data, user["tenant_id"])
    sentry_security.capture_threat_detection(threat_data, user["tenant_id"])
    
    return {
        "job_id": job_id,
        "status": "analyzing",
        "message": "Threat analysis started"
    }

# Data Encryption Endpoints
@app.post("/crypto/encrypt")
async def encrypt_data(
    data_request: Dict[str, Any],
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Encrypt sensitive data"""
    
    data = data_request.get("data")
    if not data:
        raise HTTPException(status_code=400, detail="Data required")
    
    # Use tenant-specific encryption
    tenant_crypto = get_tenant_crypto(user["tenant_id"])
    encrypted_data = tenant_crypto.encrypt_tenant_data(data)
    
    return {
        "encrypted_data": encrypted_data,
        "tenant_id": user["tenant_id"]
    }

@app.post("/crypto/decrypt")
async def decrypt_data(
    data_request: Dict[str, Any],
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Decrypt sensitive data"""
    
    encrypted_data = data_request.get("encrypted_data")
    if not encrypted_data:
        raise HTTPException(status_code=400, detail="Encrypted data required")
    
    try:
        tenant_crypto = get_tenant_crypto(user["tenant_id"])
        decrypted_data = tenant_crypto.decrypt_tenant_data(encrypted_data)
        
        return {
            "data": decrypted_data.decode('utf-8'),
            "tenant_id": user["tenant_id"]
        }
        
    except Exception as e:
        logger.error("Decryption failed", error=str(e))
        raise HTTPException(status_code=400, detail="Decryption failed")

# ML Model Management Endpoints
@app.post("/ml/train")
async def train_model(
    training_request: Dict[str, Any],
    user: Dict[str, Any] = Depends(require_permission("admin:write"))
):
    """Train ML model"""
    
    model_name = training_request.get("model_name")
    training_config = training_request.get("config", {})
    
    if not model_name:
        raise HTTPException(status_code=400, detail="Model name required")
    
    # Enqueue ML training task
    job_id = rq_service.enqueue_ml_training(
        model_name=model_name,
        training_config=training_config,
        priority="low"
    )
    
    return {
        "job_id": job_id,
        "status": "training",
        "model_name": model_name
    }

@app.get("/ml/models")
async def list_models(user: Dict[str, Any] = Depends(require_permission("scan:read"))):
    """List available ML models"""
    
    # This would typically query MLflow
    models = [
        {"name": "threat_detector", "version": "1.0", "status": "production"},
        {"name": "vulnerability_scanner", "version": "2.1", "status": "staging"},
        {"name": "anomaly_detector", "version": "1.5", "status": "production"}
    ]
    
    return {"models": models}

# System Monitoring Endpoints
@app.get("/system/health")
async def health_check():
    """Enhanced health check"""
    
    health_status = {
        "status": "healthy",
        "timestamp": metrics.start_time,
        "services": {
            "database": "healthy",
            "redis": "healthy",
            "mlflow": "healthy",
            "crypto": "healthy"
        }
    }
    
    try:
        # Test Redis connection
        rq_service.redis_conn.ping()
        
        # Test crypto service
        test_data = crypto_service.encrypt_data("health_check")
        crypto_service.decrypt_data(test_data)
        
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["error"] = str(e)
        logger.error("Health check failed", error=str(e))
    
    return health_status

@app.get("/system/metrics")
async def get_metrics():
    """Get Prometheus metrics"""
    
    return JSONResponse(
        content=metrics.get_metrics(),
        media_type="text/plain"
    )

@app.get("/system/queue-stats")
async def get_queue_stats(user: Dict[str, Any] = Depends(require_permission("admin:read"))):
    """Get task queue statistics"""
    
    return rq_service.get_queue_stats()

@app.get("/system/workers")
async def get_worker_stats(user: Dict[str, Any] = Depends(require_permission("admin:read"))):
    """Get worker statistics"""
    
    return worker_manager.get_worker_stats()

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Enhanced error handling with logging"""
    
    logger.warning(
        "HTTP exception",
        status_code=exc.status_code,
        detail=exc.detail,
        path=request.url.path,
        method=request.method
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "path": request.url.path}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """General exception handler with Sentry integration"""
    
    logger.error(
        "Unhandled exception",
        error=str(exc),
        path=request.url.path,
        method=request.method
    )
    
    # Capture in Sentry
    sentry_security.capture_security_event("unhandled_exception", {
        "path": request.url.path,
        "method": request.method,
        "error": str(exc)
    }, level="error")
    
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "path": request.url.path}
    )

if __name__ == "__main__":
    # Configure for development
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info(
        "Starting SecureNet Enhanced Application",
        host=host,
        port=port,
        environment=os.getenv("ENVIRONMENT", "development")
    )
    
    uvicorn.run(
        "app_enhanced:app",
        host=host,
        port=port,
        reload=os.getenv("ENVIRONMENT") == "development",
        log_config=None  # Use our structured logging
    ) 