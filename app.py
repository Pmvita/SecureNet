#!/usr/bin/env python3
"""
SecureNet Enterprise Application Entry Point
Production-ready FastAPI application with enterprise features
"""

import os
import sys
from pathlib import Path

# Add src to Python path for imports
sys.path.insert(0, str(Path(__file__).parent / "src"))

# Import the enterprise app
from apps.enterprise_app import app

if __name__ == "__main__":
    import uvicorn
    
    # Get configuration from environment
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    workers = int(os.getenv("WORKERS", "4"))
    log_level = os.getenv("LOG_LEVEL", "info")
    
    # Start the application
    uvicorn.run(
        "app:app",
        host=host,
        port=port,
        workers=workers,
        log_level=log_level,
        access_log=True,
        reload=False  # Disable reload in production
    ) 