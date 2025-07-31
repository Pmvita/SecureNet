#!/usr/bin/env python3
"""
Simple SecureNet Startup Script - No Docker Required
"""

import uvicorn
import os
import sys
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

def main():
    print("🚀 Starting SecureNet...")
    print("📍 Backend: http://localhost:8000")
    print("📍 Frontend: http://localhost:5173")
    print("📍 API Docs: http://localhost:8000/docs")
    print("")
    
    # Try to start the basic app first
    try:
        # Check if basic app exists
        if os.path.exists("app.py"):
            print("✅ Starting SecureNet Basic...")
            uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
        elif os.path.exists("src/apps/app.py"):
            print("✅ Starting SecureNet from src/apps...")
            uvicorn.run("src.apps.app:app", host="127.0.0.1", port=8000, reload=True)
        else:
            print("❌ No app.py found. Please check your SecureNet installation.")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Failed to start: {e}")
        print("💡 Try running: python app.py")
        sys.exit(1)

if __name__ == "__main__":
    main() 