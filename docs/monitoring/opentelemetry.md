✅ **Integrated in Phase 3** – See [phase guide](../integration/phase-3-advanced-tooling.md)

# OpenTelemetry - Distributed Tracing

OpenTelemetry is an observability framework for cloud-native software that provides APIs, libraries, agents, and instrumentation to generate, collect, and export telemetry data.

## 🎯 Purpose for SecureNet

- **Distributed Tracing** - Track requests across microservices
- **Performance Monitoring** - Identify bottlenecks in threat detection
- **Service Dependencies** - Visualize service interactions
- **Error Tracking** - Correlate errors across the system
- **Observability** - Deep insights into system behavior

## 📦 Installation

```bash
pip install opentelemetry-api opentelemetry-sdk
pip install opentelemetry-instrumentation-fastapi
pip install opentelemetry-instrumentation-sqlalchemy
pip install opentelemetry-instrumentation-redis
pip install opentelemetry-exporter-jaeger-thrift
pip install opentelemetry-exporter-prometheus
```

## 🔧 Integration

### Core Tracing Setup

**File**: `monitoring/tracing.py`

```python
import os
from opentelemetry import trace, metrics
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.exporter.prometheus import PrometheusMetricReader
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.propagate import set_global_textmap
from opentelemetry.propagators.b3 import B3MultiFormat
import structlog

logger = structlog.get_logger()

class TelemetryManager:
    """Manages OpenTelemetry setup for SecureNet"""
    
    def __init__(self, service_name: str = "securenet"):
        self.service_name = service_name
        self.tracer = None
        self.meter = None
        
    def setup_tracing(self, jaeger_endpoint: str = None, console_export: bool = False):
        """Setup distributed tracing"""
        
        # Create tracer provider
        trace.set_tracer_provider(TracerProvider(
            resource=self._create_resource()
        ))
        
        # Setup exporters
        exporters = []
        
        if jaeger_endpoint:
            jaeger_exporter = JaegerExporter(
                agent_host_name=jaeger_endpoint.split(':')[0],
                agent_port=int(jaeger_endpoint.split(':')[1]) if ':' in jaeger_endpoint else 6831,
            )
            exporters.append(jaeger_exporter)
        
        if console_export:
            exporters.append(ConsoleSpanExporter())
        
        # Add span processors
        for exporter in exporters:
            span_processor = BatchSpanProcessor(exporter)
            trace.get_tracer_provider().add_span_processor(span_processor)
        
        # Set up propagation
        set_global_textmap(B3MultiFormat())
        
        # Get tracer
        self.tracer = trace.get_tracer(self.service_name)
        
        logger.info("Distributed tracing initialized", service=self.service_name)
        
    def setup_metrics(self, prometheus_port: int = 8000):
        """Setup metrics collection"""
        
        # Create metrics provider with Prometheus exporter
        metric_reader = PrometheusMetricReader(port=prometheus_port)
        metrics.set_meter_provider(MeterProvider(
            resource=self._create_resource(),
            metric_readers=[metric_reader]
        ))
        
        self.meter = metrics.get_meter(self.service_name)
        
        logger.info("Metrics collection initialized", prometheus_port=prometheus_port)
        
    def instrument_fastapi(self, app):
        """Instrument FastAPI application"""
        FastAPIInstrumentor.instrument_app(app)
        logger.info("FastAPI instrumentation enabled")
        
    def instrument_sqlalchemy(self, engine):
        """Instrument SQLAlchemy database connections"""
        SQLAlchemyInstrumentor().instrument(engine=engine)
        logger.info("SQLAlchemy instrumentation enabled")
        
    def instrument_redis(self):
        """Instrument Redis connections"""
        RedisInstrumentor().instrument()
        logger.info("Redis instrumentation enabled")
        
    def _create_resource(self):
        """Create resource with service information"""
        from opentelemetry.sdk.resources import Resource
        
        return Resource.create({
            "service.name": self.service_name,
            "service.version": os.getenv("SERVICE_VERSION", "1.0.0"),
            "deployment.environment": os.getenv("ENVIRONMENT", "development"),
        })

# Global telemetry manager instance
telemetry = TelemetryManager()

def get_tracer():
    """Get the global tracer instance"""
    return telemetry.tracer

def get_meter():
    """Get the global meter instance"""
    return telemetry.meter
```

