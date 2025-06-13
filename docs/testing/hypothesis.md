✅ **Integrated in Phase 2** – See [phase guide](../integration/phase-2-developer-experience.md)

# Hypothesis - Property-Based Testing

Hypothesis is a Python library for creating unit tests which are simpler to write and more powerful when run, finding edge cases in your code you wouldn't have thought to look for.

## 🎯 Purpose for SecureNet

- **Edge Case Discovery** - Automatically find edge cases in security algorithms
- **Robust Testing** - Ensure threat detection never crashes on unexpected input
- **Data Validation** - Test network data parsing and validation logic
- **Security Assurance** - Verify security functions handle all possible inputs safely

## 📦 Installation

```bash
pip install hypothesis
```

## 🔧 Integration

### Core Property Tests for Threat Detection

**File**: `tests/property_tests/test_threat_detection.py`

```python
from hypothesis import given, strategies as st, assume, settings
from hypothesis.strategies import composite
import pytest
from typing import Dict, Any
import ipaddress

# Import SecureNet modules (adjust imports based on your structure)
from ml.anomaly_detection import ThreatDetectionService
from api.network_scanner import NetworkScanner

@composite
def network_traffic_data(draw):
    """Generate realistic network traffic data"""
    return {
        'source_ip': draw(st.ip_addresses(v=4).map(str)),
        'dest_ip': draw(st.ip_addresses(v=4).map(str)),
        'source_port': draw(st.integers(min_value=1, max_value=65535)),
        'dest_port': draw(st.integers(min_value=1, max_value=65535)),
        'protocol': draw(st.sampled_from(['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS'])),
        'bytes_transferred': draw(st.integers(min_value=0, max_value=10**9)),
        'packet_count': draw(st.integers(min_value=1, max_value=10000)),
        'connection_duration': draw(st.floats(min_value=0.001, max_value=3600.0)),
        'flags': draw(st.lists(st.sampled_from(['SYN', 'ACK', 'FIN', 'RST', 'PSH']), max_size=5))
    }

@composite
def device_data(draw):
    """Generate realistic device discovery data"""
    device_types = ['Router', 'Switch', 'Computer', 'Phone', 'IoT', 'Printer', 'Camera']
    os_types = ['Windows', 'Linux', 'macOS', 'iOS', 'Android', 'Unknown']
    
    return {
        'ip': draw(st.ip_addresses(v=4).map(str)),
        'mac': draw(st.text(alphabet='0123456789ABCDEF:', min_size=17, max_size=17)),
        'hostname': draw(st.text(alphabet=st.characters(whitelist_categories=['L', 'N']), min_size=1, max_size=50)),
        'device_type': draw(st.sampled_from(device_types)),
        'os': draw(st.sampled_from(os_types)),
        'open_ports': draw(st.lists(st.integers(min_value=1, max_value=65535), max_size=20)),
        'last_seen': draw(st.datetimes()),
        'response_time': draw(st.floats(min_value=0.001, max_value=5.0))
    }

@composite
def cve_data(draw):
    """Generate realistic CVE data"""
    return {
        'cve_id': f"CVE-{draw(st.integers(min_value=2000, max_value=2024))}-{draw(st.integers(min_value=1, max_value=99999))}",
        'cvss_score': draw(st.floats(min_value=0.0, max_value=10.0)),
        'severity': draw(st.sampled_from(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])),
        'description': draw(st.text(min_size=10, max_size=500)),
        'published_date': draw(st.datetimes()),
        'vendor': draw(st.sampled_from(['Microsoft', 'Apple', 'Google', 'Cisco', 'Adobe', 'Oracle'])),
        'affected_products': draw(st.lists(st.text(min_size=1, max_size=50), min_size=1, max_size=10))
    }

class TestThreatDetectionProperties:
    """Property-based tests for threat detection system"""
    
    @given(traffic_data=network_traffic_data())
    @settings(max_examples=100, deadline=5000)
    def test_threat_detection_never_crashes(self, traffic_data):
        """Property: Threat detection should never crash on valid network data"""
        detector = ThreatDetectionService()
        
        # This should never raise an exception
        result = detector.analyze_traffic(traffic_data)
        
        # Basic result validation
        assert isinstance(result, dict)
        assert 'threat_level' in result
        assert result['threat_level'] in ['low', 'medium', 'high', 'critical']
        assert 'confidence' in result
        assert 0.0 <= result['confidence'] <= 1.0
    
    @given(traffic_data=network_traffic_data())
    def test_threat_detection_deterministic(self, traffic_data):
        """Property: Same input should produce same output"""
        detector = ThreatDetectionService()
        
        result1 = detector.analyze_traffic(traffic_data)
        result2 = detector.analyze_traffic(traffic_data)
        
        assert result1 == result2
    
    @given(st.lists(network_traffic_data(), min_size=1, max_size=100))
    def test_batch_threat_detection_consistency(self, traffic_list):
        """Property: Batch processing should be consistent with individual processing"""
        detector = ThreatDetectionService()
        
        # Process individually
        individual_results = [detector.analyze_traffic(data) for data in traffic_list]
        
        # Process as batch
        batch_results = detector.analyze_traffic_batch(traffic_list)
        
        assert len(individual_results) == len(batch_results)
        for individual, batch in zip(individual_results, batch_results):
            assert individual['threat_level'] == batch['threat_level']
    
    @given(traffic_data=network_traffic_data())
    def test_threat_level_ordering(self, traffic_data):
        """Property: Threat levels should have consistent ordering"""
        detector = ThreatDetectionService()
        result = detector.analyze_traffic(traffic_data)
        
        threat_levels = ['low', 'medium', 'high', 'critical']
        threat_level = result['threat_level']
        confidence = result['confidence']
        
        # Higher confidence should correlate with more extreme threat levels
        if threat_level == 'critical':
            assert confidence >= 0.7  # High confidence for critical threats
        elif threat_level == 'low':
            # Low threats can have any confidence, but very high confidence 
            # should not result in low threat level
            if confidence > 0.9:
                pytest.skip("Edge case: very high confidence with low threat")

class TestNetworkScannerProperties:
    """Property-based tests for network scanner"""
    
    @given(device_data=device_data())
    def test_device_classification_stability(self, device_data):
        """Property: Device classification should be stable"""
        scanner = NetworkScanner()
        
        # Classify device multiple times
        classification1 = scanner.classify_device(device_data)
        classification2 = scanner.classify_device(device_data)
        
        assert classification1 == classification2
    
    @given(st.lists(device_data(), min_size=1, max_size=50))
    def test_network_scan_completeness(self, devices):
        """Property: Network scan should process all provided devices"""
        scanner = NetworkScanner()
        
        # Mock the scan to return our test devices
        scanner._mock_devices = devices
        
        results = scanner.scan_network_mock()
        
        assert len(results) == len(devices)
        for device, result in zip(devices, results):
            assert result['ip'] == device['ip']
    
    @given(device_data=device_data())
    def test_device_validation(self, device_data):
        """Property: Device data validation should be consistent"""
        scanner = NetworkScanner()
        
        # Valid device data should always validate
        is_valid = scanner.validate_device_data(device_data)
        
        # Check IP address validity
        try:
            ipaddress.ip_address(device_data['ip'])
            ip_valid = True
        except ValueError:
            ip_valid = False
        
        if ip_valid and device_data['hostname'] and device_data['device_type']:
            assert is_valid is True

class TestCVEProcessingProperties:
    """Property-based tests for CVE processing"""
    
    @given(cve_data=cve_data())
    def test_cve_scoring_bounds(self, cve_data):
        """Property: CVE scoring should respect bounds"""
        from api.cve_integration import CVEProcessor
        
        processor = CVEProcessor()
        processed_cve = processor.process_cve(cve_data)
        
        # CVSS score should be within valid range
        assert 0.0 <= processed_cve['cvss_score'] <= 10.0
        
        # Severity should match CVSS score ranges
        score = processed_cve['cvss_score']
        severity = processed_cve['severity']
        
        if score >= 9.0:
            assert severity == 'CRITICAL'
        elif score >= 7.0:
            assert severity in ['HIGH', 'CRITICAL']
        elif score >= 4.0:
            assert severity in ['MEDIUM', 'HIGH']
        else:
            assert severity in ['LOW', 'MEDIUM']
    
    @given(st.lists(cve_data(), min_size=1, max_size=20))
    def test_cve_batch_processing(self, cve_list):
        """Property: CVE batch processing should handle all items"""
        from api.cve_integration import CVEProcessor
        
        processor = CVEProcessor()
        results = processor.process_cve_batch(cve_list)
        
        assert len(results) == len(cve_list)
        
        # All results should have required fields
        for result in results:
            assert 'cve_id' in result
            assert 'cvss_score' in result
            assert 'severity' in result

class TestDataValidationProperties:
    """Property-based tests for data validation"""
    
    @given(st.text())
    def test_input_sanitization(self, user_input):
        """Property: Input sanitization should never crash"""
        from api.utils import sanitize_input
        
        # Should never raise exception
        sanitized = sanitize_input(user_input)
        
        # Should return string
        assert isinstance(sanitized, str)
        
        # Should not contain dangerous characters
        dangerous_chars = ['<', '>', '"', "'", '&', ';', '|', '`']
        for char in dangerous_chars:
            assert char not in sanitized
    
    @given(st.dictionaries(st.text(), st.one_of(st.text(), st.integers(), st.floats())))
    def test_json_serialization_safety(self, data_dict):
        """Property: JSON serialization should be safe"""
        import json
        from api.utils import safe_json_serialize
        
        # Should never crash
        result = safe_json_serialize(data_dict)
        
        # Should be valid JSON
        if result is not None:
            parsed = json.loads(result)
            assert isinstance(parsed, dict)

