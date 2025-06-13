#!/usr/bin/env python3
"""
SecureNet Backend Startup Script

This script provides an easy way to start the SecureNet backend server
with proper environment configuration and logging.

Usage:
    python start_backend.py [--dev] [--prod] [--host HOST] [--port PORT]

Options:
    --dev       Run in development mode (default)
    --prod      Run in production mode
    --host      Host to bind to (default: 127.0.0.1)
    --port      Port to bind to (default: 8000)
"""

import os
import sys
import argparse
import logging
from pathlib import Path

def setup_logging():
    """Configure logging for the startup script."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    return logging.getLogger(__name__)

def check_requirements():
    """Check if all required dependencies are available."""
    logger = logging.getLogger(__name__)
    
    try:
        import uvicorn
        import fastapi
        import sqlite3
        logger.info("✓ All required dependencies are available")
        return True
    except ImportError as e:
        logger.error(f"✗ Missing required dependency: {e}")
        logger.error("Please install requirements: pip install -r requirements.txt")
        return False

def setup_environment(dev_mode=True):
    """Setup environment variables."""
    logger = logging.getLogger(__name__)
    
    # Set development mode
    os.environ["DEV_MODE"] = "true" if dev_mode else "false"
    
    # Ensure data directory exists
    data_dir = Path("data")
    data_dir.mkdir(exist_ok=True)
    
    # Set default API key for development
    if dev_mode and not os.getenv("API_KEY"):
        os.environ["API_KEY"] = "sk-dev-api-key-securenet-default"
        logger.info("Using default development API key")
    
    logger.info(f"Environment configured for {'development' if dev_mode else 'production'} mode")

def start_server(host="127.0.0.1", port=8000, dev_mode=True):
    """Start the SecureNet backend server."""
    logger = logging.getLogger(__name__)
    
    try:
        import uvicorn
        
        logger.info(f"Starting SecureNet backend server...")
        logger.info(f"Mode: {'Development' if dev_mode else 'Production'}")
        logger.info(f"Host: {host}")
        logger.info(f"Port: {port}")
        logger.info(f"Dashboard: http://{host}:{port}")
        logger.info(f"API Health: http://{host}:{port}/api/health")
        
        # Start the server
        uvicorn.run(
            "app:app",
            host=host,
            port=port,
            reload=dev_mode,
            log_level="info" if dev_mode else "warning",
            access_log=dev_mode
        )
        
    except KeyboardInterrupt:
        logger.info("Server shutdown requested by user")
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        sys.exit(1)

def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="SecureNet Backend Startup Script",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument(
        "--dev", 
        action="store_true", 
        default=True,
        help="Run in development mode (default)"
    )
    parser.add_argument(
        "--prod", 
        action="store_true",
        help="Run in production mode"
    )
    parser.add_argument(
        "--host", 
        default="127.0.0.1",
        help="Host to bind to (default: 127.0.0.1)"
    )
    parser.add_argument(
        "--port", 
        type=int, 
        default=8000,
        help="Port to bind to (default: 8000)"
    )
    
    args = parser.parse_args()
    
    # Setup logging
    logger = setup_logging()
    
    # Determine mode
    dev_mode = not args.prod
    
    logger.info("🔒 SecureNet Backend Startup")
    logger.info("=" * 50)
    
    # Check requirements
    if not check_requirements():
        sys.exit(1)
    
    # Setup environment
    setup_environment(dev_mode)
    
    # Start server
    start_server(args.host, args.port, dev_mode)

if __name__ == "__main__":
    main() 