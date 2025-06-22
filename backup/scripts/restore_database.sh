#!/bin/bash
set -e

# Configuration
BACKUP_FILE="$1"
DB_HOST="${DB_HOST:-localhost}"
DB_NAME="${DB_NAME:-securenet}"
DB_USER="${DB_USER:-securenet}"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

echo "Starting database restoration from $BACKUP_FILE at $(date)"

# Decrypt and restore
gpg --decrypt $BACKUP_FILE | gunzip | psql -h $DB_HOST -U $DB_USER -d $DB_NAME

echo "Database restoration completed successfully at $(date)"
