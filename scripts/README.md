# SecureNet Scripts Directory

This directory contains utility scripts for SecureNet deployment, migration, and maintenance.

## 📁 Available Scripts

### 🔄 `migrate_to_postgresql.py`
**Purpose**: Automated migration from SQLite to PostgreSQL for enterprise deployment.

#### Usage
```bash
# Basic migration (recommended)
python scripts/migrate_to_postgresql.py

# Test connection only (no migration)
python scripts/migrate_to_postgresql.py --test-only

# Verbose output
python scripts/migrate_to_postgresql.py --verbose

# Custom database URL
DATABASE_URL=postgresql://user:pass@host:port/db python scripts/migrate_to_postgresql.py
```

#### What it does
1. **Connection Testing**: Verifies PostgreSQL connectivity
2. **Schema Creation**: Runs Alembic migrations to create database schema
3. **Default Organization**: Creates default organization with API key
4. **Default Users**: Creates platform owner, security admin, and SOC analyst users
5. **Sample Data**: Populates database with sample devices, scans, and findings
6. **Environment Update**: Updates .env file with PostgreSQL configuration

#### Default Credentials (Change in Production!)
- **Platform Owner**: `ceo` / `superadmin123`
- **Security Admin**: `admin` / `platform123`
- **SOC Analyst**: `user` / `enduser123`

#### Prerequisites
```bash
# Install PostgreSQL
brew install postgresql  # macOS
sudo apt install postgresql  # Ubuntu

# Start PostgreSQL
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Linux

# Create database
createdb securenet
createuser -s securenet
psql -c "ALTER USER securenet PASSWORD 'securenet';"

# Install dependencies
pip install -r requirements-enterprise.txt
```

#### Troubleshooting
- **Connection Failed**: Ensure PostgreSQL is running and accessible
- **Permission Denied**: Check user permissions and database ownership
- **Migration Failed**: Verify Alembic configuration and database schema
- **Import Errors**: Ensure all dependencies are installed

### 🔧 Future Scripts (Planned)

#### `backup_database.py` (Coming Soon)
Automated database backup and recovery utilities.

#### `performance_tuning.py` (Coming Soon)
Database performance analysis and optimization recommendations.

#### `security_audit.py` (Coming Soon)
Security configuration audit and compliance checking.

#### `data_migration.py` (Coming Soon)
Advanced data migration utilities for complex scenarios.

## 🚀 Quick Start Examples

### Complete PostgreSQL Setup
```bash
# 1. Install PostgreSQL
brew install postgresql
brew services start postgresql

# 2. Create database
createdb securenet
createuser -s securenet
psql -c "ALTER USER securenet PASSWORD 'securenet';"

# 3. Install dependencies
pip install -r requirements-enterprise.txt

# 4. Run migration
python scripts/migrate_to_postgresql.py

# 5. Start SecureNet
./start_production.sh
```

### Docker Environment Setup
```bash
# 1. Start PostgreSQL in Docker
docker run --name securenet-postgres \
  -e POSTGRES_DB=securenet \
  -e POSTGRES_USER=securenet \
  -e POSTGRES_PASSWORD=securenet \
  -p 5432:5432 \
  -d postgres:15-alpine

# 2. Wait for startup
sleep 10

# 3. Run migration
python scripts/migrate_to_postgresql.py

# 4. Start application
./start_production.sh
```

### Production Migration
```bash
# 1. Backup existing SQLite database
cp data/securenet.db data/securenet.db.backup

# 2. Set production database URL
export DATABASE_URL="postgresql://securenet_app:secure_password@db.company.com:5432/securenet_prod"

# 3. Run migration with production settings
python scripts/migrate_to_postgresql.py

# 4. Verify migration
psql $DATABASE_URL -c "SELECT count(*) FROM organizations;"

# 5. Start production environment
./start_production.sh
```

## 🔒 Security Considerations

### Database Security
- **Change Default Passwords**: Update all default user passwords immediately
- **Use Strong Credentials**: Generate secure passwords for production
- **Enable SSL**: Configure SSL/TLS for database connections
- **Restrict Access**: Limit database access to authorized users only

### Environment Security
```bash
# Generate secure keys for production
SECRET_KEY=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
MASTER_KEY_MATERIAL=$(openssl rand -hex 64)

# Update .env file with secure values
echo "SECRET_KEY=$SECRET_KEY" >> .env
echo "JWT_SECRET=$JWT_SECRET" >> .env
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> .env
echo "MASTER_KEY_MATERIAL=$MASTER_KEY_MATERIAL" >> .env
```

### Production Checklist
- [ ] Change all default passwords
- [ ] Generate new encryption keys
- [ ] Configure SSL/TLS for database
- [ ] Set up database backups
- [ ] Configure monitoring and alerting
- [ ] Review security settings
- [ ] Test disaster recovery procedures

## 📊 Monitoring & Maintenance

### Database Health Check
```bash
# Test database connection
python -c "
import asyncio
from database_postgresql import db
async def test():
    await db.initialize()
    print('✅ Database connection successful')
asyncio.run(test())
"

# Check database size
psql -h localhost -U securenet -d securenet -c "
SELECT pg_size_pretty(pg_database_size('securenet')) as database_size;
"

# Monitor active connections
psql -h localhost -U securenet -d securenet -c "
SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';
"
```

### Performance Monitoring
```bash
# Check slow queries
psql -h localhost -U securenet -d securenet -c "
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;
"

# Analyze table sizes
psql -h localhost -U securenet -d securenet -c "
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

## 🆘 Support & Troubleshooting

### Common Issues

#### Script Execution Errors
```bash
# Permission denied
chmod +x scripts/migrate_to_postgresql.py

# Python path issues
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Missing dependencies
pip install -r requirements-enterprise.txt
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection manually
psql -h localhost -U securenet -d securenet -c "SELECT version();"

# Check firewall settings
sudo ufw status
```

#### Migration Issues
```bash
# Reset Alembic state
alembic stamp head

# Recreate database
dropdb securenet
createdb securenet

# Run migration again
python scripts/migrate_to_postgresql.py
```

### Getting Help
- **Documentation**: [docs/setup/POSTGRESQL_SETUP.md](../docs/setup/POSTGRESQL_SETUP.md)
- **Quick Guide**: [docs/setup/POSTGRESQL_GUIDE.md](../docs/setup/POSTGRESQL_GUIDE.md)
- **Issues**: GitHub Issues
- **Community**: SecureNet Community Forum
- **Enterprise Support**: Contact SecureNet Enterprise Support

---

**Note**: Always test scripts in a development environment before running in production. Ensure you have proper backups before performing any migration operations. 