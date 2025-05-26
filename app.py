from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, HTTPException, Depends, Header, Query, status, Body
from fastapi.responses import HTMLResponse, JSONResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
import uuid
from datetime import datetime, timedelta
import logging
from typing import Dict, List, Optional, Any
from database import Database
import json
import io
import csv
import asyncio
import psutil
import socket
import subprocess
import sqlite3
import platform
import re
from pydantic import BaseModel
from fastapi import BackgroundTasks
import sys
import time
import signal
import random
import secrets

# Load environment variables from .env file
load_dotenv()

# Configure logging first
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Create logs directory if it doesn't exist
os.makedirs('logs', exist_ok=True)

# Add file handler
file_handler = logging.FileHandler('logs/app.log')
file_handler.setLevel(logging.INFO)
file_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
file_handler.setFormatter(file_formatter)
logger.addHandler(file_handler)

# Add stream handler for console output
stream_handler = logging.StreamHandler()
stream_handler.setLevel(logging.INFO)
stream_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
stream_handler.setFormatter(stream_formatter)
logger.addHandler(stream_handler)

# Get API key from environment with fallback
API_KEY = os.getenv('SECURENET_API_KEY')
if not API_KEY:
    # Try alternative environment variable name
    API_KEY = os.getenv('API_KEY')
    if API_KEY:
        logger.info("Using API_KEY from environment")
        os.environ['SECURENET_API_KEY'] = API_KEY
    else:
        # Generate new key if none exists
        API_KEY = secrets.token_urlsafe(32)
        os.environ['SECURENET_API_KEY'] = API_KEY
        logger.info(f"Generated new API key: {API_KEY[:8]}...")

# Log the API key being used (first 8 chars only)
logger.info(f"Using API key: {API_KEY[:8]}...")

# Initialize database
db = Database()

# Ensure database has the same API key
try:
    db.update_settings({'api_key': API_KEY})
    logger.info("Database API key updated successfully")
except Exception as e:
    logger.error(f"Error updating database API key: {str(e)}")

