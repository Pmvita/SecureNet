✅ **Integrated in Phase 2** – See [phase guide](../integration/phase-2-developer-experience.md)

# dependency-injector - Dependency Injection Framework

dependency-injector is a comprehensive dependency injection framework for Python that helps create modular, testable, and maintainable applications.

## 🎯 Purpose for SecureNet

- **Modular Architecture** - Clean separation of concerns and dependencies
- **Testability** - Easy mocking and testing of components
- **Configuration Management** - Centralized configuration handling
- **Service Lifecycle** - Manage singleton and factory patterns
- **Loose Coupling** - Reduce dependencies between components

## 📦 Installation

```bash
pip install dependency-injector
```

## 🔧 Integration

### Core Container Configuration

**File**: `core/container.py`

```python
from dependency_injector import containers, providers
from dependency_injector.wiring import Provide, inject
import os
from typing import Optional

# Import SecureNet modules
from database import Database
from ml.anomaly_detection import ThreatDetectionService
from api.network_scanner import NetworkScanner, VulnerabilityScanner
from ml.mlflow_tracking import MLModelManager
from api.cve_integration import CVEProcessor
from api.alerts import AlertProcessor

class Container(containers.DeclarativeContainer):
    """Main dependency injection container for SecureNet"""
    
    # Configuration
    config = providers.Configuration()
    
    # Database
    database = providers.Singleton(
        Database,
        database_url=config.database.url,
        echo=config.database.echo.as_(bool)
    )
    
    # ML Services
    ml_model_manager = providers.Singleton(
        MLModelManager,
        tracking_uri=config.mlflow.tracking_uri
    )
    
    threat_detection_service = providers.Factory(
        ThreatDetectionService,
        database=database,
        model_manager=ml_model_manager
    )
    
    # Network Services
    network_scanner = providers.Factory(
        NetworkScanner,
        config=config.scanner
    )
    
    vulnerability_scanner = providers.Factory(
        VulnerabilityScanner,
        database=database,
        config=config.vulnerability_scanner
    )
    
    # CVE Services
    cve_processor = providers.Factory(
        CVEProcessor,
        database=database,
        api_key=config.cve.api_key,
        cache_ttl=config.cve.cache_ttl.as_(int)
    )
    
    # Alert Services
    alert_processor = providers.Factory(
        AlertProcessor,
        database=database,
        notification_config=config.notifications
    )
    
    # Utility Services
    logger = providers.Singleton(
        "structlog.get_logger",
        name="securenet"
    )

class TestContainer(containers.DeclarativeContainer):
    """Test container with mocked dependencies"""
    
    config = providers.Configuration()
    
    # Mock database
    database = providers.Singleton(
        "tests.mocks.MockDatabase"
    )
    
    # Mock services
    threat_detection_service = providers.Factory(
        "tests.mocks.MockThreatDetectionService"
    )
    
    network_scanner = providers.Factory(
        "tests.mocks.MockNetworkScanner"
    )
```

### Configuration Management

**File**: `core/config.py`

