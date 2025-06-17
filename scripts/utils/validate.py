#!/usr/bin/env python3
"""
SecureNet Validation Utilities

Reusable validation functions for production readiness checks.
"""

import os
import sys
import asyncio
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from dotenv import load_dotenv

# Configure logging
logger = logging.getLogger(__name__)

class ValidationResult:
    """Container for validation results."""
    
    def __init__(self, name: str, success: bool, details: str = "", error: Optional[Exception] = None):
        self.name = name
        self.success = success
        self.details = details
        self.error = error
    
    def __str__(self):
        status = "✅" if self.success else "❌"
        return f"{status} {self.name}: {self.details}"

class SecureNetValidator:
    """Comprehensive validation suite for SecureNet production readiness."""
    
    def __init__(self, project_root: Optional[Path] = None):
        self.project_root = project_root or Path.cwd()
        self.results: List[ValidationResult] = []
        
        # Ensure project root is in Python path
        if str(self.project_root) not in sys.path:
            sys.path.insert(0, str(self.project_root))
        
        # Load environment variables
        env_file = self.project_root / '.env'
        if env_file.exists():
            load_dotenv(env_file)
    
    def add_result(self, result: ValidationResult):
        """Add a validation result."""
        self.results.append(result)
        logger.info(str(result))
    
    def validate_environment_config(self) -> ValidationResult:
        """Validate environment configuration."""
        try:
            required_vars = ['DATABASE_URL', 'JWT_SECRET_KEY', 'DEV_MODE']
            missing_vars = [var for var in required_vars if not os.getenv(var)]
            
            if missing_vars:
                return ValidationResult(
                    "Environment Config", 
                    False, 
                    f"Missing: {', '.join(missing_vars)}"
                )
            
            dev_mode = os.getenv('DEV_MODE', 'true').lower()
            if dev_mode not in ['false', '0']:
                return ValidationResult(
                    "Environment Config", 
                    False, 
                    f"DEV_MODE should be 'false', got '{dev_mode}'"
                )
            
            return ValidationResult(
                "Environment Config", 
                True, 
                f"All variables present, production mode"
            )
            
        except Exception as e:
            return ValidationResult("Environment Config", False, f"Error: {e}", e)
    
    async def validate_database_connectivity(self) -> ValidationResult:
        """Validate PostgreSQL database connectivity."""
        try:
            from database_factory import db
            await db.initialize()
            
            return ValidationResult(
                "Database Connectivity", 
                True, 
                "PostgreSQL connection successful"
            )
            
        except Exception as e:
            return ValidationResult("Database Connectivity", False, f"Error: {e}", e)
    
    async def validate_user_seeding(self) -> ValidationResult:
        """Validate that users are properly seeded."""
        try:
            from database_factory import db
            await db.initialize()
            
            expected_users = ['ceo', 'admin', 'user']
            found_users = []
            
            for username in expected_users:
                user = await db.get_user_by_username(username)
                if user:
                    role = user.get('role', 'unknown')
                    found_users.append(f"{username}({role})")
            
            if len(found_users) == len(expected_users):
                return ValidationResult(
                    "User Seeding", 
                    True, 
                    f"All users found: {', '.join(found_users)}"
                )
            else:
                return ValidationResult(
                    "User Seeding", 
                    False, 
                    f"Only found: {', '.join(found_users)}"
                )
                
        except Exception as e:
            return ValidationResult("User Seeding", False, f"Error: {e}", e)
    
    def validate_frontend_build(self) -> ValidationResult:
        """Validate frontend build status."""
        try:
            frontend_dir = self.project_root / "frontend"
            dist_dir = frontend_dir / "dist"
            
            if not dist_dir.exists():
                return ValidationResult(
                    "Frontend Build", 
                    False, 
                    "No dist directory - run 'npm run build'"
                )
            
            index_html = dist_dir / "index.html"
            if not index_html.exists():
                return ValidationResult(
                    "Frontend Build", 
                    False, 
                    "index.html not found in dist"
                )
            
            assets_dir = dist_dir / "assets"
            asset_count = len(list(assets_dir.glob("*"))) if assets_dir.exists() else 0
            
            return ValidationResult(
                "Frontend Build", 
                True, 
                f"Build artifacts present ({asset_count} assets)"
            )
            
        except Exception as e:
            return ValidationResult("Frontend Build", False, f"Error: {e}", e)
    
    def validate_app_imports(self) -> ValidationResult:
        """Validate that the FastAPI app can be imported."""
        try:
            from app import app
            route_count = len(app.routes)
            
            return ValidationResult(
                "App Imports", 
                True, 
                f"FastAPI app imported ({route_count} routes)"
            )
            
        except Exception as e:
            return ValidationResult("App Imports", False, f"Error: {e}", e)
    
    def validate_redis_connectivity(self) -> ValidationResult:
        """Validate Redis connectivity."""
        try:
            import redis
            redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
            
            if redis_url.startswith('redis://'):
                r = redis.from_url(redis_url)
            else:
                r = redis.Redis(host='localhost', port=6379, db=0)
            
            r.ping()
            return ValidationResult("Redis Connectivity", True, "Redis connection successful")
            
        except Exception as e:
            return ValidationResult("Redis Connectivity", False, f"Error: {e}", e)
    
    def validate_alembic_status(self) -> ValidationResult:
        """Validate Alembic migration status."""
        try:
            import subprocess
            
            result = subprocess.run(
                ["alembic", "current"],
                capture_output=True,
                text=True,
                timeout=10,
                cwd=self.project_root
            )
            
            if result.returncode == 0:
                current_rev = result.stdout.strip()
                if current_rev and ("head" in current_rev.lower() or len(current_rev) > 10):
                    return ValidationResult(
                        "Alembic Status", 
                        True, 
                        f"Migration status: {current_rev[:50]}"
                    )
                else:
                    return ValidationResult(
                        "Alembic Status", 
                        False, 
                        f"Unexpected revision: {current_rev}"
                    )
            else:
                return ValidationResult(
                    "Alembic Status", 
                    False, 
                    f"Alembic error: {result.stderr}"
                )
                
        except Exception as e:
            return ValidationResult("Alembic Status", False, f"Error: {e}", e)
    
    async def run_core_validations(self) -> Tuple[int, int]:
        """Run the core 5-point validation suite."""
        logger.info("🚀 Starting SecureNet Core Validation Suite")
        logger.info("=" * 60)
        
        # Core validations
        validations = [
            self.validate_environment_config(),
            await self.validate_database_connectivity(),
            await self.validate_user_seeding(),
            self.validate_frontend_build(),
            self.validate_app_imports(),
        ]
        
        # Add results
        for validation in validations:
            self.add_result(validation)
        
        passed = sum(1 for result in self.results if result.success)
        total = len(self.results)
        
        return passed, total
    
    async def run_extended_validations(self) -> Tuple[int, int]:
        """Run extended validation suite including Redis and Alembic."""
        # First run core validations
        passed, total = await self.run_core_validations()
        
        # Add extended validations
        extended_validations = [
            self.validate_redis_connectivity(),
            self.validate_alembic_status(),
        ]
        
        for validation in extended_validations:
            self.add_result(validation)
        
        passed = sum(1 for result in self.results if result.success)
        total = len(self.results)
        
        return passed, total
    
    def print_summary(self, passed: int, total: int) -> bool:
        """Print validation summary."""
        logger.info("=" * 60)
        logger.info("🎯 VALIDATION SUMMARY")
        logger.info("=" * 60)
        
        for result in self.results:
            status = "✅ PASS" if result.success else "❌ FAIL"
            logger.info(f"{status} {result.name}: {result.details}")
        
        logger.info("=" * 60)
        
        if passed == total:
            logger.info(f"🎉 ALL VALIDATIONS PASSED ({passed}/{total})")
            logger.info("✅ SecureNet is PRODUCTION READY!")
        else:
            logger.info(f"⚠️  VALIDATIONS FAILED ({passed}/{total} passed)")
            logger.info("❌ SecureNet is NOT ready for production")
        
        return passed == total
    
    def get_failed_validations(self) -> List[ValidationResult]:
        """Get list of failed validations."""
        return [result for result in self.results if not result.success]
    
    def get_success_rate(self) -> float:
        """Get validation success rate as percentage."""
        if not self.results:
            return 0.0
        
        passed = sum(1 for result in self.results if result.success)
        return (passed / len(self.results)) * 100.0

# Convenience functions for direct usage
async def validate_production_readiness(project_root: Optional[Path] = None) -> bool:
    """Quick production readiness check."""
    validator = SecureNetValidator(project_root)
    passed, total = await validator.run_core_validations()
    return validator.print_summary(passed, total)

async def validate_extended_readiness(project_root: Optional[Path] = None) -> bool:
    """Extended production readiness check."""
    validator = SecureNetValidator(project_root)
    passed, total = await validator.run_extended_validations()
    return validator.print_summary(passed, total) 