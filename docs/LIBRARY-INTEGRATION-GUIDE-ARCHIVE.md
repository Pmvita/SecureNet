# SecureNet Library Integration Guide

This guide provides modular integration scaffolds for enhancing SecureNet with recommended libraries from awesome-python.

## 🔐 1. API Security & Authentication

### Authlib - Enhanced OAuth & JWT
```bash
pip install authlib
```

**Integration Location**: `api/auth/enhanced_auth.py`
```python
from authlib.integrations.fastapi_oauth2 import AuthorizationServer
from authlib.oauth2.rfc6749 import grants
from authlib.jose import jwt

class EnhancedAuthManager:
    def __init__(self):
        self.authorization_server = AuthorizationServer()
    
    def create_oauth_token(self, user_id: str, tenant_id: str):
        payload = {
            'sub': user_id,
            'tenant_id': tenant_id,
            'scope': 'read write admin'
        }
        return jwt.encode({'alg': 'HS256'}, payload, 'your-secret-key')
```

**When to use**: For enterprise SSO integration, OAuth2 flows, or advanced JWT features beyond basic authentication.

### PyNaCl - Cryptographic Security
```bash
pip install pynacl
```

**Integration Location**: `api/utils/crypto.py`
```python
import nacl.secret
import nacl.utils
from nacl.public import PrivateKey, Box

class SecureNetCrypto:
    def __init__(self):
        self.secret_key = nacl.utils.random(nacl.secret.SecretBox.KEY_SIZE)
        self.box = nacl.secret.SecretBox(self.secret_key)
    
    def encrypt_sensitive_data(self, data: str) -> bytes:
        return self.box.encrypt(data.encode())
    
    def decrypt_sensitive_data(self, encrypted_data: bytes) -> str:
        return self.box.decrypt(encrypted_data).decode()
```

**When to use**: For encrypting sensitive configuration data, API keys, or user credentials at rest.

### python-jose - JWT Enhancement
```bash
pip install python-jose[cryptography]
```

**Integration Location**: `api/auth/jwt_enhanced.py`
```python
from jose import jwt, JWTError
from jose.constants import ALGORITHMS
from datetime import datetime, timedelta

class EnhancedJWTManager:
    def __init__(self, secret_key: str):
        self.secret_key = secret_key
        self.algorithm = ALGORITHMS.HS256
    
    def create_token_with_claims(self, user_data: dict, custom_claims: dict = None):
        payload = {
            **user_data,
            **(custom_claims or {}),
            'iat': datetime.utcnow(),
            'exp': datetime.utcnow() + timedelta(hours=24)
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
```

**When to use**: To extend existing JWT implementation with additional claims or cryptographic algorithms.

## ⚙️ 2. Background Task Processing

### Celery - Distributed Task Queue
```bash
pip install celery[redis]
```

**Integration Location**: `workers/celery_app.py`
```python
from celery import Celery
from celery.schedules import crontab

celery_app = Celery(
    'securenet',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/0'
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    beat_schedule={
        'vulnerability-scan': {
            'task': 'workers.tasks.run_vulnerability_scan',
            'schedule': crontab(minute=0, hour='*/6'),  # Every 6 hours
        },
        'ml-model-retrain': {
            'task': 'workers.tasks.retrain_anomaly_model',
            'schedule': crontab(minute=0, hour=2),  # Daily at 2 AM
        },
    },
)
```

**Task Implementation**: `workers/tasks.py`
```python
from workers.celery_app import celery_app
from ml.anomaly_detection import AnomalyDetector

@celery_app.task
def run_vulnerability_scan(tenant_id: str):
    """Background vulnerability scanning task"""
    # Implement CVE scanning logic
    pass

@celery_app.task
def retrain_anomaly_model(tenant_id: str):
    """Background ML model retraining"""
    detector = AnomalyDetector()
    detector.retrain_model(tenant_id)
    return f"Model retrained for tenant {tenant_id}"

@celery_app.task
def process_network_logs(log_batch: list):
    """Process network logs asynchronously"""
    # Implement log processing logic
    pass
```

**When to use**: For long-running vulnerability scans, ML model training, or bulk data processing.

### RQ - Simple Task Queue
```bash
pip install rq
```

**Integration Location**: `workers/rq_worker.py`
```python
from rq import Queue, Worker
import redis

redis_conn = redis.Redis(host='localhost', port=6379, db=1)
task_queue = Queue('securenet_tasks', connection=redis_conn)

def enqueue_scan_task(network_id: str, scan_type: str):
    job = task_queue.enqueue(
        'workers.scan_tasks.perform_network_scan',
        network_id,
        scan_type,
        timeout='30m'
    )
    return job.id
```

**When to use**: For simpler task queuing needs or when Redis is already in your stack.

### APScheduler - In-Process Scheduling
```bash
pip install apscheduler
```

**Integration Location**: `schedulers/background_scheduler.py`
```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

class SecureNetScheduler:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
    
    def start_scheduled_tasks(self):
        # Schedule threat intelligence updates
        self.scheduler.add_job(
            self.update_threat_intelligence,
            CronTrigger(hour=1, minute=0),  # Daily at 1 AM
            id='threat_intel_update'
        )
        
        # Schedule health checks
        self.scheduler.add_job(
            self.system_health_check,
            CronTrigger(minute='*/15'),  # Every 15 minutes
            id='health_check'
        )
        
        self.scheduler.start()
    
    async def update_threat_intelligence(self):
        # Update CVE database, threat feeds
        pass
    
    async def system_health_check(self):
        # Check system components
        pass
```