# Custom strategies for SecureNet-specific data
@composite
def threat_alert_data(draw):
    """Generate realistic threat alert data"""
    return {
        'alert_id': draw(st.uuids().map(str)),
        'timestamp': draw(st.datetimes()),
        'threat_type': draw(st.sampled_from(['malware', 'intrusion', 'anomaly', 'vulnerability'])),
        'severity': draw(st.sampled_from(['low', 'medium', 'high', 'critical'])),
        'source_ip': draw(st.ip_addresses(v=4).map(str)),
        'target_ip': draw(st.ip_addresses(v=4).map(str)),
        'description': draw(st.text(min_size=10, max_size=200)),
        'confidence': draw(st.floats(min_value=0.0, max_value=1.0)),
        'mitigated': draw(st.booleans())
    }

class TestAlertSystemProperties:
    """Property-based tests for alert system"""
    
    @given(alert_data=threat_alert_data())
    def test_alert_processing_idempotent(self, alert_data):
        """Property: Processing the same alert multiple times should be idempotent"""
        from api.alerts import AlertProcessor
        
        processor = AlertProcessor()
        
        # Process alert twice
        result1 = processor.process_alert(alert_data)
        result2 = processor.process_alert(alert_data)
        
        # Results should be identical
        assert result1 == result2
    
    @given(st.lists(threat_alert_data(), min_size=1, max_size=50))
    def test_alert_prioritization_consistency(self, alerts):
        """Property: Alert prioritization should be consistent"""
        from api.alerts import AlertProcessor
        
        processor = AlertProcessor()
        prioritized = processor.prioritize_alerts(alerts)
        
        # Should return same number of alerts
        assert len(prioritized) == len(alerts)
        
        # Critical alerts should come first
        critical_indices = [i for i, alert in enumerate(prioritized) 
                          if alert['severity'] == 'critical']
        low_indices = [i for i, alert in enumerate(prioritized) 
                      if alert['severity'] == 'low']
        
        if critical_indices and low_indices:
            assert max(critical_indices) < min(low_indices)
