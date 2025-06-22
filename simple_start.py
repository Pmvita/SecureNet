#!/usr/bin/env python3
"""
Simple SecureNet Enterprise Startup Script
"""

import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

if __name__ == "__main__":
    print("🚀 Starting SecureNet Enterprise...")
    
    # Start the server
    uvicorn.run(
        "src.apps.enterprise_app:app",
        host="127.0.0.1",
        port=8000,
        reload=False,
        log_level="info"
    ) 