```python
from dependency_injector import containers, providers
import os
from pathlib import Path
import yaml
from typing import Dict, Any

class ConfigurationManager:
    """Manages configuration loading and validation"""
    
    def __init__(self, config_path: str = "config/config.yaml"):
        self.config_path = Path(config_path)
        self._config = None
    
    def load_config(self) -> Dict[str, Any]:
        """Load configuration from file and environment"""
        if self._config is None:
            self._config = self._load_from_file()
            self._override_from_env()
        return self._config
    
    def _load_from_file(self) -> Dict[str, Any]:
        """Load base configuration from YAML file"""
        if self.config_path.exists():
            with open(self.config_path, 'r') as f:
                return yaml.safe_load(f)
        return self._get_default_config()
    
    def _override_from_env(self):
        """Override configuration with environment variables"""
        env_mappings = {
            'DATABASE_URL': ['database', 'url'],
            'MLFLOW_TRACKING_URI': ['mlflow', 'tracking_uri'],
            'CVE_API_KEY': ['cve', 'api_key'],
            'LOG_LEVEL': ['logging', 'level'],
            'REDIS_URL': ['redis', 'url'],
            'SENTRY_DSN': ['sentry', 'dsn']
        }
        
        for env_var, config_path in env_mappings.items():
            value = os.getenv(env_var)
            if value:
                self._set_nested_config(config_path, value)
    
    def _set_nested_config(self, path: list, value: str):
        """Set nested configuration value"""
        current = self._config
        for key in path[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]
        current[path[-1]] = value
    
    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration"""
        return {
            'database': {
                'url': 'sqlite:///data/securenet.db',
                'echo': False
            },
            'mlflow': {
                'tracking_uri': 'http://localhost:5000'
            },
            'cve': {
                'api_key': '',
                'cache_ttl': 3600
            },
            'scanner': {
                'timeout': 5,
                'max_threads': 10
            },
            'vulnerability_scanner': {
                'enabled': True,
                'scan_interval': 3600
            },
            'notifications': {
                'email': {
                    'enabled': False,
                    'smtp_server': '',
                    'smtp_port': 587
                },
                'slack': {
                    'enabled': False,
                    'webhook_url': ''
                }
            },
            'logging': {
                'level': 'INFO',
                'format': 'json'
            },
            'redis': {
                'url': 'redis://localhost:6379/0'
            },
            'sentry': {
                'dsn': '',
                'environment': 'development'
            }
        }

def create_container(config_path: str = "config/config.yaml") -> Container:
    """Create and configure the main container"""
    container = Container()
    
    # Load configuration
    config_manager = ConfigurationManager(config_path)
    config_data = config_manager.load_config()
    
    # Set configuration
    container.config.from_dict(config_data)
    
    return container
```

### FastAPI Integration

**File**: `api/dependencies.py`

```python
from dependency_injector.wiring import Provide, inject
from fastapi import Depends
from typing import Annotated

from core.container import Container
from database import Database
from ml.anomaly_detection import ThreatDetectionService
from api.network_scanner import NetworkScanner
from api.cve_integration import CVEProcessor
from api.alerts import AlertProcessor

# Dependency injection for FastAPI endpoints
DatabaseDep = Annotated[Database, Depends(Provide[Container.database])]
ThreatDetectionDep = Annotated[ThreatDetectionService, Depends(Provide[Container.threat_detection_service])]
NetworkScannerDep = Annotated[NetworkScanner, Depends(Provide[Container.network_scanner])]
CVEProcessorDep = Annotated[CVEProcessor, Depends(Provide[Container.cve_processor])]
AlertProcessorDep = Annotated[AlertProcessor, Depends(Provide[Container.alert_processor])]

# Example usage in FastAPI routes
from fastapi import APIRouter

router = APIRouter()

@router.get("/api/threats/analyze")
async def analyze_threats(
    threat_service: ThreatDetectionDep,
    network_scanner: NetworkScannerDep
):
    """Analyze current network threats"""
    # Get current network data
    network_data = await network_scanner.get_current_network_state()
    
    # Analyze for threats
    threats = await threat_service.analyze_network_data(network_data)
    
    return {"threats": threats, "status": "success"}

@router.post("/api/scan/network")
async def scan_network(
    scanner: NetworkScannerDep,
    alert_processor: AlertProcessorDep
):
    """Perform network scan"""
    results = await scanner.scan_network()
    
    # Process any alerts
    alerts = await alert_processor.process_scan_results(results)
    
    return {"scan_results": results, "alerts": alerts}

@router.get("/api/cve/latest")
async def get_latest_cves(
    cve_processor: CVEProcessorDep
):
    """Get latest CVE data"""
    cves = await cve_processor.get_latest_cves(limit=50)
    return {"cves": cves}
```

### Service Implementation with DI

**File**: `ml/anomaly_detection_di.py`

