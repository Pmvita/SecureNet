✅ **Integrated in Phase 2** – See [phase guide](../integration/phase-2-developer-experience.md)

# pytest-xdist - Parallel Test Execution

pytest-xdist is a pytest plugin for distributed testing that allows running tests in parallel across multiple CPUs or machines.

## 🎯 Purpose for SecureNet

- **Faster Test Execution** - Run tests in parallel to reduce CI/CD time
- **Resource Utilization** - Use all available CPU cores efficiently
- **Scalable Testing** - Distribute tests across multiple machines
- **Improved Developer Experience** - Faster feedback loops during development

## 📦 Installation

```bash
pip install pytest-xdist
```

## 🔧 Integration

### Basic Configuration

**File**: `pytest.ini`

```ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --tb=short --strict-markers
markers =
    slow: marks tests as slow (deselect with '-m "not slow"')
    integration: marks tests as integration tests
    unit: marks tests as unit tests
    network: marks tests that require network access
    ml: marks tests related to machine learning
    security: marks tests related to security features
    parallel: marks tests that can run in parallel
    serial: marks tests that must run serially
```

### Advanced Configuration

**File**: `pyproject.toml`

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py", "*_test.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = [
    "-v",
    "--tb=short",
    "--strict-markers",
    "--strict-config",
    "--cov=api",
    "--cov=ml",
    "--cov-report=term-missing",
    "--cov-report=html:htmlcov",
    "--cov-report=xml"
]
markers = [
    "slow: marks tests as slow",
    "integration: marks tests as integration tests",
    "unit: marks tests as unit tests",
    "network: marks tests that require network access",
    "ml: marks tests related to machine learning",
    "security: marks tests related to security features",
    "parallel: marks tests that can run in parallel",
    "serial: marks tests that must run serially"
]
filterwarnings = [
    "ignore::DeprecationWarning",
    "ignore::PendingDeprecationWarning"
]
```

### Test Organization for Parallel Execution

**File**: `tests/conftest.py`

```python
import pytest
import asyncio
import tempfile
import shutil
from pathlib import Path
from unittest.mock import Mock, AsyncMock
import structlog

