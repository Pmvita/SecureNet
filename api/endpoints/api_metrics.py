"""
SecureNet Metrics API - System Monitoring and Analytics
Provides usage statistics, performance metrics, and Prometheus integration.
"""

from fastapi import APIRouter, HTTPException, Depends, Security, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import logging
import json

from database.database import Database

logger = logging.getLogger(__name__)
security = HTTPBearer()
router = APIRouter(prefix="/api/metrics", tags=["metrics"])

# Pydantic models for metrics API
class SystemMetrics(BaseModel):
    timestamp: str
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    active_connections: int
    api_requests_per_minute: int

class OrganizationMetrics(BaseModel):
    organization_id: str
    device_count: int
    active_devices: int
    scan_count_today: int
    scan_count_month: int
    anomaly_count: int
    security_score: int
    uptime_percentage: float

class SecurityMetrics(BaseModel):
    total_devices: int
    vulnerable_devices: int
    critical_vulnerabilities: int
    high_vulnerabilities: int
    medium_vulnerabilities: int
    low_vulnerabilities: int
    last_scan_time: str
    threat_level: str

async def get_organization_from_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
    """Extract organization ID from API token."""
    try:
        api_key = credentials.credentials
        if not api_key or not api_key.startswith("sk-"):
            raise HTTPException(status_code=401, detail="Invalid API key format")
        
        db = Database()
        org = await db.get_organization_by_api_key(api_key)
        if not org:
            raise HTTPException(status_code=401, detail="Invalid API key")
        
        return org['id']
    except Exception as e:
        logger.error(f"Error validating API key: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")

@router.get("/system")
async def get_system_metrics() -> SystemMetrics:
    """Get system-level metrics for monitoring."""
    try:
        # In a real implementation, these would be gathered from system monitoring
        import psutil
        import os
        
        # Get system metrics
        cpu_usage = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Get active connections (mock for now)
        active_connections = len(psutil.net_connections())
        
        # Calculate API requests per minute (would need Redis/metrics store)
        api_requests_per_minute = 50  # Mock value
        
        return SystemMetrics(
            timestamp=datetime.now().isoformat(),
            cpu_usage=cpu_usage,
            memory_usage=memory.percent,
            disk_usage=disk.percent,
            active_connections=active_connections,
            api_requests_per_minute=api_requests_per_minute
        )
    except ImportError:
        # Fallback if psutil not available
        return SystemMetrics(
            timestamp=datetime.now().isoformat(),
            cpu_usage=25.5,
            memory_usage=67.2,
            disk_usage=45.8,
            active_connections=127,
            api_requests_per_minute=42
        )
    except Exception as e:
        logger.error(f"Error getting system metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get system metrics")

@router.get("/organization")
async def get_organization_metrics(org_id: str = Depends(get_organization_from_token)) -> OrganizationMetrics:
    """Get metrics for a specific organization."""
    try:
        db = Database()
        
        # Get device metrics
        devices = await db.get_network_devices_scoped(org_id)
        device_count = len(devices)
        active_devices = len([d for d in devices if d.get('status') == 'online'])
        
        # Get scan metrics
        today = datetime.now().date()
        month_start = datetime.now().replace(day=1).date()
        
        scans_today = await db.get_security_scans_scoped(org_id, limit=1000)
        scan_count_today = len([s for s in scans_today if s.get('created_at', '').startswith(str(today))])
        scan_count_month = len([s for s in scans_today if s.get('created_at', '').startswith(str(month_start)[:7])])
        
        # Get anomaly count
        anomalies = await db.get_anomalies_scoped(org_id, page=1, page_size=1000)
        anomaly_count = len([a for a in anomalies if a.get('status') == 'active'])
        
        # Calculate security score (simplified)
        security_score = max(0, 100 - (anomaly_count * 2) - (device_count - active_devices) * 5)
        
        # Calculate uptime (mock for now)
        uptime_percentage = 99.5
        
        return OrganizationMetrics(
            organization_id=org_id,
            device_count=device_count,
            active_devices=active_devices,
            scan_count_today=scan_count_today,
            scan_count_month=scan_count_month,
            anomaly_count=anomaly_count,
            security_score=min(100, security_score),
            uptime_percentage=uptime_percentage
        )
    except Exception as e:
        logger.error(f"Error getting organization metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get organization metrics")

