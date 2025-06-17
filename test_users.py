#!/usr/bin/env python3
import asyncio
from database_factory import db

async def test_users():
    try:
        await db.initialize()
        print("Testing default users...")
        
        # Test default users
        users = ['ceo', 'admin', 'user']
        for username in users:
            if hasattr(db, 'get_user_by_username'):
                user = await db.get_user_by_username(username)
                if user:
                    print(f'✅ User {username} exists with role: {user.get("role", "unknown")}')
                else:
                    print(f'❌ User {username} not found')
            else:
                print('❌ get_user_by_username method not available')
                break
                
        return True
    except Exception as e:
        print(f'❌ User test failed: {e}')
        return False

if __name__ == "__main__":
    asyncio.run(test_users()) 