# Add database handler
class DatabaseLogHandler(logging.Handler):
    def emit(self, record):
        try:
            # Format the log message
            msg = self.format(record)
            
            # Insert into database
            with db.get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO logs (timestamp, level, source, message)
                    VALUES (?, ?, ?, ?)
                """, (
                    datetime.now().isoformat(),
                    record.levelname.lower(),
                    record.name,
                    msg
                ))
                conn.commit()
        except Exception as e:
            print(f"Error logging to database: {str(e)}")

db_handler = DatabaseLogHandler()
db_handler.setLevel(logging.INFO)
db_formatter = logging.Formatter('%(message)s')
db_handler.setFormatter(db_formatter)
logger.addHandler(db_handler)

# Initialize FastAPI app
app = FastAPI(
    title="SecureNet",
    description="A comprehensive network security monitoring and management system"
)

# Global variables
monitoring_task = None
active_connections = {
    'security': set(),
    'logs': set(),
    'network': set(),
    'alerts': set()
}

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Template setup
templates = Jinja2Templates(directory="templates")

# Static files setup - mount before other routes
app.mount("/static", StaticFiles(directory="static"), name="static")

# WebSocket connection management
message_queues = {
    'network': asyncio.Queue(),
    'logs': asyncio.Queue(),
    'alerts': asyncio.Queue(),
    'security': asyncio.Queue()  # Add security queue
}

def get_api_key() -> str:
    """Get API key from environment"""
    return API_KEY

def validate_api_key(api_key: str) -> bool:
    """Validate the provided API key"""
    if not api_key:
        logger.debug("Empty API key provided")
        return False
    
    # Strip any comments and whitespace from the key
    clean_key = api_key.split('#')[0].strip()
    stored_key = API_KEY.split('#')[0].strip()
    
    # Log validation attempt (first 8 chars only)
    logger.debug(f"Validating API key: {clean_key[:8]}... against stored key: {stored_key[:8]}...")
    
    is_valid = clean_key == stored_key
    if not is_valid:
        logger.warning(f"Invalid API key attempt: {clean_key[:8]}...")
    return is_valid

@app.websocket("/ws/{connection_type}")
async def websocket_endpoint(websocket: WebSocket, connection_type: str, api_key: Optional[str] = None):
    """WebSocket endpoint for real-time updates"""
    if not validate_api_key(api_key):
        logger.warning(f"Invalid API key attempt: {api_key[:10]}...")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    if connection_type not in active_connections:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    try:
        await websocket.accept()
        active_connections[connection_type].add(websocket)
        logger.info(f"New {connection_type} WebSocket connection established. Total connections: {len(active_connections[connection_type])}")
        
        # Send initial state
        if connection_type == 'security':
            await send_security_state(websocket)
        elif connection_type == 'logs':
            await send_logs_state(websocket)
        elif connection_type == 'network':
            await send_network_state(websocket)
        elif connection_type == 'alerts':
            await send_alerts_state(websocket)
        
        # Keep connection alive and handle messages
        while True:
            try:
                data = await websocket.receive_text()
                # Handle any incoming messages if needed
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"Error in {connection_type} WebSocket connection: {str(e)}")
                break
    finally:
        active_connections[connection_type].remove(websocket)
        logger.info(f"{connection_type} WebSocket connection closed. Remaining connections: {len(active_connections[connection_type])}")

async def send_security_state(websocket: WebSocket):
    """Send initial security state to WebSocket client"""
    try:
        # Get security metrics using async methods
        metrics = await db.get_security_metrics()
        active_scans = await db.get_active_scans_async()
        recent_findings = await db.get_recent_findings_async(limit=10)
        
        await websocket.send_json({
            'type': 'initial_state',
            'payload': {
                'metrics': metrics,
                'active_scans': active_scans,
                'recent_findings': recent_findings,
                'timestamp': datetime.now().isoformat()
            }
        })
    except Exception as e:
        logger.error(f"Error sending security state: {str(e)}")
        try:
            await websocket.send_json({
                'type': 'error',
                'payload': {
                    'message': 'Error retrieving security state',
                    'timestamp': datetime.now().isoformat()
                }
            })
        except:
            pass

async def send_logs_state(websocket: WebSocket):
    """Send initial logs state to WebSocket client"""
    try:
        recent_logs = await db.get_recent_logs(limit=50)
        await websocket.send_json({
            'type': 'initial_state',
            'payload': {
                'logs': recent_logs,
                'timestamp': datetime.now().isoformat()
            }
        })
    except Exception as e:
        logger.error(f"Error sending logs state: {str(e)}")

async def send_network_state(websocket: WebSocket):
    """Send initial network state to WebSocket client"""
    try:
        traffic = await db.get_network_traffic(hours=24)
        devices = await db.get_network_devices()
        protocols = await db.get_network_protocols()
        
        await websocket.send_json({
            'type': 'initial_state',
            'payload': {
                'traffic': traffic,
                'devices': devices,
                'protocols': protocols,
                'timestamp': datetime.now().isoformat()
            }
        })
    except Exception as e:
        logger.error(f"Error sending network state: {str(e)}")

async def send_alerts_state(websocket: WebSocket):
    """Send initial alerts state to WebSocket client"""
    try:
        recent_alerts = await db.get_recent_alerts(limit=50)
        await websocket.send_json({
            'type': 'initial_state',
            'payload': {
                'alerts': recent_alerts,
                'timestamp': datetime.now().isoformat()
            }
        })
    except Exception as e:
        logger.error(f"Error sending alerts state: {str(e)}")

# Broadcast updates to all connected clients
async def broadcast_update(connection_type: str, data: dict):
    """Broadcast update to all connected clients of a specific type"""
    if connection_type not in active_connections:
        return
    
    disconnected = set()
    for websocket in active_connections[connection_type]:
        try:
            await websocket.send_json(data)
        except WebSocketDisconnect:
            disconnected.add(websocket)
        except Exception as e:
            logger.error(f"Error broadcasting to {connection_type} client: {str(e)}")
            disconnected.add(websocket)
    
    # Clean up disconnected clients
    active_connections[connection_type] -= disconnected

async def broadcast_message(websocket_type: str, message: dict):
    """Broadcast message to all connected clients of a specific type."""
    if websocket_type not in active_connections:
        return
    
    disconnected = set()
    for connection in active_connections[websocket_type]:
        try:
            await connection.send_json(message)
        except WebSocketDisconnect:
            disconnected.add(connection)
    
    # Clean up disconnected clients
    active_connections[websocket_type] -= disconnected

async def websocket_auth(websocket: WebSocket, api_key: str = None) -> bool:
    """Authenticate WebSocket connection with proper error handling."""
    if not api_key:
        logger.warning("No API key provided for WebSocket connection")
        return False
    
    try:
        # Clean the API key by removing any comments or whitespace
        clean_api_key = api_key.split('#')[0].strip()
        # Validate API key
        if not validate_api_key(clean_api_key):
            logger.warning(f"Invalid API key attempt: {clean_api_key[:8]}...")
            return False
        return True
    except Exception as e:
        logger.error(f"Error authenticating WebSocket connection: {str(e)}")
        return False

async def handle_websocket_connection(websocket: WebSocket, connection_type: str, api_key: str = None):
    """Common WebSocket connection handler with proper error handling and cleanup."""
    if not await websocket_auth(websocket, api_key):
        await websocket.close(code=4001, reason="Authentication failed")
        return False
    
    try:
        await websocket.accept()
        active_connections[connection_type].add(websocket)
        logger.info(f"New {connection_type} WebSocket connection established. Total connections: {len(active_connections[connection_type])}")
        return True
    except Exception as e:
        logger.error(f"Error establishing WebSocket connection: {str(e)}")
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except:
            pass
        return False

@app.websocket("/ws/network")
async def websocket_network(websocket: WebSocket, api_key: str = Query(None)):
    """WebSocket endpoint for network monitoring."""
    if not await handle_websocket_connection(websocket, 'network', api_key):
        return

    try:
        while True:
            try:
                # Get network state
                metrics = await db.get_network_metrics()
                await websocket.send_json({
                    'type': 'network_state',
                    'data': metrics
                })
                await asyncio.sleep(1)
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"Error in network WebSocket connection: {str(e)}")
                break
    finally:
        active_connections['network'].discard(websocket)
        try:
            await websocket.close()
        except:
            pass

@app.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket, api_key: str = Query(None)):
    """WebSocket endpoint for real-time log streaming."""
    if not await handle_websocket_connection(websocket, 'logs', api_key):
        return

    try:
        # Send initial logs
        recent_logs = await get_recent_logs(limit=50)
        await websocket.send_json({
            "type": "initial_logs",
            "payload": recent_logs
        })
        
        while True:
            try:
                # Process queued messages
                message = await message_queues['logs'].get()
                await websocket.send_json(message)
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"Error in logs WebSocket connection: {str(e)}")
                break
    finally:
        active_connections['logs'].discard(websocket)
        try:
            await websocket.close()
        except:
            pass

@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket, api_key: str = Query(None)):
    """WebSocket endpoint for real-time alert streaming."""
    if not await handle_websocket_connection(websocket, 'alerts', api_key):
        return

    try:
        # Send initial alerts
        recent_alerts = await get_recent_alerts(limit=50)
        await websocket.send_json({
            "type": "initial_alerts",
            "payload": recent_alerts
        })
        
        while True:
            try:
                # Process queued messages
                message = await message_queues['alerts'].get()
                await websocket.send_json(message)
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"Error in alerts WebSocket connection: {str(e)}")
                break
    finally:
        active_connections['alerts'].discard(websocket)
        try:
            await websocket.close()
        except:
            pass

@app.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket, api_key: str = Query(None)):
    """WebSocket endpoint for real-time notifications."""
    try:
        # Get API key from query parameters
        if not api_key:
            logger.warning("WebSocket connection attempt without API key")
            await websocket.close(code=4003, reason="API key required")
            return

        # Clean the API key by removing any comments or whitespace
        clean_api_key = api_key.split('#')[0].strip()

        # Verify API key
        if not await websocket_auth(websocket, clean_api_key):
            return
        
        await websocket.accept()
        active_connections['notifications'].add(websocket)
        logger.info(f"New notifications WebSocket connection. Total connections: {len(active_connections['notifications'])}")
        
        try:
            while True:
                # Keep connection alive and wait for messages
                data = await websocket.receive_text()
                # Process any incoming messages if needed
        except WebSocketDisconnect:
            active_connections['notifications'].remove(websocket)
            logger.info(f"Notifications WebSocket disconnected. Total connections: {len(active_connections['notifications'])}")
        except Exception as e:
            logger.error(f"Notifications WebSocket error: {str(e)}")
            if websocket in active_connections['notifications']:
                active_connections['notifications'].remove(websocket)
    except Exception as e:
        logger.error(f"Error in notifications WebSocket connection: {str(e)}")
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except:
            pass

@app.websocket("/ws/security")
async def websocket_security(websocket: WebSocket, api_key: str = Query(None)):
    """WebSocket endpoint for real-time security updates."""
    try:
        # Clean and validate API key
        if not api_key:
            logger.warning("WebSocket connection attempt without API key")
            await websocket.close(code=4003, reason="API key required")
            return

        clean_api_key = api_key.split('#')[0].strip()
        if not clean_api_key:
            logger.warning("Empty API key after cleaning")
            await websocket.close(code=4003, reason="Invalid API key format")
            return

        # Verify API key
        if not await websocket_auth(websocket, clean_api_key):
            return
        
        await websocket.accept()
        active_connections['security'].add(websocket)
        logger.info(f"New security WebSocket connection. Total connections: {len(active_connections['security'])}")
        
        # Send initial state
        await send_security_state(websocket)
        
        try:
            while True:
                # Process queued messages
                message = await message_queues['security'].get()
                await websocket.send_json(message)
        except WebSocketDisconnect:
            logger.info("Security WebSocket disconnected")
        except Exception as e:
            logger.error(f"Error in security WebSocket connection: {str(e)}")
        finally:
            active_connections['security'].discard(websocket)
            logger.info(f"Security WebSocket connection closed. Remaining connections: {len(active_connections['security'])}")
    except Exception as e:
        logger.error(f"Error in security WebSocket connection: {str(e)}")
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except:
            pass

async def update_security_state():
    """Background task to update security state and broadcast to WebSocket clients."""
    while True:
        try:
            security_state = await get_security_state()
            await message_queues['security'].put({
                "type": "security_update",
                "payload": security_state
            })
            await asyncio.sleep(1)  # Update every second
        except Exception as e:
            logger.error(f"Error updating security state: {str(e)}")
            await asyncio.sleep(5)  # Back off on error

async def get_security_state():
    """Get current security state including active scans, findings, and security metrics."""
    try:
        now = datetime.now().isoformat()
        
        # Get active scans
        active_scans = await db.get_active_scans_async()
        
        # Get recent findings
        recent_findings = await db.get_recent_findings_async(limit=50)
        
        # Get security metrics
        security_metrics = await db.get_security_metrics()
        
        # Get scan statistics
        scan_stats = await db.get_scan_statistics_async()
        
        return {
            "timestamp": now,
            "active_scans": active_scans,
            "recent_findings": recent_findings,
            "metrics": security_metrics,
            "scan_stats": scan_stats
        }
    except Exception as e:
        logger.error(f"Error getting security state: {str(e)}")
        return {
            "timestamp": now,
            "active_scans": [],
            "recent_findings": [],
            "metrics": {},
            "scan_stats": {}
        }

# Background tasks for updating WebSocket clients
async def update_network_state():
    """Background task to update network state and broadcast to WebSocket clients."""
    while True:
        try:
            network_state = await get_network_state()
            await message_queues['network'].put({
                "type": "network_update",
                "payload": network_state
            })
            await asyncio.sleep(1)  # Update every second
        except Exception as e:
            logger.error(f"Error updating network state: {str(e)}")
            await asyncio.sleep(5)  # Back off on error

async def process_log_stream():
    """Background task to process log stream and broadcast to WebSocket clients."""
    while True:
        try:
            async for log_entry in get_log_stream():
                await message_queues['logs'].put({
                    "type": "new_log",
                    "payload": log_entry
                })
        except Exception as e:
            logger.error(f"Error processing log stream: {str(e)}")
            await asyncio.sleep(5)

async def process_alert_stream():
    """Background task to process alert stream and broadcast to WebSocket clients."""
    while True:
        try:
            async for alert in get_alert_stream():
                await message_queues['alerts'].put({
                    "type": "new_alert",
                    "payload": alert
                })
        except Exception as e:
            logger.error(f"Error processing alert stream: {str(e)}")
            await asyncio.sleep(5)
            async for alert in get_alert_stream():  # Retry
                yield alert

# Add these global variables near other global state
app_shutdown_event = asyncio.Event()
background_tasks = set()

@app.on_event("startup")
async def startup_event():
    """Initialize application on startup."""
    try:
        # Create a new event loop if needed
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        # Initialize database schema
        await db.init_db()
        logger.info("Database schema initialized successfully")

        # Check for stale monitoring status
        settings = await db.get_settings_async()
        if settings.get('monitoring_status') == 'running':
            logger.warning("Stale monitoring_status 'running' detected on startup. Resetting to 'stopped'.")
            await db.update_settings_async({
                'monitoring_status': 'stopped',
                'last_stop': datetime.utcnow().isoformat()
            })
        
        logger.info("Application startup complete")
    except Exception as e:
        logger.error(f"Error during startup: {str(e)}")
        raise

@app.on_event("shutdown")
async def shutdown_event_handler():
    """Cleanup on application shutdown."""
    try:
        logger.info("Shutting down application...")
        
        # Cancel monitoring task
        global monitoring_task
        if monitoring_task is not None:
            monitoring_task.cancel()
            try:
                await monitoring_task
            except asyncio.CancelledError:
                logger.info("Network monitoring task cancelled")
        
        # Close database connection
        await db.close()
        logger.info("Database connection closed")
        
        # Close all WebSocket connections
        for connection_type in active_connections:
            for websocket in active_connections[connection_type]:
                try:
                    await websocket.close()
                except Exception as e:
                    logger.error(f"Error closing WebSocket connection: {str(e)}")
        
        logger.info("Application shutdown complete")
    except Exception as e:
        logger.error(f"Error during shutdown: {str(e)}")
        raise

def signal_handler(sig, frame):
    """Handle shutdown signals."""
    logger.info("Received shutdown signal")
    if not app_shutdown_event.is_set():
        app_shutdown_event.set()
        # Give tasks a chance to clean up
        loop = asyncio.get_event_loop()
        loop.call_later(2, lambda: sys.exit(0))

# Register signal handlers
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# Update the network monitoring task to respect shutdown
async def network_monitoring_task():
    """Background task for network monitoring."""
    logger.info("Starting network monitoring task")
    try:
        while not app_shutdown_event.is_set() and network_monitoring_state["running"]:
            try:
                await monitor_network()
                await asyncio.sleep(1)  # Check every second
            except asyncio.CancelledError:
                logger.info("Network monitoring task cancelled")
                break
            except Exception as e:
                logger.error(f"Error in network monitoring task: {str(e)}")
                await asyncio.sleep(5)  # Wait before retrying
    finally:
        logger.info("Network monitoring task stopped")
        network_monitoring_state["running"] = False

# API key verification decorator
def require_api_key(func):
    async def wrapper(*args, **kwargs):
        request = kwargs.get('request')
        if not request:
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
        
        if not request:
            raise HTTPException(status_code=500, detail="Request object not found")
        
        api_key = request.headers.get('X-API-Key')
        if not api_key or api_key != API_KEY:
            raise HTTPException(status_code=401, detail="Invalid API key")
        
        return await func(*args, **kwargs)
    return wrapper

# API key verification
async def verify_api_key(x_api_key: str = Header(None, alias="X-API-Key")):
    """Verify API key from header."""
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API key is missing")
    if not validate_api_key(x_api_key):
        logger.warning(f"Invalid API key attempt: {x_api_key[:8]}...")
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key

# Routes
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Render the home page."""
    return templates.TemplateResponse(
        "home.html",
        {
            "request": request,
            "api_key": db.get_settings()['api_key']
        }
    )

