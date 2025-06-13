✅ **Integrated in Phase 3** – See [phase guide](../integration/phase-3-advanced-tooling.md)

# Locust - Load Testing

Locust is an easy-to-use, scriptable and scalable performance testing tool that allows you to define user behavior with Python code and swarm your system with millions of simultaneous users.

## 🎯 Purpose for SecureNet

- **Performance Testing** - Test API performance under load
- **Scalability Validation** - Verify system scales with user growth
- **Bottleneck Identification** - Find performance bottlenecks
- **Capacity Planning** - Determine system capacity limits
- **Real-world Simulation** - Simulate realistic user behavior patterns

## 📦 Installation

```bash
pip install locust
```

## 🔧 Integration

### Core Load Testing Setup

**File**: `tests/load_tests/locustfile.py`

```python
from locust import HttpUser, task, between, events
import random
import json
import time
from typing import Dict, List
import structlog

logger = structlog.get_logger()

class SecureNetUser(HttpUser):
    """Simulates a typical SecureNet user"""
    
    wait_time = between(1, 5)  # Wait 1-5 seconds between tasks
    
    def on_start(self):
        """Called when a user starts - handles login"""
        self.login()
        self.tenant_id = f"tenant_{random.randint(1, 100)}"
        
    def login(self):
        """Authenticate user and get access token"""
        login_data = {
            "username": f"user_{random.randint(1, 1000)}",
            "password": "test_password"
        }
        
        with self.client.post("/api/auth/login", json=login_data, catch_response=True) as response:
            if response.status_code == 200:
                try:
                    self.token = response.json()["access_token"]
                    self.headers = {"Authorization": f"Bearer {self.token}"}
                    response.success()
                except (KeyError, json.JSONDecodeError):
                    response.failure("Failed to parse login response")
            else:
                response.failure(f"Login failed with status {response.status_code}")
    
    @task(3)
    def view_dashboard(self):
        """Most common task - viewing dashboard"""
        with self.client.get("/api/dashboard", headers=self.headers, catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 401:
                response.failure("Authentication failed")
                self.login()  # Re-authenticate
            else:
                response.failure(f"Dashboard request failed: {response.status_code}")
    
    @task(2)
    def check_threats(self):
        """Check current threats"""
        params = {"tenant_id": self.tenant_id, "limit": 50}
        
        with self.client.get("/api/threats", params=params, headers=self.headers, catch_response=True) as response:
            if response.status_code == 200:
                try:
                    threats = response.json()
                    threat_count = len(threats.get("threats", []))
                    
                    # Record custom metric
                    events.request.fire(
                        request_type="CUSTOM",
                        name="threats_found",
                        response_time=response.elapsed.total_seconds() * 1000,
                        response_length=threat_count
                    )
                    
                    response.success()
                except json.JSONDecodeError:
                    response.failure("Invalid JSON response")
            else:
                response.failure(f"Threats request failed: {response.status_code}")
    
    @task(2)
    def view_devices(self):
        """View network devices"""
        params = {"tenant_id": self.tenant_id}
        
        with self.client.get("/api/devices", params=params, headers=self.headers, catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Devices request failed: {response.status_code}")
    
    @task(1)
    def run_vulnerability_scan(self):
        """Trigger vulnerability scan - less frequent but resource intensive"""
        scan_data = {
            "scan_type": "vulnerability",
            "target": f"192.168.{random.randint(1, 10)}.0/24",
            "tenant_id": self.tenant_id
        }
        
        with self.client.post("/api/scans", json=scan_data, headers=self.headers, catch_response=True) as response:
            if response.status_code in [200, 201, 202]:  # Accept async responses
                response.success()
            elif response.status_code == 429:  # Rate limited
                response.failure("Rate limited - scan rejected")
            else:
                response.failure(f"Scan request failed: {response.status_code}")
    
    @task(1)
    def check_scan_results(self):
        """Check results of previous scans"""
        params = {"tenant_id": self.tenant_id, "status": "completed"}
        
        with self.client.get("/api/scans", params=params, headers=self.headers, catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Scan results request failed: {response.status_code}")
    
    @task(1)
    def update_settings(self):
        """Update user/tenant settings"""
        settings_data = {
            "notification_preferences": {
                "email": random.choice([True, False]),
                "slack": random.choice([True, False])
            },
            "scan_frequency": random.choice(["hourly", "daily", "weekly"])
        }
        
        with self.client.put("/api/settings", json=settings_data, headers=self.headers, catch_response=True) as response:
            if response.status_code in [200, 204]:
                response.success()
            else:
                response.failure(f"Settings update failed: {response.status_code}")

class AdminUser(HttpUser):
    """Simulates admin user with different behavior patterns"""
    
    wait_time = between(2, 8)
    weight = 1  # Lower weight = fewer admin users
    
    def on_start(self):
        """Admin login"""
        login_data = {
            "username": "admin",
            "password": "admin_password"
        }
        
        with self.client.post("/api/auth/login", json=login_data) as response:
            if response.status_code == 200:
                self.token = response.json()["access_token"]
                self.headers = {"Authorization": f"Bearer {self.token}"}
    
    @task(2)
    def view_admin_dashboard(self):
        """Admin-specific dashboard"""
        with self.client.get("/api/admin/dashboard", headers=self.headers, catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Admin dashboard failed: {response.status_code}")
    
    @task(2)
    def manage_tenants(self):
        """View and manage tenants"""
        with self.client.get("/api/admin/tenants", headers=self.headers, catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Tenant management failed: {response.status_code}")
    
    @task(1)
    def view_system_metrics(self):
        """View system-wide metrics"""
        with self.client.get("/api/admin/metrics", headers=self.headers, catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"System metrics failed: {response.status_code}")
    
    @task(1)
    def audit_logs(self):
        """View audit logs"""
        params = {"limit": 100, "days": 7}
        
        with self.client.get("/api/admin/audit", params=params, headers=self.headers, catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Audit logs failed: {response.status_code}")

class HighVolumeUser(HttpUser):
    """Simulates high-volume API usage (automated systems)"""
    
    wait_time = between(0.1, 0.5)  # Very fast requests
    weight = 2
    
    def on_start(self):
        """API key authentication for automated systems"""
        self.headers = {"X-API-Key": "automated_system_key"}
    
    @task(5)
    def stream_threat_data(self):
        """Continuous threat data streaming"""
        with self.client.get("/api/threats/stream", headers=self.headers, catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Threat stream failed: {response.status_code}")
    
    @task(3)
    def bulk_device_update(self):
        """Bulk device status updates"""
        device_updates = [
            {"device_id": f"device_{i}", "status": "online", "last_seen": time.time()}
            for i in range(random.randint(10, 50))
        ]
        
        with self.client.post("/api/devices/bulk", json={"updates": device_updates}, headers=self.headers, catch_response=True) as response:
            if response.status_code in [200, 202]:
                response.success()
            else:
                response.failure(f"Bulk update failed: {response.status_code}")
    
    @task(2)
    def submit_network_data(self):
        """Submit network monitoring data"""
        network_data = {
            "timestamp": time.time(),
            "source": f"sensor_{random.randint(1, 100)}",
            "data": [
                {
                    "src_ip": f"192.168.1.{random.randint(1, 254)}",
                    "dst_ip": f"10.0.0.{random.randint(1, 254)}",
                    "bytes": random.randint(64, 1500),
                    "protocol": random.choice(["TCP", "UDP", "ICMP"])
                }
                for _ in range(random.randint(1, 20))
            ]
        }
        
        with self.client.post("/api/network/data", json=network_data, headers=self.headers, catch_response=True) as response:
            if response.status_code in [200, 201, 202]:
                response.success()
            else:
                response.failure(f"Network data submission failed: {response.status_code}")
```

