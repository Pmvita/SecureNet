# Phase 2: Developer Experience & ML Tooling

**Goal**: Enhance development workflow with ML lifecycle management, advanced testing, and modular architecture.

**Priority**: Medium - Improves development velocity and code quality

## 🎯 Libraries Covered

| Library | Purpose | Integration File |
|---------|---------|------------------|
| **MLflow** | ML lifecycle management | [../ml/mlflow.md](../ml/mlflow.md) |
| **Hypothesis** | Property-based testing | [../testing/hypothesis.md](../testing/hypothesis.md) |
| **dependency-injector** | Dependency injection framework | [../di/dependency-injector.md](../di/dependency-injector.md) |
| **Joblib** | Model persistence | [../ml/joblib.md](../ml/joblib.md) |
| **pytest-xdist** | Parallel test execution | [../testing/pytest-xdist.md](../testing/pytest-xdist.md) |

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install mlflow hypothesis dependency-injector joblib pytest-xdist
```

### 2. MLflow - ML Lifecycle Management
```bash
pip install mlflow
```

**Integration Location**: `ml/mlflow_tracking.py`
```python
import mlflow
import mlflow.sklearn
from mlflow.tracking import MlflowClient

class MLModelManager:
    def __init__(self):
        mlflow.set_tracking_uri("http://localhost:5000")
        self.client = MlflowClient()
    
    def train_and_log_model(self, model, X_train, y_train, model_name: str):
        with mlflow.start_run():
            # Train model
            model.fit(X_train, y_train)
            
            # Log parameters
            mlflow.log_param("model_type", type(model).__name__)
            mlflow.log_param("training_samples", len(X_train))
            
            # Log metrics
            accuracy = model.score(X_train, y_train)
            mlflow.log_metric("accuracy", accuracy)
            
            # Log model
            mlflow.sklearn.log_model(model, model_name)
            
            return mlflow.active_run().info.run_id
    
    def load_production_model(self, model_name: str):
        model_version = self.client.get_latest_versions(
            model_name, stages=["Production"]
        )[0]
        return mlflow.sklearn.load_model(f"models:/{model_name}/{model_version.version}")
```

### 3. Hypothesis - Property-Based Testing
```bash
pip install hypothesis
```

**Integration Location**: `tests/property_tests/test_threat_detection.py`
```python
from hypothesis import given, strategies as st
from hypothesis.strategies import composite

@composite
def network_traffic_data(draw):
    return {
        'source_ip': draw(st.ip_addresses(v=4).map(str)),
        'dest_ip': draw(st.ip_addresses(v=4).map(str)),
        'port': draw(st.integers(min_value=1, max_value=65535)),
        'protocol': draw(st.sampled_from(['TCP', 'UDP', 'ICMP'])),
        'bytes_transferred': draw(st.integers(min_value=0, max_value=1000000)),
    }

@given(traffic_data=network_traffic_data())
def test_threat_detection_never_crashes(traffic_data):
    """Property: Threat detection should never crash on valid network data"""
    detector = ThreatDetectionService()
    result = detector.analyze_traffic(traffic_data)
    assert isinstance(result, dict)
    assert 'threat_level' in result
    assert result['threat_level'] in ['low', 'medium', 'high', 'critical']
```

### 4. dependency-injector - DI Framework
```bash
pip install dependency-injector
```

**Integration Location**: `core/container.py`
```python
from dependency_injector import containers, providers
from dependency_injector.wiring import Provide, inject

class Container(containers.DeclarativeContainer):
    # Configuration
    config = providers.Configuration()
    
    # Database
    database = providers.Singleton(
        Database,
        config.database.url,
    )
    
    # Services
    threat_detection_service = providers.Factory(
        ThreatDetectionService,
        database=database,
    )
    
    vulnerability_scanner = providers.Factory(
        VulnerabilityScanner,
        config=config.scanner,
    )
    
    ml_service = providers.Factory(
        MLAnomalyService,
        model_path=config.ml.model_path,
    )

# FastAPI endpoint with DI
@app.get("/api/threats/analyze")
@inject
async def analyze_threats(
    threat_service: ThreatDetectionService = Provide[Container.threat_detection_service]
):
    return await threat_service.analyze_current_threats()
```

### 5. Joblib - Model Persistence
```bash
pip install joblib
```

**Integration Location**: `ml/model_persistence.py`
```python
import joblib
from pathlib import Path

class ModelPersistence:
    def __init__(self, models_dir: str = "models"):
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(exist_ok=True)
    
    def save_model(self, model, model_name: str, tenant_id: str = None):
        filename = f"{model_name}_{tenant_id}.joblib" if tenant_id else f"{model_name}.joblib"
        filepath = self.models_dir / filename
        joblib.dump(model, filepath)
        return str(filepath)
    
    def load_model(self, model_name: str, tenant_id: str = None):
        filename = f"{model_name}_{tenant_id}.joblib" if tenant_id else f"{model_name}.joblib"
        filepath = self.models_dir / filename
        if filepath.exists():
            return joblib.load(filepath)
        raise FileNotFoundError(f"Model {filename} not found")
    
    def list_models(self):
        return [f.stem for f in self.models_dir.glob("*.joblib")]
```

### 6. pytest-xdist - Parallel Testing
```bash
pip install pytest-xdist
```

**Integration Location**: `pytest.ini`
```ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --tb=short --strict-markers
markers =
    slow: marks tests as slow
    integration: marks tests as integration tests
    unit: marks tests as unit tests
```

**Usage**: Run tests in parallel
```bash
pytest -n auto  # Use all CPU cores
pytest -n 4     # Use 4 processes
```

## 🔧 Configuration

### Environment Variables
```bash
# MLflow
MLFLOW_TRACKING_URI=http://localhost:5000
MLFLOW_EXPERIMENT_NAME=securenet-ml

# Model Storage
MODEL_STORAGE_PATH=./models
```

### Docker Compose Addition
```yaml
services:
  mlflow:
    image: python:3.11-slim
    command: >
      bash -c "pip install mlflow && 
               mlflow server --host 0.0.0.0 --port 5000 
               --backend-store-uri sqlite:///mlflow.db 
               --default-artifact-root ./mlruns"
    ports:
      - "5000:5000"
    volumes:
      - mlflow_data:/app
    
volumes:
  mlflow_data:
```

## ✅ Validation Steps

1. **MLflow**: Start MLflow server and log a test experiment
2. **Hypothesis**: Run property-based tests and verify edge case coverage
3. **DI**: Test dependency injection with FastAPI endpoints
4. **Joblib**: Save and load a test model
5. **pytest-xdist**: Run test suite in parallel and verify speed improvement

## 📈 Expected Benefits

- **ML Lifecycle**: Experiment tracking, model versioning, and deployment
- **Robust Testing**: Property-based testing finds edge cases automatically
- **Clean Architecture**: Dependency injection improves testability
- **Fast Development**: Parallel testing reduces feedback loops
- **Model Management**: Efficient model serialization and loading

## 🔗 Related Documentation

- [ML Tools Overview](../ml/README.md)
- [Testing Framework Guide](../testing/README.md)
- [Dependency Injection Patterns](../di/README.md)
- [Phase 3: Advanced Tooling](phase-3-advanced-tooling.md) 