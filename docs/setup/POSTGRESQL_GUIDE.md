# PostgreSQL Quick Setup Guide for SecureNet

This guide provides quick installation instructions for PostgreSQL across different platforms to get SecureNet Enterprise running quickly.

## 🚀 Quick Installation

### macOS (Homebrew)
```bash
# Install PostgreSQL
brew install postgresql

# Start PostgreSQL service
brew services start postgresql

# Create database and user
createdb securenet
createuser -s securenet
psql -c "ALTER USER securenet PASSWORD 'securenet';"

# Optional: Create MLflow database
createdb mlflow
```

### Ubuntu/Debian
```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Switch to postgres user and create database
sudo -u postgres createdb securenet
sudo -u postgres createuser -s securenet
sudo -u postgres psql -c "ALTER USER securenet PASSWORD 'securenet';"

# Optional: Create MLflow database
sudo -u postgres createdb mlflow
```

### CentOS/RHEL
```bash
# Install PostgreSQL
sudo yum install postgresql-server postgresql-contrib

# Initialize database
sudo postgresql-setup initdb

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres createdb securenet
sudo -u postgres createuser -s securenet
sudo -u postgres psql -c "ALTER USER securenet PASSWORD 'securenet';"
```

### Docker (Quick Start)
```bash
# Run PostgreSQL in Docker
docker run --name securenet-postgres \
  -e POSTGRES_DB=securenet \
  -e POSTGRES_USER=securenet \
  -e POSTGRES_PASSWORD=securenet \
  -p 5432:5432 \
  -d postgres:15-alpine

# Wait for container to start
sleep 10

# Optional: Create MLflow database
docker exec securenet-postgres createdb -U securenet mlflow
```

## 🔧 Environment Configuration

### Sample .env Configuration
```bash
# PostgreSQL Configuration
DATABASE_URL=postgresql://securenet:securenet@localhost:5432/securenet

# MLflow Configuration (optional)
MLFLOW_TRACKING_URI=postgresql://securenet:securenet@localhost:5432/mlflow

# Security Configuration
SECRET_KEY=your-secret-key-here
JWT_SECRET=your-jwt-secret-here
ENCRYPTION_KEY=your-encryption-key-here

# Application Configuration
DEV_MODE=false
ENVIRONMENT=production
HOST=0.0.0.0
PORT=8000
```

### Production .env Configuration
```bash
# PostgreSQL Production Configuration
DATABASE_URL=postgresql://securenet_app:secure_password@db.company.com:5432/securenet_prod?sslmode=require

# MLflow Production Configuration
MLFLOW_TRACKING_URI=postgresql://securenet_app:secure_password@db.company.com:5432/mlflow_prod?sslmode=require

# Security Configuration (GENERATE NEW KEYS!)
SECRET_KEY=bb21500adaa5bee953de1234567890abcdef1234567890abcdef1234567890ab
JWT_SECRET=your-super-secret-jwt-key-change-in-production
ENCRYPTION_KEY=your-encryption-key-material-32-chars
MASTER_KEY_MATERIAL=your-master-key-material-for-crypto-64-chars

# JWT Configuration
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
MAX_FAILED_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30

# Redis Configuration
REDIS_URL=redis://redis.company.com:6379/0

# Application Configuration
DEV_MODE=false
ENVIRONMENT=production
HOST=0.0.0.0
PORT=8000
DEBUG=false
```

## 🏃‍♂️ Quick Migration

### From SQLite to PostgreSQL
```bash
# 1. Install PostgreSQL (see above)

# 2. Install enterprise dependencies
pip install -r requirements-enterprise.txt

# 3. Backup existing SQLite database
cp data/securenet.db data/securenet.db.backup

# 4. Run automated migration
python scripts/migrate_to_postgresql.py

# 5. Start SecureNet
./start_production.sh
```

### Verify Installation
```bash
# Test PostgreSQL connection
psql -h localhost -U securenet -d securenet -c "SELECT version();"

# Test SecureNet connection
python -c "
import asyncio
from database_postgresql import db
async def test():
    await db.initialize()
    print('✅ PostgreSQL connection successful')
asyncio.run(test())
"

# Start application
./start_production.sh
```

## 🐳 Docker Compose Setup

### Complete Docker Environment
```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: securenet
      POSTGRES_USER: securenet
      POSTGRES_PASSWORD: securenet
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  securenet:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://securenet:securenet@postgres:5432/securenet
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

volumes:
  postgres_data:
```

### Start with Docker Compose
```bash
# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🔍 Troubleshooting

### Common Issues

#### PostgreSQL Not Starting
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log

# Restart PostgreSQL
sudo systemctl restart postgresql
```

#### Connection Refused
```bash
# Check if PostgreSQL is listening
sudo netstat -tlnp | grep 5432

# Check pg_hba.conf configuration
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Reload PostgreSQL configuration
sudo systemctl reload postgresql
```

#### Authentication Failed
```bash
# Reset user password
sudo -u postgres psql -c "ALTER USER securenet PASSWORD 'new-password';"

# Update .env file with new password
DATABASE_URL=postgresql://securenet:new-password@localhost:5432/securenet
```

#### Database Does Not Exist
```bash
# Create database
sudo -u postgres createdb securenet

# Or connect as postgres and create
sudo -u postgres psql
CREATE DATABASE securenet;
\q
```

## 📚 Additional Resources

- **Comprehensive Setup**: [POSTGRESQL_SETUP.md](./POSTGRESQL_SETUP.md) - Detailed configuration guide
- **Migration Guide**: [Migration Documentation](../migration/) - Complete migration procedures
- **Production Guide**: [production_config.txt](./production_config.txt) - Production configuration
- **Docker Guide**: [Docker Documentation](../docker/) - Container deployment
- **Troubleshooting**: [POSTGRESQL_SETUP.md#troubleshooting](./POSTGRESQL_SETUP.md#troubleshooting) - Detailed troubleshooting

## 🆘 Quick Support

### Immediate Help
```bash
# Check SecureNet status
./start_production.sh

# Test database connection
python scripts/migrate_to_postgresql.py --test-only

# View application logs
tail -f logs/securenet.log
```

### Get Help
- **Documentation**: [docs/setup/](../setup/)
- **Issues**: GitHub Issues
- **Community**: SecureNet Community Forum
- **Enterprise Support**: Contact SecureNet Enterprise Support

---

**Next Steps**: After PostgreSQL setup, run `python scripts/migrate_to_postgresql.py` to complete the migration and start using SecureNet Enterprise with PostgreSQL. 