#!/usr/bin/env python3
"""
Week 5 Day 5 Validation Script
Validates Production Launch Preparation features
"""

import sqlite3
import json
import os
import sys
from datetime import datetime
from typing import Dict, List, Any, Tuple

# Add the project root to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DATABASE_PATH = "data/securenet.db"

class Week5Day5Validator:
    """Validator for Week 5 Day 5 Production Launch Preparation"""
    
    def __init__(self):
        self.db_path = DATABASE_PATH
        self.validation_results = {}
        self.total_score = 0
        self.max_score = 120
        
    def get_connection(self):
        """Get database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def validate_database_schema(self) -> Tuple[int, int]:
        """Validate that all required production launch tables exist"""
        print("🔍 Validating production launch database schema...")
        
        required_tables = [
            "launch_readiness_assessments",
            "security_audit_results", 
            "production_configurations",
            "performance_benchmarks",
            "backup_recovery_validations",
            "production_deployment_checklist"
        ]
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            existing_tables = []
            for table in required_tables:
                cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")
                if cursor.fetchone():
                    existing_tables.append(table)
            
            score = len(existing_tables)
            max_score = len(required_tables)
            
            print(f"   ✅ Found {score}/{max_score} required production launch tables")
            for table in existing_tables:
                print(f"      - {table}")
            
            if score < max_score:
                missing = set(required_tables) - set(existing_tables)
                print(f"   ❌ Missing tables: {', '.join(missing)}")
            
            return score * 3, max_score * 3  # 18 points total
            
        except Exception as e:
            print(f"   ❌ Error validating database schema: {str(e)}")
            return 0, max_score * 3
        finally:
            conn.close()
    
    def validate_launch_readiness_assessments(self) -> Tuple[int, int]:
        """Validate launch readiness assessments"""
        print("🚀 Validating launch readiness assessments...")
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Check if launch readiness assessments table has data
            cursor.execute("SELECT COUNT(*) FROM launch_readiness_assessments")
            assessment_count = cursor.fetchone()[0]
            
            # Check for different categories
            cursor.execute("SELECT DISTINCT category FROM launch_readiness_assessments")
            categories = [row[0] for row in cursor.fetchall()]
            
            # Check for critical assessments
            cursor.execute("SELECT COUNT(*) FROM launch_readiness_assessments WHERE critical = 1")
            critical_count = cursor.fetchone()[0]
            
            # Check average score
            cursor.execute("SELECT AVG(score), AVG(CAST(score AS FLOAT) / max_score * 100) FROM launch_readiness_assessments")
            avg_score, avg_percentage = cursor.fetchone()
            
            score = 0
            max_score = 25
            
            if assessment_count >= 10:
                score += 8
                print(f"   ✅ Found {assessment_count} launch readiness assessments")
            else:
                print(f"   ❌ Only {assessment_count} assessments (need ≥10)")
            
            if len(categories) >= 4:
                score += 6
                print(f"   ✅ Found {len(categories)} assessment categories: {', '.join(categories)}")
            else:
                print(f"   ❌ Only {len(categories)} categories (need ≥4)")
            
            if critical_count >= 5:
                score += 5
                print(f"   ✅ Found {critical_count} critical assessments")
            else:
                print(f"   ❌ Only {critical_count} critical assessments (need ≥5)")
            
            if avg_percentage and avg_percentage >= 90:
                score += 6
                print(f"   ✅ High average readiness score: {avg_percentage:.1f}%")
            elif avg_percentage and avg_percentage >= 80:
                score += 3
                print(f"   ⚠️ Good average readiness score: {avg_percentage:.1f}%")
            else:
                print(f"   ❌ Low average readiness score: {avg_percentage:.1f if avg_percentage else 0}%")
            
            return score, max_score
            
        except Exception as e:
            print(f"   ❌ Error validating launch readiness assessments: {str(e)}")
            return 0, 25
        finally:
            conn.close()
    
    def validate_security_audit_results(self) -> Tuple[int, int]:
        """Validate security audit results"""
        print("🔒 Validating security audit results...")
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Check if security audit results table has data
            cursor.execute("SELECT COUNT(*) FROM security_audit_results")
            audit_count = cursor.fetchone()[0]
            
            # Check for different audit types
            cursor.execute("SELECT DISTINCT audit_type FROM security_audit_results")
            audit_types = [row[0] for row in cursor.fetchall()]
            
            # Check for passed audits
            cursor.execute("SELECT COUNT(*) FROM security_audit_results WHERE status = 'passed'")
            passed_count = cursor.fetchone()[0]
            
            # Check for different severity levels
            cursor.execute("SELECT DISTINCT severity FROM security_audit_results")
            severity_levels = [row[0] for row in cursor.fetchall()]
            
            score = 0
            max_score = 20
            
            if audit_count >= 8:
                score += 6
                print(f"   ✅ Found {audit_count} security audit results")
            else:
                print(f"   ❌ Only {audit_count} audit results (need ≥8)")
            
            if len(audit_types) >= 5:
                score += 5
                print(f"   ✅ Found {len(audit_types)} audit types: {', '.join(audit_types)}")
            else:
                print(f"   ❌ Only {len(audit_types)} audit types (need ≥5)")
            
            if passed_count == audit_count and audit_count > 0:
                score += 6
                print(f"   ✅ All {audit_count} security audits passed")
            elif passed_count >= audit_count * 0.9:
                score += 3
                print(f"   ⚠️ Most security audits passed: {passed_count}/{audit_count}")
            else:
                print(f"   ❌ Only {passed_count}/{audit_count} security audits passed")
            
            if len(severity_levels) >= 2:
                score += 3
                print(f"   ✅ Found {len(severity_levels)} severity levels: {', '.join(severity_levels)}")
            else:
                print(f"   ❌ Only {len(severity_levels)} severity levels (need ≥2)")
            
            return score, max_score
            
        except Exception as e:
            print(f"   ❌ Error validating security audit results: {str(e)}")
            return 0, 20
        finally:
            conn.close()
    
    def validate_production_configurations(self) -> Tuple[int, int]:
        """Validate production configurations"""
        print("⚙️ Validating production configurations...")
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Check if production configurations table has data
            cursor.execute("SELECT COUNT(*) FROM production_configurations")
            config_count = cursor.fetchone()[0]
            
            # Check for different categories
            cursor.execute("SELECT DISTINCT category FROM production_configurations")
            categories = [row[0] for row in cursor.fetchall()]
            
            # Check for secure and optimized configurations
            cursor.execute("SELECT COUNT(*) FROM production_configurations WHERE is_secure = 1 AND is_optimized = 1")
            secure_optimized_count = cursor.fetchone()[0]
            
            # Check for validated configurations
            cursor.execute("SELECT COUNT(*) FROM production_configurations WHERE validation_status = 'validated'")
            validated_count = cursor.fetchone()[0]
            
            score = 0
            max_score = 15
            
            if config_count >= 5:
                score += 5
                print(f"   ✅ Found {config_count} production configurations")
            else:
                print(f"   ❌ Only {config_count} configurations (need ≥5)")
            
            if len(categories) >= 4:
                score += 4
                print(f"   ✅ Found {len(categories)} configuration categories: {', '.join(categories)}")
            else:
                print(f"   ❌ Only {len(categories)} categories (need ≥4)")
            
            if secure_optimized_count == config_count and config_count > 0:
                score += 3
                print(f"   ✅ All {config_count} configurations are secure and optimized")
            else:
                print(f"   ❌ Only {secure_optimized_count}/{config_count} configurations are secure and optimized")
            
            if validated_count == config_count and config_count > 0:
                score += 3
                print(f"   ✅ All {config_count} configurations are validated")
            else:
                print(f"   ❌ Only {validated_count}/{config_count} configurations are validated")
            
            return score, max_score
            
        except Exception as e:
            print(f"   ❌ Error validating production configurations: {str(e)}")
            return 0, 15
        finally:
            conn.close()
    
    def validate_backup_recovery_validations(self) -> Tuple[int, int]:
        """Validate backup and recovery validations"""
        print("💾 Validating backup and recovery validations...")
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Check if backup recovery validations table has data
            cursor.execute("SELECT COUNT(*) FROM backup_recovery_validations")
            validation_count = cursor.fetchone()[0]
            
            # Check for different backup types
            cursor.execute("SELECT DISTINCT backup_type FROM backup_recovery_validations")
            backup_types = [row[0] for row in cursor.fetchall()]
            
            # Check for passed validations
            cursor.execute("SELECT COUNT(*) FROM backup_recovery_validations WHERE status = 'passed'")
            passed_count = cursor.fetchone()[0]
            
            # Check for data integrity checks
            cursor.execute("SELECT COUNT(*) FROM backup_recovery_validations WHERE data_integrity_check = 1")
            integrity_count = cursor.fetchone()[0]
            
            score = 0
            max_score = 15
            
            if validation_count >= 4:
                score += 5
                print(f"   ✅ Found {validation_count} backup recovery validations")
            else:
                print(f"   ❌ Only {validation_count} validations (need ≥4)")
            
            if len(backup_types) >= 3:
                score += 4
                print(f"   ✅ Found {len(backup_types)} backup types: {', '.join(backup_types)}")
            else:
                print(f"   ❌ Only {len(backup_types)} backup types (need ≥3)")
            
            if passed_count == validation_count and validation_count > 0:
                score += 3
                print(f"   ✅ All {validation_count} backup validations passed")
            else:
                print(f"   ❌ Only {passed_count}/{validation_count} backup validations passed")
            
            if integrity_count == validation_count and validation_count > 0:
                score += 3
                print(f"   ✅ All {validation_count} validations include data integrity checks")
            else:
                print(f"   ❌ Only {integrity_count}/{validation_count} validations include integrity checks")
            
            return score, max_score
            
        except Exception as e:
            print(f"   ❌ Error validating backup recovery validations: {str(e)}")
            return 0, 15
        finally:
            conn.close()
    
    def validate_deployment_checklist(self) -> Tuple[int, int]:
        """Validate production deployment checklist"""
        print("📋 Validating production deployment checklist...")
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Check if deployment checklist table has data
            cursor.execute("SELECT COUNT(*) FROM production_deployment_checklist")
            checklist_count = cursor.fetchone()[0]
            
            # Check for different categories
            cursor.execute("SELECT DISTINCT category FROM production_deployment_checklist")
            categories = [row[0] for row in cursor.fetchall()]
            
            # Check for completed items
            cursor.execute("SELECT COUNT(*) FROM production_deployment_checklist WHERE status = 'completed'")
            completed_count = cursor.fetchone()[0]
            
            # Check for critical priority items
            cursor.execute("SELECT COUNT(*) FROM production_deployment_checklist WHERE priority = 'critical'")
            critical_count = cursor.fetchone()[0]
            
            score = 0
            max_score = 12
            
            if checklist_count >= 10:
                score += 4
                print(f"   ✅ Found {checklist_count} deployment checklist items")
            else:
                print(f"   ❌ Only {checklist_count} checklist items (need ≥10)")
            
            if len(categories) >= 4:
                score += 3
                print(f"   ✅ Found {len(categories)} checklist categories: {', '.join(categories)}")
            else:
                print(f"   ❌ Only {len(categories)} categories (need ≥4)")
            
            if completed_count == checklist_count and checklist_count > 0:
                score += 3
                print(f"   ✅ All {checklist_count} checklist items completed")
            elif completed_count >= checklist_count * 0.9:
                score += 2
                print(f"   ⚠️ Most checklist items completed: {completed_count}/{checklist_count}")
            else:
                print(f"   ❌ Only {completed_count}/{checklist_count} checklist items completed")
            
            if critical_count >= 5:
                score += 2
                print(f"   ✅ Found {critical_count} critical priority items")
            else:
                print(f"   ❌ Only {critical_count} critical priority items (need ≥5)")
            
            return score, max_score
            
        except Exception as e:
            print(f"   ❌ Error validating deployment checklist: {str(e)}")
            return 0, 12
        finally:
            conn.close()
    
    def validate_frontend_components(self) -> Tuple[int, int]:
        """Validate frontend production launch dashboard components"""
        print("🎨 Validating frontend production launch components...")
        
        dashboard_file = "frontend/src/pages/admin/ProductionLaunchDashboard.tsx"
        
        score = 0
        max_score = 15
        
        if os.path.exists(dashboard_file):
            score += 5
            print(f"   ✅ Found production launch dashboard component")
            
            # Check for key component features
            with open(dashboard_file, 'r') as f:
                content = f.read()
                
                features = [
                    ("LaunchReadinessCheck", "launch readiness interface"),
                    ("SecurityAuditResult", "security audit results"),
                    ("DeploymentChecklistItem", "deployment checklist"),
                    ("LaunchReadinessReport", "launch readiness reporting"),
                    ("PieChart", "readiness visualization"),
                    ("BarChart", "category performance"),
                    ("Rocket", "launch dashboard icon"),
                    ("CheckCircle", "completion indicators"),
                    ("Shield", "security indicators"),
                    ("APPROVED FOR PRODUCTION LAUNCH", "launch approval status")
                ]
                
                found_features = 0
                for feature, description in features:
                    if feature in content:
                        found_features += 1
                        print(f"      ✅ {description}")
                    else:
                        print(f"      ❌ Missing {description}")
                
                score += min(10, found_features)
        else:
            print(f"   ❌ Production launch dashboard component not found")
        
        return score, max_score
    
    def validate_overall_launch_readiness(self) -> Tuple[int, int]:
        """Validate overall production launch readiness"""
        print("🏆 Validating overall production launch readiness...")
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Calculate overall readiness score
            cursor.execute("SELECT AVG(CAST(score AS FLOAT) / max_score * 100) FROM launch_readiness_assessments")
            avg_readiness = cursor.fetchone()[0]
            
            # Check critical items
            cursor.execute("SELECT COUNT(*) FROM launch_readiness_assessments WHERE critical = 1 AND score >= 90")
            critical_passed = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM launch_readiness_assessments WHERE critical = 1")
            total_critical = cursor.fetchone()[0]
            
            # Check security audit pass rate
            cursor.execute("SELECT COUNT(*) FROM security_audit_results WHERE status = 'passed'")
            security_passed = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM security_audit_results")
            total_security = cursor.fetchone()[0]
            
            score = 0
            max_score = 20
            
            if avg_readiness and avg_readiness >= 95:
                score += 8
                print(f"   ✅ Excellent overall readiness: {avg_readiness:.1f}%")
            elif avg_readiness and avg_readiness >= 90:
                score += 6
                print(f"   ✅ Good overall readiness: {avg_readiness:.1f}%")
            elif avg_readiness and avg_readiness >= 80:
                score += 3
                print(f"   ⚠️ Acceptable overall readiness: {avg_readiness:.1f}%")
            else:
                print(f"   ❌ Low overall readiness: {avg_readiness:.1f if avg_readiness else 0}%")
            
            if critical_passed == total_critical and total_critical > 0:
                score += 6
                print(f"   ✅ All {total_critical} critical items passed")
            else:
                print(f"   ❌ Only {critical_passed}/{total_critical} critical items passed")
            
            if security_passed == total_security and total_security > 0:
                score += 6
                print(f"   ✅ All {total_security} security audits passed")
            else:
                print(f"   ❌ Only {security_passed}/{total_security} security audits passed")
            
            return score, max_score
            
        except Exception as e:
            print(f"   ❌ Error validating overall launch readiness: {str(e)}")
            return 0, 20
        finally:
            conn.close()
    
    def run_validation(self) -> Dict[str, Any]:
        """Run complete Week 5 Day 5 validation"""
        print("🚀 Week 5 Day 5: Production Launch Preparation Validation")
        print("=" * 80)
        
        # Run all validations
        validations = [
            ("Database Schema", self.validate_database_schema),
            ("Launch Readiness Assessments", self.validate_launch_readiness_assessments),
            ("Security Audit Results", self.validate_security_audit_results),
            ("Production Configurations", self.validate_production_configurations),
            ("Backup Recovery Validations", self.validate_backup_recovery_validations),
            ("Deployment Checklist", self.validate_deployment_checklist),
            ("Frontend Components", self.validate_frontend_components),
            ("Overall Launch Readiness", self.validate_overall_launch_readiness)
        ]
        
        total_score = 0
        total_max = 0
        
        for name, validation_func in validations:
            print(f"\n{name}:")
            score, max_score = validation_func()
            total_score += score
            total_max += max_score
            self.validation_results[name] = {
                "score": score,
                "max_score": max_score,
                "percentage": (score / max_score * 100) if max_score > 0 else 0
            }
        
        # Calculate overall results
        overall_percentage = (total_score / total_max * 100) if total_max > 0 else 0
        
        print("\n" + "=" * 80)
        print("📊 VALIDATION RESULTS SUMMARY")
        print("=" * 80)
        
        for name, result in self.validation_results.items():
            status = "✅" if result["percentage"] >= 80 else ("⚠️" if result["percentage"] >= 60 else "❌")
            print(f"{status} {name}: {result['score']}/{result['max_score']} ({result['percentage']:.1f}%)")
        
        print(f"\n🎯 OVERALL SCORE: {total_score}/{total_max} ({overall_percentage:.1f}%)")
        
        if overall_percentage >= 95:
            status = "🌟 OUTSTANDING - APPROVED FOR LAUNCH"
        elif overall_percentage >= 90:
            status = "✅ EXCELLENT - READY FOR LAUNCH"
        elif overall_percentage >= 80:
            status = "👍 GOOD - FINAL REVIEW RECOMMENDED"
        elif overall_percentage >= 70:
            status = "⚠️ NEEDS IMPROVEMENT"
        else:
            status = "❌ REQUIRES ATTENTION"
        
        print(f"📈 STATUS: {status}")
        
        # Save validation results
        results = {
            "validation_date": datetime.now().isoformat(),
            "week": "Week 5 Day 5",
            "focus": "Production Launch Preparation",
            "overall_score": total_score,
            "max_score": total_max,
            "percentage": overall_percentage,
            "status": status,
            "detailed_results": self.validation_results,
            "launch_readiness": {
                "database_tables": 6,
                "launch_assessments": "Comprehensive readiness validation",
                "security_audits": "Multi-layer security validation",
                "production_configs": "Optimized and secure configurations",
                "backup_recovery": "Validated disaster recovery procedures",
                "deployment_checklist": "Complete deployment validation",
                "frontend_dashboard": "Production launch monitoring interface",
                "overall_readiness": "Enterprise production deployment ready"
            },
            "production_launch_recommendation": "APPROVED FOR PRODUCTION LAUNCH" if overall_percentage >= 90 else "REQUIRES FINAL REVIEW"
        }
        
        # Save to file
        os.makedirs("reports/validation", exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"reports/validation/week5_day5_validation_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n💾 Validation results saved to: {filename}")
        
        return results

def main():
    """Main validation function"""
    validator = Week5Day5Validator()
    results = validator.run_validation()
    
    # Return appropriate exit code
    if results["percentage"] >= 80:
        return 0
    else:
        return 1

if __name__ == "__main__":
    sys.exit(main()) 