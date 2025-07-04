# 🚀 SecureNet Startup Guide

## 🔒 **Production Mode (Recommended)**

### **One-Command Production Setup**
```bash
# Complete production environment with security checks
./start_production.sh

# Stop all services
./stop_production.sh
```

**Features:**
- ✅ Automatic DEV_MODE disabling
- ✅ Security configuration verification
- ✅ Both backend and frontend startup
- ✅ Production environment validation
- ✅ Dependency checking

### **Access Production Application**
- **Backend API**: http://localhost:8000
- **Frontend**: http://localhost:5173
- **API Documentation**: http://localhost:8000/docs

---

## 🛠 **Development Mode**

### Prerequisites
```bash
# Ensure Redis is running (required for enhanced version)
redis-server --daemonize yes

# Ensure you're in the SecureNet directory
cd /path/to/SecureNet

# Activate virtual environment
source venv/bin/activate
```

## Option 1: Original SecureNet (Stable)

### Start Backend
```bash
python app.py
```

### Start Frontend
```bash
# In a new terminal
cd frontend
npm run dev  # Development mode with mock data
```

### Access Application
- **Backend API**: http://localhost:8000
- **Frontend**: http://localhost:5173
- **API Documentation**: http://localhost:8000/docs

---

## Option 2: Enhanced SecureNet (Advanced Features)

### Start Backend
```bash
python app_enhanced.py
```

### Start Background Workers (Optional)
```bash
# In a new terminal - for background task processing
rq worker --url redis://localhost:6379/0
```

### Start Frontend
```bash
# In a new terminal
cd frontend
npm run Enterprise
```

### Access Application
- **Backend API**: http://localhost:8000
- **Frontend**: http://localhost:5173
- **API Documentation**: http://localhost:8000/docs
- **System Health**: http://localhost:8000/system/health
- **Metrics**: http://localhost:8000/system/metrics

---

## 🔑 Login Credentials

Both versions use the same credentials:

| Username | Password | Role | Access Level |
|----------|----------|------|--------------|
| `ceo` | `superadmin123` | platform_owner | Full platform access |
| `admin` | `platform123` | security_admin | Organization admin |
| `user` | `enduser123` | soc_analyst | Standard user |

---

## 🔧 Configuration

### **Automatic Production Configuration**
The `./start_production.sh` script automatically:
- ✅ Creates `.env` file if missing
- ✅ Sets `DEV_MODE=false` for backend
- ✅ Creates `frontend/.env` with `VITE_MOCK_DATA=false`
- ✅ Verifies security settings
- ✅ Checks dependencies

### **Manual Environment Setup**
1. Copy configuration template:
   ```bash
   cp docs/setup/production_config.txt .env
   ```

2. Generate secure keys:
   ```bash
   ./generate_keys.sh
   ```

3. Update `.env` with generated keys and your settings

### **Key Configuration Variables**
```bash
# Production Mode (CRITICAL)
DEV_MODE=false                    # Backend production mode
VITE_MOCK_DATA=false             # Frontend production mode

# Basic Settings
ENVIRONMENT=production
DEBUG=false

# Security (use generated keys)
JWT_SECRET=your-generated-jwt-secret
ENCRYPTION_KEY=your-generated-encryption-key
MASTER_KEY_MATERIAL=your-generated-master-key

# Services
REDIS_URL=redis://localhost:6379/0
SENTRY_DSN=your-sentry-dsn-here
```

### **Security Verification**
```bash
# Check production mode status
grep "DEV_MODE=false" .env
grep "VITE_MOCK_DATA=false" frontend/.env

# Verify role-based access controls are working
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "user", "password": "enduser123"}'
```

---

## 🌟 Feature Comparison

### Original SecureNet (`app.py`)
✅ **Production Ready**
- Real-time network scanning
- CVE vulnerability detection
- Security dashboard
- User authentication
- Multi-tenant support
- WebSocket notifications

### Enhanced SecureNet (`app_enhanced.py`)
✅ **All Original Features PLUS:**
- 📊 Advanced monitoring (Prometheus metrics)
- 🔍 Structured logging with Sentry
- 🤖 ML experiment tracking (MLflow)
- ⚡ Background task processing (RQ)
- 🔐 Enhanced cryptographic services
- 🏗️ Dependency injection architecture

---

## 🛠️ Troubleshooting

### Common Issues

**1. Database Errors**
```bash
# If you see database schema errors, the database has been fixed
# Both versions now work with the same database
```

**2. Redis Connection Issues**
```bash
# Start Redis if not running
redis-server --daemonize yes

# Check Redis status
redis-cli ping
```

**3. Port Conflicts**
```bash
# Check what's running on port 8000
lsof -i :8000

# Kill existing processes if needed
pkill -f "python app"
```

**4. Frontend Issues**
```bash
# Reinstall dependencies
cd frontend
npm install

# Clear cache and restart
rm -rf node_modules package-lock.json
npm install
npm run Enterprise
```

---

## 🔄 Switching Between Versions

### Stop Current Version
```bash
# Stop any running SecureNet instance
pkill -f "python app"
```

### Start Desired Version
```bash
# Original version
python app.py

# OR Enhanced version
python app_enhanced.py
```

**Note**: Both versions use the same database and frontend, so you can switch seamlessly!

---

## 📊 Monitoring & Health Checks

### Original SecureNet
- Basic health check: `GET /api/health`
- User authentication: `GET /api/auth/whoami`

### Enhanced SecureNet
- System health: `GET /system/health`
- Prometheus metrics: `GET /system/metrics`
- Queue status: `GET /system/queue-stats`
- Worker status: `GET /system/workers`

---

## 🚀 Production Deployment

### Recommended Setup
1. **Use Original SecureNet** for stable production
2. **Test Enhanced SecureNet** in staging environment
3. **Gradually migrate** to enhanced features

### Production Checklist
- [ ] Set `DEV_MODE=false` in `.env`
- [ ] Configure Sentry for error monitoring
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Configure log rotation
- [ ] Set up monitoring alerts

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review application logs
3. Verify all prerequisites are installed
4. Ensure Redis is running (for enhanced version)

**Both versions are fully functional and production-ready!** 🎉

---

## 📚 **Related Documentation**

- [Enhanced Features Reference](../reference/ENHANCED_FEATURES.md) - Feature comparison and capabilities
- [Production Configuration](production_config.txt) - Environment setup template  
- [Installation Guide](../installation/INSTALLATION.md) - Detailed installation instructions
- [Main README](../../README.md) - Project overview and quick start 