# ⚡ SecureNet Direct Startup Methods

> **Direct Python and uvicorn execution methods for SecureNet**

This guide covers manual startup methods for advanced users who prefer direct execution control over the automated startup scripts.

---

## 🚀 **Direct Python Execution**

### **1. Basic Python Startup**
```bash
# Navigate to SecureNet directory
cd SecureNet

# Activate virtual environment
source venv/bin/activate  # Windows: venv\Scripts\activate

# Direct Python execution
python app.py
```

**Features:**
- ✅ **Automatic environment setup** with built-in checks
- ✅ **Database initialization** if not exists
- ✅ **Configuration validation** before startup
- ✅ **Default settings** optimized for local development
- ✅ **Error handling** with helpful messages

### **2. Enhanced Version Direct Startup**
```bash
# Start enhanced version with all features
python app_enhanced.py

# Prerequisites: Redis must be running
redis-server --daemonize yes  # Start Redis in background
```

**Enhanced Features:**
- 📊 **Prometheus metrics** at `/metrics`
- 🏥 **Health monitoring** at `/system/health`
- ⚡ **Background task processing** with RQ
- 🤖 **MLflow experiment tracking**
- 🛡️ **Advanced security monitoring**

---

## 🔧 **Direct Uvicorn Execution**

### **1. Development Mode**
```bash
# Standard development server with hot reload
uvicorn app:app --reload --host 127.0.0.1 --port 8000

# Enhanced version with hot reload
uvicorn app_enhanced:app --reload --host 127.0.0.1 --port 8000
```

**Development Features:**
- 🔄 **Hot reload** on code changes
- 🐛 **Debug mode** enabled
- 📝 **Detailed error messages**
- 🔍 **Request logging** and tracing

### **2. Production Mode**
```bash
# Production server without reload
uvicorn app:app --host 0.0.0.0 --port 8000 --workers 4

# With SSL (production deployment)
uvicorn app:app --host 0.0.0.0 --port 8000 --ssl-keyfile key.pem --ssl-certfile cert.pem
```

**Production Features:**
- ⚡ **Multiple workers** for concurrency
- 🛡️ **SSL/TLS support** for secure connections
- 📊 **Performance optimization** settings
- 🔒 **Security hardening** configuration

### **3. Custom Configuration**
```bash
# Custom host and port
uvicorn app:app --host 192.168.1.100 --port 9000

# Custom log level and format
uvicorn app:app --log-level info --log-config logging.conf

# Access logs disabled (performance optimization)
uvicorn app:app --no-access-log

# Bind to Unix socket (advanced)
uvicorn app:app --uds /tmp/securenet.sock
```

---

## 🛠️ **Advanced Startup Options**

### **1. Environment-Specific Startup**
```bash
# Development environment
DEV_MODE=true DEBUG=true python app.py

# Production environment
DEV_MODE=false LOG_LEVEL=WARNING python app.py

# Testing environment
TESTING=true DATABASE_URL=sqlite:///test.db python app.py
```

### **2. Custom Configuration Files**
```bash
# Using custom configuration file
CONFIG_FILE=./config/production.yaml python app.py

# Override specific settings
DATABASE_URL=postgresql://user:pass@localhost/securenet python app.py
```

### **3. Network Interface Binding**
```bash
# Bind to specific network interface
uvicorn app:app --host 0.0.0.0 --port 8000  # All interfaces
uvicorn app:app --host 127.0.0.1 --port 8000  # Localhost only
uvicorn app:app --host 192.168.1.10 --port 8000  # Specific IP
```

---

## 🔍 **Debugging and Development**

### **1. Debug Mode**
```bash
# Python debug mode
python -m pdb app.py

# Uvicorn with debug logging
uvicorn app:app --reload --log-level debug

# With profiling
python -m cProfile -o profile.stats app.py
```

### **2. Custom Logging**
```bash
# Structured JSON logging
LOG_FORMAT=json python app.py

# File-based logging
LOG_FILE=./logs/securenet.log python app.py

# Multiple log levels
LOG_LEVEL=DEBUG LOG_FILE=debug.log python app.py
```

### **3. Performance Monitoring**
```bash
# Memory profiling
python -m memory_profiler app.py

# CPU profiling
python -m py-spy top --pid $(pgrep -f "python app.py")

# Request timing
uvicorn app:app --access-log --log-config timing.conf
```

---

## 🔐 **Security Configurations**

