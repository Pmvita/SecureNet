"""
SecureNet Network API - Network Monitoring and Device Management
Provides network devices, statistics, traffic monitoring and security controls.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime, timezone, timedelta
import logging
import random

# Import authentication dependencies from the project
try:
    from auth.enhanced_jwt import get_current_user
except ImportError:
    # Fallback for testing
    async def get_current_user():
        return {"role": "soc_analyst", "username": "test_user"}

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/network", tags=["network"])

# Pydantic models for network API
class NetworkDevice(BaseModel):
    id: str
    name: str
    type: str
    status: str
    ip: str
    mac: str
    lastSeen: str
    connections: List[str]
    metadata: Dict[str, Any]

class NetworkStats(BaseModel):
    totalDevices: int
    onlineDevices: int
    activeConnections: int
    bandwidthUsage: Dict[str, float]

class TrafficEntry(BaseModel):
    id: str
    timestamp: str
    source_ip: str
    dest_ip: str
    protocol: str
    port: int
    bytes_in: int
    bytes_out: int
    packets_in: int
    packets_out: int
    status: str
    connection_duration: int
    threat_level: str
    application: str

class TrafficSummary(BaseModel):
    total_connections: int
    active_connections: int
    total_bytes_transferred: int
    top_protocols: List[Dict[str, Any]]

class NetworkTrafficResponse(BaseModel):
    traffic: List[TrafficEntry]
    summary: TrafficSummary

class NetworkStatusResponse(BaseModel):
    status: str
    data: Dict[str, Any]

@router.get("", response_model=NetworkStatusResponse)
async def get_network_status(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get comprehensive network monitoring data"""
    try:
        # Founder has unlimited access
        if current_user["role"].lower() in ["platform_founder", "founder"]:
            logger.info(f"🏆 FOUNDER ACCESS: {current_user.get('username')} accessing network data with unlimited privileges")
        
        # Return realistic network data for dashboard
        return {
            "status": "success",
            "data": {
                "devices": [
                    {
                        "id": 1,
                        "name": "Router Gateway",
                        "type": "router",
                        "status": "active",
                        "last_seen": datetime.now(timezone.utc).isoformat(),
                        "metadata": {
                            "ip": "192.168.1.1",
                            "mac": "00:11:22:33:44:55"
                        }
                    },
                    {
                        "id": 2, 
                        "name": "Main Server",
                        "type": "server",
                        "status": "active",
                        "last_seen": datetime.now(timezone.utc).isoformat(),
                        "metadata": {
                            "ip": "192.168.1.10",
                            "mac": "00:11:22:33:44:56"
                        }
                    },
                    {
                        "id": 3,
                        "name": "Workstation-01",
                        "type": "workstation", 
                        "status": "active",
                        "last_seen": datetime.now(timezone.utc).isoformat(),
                        "metadata": {
                            "ip": "192.168.1.20",
                            "mac": "00:11:22:33:44:57"
                        }
                    },
                    {
                        "id": 4,
                        "name": "Workstation-02",
                        "type": "workstation",
                        "status": "active", 
                        "last_seen": datetime.now(timezone.utc).isoformat(),
                        "metadata": {
                            "ip": "192.168.1.21",
                            "mac": "00:11:22:33:44:58"
                        }
                    },
                    {
                        "id": 5,
                        "name": "Network Printer",
                        "type": "printer",
                        "status": "active",
                        "last_seen": datetime.now(timezone.utc).isoformat(),
                        "metadata": {
                            "ip": "192.168.1.30",
                            "mac": "00:11:22:33:44:59"
                        }
                    },
                    {
                        "id": 6,
                        "name": "Security Camera",
                        "type": "iot",
                        "status": "active",
                        "last_seen": datetime.now(timezone.utc).isoformat(),
                        "metadata": {
                            "ip": "192.168.1.40",
                            "mac": "00:11:22:33:44:60"
                        }
                    },
                    {
                        "id": 7,
                        "name": "Mobile Device",
                        "type": "mobile",
                        "status": "active",
                        "last_seen": datetime.now(timezone.utc).isoformat(),
                        "metadata": {
                            "ip": "192.168.1.50",
                            "mac": "00:11:22:33:44:61"
                        }
                    }
                ],
                "connections": [
                    {
                        "id": "1",
                        "source_device_id": "1",
                        "source_device": "Router Gateway",
                        "target_device_id": "2",
                        "target_device": "Main Server",
                        "protocol": "tcp",
                        "port": 80,
                        "status": "active",
                        "last_seen": datetime.now(timezone.utc).isoformat(),
                        "metadata": {
                            "bytes_transferred": 1024000
                        }
                    }
                ],
                "traffic": [
                    {
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "bytes_in": 50000,
                        "bytes_out": 45000,
                        "packets_in": 100,
                        "packets_out": 95,
                        "source_ip": "192.168.1.1",
                        "dest_ip": "192.168.1.2",
                        "protocol": "TCP"
                    }
                ],
                "protocols": [
                    {"name": "TCP", "count": 150},
                    {"name": "UDP", "count": 75},
                    {"name": "HTTP", "count": 100}
                ],
                "stats": {
                    "total_devices": 7,
                    "active_devices": 7,
                    "average_latency": 15.2,
                    "total_traffic": 1024000
                }
            }
        }
    except Exception as e:
        logger.error(f"Error getting network status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get network status")

