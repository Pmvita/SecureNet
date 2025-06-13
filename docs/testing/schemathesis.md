✅ **Integrated in Phase 3** – See [phase guide](../integration/phase-3-advanced-tooling.md)

# Schemathesis - API Fuzzing & Testing

Schemathesis is a modern API testing tool that automatically generates test cases based on your OpenAPI/Swagger schema and finds bugs in your API implementation.

## 🎯 Purpose for SecureNet

- **API Security Testing** - Automatically find security vulnerabilities
- **Schema Validation** - Ensure API responses match OpenAPI specification
- **Edge Case Discovery** - Generate test cases for boundary conditions
- **Regression Testing** - Catch API breaking changes automatically
- **Compliance Testing** - Verify API adheres to security standards

## 📦 Installation

```bash
pip install schemathesis
```

## 🔧 Integration

### Basic API Fuzzing Setup

**File**: `tests/api_fuzzing/test_api_security.py`

```python
import schemathesis
import pytest
from hypothesis import settings
import requests
from typing import Dict, Any
import structlog

logger = structlog.get_logger()

# Load schema from running API
schema = schemathesis.from_uri("http://localhost:8000/openapi.json")

# Alternative: Load from file
# schema = schemathesis.from_path("openapi.yaml")

@schema.parametrize()
@settings(max_examples=100, deadline=30000)  # 30 second timeout
def test_api_endpoints_fuzzing(case):
    """Comprehensive fuzzing of all API endpoints"""
    
    # Execute the test case
    response = case.call()
    
    # Basic security checks
    assert response.status_code != 500, "Server should not return 500 errors"
    assert 'password' not in response.text.lower(), "Response should not contain passwords"
    assert 'secret' not in response.text.lower(), "Response should not contain secrets"
    assert 'token' not in response.text.lower() or response.status_code == 401, "Tokens should only appear in auth contexts"
    
    # Validate response against schema
    case.validate_response(response)

@schema.parametrize(endpoint="/api/auth/login")
@settings(max_examples=50)
def test_auth_endpoint_security(case):
    """Focused security testing for authentication endpoints"""
    
    response = case.call()
    
    # Authentication-specific security checks
    assert response.status_code in [200, 400, 401, 422], f"Unexpected status code: {response.status_code}"
    
    # Check for information disclosure
    if response.status_code == 400:
        assert 'password' not in response.text.lower(), "Error messages should not contain password info"
        assert 'username' not in response.text.lower(), "Error messages should not contain username info"
    
    # Check response headers
    assert 'X-Powered-By' not in response.headers, "Should not expose server technology"
    assert 'Server' not in response.headers or 'nginx' in response.headers.get('Server', ''), "Should not expose detailed server info"
    
    case.validate_response(response)

@schema.parametrize(endpoint="/api/threats")
@settings(max_examples=30)
def test_threats_endpoint_authorization(case):
    """Test authorization on threat detection endpoints"""
    
    # Test without authentication
    response = case.call()
    
    if response.status_code == 200:
        # If endpoint allows unauthenticated access, ensure no sensitive data
        response_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
        
        if isinstance(response_data, dict) and 'threats' in response_data:
            for threat in response_data.get('threats', []):
                assert 'internal_ip' not in str(threat).lower(), "Should not expose internal IPs"
                assert 'admin' not in str(threat).lower(), "Should not expose admin information"
    
    case.validate_response(response)

class TestAPISecurityPatterns:
    """Custom security pattern tests"""
    
    @pytest.mark.parametrize("endpoint", [
        "/api/admin/users",
        "/api/admin/tenants", 
        "/api/admin/billing",
        "/api/admin/audit"
    ])
    def test_admin_endpoints_require_auth(self, endpoint):
        """Ensure admin endpoints require proper authentication"""
        
        # Test without auth
        response = requests.get(f"http://localhost:8000{endpoint}")
        assert response.status_code in [401, 403], f"Admin endpoint {endpoint} should require authentication"
        
        # Test with invalid token
        headers = {"Authorization": "Bearer invalid_token"}
        response = requests.get(f"http://localhost:8000{endpoint}", headers=headers)
        assert response.status_code in [401, 403], f"Admin endpoint {endpoint} should reject invalid tokens"
    
    def test_sql_injection_patterns(self):
        """Test for SQL injection vulnerabilities"""
        
        sql_payloads = [
            "'; DROP TABLE users; --",
            "' OR '1'='1",
            "' UNION SELECT * FROM users --",
            "'; INSERT INTO users VALUES ('hacker', 'password'); --"
        ]
        
        endpoints_with_params = [
            "/api/threats?tenant_id={}",
            "/api/devices?search={}",
            "/api/vulnerabilities?cve_id={}"
        ]
        
        for endpoint_template in endpoints_with_params:
            for payload in sql_payloads:
                endpoint = endpoint_template.format(payload)
                response = requests.get(f"http://localhost:8000{endpoint}")
                
                # Should not return 500 (indicates potential SQL error)
                assert response.status_code != 500, f"Potential SQL injection vulnerability at {endpoint}"
                
                # Response should not contain SQL error messages
                response_text = response.text.lower()
                sql_errors = ['syntax error', 'mysql', 'postgresql', 'sqlite', 'ora-', 'sql server']
                for error in sql_errors:
                    assert error not in response_text, f"SQL error message detected: {error}"
    
    def test_xss_protection(self):
        """Test for XSS vulnerabilities"""
        
        xss_payloads = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "';alert('xss');//"
        ]
        
        endpoints_with_input = [
            "/api/devices",
            "/api/threats",
            "/api/scan"
        ]
        
        for endpoint in endpoints_with_input:
            for payload in xss_payloads:
                # Test in query parameters
                response = requests.get(f"http://localhost:8000{endpoint}?search={payload}")
                
                # Response should not contain unescaped payload
                assert payload not in response.text, f"Potential XSS vulnerability: unescaped payload in response"
                
                # Test in POST data
                if endpoint in ["/api/scan"]:
                    response = requests.post(
                        f"http://localhost:8000{endpoint}",
                        json={"target": payload}
                    )
                    assert payload not in response.text, f"Potential XSS vulnerability in POST response"
```

