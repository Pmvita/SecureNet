# Phase 3: Advanced Tooling & Specialized Integrations

**Goal**: Implement advanced monitoring, specialized testing, and cutting-edge ML tools for enterprise-grade capabilities.

**Priority**: Low - Advanced features for mature deployments

**Status**: ✅ **COMPLETED** - All 9 libraries successfully integrated

## 🎯 Libraries Covered

| Library | Purpose | Integration File |
|---------|---------|------------------|
| **OpenTelemetry** | Distributed tracing | [../monitoring/opentelemetry.md](../monitoring/opentelemetry.md) |
| **Schemathesis** | API fuzzing & testing | [../testing/schemathesis.md](../testing/schemathesis.md) |
| **Locust** | Load testing | [../testing/locust.md](../testing/locust.md) |
| **Optuna** | Hyperparameter optimization | [../ml/optuna.md](../ml/optuna.md) |
| **wandb** | Advanced experiment tracking | [../ml/wandb.md](../ml/wandb.md) |
| **Authlib** | Enhanced OAuth & JWT | [../auth/authlib.md](../auth/authlib.md) |
| **PyNaCl** | Advanced cryptography | [../auth/pynacl.md](../auth/pynacl.md) |
| **RQ** | Alternative task queue | [../tasks/rq.md](../tasks/rq.md) |
| **APScheduler** | In-process scheduling | [../tasks/apscheduler.md](../tasks/apscheduler.md) |

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install opentelemetry-api opentelemetry-sdk schemathesis locust optuna wandb authlib pynacl rq apscheduler
```

### 2. OpenTelemetry - Distributed Tracing
```bash
pip install opentelemetry-api opentelemetry-sdk opentelemetry-instrumentation-fastapi
```

**Integration Location**: `monitoring/tracing.py`
```python
from opentelemetry import trace
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

def setup_tracing(app):
    trace.set_tracer_provider(TracerProvider())
    tracer = trace.get_tracer(__name__)
    
    jaeger_exporter = JaegerExporter(
        agent_host_name="localhost",
        agent_port=6831,
    )
    
    span_processor = BatchSpanProcessor(jaeger_exporter)
    trace.get_tracer_provider().add_span_processor(span_processor)
    
    FastAPIInstrumentor.instrument_app(app)
    
    return tracer

# Usage in services
tracer = trace.get_tracer(__name__)

class NetworkAnalysisService:
    def analyze_traffic(self, traffic_data: dict):
        with tracer.start_as_current_span("analyze_network_traffic") as span:
            span.set_attribute("tenant_id", traffic_data.get("tenant_id"))
            span.set_attribute("data_size", len(traffic_data.get("packets", [])))
            # Analysis logic here
```

### 3. Schemathesis - API Fuzzing
```bash
pip install schemathesis
```

**Integration Location**: `tests/api_tests/test_api_fuzzing.py`
```python
import schemathesis

schema = schemathesis.from_uri("http://localhost:8000/openapi.json")

@schema.parametrize()
def test_api_endpoints(case):
    """Fuzz test all API endpoints"""
    case.call_and_validate()

# Custom test for security endpoints
@schema.parametrize(endpoint="/api/auth/login")
def test_auth_endpoint_security(case):
    """Specific security testing for auth endpoints"""
    response = case.call()
    # Custom security assertions
    assert 'password' not in response.text.lower()
    assert response.status_code != 500  # No server errors
```

### 4. Locust - Load Testing
```bash
pip install locust
```

**Integration Location**: `tests/load_tests/locustfile.py`
```python
from locust import HttpUser, task, between

class SecureNetUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Login and get auth token
        response = self.client.post("/api/auth/login", json={
            "username": "test_user",
            "password": "test_password"
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    @task(3)
    def view_dashboard(self):
        self.client.get("/api/dashboard", headers=self.headers)
    
    @task(2)
    def check_threats(self):
        self.client.get("/api/threats", headers=self.headers)
    
    @task(1)
    def run_scan(self):
        self.client.post("/api/scans", json={
            "scan_type": "vulnerability",
            "target": "192.168.1.0/24"
        }, headers=self.headers)
```

### 5. Optuna - Hyperparameter Optimization
```bash
pip install optuna
```

**Integration Location**: `ml/hyperparameter_tuning.py`
```python
import optuna
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import cross_val_score

class AnomalyDetectionTuner:
    def __init__(self, X_train, y_train):
        self.X_train = X_train
        self.y_train = y_train
    
    def objective(self, trial):
        # Suggest hyperparameters
        n_estimators = trial.suggest_int('n_estimators', 50, 300)
        contamination = trial.suggest_float('contamination', 0.01, 0.3)
        max_features = trial.suggest_float('max_features', 0.1, 1.0)
        
        # Create model with suggested parameters
        model = IsolationForest(
            n_estimators=n_estimators,
            contamination=contamination,
            max_features=max_features,
            random_state=42
        )
        
        # Cross-validation score
        scores = cross_val_score(model, self.X_train, self.y_train, cv=3)
        return scores.mean()
    
    def optimize(self, n_trials: int = 100):
        study = optuna.create_study(direction='maximize')
        study.optimize(self.objective, n_trials=n_trials)
        return study.best_params
```

### 6. wandb - Advanced Experiment Tracking
```bash
pip install wandb
```

**Integration Location**: `ml/wandb_tracking.py`
```python
import wandb
from typing import Dict, Any

class WandBTracker:
    def __init__(self, project_name: str = "securenet-ml"):
        self.project_name = project_name
    
    def start_experiment(self, config: Dict[str, Any], experiment_name: str):
        wandb.init(
            project=self.project_name,
            name=experiment_name,
            config=config
        )
    
    def log_metrics(self, metrics: Dict[str, float], step: int = None):
        wandb.log(metrics, step=step)
    
    def log_model_artifacts(self, model_path: str, model_name: str):
        artifact = wandb.Artifact(model_name, type='model')
        artifact.add_file(model_path)
        wandb.log_artifact(artifact)
    
    def finish_experiment(self):
        wandb.finish()

# Usage in ML training
tracker = WandBTracker()
tracker.start_experiment(
    config={"learning_rate": 0.01, "batch_size": 32},
    experiment_name="anomaly_detection_v1"
)
```

## 🔧 Configuration

### Environment Variables
```bash
# OpenTelemetry
JAEGER_AGENT_HOST=localhost
JAEGER_AGENT_PORT=6831

# wandb
WANDB_API_KEY=your-wandb-api-key
WANDB_PROJECT=securenet-ml

# Load Testing
LOCUST_HOST=http://localhost:8000
LOCUST_USERS=100
LOCUST_SPAWN_RATE=10
```

### Docker Compose Addition
```yaml
services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
      - "6831:6831/udp"
    environment:
      - COLLECTOR_OTLP_ENABLED=true
  
  optuna-dashboard:
    image: optuna/optuna-dashboard
    ports:
      - "8080:8080"
    command: optuna-dashboard sqlite:///optuna.db
    volumes:
      - optuna_data:/app
    
volumes:
  optuna_data:
```

## ✅ Validation Steps

1. **OpenTelemetry**: Verify traces appear in Jaeger UI
2. **Schemathesis**: Run API fuzzing tests and check coverage
3. **Locust**: Execute load tests and analyze performance metrics
4. **Optuna**: Run hyperparameter optimization and view results
5. **wandb**: Log experiments and verify dashboard functionality

## 📈 Expected Benefits

- **Distributed Tracing**: Deep insights into request flows across services
- **API Security**: Automated security testing and vulnerability discovery
- **Performance Testing**: Load testing for capacity planning
- **ML Optimization**: Automated hyperparameter tuning for better models
- **Advanced Tracking**: Rich experiment visualization and collaboration

## 🔗 Related Documentation

- [Advanced Monitoring Guide](../monitoring/README.md)
- [Security Testing Framework](../testing/README.md)
- [ML Optimization Tools](../ml/README.md)
- [Authentication Enhancement](../auth/README.md)

## 🎯 Implementation Notes

This phase should only be implemented after Phases 1 and 2 are complete and stable. These tools provide advanced capabilities that are most valuable in mature, high-scale deployments. 