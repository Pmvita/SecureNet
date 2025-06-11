# 🔌 SecureNet API Reference - Production Network Monitoring

> **Complete REST API Documentation for Real-Time WiFi Network Security**  
> Live device discovery • Real-time security analysis • Production-ready endpoints

This document provides comprehensive API documentation for SecureNet's production network monitoring and security analysis platform.

## 🌐 **Base Configuration**

### **API Base URLs**
- **Production**: `http://localhost:8000`
- **API Documentation**: `http://localhost:8000/docs` (Swagger UI)
- **OpenAPI Schema**: `http://localhost:8000/openapi.json`

### **Authentication**
```bash
# Development API Key
X-API-Key: dev-api-key

# Production API Key (configurable)
X-API-Key: your-production-api-key
```

### **Response Format**
All endpoints return responses in this standardized format:
```json
{
  "status": "success|error",
  "data": {...},
  "timestamp": "2025-06-11T17:38:00.886416"
}
```

---

## 🔍 **Network Discovery Endpoints**

### **GET /api/network**
**Real-time network device discovery and monitoring**

```bash
curl -X GET "http://localhost:8000/api/network" \
  -H "X-API-Key: dev-api-key"
```

**Response Example (Real Production Data):**
```json
{
  "status": "success",
  "data": {
    "devices": [
      {
        "id": "device_192_168_2_1",
        "name": "mynetwork",
        "ip_address": "192.168.2.1",
        "mac_address": "44:E9:DD:4C:7C:74",
        "device_type": "Router",
        "status": "online",
        "last_seen": "2025-06-11T17:38:00Z",
        "open_ports": [53, 80, 139, 443],
        "vendor": "Network Equipment",
        "first_discovered": "2025-06-11T16:45:12Z"
      },
      {
        "id": "device_192_168_2_17",
        "name": "device-17",
        "ip_address": "192.168.2.17",
        "mac_address": "F0:5C:77:75:DD:F6",
        "device_type": "Endpoint",
        "status": "online",
        "last_seen": "2025-06-11T17:37:45Z",
        "open_ports": [],
        "vendor": "Unknown",
        "first_discovered": "2025-06-11T16:45:15Z"
      }
    ],
    "network_stats": {
      "total_devices": 7,
      "active_devices": 7,
      "device_types": {
        "Router": 1,
        "Endpoint": 6,
        "Server": 0,
        "Printer": 0
      },
      "network_range": "192.168.2.0/24",
      "last_scan": "2025-06-11T17:37:30Z",
      "scan_duration": "12.5s"
    },
    "traffic_stats": {
      "total_bytes": 286250,
      "active_connections": 15,
      "protocols": ["TCP", "UDP", "HTTP", "HTTPS"]
    }
  },
  "timestamp": "2025-06-11T17:38:00.886416"
}
```

### **POST /api/network/scan**
**Trigger real network discovery scan**

```bash
curl -X POST "http://localhost:8000/api/network/scan" \
  -H "X-API-Key: dev-api-key"
```

**Response Example:**
```json
{
  "status": "success",
  "data": {
    "scan_id": "network_scan_1749677880",
    "status": "completed",
    "devices_discovered": 7,
    "scan_time": "12.5s",
    "network_ranges": ["192.168.2.0/24"],
    "message": "Network scan completed - 7 devices discovered"
  },
  "timestamp": "2025-06-11T17:38:00.886416"
}
```

---

## 🛡️ **Security Analysis Endpoints**

### **GET /api/security**
**Real-time security status and analysis**

```bash
curl -X GET "http://localhost:8000/api/security" \
  -H "X-API-Key: dev-api-key"
```

**Response Example (Current Production Data):**
```json
{
  "status": "success",
  "data": {
    "metrics": {
      "active_scans": 0,
      "total_findings": 0,
      "critical_findings": 0,
      "security_score": 100,
      "last_scan": "2025-06-11T17:38:00.844846",
      "scan_status": "idle",
      "open_ports_detected": 4,
      "network_devices": 7,
      "active_devices": 7,
      "routers_detected": 1
    },
    "recent_scans": [
      {
        "id": "security_scan_1749677880",
        "timestamp": "2025-06-11T17:38:00.844842",
        "type": "network_security",
        "target": "7 network devices",
        "status": "completed",
        "progress": 100,
        "findings_count": 0,
        "start_time": "2025-06-11T17:38:00.844842",
        "end_time": "2025-06-11T17:38:00.844846",
        "metadata": {
          "devices_scanned": 7,
          "findings": []
        }
      }
    ],
    "active_scans": [],
    "recent_findings": []
  },
  "timestamp": "2025-06-11T17:38:26.420271"
}
```