### Custom Instrumentation for SecureNet Services

**File**: `monitoring/custom_instrumentation.py`

```python
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode
from functools import wraps
import time
from typing import Dict, Any, Optional
import structlog

logger = structlog.get_logger()
tracer = trace.get_tracer(__name__)

def trace_threat_detection(operation_name: str = None):
    """Decorator for tracing threat detection operations"""
    
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            span_name = operation_name or f"threat_detection.{func.__name__}"
            
            with tracer.start_as_current_span(span_name) as span:
                try:
                    # Add common attributes
                    span.set_attribute("operation.name", func.__name__)
                    span.set_attribute("operation.type", "threat_detection")
                    
                    # Extract tenant info if available
                    if 'tenant_id' in kwargs:
                        span.set_attribute("tenant.id", kwargs['tenant_id'])
                    
                    # Start timing
                    start_time = time.time()
                    
                    # Execute function
                    result = await func(*args, **kwargs)
                    
                    # Record success metrics
                    duration = time.time() - start_time
                    span.set_attribute("operation.duration_ms", duration * 1000)
                    span.set_attribute("operation.success", True)
                    
                    # Add result metadata
                    if isinstance(result, dict):
                        if 'threat_count' in result:
                            span.set_attribute("threats.detected", result['threat_count'])
                        if 'severity' in result:
                            span.set_attribute("threats.max_severity", result['severity'])
                    
                    span.set_status(Status(StatusCode.OK))
                    return result
                    
                except Exception as e:
                    # Record error
                    span.set_attribute("operation.success", False)
                    span.set_attribute("error.type", type(e).__name__)
                    span.set_attribute("error.message", str(e))
                    span.set_status(Status(StatusCode.ERROR, str(e)))
                    
                    logger.error("Threat detection operation failed", 
                               operation=func.__name__, error=str(e))
                    raise
                    
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            span_name = operation_name or f"threat_detection.{func.__name__}"
            
            with tracer.start_as_current_span(span_name) as span:
                try:
                    span.set_attribute("operation.name", func.__name__)
                    span.set_attribute("operation.type", "threat_detection")
                    
                    if 'tenant_id' in kwargs:
                        span.set_attribute("tenant.id", kwargs['tenant_id'])
                    
                    start_time = time.time()
                    result = func(*args, **kwargs)
                    
                    duration = time.time() - start_time
                    span.set_attribute("operation.duration_ms", duration * 1000)
                    span.set_attribute("operation.success", True)
                    
                    span.set_status(Status(StatusCode.OK))
                    return result
                    
                except Exception as e:
                    span.set_attribute("operation.success", False)
                    span.set_attribute("error.type", type(e).__name__)
                    span.set_attribute("error.message", str(e))
                    span.set_status(Status(StatusCode.ERROR, str(e)))
                    raise
        
        # Return appropriate wrapper based on function type
        if hasattr(func, '__code__') and func.__code__.co_flags & 0x80:  # CO_COROUTINE
            return async_wrapper
        else:
            return sync_wrapper
            
    return decorator

def trace_network_scan(scan_type: str = None):
    """Decorator for tracing network scanning operations"""
    
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            span_name = f"network_scan.{scan_type or func.__name__}"
            
            with tracer.start_as_current_span(span_name) as span:
                try:
                    span.set_attribute("scan.type", scan_type or "unknown")
                    span.set_attribute("operation.name", func.__name__)
                    
                    # Extract scan parameters
                    if 'target' in kwargs:
                        span.set_attribute("scan.target", kwargs['target'])
                    if 'port_range' in kwargs:
                        span.set_attribute("scan.port_range", str(kwargs['port_range']))
                    
                    start_time = time.time()
                    result = await func(*args, **kwargs)
                    
                    # Record scan results
                    duration = time.time() - start_time
                    span.set_attribute("scan.duration_ms", duration * 1000)
                    
                    if isinstance(result, dict):
                        if 'hosts_found' in result:
                            span.set_attribute("scan.hosts_found", result['hosts_found'])
                        if 'vulnerabilities' in result:
                            span.set_attribute("scan.vulnerabilities_found", len(result['vulnerabilities']))
                    
                    span.set_status(Status(StatusCode.OK))
                    return result
                    
                except Exception as e:
                    span.set_attribute("error.type", type(e).__name__)
                    span.set_attribute("error.message", str(e))
                    span.set_status(Status(StatusCode.ERROR, str(e)))
                    raise
                    
        return wrapper
    return decorator

class MetricsCollector:
    """Collect custom metrics for SecureNet operations"""
    
    def __init__(self):
        from monitoring.tracing import get_meter
        self.meter = get_meter()
        
        # Create metrics instruments
        self.threat_detection_counter = self.meter.create_counter(
            name="threat_detections_total",
            description="Total number of threat detections",
            unit="1"
        )
        
        self.threat_detection_duration = self.meter.create_histogram(
            name="threat_detection_duration_ms",
            description="Duration of threat detection operations",
            unit="ms"
        )
        
        self.network_scan_counter = self.meter.create_counter(
            name="network_scans_total",
            description="Total number of network scans",
            unit="1"
        )
        
        self.active_threats_gauge = self.meter.create_up_down_counter(
            name="active_threats_current",
            description="Current number of active threats",
            unit="1"
        )
        
        self.api_requests_counter = self.meter.create_counter(
            name="api_requests_total",
            description="Total number of API requests",
            unit="1"
        )
    
    def record_threat_detection(self, tenant_id: str, threat_level: str, duration_ms: float):
        """Record threat detection metrics"""
        attributes = {
            "tenant_id": tenant_id,
            "threat_level": threat_level
        }
        
        self.threat_detection_counter.add(1, attributes)
        self.threat_detection_duration.record(duration_ms, attributes)
    
    def record_network_scan(self, scan_type: str, target: str, success: bool):
        """Record network scan metrics"""
        attributes = {
            "scan_type": scan_type,
            "target_type": self._classify_target(target),
            "success": str(success).lower()
        }
        
        self.network_scan_counter.add(1, attributes)
    
    def update_active_threats(self, tenant_id: str, count: int):
        """Update active threats gauge"""
        self.active_threats_gauge.add(count, {"tenant_id": tenant_id})
    
    def record_api_request(self, endpoint: str, method: str, status_code: int):
        """Record API request metrics"""
        attributes = {
            "endpoint": endpoint,
            "method": method,
            "status_code": str(status_code)
        }
        
        self.api_requests_counter.add(1, attributes)
    
    def _classify_target(self, target: str) -> str:
        """Classify scan target type"""
        if '/' in target:
            return "network"
        elif ':' in target:
            return "host_port"
        else:
            return "host"

# Global metrics collector
metrics_collector = MetricsCollector()
```

