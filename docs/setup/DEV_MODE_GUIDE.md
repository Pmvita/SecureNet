# 🛠 SecureNet Development Mode Guide

> **Complete setup instructions for local development environment**

This guide covers setting up SecureNet in development mode for local testing, feature development, and debugging.

---

## 🚀 **Quick Development Setup**

### **Prerequisites**
- Python 3.8+ with pip
- Node.js 16+ with npm
- Redis (optional, for enhanced features)
- Git

### **1. Environment Setup**
```bash
# Clone repository
git clone https://github.com/yourusername/securenet.git
cd SecureNet

# Create Python virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

### **2. Backend Development Server**
```bash
# Option 1: Using shell script (recommended)
./start.sh

# Option 2: Using Python starter script
python start_backend.py --dev --host 0.0.0.0 --port 8000

# Option 3: Direct uvicorn (for debugging)
uvicorn app:app --reload --host 127.0.0.1 --port 8000

# Option 4: Direct Python execution
python app.py
```

### **3. Frontend Development Server**
```bash
# In new terminal window
cd frontend
npm install

# Start development server
npm run dev

# Or for Enterprise mode (real network scanning)
npm run Enterprise
```

### **4. Access Development Environment**
- **🎯 Dashboard**: http://localhost:5173
- **🔧 API**: http://localhost:8000
- **📚 API Docs**: http://localhost:8000/docs
- **🔍 Interactive API**: http://localhost:8000/redoc

---

## 🔧 **Development Configuration**

### **Environment Variables**
Create `.env` file in project root:
```bash
# Development settings
DEV_MODE=true
DEBUG=true
LOG_LEVEL=DEBUG

# Database
DATABASE_URL=sqlite:///./data/securenet.db

# JWT Settings (development only)
JWT_SECRET_KEY=dev-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Network scanning
NETWORK_RANGE=192.168.1.0/24
SCAN_TIMEOUT=30

# CVE Integration (optional)
NIST_NVD_API_KEY=your-api-key-here
CVE_UPDATE_INTERVAL=3600
```

### **Database Setup**
```bash
# Development database is created automatically
# Location: data/securenet.db

# To reset development database
rm data/securenet.db
python app.py  # Recreates with seed data
```

---

## 🧪 **Development Features**

### **Hot Reload & Debugging**
```bash
# Backend hot reload (automatic with uvicorn --reload)
uvicorn app:app --reload --host 127.0.0.1 --port 8000

# Frontend hot reload (automatic with Vite)
cd frontend && npm run dev

# Debug mode with detailed logging
python start_backend.py --dev --debug
```

### **Development Users**
Pre-configured test accounts:

| Role | Username | Password | Purpose |
|------|----------|----------|---------|
| Platform Owner | `ceo` | `superadmin123` | Full access testing |
| Security Admin | `admin` | `platform123` | Admin feature testing |
| SOC Analyst | `user` | `enduser123` | Standard user testing |

### **API Testing**
```bash
# Test API endpoints
curl -X GET "http://localhost:8000/health"
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"enduser123"}'

# View API documentation
open http://localhost:8000/docs
```

---

## 🔍 **Development Tools**

### **Database Management**
```bash
# SQLite browser (recommended)
brew install db-browser-for-sqlite  # macOS
# Then open data/securenet.db

# Command line SQLite
sqlite3 data/securenet.db
.tables
.schema users
SELECT * FROM users;
```

### **Log Monitoring**
```bash
# View backend logs
tail -f logs/securenet.log

# Debug-level logging
python start_backend.py --dev --log-level DEBUG
```

### **Network Testing**
```bash
# Test network scanning locally
python -c "
from network_scanner import NetworkScanner
scanner = NetworkScanner()
results = scanner.scan_network('192.168.1.0/24')
print(results)
"
```

---

## 🛡️ **Enhanced Development Features**

### **Start Enhanced Version**
```bash
# Enhanced version with ML tracking, monitoring, background tasks
python app_enhanced.py

# Start background workers (new terminal)
redis-server --daemonize yes
rq worker --url redis://localhost:6379/0
```

### **Enhanced Features Include:**
- **Prometheus metrics**: http://localhost:8000/metrics
- **Health monitoring**: http://localhost:8000/system/health
- **MLflow tracking**: http://localhost:5000 (if MLflow server started)
- **Sentry error tracking**: Configured for development
- **Background task processing**: Redis + RQ queues

---

## 🧪 **Testing in Development**

### **Backend Testing**
```bash
# Run all tests
pytest

# Run specific test categories
pytest tests/test_auth.py -v
pytest tests/test_network_scanner.py -v
pytest tests/test_api.py -v

# Run with coverage
pytest --cov=. --cov-report=html
```

### **Frontend Testing**
```bash
cd frontend

# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run end-to-end tests
npm run test:e2e
```

---

## 🔧 **Development Troubleshooting**

### **Common Issues**

**Port Already in Use:**
```bash
# Find and kill process using port 8000
lsof -ti:8000 | xargs kill -9

# Or use different port
python start_backend.py --dev --port 8001
```

**Database Locked:**
```bash
# Stop all backend processes
pkill -f "python app.py"
pkill -f "uvicorn"

# Restart backend
./start.sh
```

**Frontend Build Issues:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Network Scanning Issues:**
```bash
# Check network connectivity
ping 192.168.1.1

# Test with different network range
export NETWORK_RANGE=10.0.0.0/24
python app.py
```

---

## 📝 **Development Workflow**

### **Feature Development**
1. **Create feature branch**: `git checkout -b feature/your-feature`
2. **Start development servers**: Backend + Frontend
3. **Make changes** with hot reload active
4. **Test locally** with development users
5. **Run test suite**: `pytest` and `npm test`
6. **Commit and push**: Create PR when ready

### **Debugging Process**
1. **Enable debug logging**: `--debug` flag
2. **Check logs**: `logs/securenet.log`
3. **Use API docs**: http://localhost:8000/docs
4. **Browser dev tools**: React Developer Tools
5. **Database inspection**: SQLite browser

---

## 🚀 **Next Steps**

### **After Development**
- **Production deployment**: See [Production Configuration](./production_config.txt)
- **Enhanced features**: See [Enhanced Version Guide](./ENHANCED_VERSION_GUIDE.md)
- **Testing**: See [Testing Documentation](../testing/README.md)
- **Contributing**: See [Contributing Guidelines](../../CONTRIBUTING.md)

---

**Happy developing! 🛠️ If you encounter issues, check the [troubleshooting section](#-development-troubleshooting) or create an issue on GitHub.** 