### **POST /api/security/scan**
**Start real security vulnerability scan**

```bash
curl -X POST "http://localhost:8000/api/security/scan" \
  -H "X-API-Key: dev-api-key"
```

**Response Example:**
```json
{
  "status": "success",
  "data": {
    "id": "security_scan_1749677880",
    "status": "completed",
    "devices_scanned": 7,
    "findings_count": 0,
    "message": "Security scan completed on 7 real network devices"
  },
  "timestamp": "2025-06-11T17:38:00.886416"
}
```

**Example Response with Security Findings:**
```json
{
  "status": "success",
  "data": {
    "id": "security_scan_1749677990",
    "status": "completed",
    "devices_scanned": 7,
    "findings_count": 2,
    "findings": [
      {
        "device_id": "device_192_168_2_1",
        "device_ip": "192.168.2.1",
        "device_name": "mynetwork",
        "type": "open_port",
        "severity": "medium",
        "description": "SSH port (22) open on router mynetwork (192.168.2.1)",
        "recommendation": "Consider disabling SSH if not needed or restrict access"
      },
      {
        "device_id": "device_192_168_2_50",
        "device_ip": "192.168.2.50",
        "device_name": "device-50",
        "type": "device_offline",
        "severity": "low",
        "description": "Device device-50 (192.168.2.50) has not been seen for over 24 hours",
        "recommendation": "Verify device status and network connectivity"
      }
    ],
    "message": "Security scan completed on 7 real network devices"
  },
  "timestamp": "2025-06-11T17:40:00.123456"
}
```

---

## 🔔 **Anomaly Detection Endpoints**

### **GET /api/anomalies/list**
**List detected network anomalies**

```bash
curl -X GET "http://localhost:8000/api/anomalies/list?page=1&pageSize=20" \
  -H "X-API-Key: dev-api-key"
```

**Query Parameters:**
- `page` (int): Page number (default: 1)
- `pageSize` (int): Items per page (default: 20)
- `status` (string): Filter by status (active, resolved)
- `severity` (string): Filter by severity (low, medium, high, critical)
- `type` (string): Filter by anomaly type

**Response Example:**
```json
{
  "status": "success",
  "data": {
    "anomalies": [],
    "total": 0,
    "page": 1,
    "pageSize": 20,
    "totalPages": 0
  },
  "timestamp": "2025-06-11T17:38:00.886416"
}
```

### **GET /api/anomalies/stats**
**Anomaly detection statistics**

```bash
curl -X GET "http://localhost:8000/api/anomalies/stats" \
  -H "X-API-Key: dev-api-key"
```

**Response Example:**
```json
{
  "status": "success",
  "data": {
    "total_anomalies": 0,
    "active_anomalies": 0,
    "resolved_anomalies": 0,
    "severity_breakdown": {
      "critical": 0,
      "high": 0,
      "medium": 0,
      "low": 0
    },
    "detection_rate": "Real-time",
    "last_analysis": "2025-06-11T17:38:00Z"
  },
  "timestamp": "2025-06-11T17:38:00.886416"
}
```

### **POST /api/anomalies/analyze**
**Trigger anomaly analysis on network data**

```bash
curl -X POST "http://localhost:8000/api/anomalies/analyze" \
  -H "X-API-Key: dev-api-key"
```

**Response Example:**
```json
{
  "status": "success",
  "data": {
    "analysis_id": "anomaly_analysis_1749677880",
    "devices_analyzed": 7,
    "anomalies_detected": 0,
    "analysis_time": "2.3s",
    "message": "Network anomaly analysis completed"
  },
  "timestamp": "2025-06-11T17:38:00.886416"
}
```

---

## 📊 **Logging & Monitoring Endpoints**

### **GET /api/logs**
**Retrieve system and security logs**