### Integration with SecureNet Services

**File**: `ml/anomaly_detection_traced.py`

```python
from monitoring.custom_instrumentation import trace_threat_detection, metrics_collector
from monitoring.tracing import get_tracer
from ml.anomaly_detection import ThreatDetectionService
from typing import List, Dict, Optional
import structlog

logger = structlog.get_logger()
tracer = get_tracer()

class TracedThreatDetectionService(ThreatDetectionService):
    """Threat detection service with OpenTelemetry tracing"""
    
    @trace_threat_detection("analyze_network_traffic")
    async def analyze_network_data(self, 
                                  network_data: List[Dict], 
                                  tenant_id: Optional[str] = None) -> List[Dict]:
        """Analyze network data with distributed tracing"""
        
        with tracer.start_as_current_span("prepare_data") as span:
            span.set_attribute("data.size", len(network_data))
            span.set_attribute("data.type", "network_traffic")
            
            # Prepare data for analysis
            processed_data = self._preprocess_data(network_data)
        
        with tracer.start_as_current_span("ml_inference") as span:
            span.set_attribute("model.type", "isolation_forest")
            span.set_attribute("tenant.id", tenant_id or "global")
            
            # Perform ML inference
            results = await super().analyze_network_data(processed_data, tenant_id)
        
        with tracer.start_as_current_span("post_process_results") as span:
            # Post-process and enrich results
            enriched_results = self._enrich_results(results)
            
            # Record metrics
            threat_count = sum(1 for r in enriched_results if r.get('is_threat', False))
            max_severity = max((r.get('severity_score', 0) for r in enriched_results), default=0)
            
            span.set_attribute("results.threat_count", threat_count)
            span.set_attribute("results.max_severity", max_severity)
            
            # Update metrics
            if tenant_id:
                metrics_collector.record_threat_detection(
                    tenant_id=tenant_id,
                    threat_level=self._score_to_level(max_severity),
                    duration_ms=span.get_context().span_id  # This would be actual duration
                )
        
        return enriched_results
    
    @trace_threat_detection("real_time_analysis")
    async def analyze_real_time_stream(self, 
                                     stream_data: Dict, 
                                     tenant_id: Optional[str] = None) -> Dict:
        """Analyze real-time network stream with tracing"""
        
        current_span = trace.get_current_span()
        current_span.set_attribute("stream.source", stream_data.get('source', 'unknown'))
        current_span.set_attribute("stream.protocol", stream_data.get('protocol', 'unknown'))
        
        # Analyze stream
        result = await self._analyze_stream_chunk(stream_data)
        
        # Add span attributes based on results
        if result.get('anomaly_detected'):
            current_span.set_attribute("anomaly.detected", True)
            current_span.set_attribute("anomaly.confidence", result.get('confidence', 0))
            current_span.add_event("Anomaly detected", {
                "confidence": result.get('confidence', 0),
                "anomaly_type": result.get('anomaly_type', 'unknown')
            })
        
        return result
    
    def _preprocess_data(self, data: List[Dict]) -> List[Dict]:
        """Preprocess network data"""
        # Implementation here
        return data
    
    def _enrich_results(self, results: List[Dict]) -> List[Dict]:
        """Enrich analysis results with additional context"""
        # Implementation here
        return results
    
    def _score_to_level(self, score: float) -> str:
        """Convert numeric score to threat level"""
        if score >= 0.8:
            return "critical"
        elif score >= 0.6:
            return "high"
        elif score >= 0.4:
            return "medium"
        else:
            return "low"
    
    async def _analyze_stream_chunk(self, stream_data: Dict) -> Dict:
        """Analyze a chunk of stream data"""
        # Implementation here
        return {"anomaly_detected": False, "confidence": 0.0}
```