### Advanced Security Testing

**File**: `tests/api_fuzzing/test_advanced_security.py`

```python
import schemathesis
from schemathesis.checks import not_a_server_error, status_code_conformance, response_schema_conformance
from hypothesis import strategies as st, settings
import requests
import json
from typing import List, Dict
import structlog

logger = structlog.get_logger()

# Custom schema with security-focused configuration
schema = schemathesis.from_uri(
    "http://localhost:8000/openapi.json",
    validate_schema=True,
    base_url="http://localhost:8000"
)

# Custom checks for security testing
def check_no_sensitive_data_exposure(response, case):
    """Check that responses don't expose sensitive data"""
    sensitive_patterns = [
        'password', 'secret', 'private_key', 'api_key',
        'database_url', 'connection_string', 'jwt_secret'
    ]
    
    response_text = response.text.lower()
    for pattern in sensitive_patterns:
        if pattern in response_text and response.status_code == 200:
            raise AssertionError(f"Sensitive data pattern '{pattern}' found in response")

def check_security_headers(response, case):
    """Check for essential security headers"""
    required_headers = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': ['DENY', 'SAMEORIGIN'],
        'X-XSS-Protection': '1; mode=block'
    }
    
    for header, expected_values in required_headers.items():
        if header not in response.headers:
            logger.warning(f"Missing security header: {header}")
            continue
            
        actual_value = response.headers[header]
        if isinstance(expected_values, list):
            if actual_value not in expected_values:
                logger.warning(f"Unexpected value for {header}: {actual_value}")
        else:
            if actual_value != expected_values:
                logger.warning(f"Unexpected value for {header}: {actual_value}")

def check_rate_limiting(response, case):
    """Check for rate limiting headers"""
    rate_limit_headers = ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Retry-After']
    
    if response.status_code == 429:  # Too Many Requests
        has_rate_limit_header = any(header in response.headers for header in rate_limit_headers)
        if not has_rate_limit_header:
            raise AssertionError("Rate limited response should include rate limiting headers")

# Register custom checks
schemathesis.register_check(check_no_sensitive_data_exposure)
schemathesis.register_check(check_security_headers)
schemathesis.register_check(check_rate_limiting)

@schema.parametrize()
@settings(max_examples=200, deadline=60000)
def test_comprehensive_api_security(case):
    """Comprehensive security testing with custom checks"""
    
    response = case.call_and_validate(
        checks=[
            not_a_server_error,
            status_code_conformance,
            response_schema_conformance,
            check_no_sensitive_data_exposure,
            check_security_headers,
            check_rate_limiting
        ]
    )

@schema.parametrize(method="POST")
@settings(max_examples=100)
def test_post_endpoints_security(case):
    """Focused testing on POST endpoints for security issues"""
    
    # Add custom headers to test authentication bypass
    case.headers = case.headers or {}
    case.headers.update({
        'X-Forwarded-For': '127.0.0.1',
        'X-Real-IP': '127.0.0.1',
        'X-Originating-IP': '127.0.0.1'
    })
    
    response = case.call()
    
    # Check for authentication bypass
    if response.status_code == 200 and case.endpoint.path.startswith('/api/admin'):
        raise AssertionError("Potential authentication bypass on admin endpoint")
    
    case.validate_response(response)

class TestBusinessLogicSecurity:
    """Test business logic security issues"""
    
    def test_privilege_escalation(self):
        """Test for privilege escalation vulnerabilities"""
        
        # Create a regular user token (mock)
        user_token = "user_token_here"  # In real test, get from auth
        admin_endpoints = [
            "/api/admin/users",
            "/api/admin/tenants",
            "/api/admin/billing"
        ]
        
        headers = {"Authorization": f"Bearer {user_token}"}
        
        for endpoint in admin_endpoints:
            response = requests.get(f"http://localhost:8000{endpoint}", headers=headers)
            assert response.status_code in [401, 403], f"Regular user should not access {endpoint}"
    
    def test_tenant_isolation(self):
        """Test that tenants cannot access each other's data"""
        
        # Mock tokens for different tenants
        tenant1_token = "tenant1_token"
        tenant2_token = "tenant2_token"
        
        # Test data access isolation
        endpoints = [
            "/api/threats",
            "/api/devices", 
            "/api/vulnerabilities"
        ]
        
        for endpoint in endpoints:
            # Get data with tenant1 token
            headers1 = {"Authorization": f"Bearer {tenant1_token}"}
            response1 = requests.get(f"http://localhost:8000{endpoint}", headers=headers1)
            
            # Get data with tenant2 token  
            headers2 = {"Authorization": f"Bearer {tenant2_token}"}
            response2 = requests.get(f"http://localhost:8000{endpoint}", headers=headers2)
            
            # Responses should be different (tenant isolation)
            if response1.status_code == 200 and response2.status_code == 200:
                assert response1.text != response2.text, f"Potential tenant data leakage at {endpoint}"
    
    def test_mass_assignment(self):
        """Test for mass assignment vulnerabilities"""
        
        # Test user creation/update endpoints
        user_data = {
            "username": "testuser",
            "email": "test@example.com",
            "role": "admin",  # Should not be assignable by regular user
            "is_superuser": True,  # Should not be assignable
            "tenant_id": "different_tenant"  # Should not be changeable
        }
        
        response = requests.post("http://localhost:8000/api/users", json=user_data)
        
        if response.status_code == 201:
            created_user = response.json()
            
            # Check that privileged fields were not set
            assert created_user.get('role') != 'admin', "Mass assignment vulnerability: role escalation"
            assert created_user.get('is_superuser') != True, "Mass assignment vulnerability: superuser escalation"

class TestInputValidationSecurity:
    """Test input validation security"""
    
    def test_file_upload_security(self):
        """Test file upload security if endpoints exist"""
        
        # Test malicious file uploads
        malicious_files = [
            ("test.php", "<?php system($_GET['cmd']); ?>", "application/x-php"),
            ("test.jsp", "<% Runtime.getRuntime().exec(request.getParameter(\"cmd\")); %>", "application/x-jsp"),
            ("test.exe", b"\x4d\x5a\x90\x00", "application/x-executable"),
            ("../../../etc/passwd", "root:x:0:0:root:/root:/bin/bash", "text/plain")
        ]
        
        upload_endpoints = ["/api/upload", "/api/import", "/api/files"]
        
        for endpoint in upload_endpoints:
            for filename, content, content_type in malicious_files:
                files = {'file': (filename, content, content_type)}
                response = requests.post(f"http://localhost:8000{endpoint}", files=files)
                
                # Should reject malicious files
                assert response.status_code in [400, 415, 422], f"Should reject malicious file: {filename}"
    
    def test_json_injection(self):
        """Test for JSON injection vulnerabilities"""
        
        json_payloads = [
            {"key": {"$ne": None}},  # NoSQL injection
            {"key": {"$gt": ""}},
            {"key": {"$regex": ".*"}},
            {"__proto__": {"isAdmin": True}},  # Prototype pollution
            {"constructor": {"prototype": {"isAdmin": True}}}
        ]
        
        post_endpoints = ["/api/scan", "/api/threats", "/api/devices"]
        
        for endpoint in post_endpoints:
            for payload in json_payloads:
                response = requests.post(f"http://localhost:8000{endpoint}", json=payload)
                
                # Should handle malicious JSON safely
                assert response.status_code != 500, f"JSON injection caused server error at {endpoint}"
                
                if response.status_code == 200:
                    # Check that injection didn't succeed
                    response_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
                    assert not self._check_injection_success(response_data), f"Potential JSON injection at {endpoint}"
    
    def _check_injection_success(self, response_data: Dict) -> bool:
        """Check if injection was successful"""
        # Look for signs of successful injection
        suspicious_patterns = ['admin', 'root', 'system', 'unauthorized']
        response_str = json.dumps(response_data).lower()
        
        return any(pattern in response_str for pattern in suspicious_patterns)
```

