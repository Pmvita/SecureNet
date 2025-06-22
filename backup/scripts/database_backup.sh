#!/bin/bash
set -e

# Configuration
BACKUP_DIR="/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
DB_HOST="${DB_HOST:-localhost}"
DB_NAME="${DB_NAME:-securenet}"
DB_USER="${DB_USER:-securenet}"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Create database backup
echo "Starting database backup at $(date)"
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | gzip > $BACKUP_DIR/securenet_$DATE.sql.gz

# Encrypt backup
gpg --symmetric --cipher-algo AES256 --output $BACKUP_DIR/securenet_$DATE.sql.gz.gpg $BACKUP_DIR/securenet_$DATE.sql.gz
rm $BACKUP_DIR/securenet_$DATE.sql.gz

# Verify backup
echo "Verifying backup integrity..."
gpg --decrypt $BACKUP_DIR/securenet_$DATE.sql.gz.gpg | gunzip | head -10

# Upload to S3
aws s3 cp $BACKUP_DIR/securenet_$DATE.sql.gz.gpg s3://securenet-backups/database/

# Cleanup old backups
find $BACKUP_DIR -name "securenet_*.sql.gz.gpg" -mtime +$RETENTION_DAYS -delete

echo "Database backup completed successfully at $(date)"