### FastAPI Integration

**File**: `api/tracing_middleware.py`

```python
from fastapi import FastAPI, Request, Response
from fastapi.middleware.base import BaseHTTPMiddleware
from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from monitoring.custom_instrumentation import metrics_collector
from monitoring.tracing import telemetry
import time
import structlog

logger = structlog.get_logger()

class TracingMiddleware(BaseHTTPMiddleware):
    """Custom middleware for additional tracing context"""
    
    async def dispatch(self, request: Request, call_next):
        # Get current span
        current_span = trace.get_current_span()
        
        # Add custom attributes
        if current_span.is_recording():
            current_span.set_attribute("http.user_agent", request.headers.get("user-agent", ""))
            current_span.set_attribute("http.client_ip", request.client.host)
            
            # Add tenant context if available
            tenant_id = request.headers.get("x-tenant-id")
            if tenant_id:
                current_span.set_attribute("tenant.id", tenant_id)
        
        # Record request start time
        start_time = time.time()
        
        # Process request
        response = await call_next(request)
        
        # Record metrics
        duration_ms = (time.time() - start_time) * 1000
        
        if current_span.is_recording():
            current_span.set_attribute("http.response.duration_ms", duration_ms)
            current_span.set_attribute("http.response.size", response.headers.get("content-length", 0))
        
        # Record API metrics
        metrics_collector.record_api_request(
            endpoint=request.url.path,
            method=request.method,
            status_code=response.status_code
        )
        
        return response

def setup_fastapi_tracing(app: FastAPI):
    """Setup comprehensive tracing for FastAPI application"""
    
    # Initialize telemetry
    jaeger_endpoint = "localhost:6831"  # Configure as needed
    telemetry.setup_tracing(jaeger_endpoint=jaeger_endpoint)
    telemetry.setup_metrics(prometheus_port=8001)
    
    # Instrument FastAPI
    telemetry.instrument_fastapi(app)
    
    # Add custom middleware
    app.add_middleware(TracingMiddleware)
    
    logger.info("FastAPI tracing setup completed")
    
    return app
```