@app.get("/logs", response_class=HTMLResponse)
async def logs_page(request: Request):
    """Render the logs page."""
    settings = db.get_page_settings('logs')
    return templates.TemplateResponse(
        "logs.html",
        {
            "request": request,
            "api_key": db.get_settings()['api_key'],
            "settings": settings
        }
    )

@app.get("/anomalies", response_class=HTMLResponse)
async def anomalies_page(request: Request):
    """Render the anomalies page."""
    settings = db.get_page_settings('anomalies')
    return templates.TemplateResponse(
        "anomalies.html",
        {
            "request": request,
            "api_key": db.get_settings()['api_key'],
            "settings": settings
        }
    )

@app.get("/network", response_class=HTMLResponse)
async def network_page(request: Request):
    """Render the network page."""
    settings = db.get_page_settings('network')
    return templates.TemplateResponse(
        "network.html",
        {
            "request": request,
            "api_key": db.get_settings()['api_key'],
            "settings": settings
        }
    )

@app.get("/security", response_class=HTMLResponse)
async def security_page(request: Request):
    """Render the security page."""
    settings = db.get_page_settings('security')
    return templates.TemplateResponse(
        "security.html",
        {
            "request": request,
            "api_key": db.get_settings()['api_key'],
            "settings": settings
        }
    )