### Advanced Load Testing Scenarios

**File**: `tests/load_tests/stress_test.py`

```python
from locust import HttpUser, task, between, events
from locust.env import Environment
from locust.stats import stats_printer, stats_history
from locust.log import setup_logging
import gevent
import time
import json
import random
from typing import Dict, List

class StressTestUser(HttpUser):
    """Stress testing with extreme load patterns"""
    
    wait_time = between(0.01, 0.1)  # Very aggressive timing
    
    def on_start(self):
        self.login()
    
    def login(self):
        """Quick login for stress testing"""
        login_data = {"username": f"stress_user_{random.randint(1, 10000)}", "password": "password"}
        response = self.client.post("/api/auth/login", json=login_data)
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
    
    @task(10)
    def rapid_dashboard_requests(self):
        """Rapid dashboard requests to test caching"""
        self.client.get("/api/dashboard", headers=self.headers)
    
    @task(5)
    def concurrent_threat_checks(self):
        """Concurrent threat checking"""
        self.client.get("/api/threats", headers=self.headers)
    
    @task(3)
    def memory_intensive_scan(self):
        """Memory-intensive scan requests"""
        scan_data = {
            "scan_type": "deep_scan",
            "target": f"10.{random.randint(0, 255)}.0.0/16",  # Large network
            "options": {
                "deep_analysis": True,
                "full_port_scan": True,
                "vulnerability_detection": True
            }
        }
        self.client.post("/api/scans", json=scan_data, headers=self.headers)
    
    @task(2)
    def large_data_upload(self):
        """Upload large datasets"""
        large_data = {
            "network_logs": [
                {
                    "timestamp": time.time() - i,
                    "source": f"192.168.1.{random.randint(1, 254)}",
                    "destination": f"10.0.0.{random.randint(1, 254)}",
                    "data": "x" * 1000  # 1KB per entry
                }
                for i in range(100)  # 100KB total
            ]
        }
        self.client.post("/api/data/upload", json=large_data, headers=self.headers)

class SpikeTestUser(HttpUser):
    """Simulates traffic spikes"""
    
    wait_time = between(0.1, 1.0)
    
    def on_start(self):
        self.login()
        self.spike_mode = False
    
    def login(self):
        login_data = {"username": f"spike_user_{random.randint(1, 1000)}", "password": "password"}
        response = self.client.post("/api/auth/login", json=login_data)
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
    
    @task
    def adaptive_load(self):
        """Adaptive load based on time"""
        current_time = time.time()
        
        # Create traffic spikes every 60 seconds
        if int(current_time) % 60 < 10:  # First 10 seconds of each minute
            self.spike_mode = True
            self.wait_time = between(0.01, 0.1)  # Very fast
        else:
            self.spike_mode = False
            self.wait_time = between(1, 3)  # Normal speed
        
        if self.spike_mode:
            # During spike - hit multiple endpoints rapidly
            endpoints = ["/api/dashboard", "/api/threats", "/api/devices"]
            for endpoint in endpoints:
                self.client.get(endpoint, headers=self.headers)
        else:
            # Normal operation
            self.client.get("/api/dashboard", headers=self.headers)

# Custom event handlers for detailed monitoring
@events.request.add_listener
def on_request(request_type, name, response_time, response_length, exception, context, **kwargs):
    """Custom request monitoring"""
    if exception:
        logger.error(f"Request failed: {name} - {exception}")
    
    # Log slow requests
    if response_time > 2000:  # 2 seconds
        logger.warning(f"Slow request detected: {name} took {response_time}ms")

@events.user_error.add_listener
def on_user_error(user_instance, exception, tb, **kwargs):
    """Handle user errors"""
    logger.error(f"User error: {exception}")

# Performance monitoring functions
def monitor_system_resources():
    """Monitor system resources during load test"""
    import psutil
    
    while True:
        cpu_percent = psutil.cpu_percent(interval=1)
        memory_percent = psutil.virtual_memory().percent
        
        # Log resource usage
        events.request.fire(
            request_type="SYSTEM",
            name="cpu_usage",
            response_time=0,
            response_length=cpu_percent
        )
        
        events.request.fire(
            request_type="SYSTEM", 
            name="memory_usage",
            response_time=0,
            response_length=memory_percent
        )
        
        gevent.sleep(5)  # Check every 5 seconds

# Custom load test runner
def run_custom_load_test():
    """Run custom load test with monitoring"""
    setup_logging("INFO", None)
    
    # Setup environment
    env = Environment(user_classes=[SecureNetUser, AdminUser])
    env.create_local_runner()
    
    # Start monitoring
    gevent.spawn(monitor_system_resources)
    gevent.spawn(stats_printer(env.stats))
    gevent.spawn(stats_history, env.runner)
    
    # Start load test
    env.runner.start(user_count=100, spawn_rate=10)
    
    # Run for 5 minutes
    gevent.sleep(300)
    
    # Stop test
    env.runner.quit()
    
    # Print final stats
    print("\n=== FINAL STATISTICS ===")
    print(f"Total requests: {env.stats.total.num_requests}")
    print(f"Failed requests: {env.stats.total.num_failures}")
    print(f"Average response time: {env.stats.total.avg_response_time:.2f}ms")
    print(f"95th percentile: {env.stats.total.get_response_time_percentile(0.95):.2f}ms")

if __name__ == "__main__":
    run_custom_load_test()
```

