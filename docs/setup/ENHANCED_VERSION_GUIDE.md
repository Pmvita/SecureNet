# 🔧 SecureNet Enhanced Version Guide

> **Advanced features with monitoring, ML tracking, and background processing**

The Enhanced Version (`app_enhanced.py`) includes all original SecureNet features plus enterprise-grade observability, machine learning experiment tracking, and distributed task processing capabilities.

---

## 🚀 **Quick Enhanced Setup**

### **Prerequisites**
- Python 3.8+ with pip
- Node.js 16+ with npm
- **Redis** (required for enhanced features)
- Git

### **1. Install Redis**
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis-server

# Windows (using Docker)
docker run -d -p 6379:6379 redis:alpine

# Verify Redis is running
redis-cli ping  # Should return "PONG"
```

### **2. Enhanced Backend Setup**
```bash
# Clone and setup (if not done already)
git clone https://github.com/yourusername/securenet.git
cd SecureNet

# Virtual environment and dependencies
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start enhanced backend
python app_enhanced.py
```

### **3. Background Workers (Optional)**
```bash
# In new terminal window
cd SecureNet
source venv/bin/activate

# Start RQ worker for background tasks
rq worker --url redis://localhost:6379/0

# Or start multiple workers
rq worker --url redis://localhost:6379/0 --name worker-1 &
rq worker --url redis://localhost:6379/0 --name worker-2 &
```

### **4. Access Enhanced Features**
- **🎯 Dashboard**: http://localhost:5173
- **🔧 API**: http://localhost:8000
- **📊 Metrics**: http://localhost:8000/metrics
- **🏥 Health Check**: http://localhost:8000/system/health
- **📈 MLflow UI**: http://localhost:5000 (if MLflow server started)

---

## 🛡️ **Enhanced Features Overview**

### **🔍 Advanced Monitoring**
- **Prometheus metrics** for performance tracking
- **Structured logging** with JSON format
- **Health check endpoints** with detailed status
- **Request tracing** and response time monitoring
- **Error rate tracking** and alerting

### **🤖 ML Experiment Tracking**
- **MLflow integration** for model versioning
- **Experiment tracking** for threat detection models
- **Model registry** and deployment management
- **Performance metrics** logging and comparison
- **Automated model evaluation** pipelines

### **⚡ Background Processing**
- **Redis task queues** for heavy operations
- **Distributed job processing** with RQ
- **Network scanning** in background
- **CVE data synchronization** tasks
- **Report generation** and email notifications

### **🛡️ Enhanced Security**
- **Sentry error monitoring** and alerting
- **Security event logging** and correlation
- **Advanced cryptography** services
- **Rate limiting** and DDoS protection
- **Audit trail** enhancement

---

## 📊 **Monitoring & Observability**

### **Prometheus Metrics**
```bash
# View all metrics
curl http://localhost:8000/metrics

# Key metrics available:
# - http_requests_total
# - http_request_duration_seconds
# - active_connections
# - background_tasks_total
# - ml_model_predictions_total
# - network_scans_completed_total
```

### **Health Monitoring**
```bash
# Comprehensive health check
curl http://localhost:8000/system/health

# Response includes:
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "ml_models": "loaded",
  "background_workers": "active",
  "last_network_scan": "2024-01-15T10:30:00Z",
  "cve_sync_status": "up_to_date"
}
```

### **Structured Logging**
```bash
# View enhanced logs
tail -f logs/securenet.log

# JSON format with structured data
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "INFO",
  "module": "network_scanner",
  "message": "Network scan completed",
  "data": {
    "devices_found": 12,
    "scan_duration": 45.2,
    "network_range": "192.168.1.0/24"
  }
}
```

---

## 🤖 **ML Experiment Tracking**

### **MLflow Setup**
```bash
# Start MLflow tracking server (optional)
mlflow server --backend-store-uri sqlite:///mlruns.db --default-artifact-root ./mlruns --host 0.0.0.0 --port 5000

# Access MLflow UI
open http://localhost:5000
```

### **Model Tracking**
```python
# Enhanced version automatically logs:
# - Model training metrics
# - Feature importance scores
# - Prediction accuracy
# - Model parameters
# - Training datasets

# View experiments in MLflow UI
# Or access via API:
curl http://localhost:8000/ml/experiments
```

### **Automated Retraining**
```bash
# Background task triggers model retraining
# Based on:
# - New threat patterns detected
# - Model performance degradation
# - Scheduled intervals
# - Data drift detection
```

---

## ⚡ **Background Task Processing**

### **RQ Dashboard (Optional)**
```bash
# Install RQ Dashboard
pip install rq-dashboard

# Start dashboard
rq-dashboard --redis-url redis://localhost:6379/0

# Access at http://localhost:9181
```

### **Available Background Tasks**
```python
# Network scanning
from tasks.network_tasks import schedule_network_scan
schedule_network_scan.delay("192.168.1.0/24")

# CVE synchronization
from tasks.cve_tasks import sync_cve_data
sync_cve_data.delay()

# Report generation
from tasks.report_tasks import generate_security_report
generate_security_report.delay(organization_id=1)

# ML model training
from tasks.ml_tasks import retrain_threat_model
retrain_threat_model.delay()
```

### **Task Monitoring**
```bash
# View task status
curl http://localhost:8000/tasks/status

# Monitor Redis queues
redis-cli LLEN rq:queue:default
redis-cli LLEN rq:queue:failed
```

---

## 🔧 **Enhanced Configuration**

### **Environment Variables**
```bash
# Enhanced features configuration
REDIS_URL=redis://localhost:6379/0
SENTRY_DSN=your-sentry-dsn-here
MLFLOW_TRACKING_URI=http://localhost:5000
PROMETHEUS_ENABLED=true