@app.get("/settings", response_class=HTMLResponse)
async def settings_page(request: Request):
    """Render the settings page."""
    settings = db.get_settings()
    return templates.TemplateResponse(
        "settings.html",
        {
            "request": request,
            "api_key": db.get_settings()['api_key'],
            "settings": settings
        }
    )

# API endpoints
@app.get("/api/logs")
async def get_logs(
    source_id: Optional[str] = None,
    level: Optional[str] = None,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    limit: int = 1000,
    api_key: str = Depends(verify_api_key)
):
    """Get logs with optional filtering."""
    try:
        logs = db.get_logs(source_id, level, start_time, end_time, limit)
        return {"logs": logs}
    except Exception as e:
        logger.error(f"Error getting logs: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving logs")

@app.get("/api/logs/stats")
async def get_log_stats(api_key: str = Depends(verify_api_key)):
    """Get comprehensive log statistics."""
    try:
        # Get basic stats
        total_logs = db.get_log_count(start_time=(datetime.now() - timedelta(days=1)).isoformat())
        total_logs_prev = db.get_log_count(
            start_time=(datetime.now() - timedelta(days=2)).isoformat(),
            end_time=(datetime.now() - timedelta(days=1)).isoformat()
        )
        
        # Calculate trends
        total_logs_trend = ((total_logs - total_logs_prev) / total_logs_prev * 100) if total_logs_prev > 0 else 0
        
        # Get active sources
        sources = db.get_log_sources()
        active_sources = len([s for s in sources if s['status'] == 'active'])
        active_sources_prev = len([s for s in sources if s['status'] == 'active' and 
                                 datetime.fromisoformat(s['last_update']) < datetime.now() - timedelta(days=1)])
        active_sources_trend = ((active_sources - active_sources_prev) / active_sources_prev * 100) if active_sources_prev > 0 else 0
        
        # Get current log rate
        current_rate = db.get_current_log_rate()
        
        # Get error rate
        error_count = db.get_log_count(
            start_time=(datetime.now() - timedelta(days=1)).isoformat(),
            level='error'
        )
        error_rate = (error_count / total_logs * 100) if total_logs > 0 else 0
        error_count_prev = db.get_log_count(
            start_time=(datetime.now() - timedelta(days=2)).isoformat(),
            end_time=(datetime.now() - timedelta(days=1)).isoformat(),
            level='error'
        )
        error_rate_trend = ((error_rate - (error_count_prev / total_logs_prev * 100 if total_logs_prev > 0 else 0)) / 
                           (error_count_prev / total_logs_prev * 100 if total_logs_prev > 0 else 1) * 100)
        
        return {
            "total_logs": total_logs,
            "total_logs_trend": total_logs_trend,
            "active_sources": active_sources,
            "active_sources_trend": active_sources_trend,
            "current_rate": current_rate,
            "error_rate": error_rate,
            "error_rate_trend": error_rate_trend,
            "sources": sources
        }
    except Exception as e:
        logger.error(f"Error getting log stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving log statistics")

