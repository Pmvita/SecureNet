# SecureNet Deployment Guide

## 🚀 Production-Ready Multi-Tenant SaaS Platform

This guide covers deploying SecureNet as a scalable, multi-tenant cybersecurity SaaS platform capable of handling enterprise workloads.

---

## 📋 Prerequisites

### System Requirements
- **OS**: Linux (Ubuntu 20.04+ recommended) or macOS
- **Python**: 3.9+ (3.11+ recommended)
- **Memory**: 4GB minimum, 16GB+ for production
- **Storage**: 20GB minimum, 500GB+ for production
- **Network**: Stable internet connection for CVE updates

### Required Services
- **Database**: PostgreSQL 13+ (production) or SQLite (development)
- **Cache**: Redis 6+ (optional but recommended)
- **Monitoring**: Prometheus + Grafana (optional)
- **Load Balancer**: nginx or HAProxy (production)

---

## 🛠️ Development Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-org/securenet.git
cd securenet
```

### 2. Create Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Environment Configuration
Create `.env` file:
```bash
# Development Configuration
DEV_MODE=true
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///data/securenet.db

# API Configuration
API_KEY=dev-api-key
RATE_LIMIT_ENABLED=false

# External Services (Optional)
OPENAI_API_KEY=your-openai-key
STRIPE_SECRET_KEY=sk_test_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Email Configuration (Optional)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Slack Integration (Optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### 5. Initialize Database
```bash
python -c "
from database import Database
import asyncio
async def init():
    db = Database()
    await db.initialize_db()
    await db.update_db_schema()
    print('Database initialized successfully')
asyncio.run(init())
"
```

### 6. Start Development Server
```bash
# Backend
uvicorn app:app --reload --host 0.0.0.0 --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

### 7. Access Application
- **Backend API**: http://localhost:8000
- **Frontend**: http://localhost:5173
- **API Documentation**: http://localhost:8000/docs

---

## 🏗️ Production Deployment

### Option 1: Docker Deployment (Recommended)

#### 1. Create Production Environment File
```bash
# .env.production
DEV_MODE=false
SECRET_KEY=your-super-secure-secret-key-256-bits
DATABASE_URL=postgresql://user:password@postgres:5432/securenet

# Security
ALLOWED_HOSTS=your-domain.com,api.your-domain.com
CORS_ORIGINS=https://your-domain.com,https://app.your-domain.com

# External Services
OPENAI_API_KEY=sk-your-production-openai-key
STRIPE_SECRET_KEY=sk_live_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret

# Email
SMTP_SERVER=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=your-sendgrid-api-key

# Monitoring
PROMETHEUS_ENABLED=true
LOG_LEVEL=INFO
```

#### 2. Docker Compose Setup
Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: securenet
      POSTGRES_USER: securenet
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

  securenet-api:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgresql://securenet:${POSTGRES_PASSWORD}@postgres:5432/securenet
      - REDIS_URL=redis://redis:6379
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - securenet-api
    restart: unless-stopped

  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    restart: unless-stopped

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
    restart: unless-stopped

volumes:
  postgres_data:
  grafana_data:
```

#### 3. Create Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create data directory
RUN mkdir -p data logs

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/metrics/health || exit 1

# Start application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

#### 4. Deploy with Docker Compose
```bash
# Set environment variables
export POSTGRES_PASSWORD=your-secure-postgres-password
export GRAFANA_PASSWORD=your-grafana-password

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f securenet-api
```

### Option 2: Manual Deployment

#### 1. Server Setup (Ubuntu 20.04+)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3 python3-pip python3-venv nginx postgresql postgresql-contrib redis-server

# Create application user
sudo useradd -m -s /bin/bash securenet
sudo usermod -aG sudo securenet
```

#### 2. Database Setup
```bash
# Switch to postgres user
sudo -u postgres psql

-- Create database and user
CREATE DATABASE securenet;
CREATE USER securenet WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE securenet TO securenet;
\q
```

#### 3. Application Setup
```bash
# Switch to securenet user
sudo su - securenet

# Clone repository
git clone https://github.com/your-org/securenet.git
cd securenet

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create production environment file
cp .env.example .env.production
# Edit .env.production with production values

# Initialize database
python -c "
import os
os.environ['DATABASE_URL'] = 'postgresql://securenet:password@localhost/securenet'
from database import Database
import asyncio
async def init():
    db = Database()
    await db.initialize_db()
    await db.update_db_schema()
    print('Database initialized successfully')
asyncio.run(init())
"
```

#### 4. Systemd Service
Create `/etc/systemd/system/securenet.service`:
```ini
[Unit]
Description=SecureNet API Server
After=network.target postgresql.service redis.service

[Service]
Type=exec
User=securenet
Group=securenet
WorkingDirectory=/home/securenet/securenet
Environment=PATH=/home/securenet/securenet/venv/bin
EnvironmentFile=/home/securenet/securenet/.env.production
ExecStart=/home/securenet/securenet/venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

#### 5. Nginx Configuration
Create `/etc/nginx/sites-available/securenet`:
```nginx
upstream securenet_api {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name your-domain.com api.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com api.your-domain.com;

    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # API endpoints
    location /api/ {
        proxy_pass http://securenet_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # WebSocket endpoints
    location /ws/ {
        proxy_pass http://securenet_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Static files (if serving frontend)
    location / {
        root /home/securenet/securenet/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    location /api/ {
        limit_req zone=api burst=20 nodelay;
    }
}
```

#### 6. Start Services
```bash
# Enable and start services
sudo systemctl enable securenet
sudo systemctl start securenet

# Enable and configure nginx
sudo ln -s /etc/nginx/sites-available/securenet /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status securenet
sudo systemctl status nginx
```

---

## 🔧 Configuration

### Environment Variables

#### Core Settings
```bash
# Application
DEV_MODE=false
SECRET_KEY=your-256-bit-secret-key
DATABASE_URL=postgresql://user:pass@host:port/db
REDIS_URL=redis://localhost:6379

# Security
ALLOWED_HOSTS=your-domain.com,api.your-domain.com
CORS_ORIGINS=https://your-domain.com
RATE_LIMIT_ENABLED=true

# Logging
LOG_LEVEL=INFO
LOG_FILE=/app/logs/securenet.log
```

#### External Integrations
```bash
# AI/ML Services
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=1000

# Payment Processing
STRIPE_SECRET_KEY=sk_live_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRICE_FREE=price_free_plan_id
STRIPE_PRICE_PRO=price_pro_plan_id
STRIPE_PRICE_ENTERPRISE=price_enterprise_plan_id

# Email Notifications
SMTP_SERVER=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=your-sendgrid-api-key
FROM_EMAIL=noreply@your-domain.com

# Slack Integration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_CHANNEL=#security-alerts

# Monitoring
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090
GRAFANA_ENABLED=true
```

### Database Configuration

#### PostgreSQL (Production)
```bash
# Connection
DATABASE_URL=postgresql://securenet:password@localhost:5432/securenet

# Connection Pool
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30
DB_POOL_TIMEOUT=30
```

#### SQLite (Development)
```bash
DATABASE_URL=sqlite:///data/securenet.db
```

---

## 📊 Monitoring & Observability

### Prometheus Metrics
SecureNet exposes metrics at `/api/metrics/prometheus`:

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'securenet'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/api/metrics/prometheus'
    scrape_interval: 30s
```

### Grafana Dashboards
Import the provided Grafana dashboard (`grafana-dashboard.json`) for:
- System performance metrics
- Organization usage statistics
- Security event monitoring
- API performance tracking

### Log Aggregation
Configure structured logging:
```python
# logging.conf
[loggers]
keys=root,securenet

[handlers]
keys=consoleHandler,fileHandler

[formatters]
keys=jsonFormatter

[logger_root]
level=INFO
handlers=consoleHandler,fileHandler

[logger_securenet]
level=INFO
handlers=consoleHandler,fileHandler
qualname=securenet
propagate=0

[handler_consoleHandler]
class=StreamHandler
level=INFO
formatter=jsonFormatter
args=(sys.stdout,)

[handler_fileHandler]
class=FileHandler
level=INFO
formatter=jsonFormatter
args=('/app/logs/securenet.log',)

[formatter_jsonFormatter]
format={"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": "%(message)s"}
```

---

## 🔒 Security Hardening

### SSL/TLS Configuration
```bash
# Generate SSL certificate (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d api.your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Firewall Setup
```bash
# UFW configuration
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 5432  # PostgreSQL (if external access needed)
sudo ufw enable
```

### Security Headers
Already configured in nginx configuration above.

### Database Security
```sql
-- Create read-only user for monitoring
CREATE USER securenet_readonly WITH PASSWORD 'readonly-password';
GRANT CONNECT ON DATABASE securenet TO securenet_readonly;
GRANT USAGE ON SCHEMA public TO securenet_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO securenet_readonly;
```

---

## 🚀 Scaling & Performance

### Horizontal Scaling
```yaml
# docker-compose.scale.yml
version: '3.8'

services:
  securenet-api:
    deploy:
      replicas: 4
    # ... rest of configuration

  nginx:
    # Load balancer configuration
    volumes:
      - ./nginx-lb.conf:/etc/nginx/nginx.conf
```

### Database Optimization
```sql
-- Indexes for performance
CREATE INDEX CONCURRENTLY idx_logs_org_timestamp ON logs(organization_id, timestamp);
CREATE INDEX CONCURRENTLY idx_devices_org_status ON network_devices(organization_id, status);
CREATE INDEX CONCURRENTLY idx_anomalies_org_severity ON anomalies(organization_id, severity);

-- Partitioning for large tables
CREATE TABLE logs_2024_01 PARTITION OF logs
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### Caching Strategy
```python
# Redis caching configuration
REDIS_URL=redis://localhost:6379
CACHE_TTL=300  # 5 minutes
CACHE_PREFIX=securenet:
```

---

## 🔄 Backup & Recovery

### Database Backup
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="securenet"

# Create backup
pg_dump -h localhost -U securenet -d $DB_NAME | gzip > $BACKUP_DIR/securenet_$DATE.sql.gz

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "securenet_*.sql.gz" -mtime +30 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/securenet_$DATE.sql.gz s3://your-backup-bucket/database/
```

### Application Data Backup
```bash
#!/bin/bash
# backup-data.sh
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf /backups/securenet_data_$DATE.tar.gz /home/securenet/securenet/data
```

### Automated Backup
```bash
# Add to crontab
0 2 * * * /home/securenet/scripts/backup.sh
0 3 * * * /home/securenet/scripts/backup-data.sh
```

---

## 🧪 Testing

### Unit Tests
```bash
# Run unit tests
python -m pytest tests/ -v

# With coverage
python -m pytest tests/ --cov=. --cov-report=html
```

### Integration Tests
```bash
# API integration tests
python -m pytest tests/integration/ -v

# Load testing
locust -f tests/load_test.py --host=http://localhost:8000
```

### Security Testing
```bash
# OWASP ZAP security scan
docker run -t owasp/zap2docker-stable zap-baseline.py -t http://your-domain.com

# SSL/TLS testing
testssl.sh your-domain.com
```

---

## 📈 Performance Tuning

### Application Optimization
```python
# app.py optimizations
import uvloop
uvloop.install()

# Use async database connections
# Implement connection pooling
# Add response caching
# Optimize database queries
```

### Database Tuning
```sql
-- PostgreSQL configuration
-- shared_buffers = 256MB
-- effective_cache_size = 1GB
-- work_mem = 4MB
-- maintenance_work_mem = 64MB
-- checkpoint_completion_target = 0.9
-- wal_buffers = 16MB
-- default_statistics_target = 100
```

### System Optimization
```bash
# Increase file descriptor limits
echo "securenet soft nofile 65536" >> /etc/security/limits.conf
echo "securenet hard nofile 65536" >> /etc/security/limits.conf

# Optimize network settings
echo "net.core.somaxconn = 65535" >> /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65535" >> /etc/sysctl.conf
sysctl -p
```

---

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Reset connections
sudo systemctl restart postgresql
```

#### High Memory Usage
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Restart application
sudo systemctl restart securenet
```

#### SSL Certificate Issues
```bash
# Check certificate expiry
openssl x509 -in /etc/ssl/certs/your-domain.crt -text -noout | grep "Not After"

# Renew certificate
sudo certbot renew --dry-run
```

### Log Analysis
```bash
# Application logs
tail -f /app/logs/securenet.log

# System logs
journalctl -u securenet -f

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 📞 Support & Maintenance

### Health Checks
```bash
# API health check
curl -f http://localhost:8000/api/metrics/health

# Database health check
pg_isready -h localhost -p 5432 -U securenet

# Service status
sudo systemctl status securenet nginx postgresql redis
```

### Maintenance Tasks
```bash
# Update application
cd /home/securenet/securenet
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart securenet

# Database maintenance
sudo -u postgres psql securenet -c "VACUUM ANALYZE;"
sudo -u postgres psql securenet -c "REINDEX DATABASE securenet;"
```

### Monitoring Alerts
Set up alerts for:
- High CPU/memory usage
- Database connection failures
- API response time > 2s
- SSL certificate expiry
- Disk space < 10%

---

## 🎯 Production Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database initialized and migrated
- [ ] Backup strategy implemented
- [ ] Monitoring configured
- [ ] Security hardening applied
- [ ] Load testing completed
- [ ] Documentation updated

### Post-Deployment
- [ ] Health checks passing
- [ ] Monitoring alerts configured
- [ ] Backup verification
- [ ] Performance baseline established
- [ ] Security scan completed
- [ ] User acceptance testing
- [ ] Team training completed

---

**🚀 SecureNet is now ready for production deployment as a scalable, multi-tenant cybersecurity SaaS platform!** 