# Configure logging for tests
structlog.configure(
    processors=[structlog.dev.ConsoleRenderer()],
    wrapper_class=structlog.make_filtering_bound_logger(20),  # INFO level
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
def temp_models_dir():
    """Create a temporary directory for model storage during tests"""
    temp_dir = tempfile.mkdtemp(prefix="securenet_test_models_")
    yield temp_dir
    shutil.rmtree(temp_dir)

@pytest.fixture(scope="session")
def test_database_url():
    """Provide a test database URL"""
    return "sqlite:///:memory:"

@pytest.fixture
def mock_network_data():
    """Generate mock network data for testing"""
    return [
        {
            'source_ip': '192.168.1.100',
            'dest_ip': '192.168.1.1',
            'source_port': 12345,
            'dest_port': 80,
            'protocol': 'TCP',
            'bytes_transferred': 1024,
            'packet_count': 10,
            'connection_duration': 5.2,
            'timestamp': '2024-01-01T12:00:00Z'
        },
        {
            'source_ip': '192.168.1.101',
            'dest_ip': '8.8.8.8',
            'source_port': 54321,
            'dest_port': 443,
            'protocol': 'TCP',
            'bytes_transferred': 2048,
            'packet_count': 15,
            'connection_duration': 3.1,
            'timestamp': '2024-01-01T12:01:00Z'
        }
    ]

@pytest.fixture
def mock_cve_data():
    """Generate mock CVE data for testing"""
    return [
        {
            'cve_id': 'CVE-2024-0001',
            'cvss_score': 9.8,
            'severity': 'CRITICAL',
            'description': 'Critical vulnerability in network protocol',
            'published_date': '2024-01-01T00:00:00Z',
            'vendor': 'TestVendor',
            'affected_products': ['Product A', 'Product B']
        },
        {
            'cve_id': 'CVE-2024-0002',
            'cvss_score': 5.5,
            'severity': 'MEDIUM',
            'description': 'Medium severity vulnerability',
            'published_date': '2024-01-02T00:00:00Z',
            'vendor': 'TestVendor',
            'affected_products': ['Product C']
        }
    ]

# Worker-specific fixtures for parallel execution
@pytest.fixture(scope="session")
def worker_id(request):
    """Get the worker ID for parallel test execution"""
    if hasattr(request.config, 'workerinput'):
        return request.config.workerinput['workerid']
    return 'master'

@pytest.fixture(scope="session")
def worker_temp_dir(worker_id):
    """Create worker-specific temporary directory"""
    temp_dir = tempfile.mkdtemp(prefix=f"securenet_test_{worker_id}_")
    yield temp_dir
    shutil.rmtree(temp_dir)
```

### Parallel-Safe Test Examples

**File**: `tests/unit/test_threat_detection_parallel.py`

```python
import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from concurrent.futures import ThreadPoolExecutor

from ml.anomaly_detection import ThreatDetectionService

@pytest.mark.parallel
class TestThreatDetectionParallel:
    """Tests that can run safely in parallel"""
    
    @pytest.mark.asyncio
    async def test_analyze_traffic_basic(self, mock_network_data):
        """Basic threat analysis test"""
        service = ThreatDetectionService()
        
        with patch.object(service, '_load_model') as mock_load:
            mock_load.return_value = Mock()
            
            results = await service.analyze_traffic(mock_network_data[:1])
            
            assert len(results) == 1
            assert 'threat_level' in results[0]
    
    @pytest.mark.asyncio
    async def test_batch_processing(self, mock_network_data):
        """Test batch processing of network data"""
        service = ThreatDetectionService()
        
        with patch.object(service, '_analyze_single_point') as mock_analyze:
            mock_analyze.return_value = 'low'
            
            results = await service.analyze_network_data(mock_network_data)
            
            assert len(results) == len(mock_network_data)
            assert all(r['threat_level'] == 'low' for r in results)
    
    def test_feature_extraction(self, mock_network_data):
        """Test feature extraction from network data"""
        service = ThreatDetectionService()
        
        features = service._extract_features_from_data(mock_network_data)
        
        assert len(features) == len(mock_network_data)
        assert all(isinstance(f, list) for f in features)
    
    @pytest.mark.parametrize("threat_level,expected_score", [
        ("low", 0.1),
        ("medium", 0.5),
        ("high", 0.8),
        ("critical", 0.95)
    ])
    def test_threat_level_scoring(self, threat_level, expected_score):
        """Test threat level to score conversion"""
        service = ThreatDetectionService()
        
        score = service._threat_level_to_score(threat_level)
        
        assert score == expected_score

@pytest.mark.parallel
class TestConcurrentThreatDetection:
    """Test concurrent threat detection scenarios"""
    
    @pytest.mark.asyncio
    async def test_concurrent_analysis(self, mock_network_data):
        """Test multiple concurrent analyses"""
        service = ThreatDetectionService()
        
        with patch.object(service, '_analyze_single_point') as mock_analyze:
            mock_analyze.return_value = 'medium'
            
            # Run multiple analyses concurrently
            tasks = [
                service.analyze_network_data(mock_network_data)
                for _ in range(5)
            ]
            
            results = await asyncio.gather(*tasks)
            
            assert len(results) == 5
            assert all(len(r) == len(mock_network_data) for r in results)
    
    def test_thread_safety(self, mock_network_data):
        """Test thread safety of threat detection"""
        service = ThreatDetectionService()
        
        def analyze_data():
            # Simulate synchronous analysis
            return service._rule_based_analysis(mock_network_data[0])
        
        # Run in multiple threads
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [executor.submit(analyze_data) for _ in range(10)]
            results = [f.result() for f in futures]
        
        # All results should be consistent
        assert len(set(results)) == 1  # All results should be the same
```

### Serial Test Examples

**File**: `tests/integration/test_database_serial.py`

```python
import pytest
import asyncio
from database import Database

@pytest.mark.serial
class TestDatabaseIntegration:
    """Tests that must run serially due to shared database state"""
    
    @pytest.fixture(autouse=True)
    async def setup_database(self, test_database_url):
        """Setup database for each test"""
        self.db = Database(test_database_url)
        await self.db.create_tables()
        yield
        await self.db.drop_tables()
        await self.db.close()
    
    @pytest.mark.asyncio
    async def test_create_threat_alert(self):
        """Test creating a threat alert in database"""
        alert_data = {
            'threat_type': 'anomaly',
            'severity': 'high',
            'source_ip': '192.168.1.100',
            'description': 'Suspicious network activity detected'
        }
        
        alert_id = await self.db.create_threat_alert(alert_data)
        
        assert alert_id is not None
        
        # Verify alert was created
        alert = await self.db.get_threat_alert(alert_id)
        assert alert['threat_type'] == 'anomaly'
        assert alert['severity'] == 'high'
    
    @pytest.mark.asyncio
    async def test_update_threat_alert(self):
        """Test updating a threat alert"""
        # Create initial alert
        alert_data = {
            'threat_type': 'intrusion',
            'severity': 'medium',
            'source_ip': '192.168.1.101',
            'description': 'Potential intrusion attempt'
        }
        
        alert_id = await self.db.create_threat_alert(alert_data)
        
        # Update alert
        update_data = {'severity': 'high', 'mitigated': True}
        await self.db.update_threat_alert(alert_id, update_data)
        
        # Verify update
        updated_alert = await self.db.get_threat_alert(alert_id)
        assert updated_alert['severity'] == 'high'
        assert updated_alert['mitigated'] is True
```

### Performance Test Suite

**File**: `tests/performance/test_parallel_performance.py`

```python
import pytest
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor

@pytest.mark.slow
@pytest.mark.parallel
class TestParallelPerformance:
    """Performance tests that benefit from parallel execution"""
    
    def test_cpu_intensive_task(self):
        """Test CPU-intensive task performance"""
        def cpu_task(n):
            return sum(i * i for i in range(n))
        
        start_time = time.time()
        result = cpu_task(100000)
        end_time = time.time()
        
        assert result > 0
        assert end_time - start_time < 1.0  # Should complete within 1 second
    
    @pytest.mark.asyncio
    async def test_concurrent_network_simulation(self):
        """Test concurrent network operations simulation"""
        async def simulate_network_call(delay):
            await asyncio.sleep(delay)
            return f"Response after {delay}s"
        
        start_time = time.time()
        
        # Simulate multiple concurrent network calls
        tasks = [simulate_network_call(0.1) for _ in range(10)]
        results = await asyncio.gather(*tasks)
        
        end_time = time.time()
        
        assert len(results) == 10
        assert end_time - start_time < 0.5  # Should complete much faster than 1s
    
    def test_parallel_data_processing(self, mock_network_data):
        """Test parallel data processing"""
        def process_data_chunk(data_chunk):
            # Simulate data processing
            return [item['bytes_transferred'] * 2 for item in data_chunk]
        
        # Create larger dataset
        large_dataset = mock_network_data * 100
        chunk_size = 20
        chunks = [large_dataset[i:i+chunk_size] 
                 for i in range(0, len(large_dataset), chunk_size)]
        
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=4) as executor:
            results = list(executor.map(process_data_chunk, chunks))
        
        end_time = time.time()
        
        assert len(results) == len(chunks)
        assert end_time - start_time < 2.0  # Should be reasonably fast
