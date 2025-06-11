# 🔌 SecureNet API Reference

> Complete API documentation for SecureNet's **real-time network monitoring** platform

## Table of Contents
- [Authentication](#authentication)
- [WebSocket Endpoints](#websocket-endpoints)
- [REST Endpoints](#rest-endpoints)
  - [Real Network Monitoring](#real-network-monitoring)
  - [Live Device Discovery](#live-device-discovery)
  - [Dashboard & Statistics](#dashboard--statistics)
  - [Log Management](#log-management)
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
curl -H "X-API-Key: your-api-key" http://localhost:8000/api/network
```

## WebSocket Endpoints

SecureNet provides real-time updates through WebSocket connections for live network monitoring:

| Endpoint | Description |
|----------|-------------|
| `/ws/network` | **Real-time network device discovery updates** |
| `/ws/traffic` | **Live network traffic monitoring from actual interfaces** |
| `/ws/notifications` | Real-time notifications for system events, alerts, and network updates |
| `/ws/security` | Security scan updates and findings from real network analysis |
| `/ws/logs` | Live log streaming with network device filtering capabilities |

## REST Endpoints

### Real Network Monitoring

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/network` | GET | **Get real network overview with actual discovered devices** |
| `/api/network/scan` | POST | **Start live WiFi network scan** (discovers actual devices) |
| `/api/network/devices` | GET | **Get discovered network devices with MAC addresses** |
| `/api/network/devices/{device_id}` | GET | **Get specific device details with real network information** |

#### Live Network Discovery
The `/api/network` endpoint returns real network data:
```json
{
  "total_devices": 8,
  "active_devices": 8,
  "total_traffic": 286250,
  "devices": [
    {
      "id": "device-1",
      "name": "mynetwork",
      "ip": "192.168.2.1",
      "mac": "44:E9:DD:4C:7C:74",
      "device_type": "Router",
      "status": "online",
      "ports": [53, 80, 139, 443]
    },
    {
      "id": "device-17",
      "ip": "192.168.2.17",
      "mac": "F0:5C:77:75:DD:F6",
      "device_type": "Endpoint",
      "status": "online"
    }
  ]
}
```

### Live Device Discovery

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/network/scan` | POST | **Trigger real WiFi network scan** |
| `/api/network/interfaces` | GET | **Get available network interfaces for scanning** |
| `/api/network/ranges` | GET | **Get detected network ranges** (192.168.x.0/24, etc.) |
| `/api/network/devices/history` | GET | **Get device discovery history** |

#### Real Network Scanning
The `/api/network/scan` endpoint initiates actual network discovery:
```bash
curl -X POST -H "X-API-Key: your-api-key" http://localhost:8000/api/network/scan
```

Response:
```json
{
  "scan_id": "real_scan_1749675950",
  "status": "started",
  "network_ranges": ["192.168.2.0/24"],
  "discovery_method": "ping_arp_port_scan"
}
```

### Dashboard & Statistics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stats/overview` | GET | **Get dashboard statistics with real network data** |
| `/api/network/traffic` | GET | **Get actual network traffic data and metrics** |
| `/api/security/score` | GET | **Get security score based on real device analysis** |
| `/api/reports/generate` | POST | **Generate reports with actual network discovery data** |

#### Real Network Statistics
The `/api/stats/overview` endpoint provides actual network metrics:
```json
{
  "network": {
    "total_devices": 8,
    "active_devices": 8,
    "router_devices": 1,
    "endpoint_devices": 7,
    "total_traffic_bytes": 286250,
    "scan_timestamp": "2025-06-11T17:01:50.000Z"
  },
  "security": {
    "vulnerabilities_found": 0,
    "open_ports_detected": 5,
    "security_score": 85
  }
}
```

### Log Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/logs` | GET | **Get logs with network device filtering options** |
| `/api/logs/network` | GET | **Get network-specific logs from device discovery** |
| `/api/logs/devices/{device_id}` | GET | **Get logs for specific discovered device** |
| `/api/logs/search` | GET | **Advanced log search with network device filters** |

### Live Network Traffic Monitoring

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/network/traffic` | GET | **Get real network traffic data with device correlation** |
| `/api/network/traffic/stats` | GET | **Get actual traffic statistics from network interfaces** |
| `/api/network/connections` | GET | **Get real active network connections** |
| `/api/network/protocols` | GET | **Get actual protocol distribution from traffic analysis** |

#### Real Traffic Analysis
```bash
curl -H "X-API-Key: your-api-key" "http://localhost:8000/api/network/traffic"
```

Response with actual network data:
```json
{
  "traffic_stats": {
    "total_bytes": 286250,
    "inbound_bytes": 143125,
    "outbound_bytes": 143125,
    "active_connections": 8
  },
  "device_traffic": [
    {
      "device_id": "device-1",
      "ip": "192.168.2.1",
      "mac": "44:E9:DD:4C:7C:74",
      "bytes_sent": 50000,
      "bytes_received": 45000
    }
  ]
}
```

### Security Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/security/scans` | GET | **List security scans on real discovered devices** |
| `/api/security/scan` | POST | **Start security scan on actual network devices** |
| `/api/security/devices/{device_id}/scan` | POST | **Scan specific discovered device for vulnerabilities** |
| `/api/anomalies` | GET | **Get anomalies detected from real network monitoring** |

### Settings & Configuration

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/settings` | GET | **Get system settings including real network monitoring configuration** |
| `/api/settings` | PUT | **Update settings with network scanning parameters** |
| `/api/settings/network` | GET | **Get network monitoring specific settings** |
| `/api/settings/network` | PUT | **Update real network scanning configuration** |

#### Real Network Monitoring Configuration

The `/api/settings/network` endpoint supports comprehensive real network scanning configuration:

**Network Monitoring Configuration Options:**
- `enabled` - Enable/disable real network monitoring
- `scan_interval` - Device discovery interval in seconds (60-3600)
- `timeout` - Network scan timeout in seconds (5-120)
- `interface` - Network interface selection (auto, eth0, wlan0, all)
- `network_ranges` - IP ranges to scan (CIDR notation)
- `discovery_method` - Device discovery method (ping_arp, ping_only, arp_only)
- `port_scanning` - Enable port scanning on discovered devices
- `max_devices` - Maximum devices to track (10-10000)
- `concurrent_scans` - Number of concurrent scanning threads (10-100)

**Example Real Network Settings Request:**
```json
{
  "network_monitoring": {
    "enabled": true,
    "scan_interval": 300,
    "interface": "auto",
    "network_ranges": ["192.168.2.0/24"],
    "discovery_method": "ping_arp",
    "port_scanning": true,
    "max_devices": 100,
    "concurrent_scans": 50
  }
}
```

**Response with Actual Network Interface Detection:**
```json
{
  "status": "updated",
  "detected_interfaces": ["en0", "en1", "lo0"],
  "active_interface": "en0",
  "network_ranges": ["192.168.2.0/24"],
  "discovery_capabilities": {
    "ping_available": true,
    "arp_available": true,
    "port_scan_available": true,
    "requires_privileges": false
  }
}
```

## WebSocket Connection Examples

### Real-time Network Device Discovery

```javascript
// Real-time network device updates
const networkWs = new WebSocket('ws://localhost:8000/ws/network');
networkWs.onmessage = (event) => {
    const networkData = JSON.parse(event.data);
    console.log('New device discovered:', networkData.device);
    console.log('Total devices:', networkData.total_devices);
    console.log('MAC address:', networkData.device.mac);
};

// Live traffic monitoring from actual network
const trafficWs = new WebSocket('ws://localhost:8000/ws/traffic');
trafficWs.onmessage = (event) => {
    const trafficData = JSON.parse(event.data);
    console.log('Real traffic update:', trafficData);
    console.log('Bytes transferred:', trafficData.bytes);
    console.log('Source device:', trafficData.source_device);
};
```

### Python Real Network Monitoring

```python
import websockets
import asyncio
import json

async def monitor_real_network():
    uri = "ws://localhost:8000/ws/network"
    headers = {"X-API-Key": "your-api-key"}
    
    async with websockets.connect(uri, extra_headers=headers) as websocket:
        while True:
            try:
                message = await websocket.recv()
                network_data = json.loads(message)
                print(f"Device discovered: {network_data['device']['ip']}")
                print(f"MAC address: {network_data['device']['mac']}")
                print(f"Device type: {network_data['device']['device_type']}")
                print(f"Total devices: {network_data['total_devices']}")
            except websockets.exceptions.ConnectionClosed:
                print("Connection closed")
                break

# Start real network monitoring
asyncio.run(monitor_real_network())
```

### cURL Examples for Real Network API

```bash
# Start real WiFi network scan
curl -X POST \
  -H "X-API-Key: your-api-key" \
  http://localhost:8000/api/network/scan

# Get discovered devices with real MAC addresses
curl -H "X-API-Key: your-api-key" \
  http://localhost:8000/api/network/devices

# Get actual network traffic statistics
curl -H "X-API-Key: your-api-key" \
  http://localhost:8000/api/network/traffic/stats

# Get real network interface information
curl -H "X-API-Key: your-api-key" \
  http://localhost:8000/api/network/interfaces
```

## Response Formats

### Success Response
```