### **1. Authentication Settings**
```bash
# Custom JWT settings
JWT_SECRET_KEY=your-secure-secret-key \
JWT_ALGORITHM=HS256 \
ACCESS_TOKEN_EXPIRE_MINUTES=30 \
python app.py
```

### **2. Network Security**
```bash
# Restrict network access
uvicorn app:app --host 127.0.0.1 --port 8000  # Local only

# Enable CORS for specific origins
CORS_ORIGINS=["https://yourdomain.com"] python app.py

# API key authentication
REQUIRE_API_KEY=true API_KEY_HEADER=X-API-Key python app.py
```

### **3. SSL/TLS Configuration**
```bash
# Generate self-signed certificates (development)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Start with SSL
uvicorn app:app --ssl-keyfile key.pem --ssl-certfile cert.pem --port 8443
```

---

## 📊 **Monitoring and Metrics**

### **1. Application Metrics**
```bash
# Enable Prometheus metrics
PROMETHEUS_ENABLED=true python app_enhanced.py

# Custom metrics endpoint
METRICS_ENDPOINT=/custom-metrics python app_enhanced.py

# Metrics collection interval
METRICS_INTERVAL=30 python app_enhanced.py
```

### **2. Health Checks**
```bash
# Custom health check endpoint
HEALTH_CHECK_ENDPOINT=/custom-health python app.py

# Health check interval
HEALTH_CHECK_INTERVAL=60 python app_enhanced.py

# Include detailed health information
HEALTH_CHECK_DETAILED=true python app_enhanced.py
```

### **3. Request Tracing**
```bash
# Enable request tracing
TRACE_REQUESTS=true python app.py

# Trace sampling rate (0.0 to 1.0)
TRACE_SAMPLE_RATE=0.1 python app.py

# Export traces to file
TRACE_EXPORT_FILE=./traces.json python app.py
```

---

## 🔄 **Process Management**

### **1. Background Processes**
```bash
# Start in background (nohup)
nohup python app.py > securenet.log 2>&1 &

# Using screen
screen -dmS securenet python app.py

# Using tmux
tmux new-session -d -s securenet 'python app.py'
```

### **2. Process Monitoring**
```bash
# Monitor process status
ps aux | grep "python app.py"

# Monitor resource usage
htop -p $(pgrep -f "python app.py")

# Monitor network connections
netstat -tulpn | grep :8000
```

### **3. Graceful Shutdown**
```bash
# Send SIGTERM for graceful shutdown
kill -TERM $(pgrep -f "python app.py")

# Force shutdown if needed
kill -KILL $(pgrep -f "python app.py")

# Check if process stopped
pgrep -f "python app.py" || echo "Process stopped"
```

---

## 🛡️ **Database Management**

### **1. Database Configuration**
```bash
# Custom database location
DATABASE_URL=sqlite:///./custom/path/securenet.db python app.py

# In-memory database (testing)
DATABASE_URL=sqlite:///:memory: python app.py

# PostgreSQL database
DATABASE_URL=postgresql://user:password@localhost/securenet python app.py
```

### **2. Database Initialization**
```bash
# Force database recreation
rm data/securenet.db && python app.py

# Initialize with seed data
SEED_DATA=true python app.py

# Skip database initialization
SKIP_DB_INIT=true python app.py
```

---

## 🔧 **Troubleshooting Direct Startup**

### **Common Issues**

**Port Already in Use:**
```bash
# Find process using port
lsof -ti:8000

# Kill process and restart
kill $(lsof -ti:8000) && python app.py
```

**Virtual Environment Issues:**
```bash
# Verify virtual environment
which python
python --version

# Recreate virtual environment
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Module Import Errors:**
```bash
# Check Python path
python -c "import sys; print(sys.path)"

# Install missing dependencies
pip install -r requirements.txt

# Verify installation
python -c "import fastapi; print('FastAPI installed')"
```

**Database Connection Issues:**
```bash
# Check database file permissions
ls -la data/securenet.db

# Test database connection
python -c "
import sqlite3
conn = sqlite3.connect('data/securenet.db')
print('Database connection successful')
conn.close()
"
```

---

## 📚 **Related Documentation**

- **[Development Mode Guide](./DEV_MODE_GUIDE.md)** - Complete development setup
- **[Enhanced Version Guide](./ENHANCED_VERSION_GUIDE.md)** - Advanced features
- **[Production Configuration](./production_config.txt)** - Production deployment
- **[Startup Guide](./STARTUP_GUIDE.md)** - Automated startup methods

---

**Direct startup methods give you full control over SecureNet execution! ⚡** 