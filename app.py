from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, HTTPException, Depends, Header, Query, status
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

# Load environment variables from .env file
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="SecureNet",
    description="A comprehensive network security monitoring and management system"
)

# Initialize database
db = Database()

# Get API key from environment
API_KEY = os.getenv('API_KEY')
if not API_KEY:
    raise ValueError("API_KEY environment variable is not set")

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Add handler if none exists
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

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
active_connections = {
    'notifications': set(),
    'network': set(),
    'logs': set(),
    'alerts': set()
}

# WebSocket message queues
message_queues = {
    'network': asyncio.Queue(),
    'logs': asyncio.Queue(),
    'alerts': asyncio.Queue()
}

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

async def websocket_auth(websocket: WebSocket) -> bool:
    """Authenticate WebSocket connection using API key."""
    try:
        api_key = websocket.query_params.get('api_key')
        if not api_key or api_key != API_KEY:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return False
        return True
    except Exception as e:
        logger.error(f"WebSocket authentication error: {str(e)}")
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except:
            pass
        return False

@app.websocket("/ws/network")
async def websocket_network(websocket: WebSocket):
    """WebSocket endpoint for real-time network updates."""
    if not await websocket_auth(websocket):
        return
    
    await websocket.accept()
    active_connections['network'].add(websocket)
    logger.info(f"New network WebSocket connection. Total connections: {len(active_connections['network'])}")
    
    try:
        while True:
            # Send initial network state
            network_state = await get_network_state()
            await websocket.send_json({
                "type": "initial_state",
                "payload": network_state
            })
            
            # Process queued messages
            while True:
                message = await message_queues['network'].get()
                await websocket.send_json(message)
    except WebSocketDisconnect:
        active_connections['network'].remove(websocket)
        logger.info(f"Network WebSocket disconnected. Total connections: {len(active_connections['network'])}")
    except Exception as e:
        logger.error(f"Network WebSocket error: {str(e)}")
        if websocket in active_connections['network']:
            active_connections['network'].remove(websocket)

@app.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    """WebSocket endpoint for real-time log streaming."""
    if not await websocket_auth(websocket):
        return
    
    await websocket.accept()
    active_connections['logs'].add(websocket)
    logger.info(f"New logs WebSocket connection. Total connections: {len(active_connections['logs'])}")
    
    try:
        while True:
            # Send recent logs
            recent_logs = await get_recent_logs(limit=50)
            await websocket.send_json({
                "type": "initial_logs",
                "payload": recent_logs
            })
            
            # Process queued messages
            while True:
                message = await message_queues['logs'].get()
                await websocket.send_json(message)
    except WebSocketDisconnect:
        active_connections['logs'].remove(websocket)
        logger.info(f"Logs WebSocket disconnected. Total connections: {len(active_connections['logs'])}")
    except Exception as e:
        logger.error(f"Logs WebSocket error: {str(e)}")
        if websocket in active_connections['logs']:
            active_connections['logs'].remove(websocket)

@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    """WebSocket endpoint for real-time alert streaming."""
    if not await websocket_auth(websocket):
        return
    
    await websocket.accept()
    active_connections['alerts'].add(websocket)
    logger.info(f"New alerts WebSocket connection. Total connections: {len(active_connections['alerts'])}")
    
    try:
        while True:
            # Send recent alerts
            recent_alerts = await get_recent_alerts(limit=50)
            await websocket.send_json({
                "type": "initial_alerts",
                "payload": recent_alerts
            })
            
            # Process queued messages
            while True:
                message = await message_queues['alerts'].get()
                await websocket.send_json(message)
    except WebSocketDisconnect:
        active_connections['alerts'].remove(websocket)
        logger.info(f"Alerts WebSocket disconnected. Total connections: {len(active_connections['alerts'])}")
    except Exception as e:
        logger.error(f"Alerts WebSocket error: {str(e)}")
        if websocket in active_connections['alerts']:
            active_connections['alerts'].remove(websocket)

@app.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket):
    """WebSocket endpoint for real-time notifications."""
    if not await websocket_auth(websocket):
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

@app.on_event("startup")
async def startup_event():
    """Start background tasks on application startup."""
    asyncio.create_task(update_network_state())
    asyncio.create_task(process_log_stream())
    asyncio.create_task(process_alert_stream())

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
    settings = db.get_settings()
    if x_api_key != settings['api_key']:
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
    sources = db.get_log_sources()
    return templates.TemplateResponse(
        "logs.html",
        {
            "request": request,
            "api_key": db.get_settings()['api_key'],
            "sources": sources
        }
    )

@app.get("/anomalies", response_class=HTMLResponse)
async def anomalies_page(request: Request):
    """Render the anomalies page."""
    return templates.TemplateResponse(
        "anomalies.html",
        {"request": request, "api_key": db.get_settings()['api_key']}
    )

@app.get("/network", response_class=HTMLResponse)
async def network_page(request: Request):
    """Render the network page."""
    return templates.TemplateResponse(
        "network.html",
        {
            "request": request,
            "api_key": db.get_settings()['api_key']
        }
    )