### Performance and Load Testing Integration

**File**: `tests/api_fuzzing/test_performance_security.py`

```python
import schemathesis
from hypothesis import strategies as st, settings
import time
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
from typing import List, Dict
import structlog

logger = structlog.get_logger()

schema = schemathesis.from_uri("http://localhost:8000/openapi.json")

class PerformanceSecurityTester:
    """Test performance-related security issues"""
    
    def __init__(self):
        self.response_times = []
        self.error_rates = {}
    
    def test_dos_protection(self):
        """Test for DoS protection mechanisms"""
        
        # Test rapid requests
        def make_request():
            try:
                response = requests.get("http://localhost:8000/api/threats", timeout=5)
                return response.status_code, response.elapsed.total_seconds()
            except requests.exceptions.Timeout:
                return 408, 5.0
            except Exception as e:
                return 500, 0.0
        
        # Send 100 rapid requests
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(make_request) for _ in range(100)]
            results = [future.result() for future in as_completed(futures)]
        
        # Analyze results
        status_codes = [result[0] for result in results]
        response_times = [result[1] for result in results]
        
        # Check for rate limiting
        rate_limited = sum(1 for code in status_codes if code == 429)
        if rate_limited == 0:
            logger.warning("No rate limiting detected - potential DoS vulnerability")
        
        # Check for performance degradation
        avg_response_time = statistics.mean(response_times)
        if avg_response_time > 2.0:  # 2 second threshold
            logger.warning(f"High average response time: {avg_response_time:.2f}s")
        
        # Check error rate
        errors = sum(1 for code in status_codes if code >= 500)
        error_rate = errors / len(status_codes)
        assert error_rate < 0.1, f"High error rate under load: {error_rate:.2%}"
    
    def test_resource_exhaustion(self):
        """Test for resource exhaustion vulnerabilities"""
        
        # Test large payload handling
        large_payload = {"data": "x" * 1000000}  # 1MB payload
        
        response = requests.post(
            "http://localhost:8000/api/scan",
            json=large_payload,
            timeout=10
        )
        
        # Should handle large payloads gracefully
        assert response.status_code in [400, 413, 422], "Should reject oversized payloads"
        
        # Test deeply nested JSON
        nested_payload = {"level": {}}
        current = nested_payload["level"]
        for i in range(1000):  # Create 1000 levels of nesting
            current["level"] = {}
            current = current["level"]
        
        response = requests.post(
            "http://localhost:8000/api/scan",
            json=nested_payload,
            timeout=10
        )
        
        # Should handle deeply nested JSON safely
        assert response.status_code in [400, 422], "Should reject deeply nested JSON"

@schema.parametrize()
@settings(max_examples=50, deadline=30000)
def test_response_time_consistency(case):
    """Test that response times are consistent (no timing attacks)"""
    
    response_times = []
    
    # Make multiple identical requests
    for _ in range(5):
        start_time = time.time()
        response = case.call()
        end_time = time.time()
        
        response_times.append(end_time - start_time)
    
    # Check for timing attack vulnerabilities
    if len(response_times) > 1:
        time_variance = statistics.stdev(response_times)
        avg_time = statistics.mean(response_times)
        
        # High variance might indicate timing attack vulnerability
        if avg_time > 0 and (time_variance / avg_time) > 0.5:
            logger.warning(f"High timing variance detected: {time_variance:.3f}s (avg: {avg_time:.3f}s)")

@schema.parametrize(endpoint=lambda endpoint: endpoint.path.startswith("/api/auth"))
@settings(max_examples=20)
def test_auth_timing_attacks(case):
    """Specific timing attack tests for authentication endpoints"""
    
    # Test with valid vs invalid usernames
    valid_username_times = []
    invalid_username_times = []
    
    # Test valid username, invalid password
    for _ in range(3):
        case.body = {"username": "admin", "password": "wrong_password"}
        start_time = time.time()
        response = case.call()
        end_time = time.time()
        valid_username_times.append(end_time - start_time)
    
    # Test invalid username
    for _ in range(3):
        case.body = {"username": "nonexistent_user", "password": "wrong_password"}
        start_time = time.time()
        response = case.call()
        end_time = time.time()
        invalid_username_times.append(end_time - start_time)
    
    # Check for timing differences
    if valid_username_times and invalid_username_times:
        valid_avg = statistics.mean(valid_username_times)
        invalid_avg = statistics.mean(invalid_username_times)
        
        # Significant timing difference might indicate username enumeration
        time_diff = abs(valid_avg - invalid_avg)
        if time_diff > 0.1:  # 100ms threshold
            logger.warning(f"Potential username enumeration via timing: {time_diff:.3f}s difference")
```

