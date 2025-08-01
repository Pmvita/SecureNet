#!/usr/bin/env python3
"""
Test script to verify API keys functionality
"""

import asyncio
import aiosqlite
import os
from datetime import datetime

async def test_database():
    """Test database connectivity and API keys table"""
    db_path = "data/securenet.db"
    
    print(f"Testing database at: {db_path}")
    print(f"Database exists: {os.path.exists(db_path)}")
    
    if not os.path.exists(db_path):
        print("❌ Database file does not exist!")
        return
    
    try:
        async with aiosqlite.connect(db_path) as conn:
            # Check if user_api_keys table exists
            cursor = await conn.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='user_api_keys'
            """)
            table_exists = await cursor.fetchone()
            
            if table_exists:
                print("✅ user_api_keys table exists")
                
                # Check table structure
                cursor = await conn.execute("PRAGMA table_info(user_api_keys)")
                columns = await cursor.fetchall()
                print(f"Table columns: {[col[1] for col in columns]}")
                
                # Check if there are any API keys
                cursor = await conn.execute("SELECT COUNT(*) FROM user_api_keys")
                count = await cursor.fetchone()
                print(f"Number of API keys: {count[0]}")
                
            else:
                print("❌ user_api_keys table does not exist!")
                
            # Check if user_sessions table exists
            cursor = await conn.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='user_sessions'
            """)
            sessions_table_exists = await cursor.fetchone()
            
            if sessions_table_exists:
                print("✅ user_sessions table exists")
            else:
                print("❌ user_sessions table does not exist!")
                
            # Check if users table exists
            cursor = await conn.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='users'
            """)
            users_table_exists = await cursor.fetchone()
            
            if users_table_exists:
                print("✅ users table exists")
                
                # Check if there are any users
                cursor = await conn.execute("SELECT COUNT(*) FROM users")
                user_count = await cursor.fetchone()
                print(f"Number of users: {user_count[0]}")
                
                if user_count[0] > 0:
                    # Get first user
                    cursor = await conn.execute("SELECT id, username FROM users LIMIT 1")
                    user = await cursor.fetchone()
                    print(f"First user: ID={user[0]}, Username={user[1]}")
                    
                    # Test API keys for this user
                    cursor = await conn.execute("""
                        SELECT id, name, key, created_at, last_used
                        FROM user_api_keys
                        WHERE user_id = ? AND is_active = 1
                        ORDER BY created_at DESC
                    """, (user[0],))
                    
                    api_keys = await cursor.fetchall()
                    print(f"API keys for user {user[1]}: {len(api_keys)}")
                    
                    for key in api_keys:
                        print(f"  - ID: {key[0]}, Name: {key[1]}, Created: {key[3]}")
                
            else:
                print("❌ users table does not exist!")
                
    except Exception as e:
        print(f"❌ Database error: {e}")

async def test_api_endpoint():
    """Test the API endpoint directly"""
    import aiohttp
    
    print("\nTesting API endpoint...")
    
    try:
        async with aiohttp.ClientSession() as session:
            # Test health endpoint first
            async with session.get("http://127.0.0.1:8000/api/health") as response:
                if response.status == 200:
                    print("✅ Health endpoint is working")
                    health_data = await response.json()
                    print(f"Health response: {health_data}")
                else:
                    print(f"❌ Health endpoint failed: {response.status}")
                    return
            
            # Test API keys endpoint with invalid token (should give auth error, not 404)
            async with session.get("http://127.0.0.1:8000/api/user/api-keys", 
                                 headers={"Authorization": "Bearer invalid-token"}) as response:
                print(f"API keys endpoint response: {response.status}")
                response_text = await response.text()
                print(f"Response: {response_text}")
                
                if response.status == 401:
                    print("✅ API keys endpoint exists (returning auth error as expected)")
                elif response.status == 404:
                    print("❌ API keys endpoint not found (404)")
                else:
                    print(f"⚠️ Unexpected response: {response.status}")
                    
    except Exception as e:
        print(f"❌ API test error: {e}")

async def main():
    """Main test function"""
    print("🔍 Testing API Keys Functionality")
    print("=" * 50)
    
    await test_database()
    await test_api_endpoint()
    
    print("\n" + "=" * 50)
    print("Test completed!")

if __name__ == "__main__":
    asyncio.run(main()) 