from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, HTTPException, Depends, Header
from fastapi.responses import HTMLResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.cors import CORSMiddleware
import os
import uuid
from datetime import datetime, timedelta
import logging
from typing import Dict, List, Optional, Any
from database import Database
import json

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

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

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
async def verify_api_key(x_api_key: str = Header(None)):
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
        {"request": request, "api_key": db.get_settings()['api_key']}
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
        {"request": request, "api_key": db.get_settings()['api_key']}
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
async def get_log_stats(
    source_id: Optional[str] = None,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    api_key: str = Depends(verify_api_key)
):
    """Get log statistics."""
    try:
        stats = db.get_log_stats(source_id, start_time, end_time)
        return stats
    except Exception as e:
        logger.error(f"Error getting log stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving log statistics")

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
    """Get network overview."""
    try:
        overview = db.get_network_overview()
        return overview
    except Exception as e:
        logger.error(f"Error getting network overview: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving network overview")

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
            
        traffic_data = db.get_network_traffic(start_time, interval, points)
        
        # Format labels based on range
        if range == "1h":
            labels = [(start_time + timedelta(minutes=i)).strftime("%H:%M") for i in range(points)]
        elif range == "7d":
            labels = [(start_time + timedelta(hours=i)).strftime("%m/%d %H:00") for i in range(points)]
        else:
            labels = [(start_time + timedelta(minutes=i*5)).strftime("%H:%M") for i in range(points)]
            
        return {
            "labels": labels,
            "values": traffic_data
        }
    except Exception as e:
        logger.error(f"Error getting network traffic: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving network traffic data")

@app.get("/api/network/connections")
async def get_network_connections(api_key: str = Depends(verify_api_key)):
    """Get all network connections."""
    try:
        connections = db.get_network_connections()
        return {"connections": connections}
    except Exception as e:
        logger.error(f"Error getting network connections: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving network connections")

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

@app.post("/api/scan/start")
async def start_scan(api_key: str = Depends(verify_api_key)):
    """Start a new network scan."""
    try:
        scan_id = db.start_scan()
        # Notify connected clients
        await manager.broadcast(json.dumps({
            "type": "scan_started",
            "scan_id": scan_id,
            "timestamp": datetime.now().isoformat()
        }))
        return {"scan_id": scan_id}
    except Exception as e:
        logger.error(f"Error starting scan: {str(e)}")
        raise HTTPException(status_code=500, detail="Error starting scan")

@app.post("/api/security/scan")
async def start_security_scan(api_key: str = Depends(verify_api_key)):
    """Start a comprehensive security scan."""
    try:
        scan_id = db.start_security_scan()
        # Notify connected clients
        await manager.broadcast(json.dumps({
            "type": "security_scan_started",
            "scan_id": scan_id,
            "timestamp": datetime.now().isoformat()
        }))
        return {"scan_id": scan_id}
    except Exception as e:
        logger.error(f"Error starting security scan: {str(e)}")
        raise HTTPException(status_code=500, detail="Error starting security scan")

@app.post("/api/maintenance/schedule")
async def schedule_maintenance(
    schedule: Dict[str, Any],
    api_key: str = Depends(verify_api_key)
):
    """Schedule a system maintenance window."""
    try:
        maintenance_id = db.schedule_maintenance(schedule)
        # Notify connected clients
        await manager.broadcast(json.dumps({
            "type": "maintenance_scheduled",
            "maintenance_id": maintenance_id,
            "schedule": schedule,
            "timestamp": datetime.now().isoformat()
        }))
        return {"maintenance_id": maintenance_id}
    except Exception as e:
        logger.error(f"Error scheduling maintenance: {str(e)}")
        raise HTTPException(status_code=500, detail="Error scheduling maintenance")

@app.post("/api/reports/generate")
async def generate_report(
    report_type: str = "security",
    format: str = "pdf",
    api_key: str = Depends(verify_api_key)
):
    """Generate a security report."""
    try:
        report_data = db.generate_report(report_type)
        
        if format == "pdf":
            # Generate PDF report
            pdf_content = generate_pdf_report(report_data)
            return Response(
                content=pdf_content,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename=security-report-{datetime.now().strftime('%Y%m%d')}.pdf"
                }
            )
        else:
            # Return JSON report
            return report_data
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generating report")

def generate_pdf_report(report_data: Dict[str, Any]) -> bytes:
    """Generate a PDF report from the report data."""
    # This is a placeholder - implement actual PDF generation
    # You might want to use a library like reportlab or WeasyPrint
    return b"PDF content would go here"

# WebSocket endpoints
@app.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    """WebSocket endpoint for real-time logs."""
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Process and broadcast log data
            await manager.broadcast(data)
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
    finally:
        manager.disconnect(websocket)

@app.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket):
    """WebSocket endpoint for real-time notifications."""
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Process and broadcast notification data
            await manager.broadcast(data)
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
    finally:
        manager.disconnect(websocket)

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize the application on startup."""
    logger.info("Starting SecureNet application...")
    # Database is already initialized in the Database class constructor
    logger.info("Application startup complete")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown."""
    logger.info("Shutting down SecureNet application...")
    # No cleanup needed as SQLite connections are managed by context managers
    logger.info("Application shutdown complete")

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
        
        # Inject API key into template context
        if b"{{ api_key }}" in body:
            settings = db.get_settings()
            body = body.replace(b"{{ api_key }}", settings['api_key'].encode())
        
        # Create new response with modified body
        return Response(
            content=body,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.media_type
        )
    
    return response 