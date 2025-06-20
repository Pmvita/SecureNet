#!/usr/bin/env python3
"""
Week 4 Day 3 Validation Script: Advanced CI/CD Pipeline
Validates all Week 4 Day 3 components and measures success rate
"""

import sys
import os
import json
import time
import asyncio
from datetime import datetime

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from utils.week4_day3_advanced_cicd_pipeline import Week4Day3AdvancedCICDPipeline
except ImportError as e:
    print(f"❌ Import Error: {e}")
    print("Please ensure you're running from the project root directory")
    sys.exit(1)

class Week4Day3Validator:
    """Validation system for Week 4 Day 3 Advanced CI/CD Pipeline"""
    
    def __init__(self):
        self.total_points = 100
        self.earned_points = 0
        self.validation_results = {}
        
        # Component scoring (25 points each)
        self.component_scores = {
            "github_actions_workflow": 25,
            "security_scanning_integration": 25,
            "blue_green_deployment": 25,
            "rollback_automation": 25
        }
    
    async def validate_github_actions_workflow(self) -> int:
        """Validate GitHub Actions workflow creation (25 points)"""
        print("🔄 Validating GitHub Actions Workflow...")
        points = 0
        
        try:
            pipeline = Week4Day3AdvancedCICDPipeline()
            
            # Test GitHub Actions workflow creation
            workflow = pipeline.create_github_actions_workflow()
            if workflow and "jobs" in workflow:
                points += 8
                print("  ✅ GitHub Actions workflow structure created")
            
            # Test workflow jobs
            jobs = workflow.get("jobs", {})
            if len(jobs) >= 4:
                points += 6
                print(f"  ✅ Multiple workflow jobs configured ({len(jobs)} jobs)")
            
            # Test security scan job
            if "security-scan" in jobs:
                points += 5
                print("  ✅ Security scanning job included")
            
            # Test deployment jobs
            deployment_jobs = [job for job in jobs.keys() if "deploy" in job]
            if len(deployment_jobs) >= 2:
                points += 4
                print(f"  ✅ Multiple deployment environments ({len(deployment_jobs)} environments)")
            
            # Test workflow triggers
            if "on" in workflow and len(workflow["on"]) >= 2:
                points += 2
                print("  ✅ Multiple workflow triggers configured")
            
            self.validation_results["github_actions_workflow"] = {
                "points": points,
                "max_points": 25,
                "status": "✅ PASS" if points >= 20 else "⚠️ PARTIAL",
                "details": f"GitHub Actions workflow with {len(jobs)} jobs and {len(deployment_jobs)} deployment environments"
            }
            
        except Exception as e:
            print(f"  ❌ GitHub Actions workflow validation failed: {e}")
            self.validation_results["github_actions_workflow"] = {
                "points": 0,
                "max_points": 25,
                "status": "❌ FAIL",
                "error": str(e)
            }
        
        return points
    
    async def validate_security_scanning_integration(self) -> int:
        """Validate security scanning integration (25 points)"""
        print("🔒 Validating Security Scanning Integration...")
        points = 0
        
        try:
            pipeline = Week4Day3AdvancedCICDPipeline()
            
            # Test security scan execution
            scan_results = []
            scanners = ["semgrep", "bandit", "safety"]
            
            for scanner in scanners:
                scan_result = await pipeline.run_security_scan(scanner)
                scan_results.append(scan_result)
                if scan_result and scan_result.scanner == scanner:
                    points += 6
                    print(f"  ✅ {scanner} security scan executed successfully")
            
            # Test scan result analysis
            if scan_results and len(scan_results) >= 3:
                points += 4
                print(f"  ✅ Multiple security scanners integrated ({len(scan_results)} scanners)")
            
            # Test scan result validation
            passed_scans = sum(1 for result in scan_results if result.passed)
            if passed_scans >= 2:
                points += 3
                print(f"  ✅ Security scans validation: {passed_scans}/{len(scan_results)} passed")
            
            self.validation_results["security_scanning_integration"] = {
                "points": points,
                "max_points": 25,
                "status": "✅ PASS" if points >= 20 else "⚠️ PARTIAL",
                "details": f"Security scanning with {len(scan_results)} scanners, {passed_scans} passed"
            }
            
        except Exception as e:
            print(f"  ❌ Security scanning integration validation failed: {e}")
            self.validation_results["security_scanning_integration"] = {
                "points": 0,
                "max_points": 25,
                "status": "❌ FAIL",
                "error": str(e)
            }
        
        return points
    
    async def validate_blue_green_deployment(self) -> int:
        """Validate blue-green deployment implementation (25 points)"""
        print("🔄 Validating Blue-Green Deployment...")
        points = 0
        
        try:
            pipeline = Week4Day3AdvancedCICDPipeline()
            
            # Test deployment configuration creation
            config = pipeline.create_blue_green_deployment_config("production")
            if config and config.blue_green_enabled:
                points += 8
                print("  ✅ Blue-green deployment configuration created")
            
            # Test Kubernetes manifests creation
            manifests = pipeline.create_kubernetes_deployment_manifests()
            if manifests and len(manifests) >= 4:
                points += 6
                print(f"  ✅ Kubernetes manifests created ({len(manifests)} manifests)")
            
            # Test blue-green deployment execution
            deployment_result = pipeline.execute_blue_green_deployment("production", "v1.0.1")
            if deployment_result and deployment_result.deployment_id:
                points += 6
                print(f"  ✅ Blue-green deployment executed: {deployment_result.status}")
            
            # Test health checks
            if deployment_result and deployment_result.health_checks_passed is not None:
                points += 3
                print(f"  ✅ Health checks executed: {'PASS' if deployment_result.health_checks_passed else 'FAIL'}")
            
            # Test deployment timing
            if deployment_result and deployment_result.duration < 600:  # 10 minutes
                points += 2
                print(f"  ✅ Deployment completed within time limit: {deployment_result.duration:.1f}s")
            
            self.validation_results["blue_green_deployment"] = {
                "points": points,
                "max_points": 25,
                "status": "✅ PASS" if points >= 20 else "⚠️ PARTIAL",
                "details": f"Blue-green deployment with {len(manifests) if manifests else 0} K8s manifests, status: {deployment_result.status if deployment_result else 'unknown'}"
            }
            
        except Exception as e:
            print(f"  ❌ Blue-green deployment validation failed: {e}")
            self.validation_results["blue_green_deployment"] = {
                "points": 0,
                "max_points": 25,
                "status": "❌ FAIL",
                "error": str(e)
            }
        
        return points
    
    async def validate_rollback_automation(self) -> int:
        """Validate automated rollback procedures (25 points)"""
        print("🔄 Validating Rollback Automation...")
        points = 0
        
        try:
            pipeline = Week4Day3AdvancedCICDPipeline()
            
            # Test rollback configuration creation
            rollback_config = pipeline.create_rollback_automation()
            if rollback_config and "triggers" in rollback_config:
                points += 8
                print("  ✅ Rollback automation configuration created")
            
            # Test rollback triggers
            triggers = rollback_config.get("triggers", [])
            if len(triggers) >= 4:
                points += 6
                print(f"  ✅ Multiple rollback triggers configured ({len(triggers)} triggers)")
            
            # Test rollback steps
            steps = rollback_config.get("rollback_steps", [])
            if len(steps) >= 5:
                points += 5
                print(f"  ✅ Rollback steps defined ({len(steps)} steps)")
            
            # Test notification channels
            channels = rollback_config.get("notification_channels", [])
            if len(channels) >= 3:
                points += 4
                print(f"  ✅ Notification channels configured ({len(channels)} channels)")
            
            # Test deployment monitoring
            monitoring_config = pipeline.create_deployment_monitoring()
            if monitoring_config and "alerts" in monitoring_config:
                points += 2
                print("  ✅ Deployment monitoring configuration created")
            
            self.validation_results["rollback_automation"] = {
                "points": points,
                "max_points": 25,
                "status": "✅ PASS" if points >= 20 else "⚠️ PARTIAL",
                "details": f"Rollback automation with {len(triggers)} triggers, {len(steps)} steps, {len(channels)} notification channels"
            }
            
        except Exception as e:
            print(f"  ❌ Rollback automation validation failed: {e}")
            self.validation_results["rollback_automation"] = {
                "points": 0,
                "max_points": 25,
                "status": "❌ FAIL",
                "error": str(e)
            }
        
        return points
    
    async def run_comprehensive_validation(self) -> dict:
        """Run comprehensive validation of all Week 4 Day 3 components"""
        print("🚀 Week 4 Day 3 Validation: Advanced CI/CD Pipeline")
        print("=" * 80)
        
        start_time = time.time()
        
        # Run all validations
        workflow_points = await self.validate_github_actions_workflow()
        security_points = await self.validate_security_scanning_integration()
        deployment_points = await self.validate_blue_green_deployment()
        rollback_points = await self.validate_rollback_automation()
        
        # Calculate total score
        self.earned_points = workflow_points + security_points + deployment_points + rollback_points
        success_rate = (self.earned_points / self.total_points) * 100
        
        # Determine overall status
        if success_rate >= 90:
            status = "EXCELLENT"
        elif success_rate >= 80:
            status = "GOOD"
        elif success_rate >= 70:
            status = "SATISFACTORY"
        else:
            status = "NEEDS_IMPROVEMENT"
        
        # Create comprehensive results
        results = {
            "week": 4,
            "day": 3,
            "focus": "Advanced CI/CD Pipeline",
            "total_points": self.total_points,
            "earned_points": self.earned_points,
            "success_rate": success_rate,
            "status": status,
            "validation_time": time.time() - start_time,
            "timestamp": datetime.now().isoformat(),
            "components": self.validation_results,
            "summary": {
                "github_actions_workflow": f"{workflow_points}/25 points",
                "security_scanning_integration": f"{security_points}/25 points", 
                "blue_green_deployment": f"{deployment_points}/25 points",
                "rollback_automation": f"{rollback_points}/25 points"
            }
        }
        
        # Print results
        print(f"\n📊 Week 4 Day 3 Validation Results:")
        print(f"Overall Score: {self.earned_points}/{self.total_points} ({success_rate:.1f}%)")
        print(f"Status: {status}")
        print(f"Validation Time: {results['validation_time']:.2f} seconds")
        
        print(f"\n🎯 Component Breakdown:")
        for component, result in self.validation_results.items():
            print(f"  • {component}: {result['points']}/{result['max_points']} points - {result['status']}")
        
        # Save results
        results_file = f"week4_day3_validation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\n💾 Results saved to: {results_file}")
        
        return results

async def main():
    """Main validation execution"""
    try:
        validator = Week4Day3Validator()
        results = await validator.run_comprehensive_validation()
        
        # Print final status
        if results["success_rate"] >= 80:
            print(f"\n🎉 Week 4 Day 3 Advanced CI/CD Pipeline: SUCCESS!")
            print(f"✅ All major components operational with {results['success_rate']:.1f}% success rate")
        else:
            print(f"\n⚠️ Week 4 Day 3 Advanced CI/CD Pipeline: NEEDS ATTENTION")
            print(f"❌ Success rate: {results['success_rate']:.1f}% - Minimum 80% required")
        
        return results
        
    except Exception as e:
        print(f"❌ Validation failed with error: {e}")
        return {"error": str(e), "success_rate": 0}

if __name__ == "__main__":
    results = asyncio.run(main()) 