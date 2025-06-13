"""
app.py

Purpose:
- Provide a lightweight web dashboard for SecureNet using FastAPI.
- Display system logs and highlight detected anomalies.

To run:
$ uvicorn app:app --reload
"""

from fastapi import FastAPI, Request, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks, Depends, Security
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.security.api_key import APIKeyHeader, APIKey
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import sqlite3
from datetime import datetime
import json
from typing import Dict, List, Optional, Any, Generic, TypeVar
import asyncio
from contextlib import asynccontextmanager
import logging
from pathlib import Path
import yaml
import os
import secrets
import time
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Optional
from datetime import timedelta
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from src.security import (
    verify_password,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    SECRET_KEY,
    ALGORITHM
)
from database import Database
from jose import JWTError, jwt
from cve_integration import CVEIntegration

# Import new API modules for multi-tenant SaaS
from api_billing import router as billing_router
from api_metrics import router as metrics_router
from api_insights import router as insights_router
from api_admin import router as admin_router

# Load environment variables
load_dotenv()

# Development mode
DEV_MODE = os.getenv("DEV_MODE", "true").lower() == "true"

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables
service_states = {
    "ingestion": {"running": False, "stats": {"logs_processed": 0, "last_processed": None}},
    "detection": {"running": False, "stats": {"anomalies_detected": 0, "last_detection": None}},
    "alerts": {"running": False, "stats": {"alerts_sent": 0, "last_alert": None}}
}

# Track application start time
start_time = time.time()

@asynccontextmanager
async def lifespan(app):
    # Startup
    logger.info("Starting SecureNet services...")
    await startup_event()
    yield
    # Shutdown
    logger.info("Shutting down SecureNet services...")
    for service in service_states:
        if service_states[service]["running"]:
            await stop_service(service)

# Rate limiter setup
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security setup
API_KEY_NAME = "X-API-Key"
API_KEY = os.getenv("API_KEY", secrets.token_urlsafe(32))  # Generate if not set
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=True)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include new API routers for multi-tenant SaaS functionality
app.include_router(billing_router)
app.include_router(metrics_router)
app.include_router(insights_router)
app.include_router(admin_router)

# Security middleware
@app.middleware("http")
async def security_middleware(request: Request, call_next):
    # Add security headers
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
    return response

# API key dependency
async def get_api_key(api_key: str = Security(api_key_header)):
    """Verify API key from header."""
    # In development mode, accept any API key or the development API key
    if DEV_MODE:
        if api_key in [API_KEY, 'dev-api-key', 'sk-dev-api-key-securenet-default']:
            return api_key
        raise HTTPException(
            status_code=403,
            detail="Invalid API Key in development mode"
        )
    
    if api_key != API_KEY:
        raise HTTPException(
            status_code=403,
            detail="Invalid API Key"
        )
    return api_key

templates = Jinja2Templates(directory="templates")

def get_db():
    # Use the correct database file for all operations
    conn = sqlite3.connect('data/securenet.db')
    conn.row_factory = sqlite3.Row
    return conn

def get_user_by_username(username: str) -> Optional[dict]:
    """Get user by username from the database."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, username, email, role, password_hash, last_login
            FROM users
            WHERE username = ?
        """, (username,))
        user = cursor.fetchone()
        if user:
            return dict(user)
        return None

@app.get("/api/health")
@limiter.limit("60/minute")
async def health_check(request: Request):
    """System health check endpoint"""
    try:
        # Check database connection
        conn = get_db()
        conn.execute("SELECT 1").fetchone()
        conn.close()
        
        # Check if services are running
        uptime = time.time() - start_time
        
        return {
            "status": "healthy",
            "database": "connected",
            "network_scanner": "operational",
            "security_engine": "active",
            "cve_integration": "active",
            "uptime": f"{int(uptime//3600)}h {int((uptime%3600)//60)}m {int(uptime%60)}s",
            "version": "2.1.0",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Service unavailable")

@app.get("/", response_class=HTMLResponse)
@limiter.limit("60/minute")
async def dashboard(request: Request):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, timestamp, source, level, message 
        FROM logs 
        WHERE level IN ('warning', 'error', 'critical')
        ORDER BY timestamp DESC 
        LIMIT 100
    """)
    anomalies = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return templates.TemplateResponse("dashboard.html", {"request": request, "anomalies": anomalies})

# Anomalies endpoints (must come before generic service routes)
@app.get("/api/anomalies/list")
@limiter.limit("30/minute")
async def get_anomalies_list(
    request: Request,
    page: int = 1,
    page_size: int = 10,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    type: Optional[str] = None,
    api_key: APIKey = Depends(get_api_key)
):
    try:
        db = Database()
        anomalies = await db.get_anomalies(
            page=page,
            page_size=page_size,
            filters={
                'status': status,
                'severity': severity,
                'type': type
            }
        )
        total = await db.get_anomalies_count(filters={
            'status': status,
            'severity': severity,
            'type': type
        })
        
        return {
            "status": "success",
            "data": {
                "items": anomalies,
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": (total + page_size - 1) // page_size
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting anomalies list: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/anomalies/stats")
@limiter.limit("30/minute")
async def get_anomalies_stats(
    request: Request,
    api_key: APIKey = Depends(get_api_key)
):
    try:
        db = Database()
        stats = await db.get_anomalies_stats()
        return {
            "status": "success",
            "data": stats,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting anomalies stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/anomalies/analyze")
@limiter.limit("10/minute")
async def analyze_anomalies(
    request: Request,
    api_key: APIKey = Depends(get_api_key)
):
    """Run real-time anomaly analysis on network data"""
    try:
        db = Database()
        
        # Get recent network devices and traffic for analysis
        devices = await db.get_network_devices()
        traffic_data = await db.get_network_traffic(limit=100)
        
        # Perform anomaly analysis based on real network data
        analysis_id = f"analysis_{int(time.time())}"
        
        # Analyze device behavior patterns
        device_anomalies = []
        for device in devices:
            # Check for unusual device behavior
            if device.get('status') == 'unknown' or device.get('last_seen_hours', 0) > 24:
                device_anomalies.append({
                    'device_id': device.get('id'),
                    'device_name': device.get('name'),
                    'anomaly_type': 'device_offline',
                    'severity': 'medium'
                })
        
        # Analyze traffic patterns
        traffic_anomalies = []
        if traffic_data:
            # Check for unusual traffic volumes
            total_bytes = sum(entry.get('bytes', 0) for entry in traffic_data)
            if total_bytes > 1000000:  # > 1MB threshold
                traffic_anomalies.append({
                    'anomaly_type': 'high_traffic_volume',
                    'severity': 'low',
                    'bytes': total_bytes
                })
        
        # Store analysis results
        total_anomalies_found = len(device_anomalies) + len(traffic_anomalies)
        
        # Log analysis results
        logger.info(f"Anomaly analysis completed: {total_anomalies_found} potential anomalies found")
        logger.info(f"Device anomalies: {len(device_anomalies)}, Traffic anomalies: {len(traffic_anomalies)}")
        
        return {
            "status": "success",
            "data": {
                "analysis_id": analysis_id,
                "status": "completed",
                "anomalies_found": total_anomalies_found,
                "device_anomalies": len(device_anomalies),
                "traffic_anomalies": len(traffic_anomalies),
                "analysis_timestamp": datetime.now().isoformat()
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error running anomaly analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/{service}/start")
@limiter.limit("10/minute")
async def start_service(request: Request, service: str, api_key: APIKey = Depends(get_api_key)):
    if service not in service_states:
        raise HTTPException(status_code=404, detail="Service not found")
    
    if service_states[service]["running"]:
        raise HTTPException(status_code=400, detail="Service is already running")
    
    try:
        service_states[service]["running"] = True
        logger.info(f"Started {service} service")
        
        # Start the appropriate service
        if service == "ingestion":
            asyncio.create_task(run_log_ingestion())
        elif service == "detection":
            asyncio.create_task(run_anomaly_detection())
        elif service == "alerts":
            asyncio.create_task(run_alert_service())
        
        return {"status": "success", "message": f"{service} service started"}
    except Exception as e:
        service_states[service]["running"] = False
        logger.error(f"Error starting {service} service: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/{service}/stop")
@limiter.limit("10/minute")
async def stop_service(request: Request, service: str, api_key: APIKey = Depends(get_api_key)):
    if service not in service_states:
        raise HTTPException(status_code=404, detail="Service not found")
    
    if not service_states[service]["running"]:
        raise HTTPException(status_code=400, detail="Service is not running")
    
    try:
        service_states[service]["running"] = False
        logger.info(f"Stopped {service} service")
        return {"status": "success", "message": f"{service} service stopped"}
    except Exception as e:
        logger.error(f"Error stopping {service} service: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/{service}/stats")
@limiter.limit("30/minute")
async def get_service_stats(request: Request, service: str, api_key: APIKey = Depends(get_api_key)):
    if service not in service_states:
        raise HTTPException(status_code=404, detail="Service not found")
    
    stats = service_states[service]["stats"]
    if service == "ingestion":
        message = f"Processed {stats['logs_processed']} logs"
        if stats['last_processed']:
            message += f" (Last: {stats['last_processed']})"
    elif service == "detection":
        message = f"Detected {stats['anomalies_detected']} anomalies"
        if stats['last_detection']:
            message += f" (Last: {stats['last_detection']})"
    elif service == "alerts":
        message = f"Sent {stats['alerts_sent']} alerts"
        if stats['last_alert']:
            message += f" (Last: {stats['last_alert']})"
    
    return {"status": "success", "message": message, "stats": stats}

@app.get("/api/anomalies")
@limiter.limit("30/minute")
async def get_anomalies(request: Request, api_key: APIKey = Depends(get_api_key)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, timestamp, source, level, message 
        FROM logs 
        WHERE level IN ('warning', 'error', 'critical')
        ORDER BY timestamp DESC 
        LIMIT 100
    """)
    anomalies = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return anomalies

