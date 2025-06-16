"""
SecureNet Enhanced Setup Script
Initializes all Phase 1-3 implementations
"""

import os
import sys
import subprocess
import sqlite3
from pathlib import Path
from typing import Dict, Any
import json

def create_directories():
    """Create necessary directories"""
    
    directories = [
        "data",
        "logs",
        "monitoring",
        "auth", 
        "crypto",
        "tasks",
        "ml",
        "utils",
        "tests/integration",
        "api/middleware"
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        print(f"✓ Created directory: {directory}")

def create_env_file():
    """Create .env file with default configuration"""
    
    env_content = """# SecureNet Enhanced Configuration

# Environment
ENVIRONMENT=development
DEBUG=true
HOST=0.0.0.0
PORT=8000

# Database
DATABASE_URL=postgresql://securenet:securenet@localhost:5432/securenet

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
ENCRYPTION_KEY=your-encryption-key-material
MASTER_KEY_MATERIAL=your-master-key-material-for-crypto

# Authentication
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
MAX_FAILED_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15

# Redis (for RQ task queue)
REDIS_URL=redis://localhost:6379/0

# MLflow
MLFLOW_TRACKING_URI=postgresql://securenet:securenet@localhost:5432/mlflow

# Monitoring
SENTRY_DSN=your-sentry-dsn-here
ENABLE_METRICS=true

# External Services
SLACK_WEBHOOK_URL=your-slack-webhook-url
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Development Mode
DEV_MODE=true
"""
    
    if not os.path.exists(".env"):
        with open(".env", "w") as f:
            f.write(env_content)
        print("✓ Created .env file with default configuration")
    else:
        print("✓ .env file already exists")

def install_dependencies():
    """Install Python dependencies"""
    
    print("Installing Python dependencies...")
    
    try:
        subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", "requirements.txt"
        ], check=True, capture_output=True, text=True)
        print("✓ Python dependencies installed successfully")
        
    except subprocess.CalledProcessError as e:
        print(f"✗ Failed to install dependencies: {e}")
        print("Error output:", e.stderr)
        return False
    
    return True

def setup_database():
    """Setup SQLite database with enhanced tables"""
    
    db_path = "data/securenet.db"
    
    # Enhanced database schema
    schema_sql = """
    -- Users table with enhanced security
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'soc_analyst',
        tenant_id TEXT NOT NULL DEFAULT 'default',
        is_active BOOLEAN DEFAULT 1,
        failed_login_attempts INTEGER DEFAULT 0,
        last_login_attempt TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Tenants table
    CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        settings TEXT, -- JSON settings
        encryption_key_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Enhanced scans table
    CREATE TABLE IF NOT EXISTS scans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        user_id INTEGER,
        scan_type TEXT NOT NULL,
        target TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        config TEXT, -- JSON config
        results TEXT, -- JSON results
        job_id TEXT,
        priority TEXT DEFAULT 'default',
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
    );
    
    -- Enhanced threats table
    CREATE TABLE IF NOT EXISTS threats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        threat_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        source_ip TEXT,
        target_ip TEXT,
        confidence REAL,
        status TEXT DEFAULT 'active',
        analysis_results TEXT, -- JSON analysis
        ml_model_version TEXT,
        detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
    );
    
    -- Encrypted secrets table
    CREATE TABLE IF NOT EXISTS encrypted_secrets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        key_name TEXT NOT NULL,
        encrypted_value TEXT NOT NULL,
        metadata TEXT, -- JSON metadata
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, key_name),
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
    );
    
    -- Audit log table
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        user_id INTEGER,
        action TEXT NOT NULL,
        resource_type TEXT,
        resource_id TEXT,
        details TEXT, -- JSON details
        ip_address TEXT,
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
    );
    
    -- ML model tracking table
    CREATE TABLE IF NOT EXISTS ml_models (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        version TEXT NOT NULL,
        model_type TEXT NOT NULL,
        status TEXT DEFAULT 'training',
        metrics TEXT, -- JSON metrics
        mlflow_run_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deployed_at TIMESTAMP,
        UNIQUE(name, version)
    );
    """
    
    try:
        conn = sqlite3.connect(db_path)
        conn.executescript(schema_sql)
        conn.commit()
        conn.close()
        print("✓ Database schema created successfully")
        
    except Exception as e:
        print(f"✗ Failed to setup database: {e}")
        return False
    
    return True

def seed_initial_data():
    """Seed database with initial data"""
    
    from crypto.securenet_crypto import crypto_service
    
    db_path = "data/securenet.db"
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create default tenant
        cursor.execute("""
            INSERT OR IGNORE INTO tenants (id, name, settings)
            VALUES ('default', 'Default Organization', '{}')
        """)
        
        # Create default users with hashed passwords
        default_users = [
            ('ceo', 'ceo@securenet.com', 'superadmin123', 'platform_owner'),
            ('admin', 'admin@securenet.com', 'platform123', 'security_admin'),
            ('user', 'user@securenet.com', 'enduser123', 'soc_analyst')
        ]
        
        for username, email, password, role in default_users:
            password_hash = crypto_service.hash_password(password)
            cursor.execute("""
                INSERT OR IGNORE INTO users (username, email, password_hash, role, tenant_id)
                VALUES (?, ?, ?, ?, 'default')
            """, (username, email, password_hash, role))
        
        # Create sample ML model entries
        cursor.execute("""
            INSERT OR IGNORE INTO ml_models (name, version, model_type, status, metrics)
            VALUES 
                ('threat_detector', '1.0', 'classification', 'production', '{"accuracy": 0.95, "precision": 0.92}'),
                ('vulnerability_scanner', '2.1', 'detection', 'staging', '{"recall": 0.88, "f1_score": 0.90}'),
                ('anomaly_detector', '1.5', 'anomaly_detection', 'production', '{"auc": 0.93, "threshold": 0.75}')
        """)
        
        conn.commit()
        conn.close()
        print("✓ Initial data seeded successfully")
        
    except Exception as e:
        print(f"✗ Failed to seed initial data: {e}")
        return False
    
    return True

