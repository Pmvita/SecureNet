#!/bin/bash
set -e

# Configuration
BACKUP_DIR="/backups/application"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/opt/securenet"
RETENTION_DAYS=14

# Create backup directory
mkdir -p $BACKUP_DIR

# Create application backup
echo "Starting application backup at $(date)"
tar -czf $BACKUP_DIR/securenet_app_$DATE.tar.gz -C $APP_DIR .

# Encrypt backup
gpg --symmetric --cipher-algo AES256 --output $BACKUP_DIR/securenet_app_$DATE.tar.gz.gpg $BACKUP_DIR/securenet_app_$DATE.tar.gz
rm $BACKUP_DIR/securenet_app_$DATE.tar.gz

# Upload to S3
aws s3 cp $BACKUP_DIR/securenet_app_$DATE.tar.gz.gpg s3://securenet-backups/application/

# Cleanup old backups
find $BACKUP_DIR -name "securenet_app_*.tar.gz.gpg" -mtime +$RETENTION_DAYS -delete

echo "Application backup completed successfully at $(date)"