**When to use**: For lightweight scheduling within the FastAPI application process.

## 📊 3. Monitoring & Observability

### Sentry - Error Tracking
```bash
pip install sentry-sdk[fastapi]
```

**Integration Location**: `monitoring/sentry_config.py`
```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlAlchemyIntegration

def init_sentry(dsn: str, environment: str = "production"):
    sentry_sdk.init(
        dsn=dsn,
        integrations=[
            FastApiIntegration(auto_enabling_integrations=False),
            SqlAlchemyIntegration(),
        ],
        traces_sample_rate=0.1,
        environment=environment,
        before_send=filter_sensitive_data,
    )

def filter_sensitive_data(event, hint):
    # Remove sensitive data from error reports
    if 'request' in event:
        if 'headers' in event['request']:
            event['request']['headers'].pop('authorization', None)
    return event
```

**FastAPI Integration**: Add to `app.py`
```python
from monitoring.sentry_config import init_sentry

# Initialize Sentry before creating FastAPI app
init_sentry(os.getenv("SENTRY_DSN"), os.getenv("ENVIRONMENT", "development"))
```

**When to use**: For production error tracking and performance monitoring.

### Structlog - Structured Logging
```bash
pip install structlog
```

**Integration Location**: `utils/logging_config.py`
```python
import structlog
import logging
from datetime import datetime

def configure_structlog():
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

# Usage in SecureNet components
logger = structlog.get_logger()

class ThreatDetectionService:
    def detect_anomaly(self, network_data: dict):
        logger.info(
            "anomaly_detection_started",
            tenant_id=network_data.get("tenant_id"),
            data_points=len(network_data.get("metrics", [])),
            timestamp=datetime.utcnow().isoformat()
        )
```

**When to use**: For structured logging that integrates well with log aggregation systems.

### OpenTelemetry - Distributed Tracing
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

**When to use**: For distributed tracing across microservices and complex request flows.

## 🏗️ 4. Dependency Injection

### dependency-injector - DI Framework
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

**When to use**: For better testability and modular service architecture.

### injector - Lightweight DI
```bash
pip install injector
```

**Integration Location**: `core/injector_config.py`
```python
from injector import Injector, inject, singleton, Module, provider
import os

class DatabaseModule(Module):
    @singleton
    @provider
    def provide_database(self) -> Database:
        return Database(connection_string=os.getenv("DATABASE_URL"))

class ServicesModule(Module):
    @inject
    @provider
    def provide_threat_service(self, db: Database) -> ThreatDetectionService:
        return ThreatDetectionService(db)

# Setup injector
injector = Injector([DatabaseModule, ServicesModule])

# Usage in FastAPI
@app.get("/api/scan")
def start_scan():
    scanner = injector.get(VulnerabilityScanner)
    return scanner.start_scan()
```

**When to use**: For simpler dependency injection needs without complex configuration.

## 🧪 5. Testing & Reliability

### Hypothesis - Property-Based Testing
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

**When to use**: For testing edge cases and ensuring robustness of security algorithms.

### Schemathesis - API Testing
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

**When to use**: For comprehensive API security testing and finding edge cases.

### Locust - Load Testing
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

**When to use**: For performance testing and capacity planning.

### pytest-xdist - Parallel Testing
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

**When to use**: To speed up test execution in CI/CD pipelines.

## 🤖 6. ML Tooling

### MLflow - ML Lifecycle Management
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

**When to use**: For tracking ML experiments and managing model versions in production.

### Optuna - Hyperparameter Optimization
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

**When to use**: For optimizing ML model performance automatically.

### Joblib - Model Persistence
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

**When to use**: For efficient model serialization and loading in production.

### wandb - Experiment Tracking
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

**When to use**: For comprehensive ML experiment tracking and collaboration.

## 📦 Requirements.txt Updates

Add these to your `requirements.txt` based on chosen integrations:

```txt
# Enhanced Security & Auth
authlib>=1.2.0
pynacl>=1.5.0
python-jose[cryptography]>=3.3.0

# Background Processing
celery[redis]>=5.3.0
rq>=1.15.0
apscheduler>=3.10.0

# Monitoring & Observability
sentry-sdk[fastapi]>=1.32.0
structlog>=23.1.0
opentelemetry-api>=1.20.0
opentelemetry-sdk>=1.20.0
opentelemetry-instrumentation-fastapi>=0.41b0

# Dependency Injection
dependency-injector>=4.41.0
injector>=0.20.1

# Testing & Reliability
hypothesis>=6.82.0
schemathesis>=3.19.0
locust>=2.16.0
pytest-xdist>=3.3.0

# ML Tooling
mlflow>=2.6.0
optuna>=3.3.0
joblib>=1.3.0
wandb>=0.15.0
```

## 🚀 Integration Priority Recommendations

1. **High Priority**: Sentry (error tracking), Structlog (logging), Celery (background tasks)
2. **Medium Priority**: MLflow (ML lifecycle), Hypothesis (property testing), dependency-injector
3. **Low Priority**: OpenTelemetry (if not using microservices), wandb (if MLflow suffices)

Each integration is designed to be modular and non-disruptive to SecureNet's existing architecture. 