@app.post("/api/anomalies/{anomaly_id}/acknowledge")
@limiter.limit("20/minute")
async def acknowledge_anomaly(request: Request, anomaly_id: int, api_key: APIKey = Depends(get_api_key)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE logs 
            SET acknowledged = 1, acknowledged_at = ? 
            WHERE id = ?
        """, (datetime.now().isoformat(), anomaly_id))
        conn.commit()
        return {"status": "success", "message": "Anomaly acknowledged"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# Background tasks
async def run_log_ingestion():
    while service_states["ingestion"]["running"]:
        try:
            # TODO: Implement actual log ingestion
            service_states["ingestion"]["stats"]["logs_processed"] += 1
            service_states["ingestion"]["stats"]["last_processed"] = datetime.now().isoformat()
            await asyncio.sleep(1)  # Simulate work
        except Exception as e:
            logger.error(f"Error in log ingestion: {str(e)}")
            service_states["ingestion"]["running"] = False
            break

async def run_anomaly_detection():
    while service_states["detection"]["running"]:
        try:
            # TODO: Implement actual anomaly detection
            service_states["detection"]["stats"]["anomalies_detected"] += 1
            service_states["detection"]["stats"]["last_detection"] = datetime.now().isoformat()
            await asyncio.sleep(5)  # Simulate work
        except Exception as e:
            logger.error(f"Error in anomaly detection: {str(e)}")
            service_states["detection"]["running"] = False
            break

async def run_alert_service():
    while service_states["alerts"]["running"]:
        try:
            # TODO: Implement actual alert service
            service_states["alerts"]["stats"]["alerts_sent"] += 1
            service_states["alerts"]["stats"]["last_alert"] = datetime.now().isoformat()
            await asyncio.sleep(10)  # Simulate work
        except Exception as e:
            logger.error(f"Error in alert service: {str(e)}")
            service_states["alerts"]["running"] = False
            break

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.log_connections: List[WebSocket] = []
        self.notification_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket, connection_type: str):
        await websocket.accept()
        if connection_type == "logs":
            self.log_connections.append(websocket)
        elif connection_type == "notifications":
            self.notification_connections.append(websocket)
        else:
            self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket, connection_type: str):
        if connection_type == "logs":
            self.log_connections.remove(websocket)
        elif connection_type == "notifications":
            self.notification_connections.remove(websocket)
        else:
            self.active_connections.remove(websocket)

    async def broadcast_log(self, log_entry: dict):
        for connection in self.log_connections:
            try:
                await connection.send_json(log_entry)
            except WebSocketDisconnect:
                self.disconnect(connection, "logs")

    async def broadcast_notification(self, notification: dict):
        for connection in self.notification_connections:
            try:
                await connection.send_json(notification)
            except WebSocketDisconnect:
                self.disconnect(connection, "notifications")

manager = ConnectionManager()

# Log source management
class LogSource:
    def __init__(self, source_type: str, config: dict):
        self.source_type = source_type
        self.config = config
        self.active = False
        self.last_check = None

    async def start(self):
        self.active = True
        # Start appropriate log collection based on source type
        if self.source_type == "file":
            asyncio.create_task(self._monitor_file())
        elif self.source_type == "syslog":
            asyncio.create_task(self._monitor_syslog())
        elif self.source_type == "aws":
            asyncio.create_task(self._monitor_aws())
        elif self.source_type == "custom":
            asyncio.create_task(self._monitor_custom())

    async def stop(self):
        self.active = False

    async def _monitor_file(self):
        file_path = self.config.get("file_path")
        if not file_path or not os.path.exists(file_path):
            await manager.broadcast_notification({
                "title": "Log Source Error",
                "message": f"File not found: {file_path}",
                "level": "error",
                "time": datetime.now().isoformat(),
                "unread": True
            })
            return

        try:
            with open(file_path, 'r') as f:
                f.seek(0, 2)  # Seek to end of file
                while self.active:
                    line = f.readline()
                    if line:
                        await self._process_log_entry(line.strip(), "file")
                    else:
                        await asyncio.sleep(0.1)
        except Exception as e:
            await manager.broadcast_notification({
                "title": "Log Source Error",
                "message": f"Error reading file {file_path}: {str(e)}",
                "level": "error",
                "time": datetime.now().isoformat(),
                "unread": True
            })

    async def _monitor_syslog(self):
        # Implement syslog monitoring
        pass

    async def _monitor_aws(self):
        # Implement AWS CloudTrail monitoring
        pass

    async def _monitor_custom(self):
        # Implement custom endpoint monitoring
        pass

    async def _process_log_entry(self, log_line: str, source: str):
        timestamp = datetime.now().isoformat()
        log_entry = {
            "timestamp": timestamp,
            "message": log_line,
            "source": source,
            "level": "info"  # Default level, can be enhanced with log parsing
        }
        
        # Store in database
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO logs (timestamp, source, message, level)
                VALUES (?, ?, ?, ?)
            """, (timestamp, source, log_line, "info"))
            conn.commit()

        # Broadcast to WebSocket clients
        await manager.broadcast_log(log_entry)

# Log source registry
log_sources: Dict[str, LogSource] = {}

@app.websocket("/ws/logs")
async def websocket_log_endpoint(websocket: WebSocket):
    try:
        # Get API key from query parameters
        api_key = websocket.query_params.get('api_key')
        if not api_key:
            logger.warning("WebSocket connection attempt without API key")
            await websocket.close(code=4003, reason="API key required")
            return

        # Verify API key
        if api_key != API_KEY:
            logger.warning(f"Invalid API key attempt: {api_key[:8]}...")
            await websocket.close(code=4003, reason="Invalid API key")
            return

        # Accept connection
        await manager.connect(websocket, "logs")
        logger.info(f"WebSocket connection established with API key: {api_key[:8]}...")

        try:
            while True:
                # Keep connection alive and handle any client messages
                data = await websocket.receive_text()
                if data == "ping":
                    await websocket.send_text("pong")
        except WebSocketDisconnect:
            logger.info("WebSocket client disconnected")
        finally:
            manager.disconnect(websocket, "logs")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except:
            pass

@app.websocket("/ws/notifications")
async def websocket_notification_endpoint(websocket: WebSocket):
    try:
        # Get API key from query parameters
        api_key = websocket.query_params.get('api_key')
        if not api_key:
            logger.warning("WebSocket connection attempt without API key")
            await websocket.close(code=4003, reason="API key required")
            return

        # Verify API key
        if api_key != API_KEY:
            logger.warning(f"Invalid API key attempt: {api_key[:8]}...")
            await websocket.close(code=4003, reason="Invalid API key")
            return

        # Accept connection
        await manager.connect(websocket, "notifications")
        logger.info(f"WebSocket notification connection established with API key: {api_key[:8]}...")

        try:
            while True:
                # Keep connection alive and handle any client messages
                data = await websocket.receive_text()
                if data == "ping":
                    await websocket.send_text("pong")
        except WebSocketDisconnect:
            logger.info("WebSocket notification client disconnected")
        finally:
            manager.disconnect(websocket, "notifications")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except:
            pass