@app.get("/api/logs/rate")
async def get_log_rate(
    range: str = "24h",
    api_key: str = Depends(verify_api_key)
):
    """Get log rate data for the specified time range."""
    try:
        now = datetime.now()
        if range == "1h":
            start_time = now - timedelta(hours=1)
            interval = "1m"
            points = 60
        elif range == "7d":
            start_time = now - timedelta(days=7)
            interval = "1h"
            points = 168
        else:  # 24h
            start_time = now - timedelta(hours=24)
            interval = "5m"
            points = 288
            
        rate_data = db.get_log_rate_data(start_time, interval, points)
        
        # Format labels based on range
        if range == "1h":
            labels = [(start_time + timedelta(minutes=i)).strftime("%H:%M") for i in range(points)]
        elif range == "7d":
            labels = [(start_time + timedelta(hours=i)).strftime("%m/%d %H:00") for i in range(points)]
        else:
            labels = [(start_time + timedelta(minutes=i*5)).strftime("%H:%M") for i in range(points)]
            
        return {
            "labels": labels,
            "values": rate_data
        }
    except Exception as e:
        logger.error(f"Error getting log rate data: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving log rate data")

@app.get("/api/logs/sources")
async def get_log_sources(api_key: str = Depends(verify_api_key)):
    """Get all log sources."""
    try:
        sources = db.get_log_sources()
        return {"sources": sources}
    except Exception as e:
        logger.error(f"Error getting log sources: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving log sources")

@app.post("/api/logs/sources")
async def create_log_source(source: Dict[str, Any], api_key: str = Depends(verify_api_key)):
    """Create a new log source."""
    try:
        source_id = db.create_log_source(source)
        return {"id": source_id}
    except Exception as e:
        logger.error(f"Error creating log source: {str(e)}")
        raise HTTPException(status_code=500, detail="Error creating log source")

@app.put("/api/logs/sources/{source_id}")
async def update_log_source(
    source_id: str,
    source: Dict[str, Any],
    api_key: str = Depends(verify_api_key)
):
    """Update a log source."""
    try:
        if db.update_log_source(source_id, source):
            return {"status": "success"}
        raise HTTPException(status_code=404, detail="Log source not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating log source: {str(e)}")
        raise HTTPException(status_code=500, detail="Error updating log source")

@app.delete("/api/logs/sources/{source_id}")
async def delete_log_source(source_id: str, api_key: str = Depends(verify_api_key)):
    """Delete a log source."""
    try:
        if db.delete_log_source(source_id):
            return {"status": "success"}
        raise HTTPException(status_code=404, detail="Log source not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting log source: {str(e)}")
        raise HTTPException(status_code=500, detail="Error deleting log source")

@app.post("/api/logs/sources/{source_id}/toggle")
async def toggle_log_source(source_id: str, api_key: str = Depends(verify_api_key)):
    """Toggle a log source's status."""
    try:
        if db.toggle_log_source(source_id):
            return {"status": "success"}
        raise HTTPException(status_code=404, detail="Log source not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling log source: {str(e)}")
        raise HTTPException(status_code=500, detail="Error toggling log source")

@app.get("/api/anomalies")
async def get_anomalies(api_key: str = Depends(verify_api_key)):
    """Get all anomalies."""
    try:
        anomalies = db.get_anomalies()
        return {"anomalies": anomalies}
    except Exception as e:
        logger.error(f"Error getting anomalies: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving anomalies")

@app.get("/api/anomalies/{anomaly_id}")
async def get_anomaly(anomaly_id: str, api_key: str = Depends(verify_api_key)):
    """Get a specific anomaly."""
    try:
        anomaly = db.get_anomaly(anomaly_id)
        if not anomaly:
            raise HTTPException(status_code=404, detail="Anomaly not found")
        return anomaly
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting anomaly: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving anomaly")

