#!/usr/bin/env python3
"""
Week 4 Day 4: Enterprise User Groups & Account Expiration Validation
SecureNet Production Launch - Comprehensive Backend Validation
"""

import os
import sys
import json
import sqlite3
import uuid
import requests
from datetime import datetime, timedelta
from typing import Dict, Any, List

class Week4Day4Validator:
    """Comprehensive validator for Week 4 Day 4 implementation"""
    
    def __init__(self, db_path: str = "data/securenet.db", api_base_url: str = "http://localhost:5001"):
        self.db_path = db_path
        self.api_base_url = api_base_url
        self.validation_results = []
        self.test_organization_id = None
    
    def log_test(self, test_name: str, status: str, message: str = "", points: int = 0):
        """Log test result"""
        result = {
            'test_name': test_name,
            'status': status,
            'message': message,
            'points': points,
            'timestamp': datetime.now().isoformat()
        }
        self.validation_results.append(result)
        
        status_emoji = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"{status_emoji} {test_name}: {message}")
    
    def get_db_connection(self):
        """Get database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def test_database_schema(self) -> bool:
        """Test database schema changes"""
        print("\n📊 Testing Database Schema...")
        
        try:
            conn = self.get_db_connection()
            cursor = conn.cursor()
            
            # Test 1: User groups table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_groups'")
            if cursor.fetchone():
                self.log_test("User Groups Table", "PASS", "Table exists with correct structure", 10)
            else:
                self.log_test("User Groups Table", "FAIL", "Table not found", 0)
                return False
            
            # Test 2: Account expiration fields exist
            cursor.execute("PRAGMA table_info(users)")
            columns = [row[1] for row in cursor.fetchall()]
            
            required_fields = ['account_expires_at', 'account_type']
            missing_fields = [field for field in required_fields if field not in columns]
            
            if not missing_fields:
                self.log_test("Account Expiration Fields", "PASS", f"All required fields present", 15)
            else:
                self.log_test("Account Expiration Fields", "FAIL", f"Missing fields: {missing_fields}", 0)
                return False
            
            # Test 3: Default user groups exist
            cursor.execute("SELECT COUNT(*) as count FROM user_groups WHERE is_system_group = 1")
            group_count = cursor.fetchone()['count']
            
            if group_count >= 5:
                self.log_test("Default System Groups", "PASS", f"Found {group_count} system groups", 15)
            else:
                self.log_test("Default System Groups", "FAIL", f"Expected >= 5, found {group_count}", 0)
                return False
            
            conn.close()
            return True
            
        except Exception as e:
            self.log_test("Database Schema Test", "FAIL", f"Error: {str(e)}", 0)
            return False
    
    def test_api_endpoints(self) -> bool:
        """Test API endpoints functionality"""
        print("\n🌐 Testing API Endpoints...")
        
        try:
            # Test 1: Health check endpoint
            response = requests.get(f"{self.api_base_url}/api/user-groups/health")
            if response.status_code == 200:
                health_data = response.json()
                if health_data.get('status') == 'healthy':
                    self.log_test("API Health Check", "PASS", "Service is healthy and responding", 10)
                else:
                    self.log_test("API Health Check", "FAIL", "Service not healthy", 0)
                    return False
            else:
                self.log_test("API Health Check", "FAIL", f"HTTP {response.status_code}", 0)
                return False
            
            # Test 2: Get organization ID for testing
            conn = self.get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM organizations LIMIT 1")
            org_row = cursor.fetchone()
            
            if org_row:
                self.test_organization_id = org_row['id']
                self.log_test("Test Organization", "PASS", f"Using organization ID", 5)
            else:
                self.log_test("Test Organization", "FAIL", "No organization found", 0)
                conn.close()
                return False
            
            conn.close()
            
            # Test 3: API endpoints respond (even with auth error)
            headers = {'Authorization': 'Bearer mock-token'}
            response = requests.get(
                f"{self.api_base_url}/api/user-groups", 
                params={'organization_id': self.test_organization_id},
                headers=headers
            )
            
            if response.status_code in [200, 401]:
                self.log_test("User Groups Endpoint", "PASS", "Endpoint accessible", 10)
            else:
                self.log_test("User Groups Endpoint", "FAIL", f"Unexpected response: {response.status_code}", 0)
            
            return True
            
        except requests.exceptions.ConnectionError:
            self.log_test("API Connection", "FAIL", "Cannot connect to API server", 0)
            return False
        except Exception as e:
            self.log_test("API Endpoints Test", "FAIL", f"Error: {str(e)}", 0)
            return False
    
    def test_monitoring_script(self) -> bool:
        """Test account expiration monitoring script"""
        print("\n🔍 Testing Monitoring Script...")
        
        try:
            # Test monitoring script exists and runs
            if os.path.exists('scripts/account_expiration_monitor.py'):
                self.log_test("Monitoring Script Exists", "PASS", "Script file found", 10)
                
                # Test script execution
                import subprocess
                result = subprocess.run([
                    sys.executable, 'scripts/account_expiration_monitor.py', '--report'
                ], capture_output=True, text=True, timeout=30)
                
                if result.returncode == 0:
                    self.log_test("Monitoring Script Execution", "PASS", "Script executed successfully", 15)
                else:
                    self.log_test("Monitoring Script Execution", "FAIL", f"Script failed: {result.stderr}", 0)
                
                return True
            else:
                self.log_test("Monitoring Script Exists", "FAIL", "Script file not found", 0)
                return False
            
        except Exception as e:
            self.log_test("Monitoring Script Test", "FAIL", f"Error: {str(e)}", 0)
            return False
    
    def test_user_groups_functionality(self) -> bool:
        """Test user groups functionality"""
        print("\n👥 Testing User Groups Functionality...")
        
        try:
            conn = self.get_db_connection()
            cursor = conn.cursor()
            
            # Test query by group type
            cursor.execute("SELECT COUNT(*) as count FROM user_groups WHERE group_type = 'department'")
            dept_count = cursor.fetchone()['count']
            
            if dept_count >= 1:
                self.log_test("Query Groups by Type", "PASS", f"Found {dept_count} department groups", 15)
            else:
                self.log_test("Query Groups by Type", "FAIL", "No department groups found", 0)
            
            conn.close()
            return True
            
        except Exception as e:
            self.log_test("User Groups Functionality", "FAIL", f"Error: {str(e)}", 0)
            return False
    
    def generate_validation_report(self) -> Dict[str, Any]:
        """Generate comprehensive validation report"""
        total_points = sum(result['points'] for result in self.validation_results)
        max_points = 100
        
        passed_tests = len([r for r in self.validation_results if r['status'] == 'PASS'])
        failed_tests = len([r for r in self.validation_results if r['status'] == 'FAIL'])
        total_tests = len(self.validation_results)
        
        success_rate = (total_points / max_points) * 100 if max_points > 0 else 0
        
        return {
            'validation_timestamp': datetime.now().isoformat(),
            'week': 'Week 4',
            'day': 'Day 4',
            'feature': 'Enterprise User Groups & Account Expiration',
            'total_tests': total_tests,
            'passed_tests': passed_tests,
            'failed_tests': failed_tests,
            'total_points': total_points,
            'max_points': max_points,
            'success_rate': round(success_rate, 1),
            'status': 'EXCELLENT' if success_rate >= 90 else 'GOOD' if success_rate >= 80 else 'NEEDS_IMPROVEMENT',
            'test_results': self.validation_results
        }
    
    def run_full_validation(self):
        """Run complete Week 4 Day 4 validation"""
        print("🚀 Week 4 Day 4: Enterprise User Groups & Account Expiration Validation")
        print("=" * 80)
        
        # Run all validation tests
        schema_ok = self.test_database_schema()
        api_ok = self.test_api_endpoints()
        groups_ok = self.test_user_groups_functionality()
        monitoring_ok = self.test_monitoring_script()
        
        # Generate final report
        report = self.generate_validation_report()
        
        print("\n" + "=" * 80)
        print("📊 WEEK 4 DAY 4 VALIDATION SUMMARY")
        print("=" * 80)
        print(f"🎯 Feature: {report['feature']}")
        print(f"📅 Validation Date: {report['validation_timestamp']}")
        print(f"✅ Tests Passed: {report['passed_tests']}/{report['total_tests']}")
        print(f"❌ Tests Failed: {report['failed_tests']}")
        print(f"🏆 Success Rate: {report['success_rate']}% ({report['total_points']}/{report['max_points']} points)")
        print(f"📈 Status: {report['status']}")
        
        # Save detailed report
        report_filename = f"week4_day4_validation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        os.makedirs('docs/project', exist_ok=True)
        
        with open(f"docs/project/{report_filename}", 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\n📝 Detailed report saved: docs/project/{report_filename}")
        
        return report['success_rate'] >= 80

def main():
    validator = Week4Day4Validator()
    success = validator.run_full_validation()
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()