```bash
curl -X GET "http://localhost:8000/api/logs?page=1&pageSize=20" \
  -H "X-API-Key: dev-api-key"
```

**Query Parameters:**
- `page` (int): Page number
- `pageSize` (int): Items per page (max 100)
- `level` (string): Log level (debug, info, warning, error, critical)
- `category` (string): Log category (system, security, network)
- `source` (string): Log source filter
- `start_date` (string): Start date (ISO format)
- `end_date` (string): End date (ISO format)
- `search` (string): Text search in log messages

**Response Example:**
```json
{
  "status": "success",
  "data": {
    "logs": [
      {
        "id": 1,
        "timestamp": "2025-06-11T17:38:00Z",
        "level": "info",
        "category": "security",
        "source": "security_scanner",
        "message": "Security scan security_scan_1749677880 completed: 0 findings on 7 devices",
        "metadata": {
          "scan_id": "security_scan_1749677880",
          "devices_scanned": 7,
          "findings_count": 0
        }
      },
      {
        "id": 2,
        "timestamp": "2025-06-11T17:37:30Z",
        "level": "info",
        "category": "network",
        "source": "network_scanner",
        "message": "Network scan completed - discovered 7 devices",
        "metadata": {
          "scan_duration": "12.5s",
          "devices_found": 7,
          "network_range": "192.168.2.0/24"
        }
      }
    ],
    "total": 150,
    "page": 1,
    "pageSize": 20,
    "totalPages": 8
  },
  "timestamp": "2025-06-11T17:38:00.886416"
}
```

### **GET /api/logs/stats**
**Logging statistics and metrics**

```bash
curl -X GET "http://localhost:8000/api/logs/stats" \
  -H "X-API-Key: dev-api-key"
```

**Response Example:**
```json
{
  "status": "success",
  "data": {
    "total_logs": 1547,
    "logs_today": 89,
    "level_breakdown": {
      "critical": 0,
      "error": 2,
      "warning": 15,
      "info": 1425,
      "debug": 105
    },
    "category_breakdown": {
      "system": 890,
      "security": 445,
      "network": 212
    },
    "source_breakdown": {
      "network_scanner": 156,
      "security_scanner": 98,
      "api_server": 445,
      "database": 123,
      "auth_system": 67
    }
  },
  "timestamp": "2025-06-11T17:38:00.886416"
}
```

---

## 🔐 **Authentication Endpoints**

### **POST /api/auth/login**
**User authentication and session management**

```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**Response Example:**
```json
{
  "status": "success",
  "data": {
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "role": "Administrator",
      "last_login": "2025-06-11T17:38:00Z"
    }
  },
  "timestamp": "2025-06-11T17:38:00.886416"
}
```

### **GET /api/auth/me**
**Get current user information**

```bash
curl -X GET "http://localhost:8000/api/auth/me" \
  -H "Authorization: Bearer <token>"
```

### **POST /api/auth/logout**
**User logout and session termination**

```bash
curl -X POST "http://localhost:8000/api/auth/logout" \
  -H "Authorization: Bearer <token>"
```

---

## ⚙️ **Settings & Configuration Endpoints**

### **GET /api/settings**
**Retrieve system configuration**

```bash
curl -X GET "http://localhost:8000/api/settings" \
  -H "X-API-Key: dev-api-key"
```

**Response Example:**
```json
{
  "status": "success",
  "data": {
    "system": {
      "app_name": "SecureNet",
      "theme": "dark",
      "auto_refresh": true,
      "refresh_interval": 30
    },
    "network_monitoring": {
      "enabled": true,
      "interval": 300,
      "timeout": 30,
      "interface": "auto",
      "ip_ranges": "192.168.1.0/24,10.0.0.0/8",
      "discovery_method": "ping_arp",
      "max_devices": 1000,
      "traffic_analysis": false,
      "packet_capture": false
    },
    "security_scanning": {
      "enabled": true,
      "interval": 3600,
      "severity_threshold": "medium"
    },
    "notifications": {
      "enabled": true,
      "email": "",
      "slack_webhook": ""
    }
  },
  "timestamp": "2025-06-11T17:38:00.886416"
}
```

### **PUT /api/settings**
**Update system configuration**

```bash
curl -X PUT "http://localhost:8000/api/settings" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key" \
  -d '{
    "network_monitoring": {
      "interval": 600,
      "ip_ranges": "192.168.1.0/24,192.168.2.0/24"
    }
  }'
