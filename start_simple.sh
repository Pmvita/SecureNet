#!/bin/bash

# SecureNet Simple Startup Script (No Docker Required)
# This script starts SecureNet without requiring Docker or complex setup

echo "🚀 SecureNet Simple Startup"
echo "==========================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# Check if we're in the right directory
if [ ! -f "requirements.txt" ] || [ ! -f "README.md" ]; then
    print_error "Please run this script from the SecureNet root directory"
    exit 1
fi

# Check if virtual environment is activated
if [ -z "$VIRTUAL_ENV" ]; then
    print_warning "No virtual environment detected"
    if [ -d "venv" ]; then
        print_status "Activating virtual environment..."
        source venv/bin/activate
    else
        print_warning "Virtual environment not found. Consider creating one:"
        echo "   python -m venv venv"
        echo "   source venv/bin/activate"
        echo ""
    fi
else
    print_status "Virtual environment active: $(basename $VIRTUAL_ENV)"
fi

# Check if Redis is running (optional but recommended)
if ! pgrep -x "redis-server" > /dev/null; then
    print_warning "Redis server not detected. Starting Redis..."
    if command -v redis-server &> /dev/null; then
        redis-server --daemonize yes
        print_status "Redis server started"
    else
        print_warning "Redis not found. Some features may not work optimally."
        echo "   Install Redis: brew install redis (macOS) or apt-get install redis-server (Ubuntu)"
    fi
fi

echo ""
print_status "Starting SecureNet backend server..."

# Try different startup methods
if [ -f "app.py" ]; then
    print_status "Found app.py - starting basic SecureNet..."
    python app.py
elif [ -f "src/apps/app.py" ]; then
    print_status "Found src/apps/app.py - starting SecureNet from src..."
    python src/apps/app.py
elif [ -f "simple_start.py" ]; then
    print_status "Using simple startup script..."
    python simple_start.py
else
    print_error "No startup file found. Available options:"
    echo "   1. python app.py"
    echo "   2. python src/apps/app.py"
    echo "   3. python simple_start.py"
    echo "   4. uvicorn app:app --reload --host 127.0.0.1 --port 8000"
    exit 1
fi 