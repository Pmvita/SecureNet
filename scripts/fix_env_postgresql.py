#!/usr/bin/env python3
"""
SecureNet .env File PostgreSQL Configuration Fixer

This script automatically updates the .env file to use PostgreSQL configuration
instead of SQLite, ensuring proper enterprise deployment setup.
"""

import os
import sys
import shutil
from datetime import datetime

def print_status(message):
    print(f"✅ {message}")

def print_warning(message):
    print(f"⚠️  {message}")

def print_error(message):
    print(f"❌ {message}")

def print_info(message):
    print(f"ℹ️  {message}")

def backup_env_file():
    """Create a backup of the current .env file"""
    if os.path.exists('.env'):
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f'.env.backup_{timestamp}'
        shutil.copy2('.env', backup_name)
        print_status(f"Backup created: {backup_name}")
        return backup_name
    return None

def read_env_file():
    """Read the current .env file"""
    if not os.path.exists('.env'):
        print_error(".env file not found!")
        return None
    
    with open('.env', 'r') as f:
        return f.readlines()

def fix_database_urls(lines):
    """Fix DATABASE_URL and MLFLOW_TRACKING_URI to use PostgreSQL"""
    updated_lines = []
    database_url_fixed = False
    mlflow_url_fixed = False
    
    for line in lines:
        line_stripped = line.strip()
        
        # Fix DATABASE_URL
        if line_stripped.startswith('DATABASE_URL=sqlite:'):
            updated_lines.append('DATABASE_URL=postgresql://securenet:securenet@localhost:5432/securenet\n')
            database_url_fixed = True
            print_status("Fixed DATABASE_URL to use PostgreSQL")
        elif line_stripped.startswith('DATABASE_URL=postgresql:'):
            updated_lines.append(line)
            database_url_fixed = True
            print_info("DATABASE_URL already uses PostgreSQL")
        
        # Fix MLFLOW_TRACKING_URI
        elif line_stripped.startswith('MLFLOW_TRACKING_URI=sqlite:'):
            updated_lines.append('MLFLOW_TRACKING_URI=postgresql://securenet:securenet@localhost:5432/mlflow\n')
            mlflow_url_fixed = True
            print_status("Fixed MLFLOW_TRACKING_URI to use PostgreSQL")
        elif line_stripped.startswith('MLFLOW_TRACKING_URI=postgresql:'):
            updated_lines.append(line)
            mlflow_url_fixed = True
            print_info("MLFLOW_TRACKING_URI already uses PostgreSQL")
        
        else:
            updated_lines.append(line)
    
    # Add missing configurations if not found
    if not database_url_fixed:
        updated_lines.append('\n# PostgreSQL Database (Enterprise)\n')
        updated_lines.append('DATABASE_URL=postgresql://securenet:securenet@localhost:5432/securenet\n')
        print_status("Added DATABASE_URL with PostgreSQL configuration")
    
    if not mlflow_url_fixed:
        updated_lines.append('\n# MLflow Tracking (PostgreSQL)\n')
        updated_lines.append('MLFLOW_TRACKING_URI=postgresql://securenet:securenet@localhost:5432/mlflow\n')
        print_status("Added MLFLOW_TRACKING_URI with PostgreSQL configuration")
    
    return updated_lines