```

---

## 🔧 **System Status Endpoints**

### **GET /api/health**
**System health check**

```bash
curl -X GET "http://localhost:8000/api/health"
```

**Response Example:**
```json
{
  "status": "healthy",
  "database": "connected",
  "network_scanner": "operational",
  "security_engine": "active",
  "uptime": "2h 45m 12s",
  "version": "2.1.0",
  "timestamp": "2025-06-11T17:38:00.886416"
}
```

### **GET /api/get-api-key**
**Generate or retrieve API key (authenticated users only)**

```bash
curl -X GET "http://localhost:8000/api/get-api-key" \
  -H "Authorization: Bearer <token>"
```

---

## 📡 **Real-Time WebSocket Endpoints**

### **WebSocket /ws/logs**
**Real-time log streaming**

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/logs');
ws.onmessage = function(event) {
  const logEntry = JSON.parse(event.data);
  console.log('New log:', logEntry);
};
```

### **WebSocket /ws/notifications**
**Real-time security notifications**

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/notifications');
ws.onmessage = function(event) {
  const notification = JSON.parse(event.data);
  console.log('Security alert:', notification);
};
```

---

## 🚫 **Error Handling**

### **Standard Error Responses**
```json
{
  "status": "error",
  "error": {
    "code": "INVALID_API_KEY",
    "message": "Invalid API Key in development mode",
    "details": "The provided API key is not valid for this environment"
  },
  "timestamp": "2025-06-11T17:38:00.886416"
}
```

### **Common Error Codes**
- `INVALID_API_KEY`: API key authentication failed
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `RESOURCE_NOT_FOUND`: Requested resource does not exist
- `RATE_LIMIT_EXCEEDED`: API rate limit exceeded
- `VALIDATION_ERROR`: Request data validation failed
- `NETWORK_SCAN_ERROR`: Network scanning operation failed
- `DATABASE_ERROR`: Database operation failed

---

## 📊 **Rate Limiting**

### **Current Limits**
- **Authentication**: 10 requests/minute
- **Network Scans**: 5 requests/minute
- **Security Scans**: 5 requests/minute
- **General API**: 30 requests/minute
- **Real-time endpoints**: 60 requests/minute

### **Rate Limit Headers**
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1641123456
```

---

## 🧪 **Testing & Examples**

### **Complete Network Discovery Test**
```bash
#!/bin/bash
# Test complete network discovery workflow

# 1. Trigger network scan
curl -X POST "http://localhost:8000/api/network/scan" -H "X-API-Key: dev-api-key"

# 2. Get discovered devices
curl -X GET "http://localhost:8000/api/network" -H "X-API-Key: dev-api-key"

# 3. Run security analysis
curl -X POST "http://localhost:8000/api/security/scan" -H "X-API-Key: dev-api-key"

# 4. Check security status
curl -X GET "http://localhost:8000/api/security" -H "X-API-Key: dev-api-key"
```

### **Production Monitoring Script**
```python
import requests
import time

api_key = "dev-api-key"
base_url = "http://localhost:8000"

def monitor_network():
    """Monitor network status and security"""
    
    # Get network status
    response = requests.get(f"{base_url}/api/network", 
                          headers={"X-API-Key": api_key})
    network_data = response.json()
    
    print(f"Devices: {network_data['data']['network_stats']['total_devices']}")
    print(f"Active: {network_data['data']['network_stats']['active_devices']}")
    
    # Get security status
    response = requests.get(f"{base_url}/api/security", 
                          headers={"X-API-Key": api_key})
    security_data = response.json()
    
    print(f"Security Score: {security_data['data']['metrics']['security_score']}")
    print(f"Threats: {security_data['data']['metrics']['critical_findings']}")

# Run monitoring
monitor_network()
```

---

**SecureNet API v2.1.0** - Complete production-ready REST API for real-time WiFi network security monitoring 🛡️

*Your network security platform is now equipped with comprehensive API access for all real-time monitoring and security analysis features.*