## 🔧 Configuration

### Environment Variables

```bash
# OpenTelemetry Configuration
OTEL_SERVICE_NAME=securenet
OTEL_SERVICE_VERSION=1.0.0
OTEL_ENVIRONMENT=production

# Jaeger Configuration
JAEGER_AGENT_HOST=localhost
JAEGER_AGENT_PORT=6831

# Prometheus Configuration
PROMETHEUS_METRICS_PORT=8001

# Tracing Configuration
OTEL_TRACES_EXPORTER=jaeger
OTEL_METRICS_EXPORTER=prometheus
OTEL_LOGS_EXPORTER=console
```

### Docker Compose Integration

```yaml
services:
  # Jaeger for distributed tracing
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # Jaeger UI
      - "6831:6831/udp"  # Jaeger agent
    environment:
      - COLLECTOR_OTLP_ENABLED=true

  # Prometheus for metrics
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  securenet:
    build: .
    environment:
      - JAEGER_AGENT_HOST=jaeger
      - PROMETHEUS_METRICS_PORT=8001
    depends_on:
      - jaeger
      - prometheus
```

## 🚀 Usage Examples

### Basic Tracing Setup

```python
from fastapi import FastAPI
from api.tracing_middleware import setup_fastapi_tracing

app = FastAPI()
app = setup_fastapi_tracing(app)

# Your routes will now be automatically traced
```

### Custom Span Creation

```python
from monitoring.tracing import get_tracer

tracer = get_tracer()

async def complex_analysis():
    with tracer.start_as_current_span("complex_analysis") as span:
        span.set_attribute("analysis.type", "deep_learning")
        
        # Nested span for sub-operation
        with tracer.start_as_current_span("data_preprocessing") as sub_span:
            sub_span.set_attribute("data.size", 1000)
            # Preprocessing logic
        
        # Another nested span
        with tracer.start_as_current_span("model_inference") as sub_span:
            sub_span.set_attribute("model.version", "v2.1")
            # Model inference logic
```

### Metrics Collection

```python
from monitoring.custom_instrumentation import metrics_collector

# Record threat detection
metrics_collector.record_threat_detection(
    tenant_id="tenant_123",
    threat_level="high",
    duration_ms=250.5
)

# Update active threats
metrics_collector.update_active_threats("tenant_123", 5)
```

## ✅ Validation Steps

1. **Install Dependencies**:
   ```bash
   pip install opentelemetry-api opentelemetry-sdk opentelemetry-instrumentation-fastapi
   ```

2. **Start Jaeger**:
   ```bash
   docker run -d --name jaeger \
     -p 16686:16686 \
     -p 6831:6831/udp \
     jaegertracing/all-in-one:latest
   ```

3. **Test Tracing**:
   ```python
   from monitoring.tracing import telemetry
   telemetry.setup_tracing("localhost:6831")
   
   # Make some API calls and check Jaeger UI at http://localhost:16686
   ```

4. **Verify Metrics**:
   ```bash
   curl http://localhost:8001/metrics
   # Should show Prometheus metrics
   ```

## 📈 Benefits for SecureNet

- **End-to-End Visibility** - Track requests across all services
- **Performance Optimization** - Identify bottlenecks in threat detection
- **Error Correlation** - Link errors across distributed components
- **Service Dependencies** - Understand service interaction patterns
- **Production Debugging** - Debug issues in production environments
- **SLA Monitoring** - Track performance against service level agreements

## 🔗 Related Documentation

- [Phase 3: Advanced Tooling](../integration/phase-3-advanced-tooling.md)
- [Monitoring Overview](README.md)
- [Sentry Integration](../monitoring/sentry.md) 