## 🚀 Usage Examples

### Basic Fuzzing

```bash
# Run fuzzing tests
pytest tests/api_fuzzing/ -v

# Run with more examples
pytest tests/api_fuzzing/ -v --hypothesis-max-examples=500

# Run specific endpoint fuzzing
pytest tests/api_fuzzing/test_api_security.py::test_auth_endpoint_security -v
```

### Command Line Fuzzing

```bash
# Direct schemathesis CLI usage
schemathesis run http://localhost:8000/openapi.json

# With custom checks
schemathesis run http://localhost:8000/openapi.json --checks=all

# Target specific endpoints
schemathesis run http://localhost:8000/openapi.json --endpoint=/api/auth/login

# Generate test report
schemathesis run http://localhost:8000/openapi.json --report=security_report.html
```

### CI/CD Integration

```yaml
# .github/workflows/security-testing.yml
name: API Security Testing

on: [push, pull_request]

jobs:
  api-security:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v3
      with:
        python-version: 3.11
    
    - name: Install dependencies
      run: |
        pip install schemathesis pytest
    
    - name: Start API server
      run: |
        uvicorn main:app --host 0.0.0.0 --port 8000 &
        sleep 10
    
    - name: Run API fuzzing tests
      run: |
        pytest tests/api_fuzzing/ -v --tb=short
    
    - name: Run schemathesis CLI
      run: |
        schemathesis run http://localhost:8000/openapi.json --report=security_report.html
    
    - name: Upload security report
      uses: actions/upload-artifact@v3
      with:
        name: security-report
        path: security_report.html
```

## ✅ Validation Steps

1. **Install Schemathesis**:
   ```bash
   pip install schemathesis
   ```

2. **Test Basic Fuzzing**:
   ```bash
   schemathesis run http://localhost:8000/openapi.json --max-examples=10
   ```

3. **Run Security Tests**:
   ```bash
   pytest tests/api_fuzzing/test_api_security.py -v
   ```

4. **Check Coverage**:
   ```bash
   pytest tests/api_fuzzing/ --cov=api --cov-report=html
   ```

## 📈 Benefits for SecureNet

- **Automated Security Testing** - Find vulnerabilities without manual testing
- **Schema Compliance** - Ensure API matches OpenAPI specification
- **Edge Case Discovery** - Automatically test boundary conditions
- **Regression Prevention** - Catch security regressions in CI/CD
- **Comprehensive Coverage** - Test all API endpoints systematically
- **Performance Security** - Detect DoS and timing attack vulnerabilities

## 🔗 Related Documentation

- [Phase 3: Advanced Tooling](../integration/phase-3-advanced-tooling.md)
- [Testing Framework Guide](README.md)
- [Locust Integration](locust.md) 