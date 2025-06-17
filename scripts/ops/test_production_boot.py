#!/usr/bin/env python3
"""
SecureNet Enterprise Production Boot Test v2.2.0-enterprise
===========================================================

Comprehensive production readiness validation and boot testing for SecureNet
Holdings enterprise deployment. This script validates all critical components
required for enterprise-grade production deployment.

Usage:
    python scripts/ops/test_production_boot.py
    python scripts/ops/test_production_boot.py --quick
    python scripts/ops/test_production_boot.py --enterprise-only
"""

import os
import sys
import asyncio
import subprocess
import time
import requests
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent))

class ProductionBootTest:
    """Enterprise production boot validation and testing"""
    
    def __init__(self):
        self.test_results = {}
        self.start_time = datetime.now()
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages with timestamps"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        prefix = "🔍" if level == "INFO" else "✅" if level == "SUCCESS" else "❌" if level == "ERROR" else "⚠️"
        print(f"[{timestamp}] {prefix} {message}")
    
    def test_start_enterprise_exists(self) -> bool:
        """Test that start_enterprise.py exists and is executable"""
        self.log("Testing start_enterprise.py entrypoint...")
        
        start_enterprise_path = Path("start_enterprise.py")
        if not start_enterprise_path.exists():
            self.log("start_enterprise.py not found", "ERROR")
            return False
        
        # Check if file contains required components
        content = start_enterprise_path.read_text()
        required_components = [
            "class EnterpriseStartup",
            "SecureNet Holdings",
            "uvicorn.run",
            "load_dotenv",
            "--check"
        ]
        
        for component in required_components:
            if component not in content:
                self.log(f"Missing required component: {component}", "ERROR")
                return False
        
        self.log("start_enterprise.py validated", "SUCCESS")
        return True
    
    def test_enterprise_validation(self) -> bool:
        """Test enterprise startup validation"""
        self.log("Testing enterprise validation...")
        
        try:
            result = subprocess.run(
                [sys.executable, "start_enterprise.py", "--check"],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                self.log("Enterprise validation passed", "SUCCESS")
                return True
            else:
                self.log(f"Enterprise validation failed: {result.stderr}", "ERROR")
                return False
                
        except subprocess.TimeoutExpired:
            self.log("Enterprise validation timed out", "ERROR")
            return False
        except Exception as e:
            self.log(f"Enterprise validation error: {e}", "ERROR")
            return False
    
    def test_role_validation(self) -> bool:
        """Test enterprise role structure validation"""
        self.log("Testing enterprise role validation...")
        
        try:
            result = subprocess.run(
                [sys.executable, "start_enterprise.py", "--validate-roles"],
                capture_output=True,
                text=True,
                timeout=15
            )
            
            if result.returncode == 0:
                self.log("Enterprise role validation passed", "SUCCESS")
                return True
            else:
                self.log("Enterprise role validation failed", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"Role validation error: {e}", "ERROR")
            return False
    
    def test_compliance_audit(self) -> bool:
        """Test compliance audit validation"""
        self.log("Testing compliance audit...")
        
        try:
            result = subprocess.run(
                [sys.executable, "start_enterprise.py", "--compliance-audit"],
                capture_output=True,
                text=True,
                timeout=15
            )
            
            if result.returncode == 0:
                self.log("Compliance audit passed", "SUCCESS")
                return True
            else:
                self.log("Compliance audit failed", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"Compliance audit error: {e}", "ERROR")
            return False
    
    def test_frontend_build(self) -> bool:
        """Test frontend production build"""
        self.log("Testing frontend production build...")
        
        frontend_dir = Path("frontend")
        if not frontend_dir.exists():
            self.log("Frontend directory not found", "ERROR")
            return False
        
        try:
            # Check if package.json exists
            package_json = frontend_dir / "package.json"
            if not package_json.exists():
                self.log("package.json not found", "ERROR")
                return False
            
            # Check if node_modules exists, if not run npm install
            node_modules = frontend_dir / "node_modules"
            if not node_modules.exists():
                self.log("Installing frontend dependencies...")
                subprocess.run(
                    ["npm", "install"],
                    cwd=frontend_dir,
                    check=True,
                    capture_output=True
                )
            
            # Run production build
            self.log("Building frontend for production...")
            result = subprocess.run(
                ["npm", "run", "build"],
                cwd=frontend_dir,
                capture_output=True,
                text=True,
                timeout=120
            )
            
            if result.returncode == 0:
                # Check if dist directory was created
                dist_dir = frontend_dir / "dist"
                if dist_dir.exists():
                    self.log("Frontend production build successful", "SUCCESS")
                    return True
                else:
                    self.log("Frontend build completed but dist directory not found", "ERROR")
                    return False
            else:
                self.log(f"Frontend build failed: {result.stderr}", "ERROR")
                return False
                
        except subprocess.TimeoutExpired:
            self.log("Frontend build timed out", "ERROR")
            return False
        except Exception as e:
            self.log(f"Frontend build error: {e}", "ERROR")
            return False
    
    def test_typescript_config(self) -> bool:
        """Test TypeScript configuration"""
        self.log("Testing TypeScript configuration...")
        
        tsconfig_path = Path("frontend/tsconfig.json")
        if not tsconfig_path.exists():
            self.log("tsconfig.json not found", "ERROR")
            return False
        
        try:
            import json
            with open(tsconfig_path) as f:
                tsconfig = json.load(f)
            
            # Check for required TypeScript settings
            compiler_options = tsconfig.get("compilerOptions", {})
            required_settings = {
                "strict": True,
                "esModuleInterop": True
            }
            
            for setting, expected_value in required_settings.items():
                if setting not in compiler_options:
                    self.log(f"Missing TypeScript setting: {setting}", "ERROR")
                    return False
                if compiler_options[setting] != expected_value:
                    self.log(f"Incorrect TypeScript setting {setting}: expected {expected_value}, got {compiler_options[setting]}", "ERROR")
                    return False
            
            self.log("TypeScript configuration validated", "SUCCESS")
            return True
            
        except Exception as e:
            self.log(f"TypeScript config validation error: {e}", "ERROR")
            return False
    
    def test_documentation_compliance(self) -> bool:
        """Test documentation compliance"""
        self.log("Testing documentation compliance...")
        
        # Check main README.md
        readme_path = Path("README.md")
        if not readme_path.exists():
            self.log("README.md not found", "ERROR")
            return False
        
        readme_content = readme_path.read_text()
        main_readme_requirements = [
            "start_enterprise.py",
            "Production startup",
            "CI/CD validation",
            "Health check endpoints",
            "Enterprise deployment"
        ]
        
        for requirement in main_readme_requirements:
            if requirement not in readme_content:
                self.log(f"README.md missing required content: {requirement}", "ERROR")
                return False
        
        # Check scripts README
        scripts_readme_path = Path("scripts/README.md")
        if not scripts_readme_path.exists():
            self.log("scripts/README.md not found", "ERROR")
            return False
        
        scripts_readme_content = scripts_readme_path.read_text()
        scripts_readme_requirements = [
            "start_enterprise.py",
            "Health endpoints",
            "Exit codes",
            "Validation CLI"
        ]
        
        for requirement in scripts_readme_requirements:
            if requirement not in scripts_readme_content:
                self.log(f"scripts/README.md missing required content: {requirement}", "ERROR")
                return False
        
        self.log("Documentation compliance validated", "SUCCESS")
        return True
    
    def test_enterprise_files_exist(self) -> bool:
        """Test that required enterprise files exist"""
        self.log("Testing enterprise documentation files...")
        
        required_files = [
            "docs/audit/FINAL_AUDIT_REPORT.md",
            "docs/certification/ENTERPRISE_CERTIFICATION.md", 
            "docs/release/RELEASE_NOTES_v2.2.0-enterprise.md"
        ]
        
        for file_path in required_files:
            if not Path(file_path).exists():
                self.log(f"Required enterprise file missing: {file_path}", "ERROR")
                return False
        
        self.log("Enterprise documentation files validated", "SUCCESS")
        return True
    
    def test_production_server_startup(self) -> bool:
        """Test that production server can start (with timeout)"""
        self.log("Testing production server startup...")
        
        try:
            # Start server in background
            process = subprocess.Popen(
                [sys.executable, "start_enterprise.py", "--host", "127.0.0.1", "--port", "8001"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Wait a bit for server to start
            time.sleep(10)
            
            # Test health endpoint
            try:
                response = requests.get("http://127.0.0.1:8001/api/health", timeout=5)
                if response.status_code == 200:
                    self.log("Production server startup successful", "SUCCESS")
                    success = True
                else:
                    self.log(f"Health check failed: {response.status_code}", "ERROR")
                    success = False
            except requests.RequestException as e:
                self.log(f"Health check request failed: {e}", "ERROR")
                success = False
            
            # Clean up: terminate the server
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
            
            return success
            
        except Exception as e:
            self.log(f"Server startup test error: {e}", "ERROR")
            return False
    
    def test_exit_codes(self) -> bool:
        """Test that scripts return proper exit codes"""
        self.log("Testing exit codes...")
        
        # Test successful validation returns 0
        try:
            result = subprocess.run(
                [sys.executable, "start_enterprise.py", "--validate-roles"],
                capture_output=True,
                timeout=15
            )
            
            if result.returncode == 0:
                self.log("Exit codes validated", "SUCCESS")
                return True
            else:
                self.log(f"Unexpected exit code: {result.returncode}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"Exit code test error: {e}", "ERROR")
            return False
    
    async def run_comprehensive_test(self, quick_mode: bool = False, enterprise_only: bool = False) -> Dict[str, bool]:
        """Run comprehensive production boot tests"""
        self.log("🚀 Starting SecureNet Enterprise Production Boot Test")
        self.log("=" * 60)
        
        # Define test suite
        tests = [
            ("start_enterprise.py exists", self.test_start_enterprise_exists),
            ("Enterprise validation", self.test_enterprise_validation),
            ("Role validation", self.test_role_validation),
            ("Compliance audit", self.test_compliance_audit),
            ("Documentation compliance", self.test_documentation_compliance),
            ("Enterprise files exist", self.test_enterprise_files_exist),
            ("Exit codes", self.test_exit_codes)
        ]
        
        if not enterprise_only:
            tests.extend([
                ("TypeScript config", self.test_typescript_config),
                ("Frontend build", self.test_frontend_build),
            ])
        
        if not quick_mode:
            tests.append(("Production server startup", self.test_production_server_startup))
        
        # Run tests
        results = {}
        passed = 0
        
        for test_name, test_func in tests:
            self.log(f"Running: {test_name}")
            try:
                result = await asyncio.to_thread(test_func) if asyncio.iscoroutinefunction(test_func) else test_func()
                results[test_name] = result
                if result:
                    passed += 1
            except Exception as e:
                self.log(f"Test {test_name} failed with exception: {e}", "ERROR")
                results[test_name] = False
        
        # Summary
        total = len(tests)
        duration = datetime.now() - self.start_time
        
        self.log("=" * 60)
        self.log(f"TEST SUMMARY: {passed}/{total} tests passed")
        self.log(f"Duration: {duration.total_seconds():.2f} seconds")
        
        if passed == total:
            self.log("🎉 ALL PRODUCTION BOOT TESTS PASSED!", "SUCCESS")
            self.log("✅ SecureNet v2.2.0-enterprise is PRODUCTION READY")
        else:
            self.log("💥 SOME TESTS FAILED", "ERROR")
            for test_name, result in results.items():
                if not result:
                    self.log(f"❌ FAILED: {test_name}")
        
        return results

async def main():
    """Main test runner"""
    import argparse
    
    parser = argparse.ArgumentParser(description="SecureNet Enterprise Production Boot Test")
    parser.add_argument("--quick", action="store_true", help="Skip server startup test")
    parser.add_argument("--enterprise-only", action="store_true", help="Run enterprise tests only")
    
    args = parser.parse_args()
    
    tester = ProductionBootTest()
    results = await tester.run_comprehensive_test(
        quick_mode=args.quick,
        enterprise_only=args.enterprise_only
    )
    
    # Exit with appropriate code
    all_passed = all(results.values())
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    asyncio.run(main()) 