# Background processing
RQ_WORKERS=2
MAX_TASK_RETRIES=3
TASK_TIMEOUT=300

# ML configuration
ML_MODEL_RETRAIN_INTERVAL=86400  # 24 hours
ML_EXPERIMENT_TRACKING=true
AUTO_MODEL_DEPLOYMENT=false

# Monitoring
LOG_FORMAT=json
LOG_LEVEL=INFO
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=60
```

### **Redis Configuration**
```bash
# redis.conf optimizations for SecureNet
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

---

## 🛡️ **Enhanced Security Features**

### **Sentry Error Monitoring**
```bash
# Automatic error reporting
# Includes:
# - Exception tracking
# - Performance monitoring
# - Release tracking
# - User context
# - Custom tags for security events

# View in Sentry dashboard
open https://sentry.io/your-organization/securenet/
```

### **Advanced Cryptography**
```python
# Enhanced crypto services
from crypto.advanced import AdvancedCrypto
crypto = AdvancedCrypto()

# Features:
# - Hardware security module integration
# - Zero-knowledge proofs
# - Homomorphic encryption
# - Secure multi-party computation
# - Quantum-resistant algorithms
```

### **Rate Limiting**
```bash
# Enhanced rate limiting
# - Per-user limits
# - API endpoint specific limits
# - Adaptive limiting based on threat level
# - Whitelist/blacklist support
# - Distributed rate limiting with Redis
```

---

## 📈 **Performance Optimization**

### **Caching Strategy**
```python
# Redis caching for:
# - Network scan results (TTL: 5 minutes)
# - CVE data (TTL: 1 hour)
# - ML model predictions (TTL: 10 minutes)
# - User sessions (TTL: 24 hours)
# - API responses (TTL: varies)
```

### **Database Optimization**
```python
# Enhanced database features:
# - Connection pooling with aiosqlite
# - Query optimization and indexing
# - Automatic backup and recovery
# - Read replicas for analytics
# - Database monitoring and alerts
```

### **Memory Management**
```python
# Memory optimization:
# - Lazy loading of ML models
# - Efficient data structures
# - Garbage collection monitoring
# - Memory usage alerts
# - Automatic model unloading
```

---

## 🔄 **Migration from Original Version**

### **Seamless Migration**
```bash
# Enhanced version uses same database
# No migration required

# Switch from app.py to app_enhanced.py
pkill -f "python app.py"
python app_enhanced.py

# Or update your startup script
sed -i 's/app.py/app_enhanced.py/g' start.sh
```

### **Feature Compatibility**
- ✅ **All original features** preserved
- ✅ **Same API endpoints** and responses
- ✅ **Compatible frontend** without changes
- ✅ **Existing data** works unchanged
- ✅ **User authentication** unchanged
- ✅ **Configuration** backwards compatible

---

## 🧪 **Testing Enhanced Features**

### **Monitoring Tests**
```bash
# Test Prometheus metrics
curl http://localhost:8000/metrics | grep http_requests_total

# Test health endpoint
curl http://localhost:8000/system/health

# Test structured logging
tail -n 10 logs/securenet.log | jq .
```

### **Background Task Tests**
```bash
# Test Redis connection
redis-cli ping

# Test RQ worker
rq info --url redis://localhost:6379/0

# Test task submission
curl -X POST http://localhost:8000/tasks/network-scan \
  -H "Content-Type: application/json" \
  -d '{"network_range": "192.168.1.0/24"}'
```

### **ML Tracking Tests**
```bash
# Test MLflow integration
curl http://localhost:8000/ml/experiments

# Test model loading
curl http://localhost:8000/ml/models/status

# Test prediction endpoint
curl -X POST http://localhost:8000/ml/predict \
  -H "Content-Type: application/json" \
  -d '{"features": [1.2, 0.8, 2.1, 0.5]}'
```

---

## 🚀 **Production Deployment**

### **Production Checklist**
- ✅ **Redis cluster** for high availability
- ✅ **Multiple RQ workers** for scalability
- ✅ **MLflow server** with PostgreSQL backend
- ✅ **Sentry configuration** for error monitoring
- ✅ **Prometheus + Grafana** for metrics visualization
- ✅ **Load balancer** for API endpoints
- ✅ **SSL/TLS certificates** for secure communication

### **Scaling Considerations**
```bash
# Horizontal scaling
# - Multiple backend instances
# - Redis cluster
# - RQ worker scaling
# - Load balancing
# - Database read replicas

# Monitoring scaling
# - Metrics aggregation
# - Distributed tracing
# - Log aggregation
# - Alert management
```

---

## 📞 **Support & Troubleshooting**

### **Common Issues**

**Redis Connection Failed:**
```bash
# Check Redis status
redis-cli ping
sudo systemctl status redis-server

# Restart Redis
sudo systemctl restart redis-server
```

**RQ Workers Not Processing:**
```bash
# Check worker status
rq info --url redis://localhost:6379/0

# Restart workers
pkill -f "rq worker"
rq worker --url redis://localhost:6379/0 &
```

**MLflow UI Not Accessible:**
```bash
# Start MLflow server
mlflow server --backend-store-uri sqlite:///mlruns.db --host 0.0.0.0 --port 5000

# Check if port is available
lsof -ti:5000
```

### **Performance Issues**
```bash
# Monitor Redis memory usage
redis-cli INFO memory

# Check RQ queue lengths
redis-cli LLEN rq:queue:default

# Monitor Python process
htop -p $(pgrep -f "python app_enhanced.py")
```

---

**The Enhanced Version brings enterprise-grade capabilities to SecureNet! 🚀**

For more details, see [Backend Integration Guides](../integration/) and [Production Configuration](./production_config.txt). 