@app.post("/api/anomalies/{anomaly_id}/resolve")
async def resolve_anomaly(anomaly_id: str, api_key: str = Depends(verify_api_key)):
    """Resolve an anomaly."""
    try:
        if db.resolve_anomaly(anomaly_id):
            return {"status": "success"}
        raise HTTPException(status_code=404, detail="Anomaly not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resolving anomaly: {str(e)}")
        raise HTTPException(status_code=500, detail="Error resolving anomaly")

@app.get("/api/network/overview")
async def get_network_overview(api_key: str = Depends(verify_api_key)):
    """Get network overview statistics."""
    try:
        db = Database()
        overview = db.get_network_overview()
        
        # Get monitoring status
        with db.get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM network_monitoring WHERE id = 1")
            status = cursor.fetchone()
            if status:
                overview['monitoring'] = {
                    'status': status[1],
                    'last_scan': status[2],
                    'devices_discovered': status[3],
                    'connections_tracked': status[4],
                    'traffic_analyzed': status[5],
                    'last_updated': status[6]
                }
        
        return overview
    except Exception as e:
        logger.error(f"Error getting network overview: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stats/overview")
async def get_stats_overview(api_key: str = Depends(verify_api_key)):
    """Get overview statistics for the dashboard."""
    try:
        # Get total alerts (last 24 hours)
        total_alerts = db.get_log_stats(start_time=(datetime.now() - timedelta(days=1)).isoformat())
        alerts_trend = db.get_log_trend(days=7)  # Compare with last week
        
        # Get active threats
        active_threats = db.get_active_threats()
        threats_trend = db.get_threats_trend(days=7)
        
        # Get network health
        network_health = db.get_network_health()
        # Convert days to hours for health trend
        health_trend = await db.get_health_trend(metric_name='network_health', hours=24*7)  # Last 7 days
        
        # Get protected assets
        protected_assets = db.get_protected_assets()
        assets_status = db.get_assets_status()
        
        return {
            "total_alerts": total_alerts.get("total", 0),
            "alerts_trend": alerts_trend,
            "active_threats": len(active_threats),
            "threats_trend": threats_trend,
            "network_health": network_health,
            "health_trend": health_trend[-1]['value'] if health_trend else 0,  # Get the latest value
            "protected_assets": protected_assets,
            "assets_status": assets_status
        }
    except Exception as e:
        logger.error(f"Error getting stats overview: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving statistics")

@app.get("/api/network/traffic")
async def get_network_traffic(
    range: str = "24h",
    api_key: str = Depends(verify_api_key)
):
    """Get network traffic data for the specified time range."""
    try:
        db = Database()
        now = datetime.utcnow()
        
        # Calculate start time based on range
        if range == "1h":
            start_time = now - timedelta(hours=1)
            interval = "1m"
            points = 60
        elif range == "24h":
            start_time = now - timedelta(hours=24)
            interval = "5m"
            points = 288
        else:  # 7d
            start_time = now - timedelta(days=7)
            interval = "1h"
            points = 168
        
        traffic_data = db.get_network_traffic(start_time, interval, points)
        
        # Format data for chart
        labels = []
        inbound = []
        outbound = []
        
        for i, value in enumerate(traffic_data):
            if interval == "1m":
                timestamp = start_time + timedelta(minutes=i)
            elif interval == "5m":
                timestamp = start_time + timedelta(minutes=i*5)
            else:  # 1h
                timestamp = start_time + timedelta(hours=i)
            
            labels.append(timestamp.strftime("%H:%M"))
            inbound.append(value.get('inbound', 0))
            outbound.append(value.get('outbound', 0))
        
        return {
            "labels": labels,
            "inbound": inbound,
            "outbound": outbound
        }
    except Exception as e:
        logger.error(f"Error getting network traffic: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/network/protocols")
async def get_network_protocols(api_key: str = Depends(verify_api_key)):
    """Get network protocol distribution."""
    try:
        db = Database()
        with db.get_db() as conn:
            cursor = conn.cursor()
            
            # Get protocol distribution from traffic data
            cursor.execute("""
                SELECT protocol, COUNT(*) as count
                FROM network_traffic
                WHERE timestamp >= datetime('now', '-24 hours')
                GROUP BY protocol
            """)
            
            protocols = {
                'http_https': 0,
                'dns': 0,
                'ssh': 0,
                'smtp': 0,
                'other': 0
            }
            
            for protocol, count in cursor.fetchall():
                if protocol in ['http', 'https']:
                    protocols['http_https'] += count
                elif protocol == 'dns':
                    protocols['dns'] = count
                elif protocol == 'ssh':
                    protocols['ssh'] = count
                elif protocol == 'smtp':
                    protocols['smtp'] = count
                else:
                    protocols['other'] += count
            
            return protocols
    except Exception as e:
        logger.error(f"Error getting network protocols: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/network/devices")
async def get_network_devices(
    status: Optional[str] = None,
    api_key: str = Depends(verify_api_key)
):
    """Get network devices with optional status filter."""
    try:
        db = Database()
        devices = db.get_network_devices(status)
        return devices
    except Exception as e:
        logger.error(f"Error getting network devices: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/network/connections")
async def get_network_connections(
    status: Optional[str] = None,
    limit: int = 100,
    api_key: str = Depends(verify_api_key)
):
    """Get network connections with optional status filter."""
    try:
        db = Database()
        connections = db.get_network_connections(status, limit)
        return connections
    except Exception as e:
        logger.error(f"Error getting network connections: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/network/connections/{connection_id}")
async def get_network_connection(connection_id: str, api_key: str = Depends(verify_api_key)):
    """Get a specific network connection."""
    try:
        connection = db.get_network_connection(connection_id)
        if not connection:
            raise HTTPException(status_code=404, detail="Connection not found")
        return connection
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting network connection: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving network connection")