```python
from dependency_injector.wiring import inject, Provide
from typing import List, Dict, Optional
import structlog

from core.container import Container
from database import Database
from ml.mlflow_tracking import MLModelManager

class ThreatDetectionService:
    """Threat detection service with dependency injection"""
    
    @inject
    def __init__(
        self,
        database: Database = Provide[Container.database],
        model_manager: MLModelManager = Provide[Container.ml_model_manager],
        logger = Provide[Container.logger]
    ):
        self.database = database
        self.model_manager = model_manager
        self.logger = logger
        self._model = None
    
    async def analyze_network_data(self, network_data: List[Dict]) -> List[Dict]:
        """Analyze network data for threats"""
        self.logger.info("Starting threat analysis", data_points=len(network_data))
        
        try:
            # Load model if not already loaded
            if not self._model:
                await self._load_model()
            
            # Perform analysis
            results = []
            for data_point in network_data:
                threat_level = await self._analyze_single_point(data_point)
                results.append({
                    'data': data_point,
                    'threat_level': threat_level,
                    'timestamp': data_point.get('timestamp')
                })
            
            # Store results in database
            await self._store_analysis_results(results)
            
            self.logger.info("Threat analysis completed", threats_found=len([r for r in results if r['threat_level'] != 'low']))
            return results
            
        except Exception as e:
            self.logger.error("Threat analysis failed", error=str(e))
            raise
    
    async def _load_model(self):
        """Load ML model for threat detection"""
        self._model = self.model_manager.load_production_model("threat_detector")
        if not self._model:
            self.logger.warning("No production model found, using default")
            # Fallback to default model
    
    async def _analyze_single_point(self, data_point: Dict) -> str:
        """Analyze single data point"""
        # Implementation depends on your ML model
        if self._model:
            # Use ML model
            prediction = self._model.predict([self._extract_features(data_point)])
            return self._prediction_to_threat_level(prediction[0])
        else:
            # Fallback rule-based analysis
            return self._rule_based_analysis(data_point)
    
    async def _store_analysis_results(self, results: List[Dict]):
        """Store analysis results in database"""
        # Implementation depends on your database schema
        pass
    
    def _extract_features(self, data_point: Dict) -> List[float]:
        """Extract features for ML model"""
        # Implementation depends on your feature engineering
        return [0.0]  # Placeholder
    
    def _prediction_to_threat_level(self, prediction) -> str:
        """Convert ML prediction to threat level"""
        # Implementation depends on your model output
        return "low"  # Placeholder
    
    def _rule_based_analysis(self, data_point: Dict) -> str:
        """Fallback rule-based threat analysis"""
        # Simple rule-based logic
        if data_point.get('bytes_transferred', 0) > 1000000:
            return "medium"
        return "low"
```

### Testing with DI

**File**: `tests/test_with_di.py`

```python
import pytest
from dependency_injector import containers, providers
from unittest.mock import Mock, AsyncMock

from core.container import Container, TestContainer
from ml.anomaly_detection_di import ThreatDetectionService

class TestThreatDetectionWithDI:
    """Test threat detection service with dependency injection"""
    
    @pytest.fixture
    def container(self):
        """Create test container"""
        container = TestContainer()
        container.config.from_dict({
            'database': {'url': 'sqlite:///:memory:'},
            'mlflow': {'tracking_uri': 'http://localhost:5000'}
        })
        return container
    
    @pytest.fixture
    def threat_service(self, container):
        """Create threat detection service with mocked dependencies"""
        # Wire the container
        container.wire(modules=[__name__])
        
        # Create service (dependencies will be injected)
        service = ThreatDetectionService()
        
        yield service
        
        # Unwire after test
        container.unwire()
    
    @pytest.mark.asyncio
    async def test_analyze_network_data(self, threat_service):
        """Test network data analysis"""
        # Mock data
        network_data = [
            {'ip': '192.168.1.1', 'bytes_transferred': 1024},
            {'ip': '192.168.1.2', 'bytes_transferred': 2048}
        ]
        
        # Analyze
        results = await threat_service.analyze_network_data(network_data)
        
        # Assertions
        assert len(results) == 2
        assert all('threat_level' in result for result in results)
    
    @pytest.mark.asyncio
    async def test_with_custom_mocks(self):
        """Test with custom mocked dependencies"""
        # Create custom container for this test
        test_container = containers.DynamicContainer()
        
        # Mock dependencies
        mock_database = Mock()
        mock_model_manager = Mock()
        mock_logger = Mock()
        
        test_container.database = providers.Object(mock_database)
        test_container.ml_model_manager = providers.Object(mock_model_manager)
        test_container.logger = providers.Object(mock_logger)
        
        # Wire container
        test_container.wire(modules=[__name__])
        
        try:
            # Create service
            service = ThreatDetectionService()
            
            # Verify mocks were injected
            assert service.database is mock_database
            assert service.model_manager is mock_model_manager
            assert service.logger is mock_logger
            
        finally:
            test_container.unwire()
```