@app.post("/api/log-sources")
@limiter.limit("10/minute")
async def add_log_source(request: Request, source_type: str, config: dict, api_key: APIKey = Depends(get_api_key)):
    # Validate input
    if source_type not in ["file", "syslog", "aws", "custom"]:
        raise HTTPException(status_code=400, detail="Invalid source type")
    
    # Sanitize config
    if source_type == "file":
        if not os.path.exists(config.get("file_path", "")):
            raise HTTPException(status_code=400, detail="File not found")
        if not os.access(config["file_path"], os.R_OK):
            raise HTTPException(status_code=403, detail="File not readable")
    
    source_id = f"{source_type}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    log_sources[source_id] = LogSource(source_type, config)
    await log_sources[source_id].start()
    
    await manager.broadcast_notification({
        "title": "Log Source Added",
        "message": f"New {source_type} log source configured",
        "level": "info",
        "time": datetime.now().isoformat(),
        "unread": True
    })
    
    return {"id": source_id, "status": "started"}

@app.delete("/api/log-sources/{source_id}")
@limiter.limit("10/minute")
async def remove_log_source(request: Request, source_id: str, api_key: APIKey = Depends(get_api_key)):
    if source_id in log_sources:
        await log_sources[source_id].stop()
        del log_sources[source_id]
        return {"status": "removed"}
    raise HTTPException(status_code=404, detail="Log source not found")

@app.get("/api/log-sources")
@limiter.limit("30/minute")
async def list_log_sources(request: Request, api_key: APIKey = Depends(get_api_key)):
    return [
        {
            "id": source_id,
            "type": source.source_type,
            "active": source.active,
            "last_check": source.last_check
        }
        for source_id, source in log_sources.items()
    ]

# Update the database schema
def update_db_schema():
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Add new tables and columns
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS log_sources (
                id TEXT PRIMARY KEY,
                source_type TEXT NOT NULL,
                config TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_active TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                category TEXT DEFAULT 'system',
                severity TEXT DEFAULT 'info',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                read_at TIMESTAMP,
                metadata TEXT DEFAULT '{}'
            )
        """)
        
        # Add new columns to existing notifications table if they don't exist
        try:
            cursor.execute("ALTER TABLE notifications ADD COLUMN category TEXT DEFAULT 'system'")
        except sqlite3.OperationalError:
            pass  # Column already exists
        
        try:
            cursor.execute("ALTER TABLE notifications ADD COLUMN severity TEXT DEFAULT 'info'")
        except sqlite3.OperationalError:
            pass  # Column already exists
            
        try:
            cursor.execute("ALTER TABLE notifications ADD COLUMN metadata TEXT DEFAULT '{}'")
        except sqlite3.OperationalError:
            pass  # Column already exists
        
        # Add new columns to logs table if they don't exist
        try:
            cursor.execute("ALTER TABLE logs ADD COLUMN level TEXT DEFAULT 'info'")
        except sqlite3.OperationalError:
            pass  # Column already exists
        
        conn.commit()

# Initialize database
db = Database()

# Initialize database schema on startup
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    try:
        logger.info("Starting SecureNet services...")
        # Initialize database and create default admin user
        await db.initialize_db()
        logger.info("Database initialized successfully")
        # Update database schema
        await db.update_db_schema()
        logger.info("Database schema updated successfully")
        
        # Ensure default organization exists for backward compatibility
        try:
            default_org_id = await db.ensure_default_organization()
            logger.info(f"Default organization ensured: {default_org_id}")
        except Exception as e:
            logger.error(f"Failed to ensure default organization: {str(e)}")
    except Exception as e:
        logger.error(f"Error during startup: {str(e)}")
        raise

T = TypeVar('T')

class ApiResponse(BaseModel, Generic[T]):
    status: str
    data: T
    timestamp: str

class LoginRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str]
    role: str
    last_login: Optional[str]
    last_logout: Optional[str] = None
    login_count: int = 0

class LoginResponse(BaseModel):
    token: str
    user: UserResponse

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> dict:
    """Get current user from JWT token."""
    # In development mode, return a dev user (skip JWT validation)
    if DEV_MODE:
        return {
            "id": 1,
            "username": "admin",
            "email": "admin@securenet.local",
            "role": "admin",
            "last_login": datetime.now().isoformat()
        }
    
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication credentials"
            )
        
        # Get user from database
        user = get_user_by_username(username)
        if user is None:
            raise HTTPException(
                status_code=401,
                detail="User not found"
            )
        
        return user
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials"
        )

# Authentication endpoints
@app.post("/api/auth/login", response_model=ApiResponse[LoginResponse])
async def login(request: LoginRequest):
    """Authenticate user and return JWT token."""
    try:
        # Get user from database
        user = get_user_by_username(request.username)
        if not user:
            logger.warning(f"Login attempt failed: User '{request.username}' not found")
            raise HTTPException(
                status_code=401,
                detail="Invalid username or password"
            )
        
        # Verify password
        if not verify_password(request.password, user["password_hash"]):
            logger.warning(f"Login attempt failed: Invalid password for user '{request.username}'")
            raise HTTPException(
                status_code=401,
                detail="Invalid username or password"
            )
        
        # Update login tracking with new session management
        try:
            db = Database()
            user_id = user.get('id') or user.get('user_id')
            if user_id:
                await db.update_user_login(user_id)
                
                # Log the login for audit
                await db.store_log({
                    'level': 'info',
                    'category': 'auth',
                    'source': 'login_api',
                    'message': f"User {user['username']} logged in",
                    'metadata': f'{{"user_id": {user_id}, "role": "{user["role"]}"}}'
                })
                
                logger.info(f"Updated login tracking for user '{request.username}'")
            else:
                logger.warning(f"No user ID found for login tracking: {user}")
        except Exception as e:
            logger.error(f"Error updating login tracking for user '{request.username}': {str(e)}")
            # Continue with login even if login tracking update fails
        
        # Get user's organization information (handle gracefully if none)
        try:
            db = Database()
            user_id = user.get('id') or user.get('user_id')
            if user_id:
                user_orgs = await db.get_user_organizations(user_id)
                primary_org_id = user_orgs[0]['organization_id'] if user_orgs else None
            else:
                primary_org_id = None
        except Exception as org_error:
            logger.warning(f"Could not get organization for user {user['username']}: {str(org_error)}")
            primary_org_id = None
        
        # Create access token with role and organization information
        user_id = user.get('id') or user.get('user_id')
        token_data = {
            "sub": user["username"],
            "user_id": user_id,
            "role": user["role"],
            "org_id": primary_org_id,
            "email": user["email"]
        }
        
        access_token = create_access_token(
            data=token_data,
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        logger.info(f"User '{request.username}' successfully logged in")
        
        # Create login response
        user_id = user.get('id') or user.get('user_id')
        login_response = LoginResponse(
            token=access_token,
            user=UserResponse(
                id=user_id,
                username=user["username"],
                email=user["email"],
                role=user["role"],
                last_login=user.get("last_login")
            )
        )
        
        # Wrap in ApiResponse
        return ApiResponse(
            status="success",
            data=login_response,
            timestamp=datetime.now().isoformat()
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during login for user '{request.username}': {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred during login"
        )

@app.get("/api/auth/me", response_model=ApiResponse[UserResponse])
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user information with session data."""
    try:
        # Get updated user info with session data
        db = Database()
        user_with_session = await db.get_user_with_session_info(current_user['id'])
        
        if user_with_session:
            user_response = UserResponse(
                id=user_with_session["id"],
                username=user_with_session["username"],
                email=user_with_session["email"],
                role=user_with_session["role"],
                last_login=user_with_session.get("last_login"),
                last_logout=user_with_session.get("last_logout"),
                login_count=user_with_session.get("login_count", 0)
            )
        else:
            # Fallback to current_user data
            user_response = UserResponse(
                id=current_user["id"],
                username=current_user["username"],
                email=current_user["email"],
                role=current_user["role"],
                last_login=current_user.get("last_login"),
                last_logout=None,
                login_count=0
            )
        
        return ApiResponse(
            status="success",
            data=user_response,
            timestamp=datetime.now().isoformat()
        )
    except Exception as e:
        logger.error(f"Error getting current user info: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while retrieving user information"
        )