### Realistic User Scenarios

**File**: `tests/load_tests/realistic_scenarios.py`

```python
from locust import HttpUser, task, between, SequentialTaskSet
import random
import time
import json

class SecurityAnalystWorkflow(SequentialTaskSet):
    """Realistic security analyst workflow"""
    
    @task
    def morning_routine(self):
        """Morning security check routine"""
        # Check overnight alerts
        self.client.get("/api/alerts?since=24h", headers=self.user.headers)
        
        # Review threat dashboard
        self.client.get("/api/dashboard", headers=self.user.headers)
        
        # Check critical threats
        self.client.get("/api/threats?severity=critical", headers=self.user.headers)
        
        # Review scan results
        self.client.get("/api/scans?status=completed&since=24h", headers=self.user.headers)
    
    @task
    def investigate_threat(self):
        """Investigate a specific threat"""
        # Get threat details
        threat_id = f"threat_{random.randint(1, 1000)}"
        self.client.get(f"/api/threats/{threat_id}", headers=self.user.headers)
        
        # Get related network data
        self.client.get(f"/api/threats/{threat_id}/network-data", headers=self.user.headers)
        
        # Check affected devices
        self.client.get(f"/api/threats/{threat_id}/devices", headers=self.user.headers)
        
        # Update threat status
        update_data = {"status": "investigating", "assigned_to": "analyst_1"}
        self.client.put(f"/api/threats/{threat_id}", json=update_data, headers=self.user.headers)
    
    @task
    def run_targeted_scan(self):
        """Run a targeted security scan"""
        scan_data = {
            "scan_type": "targeted_vulnerability",
            "target": f"192.168.{random.randint(1, 10)}.{random.randint(1, 254)}",
            "priority": "high",
            "scan_options": {
                "port_scan": True,
                "vulnerability_scan": True,
                "compliance_check": True
            }
        }
        
        # Start scan
        response = self.client.post("/api/scans", json=scan_data, headers=self.user.headers)
        
        if response.status_code in [200, 201]:
            scan_id = response.json().get("scan_id")
            
            # Monitor scan progress
            for _ in range(5):
                time.sleep(2)
                self.client.get(f"/api/scans/{scan_id}/status", headers=self.user.headers)
    
    @task
    def generate_report(self):
        """Generate security report"""
        report_data = {
            "report_type": "weekly_summary",
            "date_range": {
                "start": time.time() - (7 * 24 * 3600),  # 7 days ago
                "end": time.time()
            },
            "include_sections": ["threats", "vulnerabilities", "compliance"]
        }
        
        self.client.post("/api/reports", json=report_data, headers=self.user.headers)

class ITAdminWorkflow(SequentialTaskSet):
    """IT Administrator workflow"""
    
    @task
    def system_health_check(self):
        """Check system health and performance"""
        # System metrics
        self.client.get("/api/admin/metrics", headers=self.user.headers)
        
        # Service status
        self.client.get("/api/admin/services/status", headers=self.user.headers)
        
        # Resource usage
        self.client.get("/api/admin/resources", headers=self.user.headers)
    
    @task
    def user_management(self):
        """Manage users and permissions"""
        # List users
        self.client.get("/api/admin/users", headers=self.user.headers)
        
        # Check user activity
        self.client.get("/api/admin/users/activity", headers=self.user.headers)
        
        # Update user permissions
        user_id = f"user_{random.randint(1, 100)}"
        permission_data = {
            "permissions": ["read_threats", "run_scans"],
            "role": "analyst"
        }
        self.client.put(f"/api/admin/users/{user_id}/permissions", json=permission_data, headers=self.user.headers)
    
    @task
    def tenant_management(self):
        """Manage tenant configurations"""
        # List tenants
        self.client.get("/api/admin/tenants", headers=self.user.headers)
        
        # Check tenant usage
        self.client.get("/api/admin/tenants/usage", headers=self.user.headers)
        
        # Update tenant settings
        tenant_id = f"tenant_{random.randint(1, 50)}"
        settings_data = {
            "scan_limits": {"daily": 100, "monthly": 3000},
            "retention_days": 90
        }
        self.client.put(f"/api/admin/tenants/{tenant_id}/settings", json=settings_data, headers=self.user.headers)

class RealisticSecureNetUser(HttpUser):
    """Realistic user combining different workflows"""
    
    wait_time = between(5, 15)  # Realistic thinking time
    
    def on_start(self):
        self.login()
        
        # Assign user role
        self.role = random.choice(["analyst", "admin", "viewer"])
        
        if self.role == "analyst":
            self.tasks = [SecurityAnalystWorkflow]
        elif self.role == "admin":
            self.tasks = [ITAdminWorkflow]
        else:
            self.tasks = [ViewerWorkflow]
    
    def login(self):
        """Role-based login"""
        credentials = {
            "analyst": {"username": f"analyst_{random.randint(1, 50)}", "password": "analyst_pass"},
            "admin": {"username": f"admin_{random.randint(1, 10)}", "password": "admin_pass"},
            "viewer": {"username": f"viewer_{random.randint(1, 100)}", "password": "viewer_pass"}
        }
        
        role = random.choice(["analyst", "admin", "viewer"])
        login_data = credentials[role]
        
        response = self.client.post("/api/auth/login", json=login_data)
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}

class ViewerWorkflow(SequentialTaskSet):
    """Read-only viewer workflow"""
    
    @task
    def browse_dashboard(self):
        """Browse various dashboards"""
        dashboards = ["overview", "threats", "network", "compliance"]
        
        for dashboard in dashboards:
            self.client.get(f"/api/dashboard/{dashboard}", headers=self.user.headers)
            time.sleep(random.uniform(2, 5))  # Reading time
    
    @task
    def view_reports(self):
        """View existing reports"""
        # List available reports
        self.client.get("/api/reports", headers=self.user.headers)
        
        # View specific reports
        for _ in range(3):
            report_id = f"report_{random.randint(1, 100)}"
            self.client.get(f"/api/reports/{report_id}", headers=self.user.headers)
    
    @task
    def search_data(self):
        """Search through security data"""
        search_terms = ["malware", "intrusion", "vulnerability", "compliance"]
        
        for term in random.sample(search_terms, 2):
            params = {"q": term, "limit": 20}
            self.client.get("/api/search", params=params, headers=self.user.headers)
```

