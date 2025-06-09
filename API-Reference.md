# 🔌 SecureNet API Reference

## Table of Contents
- [Authentication](#authentication)
- [WebSocket Endpoints](#websocket-endpoints)
- [REST Endpoints](#rest-endpoints)
  - [Dashboard & Statistics](#dashboard--statistics)
  - [Log Management](#log-management)
  - [Network Management](#network-management)
  - [Security Management](#security-management)
  - [Settings & Configuration](#settings--configuration)
- [WebSocket Connection Examples](#websocket-connection-examples)

## Authentication

All API endpoints require authentication using an API key. Include the API key in the request header:
```
X-API-Key: your-api-key
```

Example using curl:
```bash
curl -H "X-API-Key: your-api-key" http://localhost:8000/api/logs
```

## WebSocket Endpoints

SecureNet provides real-time updates through WebSocket connections. All WebSocket endpoints require the same API key authentication as REST endpoints.

| Endpoint | Description |
|----------|-------------|
| `/ws/notifications` | Real-time notifications for system events, alerts, and updates |
| `/ws/security` | Security scan updates and findings in real-time |
| `/ws/logs` | Live log streaming with filtering capabilities |

## REST Endpoints

### Dashboard & Statistics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stats/overview` | GET | Get comprehensive dashboard statistics |
| `/api/network/traffic` | GET | Get network traffic data and metrics |
| `/api/security/score` | GET | Get current security score and status |
| `/api/scan/start` | POST | Start a new network scan |
| `/api/security/scan` | POST | Start a new security scan |
| `/api/maintenance/schedule` | POST | Schedule system maintenance |
| `/api/reports/generate` | POST | Generate security reports |

### Log Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/logs` | GET | Get logs with filtering options |
| `/api/logs/stats` | GET | Get log statistics and metrics |
| `/api/logs/sources` | GET | Get configured log sources |
| `/api/logs/sources` | POST | Create a new log source |
| `/api/logs/sources/{source_id}` | PUT | Update an existing log source |
| `/api/logs/sources/{source_id}` | DELETE | Delete a log source |
| `/api/logs/sources/{source_id}/toggle` | POST | Toggle log source status |
| `/api/logs/search` | GET | Advanced log search with filters |
| `/api/logs/aggregate` | GET | Get log aggregation data |
| `/api/logs/export` | GET | Export logs in various formats |
| `/api/logs/patterns` | GET | Get detected log patterns |
| `/api/logs/trends` | GET | Get log trend analysis |

### Network Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/network/overview` | GET | Get network overview and status |
| `/api/network/connections` | GET | Get active network connections |
| `/api/network/connections/{connection_id}` | GET | Get specific connection details |
| `/api/network/connections/{connection_id}/block` | POST | Block a specific connection |
| `/api/network/stats` | GET | Get network statistics |
| `/api/network/protocols` | GET | Get protocol distribution data |
| `/api/network/history` | GET | Get connection history |
| `/api/network/devices` | GET | Get network device information |
| `/api/network/traffic` | GET | Get live network traffic data with filtering |
| `/api/network/traffic/stats` | GET | Get traffic statistics (total, inbound, outbound, blocked, flagged) |
| `/api/network/traffic/start` | POST | Start live traffic monitoring |
| `/api/network/traffic/stop` | POST | Stop live traffic monitoring |
| `/api/network/traffic/filter` | GET | Get filtered traffic logs by protocol, status, or application |

### Live Network Traffic Monitoring

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ws/network/traffic` | WebSocket | Real-time network traffic streaming |
| `/api/network/traffic/logs` | GET | Get paginated traffic logs with filtering options |
| `/api/network/traffic/export` | GET | Export traffic data in various formats (CSV, JSON) |

### Security Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/security/scans` | GET | List all security scans |
| `/api/security/scan` | POST | Start a new security scan |
| `/api/security/scan/{id}` | GET | Get scan details |
| `/api/security/scan/{id}/stop` | POST | Stop a running scan |
| `/api/security/scan/{id}/findings` | GET | Get scan findings |
| `/api/security/scan/{id}/findings/{finding_id}` | PUT | Update finding status |
| `/api/anomalies` | GET | Get all detected anomalies with filtering and pagination |
| `/api/anomalies/{anomaly_id}` | GET | Get specific anomaly details with ML insights |
| `/api/anomalies/{anomaly_id}/resolve` | POST | Resolve an anomaly |
| `/api/anomalies/{anomaly_id}/false-positive` | POST | Mark anomaly as false positive |
| `/api/anomalies/stats` | GET | Get anomaly statistics and metrics |
| `/api/anomalies/filter` | GET | Get filtered anomalies by severity, status, or type |
| `/api/anomalies/export` | GET | Export anomaly data in various formats |
| `/api/anomalies/analysis` | POST | Run new anomaly analysis |

### Settings & Configuration

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/settings` | GET | Get current system settings including network monitoring configuration |
| `/api/settings` | PUT | Update system settings with advanced network monitoring options |
| `/api/settings/api-key` | POST | Regenerate API key |

#### Advanced Network Monitoring Settings

The `/api/settings` endpoints now support comprehensive network monitoring configuration:

**Network Monitoring Configuration Options:**
- `network_monitoring.enabled` - Enable/disable network monitoring
- `network_monitoring.interval` - Monitoring interval in seconds (60-3600)
- `network_monitoring.timeout` - Connection timeout in seconds (5-120)
- `network_monitoring.interface` - Network interface selection (auto, eth0, wlan0, all)
- `network_monitoring.ip_ranges` - IP ranges to monitor (CIDR notation)
- `network_monitoring.discovery_method` - Device discovery method (ping_arp, ping_only, arp_only, passive)
- `network_monitoring.max_devices` - Maximum devices to track (10-10000)
- `network_monitoring.traffic_analysis` - Enable traffic analysis
- `network_monitoring.packet_capture` - Enable packet capture (requires privileges)
- `network_monitoring.capture_filter` - BPF filter expression for packet capture
- `network_monitoring.dns_monitoring` - Enable DNS query monitoring
- `network_monitoring.port_scan_detection` - Enable port scan detection
- `network_monitoring.bandwidth_threshold` - Bandwidth alert threshold in Mbps (1-10000)

**Example Settings Request:**
```json
{
  "network_monitoring": {
    "enabled": true,
    "interval": 300,
    "interface": "auto",
    "ip_ranges": "192.168.1.0/24,10.0.0.0/8",
    "discovery_method": "ping_arp",
    "traffic_analysis": true,
    "packet_capture": false,
    "dns_monitoring": true,
    "port_scan_detection": true,
    "bandwidth_threshold": 100
  }
}
```

## WebSocket Connection Examples

### JavaScript/TypeScript

```javascript
// Log updates
const ws = new WebSocket('ws://localhost:8000/ws/logs');
ws.onmessage = (event) => {
    console.log('New log:', JSON.parse(event.data));
};

// Notifications
const ws = new WebSocket('ws://localhost:8000/ws/notifications');
ws.onmessage = (event) => {
    console.log('New notification:', JSON.parse(event.data));
};

// Security updates
const ws = new WebSocket('ws://localhost:8000/ws/security');
ws.onmessage = (event) => {
    console.log('Security update:', JSON.parse(event.data));
};
```

### Python

```python
import websockets
import asyncio
import json

async def connect_to_logs():
    uri = "ws://localhost:8000/ws/logs"
    headers = {"X-API-Key": "your-api-key"}
    
    async with websockets.connect(uri, extra_headers=headers) as websocket:
        while True:
            try:
                message = await websocket.recv()
                log_data = json.loads(message)
                print(f"New log: {log_data}")
            except websockets.exceptions.ConnectionClosed:
                print("Connection closed")
                break

# Run the WebSocket client
asyncio.get_event_loop().run_until_complete(connect_to_logs())
```

## Response Formats

### Success Response
```json
{
    "status": "success",
    "data": {
        // Response data specific to the endpoint
    },
    "timestamp": "2024-03-14T12:00:00Z"
}
```

### Error Response
```json
{
    "status": "error",
    "error": {
        "code": "ERROR_CODE",
        "message": "Detailed error message"
    },
    "timestamp": "2024-03-14T12:00:00Z"
}
```

## Rate Limiting

API endpoints are subject to rate limiting to ensure system stability. The current limits are:

- REST API: 100 requests per minute per API key
- WebSocket: 1000 messages per minute per connection

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1615723200
```

---

<div align="center">
Last updated: 2024-03-14
</div> 