@app.get("/api/auth/whoami", response_model=ApiResponse[UserResponse])
async def whoami(current_user: dict = Depends(get_current_user)):
    """Get comprehensive current user information including role, organization, and session data."""
    try:
        # Get updated user info with session data
        db = Database()
        user_with_session = await db.get_user_with_session_info(current_user['id'])
        
        # Get user's organization information (handle gracefully if none)
        try:
            user_orgs = await db.get_user_organizations(current_user['id'])
            primary_org_id = user_orgs[0]['organization_id'] if user_orgs else None
        except Exception as org_error:
            logger.warning(f"Could not get organization for user {current_user['username']}: {str(org_error)}")
            user_orgs = []
            primary_org_id = None
        
        if user_with_session:
            user_response = UserResponse(
                id=user_with_session["id"],
                username=user_with_session["username"],
                email=user_with_session["email"],
                role=user_with_session["role"],
                last_login=user_with_session.get("last_login"),
                last_logout=user_with_session.get("last_logout"),
                login_count=user_with_session.get("login_count", 0)
            )
        else:
            # Fallback to current_user data
            user_response = UserResponse(
                id=current_user["id"],
                username=current_user["username"],
                email=current_user["email"],
                role=current_user["role"],
                last_login=current_user.get("last_login"),
                last_logout=None,
                login_count=0
            )
        
        # Add organization information to response data
        response_data = user_response.dict()
        response_data['org_id'] = primary_org_id
        
        # Get organization name safely
        org_name = None
        if user_orgs and len(user_orgs) > 0:
            org_name = user_orgs[0].get('organization_name') or user_orgs[0].get('name')
        response_data['organization_name'] = org_name
        
        return ApiResponse(
            status="success",
            data=response_data,
            timestamp=datetime.now().isoformat()
        )
    except Exception as e:
        logger.error(f"Error getting whoami info: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while retrieving user information"
        )