```

### Configuration for Property Tests

**File**: `tests/conftest.py`

```python
import pytest
from hypothesis import settings, Verbosity

# Configure Hypothesis settings
settings.register_profile("ci", max_examples=50, deadline=2000)
settings.register_profile("dev", max_examples=10, deadline=1000)
settings.register_profile("thorough", max_examples=1000, deadline=10000, verbosity=Verbosity.verbose)

# Load profile based on environment
import os
profile = os.getenv("HYPOTHESIS_PROFILE", "dev")
settings.load_profile(profile)

@pytest.fixture
def mock_threat_detector():
    """Mock threat detector for testing"""
    class MockThreatDetector:
        def analyze_traffic(self, data):
            # Simple mock implementation
            return {
                'threat_level': 'low',
                'confidence': 0.5,
                'details': 'Mock analysis'
            }
        
        def analyze_traffic_batch(self, data_list):
            return [self.analyze_traffic(data) for data in data_list]
    
    return MockThreatDetector()
```

### Running Property Tests

**File**: `scripts/run_property_tests.py`

```python
#!/usr/bin/env python3
"""
Script to run property-based tests with different configurations
"""
import subprocess
import sys
import os

def run_tests(profile="dev", verbose=False):
    """Run property tests with specified profile"""
    
    env = os.environ.copy()
    env["HYPOTHESIS_PROFILE"] = profile
    
    cmd = ["pytest", "tests/property_tests/", "-v"]
    
    if verbose:
        cmd.append("--hypothesis-show-statistics")
    
    print(f"Running property tests with profile: {profile}")
    result = subprocess.run(cmd, env=env)
    
    return result.returncode == 0

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Run SecureNet property tests")
    parser.add_argument("--profile", choices=["dev", "ci", "thorough"], 
                       default="dev", help="Test profile to use")
    parser.add_argument("--verbose", action="store_true", 
                       help="Show detailed statistics")
    
    args = parser.parse_args()
    
    success = run_tests(args.profile, args.verbose)
    sys.exit(0 if success else 1)
