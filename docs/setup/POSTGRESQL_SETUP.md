# PostgreSQL Setup Guide for SecureNet Enterprise

This guide covers the complete migration from SQLite to PostgreSQL for enterprise-grade SecureNet deployment.

## 🎯 Overview

SecureNet now supports PostgreSQL as the primary database for enterprise deployments, providing:

- **Scalability**: Handle thousands of concurrent connections
- **Performance**: Optimized for large datasets and complex queries
- **Reliability**: ACID compliance and robust transaction support
- **Security**: Advanced authentication and encryption features
- **Compliance**: Enterprise audit trails and data governance

## 📋 Prerequisites

### System Requirements
- PostgreSQL 13+ (recommended: PostgreSQL 15)
- Python 3.8+ with asyncpg and psycopg2-binary
- 4GB+ RAM (recommended: 8GB+)
- 20GB+ disk space for database

### Required Packages
```bash
# Install PostgreSQL dependencies
pip install -r requirements-enterprise.txt
```

## 🚀 Quick Setup (Recommended)

### 1. Install PostgreSQL

#### macOS (Homebrew)
```bash
brew install postgresql
brew services start postgresql
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### CentOS/RHEL
```bash
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create Database and User
```bash
# Create database
createdb securenet

# Create user with superuser privileges
createuser -s securenet

# Set password
psql -c "ALTER USER securenet PASSWORD 'securenet';"

# Create MLflow database (optional)
createdb mlflow
```

### 3. Run Migration Script
```bash
# Automated migration from SQLite to PostgreSQL
python scripts/migrate_to_postgresql.py
```

### 4. Verify Setup
```bash
# Test connection
psql -h localhost -U securenet -d securenet -c "SELECT version();"

# Start SecureNet
./start_production.sh
```

## 🔧 Manual Setup (Advanced)

### 1. PostgreSQL Configuration

#### Edit postgresql.conf
```bash
# Find config file location
sudo -u postgres psql -c "SHOW config_file;"

# Edit configuration
sudo nano /etc/postgresql/15/main/postgresql.conf
```

#### Recommended Settings
```ini
# Connection settings
listen_addresses = 'localhost'
port = 5432
max_connections = 200

# Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# WAL settings
wal_buffers = 16MB
checkpoint_completion_target = 0.9

# Query planner
random_page_cost = 1.1
effective_io_concurrency = 200

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_statement = 'mod'
log_min_duration_statement = 1000
```

#### Edit pg_hba.conf
```bash
sudo nano /etc/postgresql/15/main/pg_hba.conf
```

Add authentication rules:
```
# SecureNet database access
local   securenet    securenet                     md5
host    securenet    securenet    127.0.0.1/32     md5
host    securenet    securenet    ::1/128          md5
```

### 2. Database Schema Setup

#### Using Alembic (Recommended)
```bash
# Initialize Alembic (if not done)
alembic init alembic

# Generate migration
alembic revision --autogenerate -m "Initial PostgreSQL schema"

# Apply migration
alembic upgrade head
```

#### Manual Schema Creation
```sql
-- Connect to database
psql -h localhost -U securenet -d securenet

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS securenet;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS metrics;
```

### 3. Performance Optimization

#### Create Indexes
```sql
-- Performance indexes for common queries
CREATE INDEX CONCURRENTLY idx_network_devices_org_ip 
ON network_devices(organization_id, ip_address);

CREATE INDEX CONCURRENTLY idx_security_findings_severity_created 
ON security_findings(severity, created_at DESC);

CREATE INDEX CONCURRENTLY idx_audit_logs_org_timestamp 
ON audit_logs(organization_id, timestamp DESC);

CREATE INDEX CONCURRENTLY idx_threat_detections_org_detected 
ON threat_detections(organization_id, detected_at DESC);

-- Full-text search indexes
CREATE INDEX CONCURRENTLY idx_security_findings_title_gin 
ON security_findings USING gin(to_tsvector('english', title));

CREATE INDEX CONCURRENTLY idx_system_logs_message_gin 
ON system_logs USING gin(to_tsvector('english', message));
```