@router.get("/security")
async def get_security_metrics(org_id: str = Depends(get_organization_from_token)) -> SecurityMetrics:
    """Get security-focused metrics for organization."""
    try:
        db = Database()
        
        # Get vulnerability metrics
        devices = await db.get_network_devices_scoped(org_id)
        total_devices = len(devices)
        
        # Get findings from security scans
        scans = await db.get_security_scans_scoped(org_id, limit=100)
        
        # Mock vulnerability counts (would be calculated from actual scan results)
        vulnerable_devices = max(0, total_devices - 2)
        critical_vulnerabilities = 3
        high_vulnerabilities = 12
        medium_vulnerabilities = 28
        low_vulnerabilities = 45
        
        # Get last scan time
        last_scan_time = scans[0].get('created_at', datetime.now().isoformat()) if scans else datetime.now().isoformat()
        
        # Calculate threat level
        if critical_vulnerabilities > 0:
            threat_level = "CRITICAL"
        elif high_vulnerabilities > 5:
            threat_level = "HIGH"
        elif medium_vulnerabilities > 10:
            threat_level = "MEDIUM"
        else:
            threat_level = "LOW"
        
        return SecurityMetrics(
            total_devices=total_devices,
            vulnerable_devices=vulnerable_devices,
            critical_vulnerabilities=critical_vulnerabilities,
            high_vulnerabilities=high_vulnerabilities,
            medium_vulnerabilities=medium_vulnerabilities,
            low_vulnerabilities=low_vulnerabilities,
            last_scan_time=last_scan_time,
            threat_level=threat_level
        )
    except Exception as e:
        logger.error(f"Error getting security metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get security metrics")

@router.get("/prometheus")
async def get_prometheus_metrics(org_id: Optional[str] = Depends(get_organization_from_token)) -> Response:
    """Export metrics in Prometheus format."""
    try:
        db = Database()
        
        # Generate Prometheus metrics
        prometheus_output = []
        
        # System metrics
        prometheus_output.append("# HELP securenet_devices_total Total number of devices")
        prometheus_output.append("# TYPE securenet_devices_total gauge")
        
        if org_id:
            devices = await db.get_network_devices_scoped(org_id)
            device_count = len(devices)
            active_devices = len([d for d in devices if d.get('status') == 'online'])
            
            prometheus_output.append(f'securenet_devices_total{{organization_id="{org_id}"}} {device_count}')
            prometheus_output.append(f'securenet_devices_active{{organization_id="{org_id}"}} {active_devices}')
            
            # Anomaly metrics
            anomalies = await db.get_anomalies_scoped(org_id, page=1, page_size=1000)
            active_anomalies = len([a for a in anomalies if a.get('status') == 'active'])
            
            prometheus_output.append("# HELP securenet_anomalies_active Active security anomalies")
            prometheus_output.append("# TYPE securenet_anomalies_active gauge")
            prometheus_output.append(f'securenet_anomalies_active{{organization_id="{org_id}"}} {active_anomalies}')
            
            # Scan metrics
            scans = await db.get_security_scans_scoped(org_id, limit=100)
            running_scans = len([s for s in scans if s.get('status') == 'running'])
            
            prometheus_output.append("# HELP securenet_scans_running Currently running scans")
            prometheus_output.append("# TYPE securenet_scans_running gauge")
            prometheus_output.append(f'securenet_scans_running{{organization_id="{org_id}"}} {running_scans}')
        
        # Add system-wide metrics
        prometheus_output.append("# HELP securenet_api_requests_total Total API requests")
        prometheus_output.append("# TYPE securenet_api_requests_total counter")
        prometheus_output.append(f'securenet_api_requests_total 12345')
        
        prometheus_output.append("# HELP securenet_uptime_seconds System uptime in seconds")
        prometheus_output.append("# TYPE securenet_uptime_seconds gauge")
        prometheus_output.append(f'securenet_uptime_seconds 86400')
        
        metrics_text = "\n".join(prometheus_output)
        
        return Response(
            content=metrics_text,
            media_type="text/plain; version=0.0.4; charset=utf-8"
        )
    except Exception as e:
        logger.error(f"Error generating Prometheus metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate Prometheus metrics")