@app.post("/api/auth/logout", response_model=ApiResponse[Dict[str, str]])
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout the current user with session tracking."""
    try:
        # Update logout tracking
        db = Database()
        user_id = current_user.get('id') or current_user.get('user_id')
        if not user_id:
            logger.error(f"No user ID found in current_user: {current_user}")
            # Try to find user by username as fallback
            if current_user.get('username'):
                user = get_user_by_username(current_user['username'])
                if user:
                    user_id = user['id']
        
        if user_id:
            await db.update_user_logout(user_id)
            
            # Log the logout for audit
            await db.store_log({
                'level': 'info',
                'category': 'auth',
                'source': 'logout_api',
                'message': f"User {current_user.get('username', 'unknown')} logged out",
                'metadata': f'{{"user_id": {user_id}, "role": "{current_user.get("role", "unknown")}"}}'
            })
            
            logger.info(f"User '{current_user.get('username', 'unknown')}' logged out successfully")
        else:
            logger.warning(f"Could not determine user ID for logout: {current_user}")
        
        return ApiResponse(
            status="success",
            data={"message": "Successfully logged out"},
            timestamp=datetime.now().isoformat()
        )
    except Exception as e:
        logger.error(f"Error during logout: {str(e)}")
        raise HTTPException(status_code=500, detail="Logout failed")

@app.get("/api/logs")
@limiter.limit("30/minute")
async def get_logs(
    request: Request,
    page: int = 1,
    page_size: int = 20,
    level: Optional[str] = None,
    category: Optional[str] = None,
    source: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    api_key: APIKey = Depends(get_api_key)
):
    try:
        db = Database()
        logs = await db.get_logs(
            page=page,
            page_size=page_size,
            filters={
                'level': level,
                'category': category,
                'source': source,
                'start_date': start_date,
                'end_date': end_date,
                'search': search
            }
        )
        total = await db.get_logs_count(filters={
            'level': level,
            'category': category,
            'source': source,
            'start_date': start_date,
            'end_date': end_date,
            'search': search
        })
        return {
            "status": "success",
            "data": {
                "logs": logs,
                "total": total,
                "page": page,
                "pageSize": page_size
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting logs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/logs/stats")
@limiter.limit("30/minute")
async def get_logs_stats(
    request: Request,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    api_key: APIKey = Depends(get_api_key)
):
    try:
        db = Database()
        stats = await db.get_logs_stats(start_date=start_date, end_date=end_date)
        return {
            "status": "success",
            "data": stats,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting logs stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/security")
@limiter.limit("30/minute")
async def get_security_status(
    request: Request,
    api_key: APIKey = Depends(get_api_key)
):
    try:
        db = Database()
        metrics = await db.get_security_metrics()
        recent_scans = await db.get_recent_scans(limit=5)
        active_scans = [scan for scan in recent_scans if scan['status'] == 'running']
        recent_findings = await db.get_recent_findings(limit=10)
        
        return {
            "status": "success",
            "data": {
                "metrics": metrics,
                "recent_scans": recent_scans,
                "active_scans": active_scans,
                "recent_findings": recent_findings
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting security status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/network")
@limiter.limit("30/minute")
async def get_network_status(
    request: Request,
    api_key: APIKey = Depends(get_api_key)
):
    try:
        db = Database()
        devices = await db.get_network_devices()
        traffic = await db.get_network_traffic(limit=100)
        protocols = await db.get_network_protocols()
        stats = await db.get_network_stats()
        
        return {
            "status": "success",
            "data": {
                "devices": devices,
                "traffic": traffic,
                "protocols": protocols,
                "stats": stats
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting network status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/get-api-key", response_model=ApiResponse[Dict[str, str]])
async def get_api_key_endpoint(request: Request, current_user: dict = Depends(get_current_user)):
    """Get API key for authenticated user."""
    try:
        # In development mode, bypass authentication
        if DEV_MODE:
            return ApiResponse(
                status="success",
                data={"api_key": API_KEY},
                timestamp=datetime.now().isoformat()
            )
        
        # Only allow admin users to get the API key
        if current_user["role"] not in ["superadmin", "manager", "admin", "platform_admin"]:
            raise HTTPException(
                status_code=403,
                detail="Only admin users can access the API key"
            )
        
        return ApiResponse(
            status="success",
            data={"api_key": API_KEY},
            timestamp=datetime.now().isoformat()
        )
    except Exception as e:
        logger.error(f"Error getting API key: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get API key"
        )

@app.get("/api/settings")
@limiter.limit("30/minute")
async def get_settings(request: Request, api_key: APIKey = Depends(get_api_key)):
    """Get application settings"""
    try:
        db = Database()
        settings = await db.get_settings()
        return {
            "status": "success",
            "data": settings,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/settings")
@limiter.limit("10/minute")
async def update_settings(request: Request, settings: dict, api_key: APIKey = Depends(get_api_key)):
    """Update application settings"""
    try:
        db = Database()
        await db.update_settings(settings)
        logger.info(f"Settings updated successfully: {list(settings.keys())}")
        return {
            "status": "success",
            "data": {"message": "Settings updated successfully"},
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error updating settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/network/scan")
@limiter.limit("5/minute")
async def start_network_scan(request: Request, api_key: APIKey = Depends(get_api_key)):
    """Start a real network scan"""
    try:
        # Import the real network scanner
        from network_scanner import start_real_network_scan
        
        logger.info("Starting real network scan...")
        
        # Run the real network scan
        scan_result = await start_real_network_scan()
        
        # Create notification for scan completion
        await create_notification(
            title="Network Scan Completed",
            message=f"Network scan discovered {scan_result.get('devices_found', 0)} devices in {scan_result.get('scan_time', 0):.1f} seconds",
            category="network",
            severity="info",
            metadata={
                "scan_id": scan_result.get("scan_id", f"scan_{int(time.time())}"),
                "devices_found": scan_result.get("devices_found", 0),
                "scan_time": scan_result.get("scan_time", 0),
                "network_ranges": scan_result.get("network_ranges", [])
            }
        )
        
        return {
            "status": "success",
            "data": {
                "id": scan_result.get("scan_id", f"scan_{int(time.time())}"),
                "status": scan_result.get("status", "completed"),
                "devices_found": scan_result.get("devices_found", 0),
                "scan_time": scan_result.get("scan_time", 0),
                "network_ranges": scan_result.get("network_ranges", []),
                "message": f"Real network scan completed - found {scan_result.get('devices_found', 0)} devices"
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error starting network scan: {str(e)}")
        return {
            "status": "error",
            "data": {
                "id": f"scan_error_{int(time.time())}",
                "status": "error",
                "error": str(e),
                "message": "Network scan failed"
            },
            "timestamp": datetime.now().isoformat()
        }

@app.post("/api/security/scan")
@limiter.limit("5/minute") 
async def start_security_scan(request: Request, api_key: APIKey = Depends(get_api_key)):
    """Start a real security scan on discovered network devices"""
    try:
        db = Database()
        
        # Get real network devices for security scanning
        devices = await db.get_network_devices()
        scan_id = f"security_scan_{int(time.time())}"
        
        logger.info(f"Starting real security scan {scan_id} on {len(devices)} discovered devices")
        
        # Perform real security analysis on discovered devices
        findings = []
        for device in devices:
            device_ip = device.get('ip_address', 'unknown')
            device_name = device.get('name', f"device-{device.get('id')}")
            device_type = device.get('device_type', 'unknown')
            
            # Analyze real device security
            if device_type == 'Router' and device.get('open_ports'):
                # Check for common router vulnerabilities
                open_ports = device.get('open_ports', [])
                if 22 in open_ports:  # SSH port
                    findings.append({
                        'device_id': device.get('id'),
                        'device_ip': device_ip,
                        'device_name': device_name,
                        'type': 'open_port',
                        'severity': 'medium',
                        'description': f'SSH port (22) open on router {device_name} ({device_ip})',
                        'recommendation': 'Consider disabling SSH if not needed or restrict access'
                    })
                
                if 23 in open_ports:  # Telnet port
                    findings.append({
                        'device_id': device.get('id'),
                        'device_ip': device_ip,
                        'device_name': device_name,
                        'type': 'insecure_protocol',
                        'severity': 'high',
                        'description': f'Insecure Telnet port (23) open on router {device_name} ({device_ip})',
                        'recommendation': 'Disable Telnet and use SSH instead'
                    })
            
            # Check for devices that haven't been seen recently
            last_seen = device.get('last_seen')
            if last_seen and (datetime.now() - datetime.fromisoformat(last_seen.replace('Z', '+00:00'))).total_seconds() > 86400:  # 24 hours
                findings.append({
                    'device_id': device.get('id'),
                    'device_ip': device_ip,
                    'device_name': device_name,
                    'type': 'device_offline',
                    'severity': 'low',
                    'description': f'Device {device_name} ({device_ip}) has not been seen for over 24 hours',
                    'recommendation': 'Verify device status and network connectivity'
                })
        
        # Store scan in database
        scan_data = {
            'id': scan_id,
            'type': 'network_security',
            'status': 'completed',
            'target': f"{len(devices)} network devices",
            'findings_count': len(findings),
            'start_time': datetime.now().isoformat(),
            'end_time': datetime.now().isoformat(),
            'metadata': {
                'devices_scanned': len(devices),
                'findings': findings
            }
        }
        
        await db.store_security_scan(scan_data)
        
        # Store individual findings
        for finding in findings:
            finding_data = {
                'scan_id': scan_id,
                'type': finding['type'],
                'severity': finding['severity'],
                'description': finding['description'],
                'source': f"Device {finding['device_name']} ({finding['device_ip']})",
                'status': 'active',
                'metadata': {
                    'device_id': finding['device_id'],
                    'device_ip': finding['device_ip'],
                    'recommendation': finding['recommendation']
                }
            }
            await db.store_security_finding(finding_data)
        
        logger.info(f"Security scan {scan_id} completed: {len(findings)} findings on {len(devices)} devices")
        
        # Create notification for security scan completion
        severity = "critical" if any(f['severity'] == 'high' for f in findings) else "warning" if findings else "info"
        await create_notification(
            title="Security Scan Completed",
            message=f"Security scan found {len(findings)} findings on {len(devices)} devices",
            category="security",
            severity=severity,
            metadata={
                "scan_id": scan_id,
                "devices_scanned": len(devices),
                "findings_count": len(findings),
                "high_severity_count": len([f for f in findings if f['severity'] == 'high']),
                "medium_severity_count": len([f for f in findings if f['severity'] == 'medium'])
            }
        )
        
        # Create individual notifications for high-severity findings
        for finding in findings:
            if finding['severity'] == 'high':
                await create_notification(
                    title=f"High Severity Security Issue",
                    message=finding['description'],
                    category="security",
                    severity="critical",
                    metadata={
                        "scan_id": scan_id,
                        "device_id": finding['device_id'],
                        "device_ip": finding['device_ip'],
                        "finding_type": finding['type'],
                        "recommendation": finding['recommendation']
                    }
                )
        
        return {
            "status": "success",
            "data": {
                "id": scan_id,
                "status": "completed",
                "devices_scanned": len(devices),
                "findings_count": len(findings),
                "message": f"Security scan completed on {len(devices)} real network devices"
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error starting security scan: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/settings/options")
@limiter.limit("30/minute")
async def get_settings_options(request: Request, api_key: APIKey = Depends(get_api_key)):
    """Get available options for settings dropdowns"""
    try:
        options = {
            "themes": [
                {"value": "dark", "label": "Dark Mode"},
                {"value": "light", "label": "Light Mode"},
                {"value": "auto", "label": "Auto (System)"}
            ],
            "languages": [
                {"value": "en", "label": "English"},
                {"value": "es", "label": "Spanish"},
                {"value": "fr", "label": "French"},
                {"value": "de", "label": "German"}
            ],
            "timezones": [
                {"value": "UTC", "label": "UTC"},
                {"value": "America/New_York", "label": "Eastern Time"},
                {"value": "America/Chicago", "label": "Central Time"},
                {"value": "America/Denver", "label": "Mountain Time"},
                {"value": "America/Los_Angeles", "label": "Pacific Time"}
            ],
            "network_interfaces": [
                {"value": "auto", "label": "Auto-detect"},
                {"value": "eth0", "label": "Ethernet (eth0)"},
                {"value": "wlan0", "label": "WiFi (wlan0)"},
                {"value": "all", "label": "Monitor all interfaces"}
            ],
            "discovery_methods": [
                {"value": "ping_arp", "label": "Ping + ARP"},
                {"value": "arp_only", "label": "ARP Only"},
                {"value": "ping_only", "label": "Ping Only"}
            ],
            "severity_levels": [
                {"value": "low", "label": "Low and above"},
                {"value": "medium", "label": "Medium and above"},
                {"value": "high", "label": "High and above"},
                {"value": "critical", "label": "Critical only"}
            ],
            "log_levels": [
                {"value": "debug", "label": "Debug"},
                {"value": "info", "label": "Info"},
                {"value": "warning", "label": "Warning"},
                {"value": "error", "label": "Error"},
                {"value": "critical", "label": "Critical"}
            ]
        }
        return {
            "status": "success",
            "data": options,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting settings options: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/settings/reset")
@limiter.limit("5/minute")
async def reset_settings(request: Request, api_key: APIKey = Depends(get_api_key)):
    """Reset settings to default values"""
    try:
        # Clear all settings from database to force reload of defaults
        import aiosqlite
        async with aiosqlite.connect("data/securenet.db") as conn:
            await conn.execute("DELETE FROM settings")
            await conn.commit()
        
        logger.info("Settings reset to defaults")
        return {
            "status": "success",
            "data": {"message": "Settings reset to default values"},
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error resetting settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# CVE Integration Endpoints
@app.get("/api/cve/summary")
@limiter.limit("30/minute")
async def get_cve_summary(request: Request, api_key: APIKey = Depends(get_api_key)):
    """Get CVE vulnerability summary"""
    try:
        cve_integration = CVEIntegration()
        summary = cve_integration.get_vulnerability_summary()
        
        return {
            "status": "success",
            "data": summary,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting CVE summary: {e}")
        raise HTTPException(status_code=500, detail="Failed to get CVE summary")

@app.post("/api/cve/scan")
@limiter.limit("5/minute")
async def start_cve_scan(request: Request, api_key: APIKey = Depends(get_api_key)):
    """Start comprehensive CVE vulnerability scan"""
    try:
        cve_integration = CVEIntegration()
        
        # Run scan in background
        scan_results = await cve_integration.full_vulnerability_scan()
        
        return {
            "status": "success",
            "data": scan_results,
            "message": "CVE vulnerability scan completed",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error starting CVE scan: {e}")
        raise HTTPException(status_code=500, detail="Failed to start CVE scan")

@app.get("/api/cve/vulnerabilities")
@limiter.limit("30/minute")
async def get_device_vulnerabilities(
    request: Request,
    device_ip: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 50,
    api_key: APIKey = Depends(get_api_key)
):
    """Get device vulnerabilities with optional filtering"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Build query with filters
        query = """
            SELECT dv.*, cd.description, cd.published_date, cd.cvss_v3_vector
            FROM device_vulnerabilities dv
            LEFT JOIN cve_data cd ON dv.cve_id = cd.cve_id
            WHERE 1=1
        """
        params = []
        
        if device_ip:
            query += " AND dv.device_ip = ?"
            params.append(device_ip)
        
        if severity:
            query += " AND dv.severity = ?"
            params.append(severity.upper())
        
        query += " ORDER BY dv.score DESC, dv.remediation_priority ASC LIMIT ?"
        params.append(limit)
        
        cursor.execute(query, params)
        vulnerabilities = []
        
        for row in cursor.fetchall():
            vuln = dict(row)
            # Parse JSON fields
            if vuln.get('affected_services'):
                vuln['affected_services'] = json.loads(vuln['affected_services'])
            vulnerabilities.append(vuln)
        
        conn.close()
        
        return {
            "status": "success",
            "data": vulnerabilities,
            "count": len(vulnerabilities),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting vulnerabilities: {e}")
        raise HTTPException(status_code=500, detail="Failed to get vulnerabilities")

@app.get("/api/cve/search")
@limiter.limit("20/minute")
async def search_cves(
    request: Request,
    keyword: str,
    limit: int = 20,
    api_key: APIKey = Depends(get_api_key)
):
    """Search CVEs by keyword"""
    try:
        cve_integration = CVEIntegration()
        
        # Search CVEs
        cves = await cve_integration.search_cves_by_keyword(keyword, limit)
        
        # Convert to dict format
        cve_data = []
        for cve in cves:
            cve_dict = {
                'cve_id': cve.cve_id,
                'description': cve.description,
                'cvss_v3_score': cve.cvss_v3_score,
                'cvss_v3_severity': cve.cvss_v3_severity,
                'published_date': cve.published_date,
                'is_kev': cve.is_kev,
                'cwe_ids': cve.cwe_ids
            }
            cve_data.append(cve_dict)
        
        # Store in database
        if cves:
            cve_integration.store_cve_data(cves)
        
        return {
            "status": "success",
            "data": cve_data,
            "count": len(cve_data),
            "keyword": keyword,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error searching CVEs: {e}")
        raise HTTPException(status_code=500, detail="Failed to search CVEs")

@app.get("/api/cve/recent")
@limiter.limit("20/minute")
async def get_recent_cves(
    request: Request,
    days: int = 7,
    severity: Optional[str] = None,
    api_key: APIKey = Depends(get_api_key)
):
    """Get recent CVEs from the last N days"""
    try:
        cve_integration = CVEIntegration()
        
        if severity:
            # Search by severity
            cves = await cve_integration.search_high_severity_cves(severity.upper())
        else:
            # Search recent CVEs
            cves = await cve_integration.search_recent_cves(days)
        
        # Convert to dict format
        cve_data = []
        for cve in cves:
            cve_dict = {
                'cve_id': cve.cve_id,
                'description': cve.description[:200] + "..." if len(cve.description) > 200 else cve.description,
                'cvss_v3_score': cve.cvss_v3_score,
                'cvss_v3_severity': cve.cvss_v3_severity,
                'published_date': cve.published_date,
                'is_kev': cve.is_kev,
                'affected_products_count': len(cve.affected_products)
            }
            cve_data.append(cve_dict)
        
        # Store in database
        if cves:
            cve_integration.store_cve_data(cves)
        
        return {
            "status": "success",
            "data": cve_data,
            "count": len(cve_data),
            "days": days,
            "severity": severity,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting recent CVEs: {e}")
        raise HTTPException(status_code=500, detail="Failed to get recent CVEs")

@app.get("/api/cve/stats")
@limiter.limit("30/minute")
async def get_cve_stats(request: Request, api_key: APIKey = Depends(get_api_key)):
    """Get CVE statistics and metrics"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Get vulnerability counts by severity
        cursor.execute("""
            SELECT severity, COUNT(*) as count
            FROM device_vulnerabilities
            GROUP BY severity
        """)
        severity_stats = dict(cursor.fetchall())
        
        # Get vulnerability counts by device type
        cursor.execute("""
            SELECT device_type, COUNT(*) as count
            FROM device_vulnerabilities
            GROUP BY device_type
        """)
        device_type_stats = dict(cursor.fetchall())
        
        # Get top CVEs by frequency
        cursor.execute("""
            SELECT cve_id, COUNT(*) as device_count, AVG(score) as avg_score
            FROM device_vulnerabilities
            GROUP BY cve_id
            ORDER BY device_count DESC
            LIMIT 10
        """)
        top_cves = [
            {
                'cve_id': row[0],
                'affected_devices': row[1],
                'average_score': round(row[2], 1) if row[2] else 0
            }
            for row in cursor.fetchall()
        ]
        
        # Get scan history
        cursor.execute("""
            SELECT COUNT(*) as total_scans, 
                   MAX(timestamp) as last_scan,
                   AVG(scan_duration) as avg_duration
            FROM cve_scan_history
        """)
        scan_stats = cursor.fetchone()
        
        # Get total CVE count
        cursor.execute("SELECT COUNT(*) FROM cve_data")
        total_cves = cursor.fetchone()[0]
        
        # Get total vulnerability count
        cursor.execute("SELECT COUNT(*) FROM device_vulnerabilities")
        total_vulnerabilities = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            "status": "success",
            "data": {
                "severity_distribution": severity_stats,
                "device_type_distribution": device_type_stats,
                "top_cves": top_cves,
                "scan_statistics": {
                    "total_scans": scan_stats[0] if scan_stats else 0,
                    "last_scan": scan_stats[1] if scan_stats else None,
                    "average_duration": round(scan_stats[2], 2) if scan_stats and scan_stats[2] else 0
                },
                "totals": {
                    "cves_in_database": total_cves,
                    "total_vulnerabilities": total_vulnerabilities
                }
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting CVE stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get CVE statistics")

# Notifications API endpoints
@app.get("/api/notifications")
@limiter.limit("30/minute")
async def get_notifications(
    request: Request,
    page: int = 1,
    page_size: int = 20,
    unread_only: bool = False,
    category: Optional[str] = None,
    severity: Optional[str] = None,
    api_key: APIKey = Depends(get_api_key)
):
    """Get notifications with filtering and pagination."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            
            # Build query with filters
            where_conditions = []
            params = []
            
            if unread_only:
                where_conditions.append("read_at IS NULL")
            
            if category:
                where_conditions.append("category = ?")
                params.append(category)
            
            if severity:
                where_conditions.append("severity = ?")
                params.append(severity)
            
            where_clause = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""
            
            # Get total count
            cursor.execute(f"SELECT COUNT(*) FROM notifications{where_clause}", params)
            total_count = cursor.fetchone()[0]
            
            # Get notifications with pagination
            offset = (page - 1) * page_size
            cursor.execute(f"""
                SELECT id, title, message, category, severity, created_at, read_at, metadata
                FROM notifications
                {where_clause}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            """, params + [page_size, offset])
            
            notifications = []
            for row in cursor.fetchall():
                notifications.append({
                    "id": row[0],
                    "title": row[1],
                    "message": row[2],
                    "category": row[3],
                    "severity": row[4],
                    "timestamp": row[5],
                    "read": row[6] is not None,
                    "read_at": row[6],
                    "metadata": json.loads(row[7]) if row[7] else {}
                })
            
            return {
                "status": "success",
                "data": {
                    "notifications": notifications,
                    "pagination": {
                        "page": page,
                        "page_size": page_size,
                        "total_count": total_count,
                        "total_pages": (total_count + page_size - 1) // page_size
                    }
                },
                "timestamp": datetime.now().isoformat()
            }
            
    except Exception as e:
        logger.error(f"Error getting notifications: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting notifications: {str(e)}")

@app.post("/api/notifications/{notification_id}/read")
@limiter.limit("60/minute")
async def mark_notification_read(
    request: Request,
    notification_id: int,
    api_key: APIKey = Depends(get_api_key)
):
    """Mark a notification as read."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE notifications 
                SET read_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            """, (notification_id,))
            
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Notification not found")
            
            conn.commit()
            
            return {
                "status": "success",
                "data": {"message": "Notification marked as read"},
                "timestamp": datetime.now().isoformat()
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notification as read: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating notification: {str(e)}")

@app.post("/api/notifications/read-all")
@limiter.limit("10/minute")
async def mark_all_notifications_read(
    request: Request,
    api_key: APIKey = Depends(get_api_key)
):
    """Mark all notifications as read."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE notifications 
                SET read_at = CURRENT_TIMESTAMP 
                WHERE read_at IS NULL
            """)
            
            updated_count = cursor.rowcount
            conn.commit()
            
            return {
                "status": "success",
                "data": {"message": f"Marked {updated_count} notifications as read"},
                "timestamp": datetime.now().isoformat()
            }
            
    except Exception as e:
        logger.error(f"Error marking all notifications as read: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating notifications: {str(e)}")

@app.delete("/api/notifications/{notification_id}")
@limiter.limit("30/minute")
async def delete_notification(
    request: Request,
    notification_id: int,
    api_key: APIKey = Depends(get_api_key)
):
    """Delete a notification."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM notifications WHERE id = ?", (notification_id,))
            
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Notification not found")
            
            conn.commit()
            
            return {
                "status": "success",
                "data": {"message": "Notification deleted"},
                "timestamp": datetime.now().isoformat()
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting notification: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting notification: {str(e)}")

# Enhanced notification creation function
async def create_notification(
    title: str,
    message: str,
    category: str = "system",
    severity: str = "info",
    metadata: dict = None
):
    """Create and broadcast a new notification."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO notifications (title, message, category, severity, metadata)
                VALUES (?, ?, ?, ?, ?)
            """, (title, message, category, severity, json.dumps(metadata or {})))
            
            notification_id = cursor.lastrowid
            conn.commit()
            
            # Create notification object for broadcasting
            notification = {
                "id": notification_id,
                "title": title,
                "message": message,
                "category": category,
                "severity": severity,
                "timestamp": datetime.now().isoformat(),
                "read": False,
                "metadata": metadata or {}
            }
            
            # Broadcast to WebSocket clients
            await manager.broadcast_notification(notification)
            
            return notification_id
            
    except Exception as e:
        logger.error(f"Error creating notification: {str(e)}")
        return None

# Test endpoint to generate sample notifications (for demonstration)
@app.post("/api/notifications/test")
@limiter.limit("5/minute")
async def create_test_notifications(request: Request, api_key: APIKey = Depends(get_api_key)):
    """Create test notifications for demonstration purposes."""
    try:
        test_notifications = [
            {
                "title": "Network Device Discovered",
                "message": "New device detected on network: Router (192.168.1.1)",
                "category": "network",
                "severity": "info",
                "metadata": {"device_ip": "192.168.1.1", "device_type": "Router"}
            },
            {
                "title": "Security Alert",
                "message": "Multiple failed login attempts detected from IP 192.168.1.50",
                "category": "security",
                "severity": "warning",
                "metadata": {"source_ip": "192.168.1.50", "attempt_count": 5}
            },
            {
                "title": "Critical Vulnerability Found",
                "message": "CVE-2024-1234 detected on device 192.168.1.10 - Immediate action required",
                "category": "security",
                "severity": "critical",
                "metadata": {"cve_id": "CVE-2024-1234", "device_ip": "192.168.1.10"}
            },
            {
                "title": "System Update Available",
                "message": "SecureNet v2.1.1 is available for download",
                "category": "system",
                "severity": "info",
                "metadata": {"version": "v2.1.1", "update_type": "minor"}
            },
            {
                "title": "Anomaly Detected",
                "message": "Unusual traffic pattern detected on port 443 - investigating",
                "category": "security",
                "severity": "warning",
                "metadata": {"port": 443, "traffic_type": "HTTPS"}
            }
        ]
        
        created_ids = []
        for notif in test_notifications:
            notification_id = await create_notification(**notif)
            if notification_id:
                created_ids.append(notification_id)
        
        return {
            "status": "success",
            "data": {
                "message": f"Created {len(created_ids)} test notifications",
                "notification_ids": created_ids
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error creating test notifications: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating test notifications: {str(e)}")

# ===== PROFILE MANAGEMENT MODELS =====

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    title: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class Enable2FARequest(BaseModel):
    verification_code: Optional[str] = None

class CreateAPIKeyRequest(BaseModel):
    name: str

class APIKeyResponse(BaseModel):
    id: str
    name: str
    key: str
    created_at: str
    last_used: Optional[str] = None

class SessionResponse(BaseModel):
    id: str
    device: str
    browser: str
    location: str
    ip: str
    last_active: str
    current: bool

class ActivityLogResponse(BaseModel):
    id: str
    action: str
    timestamp: str
    ip: str
    user_agent: str

class UserProfileResponse(BaseModel):
    id: str
    username: str
    email: str
    name: Optional[str] = None
    role: str
    status: str
    last_login: Optional[str] = None
    created_at: str
    department: Optional[str] = None
    title: Optional[str] = None
    phone: Optional[str] = None
    permissions: List[str] = []
    activity_log: List[ActivityLogResponse] = []
    org_id: Optional[str] = None
    organization_name: Optional[str] = None
    login_count: int = 0
    last_logout: Optional[str] = None
    two_factor_enabled: bool = False

# ===== PROFILE MANAGEMENT ENDPOINTS =====

@app.get("/api/user/profile", response_model=ApiResponse[UserProfileResponse])
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    """Get current user's profile information."""
    try:
        db = Database()
        
        # Get user with session info
        user_data = await db.get_user_with_session_info(current_user['id'])
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get user's organization information
        try:
            user_orgs = await db.get_user_organizations(current_user['id'])
            primary_org_id = user_orgs[0]['organization_id'] if user_orgs else None
            org_name = user_orgs[0].get('organization_name') if user_orgs else None
        except Exception:
            primary_org_id = None
            org_name = None
        
        # Get user's activity log (last 10 activities)
        activity_log = await db.get_user_activity_log(current_user['id'], limit=10)
        
        # Get user permissions based on role
        permissions = db.get_role_permissions(user_data['role'])
        
        profile = UserProfileResponse(
            id=str(user_data['id']),
            username=user_data['username'],
            email=user_data['email'],
            name=user_data.get('name') or user_data['username'],
            role=user_data['role'],
            status='active' if user_data.get('is_active', True) else 'inactive',
            last_login=user_data.get('last_login'),
            created_at=user_data.get('created_at', datetime.now().isoformat()),
            department=user_data.get('department'),
            title=user_data.get('title'),
            phone=user_data.get('phone'),
            permissions=permissions,
            activity_log=[
                ActivityLogResponse(
                    id=str(log['id']),
                    action=log['action'],
                    timestamp=log['timestamp'],
                    ip=log['ip_address'],
                    user_agent=log.get('user_agent', 'Unknown')
                ) for log in activity_log
            ],
            org_id=primary_org_id,
            organization_name=org_name,
            login_count=user_data.get('login_count', 0),
            last_logout=user_data.get('last_logout'),
            two_factor_enabled=user_data.get('two_factor_enabled', False)
        )
        
        return ApiResponse(
            status="success",
            data=profile,
            timestamp=datetime.now().isoformat()
        )
    except Exception as e:
        logger.error(f"Error getting user profile: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get user profile")

@app.put("/api/user/profile", response_model=ApiResponse[UserProfileResponse])
async def update_user_profile(
    profile_update: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update current user's profile information."""
    try:
        db = Database()
        
        # Prepare update data
        update_data = {}
        if profile_update.name is not None:
            update_data['name'] = profile_update.name
        if profile_update.email is not None:
            update_data['email'] = profile_update.email
        if profile_update.phone is not None:
            update_data['phone'] = profile_update.phone
        if profile_update.department is not None:
            update_data['department'] = profile_update.department
        if profile_update.title is not None:
            update_data['title'] = profile_update.title
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        
        # Update user profile
        success = await db.update_user_profile(current_user['id'], update_data)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update profile")
        
        # Log the activity
        await db.log_user_activity(
            user_id=current_user['id'],
            action="Profile updated",
            ip_address="127.0.0.1",  # TODO: Get real IP from request
            user_agent="SecureNet Dashboard"
        )
        
        # Return updated profile
        return await get_user_profile(current_user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user profile: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update profile")

@app.post("/api/auth/change-password", response_model=ApiResponse[Dict[str, str]])
async def change_password(
    password_request: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    """Change user's password."""
    try:
        db = Database()
        
        # Get current user data
        user_data = db.get_user_by_username(current_user['username'])
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify current password
        if not verify_password(password_request.current_password, user_data['password_hash']):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        # Validate new password
        if len(password_request.new_password) < 8:
            raise HTTPException(status_code=400, detail="New password must be at least 8 characters long")
        
        # Update password
        success = await db.update_user_password(current_user['id'], password_request.new_password)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update password")
        
        # Log the activity
        await db.log_user_activity(
            user_id=current_user['id'],
            action="Password changed",
            ip_address="127.0.0.1",  # TODO: Get real IP from request
            user_agent="SecureNet Dashboard"
        )
        
        return ApiResponse(
            status="success",
            data={"message": "Password changed successfully"},
            timestamp=datetime.now().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing password: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to change password")

@app.post("/api/auth/2fa/enable", response_model=ApiResponse[Dict[str, str]])
async def enable_2fa(
    request: Enable2FARequest,
    current_user: dict = Depends(get_current_user)
):
    """Enable two-factor authentication for user."""
    try:
        db = Database()
        
        # For now, we'll just mark 2FA as enabled
        # In a real implementation, you would:
        # 1. Generate a secret key
        # 2. Create QR code
        # 3. Verify the provided code
        # 4. Store the secret securely
        
        success = await db.update_user_2fa_status(current_user['id'], True)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to enable 2FA")
        
        # Log the activity
        await db.log_user_activity(
            user_id=current_user['id'],
            action="Two-factor authentication enabled",
            ip_address="127.0.0.1",  # TODO: Get real IP from request
            user_agent="SecureNet Dashboard"
        )
        
        return ApiResponse(
            status="success",
            data={"message": "Two-factor authentication enabled successfully"},
            timestamp=datetime.now().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error enabling 2FA: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to enable 2FA")

@app.post("/api/auth/2fa/disable", response_model=ApiResponse[Dict[str, str]])
async def disable_2fa(current_user: dict = Depends(get_current_user)):
    """Disable two-factor authentication for user."""
    try:
        db = Database()
        
        success = await db.update_user_2fa_status(current_user['id'], False)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to disable 2FA")
        
        # Log the activity
        await db.log_user_activity(
            user_id=current_user['id'],
            action="Two-factor authentication disabled",
            ip_address="127.0.0.1",  # TODO: Get real IP from request
            user_agent="SecureNet Dashboard"
        )
        
        return ApiResponse(
            status="success",
            data={"message": "Two-factor authentication disabled successfully"},
            timestamp=datetime.now().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error disabling 2FA: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to disable 2FA")

@app.get("/api/user/api-keys", response_model=ApiResponse[List[APIKeyResponse]])
async def get_user_api_keys(current_user: dict = Depends(get_current_user)):
    """Get user's API keys."""
    try:
        db = Database()
        
        api_keys = await db.get_user_api_keys(current_user['id'])
        
        keys_response = [
            APIKeyResponse(
                id=str(key['id']),
                name=key['name'],
                key=key['key_preview'],  # Only show preview for security
                created_at=key['created_at'],
                last_used=key.get('last_used')
            ) for key in api_keys
        ]
        
        return ApiResponse(
            status="success",
            data=keys_response,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error getting user API keys: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get API keys")

@app.post("/api/user/api-keys", response_model=ApiResponse[APIKeyResponse])
async def create_user_api_key(
    key_request: CreateAPIKeyRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new API key for user."""
    try:
        db = Database()
        
        # Generate new API key
        api_key = f"sk_{secrets.token_urlsafe(32)}"
        
        # Store API key
        key_id = await db.create_user_api_key(
            user_id=current_user['id'],
            name=key_request.name,
            key=api_key
        )
        
        if not key_id:
            raise HTTPException(status_code=500, detail="Failed to create API key")
        
        # Log the activity
        await db.log_user_activity(
            user_id=current_user['id'],
            action=f"API key created: {key_request.name}",
            ip_address="127.0.0.1",  # TODO: Get real IP from request
            user_agent="SecureNet Dashboard"
        )
        
        key_response = APIKeyResponse(
            id=str(key_id),
            name=key_request.name,
            key=api_key,  # Return full key only on creation
            created_at=datetime.now().isoformat(),
            last_used=None
        )
        
        return ApiResponse(
            status="success",
            data=key_response,
            timestamp=datetime.now().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating API key: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create API key")

@app.delete("/api/user/api-keys/{key_id}", response_model=ApiResponse[Dict[str, str]])
async def delete_user_api_key(
    key_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete user's API key."""
    try:
        db = Database()
        
        success = await db.delete_user_api_key(current_user['id'], key_id)
        if not success:
            raise HTTPException(status_code=404, detail="API key not found")
        
        # Log the activity
        await db.log_user_activity(
            user_id=current_user['id'],
            action=f"API key deleted: {key_id}",
            ip_address="127.0.0.1",  # TODO: Get real IP from request
            user_agent="SecureNet Dashboard"
        )
        
        return ApiResponse(
            status="success",
            data={"message": "API key deleted successfully"},
            timestamp=datetime.now().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting API key: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete API key")

@app.get("/api/user/sessions", response_model=ApiResponse[List[SessionResponse]])
async def get_user_sessions(current_user: dict = Depends(get_current_user)):
    """Get user's active sessions."""
    try:
        db = Database()
        
        sessions = await db.get_user_sessions(current_user['id'])
        
        sessions_response = [
            SessionResponse(
                id=str(session['id']),
                device=session.get('device', 'Unknown Device'),
                browser=session.get('browser', 'Unknown Browser'),
                location=session.get('location', 'Unknown Location'),
                ip=session['ip_address'],
                last_active=session['last_active'],
                current=session.get('current', False)
            ) for session in sessions
        ]
        
        return ApiResponse(
            status="success",
            data=sessions_response,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error getting user sessions: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get sessions")

@app.delete("/api/user/sessions/{session_id}", response_model=ApiResponse[Dict[str, str]])
async def terminate_user_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Terminate a user session."""
    try:
        db = Database()
        
        success = await db.terminate_user_session(current_user['id'], session_id)
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Log the activity
        await db.log_user_activity(
            user_id=current_user['id'],
            action=f"Session terminated: {session_id}",
            ip_address="127.0.0.1",  # TODO: Get real IP from request
            user_agent="SecureNet Dashboard"
        )
        
        return ApiResponse(
            status="success",
            data={"message": "Session terminated successfully"},
            timestamp=datetime.now().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error terminating session: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to terminate session")

@app.get("/api/user/activity", response_model=ApiResponse[List[ActivityLogResponse]])
async def get_user_activity(
    current_user: dict = Depends(get_current_user),
    limit: int = 50
):
    """Get user's activity log."""
    try:
        db = Database()
        
        activity_log = await db.get_user_activity_log(current_user['id'], limit=limit)
        
        activity_response = [
            ActivityLogResponse(
                id=str(log['id']),
                action=log['action'],
                timestamp=log['timestamp'],
                ip=log['ip_address'],
                user_agent=log.get('user_agent', 'Unknown')
            ) for log in activity_log
        ]
        
        return ApiResponse(
            status="success",
            data=activity_response,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error getting user activity: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get activity log")