```

### Test Execution Scripts

**File**: `scripts/run_tests.py`

```python
#!/usr/bin/env python3
"""
Script to run tests with different parallel configurations
"""
import subprocess
import sys
import os
import argparse
from pathlib import Path

def run_tests(
    test_type="all",
    parallel=True,
    workers="auto",
    coverage=False,
    verbose=False,
    markers=None
):
    """Run tests with specified configuration"""
    
    cmd = ["pytest"]
    
    # Add test paths based on type
    if test_type == "unit":
        cmd.append("tests/unit/")
    elif test_type == "integration":
        cmd.append("tests/integration/")
    elif test_type == "performance":
        cmd.append("tests/performance/")
    else:
        cmd.append("tests/")
    
    # Add parallel execution
    if parallel:
        cmd.extend(["-n", str(workers)])
    
    # Add coverage
    if coverage:
        cmd.extend([
            "--cov=api",
            "--cov=ml",
            "--cov-report=term-missing",
            "--cov-report=html:htmlcov"
        ])
    
    # Add verbosity
    if verbose:
        cmd.append("-v")
    else:
        cmd.append("-q")
    
    # Add markers
    if markers:
        cmd.extend(["-m", markers])
    
    # Add other options
    cmd.extend([
        "--tb=short",
        "--strict-markers"
    ])
    
    print(f"Running command: {' '.join(cmd)}")
    result = subprocess.run(cmd)
    
    return result.returncode == 0

