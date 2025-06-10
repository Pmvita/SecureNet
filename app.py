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

# Load environment variables
load_dotenv()

# Development mode
DEV_MODE = os.getenv("DEV_MODE", "true").lower() == "true"

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Service states
default_service_states = {
    "ingestion": {"running": False, "stats": {"logs_processed": 0, "last_processed": None}},
    "detection": {"running": False, "stats": {"anomalies_detected": 0, "last_detection": None}},
    "alerts": {"running": False, "stats": {"alerts_sent": 0, "last_alert": None}}
}
service_states = default_service_states.copy()

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
        if api_key in [API_KEY, 'dev-api-key']:
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

@app.get("/", response_class=HTMLResponse)
@limiter.limit("60/minute")
async def dashboard(request: Request):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, timestamp, source, anomaly_score, message 
        FROM logs 
        WHERE anomaly_score IS NOT NULL 
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
        SELECT id, timestamp, source, anomaly_score, message 
        FROM logs 
        WHERE anomaly_score IS NOT NULL 
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
                level TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                read_at TIMESTAMP
            )
        """)
        
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
        
        # Update last login time
        try:
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE users
                    SET last_login = CURRENT_TIMESTAMP
                    WHERE username = ?
                """, (request.username,))
                conn.commit()
                logger.info(f"Updated last login time for user '{request.username}'")
        except Exception as e:
            logger.error(f"Error updating last login time for user '{request.username}': {str(e)}")
            # Continue with login even if last login update fails
        
        # Create access token
        access_token = create_access_token(
            data={"sub": user["username"]},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        logger.info(f"User '{request.username}' successfully logged in")
        
        # Create login response
        login_response = LoginResponse(
            token=access_token,
            user=UserResponse(
                id=user["id"],
                username=user["username"],
                email=user["email"],
                role=user["role"],
                last_login=user["last_login"]
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
    """Get current authenticated user information."""
    try:
        user_response = UserResponse(
            id=current_user["id"],
            username=current_user["username"],
            email=current_user["email"],
            role=current_user["role"],
            last_login=current_user.get("last_login")
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

@app.post("/api/auth/logout", response_model=ApiResponse[Dict[str, str]])
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout the current user."""
    try:
        logger.info(f"User '{current_user['username']}' logged out successfully")
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
        if current_user["role"] != "admin":
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
        # Return default settings since we don't have a settings store yet
        settings = {
            "api_key": "dev-api-key",
            "network_monitoring": {
                "enabled": True,
                "interval": 300,
                "devices": ["192.168.1.1", "192.168.1.100"]
            },
            "security_scanning": {
                "enabled": True,
                "interval": 3600,
                "types": ["vulnerability", "malware"]
            },
            "notifications": {
                "enabled": False,
                "email": "",
                "slack_webhook": ""
            },
            "logging": {
                "level": "info",
                "retention_days": 30
            }
        }
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
        # For now, just return success - in a real app you'd save to database
        logger.info(f"Settings update requested: {settings}")
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
    """Start a network scan"""
    try:
        # In a real implementation, this would trigger an actual network scan
        scan_id = f"scan_{int(time.time())}"
        logger.info(f"Network scan started with ID: {scan_id}")
        return {
            "status": "success",
            "data": {
                "id": scan_id,
                "status": "started",
                "message": "Network scan initiated"
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error starting network scan: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/security/scan")
@limiter.limit("5/minute") 
async def start_security_scan(request: Request, api_key: APIKey = Depends(get_api_key)):
    """Start a security scan"""
    try:
        # In a real implementation, this would trigger an actual security scan
        scan_id = f"security_scan_{int(time.time())}"
        logger.info(f"Security scan started with ID: {scan_id}")
        return {
            "status": "success",
            "data": {
                "id": scan_id,
                "status": "started",
                "message": "Security scan initiated"
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error starting security scan: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))