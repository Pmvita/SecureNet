# SecureNet Environment Configuration Template

## 🚨 **Critical .env File Updates Required**

Your current `.env` file has **SQLite configuration** but needs **PostgreSQL configuration** for enterprise deployment. Follow these steps to update it properly.

---

## 🔧 **Required .env File Updates**

### **1. Update Database Configuration**

**Current (INCORRECT):**
```bash
DATABASE_URL=sqlite:///data/securenet.db
MLFLOW_TRACKING_URI=sqlite:///data/mlflow.db
```

**Required (CORRECT):**
```bash
# PostgreSQL Database (Enterprise)
DATABASE_URL=postgresql://securenet:securenet@localhost:5432/securenet

# MLflow Tracking (PostgreSQL)
MLFLOW_TRACKING_URI=postgresql://securenet:securenet@localhost:5432/mlflow
```

### **2. Add Missing Enterprise Variables**

Add these variables to your `.env` file:

```bash
# ========================================
# ENTERPRISE CONFIGURATION
# ========================================

# Default Organization
DEFAULT_ORG_NAME=SecureNet Enterprise
DEFAULT_ORG_DOMAIN=securenet.local
DEFAULT_ORG_API_KEY=sk_live_enterprise_default_key_change_in_production

# Role-Based Access Control
ENABLE_RBAC=true
DEFAULT_USER_ROLE=soc_analyst
ADMIN_ROLE=platform_owner

# Multi-Tenant Settings
ENABLE_MULTI_TENANT=true
ORGANIZATION_ISOLATION=true

# ========================================
# COMPLIANCE & GOVERNANCE
# ========================================

# Compliance Settings
ENABLE_COMPLIANCE_MODE=true
DATA_RETENTION_DAYS=2555  # 7 years
ENABLE_ENCRYPTION_AT_REST=true

# Governance
ENABLE_DATA_GOVERNANCE=true
PRIVACY_MODE=strict
GDPR_COMPLIANCE=true

# ========================================
# AI/ML CONFIGURATION
# ========================================

# Machine Learning
ENABLE_ML_FEATURES=true
ML_MODEL_PATH=models/
ML_PREDICTION_THRESHOLD=0.7

# Threat Detection
ENABLE_THREAT_DETECTION=true
THREAT_SCORE_THRESHOLD=7.0
ANOMALY_DETECTION_SENSITIVITY=0.8

# ========================================
# AUDIT LOGGING
# ========================================

# Audit Logging
ENABLE_AUDIT_LOGS=true
AUDIT_LOG_RETENTION_DAYS=2555  # 7 years for compliance
```

---

## 📋 **Complete .env Template**

Here's a complete `.env` template for PostgreSQL enterprise deployment:

```bash
# SecureNet Environment Configuration

# ========================================
# CORE CONFIGURATION
# ========================================

# Environment
DEV_MODE=false
ENVIRONMENT=production
DEBUG=false
HOST=0.0.0.0
PORT=8000

# ========================================
# DATABASE CONFIGURATION (PostgreSQL)
# ========================================

# PostgreSQL Database (Enterprise)
DATABASE_URL=postgresql://securenet:securenet@localhost:5432/securenet

# MLflow Tracking (PostgreSQL)
MLFLOW_TRACKING_URI=postgresql://securenet:securenet@localhost:5432/mlflow

# ========================================
# SECURITY & AUTHENTICATION
# ========================================

# Core Security Keys (GENERATE NEW KEYS FOR PRODUCTION!)
SECRET_KEY=bb21500adaa5bee953de1234567890abcdef1234567890abcdef1234567890ab
JWT_SECRET=49a68ac93908732e908d817d0edb1416e1ed50cdb29373914685134287554b65
ENCRYPTION_KEY=cd1c637800d1809b7935452e1c32dd6d41f469bb913e51f8f05af4a9897504cb
MASTER_KEY_MATERIAL=25a426284325a18ce19c983a0cd56389f58eda5b1dde59fb7ba9403540960183d8f343c481c668ce3e97d439d77a5cf6f9fa869ef7f4a43898dbe99c1539d76e

# JWT Configuration
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
MAX_FAILED_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15

# ========================================
# ENTERPRISE CONFIGURATION
# ========================================

# Default Organization
DEFAULT_ORG_NAME=SecureNet Enterprise
DEFAULT_ORG_DOMAIN=securenet.local
DEFAULT_ORG_API_KEY=sk_live_enterprise_default_key_change_in_production

# Role-Based Access Control
ENABLE_RBAC=true
DEFAULT_USER_ROLE=soc_analyst
ADMIN_ROLE=platform_owner

# Multi-Tenant Settings
ENABLE_MULTI_TENANT=true
ORGANIZATION_ISOLATION=true

# ========================================
# EXTERNAL SERVICES
# ========================================

# Redis (for RQ task queue and caching)
REDIS_URL=redis://localhost:6379/0

# Monitoring & Observability
SENTRY_DSN=https://your-sentry-dsn-here@sentry.io/project-id
ENABLE_METRICS=true
PROMETHEUS_PORT=9090

# Notification Services
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Email Configuration
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=alerts@securenet.local
EMAIL_TO=security-team@securenet.local

# ========================================
# SECURITY SETTINGS
# ========================================

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# CORS Settings
ALLOWED_ORIGINS=http://localhost:5173,https://your-frontend-domain.com

# Security Headers
SECURE_HEADERS=true
HSTS_MAX_AGE=31536000

# ========================================
# LOGGING & MONITORING
# ========================================

# Logging Configuration
LOG_LEVEL=INFO
LOG_FORMAT=json
LOG_FILE=logs/securenet.log

# Audit Logging
ENABLE_AUDIT_LOGS=true
AUDIT_LOG_RETENTION_DAYS=2555  # 7 years for compliance

# ========================================
# BACKGROUND PROCESSING
# ========================================

# RQ Worker Configuration
RQ_WORKER_COUNT=3
RQ_DEFAULT_TIMEOUT=300

# Task Queue Settings
ENABLE_BACKGROUND_TASKS=true
TASK_RETRY_ATTEMPTS=3

# ========================================
# AI/ML CONFIGURATION
# ========================================

# Machine Learning
ENABLE_ML_FEATURES=true
ML_MODEL_PATH=models/
ML_PREDICTION_THRESHOLD=0.7

# Threat Detection
ENABLE_THREAT_DETECTION=true
THREAT_SCORE_THRESHOLD=7.0
ANOMALY_DETECTION_SENSITIVITY=0.8

# ========================================
# COMPLIANCE & GOVERNANCE
# ========================================

# Compliance Settings
ENABLE_COMPLIANCE_MODE=true
DATA_RETENTION_DAYS=2555  # 7 years
ENABLE_ENCRYPTION_AT_REST=true

# Governance
ENABLE_DATA_GOVERNANCE=true
PRIVACY_MODE=strict
GDPR_COMPLIANCE=true

# ========================================
# DEVELOPMENT SETTINGS
# ========================================

# Development Mode (set to false for production)
DEV_MODE=false

# API Documentation
ENABLE_API_DOCS=true
API_DOCS_URL=/docs

# Testing
TESTING=false
TEST_DATABASE_URL=postgresql://securenet:securenet@localhost:5432/securenet_test
```

