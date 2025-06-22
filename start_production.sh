#!/bin/bash

# SecureNet Production Startup Script
# This script ensures both backend and frontend are running in production mode

echo "🔒 SecureNet Production Startup"
echo "==============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "requirements.txt" ] || [ ! -f "README.md" ]; then
    print_error "Please run this script from the SecureNet root directory"
    exit 1
fi

# 1. Verify Backend Production Configuration
echo "🔧 Checking Backend Configuration..."

# Check .env file exists
if [ ! -f ".env" ]; then
    print_error ".env file not found. Creating production configuration..."
    cp docs/setup/production_config.txt .env
    print_warning "Please review and update .env file with your production settings"
fi

# Verify DEV_MODE is disabled in .env
if grep -q "DEV_MODE=false" .env; then
    print_status "Backend DEV_MODE is disabled"
else
    print_warning "Setting DEV_MODE=false in .env"
    sed -i.bak 's/DEV_MODE=true/DEV_MODE=false/' .env 2>/dev/null || echo "DEV_MODE=false" >> .env
fi

# 2. Verify Frontend Production Configuration
echo ""
echo "🎨 Checking Frontend Configuration..."

# Check frontend .env file exists
if [ ! -f "frontend/.env" ]; then
    print_warning "Creating frontend .env file..."
    cat > frontend/.env << EOF
# SecureNet Frontend Environment Configuration

# Production Mode - Disable mock data
VITE_MOCK_DATA=false

# API Configuration
VITE_API_BASE_URL=http://localhost:8000

# Environment
VITE_ENVIRONMENT=production
EOF
    print_status "Frontend .env file created"
else
    print_status "Frontend .env file exists"
fi

# Verify VITE_MOCK_DATA is disabled
if grep -q "VITE_MOCK_DATA=false" frontend/.env; then
    print_status "Frontend mock data is disabled"
else
    print_warning "Setting VITE_MOCK_DATA=false in frontend/.env"
    echo "VITE_MOCK_DATA=false" >> frontend/.env
fi

# 3. Check Dependencies
echo ""
echo "📦 Checking Dependencies..."

# Check Python virtual environment
if [ -z "$VIRTUAL_ENV" ]; then
    print_warning "No virtual environment detected. Consider activating: source venv/bin/activate"
else
    print_status "Virtual environment active: $(basename $VIRTUAL_ENV)"
fi

# Check if backend dependencies are installed
if python -c "import fastapi, uvicorn" 2>/dev/null; then
    print_status "Backend dependencies available"
else
    print_error "Backend dependencies missing. Run: pip install -r requirements.txt"
    exit 1
fi

# Check if frontend dependencies are installed
if [ -d "frontend/node_modules" ]; then
    print_status "Frontend dependencies available"
else
    print_warning "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# 4. Database Check
echo ""
echo "🗄️ Checking Database..."

# Check if using PostgreSQL or SQLite
if grep -q "postgresql://" .env; then
    print_info "PostgreSQL configuration detected"
    
    # Check if PostgreSQL is running
    if command -v pg_isready >/dev/null 2>&1; then
        if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
            print_status "PostgreSQL is running"
        else
            print_error "PostgreSQL is not running. Please start PostgreSQL:"
            echo "  macOS: brew services start postgresql"
            echo "  Linux: sudo systemctl start postgresql"
            exit 1
        fi
    else
        print_warning "pg_isready not found. Assuming PostgreSQL is running."
    fi
    
    # Check if database exists
    if psql -h localhost -U securenet -d securenet -c '\q' 2>/dev/null; then
        print_status "PostgreSQL database 'securenet' exists"
    else
        print_warning "PostgreSQL database 'securenet' not found."
        print_info "Run migration script: python scripts/migrate_to_postgresql.py"
    fi
else
    print_info "SQLite configuration detected"
    if [ -f "data/securenet.db" ]; then
        print_status "SQLite database exists"
    else
        print_warning "SQLite database not found. It will be created on first startup."
    fi