@app.get("/security", response_class=HTMLResponse)
async def security_page(request: Request):
    """Render the security scans page."""
    return templates.TemplateResponse(
        "security.html",
        {
            "request": request,
            "api_key": db.get_settings()['api_key']
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
        health_trend = db.get_health_trend(days=7)
        
        # Get protected assets
        protected_assets = db.get_protected_assets()
        assets_status = db.get_assets_status()
        
        return {
            "total_alerts": total_alerts.get("total", 0),
            "alerts_trend": alerts_trend,
            "active_threats": len(active_threats),
            "threats_trend": threats_trend,
            "network_health": network_health,
            "health_trend": health_trend,
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
        new_key = db.regenerate_api_key()
        if new_key:
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

@app.get("/api/security/scans/stats")
async def get_scan_stats(api_key: str = Depends(verify_api_key)):
    """Get statistics about security scans."""
    try:
        active_scans = len(db.get_active_scans())
        recent_scans = db.get_recent_scans(limit=100)
        
        total_findings = 0
        critical_findings = 0
        successful_scans = 0
        
        for scan in recent_scans:
            if scan["status"] == "completed":
                successful_scans += 1
                findings = db.get_scan_findings(scan["id"])
                total_findings += len(findings)
                critical_findings += sum(1 for f in findings if f["severity"] == "critical")
        
        success_rate = (successful_scans / len(recent_scans) * 100) if recent_scans else 0
        
        return {
            "active_scans": active_scans,
            "total_findings": total_findings,
            "critical_findings": critical_findings,
            "success_rate": round(success_rate, 1)
        }
    except Exception as e:
        logger.error(f"Error getting scan stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving scan statistics")

@app.post("/api/security/scan")
async def start_scan(
    background_tasks: BackgroundTasks,
    api_key: str = Depends(verify_api_key)
):
    """Start a new security scan."""
    try:
        scan_id = str(uuid.uuid4())
        scan = {
            "id": scan_id,
            "timestamp": datetime.now().isoformat(),
            "type": "full",
            "status": "running",
            "progress": 0,
            "findings_count": 0,
            "start_time": datetime.now().isoformat(),
            "end_time": None,
            "metadata": {}
        }
        
        db.start_security_scan(scan)
        
        # Start scan in background
        background_tasks.add_task(run_security_scan, scan_id)
        
        # Notify connected clients
        await broadcast_message('notifications', json.dumps({
            "type": "security_scan_started",
            "scan_id": scan_id,
            "status": "running"
        }))
        
        return {
            "scan_id": scan_id,
            "message": "Security scan started",
            "status": "running"
        }
    except Exception as e:
        logger.error(f"Error starting security scan: {str(e)}")
        db.update_scan_status(scan_id, "failed", 0, error_message=str(e))
        
        # Notify connected clients
        await broadcast_message('notifications', json.dumps({
            "type": "security_scan_failed",
            "scan_id": scan_id,
            "error": str(e)
        }))
        raise HTTPException(status_code=500, detail="Error starting security scan")

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

@app.post("/api/security/scan/{scan_id}/findings")
async def add_finding(
    scan_id: str,
    finding: dict,
    api_key: str = Depends(verify_api_key)
):
    """Add a finding to a security scan."""
    try:
        scan = db.get_scan(scan_id)
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")
        
        if scan["status"] not in ["running", "completed"]:
            raise HTTPException(status_code=400, detail="Cannot add findings to a scan that is not running or completed")
        
        finding_id = str(uuid.uuid4())
        finding_data = {
            "id": finding_id,
            "scan_id": scan_id,
            "timestamp": datetime.now().isoformat(),
            **finding
        }
        
        db.add_scan_finding(finding_data)
        
        # Notify connected clients
        await broadcast_message('notifications', json.dumps({
            "type": "scan_finding_added",
            "scan_id": scan_id,
            "finding_id": finding_id,
            "severity": finding["severity"]
        }))
        
        return {
            "finding_id": finding_id,
            "message": "Finding added successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding finding: {str(e)}")
        raise HTTPException(status_code=500, detail="Error adding finding")

@app.put("/api/security/scan/{scan_id}/findings/{finding_id}")
async def update_finding_status(
    scan_id: str,
    finding_id: str,
    status_update: dict,
    api_key: str = Depends(verify_api_key)
):
    """Update the status of a scan finding."""
    try:
        scan = db.get_scan(scan_id)
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")
        
        if scan["status"] == "failed":
            raise HTTPException(status_code=400, detail="Cannot update findings for a failed scan")
        
        db.update_finding_status(finding_id, status_update["status"])
        
        # Notify connected clients
        await broadcast_message('notifications', json.dumps({
            "type": "finding_status_updated",
            "scan_id": scan_id,
            "finding_id": finding_id,
            "status": status_update["status"]
        }))
        
        return {"message": "Finding status updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating finding status: {str(e)}")
        raise HTTPException(status_code=500, detail="Error updating finding status")

@app.post("/api/security/scan/schedule")
async def schedule_scan(
    schedule: dict,
    api_key: str = Depends(verify_api_key)
):
    """Schedule a new security scan."""
    try:
        schedule_id = str(uuid.uuid4())
        schedule_data = {
            "id": schedule_id,
            "name": schedule["name"],
            "type": schedule["type"],
            "target": schedule["target"],
            "schedule": schedule["schedule"],
            "last_run": None,
            "next_run": db._calculate_next_run(schedule["schedule"]),
            "status": "active",
            "metadata": schedule["metadata"] or {}
        }
        
        db.schedule_scan(schedule_data)
        
        return {
            "schedule_id": schedule_id,
            "message": "Scan scheduled successfully",
            "next_run": schedule_data["next_run"]
        }
    except Exception as e:
        logger.error(f"Error scheduling scan: {str(e)}")
        raise HTTPException(status_code=500, detail="Error scheduling scan")

@app.get("/api/security/scan/schedule")
async def get_scheduled_scans(api_key: str = Depends(verify_api_key)):
    """Get all scheduled scans."""
    try:
        schedules = db.get_scan_schedules()
        return {"schedules": schedules}
    except Exception as e:
        logger.error(f"Error getting scheduled scans: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving scheduled scans")

@app.delete("/api/security/scan/schedule/{schedule_id}")
async def delete_scheduled_scan(
    schedule_id: str,
    api_key: str = Depends(verify_api_key)
):
    """Delete a scheduled scan."""
    try:
        db.delete_scan_schedule(schedule_id)
        return {"message": "Scheduled scan deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting scheduled scan: {str(e)}")
        raise HTTPException(status_code=500, detail="Error deleting scheduled scan")

@app.get("/api/security/scan/{scan_id}/findings/export")
async def export_findings(
    scan_id: str,
    format: str = "csv",
    api_key: str = Depends(verify_api_key)
):
    """Export scan findings in the specified format."""
    try:
        scan = db.get_scan(scan_id)
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")
        
        findings = db.get_scan_findings(scan_id)
        
        if format == "csv":
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=["id", "timestamp", "type", "severity", "description", "location", "status"])
            writer.writeheader()
            writer.writerows(findings)
            
            return StreamingResponse(
                iter([output.getvalue()]),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=scan-findings-{scan_id}.csv"}
            )
        else:
            raise HTTPException(status_code=400, detail="Unsupported export format")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting findings: {str(e)}")
        raise HTTPException(status_code=500, detail="Error exporting findings")

async def run_security_scan(scan_id: str):
    """Background task to run a security scan."""
    try:
        # Update scan status to running
        db.update_scan_status(scan_id, "running", 0)
        
        # Simulate scan progress
        for progress in range(0, 101, 10):
            await asyncio.sleep(2)  # Simulate work
            db.update_scan_status(scan_id, "running", progress)
            
            # Add some sample findings
            if progress in [30, 60, 90]:
                finding = {
                    "type": "vulnerability",
                    "severity": "high" if progress == 30 else "medium" if progress == 60 else "low",
                    "description": f"Sample finding at {progress}% progress",
                    "location": f"component_{progress}",
                    "status": "new"
                }
                await add_finding(scan_id, finding)
        
        # Mark scan as completed
        db.update_scan_status(scan_id, "completed", 100, end_time=datetime.now().isoformat())
        
        # Notify connected clients
        await broadcast_message('notifications', json.dumps({
            "type": "security_scan_completed",
            "scan_id": scan_id,
            "status": "completed"
        }))
    except Exception as e:
        logger.error(f"Error running security scan: {str(e)}")
        db.update_scan_status(scan_id, "failed", 0, error_message=str(e))
        
        # Notify connected clients
        await broadcast_message('notifications', json.dumps({
            "type": "security_scan_failed",
            "scan_id": scan_id,
            "error": str(e)
        }))

# Security scan models
class ScanSchedule(BaseModel):
    name: str
    type: str
    target: str
    schedule: str
    metadata: Optional[Dict[str, Any]] = None

class ScanFinding(BaseModel):
    type: str
    severity: str
    description: str
    location: Optional[str] = None
    evidence: Optional[str] = None
    status: str = "new"
    metadata: Optional[Dict[str, Any]] = None

# Template middleware
@app.middleware("http")
async def template_middleware(request: Request, call_next):
    """Middleware to inject API key into template context."""
    response = await call_next(request)
    
    # Only modify HTML responses
    if "text/html" in response.headers.get("content-type", ""):
        # Get the response body
        body = b""
        async for chunk in response.body_iterator:
            body += chunk
        
        # Get API key from settings
        settings = db.get_settings()
        api_key = settings['api_key']
        
        # Inject API key into template context
        if b"{{ api_key }}" in body:
            body = body.replace(b"{{ api_key }}", api_key.encode())
        
        # Create new response with modified body
        return Response(
            content=body,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.media_type
        )
    
    return response

# Network monitoring service state
network_monitoring_state = {
    "running": False,
    "last_scan": None,
    "stats": {
        "devices_discovered": 0,
        "connections_tracked": 0,
        "traffic_analyzed": 0
    }
}

# Network monitoring background task
async def network_monitoring_task():
    """Background task for network monitoring."""
    while network_monitoring_state["running"]:
        try:
            # Update last scan time
            network_monitoring_state["last_scan"] = datetime.now().isoformat()
            now = datetime.now().isoformat()
            
            # Discover devices using ARP
            try:
                if os.name == 'posix':  # Linux/Unix
                    if platform.system() == 'Darwin':  # macOS
                        # Use netstat on macOS as an alternative to psutil.net_connections
                        try:
                            netstat_output = subprocess.check_output(['netstat', '-an'], stderr=subprocess.PIPE).decode()
                            connections = []
                            for line in netstat_output.split('\n'):
                                if 'ESTABLISHED' in line:
                                    parts = line.split()
                                    if len(parts) >= 4:
                                        local_addr = parts[3]
                                        remote_addr = parts[4]
                                        if '.' in local_addr and '.' in remote_addr:  # IPv4 addresses
                                            try:
                                                local_ip, local_port = local_addr.rsplit(':', 1)
                                                remote_ip, remote_port = remote_addr.rsplit(':', 1)
                                                connections.append({
                                                    'local_addr': f"{local_ip}:{local_port}",
                                                    'remote_addr': f"{remote_ip}:{remote_port}",
                                                    'status': 'ESTABLISHED',
                                                    'type': 'tcp'  # netstat -an shows TCP by default
                                                })
                                            except ValueError:
                                                continue
                        except subprocess.CalledProcessError as e:
                            logger.error(f"Error running netstat: {e.stderr.decode() if e.stderr else str(e)}")
                            connections = []
                        
                        # Get ARP table
                        arp_output = subprocess.check_output(['arp', '-a'], stderr=subprocess.PIPE).decode()
                        devices = []
                        for line in arp_output.split('\n'):
                            if 'at' in line:  # macOS ARP format: hostname (ip) at mac on interface
                                parts = line.split()
                                if len(parts) >= 4:
                                    ip = parts[1].strip('()')
                                    mac = parts[3]
                                    if mac != '(incomplete)':
                                        devices.append({
                                            'ip': ip,
                                            'mac': mac,
                                            'last_seen': now,
                                            'first_seen': now
                                        })
                    else:  # Linux
                        arp_output = subprocess.check_output(['arp', '-n'], stderr=subprocess.PIPE).decode()
                        devices = []
                        for line in arp_output.split('\n')[1:]:  # Skip header
                            if line.strip():
                                parts = line.split()
                                if len(parts) >= 3:
                                    ip = parts[0]
                                    mac = parts[2]
                                    if ip != '<incomplete>':
                                        devices.append({
                                            'ip': ip,
                                            'mac': mac,
                                            'last_seen': now,
                                            'first_seen': now  # Set first_seen for new devices
                                        })
                else:  # Windows
                    arp_output = subprocess.check_output(['arp', '-a'], stderr=subprocess.PIPE).decode()
                    devices = []
                    for line in arp_output.split('\n'):
                        if 'dynamic' in line.lower():
                            parts = line.split()
                            if len(parts) >= 2:
                                ip = parts[0]
                                mac = parts[1]
                                devices.append({
                                    'ip': ip,
                                    'mac': mac,
                                    'last_seen': now,
                                    'first_seen': now  # Set first_seen for new devices
                                })
            except subprocess.CalledProcessError as e:
                logger.error(f"Error running network command: {e.stderr.decode() if e.stderr else str(e)}")
                devices = []
                connections = []
            except Exception as e:
                logger.error(f"Error discovering network devices: {str(e)}")
                devices = []
                connections = []
            
            # Update device count
            network_monitoring_state["stats"]["devices_discovered"] = len(devices)
            
            # Update connection count
            network_monitoring_state["stats"]["connections_tracked"] = len(connections)
            
            # Analyze traffic using psutil (this works on macOS)
            try:
                net_io = psutil.net_io_counters()
                traffic_stats = {
                    'bytes_sent': net_io.bytes_sent,
                    'bytes_recv': net_io.bytes_recv,
                    'packets_sent': net_io.packets_sent,
                    'packets_recv': net_io.packets_recv,
                    'timestamp': now
                }
            except Exception as e:
                logger.error(f"Error getting network I/O stats: {str(e)}")
                traffic_stats = {
                    'bytes_sent': 0,
                    'bytes_recv': 0,
                    'packets_sent': 0,
                    'packets_recv': 0,
                    'timestamp': now
                }
            
            # Calculate network load (macOS specific)
            try:
                if platform.system() == 'Darwin':
                    # Get interface stats using netstat
                    try:
                        netstat_i_output = subprocess.check_output(['netstat', '-I', 'en0'], stderr=subprocess.PIPE).decode()
                        lines = netstat_i_output.split('\n')
                        if len(lines) >= 2:  # Skip header line
                            stats = lines[1].split()
                            if len(stats) >= 4:
                                bytes_in = int(stats[3])
                                bytes_out = int(stats[6])
                                bytes_per_sec = (bytes_in + bytes_out) * 8  # Convert to bits
                                # Assume 1Gbps connection
                                if_speed = 1000000000  # 1Gbps in bits
                                load = min(100, (bytes_per_sec / if_speed) * 100)
                                primary_if = 'en0'
                            else:
                                load = 0
                                primary_if = 'en0'
                                bytes_per_sec = 0
                        else:
                            load = 0
                            primary_if = 'en0'
                            bytes_per_sec = 0
                    except subprocess.CalledProcessError:
                        # Fallback to simple calculation using psutil
                        net_io = psutil.net_io_counters()
                        bytes_per_sec = (net_io.bytes_sent + net_io.bytes_recv) * 8
                        if_speed = 1000000000  # 1Gbps
                        load = min(100, (bytes_per_sec / if_speed) * 100)
                        primary_if = 'en0'
                else:
                    # Get network interface stats for non-macOS systems
                    net_if_stats = psutil.net_if_stats()
                    net_if_io = psutil.net_io_counters()
                    
                    # Find the primary interface (usually the one with the most traffic)
                    primary_if = max(net_if_io.items(), key=lambda x: x[1].bytes_sent + x[1].bytes_recv)[0]
                    
                    # Get interface speed (in bits per second)
                    if_speed = net_if_stats[primary_if].speed * 1000000  # Convert Mbps to bps
                    
                    # Calculate current bandwidth usage
                    current_io = net_if_io[primary_if]
                    bytes_per_sec = (current_io.bytes_sent + current_io.bytes_recv) * 8  # Convert to bits
                    load = min(100, (bytes_per_sec / if_speed) * 100) if if_speed > 0 else 0
            except Exception as e:
                logger.error(f"Error calculating network load: {str(e)}")
                load = 0
                primary_if = 'en0'  # Default to en0 on macOS
                bytes_per_sec = 0
            
            # Update network metrics
            try:
                db = Database()
                db.update_network_metrics({
                    'timestamp': now,
                    'load': load,
                    'latency': None,
                    'packet_loss': None,
                    'bandwidth_usage': bytes_per_sec,
                    'active_connections': len(connections),
                    'metadata': {
                        'interface': primary_if,
                        'interface_speed': if_speed if 'if_speed' in locals() else None
                    }
                })
            except Exception as e:
                logger.error(f"Error updating network metrics: {str(e)}")
            
            # Update traffic stats
            network_monitoring_state["stats"]["traffic_analyzed"] = traffic_stats['bytes_sent'] + traffic_stats['bytes_recv']
            
            # Store data in database
            try:
                with db.get_db() as conn:
                    cursor = conn.cursor()
                    
                    # Update devices
                    for device in devices:
                        cursor.execute("""
                            INSERT OR REPLACE INTO network_devices (
                                ip_address, mac_address, last_seen, first_seen
                            ) VALUES (?, ?, ?, COALESCE(
                                (SELECT first_seen FROM network_devices WHERE ip_address = ?),
                                ?
                            ))
                        """, (
                            device['ip'],
                            device['mac'],
                            device['last_seen'],
                            device['ip'],
                            device['first_seen']
                        ))
                    
                    # Update connections (only if we have connection data)
                    if connections:
                        for conn in connections:
                            try:
                                local_parts = conn['local_addr'].split(':')
                                remote_parts = conn['remote_addr'].split(':')
                                cursor.execute("""
                                    INSERT INTO network_connections (
                                        source_ip, source_port, dest_ip, dest_port,
                                        protocol, status, start_time
                                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                                """, (
                                    local_parts[0],
                                    int(local_parts[1]),
                                    remote_parts[0],
                                    int(remote_parts[1]),
                                    conn.get('type', 'tcp'),
                                    conn.get('status', 'ESTABLISHED'),
                                    now
                                ))
                            except (ValueError, IndexError) as e:
                                logger.warning(f"Error processing connection data: {str(e)}")
                                continue
                    
                    # Update traffic stats
                    cursor.execute("""
                        INSERT INTO network_traffic (
                            timestamp, bytes_sent, bytes_received,
                            packets_sent, packets_received
                        ) VALUES (?, ?, ?, ?, ?)
                    """, (
                        traffic_stats['timestamp'],
                        traffic_stats['bytes_sent'],
                        traffic_stats['bytes_recv'],
                        traffic_stats['packets_sent'],
                        traffic_stats['packets_recv']
                    ))
                    
                    conn.commit()
            except sqlite3.Error as e:
                logger.error(f"Database error: {str(e)}")
            except Exception as e:
                logger.error(f"Error storing network data: {str(e)}")
            
            # Broadcast updates via WebSocket
            try:
                await broadcast_message('network', {
                    "type": "network_update",
                    "data": {
                        "devices": len(devices),
                        "connections": len(connections),
                        "traffic": traffic_stats,
                        "load": load,
                        "timestamp": now
                    }
                })
            except Exception as e:
                logger.error(f"Error broadcasting network update: {str(e)}")
            
            # Sleep for 5 seconds before next scan
            await asyncio.sleep(5)
            
        except Exception as e:
            logger.error(f"Error in network monitoring task: {str(e)}", exc_info=True)
            await asyncio.sleep(5)  # Sleep before retrying

@app.post("/api/network-monitoring/start")
async def start_network_monitoring(api_key: str = Depends(verify_api_key)):
    """Start the network monitoring service."""
    if network_monitoring_state["running"]:
        raise HTTPException(status_code=400, detail="Network monitoring is already running")
    
    try:
        network_monitoring_state["running"] = True
        asyncio.create_task(network_monitoring_task())
        return {"status": "started", "message": "Network monitoring service started"}
    except Exception as e:
        network_monitoring_state["running"] = False
        logger.error(f"Error starting network monitoring: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to start network monitoring")

@app.post("/api/network-monitoring/stop")
async def stop_network_monitoring(api_key: str = Depends(verify_api_key)):
    """Stop the network monitoring service."""
    if not network_monitoring_state["running"]:
        raise HTTPException(status_code=400, detail="Network monitoring is not running")
    
    try:
        network_monitoring_state["running"] = False
        return {"status": "stopped", "message": "Network monitoring service stopped"}
    except Exception as e:
        logger.error(f"Error stopping network monitoring: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to stop network monitoring")

@app.get("/api/network-monitoring/status")
async def get_network_monitoring_status(api_key: str = Depends(verify_api_key)):
    """Get the current status of the network monitoring service."""
    return {
        "running": network_monitoring_state["running"],
        "last_scan": network_monitoring_state["last_scan"],
        "stats": network_monitoring_state["stats"]
    }

async def monitor_network():
    """Background task for network monitoring."""
    try:
        db = Database()
        while True:
            # Check if monitoring is still active
            with db.get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT status FROM network_monitoring WHERE id = 1")
                status = cursor.fetchone()
                
                if not status or status[0] != "running":
                    break
            
            # Perform network scan
            await scan_network()
            
            # Update monitoring stats
            with db.get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE network_monitoring
                    SET last_scan = ?,
                        last_updated = ?
                    WHERE id = 1
                """, (datetime.utcnow().isoformat(), datetime.utcnow().isoformat()))
                conn.commit()
            
            # Wait before next scan
            await asyncio.sleep(60)  # Scan every minute
    except Exception as e:
        logger.error(f"Error in network monitoring: {str(e)}")
        # Update monitoring status to stopped on error
        try:
            with db.get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE network_monitoring
                    SET status = 'stopped',
                        last_updated = ?
                    WHERE id = 1
                """, (datetime.utcnow().isoformat(),))
                conn.commit()
        except:
            pass

async def scan_network():
    """Perform network scan to discover devices and connections."""
    try:
        # Use psutil to get network connections
        import psutil
        
        db = Database()
        now = datetime.utcnow().isoformat()
        
        # Get current network connections
        connections = psutil.net_connections()
        devices = set()
        
        for conn in connections:
            if conn.status == 'ESTABLISHED':
                # Add source device
                source_ip = conn.laddr.ip
                if source_ip != '127.0.0.1':
                    devices.add(source_ip)
                    device_id = db.update_network_device({
                        'ip': source_ip,
                        'type': 'client',
                        'metadata': {
                            'pid': conn.pid,
                            'process': psutil.Process(conn.pid).name() if conn.pid else None
                        }
                    })
                    
                    # Add connection
                    if conn.raddr:  # Has remote address
                        dest_ip = conn.raddr.ip
                        if dest_ip != '127.0.0.1':
                            devices.add(dest_ip)
                            dest_device_id = db.update_network_device({
                                'ip': dest_ip,
                                'type': 'remote'
                            })
                            
                            db.add_network_connection({
                                'source_device': device_id,
                                'dest_device': dest_device_id,
                                'protocol': conn.type,
                                'source_port': conn.laddr.port,
                                'dest_port': conn.raddr.port,
                                'status': 'established',
                                'start_time': now
                            })
        
        # Update network traffic stats
        net_io = psutil.net_io_counters()
        db.update_network_traffic({
            'timestamp': now,
            'bytes_sent': net_io.bytes_sent,
            'bytes_received': net_io.bytes_recv,
            'packets_sent': net_io.packets_sent,
            'packets_received': net_io.packets_recv
        })
        
        # Update monitoring stats
        with db.get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE network_monitoring
                SET devices_discovered = ?,
                    connections_tracked = ?,
                    traffic_analyzed = traffic_analyzed + 1
                WHERE id = 1
            """, (len(devices), len(connections)))
            conn.commit()
        
        # Notify clients of update
        await notify_clients({
            'type': 'network_update',
            'data': {
                'devices': len(devices),
                'connections': len(connections),
                'timestamp': now
            }
        })
    except Exception as e:
        logger.error(f"Error scanning network: {str(e)}")
        raise

@app.post("/api/network-monitoring/start")
async def start_network_monitoring(api_key: str = Depends(verify_api_key)):
    """Start network monitoring service."""
    try:
        db = Database()
        with db.get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE network_monitoring
                SET status = 'running',
                    last_updated = ?
                WHERE id = 1
            """, (datetime.utcnow().isoformat(),))
            conn.commit()
        
        # Start background monitoring task
        asyncio.create_task(monitor_network())
        
        return {"message": "Network monitoring started successfully"}
    except Exception as e:
        logger.error(f"Error starting network monitoring: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/network-monitoring/stop")