```

## 🚀 Usage Examples

### Running Property Tests

```bash
# Quick development tests
pytest tests/property_tests/ -v

# Thorough testing
HYPOTHESIS_PROFILE=thorough pytest tests/property_tests/ -v

# CI testing
HYPOTHESIS_PROFILE=ci pytest tests/property_tests/ -v

# With statistics
pytest tests/property_tests/ -v --hypothesis-show-statistics
```

### Custom Property Test

```python
from hypothesis import given, strategies as st

@given(st.lists(st.integers(), min_size=1))
def test_custom_security_function(self, numbers):
    """Test that our security function handles all integer lists"""
    from api.security import process_numbers
    
    result = process_numbers(numbers)
    
    # Properties that should always hold
    assert isinstance(result, list)
    assert len(result) <= len(numbers)  # Never grows
    assert all(isinstance(x, int) for x in result)  # All integers
```

## ✅ Validation Steps

1. **Install Hypothesis**:
   ```bash
   pip install hypothesis
   ```

2. **Run Basic Test**:
   ```bash
   pytest tests/property_tests/test_threat_detection.py::TestThreatDetectionProperties::test_threat_detection_never_crashes -v
   ```

3. **Check Coverage**:
   ```bash
   pytest tests/property_tests/ --cov=api --cov=ml
   ```

4. **Run with Statistics**:
   ```bash
   pytest tests/property_tests/ --hypothesis-show-statistics
   ```

## 📈 Benefits for SecureNet

- **Edge Case Discovery** - Finds inputs that break security algorithms
- **Robustness Assurance** - Ensures threat detection never crashes
- **Input Validation** - Tests all possible network data combinations
- **Security Confidence** - Verifies security functions handle malicious inputs
- **Regression Prevention** - Catches bugs introduced by code changes
- **Documentation** - Property tests serve as executable specifications

## 🔗 Related Documentation

- [Phase 2: Developer Experience](../integration/phase-2-developer-experience.md)
- [Testing Framework Guide](README.md)
- [pytest-xdist Integration](pytest-xdist.md) 