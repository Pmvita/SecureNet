# SecureNet Scripts Directory

This directory contains operational scripts and utilities for SecureNet deployment and maintenance.

## Directory Structure

```
scripts/
├── ops/                    # Operational scripts
│   ├── seed_users.py      # Database user seeding
│   └── test_production_boot.py  # Production readiness testing
├── fix_env_postgresql.py  # Environment configuration fixes
├── force_init_db.py       # Database initialization
├── init_db.py            # Standard database setup
└── README.md             # This file
```

## Operational Scripts (`scripts/ops/`)

### `seed_users.py`
Seeds the database with default users for role-based access testing.

**Usage:**
```bash
cd /path/to/SecureNet
python scripts/ops/seed_users.py
```

**What it does:**
- Creates default organization "SecureNet Enterprise"
- Seeds 3 users with proper RBAC roles:
  - `ceo` (platform_owner) - Full platform access
  - `admin` (security_admin) - Organization admin access  
  - `user` (soc_analyst) - Standard user access
- Uses database_factory for automatic PostgreSQL/SQLite selection
- Handles password hashing with argon2

**Requirements:**
- PostgreSQL running and configured
- Environment variables loaded (.env)
- argon2-cffi installed

### `test_production_boot.py`
Comprehensive production environment validation.

**Usage:**
```bash
cd /path/to/SecureNet
python scripts/ops/test_production_boot.py
```

**Tests performed:**
- ✅ Environment configuration validation
- ✅ PostgreSQL database connectivity
- ✅ User seeding verification
- ✅ Frontend build status
- ✅ FastAPI app import validation

**Exit codes:**
- `0` - All tests passed, production ready
- `1` - One or more tests failed

## Database Scripts

### `init_db.py`
Standard database initialization script.

**Usage:**
```bash
python scripts/init_db.py
```

### `force_init_db.py`
Force database reinitialization (destructive).

**Usage:**
```bash
python scripts/force_init_db.py
```

### `fix_env_postgresql.py`
Converts SQLite configuration to PostgreSQL.

**Usage:**
```bash
python scripts/fix_env_postgresql.py
```

## Usage Patterns

### 1. Fresh Production Setup
```bash
# 1. Fix environment configuration
python scripts/fix_env_postgresql.py

# 2. Initialize database
python scripts/init_db.py

# 3. Seed users
python scripts/ops/seed_users.py

# 4. Validate production readiness
python scripts/ops/test_production_boot.py

# 5. Start production server
python start_backend.py --prod
```

### 2. Development Setup
```bash
# 1. Initialize database
python scripts/init_db.py

# 2. Seed users
python scripts/ops/seed_users.py

# 3. Start development server
python start_backend.py --dev
```

### 3. Production Health Check
```bash
# Quick validation
python scripts/ops/test_production_boot.py

# If tests pass, system is ready for deployment
```

### 4. Database Reset (Development)
```bash
# Force reinitialize database
python scripts/force_init_db.py

# Reseed users
python scripts/ops/seed_users.py
```

## Environment Requirements

All scripts require:
- Python 3.8+
- Virtual environment activated
- `.env` file configured
- PostgreSQL running (for production)

## Error Handling

Scripts include comprehensive error handling and logging:
- Clear success/failure indicators (✅/❌)
- Detailed error messages with context
- Graceful degradation where possible
- Proper exit codes for automation

## CI/CD Integration & Health Checks

### **Production Health Check Endpoints**

SecureNet provides comprehensive health monitoring for CI/CD and production environments:

#### **Primary Health Check**
```bash
# Main production validation (CI-friendly exit codes)
python scripts/ops/test_production_boot.py
# Exit code 0: All systems operational
# Exit code 1: One or more systems failed
```

#### **API Health Endpoints** (when backend is running)
- **`GET /health`** - Basic health status
- **`GET /system/status`** - Detailed system information
- **`GET /api/v1/health`** - API-specific health check
- **`GET /docs`** - API documentation availability

#### **Component-Specific Checks**
```bash
# Database connectivity
python -c "from database_factory import get_database; db = get_database(); print('✅ Database OK')"

# Frontend build validation
cd frontend && npm run build && echo "✅ Frontend Build OK"

# Backend app import
python -c "from app import app; print(f'✅ FastAPI app loaded with {len(app.routes)} routes')"
```

### **CI/CD Pipeline Integration**

The `test_production_boot.py` script is designed for CI/CD integration:

```yaml
# Example GitHub Actions step
- name: Validate Production Readiness
  run: python scripts/ops/test_production_boot.py
  
# Example Docker health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python scripts/ops/test_production_boot.py || exit 1
```

### **Independent Deployment Support**

Frontend and backend can be deployed independently:

#### **Backend Only**
```bash
# Backend production deployment
python start_backend.py --prod --check
# Health check: curl http://localhost:8000/health
```

#### **Frontend Only**
```bash
# Frontend production build and serve
cd frontend && npm run build && npm run preview
# Health check: curl http://localhost:5173
```

#### **Microservice Architecture**
- Backend API: Port 8000 (FastAPI)
- Frontend SPA: Port 5173 (Vite preview)
- Database: PostgreSQL (configurable port)
- Cache: Redis (optional, configurable port)

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL in .env
   - Verify credentials

2. **User Seeding Failed**
   - Run `python scripts/ops/test_production_boot.py` first
   - Check database permissions
   - Ensure argon2-cffi is installed

3. **Frontend Build Missing**
   - Run `cd frontend && npm run build`
   - Check for TypeScript errors

4. **Environment Variables Missing**
   - Copy `.env.example` to `.env`
   - Run `python scripts/fix_env_postgresql.py`

For additional support, check the main project documentation in `/docs/`. 