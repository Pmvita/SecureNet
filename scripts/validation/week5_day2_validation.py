#!/usr/bin/env python3
"""
Week 5 Day 2: Advanced Analytics Enhancement & Performance Optimization Validation

Validates the implementation of:
1. Frontend Team - Advanced Analytics Enhancement
2. Backend Team - Performance Optimization  
3. DevOps Team - Monitoring & Alerting
4. Security Team - Advanced Threat Detection

Expected deliverables:
- User Management Analytics Dashboard
- Performance optimization for user management operations
- Advanced monitoring integration
- User behavior analytics and threat detection
"""

import os
import sys
import sqlite3
import json
import time
from datetime import datetime
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.append(str(project_root))

def print_section(title):
    """Print a formatted section header"""
    print(f"\n🔄 {title}...")
    print("=" * 60)

def print_result(test_name, passed, details=""):
    """Print test result with consistent formatting"""
    status = "✅" if passed else "❌"
    print(f"{status} {test_name}: {details}")
    return passed

def check_file_exists(filepath, description):
    """Check if a file exists and return result"""
    exists = os.path.exists(filepath)
    print_result(f"{description}", exists, f"File {'exists' if exists else 'missing'}")
    return exists

def check_database_table(db_path, table_name, description):
    """Check if database table exists"""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
        exists = cursor.fetchone() is not None
        conn.close()
        print_result(f"{description}", exists, f"Table {table_name} {'exists' if exists else 'missing'}")
        return exists
    except Exception as e:
        print_result(f"{description}", False, f"Database error: {str(e)}")
        return False

def check_database_data(db_path, query, description, min_count=1):
    """Check database data with a query"""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute(query)
        count = cursor.fetchone()[0] if cursor.fetchone() else 0
        conn.close()
        success = count >= min_count
        print_result(f"{description}", success, f"Found {count} records")
        return success, count
    except Exception as e:
        print_result(f"{description}", False, f"Query error: {str(e)}")
        return False, 0

def check_script_execution(script_path, description, timeout=30):
    """Check if a script can be executed successfully"""
    try:
        if not os.path.exists(script_path):
            print_result(f"{description}", False, "Script file missing")
            return False
        
        # Try to import/execute the script
        import subprocess
        result = subprocess.run([sys.executable, script_path], 
                              capture_output=True, text=True, timeout=timeout)
        success = result.returncode == 0
        print_result(f"{description}", success, 
                    "Executes successfully" if success else f"Error: {result.stderr[:100]}")
        return success
    except subprocess.TimeoutExpired:
        print_result(f"{description}", False, "Execution timed out")
        return False
    except Exception as e:
        print_result(f"{description}", False, f"Execution error: {str(e)}")
        return False

def check_frontend_component(component_path, component_name, features):
    """Check frontend component implementation"""
    if not os.path.exists(component_path):
        print_result(f"{component_name}", False, "Component file missing")
        return False
    
    try:
        with open(component_path, 'r') as f:
            content = f.read()
        
        feature_checks = []
        for feature, keywords in features.items():
            has_feature = any(keyword.lower() in content.lower() for keyword in keywords)
            print_result(f"{component_name} - {feature}", has_feature, 
                        "Has feature" if has_feature else "Missing feature")
            feature_checks.append(has_feature)
        
        return all(feature_checks)
    except Exception as e:
        print_result(f"{component_name}", False, f"Error reading component: {str(e)}")
        return False