@router.get("/devices", response_model=List[NetworkDevice])
async def get_network_devices(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get network devices data for the frontend network page"""
    try:
        # Founder has unlimited access
        if current_user["role"].lower() in ["platform_founder", "founder"]:
            logger.info(f"🏆 FOUNDER ACCESS: {current_user.get('username')} accessing network devices with unlimited privileges")
        
        # Return devices in the format expected by the frontend
        devices = [
            {
                "id": "1",
                "name": "Router Gateway",
                "type": "router",
                "status": "online",
                "ip": "192.168.1.1",
                "mac": "00:11:22:33:44:55",
                "lastSeen": datetime.now(timezone.utc).isoformat(),
                "connections": ["2", "3", "4"],
                "metadata": {
                    "os": "RouterOS",
                    "vendor": "MikroTik",
                    "location": "Network Core",
                    "services": ["DHCP", "DNS", "Firewall"]
                }
            },
            {
                "id": "2",
                "name": "Main Server",
                "type": "server",
                "status": "online",
                "ip": "192.168.1.10",
                "mac": "00:11:22:33:44:56",
                "lastSeen": datetime.now(timezone.utc).isoformat(),
                "connections": ["1", "3", "4"],
                "metadata": {
                    "os": "Ubuntu 22.04 LTS",
                    "vendor": "Dell",
                    "location": "Server Room",
                    "services": ["Web Server", "Database", "File Server"]
                }
            },
            {
                "id": "3",
                "name": "Workstation-01",
                "type": "workstation",
                "status": "online",
                "ip": "192.168.1.20",
                "mac": "00:11:22:33:44:57",
                "lastSeen": datetime.now(timezone.utc).isoformat(),
                "connections": ["1", "2"],
                "metadata": {
                    "os": "Windows 11 Pro",
                    "vendor": "HP",
                    "location": "Office Floor 1",
                    "services": ["Office Suite", "Development Tools"]
                }
            },
            {
                "id": "4",
                "name": "Workstation-02",
                "type": "workstation",
                "status": "warning",
                "ip": "192.168.1.21",
                "mac": "00:11:22:33:44:58",
                "lastSeen": datetime.now(timezone.utc).isoformat(),
                "connections": ["1", "2"],
                "metadata": {
                    "os": "macOS Ventura",
                    "vendor": "Apple",
                    "location": "Office Floor 2",
                    "services": ["Design Software", "Video Editing"]
                }
            },
            {
                "id": "5",
                "name": "Network Printer",
                "type": "switch",
                "status": "online",
                "ip": "192.168.1.30",
                "mac": "00:11:22:33:44:59",
                "lastSeen": datetime.now(timezone.utc).isoformat(),
                "connections": ["1"],
                "metadata": {
                    "os": "Embedded Linux",
                    "vendor": "HP",
                    "location": "Print Room",
                    "services": ["Print Server", "Scan Server"]
                }
            },
            {
                "id": "6",
                "name": "Security Camera",
                "type": "switch",
                "status": "offline",
                "ip": "192.168.1.40",
                "mac": "00:11:22:33:44:60",
                "lastSeen": datetime.now(timezone.utc).isoformat(),
                "connections": ["1"],
                "metadata": {
                    "os": "Embedded Linux",
                    "vendor": "Hikvision",
                    "location": "Building Perimeter",
                    "services": ["Video Streaming", "Motion Detection"]
                }
            },
            {
                "id": "7",
                "name": "Mobile Device",
                "type": "mobile",
                "status": "online",
                "ip": "192.168.1.50",
                "mac": "00:11:22:33:44:61",
                "lastSeen": datetime.now(timezone.utc).isoformat(),
                "connections": ["1"],
                "metadata": {
                    "os": "iOS 17",
                    "vendor": "Apple",
                    "location": "Mobile",
                    "services": ["Email", "VPN Client"]
                }
            }
        ]
        
        return devices
    except Exception as e:
        logger.error(f"Error getting network devices: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get network devices")

@router.get("/stats", response_model=NetworkStats)
async def get_network_stats(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get network statistics for the frontend network page"""
    try:
        # Founder has unlimited access
        if current_user["role"].lower() in ["platform_founder", "founder"]:
            logger.info(f"🏆 FOUNDER ACCESS: {current_user.get('username')} accessing network stats with unlimited privileges")
        
        # Return stats in the format expected by the frontend
        return {
            "totalDevices": 7,
            "onlineDevices": 5,
            "activeConnections": 12,
            "bandwidthUsage": {
                "incoming": 45.2,
                "outgoing": 38.7
            }
        }
    except Exception as e:
        logger.error(f"Error getting network stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get network stats")

@router.get("/traffic", response_model=NetworkTrafficResponse)
async def get_network_traffic(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get live network traffic data for the frontend network page"""
    try:
        # Founder has unlimited access
        if current_user["role"].lower() in ["platform_founder", "founder"]:
            logger.info(f"🏆 FOUNDER ACCESS: {current_user.get('username')} accessing network traffic with unlimited privileges")
        
        # Generate realistic live traffic data
        base_time = datetime.now(timezone.utc) - timedelta(hours=24)
        
        # Common protocols and ports
        protocols = ["TCP", "UDP", "HTTP", "HTTPS", "SSH", "FTP", "DNS", "SMTP", "POP3", "IMAP"]
        ports = [80, 443, 22, 21, 53, 25, 110, 143, 3389, 8080, 8443, 3306, 5432, 27017]
        
        # Device IPs for realistic traffic
        device_ips = [
            "192.168.1.1", "192.168.1.10", "192.168.1.20", "192.168.1.21", 
            "192.168.1.30", "192.168.1.40", "192.168.1.50"
        ]
        
        # Generate 100 traffic entries
        traffic_data = []
        for i in range(100):
            timestamp = base_time + timedelta(minutes=i * 15)  # Every 15 minutes
            protocol = random.choice(protocols)
            source_ip = random.choice(device_ips)
            dest_ip = random.choice(device_ips)
            
            # Avoid same source and destination
            while dest_ip == source_ip:
                dest_ip = random.choice(device_ips)
            
            # Generate realistic traffic volumes based on protocol
            if protocol in ["HTTP", "HTTPS"]:
                bytes_in = random.randint(1000, 50000)
                bytes_out = random.randint(500, 25000)
            elif protocol in ["SSH", "FTP"]:
                bytes_in = random.randint(100, 5000)
                bytes_out = random.randint(50, 2000)
            else:
                bytes_in = random.randint(100, 10000)
                bytes_out = random.randint(50, 5000)
            
            traffic_data.append({
                "id": f"traffic_{i}",
                "timestamp": timestamp.isoformat(),
                "source_ip": source_ip,
                "dest_ip": dest_ip,
                "protocol": protocol,
                "port": random.choice(ports),
                "bytes_in": bytes_in,
                "bytes_out": bytes_out,
                "packets_in": random.randint(1, 100),
                "packets_out": random.randint(1, 50),
                "status": random.choice(["active", "completed", "timeout"]),
                "connection_duration": random.randint(1, 300),  # seconds
                "threat_level": random.choice(["low", "medium", "high"]),
                "application": random.choice(["Web Browser", "Email Client", "SSH Client", "File Transfer", "Database", "Unknown"])
            })
        
        # Sort by timestamp (newest first)
        traffic_data.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return {
            "traffic": traffic_data[:50],  # Return last 50 entries
            "summary": {
                "total_connections": len(traffic_data),
                "active_connections": len([t for t in traffic_data if t["status"] == "active"]),
                "total_bytes_transferred": sum(t["bytes_in"] + t["bytes_out"] for t in traffic_data),
                "top_protocols": [
                    {"protocol": "HTTP/HTTPS", "count": len([t for t in traffic_data if t["protocol"] in ["HTTP", "HTTPS"]])},
                    {"protocol": "SSH", "count": len([t for t in traffic_data if t["protocol"] == "SSH"])},
                    {"protocol": "DNS", "count": len([t for t in traffic_data if t["protocol"] == "DNS"])},
                    {"protocol": "Other", "count": len([t for t in traffic_data if t["protocol"] not in ["HTTP", "HTTPS", "SSH", "DNS"]])}
                ]
            }
        }
    except Exception as e:
        logger.error(f"Error getting network traffic: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get network traffic")

@router.post("/scan")
async def start_network_scan(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Start a network scan"""
    try:
        # Check permissions for network scanning
        if current_user["role"].lower() not in ["platform_founder", "founder", "security_admin", "platform_owner"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions for network scanning")
        
        # Simulate scan initiation
        scan_id = f"scan_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        return {
            "status": "success",
            "data": {
                "scan_id": scan_id,
                "status": "initiated",
                "message": "Network scan started successfully",
                "estimated_duration": "5-10 minutes"
            }
        }
    except Exception as e:
        logger.error(f"Error starting network scan: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to start network scan")

@router.get("/scan/{scan_id}/status")
async def get_scan_status(scan_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get the status of a network scan"""
    try:
        # Simulate scan status check
        import hashlib
        scan_hash = int(hashlib.md5(scan_id.encode()).hexdigest()[:8], 16)
        progress = min(100, (scan_hash % 100) + 10)
        
        if progress >= 100:
            status = "completed"
        elif progress >= 50:
            status = "running"
        else:
            status = "starting"
        
        return {
            "status": "success",
            "data": {
                "scan_id": scan_id,
                "status": status,
                "progress": progress,
                "devices_found": max(1, progress // 20),
                "vulnerabilities_found": max(0, progress // 30),
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Error getting scan status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get scan status")