def main():
    parser = argparse.ArgumentParser(description="Run SecureNet tests")
    
    parser.add_argument(
        "--type",
        choices=["all", "unit", "integration", "performance"],
        default="all",
        help="Type of tests to run"
    )
    
    parser.add_argument(
        "--no-parallel",
        action="store_true",
        help="Disable parallel execution"
    )
    
    parser.add_argument(
        "--workers",
        default="auto",
        help="Number of parallel workers (default: auto)"
    )
    
    parser.add_argument(
        "--coverage",
        action="store_true",
        help="Generate coverage report"
    )
    
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Verbose output"
    )
    
    parser.add_argument(
        "--markers",
        help="Run tests with specific markers (e.g., 'not slow')"
    )
    
    args = parser.parse_args()
    
    success = run_tests(
        test_type=args.type,
        parallel=not args.no_parallel,
        workers=args.workers,
        coverage=args.coverage,
        verbose=args.verbose,
        markers=args.markers
    )
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
```

## 🚀 Usage Examples

### Basic Parallel Execution

```bash
# Run all tests in parallel using all CPU cores
pytest -n auto

# Run tests with specific number of workers
pytest -n 4

# Run only unit tests in parallel
pytest tests/unit/ -n auto

# Run tests with coverage in parallel
pytest -n auto --cov=api --cov=ml
```

### Advanced Usage

```bash
# Run only parallel-safe tests
pytest -m parallel -n auto

# Run serial tests only (no parallelization)
pytest -m serial

# Run tests excluding slow ones, in parallel
pytest -m "not slow" -n auto

# Run with custom script
python scripts/run_tests.py --type unit --coverage --verbose
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: [3.9, 3.10, 3.11]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python ${{ matrix.python-version }}
      uses: actions/setup-python@v3
      with:
        python-version: ${{ matrix.python-version }}
    
    - name: Install dependencies
      run: |
        pip install -r requirements.txt
        pip install pytest-xdist pytest-cov
    
    - name: Run tests
      run: |
        pytest -n auto --cov=api --cov=ml --cov-report=xml
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
```

## ✅ Validation Steps

1. **Install pytest-xdist**:
   ```bash
   pip install pytest-xdist
   ```

2. **Run Basic Parallel Test**:
   ```bash
   pytest -n 2 tests/ -v
   ```

3. **Check Worker Distribution**:
   ```bash
   pytest -n auto --tb=short -v
   # Look for [gw0], [gw1], etc. in output
   ```

4. **Test Performance Improvement**:
   ```bash
   # Serial execution
   time pytest tests/
   
   # Parallel execution
   time pytest -n auto tests/
   ```

5. **Verify Test Isolation**:
   ```bash
   pytest -n 4 tests/unit/ --tb=short
   # Should pass without conflicts
   ```

## 📈 Benefits for SecureNet

- **Faster CI/CD** - Reduce test execution time by 50-80%
- **Better Resource Utilization** - Use all available CPU cores
- **Improved Developer Experience** - Faster feedback during development
- **Scalable Testing** - Can distribute across multiple machines
- **Maintained Test Quality** - Parallel execution doesn't compromise test reliability

## 🔗 Related Documentation

- [Phase 2: Developer Experience](../integration/phase-2-developer-experience.md)
- [Testing Framework Guide](README.md)
- [Hypothesis Integration](hypothesis.md) 