#### Analyze Tables
```sql
-- Update table statistics
ANALYZE;

-- Auto-vacuum settings
ALTER TABLE network_devices SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE security_findings SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE audit_logs SET (autovacuum_vacuum_scale_factor = 0.05);
```

## 🔒 Security Configuration

### 1. Database Security

#### Create Restricted User
```sql
-- Create application user with limited privileges
CREATE USER securenet_app WITH PASSWORD 'your-secure-password';

-- Grant necessary permissions
GRANT CONNECT ON DATABASE securenet TO securenet_app;
GRANT USAGE ON SCHEMA public TO securenet_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO securenet_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO securenet_app;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO securenet_app;
```

#### SSL Configuration
```bash
# Generate SSL certificates
sudo -u postgres openssl req -new -x509 -days 365 -nodes -text \
  -out /var/lib/postgresql/15/main/server.crt \
  -keyout /var/lib/postgresql/15/main/server.key \
  -subj "/CN=securenet-db"

# Set permissions
sudo chmod 600 /var/lib/postgresql/15/main/server.key
sudo chown postgres:postgres /var/lib/postgresql/15/main/server.*
```

Update postgresql.conf:
```ini
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'
ssl_prefer_server_ciphers = on
ssl_ciphers = 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384'
```

### 2. Connection Security

#### Environment Configuration
```bash
# Update .env file
DATABASE_URL=postgresql://securenet_app:your-secure-password@localhost:5432/securenet?sslmode=require

# For production with SSL
DATABASE_URL=postgresql://securenet_app:your-secure-password@localhost:5432/securenet?sslmode=require&sslcert=client.crt&sslkey=client.key&sslrootcert=ca.crt
```

## 📊 Monitoring & Maintenance

### 1. Database Monitoring

#### Enable pg_stat_statements
```sql
-- Add to postgresql.conf
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.track = all
pg_stat_statements.max = 10000

-- Restart PostgreSQL and create extension
CREATE EXTENSION pg_stat_statements;
```

#### Monitoring Queries
```sql
-- Top slow queries
SELECT query, calls, total_time, mean_time, rows
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Database size
SELECT pg_size_pretty(pg_database_size('securenet')) as database_size;

-- Table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Active connections
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE state = 'active';
```

### 2. Backup Strategy

#### Automated Backups
```bash
#!/bin/bash
# backup_securenet.sh

BACKUP_DIR="/var/backups/securenet"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="securenet_backup_${DATE}.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
pg_dump -h localhost -U securenet -d securenet \
  --verbose --clean --no-owner --no-privileges \
  --file=$BACKUP_DIR/$BACKUP_FILE

# Compress backup
gzip $BACKUP_DIR/$BACKUP_FILE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/${BACKUP_FILE}.gz"
```

#### Cron Job Setup
```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /path/to/backup_securenet.sh
```

### 3. Maintenance Tasks

#### Weekly Maintenance Script
```bash
#!/bin/bash
# maintenance_securenet.sh

echo "Starting PostgreSQL maintenance..."

# Update statistics
psql -h localhost -U securenet -d securenet -c "ANALYZE;"

# Vacuum tables
psql -h localhost -U securenet -d securenet -c "VACUUM (ANALYZE, VERBOSE);"

# Reindex if needed
psql -h localhost -U securenet -d securenet -c "REINDEX DATABASE securenet;"

# Check for bloat
psql -h localhost -U securenet -d securenet -f /path/to/bloat_check.sql

echo "Maintenance completed."
```

## 🚨 Troubleshooting

### Common Issues

#### Connection Refused
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check port binding
sudo netstat -tlnp | grep 5432

# Check logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