@app.post("/api/network/connections/{connection_id}/block")
async def block_network_connection(connection_id: str, api_key: str = Depends(verify_api_key)):
    """Block a network connection."""
    try:
        if db.block_network_connection(connection_id):
            return {"status": "success"}
        raise HTTPException(status_code=404, detail="Connection not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error blocking network connection: {str(e)}")
        raise HTTPException(status_code=500, detail="Error blocking network connection")

@app.get("/api/settings")
async def get_settings(api_key: str = Depends(verify_api_key)):
    """Get current settings."""
    try:
        settings = db.get_settings()
        return settings
    except Exception as e:
        logger.error(f"Error getting settings: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving settings")

@app.put("/api/settings")
async def update_settings(settings: Dict[str, Any], api_key: str = Depends(verify_api_key)):
    """Update settings."""
    try:
        if db.update_settings(settings):
            return {"status": "success"}
        raise HTTPException(status_code=500, detail="Error updating settings")
    except Exception as e:
        logger.error(f"Error updating settings: {str(e)}")
        raise HTTPException(status_code=500, detail="Error updating settings")

@app.post("/api/settings/api-key")
async def regenerate_api_key(api_key: str = Depends(verify_api_key)):
    """Regenerate the API key."""
    try:
        # Generate new API key
        new_key = secrets.token_urlsafe(32)
        
        # Update environment variable
        os.environ['SECURENET_API_KEY'] = new_key
        global API_KEY
        API_KEY = new_key
        
        # Update database
        if db.update_settings({'api_key': new_key}):
            return {"api_key": new_key}
        raise HTTPException(status_code=500, detail="Error regenerating API key")
    except Exception as e:
        logger.error(f"Error regenerating API key: {str(e)}")
        raise HTTPException(status_code=500, detail="Error regenerating API key")

@app.get("/api/security/score")
async def get_security_score(api_key: str = Depends(verify_api_key)):
    """Get current security score and status."""
    try:
        score_data = db.get_security_score()
        return {
            "overall": score_data["score"],
            "status": score_data["status"],
            "vulnerabilities": score_data["vulnerability_level"],
            "patch_status": score_data["patch_status"]
        }
    except Exception as e:
        logger.error(f"Error getting security score: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving security score")

@app.get("/api/security/scans")
async def get_scans(
    status: Optional[str] = None,
    limit: int = 100,
    api_key: str = Depends(verify_api_key)
):
    """Get all security scans with optional status filter."""
    try:
        if status == "active":
            scans = db.get_active_scans()
        else:
            scans = db.get_recent_scans(limit)
        return {"scans": scans}
    except Exception as e:
        logger.error(f"Error getting scans: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving scans")