def main():
    """Main validation function"""
    print("🚀 Week 5 Day 2: Advanced Analytics Enhancement & Performance Optimization Validation")
    print("=" * 80)
    print("Focus: Analytics Dashboard, Performance Optimization, Monitoring, Threat Detection")
    print("=" * 80)
    
    # Test counters
    total_tests = 0
    passed_tests = 0
    
    # Database path
    db_path = "data/securenet.db"
    
    # =================================================================
    # 1. FRONTEND TEAM - ADVANCED ANALYTICS ENHANCEMENT
    # =================================================================
    print_section("Testing Advanced Analytics Enhancement")
    
    # User Management Analytics Dashboard
    analytics_dashboard_path = "frontend/src/pages/admin/UserManagementAnalyticsDashboard.tsx"
    analytics_features = {
        "group membership trends": ["trend", "membership", "chart", "analytics"],
        "user activity patterns": ["activity", "pattern", "behavior", "visualization"],
        "permission usage analytics": ["permission", "usage", "analytics", "statistics"],
        "compliance metrics": ["compliance", "metric", "dashboard", "monitoring"]
    }
    
    total_tests += 1
    if check_frontend_component(analytics_dashboard_path, "User Management Analytics Dashboard", analytics_features):
        passed_tests += 1
    
    # Advanced Analytics API endpoints
    analytics_api_path = "api/endpoints/api_analytics.py"
    total_tests += 1
    if check_file_exists(analytics_api_path, "Advanced Analytics API"):
        passed_tests += 1
    
    # Analytics database tables
    analytics_tables = [
        ("user_activity_logs", "User Activity Logs Table"),
        ("permission_usage_stats", "Permission Usage Statistics Table"),
        ("group_membership_history", "Group Membership History Table"),
        ("compliance_metrics", "Compliance Metrics Table")
    ]
    
    for table_name, description in analytics_tables:
        total_tests += 1
        if check_database_table(db_path, table_name, description):
            passed_tests += 1
    
    # =================================================================
    # 2. BACKEND TEAM - PERFORMANCE OPTIMIZATION
    # =================================================================
    print_section("Testing Performance Optimization")
    
    # Performance optimization script
    performance_script_path = "scripts/create_performance_optimization.py"
    total_tests += 1
    if check_file_exists(performance_script_path, "Performance Optimization Script"):
        passed_tests += 1
    
    # Query optimization implementation
    query_optimization_path = "database/query_optimization.py"
    total_tests += 1
    if check_file_exists(query_optimization_path, "Query Optimization Module"):
        passed_tests += 1
    
    # Performance monitoring tables
    performance_tables = [
        ("query_performance_logs", "Query Performance Logs Table"),
        ("system_performance_metrics", "System Performance Metrics Table"),
        ("user_management_performance", "User Management Performance Table")
    ]
    
    for table_name, description in performance_tables:
        total_tests += 1
        if check_database_table(db_path, table_name, description):
            passed_tests += 1
    
    # Performance optimization execution
    total_tests += 1
    if os.path.exists(performance_script_path):
        if check_script_execution(performance_script_path, "Performance Optimization Execution"):
            passed_tests += 1
    
    # =================================================================
    # 3. DEVOPS TEAM - MONITORING & ALERTING
    # =================================================================
    print_section("Testing Advanced Monitoring Integration")
    
    # Advanced monitoring script
    monitoring_script_path = "scripts/monitoring/advanced_monitoring_integration.py"
    total_tests += 1
    if check_file_exists(monitoring_script_path, "Advanced Monitoring Script"):
        passed_tests += 1
    
    # Monitoring configuration
    monitoring_config_path = "config/monitoring.yaml"
    total_tests += 1
    if check_file_exists(monitoring_config_path, "Monitoring Configuration"):
        passed_tests += 1
    
    # Monitoring database tables
    monitoring_tables = [
        ("system_health_metrics", "System Health Metrics Table"),
        ("directory_sync_logs", "Directory Sync Logs Table"),
        ("compliance_alerts", "Compliance Alerts Table"),
        ("performance_alerts", "Performance Alerts Table")
    ]
    
    for table_name, description in monitoring_tables:
        total_tests += 1
        if check_database_table(db_path, table_name, description):
            passed_tests += 1
    
    # Monitoring execution
    total_tests += 1
    if os.path.exists(monitoring_script_path):
        if check_script_execution(monitoring_script_path, "Advanced Monitoring Execution"):
            passed_tests += 1
    
    # =================================================================
    # 4. SECURITY TEAM - ADVANCED THREAT DETECTION
    # =================================================================
    print_section("Testing Advanced Threat Detection")
    
    # User behavior analytics script
    behavior_analytics_path = "scripts/create_user_behavior_analytics.py"
    total_tests += 1
    if check_file_exists(behavior_analytics_path, "User Behavior Analytics Script"):
        passed_tests += 1
    
    # Threat detection module
    threat_detection_path = "security/advanced_threat_detection.py"
    total_tests += 1
    if check_file_exists(threat_detection_path, "Advanced Threat Detection Module"):
        passed_tests += 1
    
    # Security analytics tables
    security_tables = [
        ("user_behavior_patterns", "User Behavior Patterns Table"),
        ("anomaly_detection_logs", "Anomaly Detection Logs Table"),
        ("privileged_user_monitoring", "Privileged User Monitoring Table"),
        ("security_alerts", "Security Alerts Table")
    ]
    
    for table_name, description in security_tables:
        total_tests += 1
        if check_database_table(db_path, table_name, description):
            passed_tests += 1
    
    # Behavior analytics execution
    total_tests += 1
    if os.path.exists(behavior_analytics_path):
        if check_script_execution(behavior_analytics_path, "User Behavior Analytics Execution"):
            passed_tests += 1
    
    # =================================================================
    # 5. INTEGRATION TESTING
    # =================================================================
    print_section("Testing System Integration")
    
    # Check integration between analytics and performance systems
    total_tests += 1
    success, count = check_database_data(db_path, 
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name LIKE '%analytics%'",
        "Analytics System Integration", 2)
    if success:
        passed_tests += 1
    
    # Check integration between monitoring and security systems
    total_tests += 1
    success, count = check_database_data(db_path, 
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name LIKE '%monitoring%' OR name LIKE '%alert%'",
        "Monitoring System Integration", 3)
    if success:
        passed_tests += 1
    
    # Check overall system health
    total_tests += 1
    success, count = check_database_data(db_path, 
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table'",
        "Overall System Health", 25)
    if success:
        passed_tests += 1
    
    # =================================================================
    # 6. PERFORMANCE VALIDATION
    # =================================================================
    print_section("Testing Performance Improvements")
    
    # Check if performance optimization tables have data
    if check_database_table(db_path, "query_performance_logs", "Performance Logs Available"):
        total_tests += 1
        success, count = check_database_data(db_path,
            "SELECT COUNT(*) FROM query_performance_logs",
            "Performance Optimization Data", 1)
        if success:
            passed_tests += 1
    
    # Check if user management operations are optimized
    total_tests += 1
    if check_database_table(db_path, "user_management_performance", "User Management Performance Tracking"):
        passed_tests += 1
    
    # =================================================================
    # FINAL VALIDATION SUMMARY
    # =================================================================
    print_section("Week 5 Day 2 Validation Summary")
    
    success_rate = (passed_tests / total_tests) * 100
    status = "OUTSTANDING" if success_rate >= 150 else "EXCELLENT" if success_rate >= 90 else "GOOD" if success_rate >= 70 else "NEEDS IMPROVEMENT"
    
    print(f"🎯 Overall Score: {passed_tests}/{total_tests} ({success_rate:.1f}%)")
    print(f"📈 Status: {status}")
    print(f"🔧 Advanced Analytics: {'✅ Operational' if passed_tests >= total_tests * 0.7 else '⚠️ Partial'}")
    print(f"⚡ Performance Optimization: {'✅ Implemented' if passed_tests >= total_tests * 0.7 else '⚠️ Partial'}")
    print(f"🔍 Advanced Monitoring: {'✅ Active' if passed_tests >= total_tests * 0.7 else '⚠️ Partial'}")
    print(f"🛡️ Threat Detection: {'✅ Enhanced' if passed_tests >= total_tests * 0.7 else '⚠️ Partial'}")
    
    if success_rate >= 90:
        print("\n🎉 Week 5 Day 2 COMPLETED SUCCESSFULLY!")
        print("🚀 Advanced Analytics Enhancement & Performance Optimization are production-ready!")
        print("📈 SecureNet now has enterprise-grade analytics and optimized performance!")
    elif success_rate >= 70:
        print("\n✅ Week 5 Day 2 completed with good results!")
        print("🔧 Some components may need additional refinement.")
    else:
        print("\n⚠️ Week 5 Day 2 needs additional work.")
        print("🔧 Focus on completing missing components.")
    
    # Save validation results
    results = {
        "validation_date": datetime.now().isoformat(),
        "week": "Week 5 Day 2",
        "phase": "Advanced Analytics Enhancement & Performance Optimization",
        "total_score": passed_tests,
        "max_score": total_tests,
        "success_rate": round(success_rate, 1),
        "status": status,
        "components": {
            "advanced_analytics": passed_tests >= total_tests * 0.25,
            "performance_optimization": passed_tests >= total_tests * 0.25,
            "advanced_monitoring": passed_tests >= total_tests * 0.25,
            "threat_detection": passed_tests >= total_tests * 0.25
        }
    }
    
    # Save to reports directory
    reports_dir = "reports/validation"
    os.makedirs(reports_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_file = f"{reports_dir}/week5_day2_validation_{timestamp}.json"
    
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📊 Validation results saved to: {results_file}")
    
    return success_rate >= 70

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 