async def stop_network_monitoring(api_key: str = Depends(verify_api_key)):
    """Stop network monitoring service."""
    try:
        db = Database()
        with db.get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE network_monitoring
                SET status = 'stopped',
                    last_updated = ?
                WHERE id = 1
            """, (datetime.utcnow().isoformat(),))
            conn.commit()
        
        return {"message": "Network monitoring stopped successfully"}
    except Exception as e:
        logger.error(f"Error stopping network monitoring: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/network-monitoring/status")
async def get_network_monitoring_status(api_key: str = Depends(verify_api_key)):
    """Get network monitoring service status."""
    try:
        db = Database()
        with db.get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM network_monitoring WHERE id = 1")
            status = cursor.fetchone()
            
            if not status:
                raise HTTPException(status_code=404, detail="Monitoring status not found")
            
            return {
                "running": status[1] == "running",
                "last_scan": status[2],
                "stats": {
                    "devices_discovered": status[3],
                    "connections_tracked": status[4],
                    "traffic_analyzed": status[5]
                },
                "last_updated": status[6]
            }
    except Exception as e:
        logger.error(f"Error getting monitoring status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def get_db():
    """Get a database connection."""
    conn = sqlite3.connect('data/securenet.db')
    conn.row_factory = sqlite3.Row
    return conn

# Update the database schema
def update_db_schema():
    """Update the database schema if needed."""
    db = Database()  # This will initialize the database with the latest schema
    logger.info("Database schema updated successfully")

# New models for advanced search
class SearchParams(BaseModel):
    pattern: str
    isRegex: bool = False
    fields: List[str] = ["message"]
    timeFrom: Optional[datetime] = None
    timeTo: Optional[datetime] = None
    correlation: str = "none"
    aggregation: str = "count"

class LogAnalysisParams(BaseModel):
    type: str
    aggregation: str
    timeRange: str = "24h"

# Advanced search endpoint
@app.post("/api/logs/search")
async def search_logs(params: SearchParams):
    try:
        query = "SELECT * FROM logs WHERE 1=1"
        query_params = []
        
        # Add time range filter
        if params.timeFrom:
            query += " AND timestamp >= ?"
            query_params.append(params.timeFrom.isoformat())
        if params.timeTo:
            query += " AND timestamp <= ?"
            query_params.append(params.timeTo.isoformat())
        
        # Add pattern search
        if params.pattern:
            if params.isRegex:
                try:
                    pattern = re.compile(params.pattern)
                    # We'll filter results after fetching
                except re.error as e:
                    raise HTTPException(status_code=400, detail=f"Invalid regex pattern: {str(e)}")
            else:
                query += " AND ("
                conditions = []
                for field in params.fields:
                    conditions.append(f"{field} LIKE ?")
                    query_params.append(f"%{params.pattern}%")
                query += " OR ".join(conditions) + ")"
        
        # Execute query
        db = Database()
        results = db.execute_query(query, query_params)
        
        # Apply regex filter if needed
        if params.isRegex and params.pattern:
            pattern = re.compile(params.pattern)
            results = [
                log for log in results
                if any(pattern.search(str(log.get(field, ""))) for field in params.fields)
            ]
        
        # Apply correlation if requested
        if params.correlation != "none":
            results = apply_correlation(results, params.correlation)
        
        # Apply aggregation
        if params.aggregation != "none":
            results = apply_aggregation(results, params.aggregation)
        
        return results
    except Exception as e:
        logger.error(f"Error in advanced search: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# Log analysis endpoint
@app.get("/api/logs/analysis")
async def analyze_logs(
    type: str = Query(..., description="Analysis type: trend, distribution, sources, correlation"),
    aggregation: str = Query("count", description="Aggregation method: count, avg, sum, min, max"),
    timeRange: str = Query("24h", description="Time range for analysis")
):
    try:
        db = Database()
        
        # Calculate time range
        end_time = datetime.now()
        if timeRange == "1h":
            start_time = end_time - timedelta(hours=1)
            interval = "1 minute"
        elif timeRange == "24h":
            start_time = end_time - timedelta(days=1)
            interval = "1 hour"
        elif timeRange == "7d":
            start_time = end_time - timedelta(days=7)
            interval = "1 day"
        else:
            raise HTTPException(status_code=400, detail="Invalid time range")
        
        # Get analysis data based on type
        if type == "trend":
            data = get_trend_analysis(db, start_time, end_time, interval, aggregation)
        elif type == "distribution":
            data = get_level_distribution(db, start_time, end_time)
        elif type == "sources":
            data = get_source_distribution(db, start_time, end_time)
        elif type == "correlation":
            data = get_log_correlation(db, start_time, end_time)
        else:
            raise HTTPException(status_code=400, detail="Invalid analysis type")
        
        return data
    except Exception as e:
        logger.error(f"Error in log analysis: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# Helper functions for log analysis
def get_trend_analysis(db: Database, start_time: datetime, end_time: datetime, interval: str, aggregation: str) -> Dict[str, Any]:
    query = f"""
        SELECT 
            strftime('%Y-%m-%d %H:%M', timestamp) as time_bucket,
            {aggregation}(1) as value
        FROM logs
        WHERE timestamp BETWEEN ? AND ?
        GROUP BY time_bucket
        ORDER BY time_bucket
    """
    results = db.execute_query(query, [start_time.isoformat(), end_time.isoformat()])
    
    return {
        "labels": [r["time_bucket"] for r in results],
        "values": [r["value"] for r in results],
        "stats": {
            "total": sum(r["value"] for r in results),
            "average": sum(r["value"] for r in results) / len(results) if results else 0,
            "max": max(r["value"] for r in results) if results else 0,
            "min": min(r["value"] for r in results) if results else 0
        }
    }

def get_level_distribution(db: Database, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
    query = """
        SELECT level, COUNT(*) as count
        FROM logs
        WHERE timestamp BETWEEN ? AND ?
        GROUP BY level
    """
    results = db.execute_query(query, [start_time.isoformat(), end_time.isoformat()])
    
    return {
        "labels": [r["level"] for r in results],
        "values": [r["count"] for r in results],
        "stats": {
            "total": sum(r["count"] for r in results),
            "levels": {r["level"]: r["count"] for r in results}
        }
    }

def get_source_distribution(db: Database, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
    query = """
        SELECT source, COUNT(*) as count
        FROM logs
        WHERE timestamp BETWEEN ? AND ?
        GROUP BY source
    """
    results = db.execute_query(query, [start_time.isoformat(), end_time.isoformat()])
    
    return {
        "labels": [r["source"] for r in results],
        "values": [r["count"] for r in results],
        "stats": {
            "total": sum(r["count"] for r in results),
            "sources": {r["source"]: r["count"] for r in results}
        }
    }

def get_log_correlation(db: Database, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
    # Get logs with similar patterns within a time window
    query = """
        WITH log_patterns AS (
            SELECT 
                message,
                COUNT(*) as pattern_count,
                GROUP_CONCAT(timestamp) as timestamps
            FROM logs
            WHERE timestamp BETWEEN ? AND ?
            GROUP BY message
            HAVING pattern_count > 1
        )
        SELECT 
            message,
            pattern_count,
            timestamps
        FROM log_patterns
        ORDER BY pattern_count DESC
        LIMIT 10
    """
    results = db.execute_query(query, [start_time.isoformat(), end_time.isoformat()])
    
    return {
        "patterns": [
            {
                "message": r["message"],
                "count": r["pattern_count"],
                "timestamps": r["timestamps"].split(",")
            }
            for r in results
        ],
        "stats": {
            "total_patterns": len(results),
            "max_occurrences": max(r["pattern_count"] for r in results) if results else 0
        }
    }

# Helper functions for correlation and aggregation
def apply_correlation(logs: List[Dict[str, Any]], correlation_type: str) -> List[Dict[str, Any]]:
    if correlation_type == "time":
        # Group logs by time windows
        time_windows = {}
        for log in logs:
            timestamp = datetime.fromisoformat(log["timestamp"])
            window = timestamp.replace(minute=timestamp.minute - timestamp.minute % 5)
            if window not in time_windows:
                time_windows[window] = []
            time_windows[window].append(log)
        
        # Return correlated logs
        correlated = []
        for window, window_logs in time_windows.items():
            if len(window_logs) > 1:
                correlated.extend(window_logs)
        return correlated
    
    elif correlation_type == "source":
        # Group logs by source
        source_groups = {}
        for log in logs:
            source = log["source"]
            if source not in source_groups:
                source_groups[source] = []
            source_groups[source].append(log)
        
        # Return logs from sources with multiple entries
        correlated = []
        for source, source_logs in source_groups.items():
            if len(source_logs) > 1:
                correlated.extend(source_logs)
        return correlated
    
    elif correlation_type == "pattern":
        # Group logs by similar messages
        pattern_groups = {}
        for log in logs:
            message = log["message"]
            # Simple pattern matching - can be enhanced
            pattern = re.sub(r'\d+', 'N', message)
            if pattern not in pattern_groups:
                pattern_groups[pattern] = []
            pattern_groups[pattern].append(log)
        
        # Return logs with similar patterns
        correlated = []
        for pattern, pattern_logs in pattern_groups.items():
            if len(pattern_logs) > 1:
                correlated.extend(pattern_logs)
        return correlated
    
    return logs

def apply_aggregation(logs: List[Dict[str, Any]], aggregation_type: str) -> List[Dict[str, Any]]:
    if not logs:
        return []
    
    if aggregation_type == "count":
        return [{"count": len(logs)}]
    
    elif aggregation_type == "avg":
        # Calculate average for numeric fields
        numeric_fields = {}
        for log in logs:
            for key, value in log.items():
                if isinstance(value, (int, float)):
                    if key not in numeric_fields:
                        numeric_fields[key] = []
                    numeric_fields[key].append(value)
        
        return [{
            field: sum(values) / len(values)
            for field, values in numeric_fields.items()
        }]
    
    elif aggregation_type == "sum":
        # Calculate sum for numeric fields
        numeric_fields = {}
        for log in logs:
            for key, value in log.items():
                if isinstance(value, (int, float)):
                    if key not in numeric_fields:
                        numeric_fields[key] = 0
                    numeric_fields[key] += value
        
        return [numeric_fields]
    
    elif aggregation_type == "min":
        # Find minimum values for numeric fields
        numeric_fields = {}
        for log in logs:
            for key, value in log.items():
                if isinstance(value, (int, float)):
                    if key not in numeric_fields:
                        numeric_fields[key] = float('inf')
                    numeric_fields[key] = min(numeric_fields[key], value)
        
        return [numeric_fields]
    
    elif aggregation_type == "max":
        # Find maximum values for numeric fields
        numeric_fields = {}
        for log in logs:
            for key, value in log.items():
                if isinstance(value, (int, float)):
                    if key not in numeric_fields:
                        numeric_fields[key] = float('-inf')
                    numeric_fields[key] = max(numeric_fields[key], value)
        
        return [numeric_fields]
    
    return logs

async def get_network_state() -> dict:
    """Get current network state including active connections, traffic stats, and device status."""
    try:
        # Get network connections
        connections = db.get_network_connections(status='active', limit=100)
        
        # Get network traffic stats for the last hour
        now = datetime.now()
        start_time = now - timedelta(hours=1)
        traffic_stats = db.get_network_traffic(
            start_time=start_time,
            interval="5m",
            points=12  # 12 points for 1 hour with 5-minute intervals
        )
        
        # Get device status
        devices = db.get_network_devices()
        
        # Get protocol distribution
        protocols = db.get_network_protocols()
        
        return {
            'connections': connections,
            'traffic': traffic_stats,
            'devices': devices,
            'protocols': protocols,
            'timestamp': now.isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting network state: {str(e)}")
        return {
            'connections': [],
            'traffic': {},
            'devices': [],
            'protocols': {},
            'timestamp': datetime.now().isoformat(),
            'error': str(e)
        }

async def get_log_stream():
    """Async generator that yields new log entries as they arrive."""
    try:
        last_log_id = None
        while True:
            # Get new logs since last check
            new_logs = db.get_logs(
                start_time=(datetime.now() - timedelta(seconds=5)).isoformat(),
                limit=100
            )
            
            if new_logs:
                # Filter out logs we've already seen
                if last_log_id:
                    new_logs = [log for log in new_logs if log['id'] > last_log_id]
                
                if new_logs:
                    last_log_id = new_logs[-1]['id']
                    for log in new_logs:
                        yield log
            
            await asyncio.sleep(1)  # Check every second
    except Exception as e:
        logger.error(f"Error in log stream: {str(e)}")
        await asyncio.sleep(5)  # Back off on error
        async for log in get_log_stream():  # Retry
            yield log

async def get_alert_stream():
    """Async generator that yields new security alerts as they are generated."""
    try:
        last_alert_id = None
        while True:
            # Get new alerts since last check
            new_alerts = db.get_alerts(
                start_time=(datetime.now() - timedelta(seconds=5)).isoformat(),
                limit=100
            )
            
            if new_alerts:
                # Filter out alerts we've already seen
                if last_alert_id:
                    new_alerts = [alert for alert in new_alerts if alert['id'] > last_alert_id]
                
                if new_alerts:
                    last_alert_id = new_alerts[-1]['id']
                    for alert in new_alerts:
                        yield alert
            
            await asyncio.sleep(1)  # Check every second
    except Exception as e:
        logger.error(f"Error in alert stream: {str(e)}")
        await asyncio.sleep(5)  # Back off on error
        async for alert in get_alert_stream():  # Retry
            yield alert 