#!/usr/bin/env python3
"""
Week 4 Day 4: Account Expiration Monitoring Background Job
SecureNet Production Launch - Automated Account Expiration Management
"""

import os
import sys
import sqlite3
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AccountExpirationMonitor:
    """Monitor and manage account expirations"""
    
    def __init__(self, db_path: str = "data/securenet.db"):
        self.db_path = db_path
    
    def get_db_connection(self):
        """Get database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def get_users_expiring_soon(self, days_threshold: int = 30) -> List[Dict[str, Any]]:
        """Get users with accounts expiring within threshold days"""
        conn = self.get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    u.id,
                    u.username,
                    u.email,
                    u.first_name,
                    u.last_name,
                    u.account_expires_at,
                    u.account_type,
                    CAST(julianday(u.account_expires_at) - julianday('now') AS INTEGER) as days_until_expiry,
                    o.name as organization_name
                FROM users u
                LEFT JOIN organizations o ON u.organization_id = o.id
                WHERE u.account_expires_at IS NOT NULL
                  AND u.account_expires_at > datetime('now')
                  AND u.account_expires_at <= datetime('now', '+{} days')
                  AND u.is_active = 1
                ORDER BY u.account_expires_at ASC
            """.format(days_threshold))
            
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
            
        finally:
            conn.close()
    
    def generate_expiration_report(self) -> Dict[str, Any]:
        """Generate expiration summary report"""
        conn = self.get_db_connection()
        try:
            cursor = conn.cursor()
            
            # Users expiring in next 30 days
            cursor.execute("""
                SELECT COUNT(*) as count
                FROM users
                WHERE account_expires_at IS NOT NULL
                  AND account_expires_at > datetime('now')
                  AND account_expires_at <= datetime('now', '+30 days')
                  AND is_active = 1
            """)
            expiring_30_days = cursor.fetchone()['count']
            
            # Users expiring in next 7 days
            cursor.execute("""
                SELECT COUNT(*) as count
                FROM users
                WHERE account_expires_at IS NOT NULL
                  AND account_expires_at > datetime('now')
                  AND account_expires_at <= datetime('now', '+7 days')
                  AND is_active = 1
            """)
            expiring_7_days = cursor.fetchone()['count']
            
            # Expired users
            cursor.execute("""
                SELECT COUNT(*) as count
                FROM users
                WHERE account_expires_at IS NOT NULL
                  AND account_expires_at < datetime('now')
                  AND is_active = 1
            """)
            expired_users = cursor.fetchone()['count']
            
            return {
                'timestamp': datetime.now().isoformat(),
                'expiring_30_days': expiring_30_days,
                'expiring_7_days': expiring_7_days,
                'expired_users': expired_users,
                'total_monitored': expiring_30_days + expired_users
            }
            
        finally:
            conn.close()
    
    def process_expiration_notifications(self):
        """Main processing function for expiration notifications"""
        logger.info("Starting account expiration monitoring cycle")
        
        # Get users expiring in 30, 7, and 1 days
        for threshold in [30, 7, 1]:
            users_expiring = self.get_users_expiring_soon(threshold)
            
            for user in users_expiring:
                days_until_expiry = user.get('days_until_expiry', 0)
                logger.info(f"User {user['username']} expires in {days_until_expiry} days")
        
        logger.info("Completed account expiration monitoring cycle")

def main():
    """Main execution function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Account Expiration Monitor')
    parser.add_argument('--report', action='store_true', help='Generate expiration report')
    
    args = parser.parse_args()
    
    monitor = AccountExpirationMonitor()
    
    if args.report:
        # Generate and print report
        report = monitor.generate_expiration_report()
        print("📊 Account Expiration Report")
        print("=" * 40)
        print(f"Generated: {report['timestamp']}")
        print(f"Users expiring in 30 days: {report['expiring_30_days']}")
        print(f"Users expiring in 7 days: {report['expiring_7_days']}")
        print(f"Expired users: {report['expired_users']}")
        print(f"Total monitored: {report['total_monitored']}")
    else:
        monitor.process_expiration_notifications()

if __name__ == '__main__':
    main()