### Application Startup

**File**: `main.py`

```python
from fastapi import FastAPI
from contextlib import asynccontextmanager

from core.container import create_container
from api.dependencies import router
import api.routes  # Import all route modules

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    container = create_container()
    app.container = container
    
    # Wire dependencies
    container.wire(modules=[
        "api.routes.threats",
        "api.routes.network", 
        "api.routes.cve",
        "api.dependencies"
    ])
    
    yield
    
    # Shutdown
    container.unwire()

def create_app() -> FastAPI:
    """Create FastAPI application with dependency injection"""
    app = FastAPI(
        title="SecureNet API",
        description="AI-Powered Network Security Platform",
        version="1.0.0",
        lifespan=lifespan
    )
    
    # Include routers
    app.include_router(router, prefix="/api")
    
    return app

app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

## 🔧 Configuration

### Configuration File

**File**: `config/config.yaml`

```yaml
database:
  url: "sqlite:///data/securenet.db"
  echo: false

mlflow:
  tracking_uri: "http://localhost:5000"

cve:
  api_key: "${CVE_API_KEY}"
  cache_ttl: 3600

scanner:
  timeout: 5
  max_threads: 10

vulnerability_scanner:
  enabled: true
  scan_interval: 3600

notifications:
  email:
    enabled: false
    smtp_server: ""
    smtp_port: 587
  slack:
    enabled: false
    webhook_url: ""

logging:
  level: "INFO"
  format: "json"

redis:
  url: "redis://localhost:6379/0"

sentry:
  dsn: "${SENTRY_DSN}"
  environment: "development"
```

### Environment Variables

```bash
# Database
DATABASE_URL=sqlite:///data/securenet.db

# MLflow
MLFLOW_TRACKING_URI=http://localhost:5000

# CVE Integration
CVE_API_KEY=your-cve-api-key

# Monitoring
SENTRY_DSN=your-sentry-dsn

# Redis
REDIS_URL=redis://localhost:6379/0

# Logging
LOG_LEVEL=INFO
```

## 🚀 Usage Examples

### Creating Services with DI

```python
from core.container import create_container

# Create container
container = create_container()

# Get services (dependencies automatically injected)
threat_service = container.threat_detection_service()
network_scanner = container.network_scanner()
cve_processor = container.cve_processor()

# Use services
results = await threat_service.analyze_network_data(data)
```

### Testing with Mocked Dependencies

```python
from dependency_injector import containers, providers
from unittest.mock import Mock

# Create test container
test_container = containers.DynamicContainer()
test_container.database = providers.Object(Mock())
test_container.logger = providers.Object(Mock())

# Wire and test
test_container.wire(modules=[__name__])
service = ThreatDetectionService()  # Mocks injected automatically
```

## ✅ Validation Steps

1. **Install dependency-injector**:
   ```bash
   pip install dependency-injector
   ```

2. **Create Configuration**:
   ```bash
   mkdir -p config
   # Create config/config.yaml with your settings
   ```

3. **Test Container Creation**:
   ```python
   from core.container import create_container
   container = create_container()
   assert container.database() is not None
   ```

4. **Test Service Injection**:
   ```python
   threat_service = container.threat_detection_service()
   assert threat_service.database is not None
   ```

5. **Run Tests**:
   ```bash
   pytest tests/test_with_di.py -v
   ```

## 📈 Benefits for SecureNet

- **Modular Architecture** - Clean separation of concerns
- **Easy Testing** - Simple mocking and dependency replacement
- **Configuration Management** - Centralized configuration handling
- **Loose Coupling** - Services don't depend on concrete implementations
- **Maintainability** - Easier to modify and extend components
- **Production Ready** - Proper lifecycle management and resource cleanup

## 🔗 Related Documentation

- [Phase 2: Developer Experience](../integration/phase-2-developer-experience.md)
- [Dependency Injection Patterns](README.md)
- [Testing Framework Guide](../testing/README.md) 