fi

# 5. Security Checks
echo ""
echo "🔐 Security Verification..."

# Check for default JWT secret
if grep -q "your-super-secret-jwt-key-change-in-production" .env; then
    print_error "Default JWT secret detected! Please generate secure keys:"
    echo "  JWT_SECRET=\$(openssl rand -hex 32)"
    echo "  ENCRYPTION_KEY=\$(openssl rand -hex 32)"
    echo "  MASTER_KEY_MATERIAL=\$(openssl rand -hex 64)"
fi

# Check SECRET_KEY
if grep -q "SECRET_KEY=" .env; then
    print_status "SECRET_KEY configured"
else
    print_warning "Generating SECRET_KEY..."
    echo "SECRET_KEY=$(openssl rand -hex 32)" >> .env
fi

# 6. Start Services
echo ""
echo "🚀 Starting SecureNet in Production Mode..."
print_info "Enterprise boot logs suppressed for cleaner startup"

# Function to start backend
start_backend() {
    print_info "Starting backend server..."
    # Ensure all environment variables are loaded
    export $(grep -v '^#' .env | xargs)
    # Disable enterprise boot logs for cleaner startup
    export DISABLE_ENTERPRISE_BOOT_LOGS=true
    python scripts/start_backend.py --prod &
    BACKEND_PID=$!
    echo $BACKEND_PID > .backend.pid
    
    # Wait for backend to start (backend needs ~10-12 seconds to initialize)
    print_info "Waiting for backend to initialize..."
    sleep 12
    
    # Check if backend is running with retry mechanism
    for i in {1..5}; do
        if curl -s http://localhost:8000/api/health > /dev/null; then
            print_status "Backend server started successfully"
            print_info "Backend API: http://localhost:8000"
            print_info "API Documentation: http://localhost:8000/docs"
            return 0
        else
            if [ $i -lt 5 ]; then
                print_info "Backend not ready yet, retrying in 3 seconds... (attempt $i/5)"
                sleep 3
            fi
        fi
    done
    
    print_error "Backend failed to start after 5 attempts"
    return 1
}

# Function to start frontend
start_frontend() {
    print_info "Starting frontend server..."
    cd frontend
    npm run start:prod &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../.frontend.pid
    cd ..
    
    # Wait for frontend to start
    sleep 5
    
    print_status "Frontend server started"
    print_info "Frontend: http://localhost:5173"
}

# Start backend
if start_backend; then
    echo ""
    # Start frontend
    start_frontend
    
    echo ""
    echo "🎉 SecureNet Production Environment Ready!"
    echo "========================================"
    echo ""
    print_info "Backend:  http://localhost:8000"
    print_info "Frontend: http://localhost:5173"
    print_info "API Docs: http://localhost:8000/docs"
    echo ""
    print_info "🔐 Enterprise Role-Based Access Control (RBAC)"
    echo ""
    echo "  🏢 Platform Owner (CISO):           ceo / superadmin123"
    echo "     • Strategic oversight, compliance management, global tenant administration"
    echo ""
    echo "  🛡️ Security Admin (SOC Manager):    admin / platform123"
    echo "     • SOC management, user provisioning, security policy enforcement"
    echo ""
    echo "  🔍 SOC Analyst (Security Analyst):  user / enduser123"
    echo "     • Threat monitoring, incident response, security event analysis"
    echo ""
    print_warning "Remember to change default credentials in production!"
    echo ""
    print_info "To stop services: ./stop_production.sh"
    echo ""
    print_info "Press Ctrl+C to stop all services"
    
    # Wait for interrupt
    trap 'echo ""; print_info "Stopping services..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; rm -f .backend.pid .frontend.pid; exit 0' INT
    wait
else
    print_error "Failed to start backend. Check logs for details."
    exit 1
fi 