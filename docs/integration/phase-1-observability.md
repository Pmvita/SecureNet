# Phase 1: Observability & Production Readiness

**Goal**: Establish essential production monitoring, error tracking, and background task processing for SecureNet.

**Priority**: High - Critical for production deployment

## 🎯 Libraries Covered

| Library | Purpose | Integration File |
|---------|---------|------------------|
| **Sentry** | Error tracking & performance monitoring | [../monitoring/sentry.md](../monitoring/sentry.md) |
| **Structlog** | Structured JSON logging | [../monitoring/structlog.md](../monitoring/structlog.md) |
| **Celery** | Distributed background tasks | [../tasks/celery.md](../tasks/celery.md) |

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install sentry-sdk[fastapi] structlog celery[redis]
```

### 2. Sentry - Error Tracking
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

### 3. Structlog - Structured Logging
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

### 4. Celery - Background Tasks
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

## 🔧 Configuration

### Environment Variables
```bash
# Sentry
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
ENVIRONMENT=production

# Redis (for Celery)
REDIS_URL=redis://localhost:6379/0

# Logging
LOG_LEVEL=INFO
```

### Docker Compose Addition
```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  celery-worker:
    build: .
    command: celery -A workers.celery_app worker --loglevel=info
    depends_on:
      - redis
    environment:
      - REDIS_URL=redis://redis:6379/0
  
  celery-beat:
    build: .
    command: celery -A workers.celery_app beat --loglevel=info
    depends_on:
      - redis
    environment:
      - REDIS_URL=redis://redis:6379/0
```

## ✅ Validation Steps

1. **Sentry**: Trigger a test error and verify it appears in Sentry dashboard
2. **Structlog**: Check logs are in JSON format with structured fields
3. **Celery**: Queue a test task and verify it processes successfully

## 📈 Expected Benefits

- **Production Monitoring**: Real-time error tracking and performance insights
- **Structured Logging**: Searchable, analyzable log data
- **Scalable Processing**: Background tasks for heavy operations
- **Reliability**: Better error handling and system observability

## 🔗 Related Documentation

- [Monitoring Tools Overview](../monitoring/README.md)
- [Background Tasks Guide](../tasks/README.md)
- [Phase 2: Developer Experience](phase-2-developer-experience.md) 