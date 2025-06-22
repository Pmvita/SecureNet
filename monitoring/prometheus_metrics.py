"""
SecureNet Prometheus Metrics Collection
Phase 1: Observability - Prometheus Integration
"""

from prometheus_client import Counter, Histogram, Gauge, Info, CollectorRegistry, generate_latest
from prometheus_fastapi_instrumentator import Instrumentator
import time
import os
from typing import Dict, Any
from utils.logging_config import get_logger

logger = get_logger(__name__)

# Create custom registry for SecureNet metrics
securenet_registry = CollectorRegistry()

# Security Metrics
threat_detections_total = Counter(
    'securenet_threat_detections_total',
    'Total number of threats detected',
    ['tenant_id', 'threat_type', 'severity'],
    registry=securenet_registry
)

scan_duration_seconds = Histogram(
    'securenet_scan_duration_seconds',
    'Time spent on security scans',
    ['tenant_id', 'scan_type'],
    registry=securenet_registry
)

vulnerabilities_found_total = Counter(
    'securenet_vulnerabilities_found_total',
    'Total vulnerabilities found',
    ['tenant_id', 'severity', 'cve_type'],
    registry=securenet_registry
)

active_scans_gauge = Gauge(
    'securenet_active_scans',
    'Number of currently active scans',
    ['tenant_id'],
    registry=securenet_registry
)

# Authentication Metrics
auth_attempts_total = Counter(
    'securenet_auth_attempts_total',
    'Total authentication attempts',
    ['tenant_id', 'result', 'method'],
    registry=securenet_registry
)

active_sessions_gauge = Gauge(
    'securenet_active_sessions',
    'Number of active user sessions',
    ['tenant_id', 'role'],
    registry=securenet_registry
)

# System Metrics
api_requests_total = Counter(
    'securenet_api_requests_total',
    'Total API requests',
    ['tenant_id', 'endpoint', 'method', 'status'],
    registry=securenet_registry
)

database_operations_duration = Histogram(
    'securenet_database_operations_duration_seconds',
    'Database operation duration',
    ['operation_type', 'table'],
    registry=securenet_registry
)

# ML Model Metrics
ml_predictions_total = Counter(
    'securenet_ml_predictions_total',
    'Total ML model predictions',
    ['model_name', 'prediction_type'],
    registry=securenet_registry
)

ml_model_accuracy = Gauge(
    'securenet_ml_model_accuracy',
    'Current ML model accuracy',
    ['model_name'],
    registry=securenet_registry
)

class SecureNetMetrics:
    """SecureNet metrics collection and management"""
    
    def __init__(self):
        self.logger = get_logger("metrics")
        self.start_time = time.time()
    
    # Security Metrics Methods
    def record_threat_detection(self, tenant_id: str, threat_type: str, severity: str):
        """Record a threat detection event"""
        threat_detections_total.labels(
            tenant_id=tenant_id,
            threat_type=threat_type,
            severity=severity
        ).inc()
        
        self.logger.info(
            "Threat detection recorded",
            tenant_id=tenant_id,
            threat_type=threat_type,
            severity=severity
        )
    
    def record_scan_duration(self, tenant_id: str, scan_type: str, duration: float):
        """Record scan duration"""
        scan_duration_seconds.labels(
            tenant_id=tenant_id,
            scan_type=scan_type
        ).observe(duration)
    
    def record_vulnerability(self, tenant_id: str, severity: str, cve_type: str):
        """Record vulnerability found"""
        vulnerabilities_found_total.labels(
            tenant_id=tenant_id,
            severity=severity,
            cve_type=cve_type
        ).inc()
    
    def set_active_scans(self, tenant_id: str, count: int):
        """Set number of active scans"""
        active_scans_gauge.labels(tenant_id=tenant_id).set(count)
    
    # Authentication Metrics Methods
    def record_auth_attempt(self, tenant_id: str, result: str, method: str = "password"):
        """Record authentication attempt"""
        auth_attempts_total.labels(
            tenant_id=tenant_id,
            result=result,  # success, failure, blocked
            method=method
        ).inc()
    
    def set_active_sessions(self, tenant_id: str, role: str, count: int):
        """Set number of active sessions"""
        active_sessions_gauge.labels(
            tenant_id=tenant_id,
            role=role
        ).set(count)
    
    # API Metrics Methods
    def record_api_request(self, tenant_id: str, endpoint: str, method: str, status: int):
        """Record API request"""
        api_requests_total.labels(
            tenant_id=tenant_id,
            endpoint=endpoint,
            method=method,
            status=str(status)
        ).inc()
    
    def record_database_operation(self, operation_type: str, table: str, duration: float):
        """Record database operation duration"""
        database_operations_duration.labels(
            operation_type=operation_type,
            table=table
        ).observe(duration)
    
    # ML Metrics Methods
    def record_ml_prediction(self, model_name: str, prediction_type: str):
        """Record ML model prediction"""
        ml_predictions_total.labels(
            model_name=model_name,
            prediction_type=prediction_type
        ).inc()
    
    def set_model_accuracy(self, model_name: str, accuracy: float):
        """Set ML model accuracy"""
        ml_model_accuracy.labels(model_name=model_name).set(accuracy)
    
    def record_app_startup(self, success: bool = True):
        """Record application startup event"""
        status = "success" if success else "failure"
        self.logger.info(f"Application startup recorded: {status}")
        
        # You could add a specific metric here if needed
        # For now, just log the event
        if success:
            self.logger.info("✅ SecureNet Enterprise started successfully")
        else:
            self.logger.error("❌ SecureNet Enterprise startup failed")
    
    def get_metrics(self) -> str:
        """Get all metrics in Prometheus format"""
        return generate_latest(securenet_registry)

def setup_fastapi_metrics(app):
    """Setup FastAPI metrics instrumentation"""
    
    instrumentator = Instrumentator(
        should_group_status_codes=False,
        should_ignore_untemplated=True,
        should_respect_env_var=True,
        should_instrument_requests_inprogress=True,
        excluded_handlers=["/metrics", "/health"],
        env_var_name="ENABLE_METRICS",
        inprogress_name="securenet_inprogress",
        inprogress_labels=True,
    )
    
    instrumentator.instrument(app)
    instrumentator.expose(app, endpoint="/metrics")
    
    # Only log if enterprise boot logs are not disabled
    if not os.getenv("DISABLE_ENTERPRISE_BOOT_LOGS", "false").lower() == "true":
        logger.info("FastAPI metrics instrumentation configured")
    
    return instrumentator

# Global metrics instance
metrics = SecureNetMetrics()

# Metrics context manager for timing operations
class MetricsTimer:
    """Context manager for timing operations"""
    
    def __init__(self, metric_func, *args, **kwargs):
        self.metric_func = metric_func
        self.args = args
        self.kwargs = kwargs
        self.start_time = None
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.time() - self.start_time
        self.metric_func(*self.args, duration, **self.kwargs) 