#!/usr/bin/env python3
"""
SecureNet Backend Startup Script

This script provides an easy way to start the SecureNet backend server
with proper environment configuration and logging.

Usage:
    python start_backend.py [--dev] [--prod] [--host HOST] [--port PORT]
    python start_backend.py --check                    # Validate environment only
    python start_backend.py --seed-first               # Seed users before starting
    python start_backend.py --start                    # Start server directly

Options:
    --dev       Run in development mode (default)
    --prod      Run in production mode
    --host      Host to bind to (default: 127.0.0.1)
    --port      Port to bind to (default: 8000)
    --check     Only validate environment and dependencies
    --seed-first Seed users before starting server
    --start     Start server directly without validation
"""

import os
import sys
import argparse
import logging
import asyncio
import subprocess
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

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
        import asyncpg  # PostgreSQL driver
        logger.info("✓ All required dependencies are available")
        return True
    except ImportError as e:
        logger.error(f"✗ Missing required dependency: {e}")
        logger.error("Please install requirements: pip install -r requirements.txt")
        return False

async def check_redis_availability():
    """Check Redis connectivity and log status."""
    logger = logging.getLogger(__name__)
    
    try:
        import redis
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        
        if redis_url.startswith('redis://'):
            r = redis.from_url(redis_url)
        else:
            r = redis.Redis(host='localhost', port=6379, db=0)
        
        r.ping()
        logger.info("✓ Redis connection successful")
        return True
    except Exception as e:
        logger.warning(f"⚠ Redis not available: {e}")
        logger.warning("Some features may be limited without Redis")
        return False

async def validate_database_connection():
    """Validate database connection before starting server."""
    logger = logging.getLogger(__name__)
    
    try:
        from database_factory import db
        await db.initialize()
        logger.info("✓ Database connection validated")
        return True
    except Exception as e:
        logger.error(f"✗ Database connection failed: {e}")
        logger.error("Please ensure PostgreSQL is running and configured correctly")
        return False

def validate_environment():
    """Validate critical environment variables."""
    logger = logging.getLogger(__name__)
    
    required_vars = ['DATABASE_URL', 'JWT_SECRET_KEY']
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        logger.error(f"✗ Missing required environment variables: {', '.join(missing_vars)}")
        logger.error("Please check your .env file")
        return False
    
    logger.info("✓ Environment variables validated")
    return True

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

def validate_app_imports():
    """Validate that the FastAPI app can be imported."""
    logger = logging.getLogger(__name__)
    
    try:
        from app import app
        logger.info(f"✓ FastAPI app imported successfully ({len(app.routes)} routes)")
        return True
    except Exception as e:
        logger.error(f"✗ Failed to import FastAPI app: {e}")
        return False

async def seed_users():
    """Seed users using the seeding script."""
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("🌱 Seeding users...")
        result = subprocess.run(
            [sys.executable, "scripts/ops/seed_users.py"],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            logger.info("✓ User seeding completed successfully")
            return True
        else:
            logger.error(f"✗ User seeding failed: {result.stderr}")
            return False
            
    except Exception as e:
        logger.error(f"✗ User seeding error: {e}")
        return False

async def run_validation_check():
    """Run comprehensive validation check."""
    logger = logging.getLogger(__name__)
    
    logger.info("🔍 Running comprehensive validation check...")
    logger.info("=" * 50)
    
    checks = [
        ("Environment Variables", validate_environment()),
        ("Dependencies", check_requirements()),
        ("Redis Connectivity", await check_redis_availability()),
        ("Database Connection", await validate_database_connection()),
        ("App Imports", validate_app_imports()),
    ]
    
    passed = 0
    total = len(checks)
    
    for check_name, result in checks:
        if result:
            passed += 1
            logger.info(f"✓ {check_name}: PASS")
        else:
            logger.error(f"✗ {check_name}: FAIL")
    
    logger.info("=" * 50)
    logger.info(f"Validation Results: {passed}/{total} checks passed")
    
    if passed == total:
        logger.info("🎉 All validation checks passed!")
        logger.info("✅ SecureNet is ready for startup")
        return True
    else:
        logger.error("❌ Some validation checks failed")
        logger.error("Please resolve issues before starting the server")
        return False

async def start_server(host="127.0.0.1", port=8000, dev_mode=True, skip_validation=False):
    """Start the SecureNet backend server."""
    logger = logging.getLogger(__name__)
    
    try:
        if not skip_validation:
            # Validate database connection
            if not await validate_database_connection():
                logger.error("Database validation failed - cannot start server")
                sys.exit(1)
            
            # Check Redis availability (non-blocking)
            await check_redis_availability()
            
            # Validate app imports
            if not validate_app_imports():
                logger.error("App import validation failed - cannot start server")
                sys.exit(1)
        
        import uvicorn
        
        logger.info(f"🚀 Starting SecureNet backend server...")
        logger.info(f"Mode: {'Development' if dev_mode else 'Production'}")
        logger.info(f"Host: {host}")
        logger.info(f"Port: {port}")
        logger.info(f"Dashboard: http://{host}:{port}")
        logger.info(f"API Health: http://{host}:{port}/api/health")
        logger.info(f"API Docs: http://{host}:{port}/docs")
        
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
        import traceback
        traceback.print_exc()
        sys.exit(1)

def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="SecureNet Backend Startup Script",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    # Mode options
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
    
    # Server options
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
    
    # Action options
    parser.add_argument(
        "--check",
        action="store_true",
        help="Only validate environment and dependencies"
    )
    parser.add_argument(
        "--seed-first",
        action="store_true",
        help="Seed users before starting server"
    )
    parser.add_argument(
        "--start",
        action="store_true",
        help="Start server directly without validation"
    )
    
    args = parser.parse_args()
    
    # Setup logging
    logger = setup_logging()
    
    # Determine mode
    dev_mode = not args.prod
    
    logger.info("🔒 SecureNet Backend Startup")
    logger.info("=" * 50)
    
    # Validate environment
    if not validate_environment():
        sys.exit(1)
    
    # Check requirements
    if not check_requirements():
        sys.exit(1)
    
    # Setup environment
    setup_environment(dev_mode)
    
    # Handle different actions
    if args.check:
        # Only run validation check
        async def run_check():
            success = await run_validation_check()
            sys.exit(0 if success else 1)
        
        asyncio.run(run_check())
        
    elif args.seed_first:
        # Seed users first, then start server
        async def seed_and_start():
            if await seed_users():
                await start_server(args.host, args.port, dev_mode)
            else:
                logger.error("User seeding failed - cannot start server")
                sys.exit(1)
        
        asyncio.run(seed_and_start())
        
    elif args.start:
        # Start server directly without validation
        asyncio.run(start_server(args.host, args.port, dev_mode, skip_validation=True))
        
    else:
        # Default: start server with validation
        asyncio.run(start_server(args.host, args.port, dev_mode))

if __name__ == "__main__":
    main() 