@app.get("/api/security/scan/{scan_id}")
async def get_scan(
    scan_id: str,
    api_key: str = Depends(verify_api_key)
):
    """Get details of a specific scan."""
    try:
        scan = db.get_scan(scan_id)
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")
        
        findings = []
        if scan["status"] in ["completed", "failed"]:
            findings = db.get_scan_findings(scan_id)
        
        return {
            "scan": scan,
            "findings": findings
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting scan details: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving scan details")

@app.post("/api/security/scan")
async def start_security_scan(
    scan_config: dict = Body(..., example={
        "type": "full",
        "target": "all",
        "deep_scan": False,
        "include_remediation": True,
        "notify_on_complete": True,
        "modules": ["vulnerabilities", "configuration", "compliance"]
    }),
    api_key: str = Depends(verify_api_key)
):
    """Start a new security scan with the given configuration."""
    try:
        # Validate scan configuration
        if not isinstance(scan_config, dict):
            raise HTTPException(status_code=422, detail="Invalid scan configuration format")
        
        required_fields = ["type", "target"]
        for field in required_fields:
            if field not in scan_config:
                raise HTTPException(status_code=422, detail=f"Missing required field: {field}")
        
        # Generate scan ID and create initial scan record
        scan_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        scan_data = {
            "id": scan_id,
            "timestamp": timestamp,
            "type": scan_config.get("type", "full"),
            "status": "running",
            "target": scan_config.get("target", "all"),
            "progress": 0,
            "findings_count": 0,
            "start_time": timestamp,
            "metadata": json.dumps({
                "scan_type": scan_config.get("type", "full"),
                "modules": scan_config.get("modules", ["vulnerabilities", "configuration", "compliance"]),
                "options": {
                    "deep_scan": scan_config.get("deep_scan", False),
                    "include_remediation": scan_config.get("include_remediation", False),
                    "notify_on_complete": scan_config.get("notify_on_complete", True)
                }
            })
        }
        
        # Insert scan record
        with db.get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO scans (
                    id, timestamp, type, status, target,
                    progress, findings_count, start_time, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                scan_data["id"],
                scan_data["timestamp"],
                scan_data["type"],
                scan_data["status"],
                scan_data["target"],
                scan_data["progress"],
                scan_data["findings_count"],
                scan_data["start_time"],
                scan_data["metadata"]
            ))
            conn.commit()
        
        # Start background scan task
        asyncio.create_task(run_security_scan(scan_id))
        
        # Notify connected clients
        await broadcast_message('security', {
            "type": "scan_started",
            "scan_id": scan_id,
            "config": scan_config
        })
        
        return {
            "scan_id": scan_id,
            "message": "Security scan started successfully",
            "status": "running"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting security scan: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/reports/generate")
async def generate_report(
    report_config: dict,
    api_key: str = Depends(verify_api_key)
):
    """Generate a security report based on the given configuration."""
    try:
        report_id = str(uuid.uuid4())
        report_data = {
            "id": report_id,
            "type": report_config.get("type", "security"),
            "format": report_config.get("format", "pdf"),
            "time_range": report_config.get("time_range", "last_24h"),
            "status": "generating",
            "created_at": datetime.now().isoformat()
        }
        
        # Generate report
        report = db.generate_report(report_config)
        report_data["status"] = "completed"
        report_data["url"] = f"/api/reports/{report_id}/download"
        
        return {
            "report_id": report_id,
            "message": "Report generation started",
            "status": "generating",
            "download_url": report_data["url"]
        }
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generating report")

@app.get("/api/reports/{report_id}")
async def get_report(
    report_id: str,
    api_key: str = Depends(verify_api_key)
):
    """Get the status and details of a generated report."""
    try:
        report = db.get_report(report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        return report
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving report: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving report")

@app.post("/api/maintenance/schedule")
async def schedule_maintenance(
    maintenance_config: dict = Body(..., example={
        "start_time": "2024-05-26T00:00:00Z",
        "end_time": "2024-05-26T02:00:00Z",
        "type": "routine",
        "description": "Scheduled maintenance window"
    }),
    api_key: str = Depends(verify_api_key)
):
    """Schedule a maintenance window."""
    try:
        # Validate maintenance configuration
        if not isinstance(maintenance_config, dict):
            raise HTTPException(status_code=422, detail="Invalid maintenance configuration format")
        
        required_fields = ["start_time", "end_time"]
        for field in required_fields:
            if field not in maintenance_config:
                raise HTTPException(status_code=422, detail=f"Missing required field: {field}")
        
        # Validate maintenance window
        try:
            start_time = datetime.fromisoformat(maintenance_config["start_time"].replace('Z', '+00:00'))
            end_time = datetime.fromisoformat(maintenance_config["end_time"].replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid datetime format")
        
        if start_time >= end_time:
            raise HTTPException(status_code=400, detail="End time must be after start time")
        
        if start_time < datetime.now():
            raise HTTPException(status_code=400, detail="Start time must be in the future")
        
        # Schedule maintenance
        maintenance_id = db.schedule_maintenance({
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "type": maintenance_config.get("type", "routine"),
            "description": maintenance_config.get("description", "Scheduled maintenance")
        })
        
        # Notify connected clients
        await broadcast_message('notifications', {
            "type": "maintenance_scheduled",
            "maintenance_id": maintenance_id,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat()
        })
        
        return {
            "maintenance_id": maintenance_id,
            "message": "Maintenance window scheduled successfully",
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error scheduling maintenance: {str(e)}")
        raise HTTPException(status_code=500, detail="Error scheduling maintenance")

@app.get("/api/maintenance/schedule")
async def get_maintenance_schedule(
    api_key: str = Depends(verify_api_key)
):
    """Get all scheduled maintenance windows."""
    try:
        schedules = db.get_maintenance_schedules()
        return {"schedules": schedules}
    except Exception as e:
        logger.error(f"Error retrieving maintenance schedules: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving maintenance schedules")

@app.delete("/api/maintenance/schedule/{maintenance_id}")
async def cancel_maintenance(
    maintenance_id: str,
    api_key: str = Depends(verify_api_key)
):
    """Cancel a scheduled maintenance window."""
    try:
        if db.cancel_maintenance(maintenance_id):
            # Notify connected clients
            await broadcast_message('notifications', json.dumps({
                "type": "maintenance_cancelled",
                "maintenance_id": maintenance_id
            }))
            return {"message": "Maintenance window cancelled successfully"}
        raise HTTPException(status_code=404, detail="Maintenance window not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling maintenance: {str(e)}")
        raise HTTPException(status_code=500, detail="Error cancelling maintenance")

@app.get("/api/get-api-key")
async def get_api_key_endpoint():
    """Get API key for WebSocket connection"""
    # Get API key from environment
    api_key = get_api_key()
    
    # Return API key in response
    return {"api_key": api_key}

@app.get("/api/settings/{section}")
async def get_section_settings(section: str, api_key: str = Depends(verify_api_key)):
    """Get settings for a specific section."""
    try:
        settings = db.get_page_settings(section)
        return settings
    except Exception as e:
        logger.error(f"Error getting {section} settings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving {section} settings")

@app.get("/api/network-monitoring/status")
async def get_network_monitoring_status(api_key: str = Depends(verify_api_key)):
    """Get current network monitoring status."""
    try:
        status = db.get_network_monitoring_status()
        return status
    except Exception as e:
        logger.error(f"Error getting network monitoring status: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving network monitoring status")

@app.post("/api/network-monitoring/start")
async def start_network_monitoring(api_key: str = Depends(verify_api_key)):
    """Start network monitoring."""
    try:
        if db.start_network_monitoring():
            # Notify connected clients
            await broadcast_message('network', {
                'type': 'monitoring_started',
                'timestamp': datetime.now().isoformat()
            })
            return {"status": "success", "message": "Network monitoring started"}
        raise HTTPException(status_code=500, detail="Failed to start network monitoring")
    except Exception as e:
        logger.error(f"Error starting network monitoring: {str(e)}")
        raise HTTPException(status_code=500, detail="Error starting network monitoring")

@app.post("/api/network-monitoring/stop")
async def stop_network_monitoring(api_key: str = Depends(verify_api_key)):
    """Stop network monitoring."""
    try:
        if db.stop_network_monitoring():
            # Notify connected clients
            await broadcast_message('network', {
                'type': 'monitoring_stopped',
                'timestamp': datetime.now().isoformat()
            })
            return {"status": "success", "message": "Network monitoring stopped"}
        raise HTTPException(status_code=500, detail="Failed to stop network monitoring")
    except Exception as e:
        logger.error(f"Error stopping network monitoring: {str(e)}")
        raise HTTPException(status_code=500, detail="Error stopping network monitoring")