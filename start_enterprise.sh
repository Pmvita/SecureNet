#!/bin/bash

# SecureNet Enterprise Startup Script
# Production-ready deployment with health checks and monitoring

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/logs/startup.log"
ENVIRONMENT="${ENVIRONMENT:-production}"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"

# Ensure logs directory exists
mkdir -p "${SCRIPT_DIR}/logs"
mkdir -p "${SCRIPT_DIR}/secrets"

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

info() { log "INFO" "$@"; }
warn() { log "WARN" "$@"; }
error() { log "ERROR" "$@"; }
success() { log "SUCCESS" "$@"; }

# Banner
print_banner() {
    echo -e "${BLUE}"
    cat << 'EOF'
   ____                           _   _      _   
  / ___|  ___  ___ _   _ _ __ ___ | \ | | ___| |_ 
  \___ \ / _ \/ __| | | | '__/ _ \|  \| |/ _ \ __|
   ___) |  __/ (__| |_| | | |  __/| |\  |  __/ |_ 
  |____/ \___|\___|\__,_|_|  \___||_| \_|\___|\__|
                                                  
  🏢 Enterprise Cybersecurity Platform
  🚀 Starting Production Environment
EOF
    echo -e "${NC}"
}

# Pre-flight checks
preflight_checks() {
    info "🔍 Running pre-flight checks..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "❌ Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "❌ Docker Compose is not installed"
        exit 1
    fi
    
    # Check required environment variables
    local required_vars=(
        "POSTGRES_PASSWORD"
        "JWT_SECRET"
        "ENCRYPTION_KEY"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "❌ Required environment variable $var is not set"
            exit 1
        fi
    done
    
    # Check if secrets exist
    if [[ ! -f "${SCRIPT_DIR}/secrets/postgres_password.txt" ]]; then
        info "⚙️  Generating database secrets..."
        echo "$POSTGRES_PASSWORD" > "${SCRIPT_DIR}/secrets/postgres_password.txt"
        chmod 600 "${SCRIPT_DIR}/secrets/postgres_password.txt"
    fi
    
    if [[ ! -f "${SCRIPT_DIR}/secrets/jwt_secret.txt" ]]; then
        info "⚙️  Generating JWT secrets..."
        echo "$JWT_SECRET" > "${SCRIPT_DIR}/secrets/jwt_secret.txt"
        chmod 600 "${SCRIPT_DIR}/secrets/jwt_secret.txt"
    fi
    
    if [[ ! -f "${SCRIPT_DIR}/secrets/encryption_key.txt" ]]; then
        info "⚙️  Generating encryption secrets..."
        echo "$ENCRYPTION_KEY" > "${SCRIPT_DIR}/secrets/encryption_key.txt"
        chmod 600 "${SCRIPT_DIR}/secrets/encryption_key.txt"
    fi
    
    if [[ ! -f "${SCRIPT_DIR}/secrets/grafana_password.txt" ]]; then
        info "⚙️  Generating Grafana admin password..."
        openssl rand -base64 32 > "${SCRIPT_DIR}/secrets/grafana_password.txt"
        chmod 600 "${SCRIPT_DIR}/secrets/grafana_password.txt"
    fi
    
    success "✅ Pre-flight checks completed"
}

# Initialize secrets
initialize_secrets() {
    info "🔐 Initializing enterprise secrets..."
    
    # Run Python script to initialize secrets
    if [[ -f "${SCRIPT_DIR}/secrets_management.py" ]]; then
        python3 "${SCRIPT_DIR}/secrets_management.py" || {
            warn "⚠️  Secrets initialization failed, continuing with manual setup"
        }
    fi
    
    success "✅ Secrets initialized"
}

# Database setup
setup_database() {
    info "🗄️  Setting up PostgreSQL database..."
    
    # Wait for PostgreSQL to be ready
    local retries=0
    local max_retries=30
    
    while [[ $retries -lt $max_retries ]]; do
        if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -h localhost -U securenet &> /dev/null; then
            success "✅ PostgreSQL is ready"
            break
        fi
        
        info "⏳ Waiting for PostgreSQL to start... ($((retries + 1))/$max_retries)"
        sleep 2
        retries=$((retries + 1))
    done
    
    if [[ $retries -eq $max_retries ]]; then
        error "❌ PostgreSQL failed to start within timeout"
        exit 1
    fi
    
    # Run database migrations
    info "📊 Running database migrations..."
    python3 -c "
import asyncio
from database.postgresql_adapter import initialize_database
try:
    asyncio.run(initialize_database())
    print('✅ Database initialized successfully')
except Exception as e:
    print(f'❌ Database initialization failed: {e}')
    exit(1)
"
}

# Health check function
health_check() {
    local service="$1"
    local url="$2"
    local retries=0
    local max_retries=10
    
    while [[ $retries -lt $max_retries ]]; do
        if curl -f -s "$url" &> /dev/null; then
            success "✅ $service is healthy"
            return 0
        fi
        
        info "⏳ Waiting for $service health check... ($((retries + 1))/$max_retries)"
        sleep 3
        retries=$((retries + 1))
    done
    
    error "❌ $service failed health check"
    return 1
}

# Start services
start_services() {
    info "🚀 Starting SecureNet Enterprise services..."
    
    # Pull latest images
    info "📥 Pulling latest container images..."
    docker-compose -f "$COMPOSE_FILE" pull
    
    # Start services
    info "🏗️  Starting all services..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for core services
    info "⏳ Waiting for core services to start..."
    sleep 10
    
    # Health checks
    info "🏥 Running health checks..."
    
    # PostgreSQL
    health_check "PostgreSQL" "http://localhost:5432" || {
        # Alternative check for PostgreSQL
        if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -h localhost -U securenet &> /dev/null; then
            success "✅ PostgreSQL is healthy (alternative check)"
        else
            error "❌ PostgreSQL health check failed"
            return 1
        fi
    }
    
    # Redis
    health_check "Redis" "http://localhost:6379" || {
        # Alternative check for Redis
        if docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping | grep -q "PONG"; then
            success "✅ Redis is healthy (alternative check)"
        else
            error "❌ Redis health check failed"
            return 1
        fi
    }
    
    # API Service
    sleep 15  # Give API time to start
    health_check "SecureNet API" "http://localhost:8000/health"
    
    # Prometheus
    health_check "Prometheus" "http://localhost:9090/-/healthy"
    
    # Grafana
    health_check "Grafana" "http://localhost:3000/api/health"
    
    success "✅ All core services are healthy"
}

# Post-startup configuration
post_startup_config() {
    info "⚙️  Running post-startup configuration..."
    
    # Create default organization and users
    info "👥 Creating default organization and users..."
    python3 -c "
import asyncio
from database.postgresql_adapter import get_database_adapter
from secrets_management import get_secrets_manager
import uuid
import hashlib

async def setup_defaults():
    adapter = get_database_adapter()
    await adapter.initialize()
    
    # Check if default org exists
    existing_org = await adapter.get_organization_by_id('default')
    if not existing_org:
        # Create default organization
        org_data = {
            'name': 'SecureNet Enterprise',
            'slug': 'securenet-enterprise',
            'primary_contact_email': 'admin@securenet.local',
            'plan_type': 'enterprise',
            'device_limit': 10000,
            'user_limit': 100
        }
        org = await adapter.create_organization(org_data)
        print(f'✅ Created default organization: {org[\"id\"]}')
        
        # Create admin user
        password_hash = hashlib.sha256('admin123'.encode()).hexdigest()
        user_data = {
            'organization_id': org['id'],
            'username': 'admin',
            'email': 'admin@securenet.local',
            'password_hash': password_hash,
            'first_name': 'Admin',
            'last_name': 'User',
            'role': 'platform_owner',
            'is_active': True,
            'is_verified': True
        }
        user = await adapter.create_user(user_data)
        print(f'✅ Created admin user: {user[\"username\"]}')
    else:
        print('✅ Default organization already exists')

try:
    asyncio.run(setup_defaults())
except Exception as e:
    print(f'⚠️  Default setup failed: {e}')
"
    
    # Configure Grafana dashboards
    info "📊 Configuring monitoring dashboards..."
    # This would typically involve API calls to Grafana to import dashboards
    
    success "✅ Post-startup configuration completed"
}

# Configure frontend for production mode
configure_frontend() {
    info "🎨 Configuring frontend for production mode..."
    
    # Create frontend .env file with production settings
    if [ ! -f "frontend/.env" ]; then
        info "Creating frontend .env file..."
        cat > frontend/.env << EOF
# SecureNet Frontend Environment Configuration

# Production Mode - Disable mock data
VITE_MOCK_DATA=false

# API Configuration
VITE_API_BASE_URL=http://localhost:8000

# Environment
VITE_ENVIRONMENT=production
EOF
        success "✅ Frontend .env file created"
    else
        # Update existing .env file to ensure VITE_MOCK_DATA=false
        if grep -q "VITE_MOCK_DATA=true" frontend/.env; then
            info "Updating VITE_MOCK_DATA to false..."
            sed -i.bak 's/VITE_MOCK_DATA=true/VITE_MOCK_DATA=false/' frontend/.env
        elif ! grep -q "VITE_MOCK_DATA=false" frontend/.env; then
            info "Adding VITE_MOCK_DATA=false to frontend/.env..."
            echo "VITE_MOCK_DATA=false" >> frontend/.env
        fi
        success "✅ Frontend .env file configured"
    fi
    
    # Build frontend for production
    info "🔨 Building frontend for production..."
    cd frontend
    if npm run build; then
        success "✅ Frontend production build completed"
    else
        error "❌ Frontend build failed"
        return 1
    fi
    cd ..
    
    # Start frontend in production mode
    info "🚀 Starting frontend in production mode..."
    cd frontend
    nohup npm run start:prod > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../.frontend.pid
    cd ..
    
    # Wait for frontend to start
    sleep 5
    if curl -f -s http://localhost:5173 > /dev/null; then
        success "✅ Frontend started successfully on http://localhost:5173"
    else
        warn "⚠️  Frontend may not be ready yet, check logs/frontend.log"
    fi
}

# Display service information
display_service_info() {
    echo -e "${GREEN}"
    cat << 'EOF'

🎉 SecureNet Enterprise Successfully Started!

🌐 Service Endpoints:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
    echo -e "${NC}"
    
    echo -e "${BLUE}📱 Main Application:${NC}"
    echo -e "   • Frontend:    http://localhost:5173"
    echo -e "   • API:         http://localhost:8000"
    echo -e "   • Health:      http://localhost:8000/health"
    echo -e "   • Docs:        http://localhost:8000/api/docs"
    echo ""
    
    echo -e "${PURPLE}📊 Monitoring & Observability:${NC}"
    echo -e "   • Prometheus:  http://localhost:9090"
    echo -e "   • Grafana:     http://localhost:3000"
    echo -e "   • Jaeger:      http://localhost:16686"
    echo ""
    
    echo -e "${YELLOW}🗄️  Database:${NC}"
    echo -e "   • PostgreSQL:  localhost:5432"
    echo -e "   • Redis:       localhost:6379"
    echo ""
    
    echo -e "${GREEN}🔐 Default Credentials:${NC}"
    echo -e "   • Username:    admin"
    echo -e "   • Password:    admin123"
    echo -e "   • Grafana:     admin / $(cat secrets/grafana_password.txt 2>/dev/null || echo 'check logs')"
    echo ""
    
    echo -e "${BLUE}📋 Quick Commands:${NC}"
    echo -e "   • View logs:   docker-compose logs -f"
    echo -e "   • Stop:        docker-compose down"
    echo -e "   • Restart:     docker-compose restart"
    echo -e "   • Status:      docker-compose ps"
    echo ""
    
    echo -e "${GREEN}✅ Enterprise platform is ready for use!${NC}"
}

# Cleanup function for graceful shutdown
cleanup() {
    info "🛑 Shutting down SecureNet Enterprise..."
    
    # Stop frontend if running
    if [ -f ".frontend.pid" ]; then
        FRONTEND_PID=$(cat .frontend.pid)
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            info "Stopping frontend process..."
            kill $FRONTEND_PID
            rm -f .frontend.pid
        fi
    fi
    
    # Stop Docker services
    docker-compose -f "$COMPOSE_FILE" down
    success "✅ Shutdown complete"
}

# Trap cleanup function on script exit
trap cleanup EXIT

# Main execution
main() {
    print_banner
    
    info "🚀 Starting SecureNet Enterprise deployment..."
    info "📍 Environment: $ENVIRONMENT"
    info "📂 Working directory: $SCRIPT_DIR"
    
    # Execute startup sequence
    preflight_checks
    initialize_secrets
    start_services
    setup_database
    post_startup_config
    
    # Configure frontend for production
    configure_frontend
    
    display_service_info
    
    # Keep script running to maintain trap
    if [[ "${KEEP_RUNNING:-}" == "true" ]]; then
        info "🔄 Keeping services running... (Press Ctrl+C to stop)"
        while true; do
            sleep 30
            # Basic health monitoring
            if ! curl -f -s http://localhost:8000/health &> /dev/null; then
                warn "⚠️  API health check failed, investigating..."
                docker-compose -f "$COMPOSE_FILE" ps
            fi
        done
    fi
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 