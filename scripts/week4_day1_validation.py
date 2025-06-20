#!/usr/bin/env python3
"""
SecureNet Week 4 Day 1 Validation Script
Advanced Enterprise Features & Launch Preparation Validation
"""

import asyncio
import json
import sys
import time
from datetime import datetime, timezone
from typing import Dict, List, Any
import traceback

# Add the project root to the path
sys.path.append('.')

from utils.week4_day1_advanced_enterprise_launch import Week4Day1AdvancedEnterpriseLaunch

class Week4Day1Validator:
    """Week 4 Day 1 validation system"""
    
    def __init__(self):
        self.enterprise_launch = Week4Day1AdvancedEnterpriseLaunch()
        self.total_score = 0
        self.max_score = 100
        self.validation_results = {
            "deployment_automation": {"score": 0, "max_score": 25, "tests": []},
            "api_gateway": {"score": 0, "max_score": 25, "tests": []},
            "monitoring_alerting": {"score": 0, "max_score": 25, "tests": []},
            "launch_readiness": {"score": 0, "max_score": 25, "tests": []}
        }
    
    async def run_validation(self) -> Dict[str, Any]:
        """Run comprehensive validation"""
        print("🚀 Starting Week 4 Day 1 Validation: Advanced Enterprise Features & Launch Preparation")
        print("=" * 80)
        
        start_time = time.time()
        
        try:
            # Test each component
            await self._test_deployment_automation()
            await self._test_api_gateway()
            await self._test_monitoring_alerting()
            await self._test_launch_readiness()
            
            # Calculate final results
            self._calculate_final_results()
            
            end_time = time.time()
            duration = end_time - start_time
            
            return {
                "validation_complete": True,
                "total_score": self.total_score,
                "max_score": self.max_score,
                "percentage": (self.total_score / self.max_score) * 100,
                "duration": f"{duration:.2f}s",
                "components": self.validation_results,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            print(f"❌ Validation failed with error: {str(e)}")
            traceback.print_exc()
            return {
                "validation_complete": False,
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
    
    async def _test_deployment_automation(self):
        """Test Enterprise Deployment Automation component"""
        print("\n🏗️  Testing Enterprise Deployment Automation...")
        component = "deployment_automation"
        
        tests = [
            ("Deployment Automation Initialization", self._test_deployment_init),
            ("Production Manifest Creation", self._test_production_manifest),
            ("Blue-Green Deployment Strategy", self._test_blue_green_deployment),
            ("Deployment Health Validation", self._test_deployment_health),
            ("Rollback Strategy Implementation", self._test_rollback_strategy)
        ]
        
        for test_name, test_func in tests:
            try:
                result = await test_func()
                score = 5 if result else 0
                self.validation_results[component]["tests"].append({
                    "test": test_name,
                    "passed": result,
                    "score": score
                })
                self.validation_results[component]["score"] += score
                status = "✅ PASS" if result else "❌ FAIL"
                print(f"  {status} {test_name}")
            except Exception as e:
                print(f"  ❌ FAIL {test_name}: {str(e)}")
                self.validation_results[component]["tests"].append({
                    "test": test_name,
                    "passed": False,
                    "score": 0,
                    "error": str(e)
                })
    
    async def _test_deployment_init(self) -> bool:
        """Test deployment automation initialization"""
        try:
            # Test deployment automation initialization
            deployment_automation = self.enterprise_launch.deployment_automation
            
            # Check if deployment configs are initialized
            if not deployment_automation.deployment_configs:
                return False
            
            # Check required environments
            required_envs = ["production", "staging", "development"]
            for env in required_envs:
                if env not in deployment_automation.deployment_configs:
                    return False
            
            return True
        except:
            return False
    
    async def _test_production_manifest(self) -> bool:
        """Test production manifest creation"""
        try:
            manifest = await self.enterprise_launch.deployment_automation.create_deployment_manifest("production")
            
            # Validate manifest structure
            required_keys = ["apiVersion", "kind", "metadata", "spec"]
            for key in required_keys:
                if key not in manifest:
                    return False
            
            # Check production-specific configuration
            if manifest["spec"]["replicas"] < 3:  # Production should have multiple replicas
                return False
            
            return True
        except:
            return False
    
    async def _test_blue_green_deployment(self) -> bool:
        """Test blue-green deployment strategy"""
        try:
            blue_green_config = await self.enterprise_launch.deployment_automation.create_blue_green_deployment("production")
            
            # Validate blue-green structure
            required_keys = ["strategy", "blue_deployment", "green_deployment", "service_config"]
            for key in required_keys:
                if key not in blue_green_config:
                    return False
            
            # Check strategy type
            if blue_green_config["strategy"] != "blue_green":
                return False
            
            return True
        except:
            return False
    
    async def _test_deployment_health(self) -> bool:
        """Test deployment health validation"""
        try:
            health_status = await self.enterprise_launch.deployment_automation.validate_deployment_health("production")
            
            # Validate health status structure
            required_keys = ["environment", "status", "checks", "timestamp"]
            for key in required_keys:
                if key not in health_status:
                    return False
            
            # Check if health checks are present
            if not health_status["checks"] or len(health_status["checks"]) == 0:
                return False
            
            return True
        except:
            return False
    
    async def _test_rollback_strategy(self) -> bool:
        """Test rollback strategy implementation"""
        try:
            # Test rollback strategy exists in deployment automation
            deployment_automation = self.enterprise_launch.deployment_automation
            
            # Check if rollback strategies are initialized
            if not hasattr(deployment_automation, 'rollback_strategies'):
                return False
            
            return True
        except:
            return False
    
    async def _test_api_gateway(self):
        """Test Advanced API Gateway component"""
        print("\n🌐 Testing Advanced API Gateway...")
        component = "api_gateway"
        
        tests = [
            ("API Gateway Initialization", self._test_api_gateway_init),
            ("Rate Limiting Implementation", self._test_rate_limiting),
            ("Security Policies Configuration", self._test_security_policies),
            ("API Gateway Metrics", self._test_api_metrics),
            ("Endpoint Protection Rules", self._test_endpoint_protection)
        ]
        
        for test_name, test_func in tests:
            try:
                result = await test_func()
                score = 5 if result else 0
                self.validation_results[component]["tests"].append({
                    "test": test_name,
                    "passed": result,
                    "score": score
                })
                self.validation_results[component]["score"] += score
                status = "✅ PASS" if result else "❌ FAIL"
                print(f"  {status} {test_name}")
            except Exception as e:
                print(f"  ❌ FAIL {test_name}: {str(e)}")
                self.validation_results[component]["tests"].append({
                    "test": test_name,
                    "passed": False,
                    "score": 0,
                    "error": str(e)
                })
    
    async def _test_api_gateway_init(self) -> bool:
        """Test API gateway initialization"""
        try:
            api_gateway = self.enterprise_launch.api_gateway
            
            # Check if gateway rules are initialized
            if not api_gateway.gateway_rules or len(api_gateway.gateway_rules) == 0:
                return False
            
            # Check if rate limit buckets are initialized
            if not hasattr(api_gateway, 'rate_limit_buckets'):
                return False
            
            return True
        except:
            return False
    
    async def _test_rate_limiting(self) -> bool:
        """Test rate limiting functionality"""
        try:
            # Test rate limiting for different endpoints
            test_cases = [
                ("/api/auth/login", "POST", "test_user_1"),
                ("/api/dashboard/security", "GET", "test_user_2"),
                ("/api/admin/users", "GET", "admin_user")
            ]
            
            for endpoint, method, user_id in test_cases:
                result = await self.enterprise_launch.api_gateway.apply_rate_limiting(endpoint, method, user_id)
                
                # Check if rate limiting result has required keys
                required_keys = ["allowed"]
                for key in required_keys:
                    if key not in result:
                        return False
            
            return True
        except:
            return False
    
    async def _test_security_policies(self) -> bool:
        """Test security policies configuration"""
        try:
            api_gateway = self.enterprise_launch.api_gateway
            
            # Check if security policies exist
            if not hasattr(api_gateway, 'security_policies'):
                return False
            
            # Check if auth-required endpoints exist
            auth_required_rules = [rule for rule in api_gateway.gateway_rules if rule.auth_required]
            if len(auth_required_rules) == 0:
                return False
            
            return True
        except:
            return False
    
    async def _test_api_metrics(self) -> bool:
        """Test API gateway metrics"""
        try:
            metrics = await self.enterprise_launch.api_gateway.get_api_gateway_metrics()
            
            # Validate metrics structure
            required_keys = ["total_rules", "active_rate_limits", "endpoints_protected", "timestamp"]
            for key in required_keys:
                if key not in metrics:
                    return False
            
            # Check if metrics have reasonable values
            if metrics["total_rules"] == 0:
                return False
            
            return True
        except:
            return False
    
    async def _test_endpoint_protection(self) -> bool:
        """Test endpoint protection rules"""
        try:
            api_gateway = self.enterprise_launch.api_gateway
            
            # Check if admin endpoints are protected
            admin_rules = [rule for rule in api_gateway.gateway_rules if "/admin" in rule.path]
            if not admin_rules:
                return False
            
            # Check if admin endpoints require authentication
            for rule in admin_rules:
                if not rule.auth_required:
                    return False
            
            return True
        except:
            return False
    
    async def _test_monitoring_alerting(self):
        """Test Production Monitoring & Alerting component"""
        print("\n📊 Testing Production Monitoring & Alerting...")
        component = "monitoring_alerting"
        
        tests = [
            ("Monitoring System Initialization", self._test_monitoring_init),
            ("System Metrics Collection", self._test_metrics_collection),
            ("Alert Configuration", self._test_alert_configuration),
            ("Alert Evaluation", self._test_alert_evaluation),
            ("Monitoring Dashboard", self._test_monitoring_dashboard)
        ]
        
        for test_name, test_func in tests:
            try:
                result = await test_func()
                score = 5 if result else 0
                self.validation_results[component]["tests"].append({
                    "test": test_name,
                    "passed": result,
                    "score": score
                })
                self.validation_results[component]["score"] += score
                status = "✅ PASS" if result else "❌ FAIL"
                print(f"  {status} {test_name}")
            except Exception as e:
                print(f"  ❌ FAIL {test_name}: {str(e)}")
                self.validation_results[component]["tests"].append({
                    "test": test_name,
                    "passed": False,
                    "score": 0,
                    "error": str(e)
                })
    
    async def _test_monitoring_init(self) -> bool:
        """Test monitoring system initialization"""
        try:
            monitoring = self.enterprise_launch.monitoring_alerting
            
            # Check if monitoring alerts are initialized
            if not monitoring.monitoring_alerts or len(monitoring.monitoring_alerts) == 0:
                return False
            
            # Check if notification channels are initialized
            if not monitoring.notification_channels or len(monitoring.notification_channels) == 0:
                return False
            
            return True
        except:
            return False
    
    async def _test_metrics_collection(self) -> bool:
        """Test system metrics collection"""
        try:
            metrics = await self.enterprise_launch.monitoring_alerting.collect_system_metrics()
            
            # Validate metrics structure
            required_keys = ["timestamp", "system", "application"]
            for key in required_keys:
                if key not in metrics:
                    return False
            
            # Check system metrics
            system_metrics = ["cpu_usage_percent", "memory_usage_percent", "disk_usage_percent"]
            for metric in system_metrics:
                if metric not in metrics["system"]:
                    return False
            
            return True
        except:
            return False
    
    async def _test_alert_configuration(self) -> bool:
        """Test alert configuration"""
        try:
            monitoring = self.enterprise_launch.monitoring_alerting
            
            # Check if critical alerts are configured
            critical_alerts = [alert for alert in monitoring.monitoring_alerts if alert.severity.value == "critical"]
            if len(critical_alerts) == 0:
                return False
            
            # Check if security alerts are configured
            security_alerts = [alert for alert in monitoring.monitoring_alerts if "security" in alert.name.lower() or "suspicious" in alert.name.lower()]
            if len(security_alerts) == 0:
                return False
            
            return True
        except:
            return False
    
    async def _test_alert_evaluation(self) -> bool:
        """Test alert evaluation"""
        try:
            # Collect metrics first
            await self.enterprise_launch.monitoring_alerting.collect_system_metrics()
            
            # Evaluate alerts
            alerts = await self.enterprise_launch.monitoring_alerting.evaluate_alerts()
            
            # Check if alert evaluation returns proper structure
            if not isinstance(alerts, list):
                return False
            
            return True
        except:
            return False
    
    async def _test_monitoring_dashboard(self) -> bool:
        """Test monitoring dashboard"""
        try:
            dashboard = await self.enterprise_launch.monitoring_alerting.get_monitoring_dashboard()
            
            # Validate dashboard structure
            required_keys = ["system_health", "current_metrics", "active_alerts", "timestamp"]
            for key in required_keys:
                if key not in dashboard:
                    return False
            
            # Check system health structure
            health_keys = ["overall_status", "active_alerts", "critical_alerts"]
            for key in health_keys:
                if key not in dashboard["system_health"]:
                    return False
            
            return True
        except:
            return False
    
    async def _test_launch_readiness(self):
        """Test Launch Readiness Assessment component"""
        print("\n🚀 Testing Launch Readiness Assessment...")
        component = "launch_readiness"
        
        tests = [
            ("Launch Assessment Initialization", self._test_launch_assessment_init),
            ("Readiness Checks Configuration", self._test_readiness_checks),
            ("Comprehensive Assessment", self._test_comprehensive_assessment),
            ("Category-based Evaluation", self._test_category_evaluation),
            ("Launch Recommendations", self._test_launch_recommendations)
        ]
        
        for test_name, test_func in tests:
            try:
                result = await test_func()
                score = 5 if result else 0
                self.validation_results[component]["tests"].append({
                    "test": test_name,
                    "passed": result,
                    "score": score
                })
                self.validation_results[component]["score"] += score
                status = "✅ PASS" if result else "❌ FAIL"
                print(f"  {status} {test_name}")
            except Exception as e:
                print(f"  ❌ FAIL {test_name}: {str(e)}")
                self.validation_results[component]["tests"].append({
                    "test": test_name,
                    "passed": False,
                    "score": 0,
                    "error": str(e)
                })
    
    async def _test_launch_assessment_init(self) -> bool:
        """Test launch assessment initialization"""
        try:
            launch_assessment = self.enterprise_launch.launch_assessment
            
            # Check if readiness checks are initialized
            if not launch_assessment.readiness_checks or len(launch_assessment.readiness_checks) == 0:
                return False
            
            # Check if assessment categories are initialized
            if not launch_assessment.assessment_categories or len(launch_assessment.assessment_categories) == 0:
                return False
            
            return True
        except:
            return False
    
    async def _test_readiness_checks(self) -> bool:
        """Test readiness checks configuration"""
        try:
            launch_assessment = self.enterprise_launch.launch_assessment
            
            # Check if required categories exist
            required_categories = ["security", "performance", "infrastructure", "application", "business"]
            for category in required_categories:
                if category not in launch_assessment.assessment_categories:
                    return False
            
            # Check if each category has checks
            for category, checks in launch_assessment.assessment_categories.items():
                if len(checks) == 0:
                    return False
            
            return True
        except:
            return False
    
    async def _test_comprehensive_assessment(self) -> bool:
        """Test comprehensive assessment"""
        try:
            assessment = await self.enterprise_launch.launch_assessment.run_comprehensive_assessment()
            
            # Validate assessment structure
            required_keys = ["overall_status", "total_score", "max_score", "percentage", "categories", "timestamp"]
            for key in required_keys:
                if key not in assessment:
                    return False
            
            # Check if percentage is calculated correctly
            if assessment["total_score"] == 0 or assessment["max_score"] == 0:
                return False
            
            expected_percentage = (assessment["total_score"] / assessment["max_score"]) * 100
            if abs(assessment["percentage"] - expected_percentage) > 0.1:
                return False
            
            return True
        except:
            return False
    
    async def _test_category_evaluation(self) -> bool:
        """Test category-based evaluation"""
        try:
            assessment = await self.enterprise_launch.launch_assessment.run_comprehensive_assessment()
            
            # Check if all required categories are evaluated
            required_categories = ["security", "performance", "infrastructure", "application", "business"]
            for category in required_categories:
                if category not in assessment["categories"]:
                    return False
                
                category_data = assessment["categories"][category]
                category_keys = ["score", "max_score", "percentage", "status", "checks"]
                for key in category_keys:
                    if key not in category_data:
                        return False
            
            return True
        except:
            return False
    
    async def _test_launch_recommendations(self) -> bool:
        """Test launch recommendations"""
        try:
            assessment = await self.enterprise_launch.launch_assessment.run_comprehensive_assessment()
            
            # Check if recommendations are provided
            if "recommendations" not in assessment:
                return False
            
            if not isinstance(assessment["recommendations"], list):
                return False
            
            # Should have at least one recommendation
            if len(assessment["recommendations"]) == 0:
                return False
            
            return True
        except:
            return False
    
    def _calculate_final_results(self):
        """Calculate final validation results"""
        self.total_score = sum(component["score"] for component in self.validation_results.values())
        
        print(f"\n📊 Validation Results Summary:")
        print("=" * 50)
        
        for component_name, component_data in self.validation_results.items():
            percentage = (component_data["score"] / component_data["max_score"]) * 100
            print(f"{component_name.replace('_', ' ').title()}: {component_data['score']}/{component_data['max_score']} ({percentage:.1f}%)")
        
        overall_percentage = (self.total_score / self.max_score) * 100
        print(f"\nOverall Score: {self.total_score}/{self.max_score} ({overall_percentage:.1f}%)")
        
        if overall_percentage >= 90:
            print("🎉 OUTSTANDING SUCCESS - Production Ready!")
        elif overall_percentage >= 80:
            print("✅ EXCELLENT - Minor improvements needed")
        elif overall_percentage >= 70:
            print("⚠️  GOOD - Some areas need attention")
        else:
            print("❌ NEEDS IMPROVEMENT - Significant work required")

async def main():
    """Main validation execution"""
    validator = Week4Day1Validator()
    results = await validator.run_validation()
    
    # Save results to file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"docs/project/week4_day1_validation_{timestamp}.json"
    
    with open(filename, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📄 Results saved to: {filename}")
    
    return results

if __name__ == "__main__":
    asyncio.run(main()) 