#### Authentication Failed
```bash
# Reset password
sudo -u postgres psql -c "ALTER USER securenet PASSWORD 'new-password';"

# Check pg_hba.conf
sudo nano /etc/postgresql/15/main/pg_hba.conf

# Reload configuration
sudo systemctl reload postgresql
```

#### Performance Issues
```sql
-- Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC;

-- Check locks
SELECT * FROM pg_locks WHERE NOT granted;

-- Check active queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
```

### Migration Issues

#### Data Type Conflicts
```sql
-- Fix UUID columns
ALTER TABLE table_name ALTER COLUMN id TYPE uuid USING id::uuid;

-- Fix timestamp columns
ALTER TABLE table_name ALTER COLUMN created_at TYPE timestamptz 
USING created_at AT TIME ZONE 'UTC';
```

#### Foreign Key Constraints
```sql
-- Temporarily disable constraints
SET session_replication_role = replica;

-- Re-enable constraints
SET session_replication_role = DEFAULT;
```

## 📈 Performance Tuning

### Connection Pooling

#### PgBouncer Setup
```bash
# Install PgBouncer
sudo apt install pgbouncer

# Configure /etc/pgbouncer/pgbouncer.ini
[databases]
securenet = host=localhost port=5432 dbname=securenet

[pgbouncer]
listen_port = 6432
listen_addr = 127.0.0.1
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 100
default_pool_size = 20
```

#### Update Connection String
```bash
# Use PgBouncer
DATABASE_URL=postgresql://securenet:password@localhost:6432/securenet
```

### Query Optimization

#### Analyze Query Performance
```sql
-- Enable query timing
\timing on

-- Explain query plans
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM network_devices 
WHERE organization_id = 'uuid-here' 
AND status = 'online';

-- Create covering indexes
CREATE INDEX idx_devices_org_status_covering 
ON network_devices(organization_id, status) 
INCLUDE (name, ip_address, last_seen);
```

## 🔄 Migration from SQLite

### Data Migration Script
```python
#!/usr/bin/env python3
"""
Migrate data from SQLite to PostgreSQL
"""
import sqlite3
import asyncpg
import asyncio
import json
from datetime import datetime

async def migrate_data():
    # Connect to SQLite
    sqlite_conn = sqlite3.connect('data/securenet.db')
    sqlite_conn.row_factory = sqlite3.Row
    
    # Connect to PostgreSQL
    pg_conn = await asyncpg.connect(
        'postgresql://securenet:securenet@localhost:5432/securenet'
    )
    
    # Migrate organizations
    cursor = sqlite_conn.execute('SELECT * FROM organizations')
    for row in cursor:
        await pg_conn.execute('''
            INSERT INTO organizations (id, name, owner_email, status, plan_type, 
                                     device_limit, api_key, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO NOTHING
        ''', row['id'], row['name'], row['owner_email'], row['status'],
             row['plan_type'], row['device_limit'], row['api_key'],
             datetime.fromisoformat(row['created_at']),
             datetime.fromisoformat(row['updated_at']))
    
    # Continue for other tables...
    
    await pg_conn.close()
    sqlite_conn.close()

if __name__ == '__main__':
    asyncio.run(migrate_data())
```

## 📚 Additional Resources

- [PostgreSQL Official Documentation](https://www.postgresql.org/docs/)
- [SQLAlchemy PostgreSQL Dialect](https://docs.sqlalchemy.org/en/14/dialects/postgresql.html)
- [Alembic Migration Guide](https://alembic.sqlalchemy.org/en/latest/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [SecureNet Enterprise Architecture](../architecture/ENTERPRISE-ARCHITECTURE.md)

## 🆘 Support

For PostgreSQL setup issues:

1. Check the [troubleshooting section](#-troubleshooting) above
2. Review PostgreSQL logs: `/var/log/postgresql/`
3. Verify network connectivity and firewall settings
4. Ensure proper authentication configuration
5. Contact SecureNet support with specific error messages

---

**Next Steps**: After PostgreSQL setup, proceed to [Production Configuration](./production_config.txt) for complete enterprise deployment. 