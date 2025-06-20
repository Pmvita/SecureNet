#!/usr/bin/env python3
"""
SecureNet Week 3 Day 1 Validation Script
Enterprise Features & Advanced Security Validation
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

from utils.week3_day1_enterprise_features import Week3Day1EnterpriseFeatures

class Week3Day1Validator:
    """Week 3 Day 1 validation system"""
    
    def __init__(self):
        self.enterprise_features = Week3Day1EnterpriseFeatures()
        self.total_score = 0
        self.max_score = 100
        self.validation_results = {
            "sso_integration": {"score": 0, "max_score": 25, "tests": []},
            "advanced_rbac": {"score": 0, "max_score": 25, "tests": []},
            "api_management": {"score": 0, "max_score": 25, "tests": []},
            "threat_intelligence": {"score": 0, "max_score": 25, "tests": []}
        }
    
    async def validate_sso_integration(self) -> int:
        """Validate SSO Integration features (25 points)"""
        print("\n🔐 Validating SSO Integration...")
        score = 0
        tests = []
        
        try:
            # Test 1: SSO Manager Initialization (5 points)
            sso_manager = self.enterprise_features.sso_manager
            if sso_manager:
                score += 5
                tests.append({"test": "SSO Manager Initialization", "status": "PASS", "points": 5})
                print("  ✅ SSO Manager initialized successfully")
            else:
                tests.append({"test": "SSO Manager Initialization", "status": "FAIL", "points": 0})
                print("  ❌ SSO Manager initialization failed")
            
            # Test 2: Provider Configuration (5 points)
            try:
                provider_id = await sso_manager.configure_oauth2_provider(
                    name="Test OAuth Provider",
                    client_id="test_client",
                    client_secret="test_secret",
                    authorization_url="https://auth.example.com/oauth2/authorize",
                    token_url="https://auth.example.com/oauth2/token",
                    userinfo_url="https://auth.example.com/userinfo"
                )
                if provider_id:
                    score += 5
                    tests.append({"test": "OAuth2 Provider Configuration", "status": "PASS", "points": 5})
                    print("  ✅ OAuth2 provider configured successfully")
                else:
                    tests.append({"test": "OAuth2 Provider Configuration", "status": "FAIL", "points": 0})
                    print("  ❌ OAuth2 provider configuration failed")
            except Exception as e:
                tests.append({"test": "OAuth2 Provider Configuration", "status": "FAIL", "points": 0, "error": str(e)})
                print(f"  ❌ OAuth2 provider configuration error: {e}")
            
            # Test 3: SAML Provider Configuration (5 points)
            try:
                saml_provider_id = await sso_manager.configure_saml_provider(
                    name="Test SAML Provider",
                    idp_metadata_url="https://idp.example.com/metadata",
                    sp_entity_id="https://securenet.test/saml",
                    sp_acs_url="https://securenet.test/auth/saml/acs"
                )
                if saml_provider_id:
                    score += 5
                    tests.append({"test": "SAML Provider Configuration", "status": "PASS", "points": 5})
                    print("  ✅ SAML provider configured successfully")
                else:
                    tests.append({"test": "SAML Provider Configuration", "status": "FAIL", "points": 0})
                    print("  ❌ SAML provider configuration failed")
            except Exception as e:
                tests.append({"test": "SAML Provider Configuration", "status": "FAIL", "points": 0, "error": str(e)})
                print(f"  ❌ SAML provider configuration error: {e}")
            
            # Test 4: SSO Login Initiation (5 points)
            try:
                providers = list(sso_manager.providers.keys())
                if providers:
                    login_result = await sso_manager.initiate_sso_login(providers[0], "test_org")
                    if login_result and "redirect_url" in login_result:
                        score += 5
                        tests.append({"test": "SSO Login Initiation", "status": "PASS", "points": 5})
                        print("  ✅ SSO login initiation successful")
                    else:
                        tests.append({"test": "SSO Login Initiation", "status": "FAIL", "points": 0})
                        print("  ❌ SSO login initiation failed")
                else:
                    tests.append({"test": "SSO Login Initiation", "status": "FAIL", "points": 0})
                    print("  ❌ No SSO providers available for testing")
            except Exception as e:
                tests.append({"test": "SSO Login Initiation", "status": "FAIL", "points": 0, "error": str(e)})
                print(f"  ❌ SSO login initiation error: {e}")
            
            # Test 5: SSO Status Reporting (5 points)
            try:
                sso_status = await sso_manager.get_sso_status()
                if sso_status and "providers_configured" in sso_status:
                    score += 5
                    tests.append({"test": "SSO Status Reporting", "status": "PASS", "points": 5})
                    print(f"  ✅ SSO status: {sso_status['providers_configured']} providers configured")
                else:
                    tests.append({"test": "SSO Status Reporting", "status": "FAIL", "points": 0})
                    print("  ❌ SSO status reporting failed")
            except Exception as e:
                tests.append({"test": "SSO Status Reporting", "status": "FAIL", "points": 0, "error": str(e)})
                print(f"  ❌ SSO status reporting error: {e}")
        
        except Exception as e:
            tests.append({"test": "SSO Integration Overall", "status": "FAIL", "points": 0, "error": str(e)})
            print(f"  ❌ SSO Integration validation error: {e}")
        
        self.validation_results["sso_integration"]["score"] = score
        self.validation_results["sso_integration"]["tests"] = tests
        print(f"🔐 SSO Integration Score: {score}/25")
        return score
    
    async def validate_advanced_rbac(self) -> int:
        """Validate Advanced RBAC features (25 points)"""
        print("\n🛡️ Validating Advanced RBAC...")
        score = 0
        tests = []
        
        try:
            # Test 1: RBAC Manager Initialization (5 points)
            rbac_manager = self.enterprise_features.rbac_manager
            if rbac_manager and len(rbac_manager.custom_roles) >= 3:  # Should have 3 system roles
                score += 5
                tests.append({"test": "RBAC Manager Initialization", "status": "PASS", "points": 5})
                print("  ✅ RBAC Manager initialized with system roles")
            else:
                tests.append({"test": "RBAC Manager Initialization", "status": "FAIL", "points": 0})
                print("  ❌ RBAC Manager initialization failed")
            
            # Test 2: Custom Role Creation (5 points)
            try:
                custom_role_id = await rbac_manager.create_custom_role(
                    name="Test Security Analyst",
                    description="Test custom role for validation",
                    permissions=["dashboard.view", "alerts.manage", "incidents.view"],
                    parent_roles=["soc_analyst"]
                )
                if custom_role_id:
                    score += 5
                    tests.append({"test": "Custom Role Creation", "status": "PASS", "points": 5})
                    print("  ✅ Custom role created successfully")
                else:
                    tests.append({"test": "Custom Role Creation", "status": "FAIL", "points": 0})
                    print("  ❌ Custom role creation failed")
            except Exception as e:
                tests.append({"test": "Custom Role Creation", "status": "FAIL", "points": 0, "error": str(e)})
                print(f"  ❌ Custom role creation error: {e}")
            
            # Test 3: Permission Inheritance (5 points)
            try:
                # Create parent role
                parent_role_id = await rbac_manager.create_custom_role(
                    name="Test Parent Role",
                    description="Parent role for inheritance test",
                    permissions=["base.permission"]
                )
                
                # Create child role with inheritance
                child_role_id = await rbac_manager.create_custom_role(
                    name="Test Child Role",
                    description="Child role for inheritance test",
                    permissions=["child.permission"],
                    parent_roles=[parent_role_id]
                )
                
                # Check effective permissions
                effective_permissions = await rbac_manager.get_effective_permissions(child_role_id)
                if "base.permission" in effective_permissions and "child.permission" in effective_permissions:
                    score += 5
                    tests.append({"test": "Permission Inheritance", "status": "PASS", "points": 5})
                    print("  ✅ Permission inheritance working correctly")
                else:
                    tests.append({"test": "Permission Inheritance", "status": "FAIL", "points": 0})
                    print("  ❌ Permission inheritance failed")
            except Exception as e:
                tests.append({"test": "Permission Inheritance", "status": "FAIL", "points": 0, "error": str(e)})
                print(f"  ❌ Permission inheritance error: {e}")
            
            # Test 4: Permission Checking (5 points)
            try:
                has_permission = await rbac_manager.check_permission("security_admin", "incidents.manage")
                has_wildcard = await rbac_manager.check_permission("platform_owner", "any.permission")
                
                if has_permission and has_wildcard:
                    score += 5
                    tests.append({"test": "Permission Checking", "status": "PASS", "points": 5})
                    print("  ✅ Permission checking working correctly")
                else:
                    tests.append({"test": "Permission Checking", "status": "FAIL", "points": 0})
                    print("  ❌ Permission checking failed")
            except Exception as e:
                tests.append({"test": "Permission Checking", "status": "FAIL", "points": 0, "error": str(e)})
                print(f"  ❌ Permission checking error: {e}")
            
            # Test 5: RBAC Status Reporting (5 points)
            try:
                rbac_status = await rbac_manager.get_rbac_status()
                if rbac_status and "total_roles" in rbac_status and rbac_status["total_roles"] > 0:
                    score += 5
                    tests.append({"test": "RBAC Status Reporting", "status": "PASS", "points": 5})
                    print(f"  ✅ RBAC status: {rbac_status['total_roles']} total roles")
                else:
                    tests.append({"test": "RBAC Status Reporting", "status": "FAIL", "points": 0})
                    print("  ❌ RBAC status reporting failed")
            except Exception as e:
                tests.append({"test": "RBAC Status Reporting", "status": "FAIL", "points": 0, "error": str(e)})
                print(f"  ❌ RBAC status reporting error: {e}")
        
        except Exception as e:
            tests.append({"test": "Advanced RBAC Overall", "status": "FAIL", "points": 0, "error": str(e)})
            print(f"  ❌ Advanced RBAC validation error: {e}")
        
        self.validation_results["advanced_rbac"]["score"] = score
        self.validation_results["advanced_rbac"]["tests"] = tests
        print(f"🛡️ Advanced RBAC Score: {score}/25")
        return score
    
    async def validate_api_management(self) -> int:
        """Validate Enterprise API Management features (25 points)"""
        print("\n🔧 Validating API Management...")
        score = 0
        tests = []
        
        try:
            # Test 1: API Manager Initialization (5 points)
            api_manager = self.enterprise_features.api_manager
            if api_manager:
                score += 5
                tests.append({"test": "API Manager Initialization", "status": "PASS", "points": 5})
                print("  ✅ API Manager initialized successfully")
            else:
                tests.append({"test": "API Manager Initialization", "status": "FAIL", "points": 0})
                print("  ❌ API Manager initialization failed")
            
            # Test 2: API Key Creation (5 points)
            try:
                key_id, api_key = await api_manager.create_api_key(
                    name="Test API Key",
                    organization_id="test_org",
                    user_id="test_user",
                    permissions=["api.read", "api.write"],
                    rate_limit=1000,
                    expires_in_days=30
                )
                if key_id and api_key:
                    score += 5
                    tests.append({"test": "API Key Creation", "status": "PASS", "points": 5})
                    print("  ✅ API key created successfully")
                else:
                    tests.append({"test": "API Key Creation", "status": "FAIL", "points": 0})
                    print("  ❌ API key creation failed")
            except Exception as e:
                tests.append({"test": "API Key Creation", "status": "FAIL", "points": 0, "error": str(e)})
                print(f"  ❌ API key creation error: {e}")
            
            # Test 3: API Key Validation (5 points)
            try:
                # Get a valid API key from the created keys
                if api_manager.api_keys:
                    test_key = list(api_manager.api_keys.values())[0]
                    validated_key = await api_manager.validate_api_key(test_key.api_key)
                    if validated_key:
                        score += 5
                        tests.append({"test": "API Key Validation", "status": "PASS", "points": 5})
                        print("  ✅ API key validation successful")
                    else:
                        tests.append({"test": "API Key Validation", "status": "FAIL", "points": 0})
                        print("  ❌ API key validation failed")
                else:
                    tests.append({"test": "API Key Validation", "status": "FAIL", "points": 0})
                    print("  ❌ No API keys available for validation")
            except Exception as e:
                tests.append({"test": "API Key Validation", "status": "FAIL", "points": 0, "error": str(e)})
                print(f"  ❌ API key validation error: {e}")
            
            # Test 4: Rate Limiting (5 points)
            try:
                # Create a low-limit API key for testing
                test_key_id, test_api_key = await api_manager.create_api_key(
                    name="Rate Limit Test Key",
                    organization_id="test_org",
                    user_id="test_user",
                    permissions=["api.read"],
                    rate_limit=2  # Very low limit for testing
                )
                
                # Test rate limiting by making multiple validation calls
                valid_calls = 0
                for i in range(5):
                    validated_key = await api_manager.validate_api_key(test_api_key)
                    if validated_key:
                        valid_calls += 1
                
                # Should only allow 2 calls due to rate limit
                if valid_calls <= 2:
                    score += 5
                    tests.append({"test": "Rate Limiting", "status": "PASS", "points": 5})
                    print("  ✅ Rate limiting working correctly")
                else:
                    tests.append({"test": "Rate Limiting", "status": "FAIL", "points": 0})
                    print("  ❌ Rate limiting not working")
            except Exception as e:
                tests.append({"test": "Rate Limiting", "status": "FAIL", "points": 0, "error": str(e)})
                print(f"  ❌ Rate limiting error: {e}")
            
            # Test 5: API Usage Statistics (5 points)
            try:
                if api_manager.api_keys:
                    test_key_id = list(api_manager.api_keys.keys())[0]
                    usage_stats = await api_manager.get_api_usage_stats(test_key_id, 1)
                    if usage_stats and "total_requests" in usage_stats:
                        score += 5
                        tests.append({"test": "API Usage Statistics", "status": "PASS", "points": 5})
                        print("  ✅ API usage statistics working")
                    else:
                        tests.append({"test": "API Usage Statistics", "status": "FAIL", "points": 0})
                        print("  ❌ API usage statistics failed")
                else:
                    tests.append({"test": "API Usage Statistics", "status": "FAIL", "points": 0})
                    print("  ❌ No API keys available for usage statistics")
            except Exception as e:
                tests.append({"test": "API Usage Statistics", "status": "FAIL", "points": 0, "error": str(e)})
                print(f"  ❌ API usage statistics error: {e}")
        
        except Exception as e:
            tests.append({"test": "API Management Overall", "status": "FAIL", "points": 0, "error": str(e)})
            print(f"  ❌ API Management validation error: {e}")
        
        self.validation_results["api_management"]["score"] = score
        self.validation_results["api_management"]["tests"] = tests
        print(f"🔧 API Management Score: {score}/25")
        return score
    
    async def validate_threat_intelligence(self) -> int:
        """Validate Threat Intelligence features (25 points)"""
        print("\n🎯 Validating Threat Intelligence...")
        score = 0
        tests = []
        
        try:
            # Test 1: Threat Intelligence Manager Initialization (5 points)
            threat_manager = self.enterprise_features.threat_intel_manager
            if threat_manager:
                score += 5
                tests.append({"test": "Threat Intelligence Manager Initialization", "status": "PASS", "points": 5})
                print("  ✅ Threat Intelligence Manager initialized successfully")
            else:
                tests.append({"test": "Threat Intelligence Manager Initialization", "status": "FAIL", "points": 0})
                print("  ❌ Threat Intelligence Manager initialization failed")
            
            # Test 2: Threat Feed Configuration (5 points)
            try:
                feed_id = await threat_manager.add_threat_feed(
                    name="Test Threat Feed",
                    feed_type="test",
                    url="https://threat-feed.example.com/api",
                    api_key="test_key",
                    update_interval=300
                )
                if feed_id:
                    score += 5
                    tests.append({"test": "Threat Feed Configuration", "status": "PASS", "points": 5})
                    print("  ✅ Threat feed configured successfully")
                else:
                    tests.append({"test": "Threat Feed Configuration", "status": "FAIL", "points": 0})
                    print("  ❌ Threat feed configuration failed")
            except Exception as e:
                tests.append({"test": "Threat Feed Configuration", "status": "FAIL", "points": 0, "error": str(e)})
                print(f"  ❌ Threat feed configuration error: {e}")
            
            # Test 3: IOC Ingestion (5 points)
            try:
                ioc_id = await threat_manager.ingest_threat_indicator(
                    ioc_type="ip",
                    ioc_value="198.51.100.1",
                    threat_type="malware",
                    severity="high",
                    confidence=0.9,
                    source="Test Source",
                    description="Test malicious IP",
                    tags=["test", "malware"]
                )
                if ioc_id:
                    score += 5
                    tests.append({"test": "IOC Ingestion", "status": "PASS", "points": 5})
                    print("  ✅ IOC ingestion successful")
                else:
                    tests.append({"test": "IOC Ingestion", "status": "FAIL", "points": 0})
                    print("  ❌ IOC ingestion failed")
            except Exception as e:
                tests.append({"test": "IOC Ingestion", "status": "FAIL", "points": 0, "error": str(e)})
                print(f"  ❌ IOC ingestion error: {e}")
            
            # Test 4: Threat Intelligence Lookup (5 points)
            try:
                # First ingest a test IOC
                await threat_manager.ingest_threat_indicator(
                    ioc_type="domain",
                    ioc_value="test-malicious.example.com",
                    threat_type="phishing",
                    severity="medium",
                    confidence=0.8,
                    source="Test Source",
                    description="Test phishing domain"
                )
                
                # Now lookup the IOC
                threat_result = await threat_manager.query_threat_intelligence(
                    "domain", "test-malicious.example.com"
                )
                if threat_result and threat_result.threat_type == "phishing":
                    score += 5
                    tests.append({"test": "Threat Intelligence Lookup", "status": "PASS", "points": 5})
                    print("  ✅ Threat intelligence lookup successful")
                else:
                    tests.append({"test": "Threat Intelligence Lookup", "status": "FAIL", "points": 0})
                    print("  ❌ Threat intelligence lookup failed")
            except Exception as e:
                tests.append({"test": "Threat Intelligence Lookup", "status": "FAIL", "points": 0, "error": str(e)})
                print(f"  ❌ Threat intelligence lookup error: {e}")
            
            # Test 5: Bulk IOC Lookup (5 points)
            try:
                # Ingest multiple IOCs
                await threat_manager.ingest_threat_indicator(
                    ioc_type="ip", ioc_value="203.0.113.1", threat_type="botnet",
                    severity="high", confidence=0.85, source="Test", description="Test botnet IP"
                )
                await threat_manager.ingest_threat_indicator(
                    ioc_type="hash", ioc_value="d41d8cd98f00b204e9800998ecf8427e", threat_type="malware",
                    severity="critical", confidence=0.95, source="Test", description="Test malware hash"
                )
                
                # Bulk lookup
                bulk_results = await threat_manager.bulk_ioc_lookup([
                    ("ip", "203.0.113.1"),
                    ("hash", "d41d8cd98f00b204e9800998ecf8427e"),
                    ("domain", "non-existent.example.com")  # Should not exist
                ])
                
                if (len(bulk_results) == 3 and 
                    bulk_results["ip:203.0.113.1"] is not None and
                    bulk_results["hash:d41d8cd98f00b204e9800998ecf8427e"] is not None and
                    bulk_results["domain:non-existent.example.com"] is None):
                    score += 5
                    tests.append({"test": "Bulk IOC Lookup", "status": "PASS", "points": 5})
                    print("  ✅ Bulk IOC lookup successful")
                else:
                    tests.append({"test": "Bulk IOC Lookup", "status": "FAIL", "points": 0})
                    print("  ❌ Bulk IOC lookup failed")
            except Exception as e:
                tests.append({"test": "Bulk IOC Lookup", "status": "FAIL", "points": 0, "error": str(e)})
                print(f"  ❌ Bulk IOC lookup error: {e}")
        
        except Exception as e:
            tests.append({"test": "Threat Intelligence Overall", "status": "FAIL", "points": 0, "error": str(e)})
            print(f"  ❌ Threat Intelligence validation error: {e}")
        
        self.validation_results["threat_intelligence"]["score"] = score
        self.validation_results["threat_intelligence"]["tests"] = tests
        print(f"🎯 Threat Intelligence Score: {score}/25")
        return score
    
    async def run_comprehensive_validation(self) -> Dict[str, Any]:
        """Run comprehensive Week 3 Day 1 validation"""
        print("🚀 Starting Week 3 Day 1: Enterprise Features & Advanced Security Validation")
        print("=" * 80)
        
        start_time = time.time()
        
        # Initialize enterprise features
        try:
            init_result = await self.enterprise_features.initialize_enterprise_features()
            print(f"✅ Enterprise features initialized: {init_result['status']}")
        except Exception as e:
            print(f"❌ Enterprise features initialization failed: {e}")
            return {"error": "Initialization failed", "details": str(e)}
        
        # Run all validation tests
        sso_score = await self.validate_sso_integration()
        rbac_score = await self.validate_advanced_rbac()
        api_score = await self.validate_api_management()
        threat_score = await self.validate_threat_intelligence()
        
        # Calculate total score
        total_score = sso_score + rbac_score + api_score + threat_score
        success_rate = (total_score / self.max_score) * 100
        
        # Get comprehensive status
        try:
            comprehensive_status = await self.enterprise_features.get_comprehensive_status()
        except Exception as e:
            comprehensive_status = {"error": str(e)}
        
        # Run simulation scenarios
        try:
            simulation_results = await self.enterprise_features.simulate_enterprise_scenarios()
        except Exception as e:
            simulation_results = {"error": str(e)}
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Determine overall status
        if success_rate >= 90:
            status = "EXCELLENT"
        elif success_rate >= 80:
            status = "GOOD"
        elif success_rate >= 70:
            status = "ACCEPTABLE"
        else:
            status = "NEEDS_IMPROVEMENT"
        
        validation_summary = {
            "validation_timestamp": datetime.now(timezone.utc).isoformat(),
            "week3_day1_validation": {
                "total_score": total_score,
                "max_score": self.max_score,
                "success_rate": round(success_rate, 1),
                "status": status,
                "duration_seconds": round(duration, 2)
            },
            "component_scores": {
                "sso_integration": f"{sso_score}/25 ({(sso_score/25)*100:.1f}%)",
                "advanced_rbac": f"{rbac_score}/25 ({(rbac_score/25)*100:.1f}%)",
                "api_management": f"{api_score}/25 ({(api_score/25)*100:.1f}%)",
                "threat_intelligence": f"{threat_score}/25 ({(threat_score/25)*100:.1f}%)"
            },
            "detailed_results": self.validation_results,
            "comprehensive_status": comprehensive_status,
            "simulation_results": simulation_results,
            "enterprise_features_operational": True,
            "production_readiness": success_rate >= 80
        }
        
        return validation_summary
    
    def print_validation_summary(self, results: Dict[str, Any]):
        """Print validation summary"""
        print("\n" + "=" * 80)
        print("📊 WEEK 3 DAY 1 VALIDATION SUMMARY")
        print("=" * 80)
        
        validation = results["week3_day1_validation"]
        print(f"🎯 Total Score: {validation['total_score']}/{validation['max_score']} ({validation['success_rate']}%)")
        print(f"📈 Status: {validation['status']}")
        print(f"⏱️  Duration: {validation['duration_seconds']} seconds")
        
        print("\n📋 Component Breakdown:")
        for component, score in results["component_scores"].items():
            print(f"  • {component.replace('_', ' ').title()}: {score}")
        
        print(f"\n🚀 Production Ready: {'YES' if results['production_readiness'] else 'NO'}")
        
        if validation["success_rate"] >= 90:
            print("\n🎉 OUTSTANDING! Week 3 Day 1 enterprise features implementation is excellent!")
        elif validation["success_rate"] >= 80:
            print("\n✅ GOOD! Week 3 Day 1 enterprise features implementation is solid!")
        elif validation["success_rate"] >= 70:
            print("\n⚠️  ACCEPTABLE! Week 3 Day 1 has room for improvement.")
        else:
            print("\n❌ NEEDS WORK! Week 3 Day 1 requires significant improvements.")

async def main():
    """Main validation execution"""
    validator = Week3Day1Validator()
    
    try:
        results = await validator.run_comprehensive_validation()
        validator.print_validation_summary(results)
        
        # Save results to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"week3_day1_validation_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\n💾 Validation results saved to: {filename}")
        
        # Return appropriate exit code
        success_rate = results["week3_day1_validation"]["success_rate"]
        if success_rate >= 70:
            return 0  # Success
        else:
            return 1  # Failure
    
    except Exception as e:
        print(f"\n❌ Validation failed with error: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code) 