#!/bin/bash

# SecureNet Backend Startup Script
# Simple wrapper for starting the SecureNet backend server

echo "🔒 SecureNet Backend Startup"
echo "=============================="

# Check if virtual environment is activated
if [[ "$VIRTUAL_ENV" == "" ]]; then
    echo "⚠️  Warning: No virtual environment detected"
    echo "   Consider activating your virtual environment first:"
    echo "   source venv/bin/activate"
    echo ""
fi

# Check if Redis is running (optional but recommended)
if ! pgrep -x "redis-server" > /dev/null; then
    echo "ℹ️  Redis server not detected. Starting Redis..."
    if command -v redis-server &> /dev/null; then
        redis-server --daemonize yes
        echo "✓ Redis server started"
    else
        echo "⚠️  Redis not found. Some features may not work optimally."
    fi
fi

# Start the backend server
echo "🚀 Starting SecureNet backend server..."
echo ""

# Use the Python startup script
python start_backend.py "$@" 