#!/bin/bash

# SecureNet Production Stop Script
# This script cleanly stops both backend and frontend services

echo "🛑 Stopping SecureNet Production Services..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Stop backend
if [ -f ".backend.pid" ]; then
    BACKEND_PID=$(cat .backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        print_info "Stopping backend server (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
        rm -f .backend.pid
        print_status "Backend server stopped"
    else
        print_info "Backend server not running"
        rm -f .backend.pid
    fi
else
    print_info "No backend PID file found"
fi

# Stop frontend
if [ -f ".frontend.pid" ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        print_info "Stopping frontend server (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
        rm -f .frontend.pid
        print_status "Frontend server stopped"
    else
        print_info "Frontend server not running"
        rm -f .frontend.pid
    fi
else
    print_info "No frontend PID file found"
fi

# Kill any remaining processes
print_info "Cleaning up any remaining processes..."
pkill -f "python.*app.py" 2>/dev/null
pkill -f "uvicorn" 2>/dev/null
pkill -f "vite" 2>/dev/null

print_status "All SecureNet services stopped" 