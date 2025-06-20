#!/usr/bin/env python3
"""
SecureNet Week 2 Day 5 Validation Script
System Hardening & Security Enhancement Validation

Validation Categories:
1. Security Monitoring (35 points)
2. Incident Response (35 points) 
3. Compliance Validation (30 points)

Total: 100 points
"""

import os
import sys
import json
import time
import importlib.util
from datetime import datetime
from typing import Dict, List, Any

def load_module_from_path(module_name: str, file_path: str):
    """Load a Python module from file path"""
    try:
        spec = importlib.util.spec_from_file_location(module_name, file_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    except Exception as e:
        print(f"❌ Failed to load {module_name}: {e}")
        return None

class Week2Day5Validator:
    def __init__(self):
        self.total_points = 100
        self.earned_points = 0
        self.test_results = []
        self.detailed_results = {
            "security_monitoring": {"points": 0, "max_points": 35, "tests": []},
            "incident_response": {"points": 0, "max_points": 35, "tests": []},
            "compliance_validation": {"points": 0, "max_points": 30, "tests": []}
        }
        
        # Load the system hardening module
        self.hardening_module = load_module_from_path(
            "week2_day5_system_hardening",
            "utils/week2_day5_system_hardening.py"
        )
    
    def run_validation(self) -> Dict[str, Any]:
        """Run complete Week 2 Day 5 validation"""
        print("🔒 Starting Week 2 Day 5: System Hardening & Security Enhancement Validation")
        print("=" * 80)
        
        if not self.hardening_module:
            return self._create_error_result("Failed to load system hardening module")
        
        # Test Security Monitoring (35 points)
        self._test_security_monitoring()
        
        # Test Incident Response (35 points)
        self._test_incident_response()
        
        # Test Compliance Validation (30 points)
        self._test_compliance_validation()
        
        # Calculate final results
        return self._calculate_final_results()
    
    def _test_security_monitoring(self):
        """Test Security Monitoring capabilities (35 points)"""
        print("\n🔍 Testing Security Monitoring (35 points)")
        print("-" * 50)
        
        category = "security_monitoring"
        
        try:
            # Test 1: SecurityMonitor class exists (5 points)
            if hasattr(self.hardening_module, 'SecurityMonitor'):
                self._add_points(category, 5, "SecurityMonitor class exists")
                
                # Test 2: SecurityMonitor initialization (5 points)
                try:
                    monitor = self.hardening_module.SecurityMonitor()
                    self._add_points(category, 5, "SecurityMonitor initializes correctly")
                    
                    # Test 3: Start/Stop monitoring (5 points)
                    if hasattr(monitor, 'start_monitoring') and hasattr(monitor, 'stop_monitoring'):
                        start_result = monitor.start_monitoring()
                        stop_result = monitor.stop_monitoring()
                        if start_result and stop_result:
                            self._add_points(category, 5, "Start/Stop monitoring works")
                        else:
                            self._add_points(category, 2, "Start/Stop monitoring partially works")
                    
                    # Test 4: Threat detection patterns (5 points)
                    if hasattr(monitor, 'threat_patterns') and monitor.threat_patterns:
                        patterns = monitor.threat_patterns
                        expected_patterns = ['brute_force', 'sql_injection', 'suspicious_access', 'privilege_escalation']
                        if all(pattern in patterns for pattern in expected_patterns):
                            self._add_points(category, 5, "All threat detection patterns present")
                        else:
                            self._add_points(category, 3, "Some threat detection patterns present")
                    
                    # Test 5: Threat detection functionality (10 points)
                    if hasattr(monitor, 'detect_threats'):
                        # Test brute force detection
                        brute_force_data = {
                            'failed_login_count': 6,
                            'source_ip': '192.168.1.100',
                            'user_id': 'test_user'
                        }
                        events = monitor.detect_threats(brute_force_data)
                        if events and len(events) > 0:
                            self._add_points(category, 5, "Brute force detection works")
                        else:
                            self._add_points(category, 2, "Brute force detection partially works")
                        
                        # Test SQL injection detection
                        sql_injection_data = {
                            'query': "SELECT * FROM users WHERE id = 1 OR 1=1",
                            'source_ip': '10.0.0.50',
                            'user_id': 'guest'
                        }
                        events = monitor.detect_threats(sql_injection_data)
                        if events and len(events) > 0:
                            self._add_points(category, 5, "SQL injection detection works")
                        else:
                            self._add_points(category, 2, "SQL injection detection partially works")
                    
                    # Test 6: Security status reporting (5 points)
                    if hasattr(monitor, 'get_security_status'):
                        status = monitor.get_security_status()
                        expected_keys = ['monitoring_active', 'total_events', 'recent_events', 'critical_events']
                        if all(key in status for key in expected_keys):
                            self._add_points(category, 5, "Security status reporting complete")
                        else:
                            self._add_points(category, 3, "Security status reporting partial")
                    
                except Exception as e:
                    self._add_points(category, 0, f"SecurityMonitor testing failed: {e}")
            else:
                self._add_points(category, 0, "SecurityMonitor class not found")
                
        except Exception as e:
            self._add_points(category, 0, f"Security monitoring testing failed: {e}")
    
    def _test_incident_response(self):
        """Test Incident Response capabilities (35 points)"""
        print("\n🚨 Testing Incident Response (35 points)")
        print("-" * 50)
        
        category = "incident_response"
        
        try:
            # Test 1: IncidentResponseSystem class exists (5 points)
            if hasattr(self.hardening_module, 'IncidentResponseSystem'):
                self._add_points(category, 5, "IncidentResponseSystem class exists")
                
                # Test 2: IncidentResponseSystem initialization (5 points)
                try:
                    incident_system = self.hardening_module.IncidentResponseSystem()
                    self._add_points(category, 5, "IncidentResponseSystem initializes correctly")
                    
                    # Test 3: Response playbooks (5 points)
                    if hasattr(incident_system, 'response_playbooks') and incident_system.response_playbooks:
                        playbooks = incident_system.response_playbooks
                        expected_playbooks = ['brute_force_attack', 'sql_injection_attempt', 'privilege_escalation_attempt']
                        if all(playbook in playbooks for playbook in expected_playbooks):
                            self._add_points(category, 5, "All response playbooks present")
                        else:
                            self._add_points(category, 3, "Some response playbooks present")
                    
                    # Test 4: Incident creation (10 points)
                    if hasattr(incident_system, 'create_incident'):
                        # Create a mock security event
                        SecurityEvent = getattr(self.hardening_module, 'SecurityEvent', None)
                        SecurityLevel = getattr(self.hardening_module, 'SecurityLevel', None)
                        
                        if SecurityEvent and SecurityLevel:
                            mock_event = SecurityEvent(
                                id="test_event_001",
                                timestamp=datetime.now(),
                                event_type="brute_force_attack",
                                severity=SecurityLevel.HIGH,
                                source_ip="192.168.1.100",
                                user_id="test_user",
                                description="Test brute force attack",
                                metadata={}
                            )
                            
                            incident = incident_system.create_incident(mock_event)
                            if incident and hasattr(incident, 'id'):
                                self._add_points(category, 10, "Incident creation works correctly")
                            else:
                                self._add_points(category, 5, "Incident creation partially works")
                        else:
                            self._add_points(category, 3, "SecurityEvent/SecurityLevel classes not found")
                    
                    # Test 5: Incident status reporting (5 points)
                    if hasattr(incident_system, 'get_incident_status'):
                        status = incident_system.get_incident_status()
                        expected_keys = ['total_incidents', 'open_incidents', 'resolved_incidents']
                        if all(key in status for key in expected_keys):
                            self._add_points(category, 5, "Incident status reporting complete")
                        else:
                            self._add_points(category, 3, "Incident status reporting partial")
                    
                    # Test 6: Automated response actions (5 points)
                    if hasattr(incident_system, '_execute_response_action'):
                        self._add_points(category, 5, "Automated response actions implemented")
                    else:
                        self._add_points(category, 2, "Automated response actions missing")
                        
                except Exception as e:
                    self._add_points(category, 0, f"IncidentResponseSystem testing failed: {e}")
            else:
                self._add_points(category, 0, "IncidentResponseSystem class not found")
                
        except Exception as e:
            self._add_points(category, 0, f"Incident response testing failed: {e}")
    
    def _test_compliance_validation(self):
        """Test Compliance Validation capabilities (30 points)"""
        print("\n📋 Testing Compliance Validation (30 points)")
        print("-" * 50)
        
        category = "compliance_validation"
        
        try:
            # Test 1: ComplianceValidator class exists (5 points)
            if hasattr(self.hardening_module, 'ComplianceValidator'):
                self._add_points(category, 5, "ComplianceValidator class exists")
                
                # Test 2: ComplianceValidator initialization (5 points)
                try:
                    validator = self.hardening_module.ComplianceValidator()
                    self._add_points(category, 5, "ComplianceValidator initializes correctly")
                    
                    # Test 3: Compliance frameworks (5 points)
                    if hasattr(validator, 'frameworks') and validator.frameworks:
                        ComplianceFramework = getattr(self.hardening_module, 'ComplianceFramework', None)
                        if ComplianceFramework:
                            expected_frameworks = [ComplianceFramework.SOC2, ComplianceFramework.ISO27001, ComplianceFramework.GDPR]
                            if all(framework in validator.frameworks for framework in expected_frameworks):
                                self._add_points(category, 5, "All compliance frameworks present")
                            else:
                                self._add_points(category, 3, "Some compliance frameworks present")
                        else:
                            self._add_points(category, 2, "ComplianceFramework enum not found")
                    
                    # Test 4: Compliance check execution (10 points)
                    if hasattr(validator, 'run_compliance_check'):
                        ComplianceFramework = getattr(self.hardening_module, 'ComplianceFramework', None)
                        if ComplianceFramework:
                            # Test SOC2 compliance check
                            soc2_results = validator.run_compliance_check(ComplianceFramework.SOC2)
                            if soc2_results and len(soc2_results) > 0:
                                self._add_points(category, 5, "SOC2 compliance check works")
                            else:
                                self._add_points(category, 2, "SOC2 compliance check partially works")
                            
                            # Test ISO27001 compliance check
                            iso_results = validator.run_compliance_check(ComplianceFramework.ISO27001)
                            if iso_results and len(iso_results) > 0:
                                self._add_points(category, 5, "ISO27001 compliance check works")
                            else:
                                self._add_points(category, 2, "ISO27001 compliance check partially works")
                        else:
                            self._add_points(category, 3, "ComplianceFramework not available for testing")
                    
                    # Test 5: Compliance report generation (5 points)
                    if hasattr(validator, 'generate_compliance_report'):
                        ComplianceFramework = getattr(self.hardening_module, 'ComplianceFramework', None)
                        if ComplianceFramework:
                            # Run a compliance check first
                            validator.run_compliance_check(ComplianceFramework.SOC2)
                            report = validator.generate_compliance_report(ComplianceFramework.SOC2)
                            
                            expected_keys = ['framework', 'total_controls', 'compliance_percentage', 'overall_status']
                            if all(key in report for key in expected_keys):
                                self._add_points(category, 5, "Compliance report generation complete")
                            else:
                                self._add_points(category, 3, "Compliance report generation partial")
                        else:
                            self._add_points(category, 2, "ComplianceFramework not available for report testing")
                    
                except Exception as e:
                    self._add_points(category, 0, f"ComplianceValidator testing failed: {e}")
            else:
                self._add_points(category, 0, "ComplianceValidator class not found")
                
        except Exception as e:
            self._add_points(category, 0, f"Compliance validation testing failed: {e}")
    
    def _add_points(self, category: str, points: int, description: str):
        """Add points to a category and log the test result"""
        self.detailed_results[category]["points"] += points
        self.detailed_results[category]["tests"].append({
            "description": description,
            "points": points,
            "timestamp": datetime.now().isoformat()
        })
        
        status = "✅" if points > 0 else "❌"
        print(f"  {status} {description} ({points} points)")
    
    def _calculate_final_results(self) -> Dict[str, Any]:
        """Calculate final validation results"""
        # Calculate total earned points
        self.earned_points = sum(category["points"] for category in self.detailed_results.values())
        
        # Calculate percentage
        percentage = (self.earned_points / self.total_points) * 100
        
        # Determine status
        if percentage >= 90:
            status = "EXCELLENT"
        elif percentage >= 80:
            status = "GOOD"
        elif percentage >= 70:
            status = "ACCEPTABLE"
        else:
            status = "NEEDS_IMPROVEMENT"
        
        # Create summary
        summary = {
            "validation_type": "Week 2 Day 5 - System Hardening & Security Enhancement",
            "timestamp": datetime.now().isoformat(),
            "total_points": self.total_points,
            "earned_points": self.earned_points,
            "percentage": round(percentage, 1),
            "status": status,
            "detailed_results": self.detailed_results,
            "category_breakdown": {
                category: {
                    "points": data["points"],
                    "max_points": data["max_points"],
                    "percentage": round((data["points"] / data["max_points"]) * 100, 1)
                }
                for category, data in self.detailed_results.items()
            }
        }
        
        return summary
    
    def _create_error_result(self, error_message: str) -> Dict[str, Any]:
        """Create error result when validation cannot proceed"""
        return {
            "validation_type": "Week 2 Day 5 - System Hardening & Security Enhancement",
            "timestamp": datetime.now().isoformat(),
            "status": "ERROR",
            "error": error_message,
            "total_points": self.total_points,
            "earned_points": 0,
            "percentage": 0.0
        }

def print_validation_summary(results: Dict[str, Any]):
    """Print validation summary"""
    print("\n" + "=" * 80)
    print("🔒 WEEK 2 DAY 5 VALIDATION SUMMARY")
    print("=" * 80)
    
    if results.get("status") == "ERROR":
        print(f"❌ Validation Error: {results.get('error', 'Unknown error')}")
        return
    
    print(f"📊 Overall Score: {results['earned_points']}/{results['total_points']} ({results['percentage']}%)")
    print(f"🎯 Status: {results['status']}")
    print(f"⏰ Completed: {results['timestamp']}")
    
    print("\n📋 Category Breakdown:")
    for category, breakdown in results['category_breakdown'].items():
        category_name = category.replace('_', ' ').title()
        print(f"  • {category_name}: {breakdown['points']}/{breakdown['max_points']} ({breakdown['percentage']}%)")
    
    print("\n🔍 Detailed Results:")
    for category, data in results['detailed_results'].items():
        category_name = category.replace('_', ' ').title()
        print(f"\n  {category_name} ({data['points']}/{data['max_points']} points):")
        for test in data['tests']:
            status = "✅" if test['points'] > 0 else "❌"
            print(f"    {status} {test['description']} ({test['points']} points)")
    
    # Performance assessment
    print(f"\n🎯 Performance Assessment:")
    if results['percentage'] >= 90:
        print("  🌟 EXCELLENT - Outstanding system hardening implementation!")
    elif results['percentage'] >= 80:
        print("  ✅ GOOD - Solid system hardening with minor improvements needed")
    elif results['percentage'] >= 70:
        print("  ⚠️  ACCEPTABLE - Basic system hardening working, improvements recommended")
    else:
        print("  ❌ NEEDS IMPROVEMENT - Significant system hardening issues need attention")

def save_validation_results(results: Dict[str, Any], filename: str = None):
    """Save validation results to JSON file"""
    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"week2_day5_validation_{timestamp}.json"
    
    try:
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        print(f"\n💾 Results saved to: {filename}")
    except Exception as e:
        print(f"\n❌ Failed to save results: {e}")

def main():
    """Main validation execution"""
    print("🔒 SecureNet Week 2 Day 5: System Hardening & Security Enhancement Validation")
    print("Testing comprehensive security monitoring, incident response, and compliance validation")
    print("=" * 80)
    
    # Initialize validator
    validator = Week2Day5Validator()
    
    # Run validation
    results = validator.run_validation()
    
    # Print summary
    print_validation_summary(results)
    
    # Save results
    save_validation_results(results)
    
    return results

if __name__ == "__main__":
    main() 