def create_startup_scripts():
    """Create startup scripts for different components"""
    
    # Main application startup script
    app_script = """#!/bin/bash
# SecureNet Enhanced Application Startup

echo "Starting SecureNet Enhanced Application..."

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Start the enhanced application
python app_enhanced.py
"""
    
    # Worker startup script
    worker_script = """#!/bin/bash
# SecureNet RQ Worker Startup

echo "Starting SecureNet RQ Workers..."

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Start RQ workers
python -c "
from tasks.rq_service import worker_manager
import sys

# Start multiple workers
workers = []
for i in range(3):
    worker = worker_manager.start_worker(
        queues=['high', 'default', 'low'],
        worker_name=f'securenet-worker-{i+1}'
    )
    workers.append(worker)

print('Started', len(workers), 'workers')

# Keep workers running
try:
    for worker in workers:
        worker.work()
except KeyboardInterrupt:
    print('Stopping workers...')
    for worker in workers:
        worker.request_stop()
"
"""
    
    # Development startup script
    dev_script = """#!/bin/bash
# SecureNet Development Environment

echo "Starting SecureNet Development Environment..."

# Install dependencies if needed
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install/update dependencies
pip install -r requirements.txt

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Start Redis if not running (for RQ)
if ! pgrep -x "redis-server" > /dev/null; then
    echo "Starting Redis server..."
    redis-server --daemonize yes
fi

# Start the application in development mode
echo "Starting SecureNet Enhanced Application in development mode..."
python app_enhanced.py
"""
    
    scripts = {
        "start_app.sh": app_script,
        "start_workers.sh": worker_script,
        "start_dev.sh": dev_script
    }
    
    for script_name, script_content in scripts.items():
        with open(script_name, "w") as f:
            f.write(script_content)
        os.chmod(script_name, 0o755)
        print(f"✓ Created startup script: {script_name}")

def create_docker_files():
    """Create Docker configuration files"""
    
    dockerfile = """FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    gcc \\
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

# Run the application
CMD ["python", "app_enhanced.py"]
"""
    
    docker_compose = """version: '3.8'

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
      - ENVIRONMENT=production
      - DATABASE_URL=postgresql://securenet:securenet@postgres:5432/securenet
      - REDIS_URL=redis://redis:6379/0
      - MLFLOW_TRACKING_URI=postgresql://securenet:securenet@postgres:5432/mlflow
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

  worker:
    build: .
    command: python -c "from tasks.rq_service import worker_manager; worker_manager.start_worker().work()"
    environment:
      - ENVIRONMENT=production
      - REDIS_URL=redis://redis:6379/0
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    depends_on:
      - redis
    restart: unless-stopped
    deploy:
      replicas: 2

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    restart: unless-stopped

volumes:
  postgres_data:
"""
    
    prometheus_config = """global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'securenet'
    static_configs:
      - targets: ['securenet:8000']
    metrics_path: '/system/metrics'
"""
    
    # Create monitoring directory
    Path("monitoring").mkdir(exist_ok=True)
    
    files = {
        "Dockerfile": dockerfile,
        "docker-compose.yml": docker_compose,
        "monitoring/prometheus.yml": prometheus_config
    }
    
    for file_path, content in files.items():
        with open(file_path, "w") as f:
            f.write(content)
        print(f"✓ Created Docker file: {file_path}")

def main():
    """Main setup function"""
    
    print("🚀 Setting up SecureNet Enhanced Application")
    print("=" * 50)
    
    # Step 1: Create directories
    print("\n1. Creating directories...")
    create_directories()
    
    # Step 2: Create environment file
    print("\n2. Creating environment configuration...")
    create_env_file()
    
    # Step 3: Install dependencies
    print("\n3. Installing dependencies...")
    if not install_dependencies():
        print("❌ Setup failed at dependency installation")
        return False
    
    # Step 4: Setup database
    print("\n4. Setting up database...")
    if not setup_database():
        print("❌ Setup failed at database setup")
        return False
    
    # Step 5: Seed initial data
    print("\n5. Seeding initial data...")
    if not seed_initial_data():
        print("❌ Setup failed at data seeding")
        return False
    
    # Step 6: Create startup scripts
    print("\n6. Creating startup scripts...")
    create_startup_scripts()
    
    # Step 7: Create Docker files
    print("\n7. Creating Docker configuration...")
    create_docker_files()
    
    print("\n" + "=" * 50)
    print("✅ SecureNet Enhanced Application setup completed!")
    print("\nNext steps:")
    print("1. Review and update .env file with your configuration")
    print("2. Start Redis server: redis-server")
    print("3. Run the application: ./start_dev.sh")
    print("4. Or use Docker: docker-compose up")
    print("\nDefault login credentials:")
    print("- Platform Owner: ceo / superadmin123")
    print("- Security Admin: admin / platform123") 
    print("- SOC Analyst: user / enduser123")
    print("\nAPI Documentation: http://localhost:8000/docs")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 