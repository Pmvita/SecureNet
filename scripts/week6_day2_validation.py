#!/usr/bin/env python3
"""
Week 6 Day 2 Validation: Advanced Testing Implementation
Validates unit tests, integration tests, security tests, and test coverage
"""

import sqlite3
import json
import os
from datetime import datetime
from typing import Dict, List, Any

DATABASE_PATH = "data/securenet.db"

class Week6Day2Validator:
    """Validator for Week 6 Day 2 Advanced Testing Implementation"""
    
    def __init__(self):
        self.db_path = DATABASE_PATH
        self.validation_results = {}
        
    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def validate_unit_tests(self):
        """Validate unit test results"""
        print("🧪 Validating unit tests...")
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Check test_results table
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='test_results'")
            table_exists = cursor.fetchone() is not None
            
            if not table_exists:
                return {"status": "failed", "score": 0, "message": "Test results table not found"}
            
            # Count unit tests
            cursor.execute("SELECT COUNT(*) as count FROM test_results WHERE test_type = 'unit'")
            unit_test_count = cursor.fetchone()['count']
            
            # Count passed unit tests
            cursor.execute("SELECT COUNT(*) as count FROM test_results WHERE test_type = 'unit' AND status = 'passed'")
            passed_count = cursor.fetchone()['count']
            
            # Calculate success rate
            success_rate = (passed_count / unit_test_count * 100) if unit_test_count > 0 else 0
            
            # Check test suites
            cursor.execute("SELECT DISTINCT test_suite FROM test_results WHERE test_type = 'unit'")
            test_suites = [row['test_suite'] for row in cursor.fetchall()]
            
            # Check average coverage
            cursor.execute("SELECT AVG(coverage_percentage) as avg_coverage FROM test_results WHERE test_type = 'unit'")
            avg_coverage = cursor.fetchone()['avg_coverage'] or 0
            
            score = 0
            if unit_test_count >= 8:
                score += 3
            if success_rate >= 90:
                score += 4
            if len(test_suites) >= 4:
                score += 2
            if avg_coverage >= 85:
                score += 1
            
            return {
                "status": "passed" if score >= 8 else "partial",
                "score": score,
                "max_score": 10,
                "unit_test_count": unit_test_count,
                "passed_count": passed_count,
                "success_rate": round(success_rate, 1),
                "test_suites": test_suites,
                "avg_coverage": round(avg_coverage, 1)
            }
            
        except Exception as e:
            return {"status": "failed", "score": 0, "error": str(e)}
        finally:
            conn.close()
    
    def validate_integration_tests(self):
        """Validate integration test results"""
        print("🔗 Validating integration tests...")
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Check integration_test_endpoints table
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='integration_test_endpoints'")
            table_exists = cursor.fetchone() is not None
            
            if not table_exists:
                return {"status": "failed", "score": 0, "message": "Integration test endpoints table not found"}
            
            # Count integration tests
            cursor.execute("SELECT COUNT(*) as count FROM integration_test_endpoints")
            endpoint_count = cursor.fetchone()['count']
            
            # Count passed tests
            cursor.execute("SELECT COUNT(*) as count FROM integration_test_endpoints WHERE test_status = 'passed'")
            passed_count = cursor.fetchone()['count']
            
            # Calculate success rate
            success_rate = (passed_count / endpoint_count * 100) if endpoint_count > 0 else 0
            
            # Check HTTP methods coverage
            cursor.execute("SELECT DISTINCT http_method FROM integration_test_endpoints")
            http_methods = [row['http_method'] for row in cursor.fetchall()]
            
            # Check average response time
            cursor.execute("SELECT AVG(response_time_ms) as avg_response_time FROM integration_test_endpoints")
            avg_response_time = cursor.fetchone()['avg_response_time'] or 0
            
            score = 0
            if endpoint_count >= 5:
                score += 3
            if success_rate >= 90:
                score += 4
            if len(http_methods) >= 2:
                score += 2
            if avg_response_time < 200:
                score += 1
            
            return {
                "status": "passed" if score >= 8 else "partial",
                "score": score,
                "max_score": 10,
                "endpoint_count": endpoint_count,
                "passed_count": passed_count,
                "success_rate": round(success_rate, 1),
                "http_methods": http_methods,
                "avg_response_time": round(avg_response_time, 1)
            }
            
        except Exception as e:
            return {"status": "failed", "score": 0, "error": str(e)}
        finally:
            conn.close()
    
    def validate_security_tests(self):
        """Validate security test results"""
        print("🔒 Validating security tests...")
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Check security_test_results table
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='security_test_results'")
            table_exists = cursor.fetchone() is not None
            
            if not table_exists:
                return {"status": "failed", "score": 0, "message": "Security test results table not found"}
            
            # Count security tests
            cursor.execute("SELECT COUNT(*) as count FROM security_test_results")
            security_test_count = cursor.fetchone()['count']
            
            # Count passed tests
            cursor.execute("SELECT COUNT(*) as count FROM security_test_results WHERE status = 'passed'")
            passed_count = cursor.fetchone()['count']
            
            # Calculate security score
            security_score = (passed_count / security_test_count * 100) if security_test_count > 0 else 0
            
            # Check vulnerability types
            cursor.execute("SELECT DISTINCT vulnerability_type FROM security_test_results")
            vulnerability_types = [row['vulnerability_type'] for row in cursor.fetchall()]
            
            # Check severity levels
            cursor.execute("SELECT DISTINCT severity FROM security_test_results")
            severity_levels = [row['severity'] for row in cursor.fetchall()]
            
            # Check critical vulnerabilities
            cursor.execute("SELECT COUNT(*) as count FROM security_test_results WHERE severity = 'critical' AND status != 'passed'")
            critical_issues = cursor.fetchone()['count']
            
            score = 0
            if security_test_count >= 4:
                score += 2
            if security_score >= 90:
                score += 4
            if len(vulnerability_types) >= 3:
                score += 2
            if critical_issues == 0:
                score += 2
            
            return {
                "status": "passed" if score >= 8 else "partial",
                "score": score,
                "max_score": 10,
                "security_test_count": security_test_count,
                "passed_count": passed_count,
                "security_score": round(security_score, 1),
                "vulnerability_types": vulnerability_types,
                "severity_levels": severity_levels,
                "critical_issues": critical_issues
            }
            
        except Exception as e:
            return {"status": "failed", "score": 0, "error": str(e)}
        finally:
            conn.close()
    
    def validate_test_coverage(self):
        """Validate test coverage metrics"""
        print("📊 Validating test coverage...")
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Check test_coverage table
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='test_coverage'")
            table_exists = cursor.fetchone() is not None
            
            if not table_exists:
                return {"status": "failed", "score": 0, "message": "Test coverage table not found"}
            
            # Count modules
            cursor.execute("SELECT COUNT(*) as count FROM test_coverage")
            module_count = cursor.fetchone()['count']
            
            # Calculate overall coverage
            cursor.execute("SELECT SUM(lines_covered) as covered, SUM(lines_total) as total FROM test_coverage")
            coverage_data = cursor.fetchone()
            overall_coverage = (coverage_data['covered'] / coverage_data['total'] * 100) if coverage_data['total'] > 0 else 0
            
            # Check modules with good coverage (>85%)
            cursor.execute("SELECT COUNT(*) as count FROM test_coverage WHERE coverage_percentage >= 85")
            good_coverage_modules = cursor.fetchone()['count']
            
            # Get module names
            cursor.execute("SELECT module_name FROM test_coverage")
            modules = [row['module_name'] for row in cursor.fetchall()]
            
            score = 0
            if module_count >= 4:
                score += 2
            if overall_coverage >= 85:
                score += 4
            if good_coverage_modules >= 3:
                score += 3
            if overall_coverage >= 90:
                score += 1
            
            return {
                "status": "passed" if score >= 8 else "partial",
                "score": score,
                "max_score": 10,
                "module_count": module_count,
                "overall_coverage": round(overall_coverage, 1),
                "good_coverage_modules": good_coverage_modules,
                "modules": modules
            }
            
        except Exception as e:
            return {"status": "failed", "score": 0, "error": str(e)}
        finally:
            conn.close()
    
    def validate_database_schema(self):
        """Validate all required testing tables exist"""
        print("🗄️ Validating testing database schema...")
        
        required_tables = [
            'test_results',
            'performance_metrics',
            'security_test_results',
            'integration_test_endpoints',
            'test_coverage'
        ]
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            existing_tables = []
            for table in required_tables:
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
                if cursor.fetchone():
                    existing_tables.append(table)
            
            score = len(existing_tables) * 2
            
            return {
                "status": "passed" if len(existing_tables) == len(required_tables) else "partial",
                "score": score,
                "max_score": len(required_tables) * 2,
                "existing_tables": existing_tables,
                "missing_tables": [t for t in required_tables if t not in existing_tables]
            }
            
        except Exception as e:
            return {"status": "failed", "score": 0, "error": str(e)}
        finally:
            conn.close()
    
    def run_validation(self):
        """Run complete validation for Week 6 Day 2"""
        print("🧪 Running Week 6 Day 2 Validation: Advanced Testing Implementation")
        print("=" * 80)
        
        # Run all validations
        self.validation_results = {
            "database_schema": self.validate_database_schema(),
            "unit_tests": self.validate_unit_tests(),
            "integration_tests": self.validate_integration_tests(),
            "security_tests": self.validate_security_tests(),
            "test_coverage": self.validate_test_coverage()
        }
        
        # Calculate total score
        total_score = sum(result.get("score", 0) for result in self.validation_results.values())
        max_total_score = sum(result.get("max_score", 10) for result in self.validation_results.values())
        success_rate = (total_score / max_total_score) * 100 if max_total_score > 0 else 0
        
        # Determine overall status
        if success_rate >= 90:
            overall_status = "EXCELLENT"
        elif success_rate >= 80:
            overall_status = "GOOD"
        elif success_rate >= 70:
            overall_status = "SATISFACTORY"
        else:
            overall_status = "NEEDS_IMPROVEMENT"
        
        # Print results
        print(f"\n📊 VALIDATION RESULTS:")
        print(f"Database Schema: {self.validation_results['database_schema']['score']}/{self.validation_results['database_schema']['max_score']} points")
        print(f"Unit Tests: {self.validation_results['unit_tests']['score']}/{self.validation_results['unit_tests']['max_score']} points")
        print(f"Integration Tests: {self.validation_results['integration_tests']['score']}/{self.validation_results['integration_tests']['max_score']} points")
        print(f"Security Tests: {self.validation_results['security_tests']['score']}/{self.validation_results['security_tests']['max_score']} points")
        print(f"Test Coverage: {self.validation_results['test_coverage']['score']}/{self.validation_results['test_coverage']['max_score']} points")
        
        print(f"\n🎯 TOTAL SCORE: {total_score}/{max_total_score} ({success_rate:.1f}%)")
        print(f"📈 OVERALL STATUS: {overall_status}")
        
        # Save results
        results_data = {
            "timestamp": datetime.now().isoformat(),
            "week": 6,
            "day": 2,
            "focus": "Advanced Testing Implementation",
            "total_score": total_score,
            "max_score": max_total_score,
            "success_rate": success_rate,
            "overall_status": overall_status,
            "validation_results": self.validation_results
        }
        
        os.makedirs("reports/validation", exist_ok=True)
        with open(f"reports/validation/week6_day2_validation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json", "w") as f:
            json.dump(results_data, f, indent=2, default=str)
        
        return results_data

def main():
    validator = Week6Day2Validator()
    return validator.run_validation()

if __name__ == "__main__":
    main() 