---

## 🚀 **Quick Fix Commands**

### **Option 1: Manual Update**
Edit your `.env` file and replace the database URLs:

```bash
# Edit .env file
nano .env

# Replace these lines:
# DATABASE_URL=sqlite:///data/securenet.db
# MLFLOW_TRACKING_URI=sqlite:///data/mlflow.db

# With these lines:
# DATABASE_URL=postgresql://securenet:securenet@localhost:5432/securenet
# MLFLOW_TRACKING_URI=postgresql://securenet:securenet@localhost:5432/mlflow
```

### **Option 2: Automated Update**
Run the migration script which will update your `.env` file:

```bash
python scripts/migrate_to_postgresql.py
```

### **Option 3: Backup and Replace**
```bash
# Backup current .env
cp .env .env.backup

# Create new .env with PostgreSQL configuration
cat > .env << 'EOF'
# [Copy the complete template above]
EOF
```

---

## 🔒 **Production Security**

### **Generate Secure Keys**
```bash
# Generate new secure keys for production
SECRET_KEY=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
MASTER_KEY_MATERIAL=$(openssl rand -hex 64)

# Update .env file with new keys
echo "SECRET_KEY=$SECRET_KEY" >> .env
echo "JWT_SECRET=$JWT_SECRET" >> .env
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> .env
echo "MASTER_KEY_MATERIAL=$MASTER_KEY_MATERIAL" >> .env
```

### **Production Database URL**
```bash
# For production with SSL
DATABASE_URL=postgresql://securenet_app:secure_password@db.company.com:5432/securenet_prod?sslmode=require

# For production MLflow server
MLFLOW_TRACKING_URI=http://mlflow.company.com:5000
```

---

## ✅ **Verification**

After updating your `.env` file, verify the configuration:

```bash
# Check database configuration
grep "DATABASE_URL" .env

# Should show:
# DATABASE_URL=postgresql://securenet:securenet@localhost:5432/securenet

# Check MLflow configuration
grep "MLFLOW_TRACKING_URI" .env

# Should show:
# MLFLOW_TRACKING_URI=postgresql://securenet:securenet@localhost:5432/mlflow

# Test PostgreSQL connection
python -c "
import os
from database_postgresql import db
import asyncio

async def test():
    await db.initialize()
    print('✅ PostgreSQL connection successful')

asyncio.run(test())
"
```

---

## 🆘 **Troubleshooting**

### **Common Issues**

#### **Database Connection Failed**
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql  # macOS
sudo systemctl status postgresql      # Linux

# Start PostgreSQL if not running
brew services start postgresql        # macOS
sudo systemctl start postgresql       # Linux
```

#### **Database Does Not Exist**
```bash
# Create database and user
createdb securenet
createuser -s securenet
psql -c "ALTER USER securenet PASSWORD 'securenet';"
```

#### **Permission Denied**
```bash
# Check PostgreSQL user permissions
psql -h localhost -U securenet -d securenet -c "SELECT version();"
```

---

**Next Steps**: After updating your `.env` file, run `python scripts/migrate_to_postgresql.py` to complete the PostgreSQL migration. 