@router.get("/dashboard")
async def get_dashboard_metrics(org_id: str = Depends(get_organization_from_token)) -> Dict:
    """Get comprehensive metrics for dashboard display."""
    try:
        db = Database()
        
        # Get all metrics for dashboard
        org_metrics = await get_organization_metrics(org_id)
        security_metrics = await get_security_metrics(org_id)
        
        # Get recent activity
        recent_scans = await db.get_security_scans_scoped(org_id, limit=5)
        recent_anomalies = await db.get_anomalies_scoped(org_id, page=1, page_size=5)
        
        # Calculate trends (mock data for now)
        device_trend = [
            {"date": "2024-01-01", "count": org_metrics.device_count - 3},
            {"date": "2024-01-02", "count": org_metrics.device_count - 2},
            {"date": "2024-01-03", "count": org_metrics.device_count - 1},
            {"date": "2024-01-04", "count": org_metrics.device_count},
        ]
        
        security_trend = [
            {"date": "2024-01-01", "score": security_metrics.critical_vulnerabilities + 2},
            {"date": "2024-01-02", "score": security_metrics.critical_vulnerabilities + 1},
            {"date": "2024-01-03", "score": security_metrics.critical_vulnerabilities},
            {"date": "2024-01-04", "score": security_metrics.critical_vulnerabilities},
        ]
        
        return {
            "organization_metrics": org_metrics.dict(),
            "security_metrics": security_metrics.dict(),
            "recent_activity": {
                "scans": [s for s in recent_scans],
                "anomalies": [a for a in recent_anomalies]
            },
            "trends": {
                "devices": device_trend,
                "security": security_trend
            },
            "alerts": [
                {
                    "type": "warning",
                    "message": f"{security_metrics.critical_vulnerabilities} critical vulnerabilities detected",
                    "timestamp": datetime.now().isoformat()
                } if security_metrics.critical_vulnerabilities > 0 else None
            ]
        }
    except Exception as e:
        logger.error(f"Error getting dashboard metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get dashboard metrics")

@router.get("/health")
async def health_check() -> Dict:
    """Health check endpoint for monitoring."""
    try:
        db = Database()
        
        # Test database connectivity
        async with db.get_db_async() as conn:
            cursor = await conn.execute("SELECT 1")
            await cursor.fetchone()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "database": "ok",
                "api": "ok"
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }

@router.get("/usage/export")
async def export_usage_data(
    format: str = "json",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    org_id: str = Depends(get_organization_from_token)
) -> Response:
    """Export usage data in various formats (JSON, CSV)."""
    try:
        db = Database()
        
        # Get usage data
        usage_data = await db.get_billing_usage(org_id, months=12)
        
        if format.lower() == "csv":
            # Generate CSV format
            csv_lines = ["Month,Device Count,Scan Count,Log Count,API Requests"]
            for usage in usage_data:
                csv_lines.append(f"{usage['month']},{usage['device_count']},{usage['scan_count']},{usage['log_count']},{usage['api_requests']}")
            
            csv_content = "\n".join(csv_lines)
            return Response(
                content=csv_content,
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=usage_data_{org_id}.csv"}
            )
        else:
            # Default to JSON
            return Response(
                content=json.dumps(usage_data, indent=2),
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename=usage_data_{org_id}.json"}
            )
    except Exception as e:
        logger.error(f"Error exporting usage data: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to export usage data") 