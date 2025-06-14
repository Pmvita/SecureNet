# 🔒 SecureNet Production Quick Reference

## ⚡ **One-Command Production Setup**

```bash
# Start complete production environment
./start_production.sh

# Stop all services
./stop_production.sh
```

## 🔧 **Manual Production Commands**

### **Backend Only**
```bash
python start_backend.py --prod
```

### **Frontend Only**
```bash
cd frontend && npm run start:prod
```

### **Both Services**
```bash
# Terminal 1: Backend
python start_backend.py --prod

# Terminal 2: Frontend
cd frontend && npm run start:prod
```

## ✅ **Production Verification Checklist**

### **1. Environment Configuration**
```bash
# Check backend production mode
grep "DEV_MODE=false" .env

# Check frontend production mode
grep "VITE_MOCK_DATA=false" frontend/.env
```

### **2. Service Health**
```bash
# Backend health check
curl http://localhost:8000/api/health

# Frontend accessibility
curl http://localhost:5173
```

### **3. Authentication Testing**
```bash
# Login as analyst user
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "user", "password": "enduser123"}'

# Test role-based access (should be denied)
curl -X GET http://localhost:8000/api/get-api-key \
  -H "Authorization: Bearer <analyst-token>"
```

### **4. Security Verification**
```bash
# Verify JWT authentication is enforced
curl -X GET http://localhost:8000/api/get-api-key
# Should return: {"detail": "Not authenticated"}

# Verify role-based access controls
# Analyst users should be denied admin endpoints
# Manager/Admin users should have access
```

## 🔑 **Default Production Credentials**

| Role | Username | Password | Access Level |
|------|----------|----------|--------------|
| **Super Admin** | `ceo` | `superadmin123` | Full platform access |
| **Manager** | `admin` | `platform123` | Organization admin |
| **Analyst** | `user` | `enduser123` | Standard user |

⚠️ **Change these credentials before production deployment!**

## 🌐 **Access URLs**

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/health

## 🛑 **Troubleshooting**

### **Services Won't Start**
```bash
# Check for port conflicts
lsof -i :8000  # Backend
lsof -i :5173  # Frontend

# Kill existing processes
pkill -f "python.*app"
pkill -f "vite"
```

### **Authentication Issues**
```bash
# Verify DEV_MODE is disabled
echo "Backend DEV_MODE: $(grep DEV_MODE .env)"
echo "Frontend VITE_MOCK_DATA: $(grep VITE_MOCK_DATA frontend/.env)"
```

### **Database Issues**
```bash
# Check database exists
ls -la data/securenet.db

# Verify users exist
sqlite3 data/securenet.db "SELECT username, role FROM users;"
```

## 📚 **Related Documentation**

- [Complete Production Setup](DEV_MODE_DISABLED.md) - Detailed production configuration
- [Startup Guide](STARTUP_GUIDE.md) - Full setup instructions
- [Production Configuration](production_config.txt) - Environment template
- [Enhanced Features](../reference/ENHANCED_FEATURES.md) - Advanced capabilities 