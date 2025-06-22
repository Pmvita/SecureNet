#!/usr/bin/env python3
"""
Debug script to test Fernet key handling
"""

import os
from dotenv import load_dotenv
from cryptography.fernet import Fernet

# Load environment variables
load_dotenv()

print("🔍 Debugging Fernet Key Issue")
print("=" * 40)

# Get the encryption key from environment
encryption_key = os.getenv("ENCRYPTION_KEY")
print(f"Environment ENCRYPTION_KEY: {encryption_key}")
print(f"Key length: {len(encryption_key) if encryption_key else 'None'}")
print(f"Key type: {type(encryption_key)}")

if encryption_key:
    print(f"Key ends with '=': {encryption_key.endswith('=')}")
    print(f"Key length == 44: {len(encryption_key) == 44}")
    
    # Test direct Fernet creation
    try:
        cipher = Fernet(encryption_key)
        print("✅ Direct Fernet creation: SUCCESS")
    except Exception as e:
        print(f"❌ Direct Fernet creation: FAILED - {e}")
    
    # Test with encoding
    try:
        cipher = Fernet(encryption_key.encode())
        print("✅ Encoded Fernet creation: SUCCESS")
    except Exception as e:
        print(f"❌ Encoded Fernet creation: FAILED - {e}")

# Test generating a new key
print("\n🔑 Testing new key generation:")
new_key = Fernet.generate_key()
print(f"Generated key: {new_key}")
print(f"Generated key decoded: {new_key.decode()}")

try:
    cipher = Fernet(new_key)
    print("✅ Generated key works: SUCCESS")
except Exception as e:
    print(f"❌ Generated key: FAILED - {e}")

try:
    cipher = Fernet(new_key.decode())
    print("✅ Generated key (decoded) works: SUCCESS")
except Exception as e:
    print(f"❌ Generated key (decoded): FAILED - {e}") 