def add_missing_enterprise_vars(lines):
    """Add missing enterprise configuration variables"""
    existing_vars = set()
    for line in lines:
        if '=' in line and not line.strip().startswith('#'):
            var_name = line.split('=')[0].strip()
            existing_vars.add(var_name)
    
    enterprise_vars = {
        'DEFAULT_ORG_NAME': 'SecureNet Enterprise',
        'DEFAULT_ORG_DOMAIN': 'securenet.local',
        'DEFAULT_ORG_API_KEY': 'sk_live_enterprise_default_key_change_in_production',
        'ENABLE_RBAC': 'true',
        'DEFAULT_USER_ROLE': 'soc_analyst',
        'ADMIN_ROLE': 'platform_owner',
        'ENABLE_MULTI_TENANT': 'true',
        'ORGANIZATION_ISOLATION': 'true',
        'ENABLE_COMPLIANCE_MODE': 'true',
        'DATA_RETENTION_DAYS': '2555',
        'ENABLE_ENCRYPTION_AT_REST': 'true',
        'ENABLE_DATA_GOVERNANCE': 'true',
        'PRIVACY_MODE': 'strict',
        'GDPR_COMPLIANCE': 'true',
        'ENABLE_ML_FEATURES': 'true',
        'ML_MODEL_PATH': 'models/',
        'ML_PREDICTION_THRESHOLD': '0.7',
        'ENABLE_THREAT_DETECTION': 'true',
        'THREAT_SCORE_THRESHOLD': '7.0',
        'ANOMALY_DETECTION_SENSITIVITY': '0.8',
        'ENABLE_AUDIT_LOGS': 'true',
        'AUDIT_LOG_RETENTION_DAYS': '2555'
    }
    
    missing_vars = []
    for var_name, default_value in enterprise_vars.items():
        if var_name not in existing_vars:
            missing_vars.append((var_name, default_value))
    
    if missing_vars:
        lines.append('\n# ========================================\n')
        lines.append('# ENTERPRISE CONFIGURATION (Auto-added)\n')
        lines.append('# ========================================\n\n')
        
        for var_name, default_value in missing_vars:
            lines.append(f'{var_name}={default_value}\n')
            print_status(f"Added missing variable: {var_name}")
    
    return lines

def write_env_file(lines):
    """Write the updated .env file"""
    with open('.env', 'w') as f:
        f.writelines(lines)
    print_status("Updated .env file written")

def verify_configuration():
    """Verify the PostgreSQL configuration"""
    print_info("Verifying PostgreSQL configuration...")
    
    # Check DATABASE_URL
    with open('.env', 'r') as f:
        content = f.read()
        
    if 'DATABASE_URL=postgresql://' in content:
        print_status("DATABASE_URL uses PostgreSQL ✓")
    else:
        print_error("DATABASE_URL still uses SQLite ✗")
        return False
    
    if 'MLFLOW_TRACKING_URI=postgresql://' in content:
        print_status("MLFLOW_TRACKING_URI uses PostgreSQL ✓")
    else:
        print_warning("MLFLOW_TRACKING_URI not configured for PostgreSQL")
    
    return True

def main():
    """Main function to fix .env file"""
    print("🔧 SecureNet .env PostgreSQL Configuration Fixer")
    print("=" * 50)
    
    # Check if .env file exists
    if not os.path.exists('.env'):
        print_error(".env file not found!")
        print_info("Please create a .env file first or run from the SecureNet root directory")
        sys.exit(1)
    
    # Create backup
    backup_name = backup_env_file()
    
    # Read current .env file
    lines = read_env_file()
    if lines is None:
        sys.exit(1)
    
    print_info(f"Read {len(lines)} lines from .env file")
    
    # Fix database URLs
    print_info("Fixing database configuration...")
    lines = fix_database_urls(lines)
    
    # Add missing enterprise variables
    print_info("Adding missing enterprise configuration...")
    lines = add_missing_enterprise_vars(lines)
    
    # Write updated file
    write_env_file(lines)
    
    # Verify configuration
    if verify_configuration():
        print_status("✅ .env file successfully updated for PostgreSQL!")
        print_info("Next steps:")
        print_info("1. Install PostgreSQL: brew install postgresql (macOS)")
        print_info("2. Start PostgreSQL: brew services start postgresql")
        print_info("3. Create database: createdb securenet")
        print_info("4. Create user: createuser -s securenet")
        print_info("5. Set password: psql -c \"ALTER USER securenet PASSWORD 'securenet';\"")
        print_info("6. Run migration: python scripts/migrate_to_postgresql.py")
        
        if backup_name:
            print_info(f"Original .env backed up as: {backup_name}")
    else:
        print_error("Configuration verification failed!")
        if backup_name:
            print_info(f"Restore backup with: cp {backup_name} .env")
        sys.exit(1)

if __name__ == "__main__":
    main() 