## 🚀 Usage Examples

### Basic Load Testing

```bash
# Run basic load test
locust -f tests/load_tests/locustfile.py --host=http://localhost:8000

# Run with specific user count and spawn rate
locust -f tests/load_tests/locustfile.py --host=http://localhost:8000 -u 100 -r 10

# Run headless (no web UI)
locust -f tests/load_tests/locustfile.py --host=http://localhost:8000 -u 50 -r 5 -t 300s --headless
```

### Advanced Scenarios

```bash
# Run stress test
locust -f tests/load_tests/stress_test.py --host=http://localhost:8000 -u 500 -r 50

# Run realistic scenarios
locust -f tests/load_tests/realistic_scenarios.py --host=http://localhost:8000 -u 30 -r 3

# Run with custom configuration
locust -f tests/load_tests/locustfile.py --host=http://localhost:8000 --config=locust.conf
```

### Configuration File

**File**: `locust.conf`

```ini
[settings]
host = http://localhost:8000
users = 100
spawn-rate = 10
run-time = 600s
headless = true
html = reports/load_test_report.html
csv = reports/load_test_results
```

## ✅ Validation Steps

1. **Install Locust**:
   ```bash
   pip install locust
   ```

2. **Test Basic Setup**:
   ```bash
   locust -f tests/load_tests/locustfile.py --host=http://localhost:8000 -u 1 -r 1 -t 10s --headless
   ```

3. **Run Web UI Test**:
   ```bash
   locust -f tests/load_tests/locustfile.py --host=http://localhost:8000
   # Open http://localhost:8089
   ```

4. **Generate Report**:
   ```bash
   locust -f tests/load_tests/locustfile.py --host=http://localhost:8000 -u 50 -r 5 -t 60s --headless --html=report.html
   ```

## 📈 Benefits for SecureNet

- **Performance Validation** - Ensure API can handle expected load
- **Scalability Planning** - Determine when to scale infrastructure
- **Bottleneck Identification** - Find performance bottlenecks before production
- **Realistic Testing** - Simulate real user behavior patterns
- **Capacity Planning** - Understand system limits and plan accordingly
- **SLA Validation** - Verify system meets performance requirements

## 🔗 Related Documentation

- [Phase 3: Advanced Tooling](../integration/phase-3-advanced-tooling.md)
- [Testing Framework Guide](README.md)
- [Schemathesis Integration](schemathesis.md) 