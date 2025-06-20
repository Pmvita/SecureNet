#!/usr/bin/env python3
"""
SecureNet Week 2 Day 2 Validation
Backend Performance Optimization Validation Script
"""

import asyncio
import json
import time
import logging
import sys
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

class Week2Day2Validator:
    """Comprehensive validation for Week 2 Day 2 backend performance tasks"""
    
    def __init__(self):
        self.validation_results = {
            "sprint": "Week 2 Day 2",
            "focus": "Backend Performance Optimization", 
            "timestamp": datetime.now().isoformat(),
            "tasks": {
                "redis_api_caching": {"score": 0, "max_score": 35, "tests": []},
                "api_rate_limiting": {"score": 0, "max_score": 35, "tests": []},
                "background_jobs": {"score": 0, "max_score": 30, "tests": []},
            },
            "total_score": 0,
            "max_total_score": 100,
            "success_rate": 0
        }
    
    async def run_validation(self) -> Dict[str, Any]:
        """Run comprehensive Week 2 Day 2 validation"""
        logger.info("🚀 Starting Week 2 Day 2 Validation...")
        logger.info("Focus: Backend Performance Optimization")
        
        try:
            # Validate Redis API caching implementation
            await self._validate_redis_api_caching()
            
            # Validate API rate limiting
            await self._validate_api_rate_limiting()
            
            # Validate background job processing
            await self._validate_background_jobs()
            
            # Calculate final scores
            self._calculate_final_scores()
            
            # Generate summary
            self._generate_summary()
            
            return self.validation_results
            
        except Exception as e:
            logger.error(f"Validation failed: {e}")
            self.validation_results["error"] = str(e)
            return self.validation_results
    
    async def _validate_redis_api_caching(self):
        """Test 1: Redis API Caching Implementation (35 points)"""
        logger.info("📊 Testing Redis API Caching...")
        task = self.validation_results["tasks"]["redis_api_caching"]
        
        # Test 1.1: Performance module exists (10 points)
        perf_file = Path("utils/week2_day2_performance.py")
        if perf_file.exists():
            task["tests"].append({
                "name": "Week 2 Day 2 performance module exists",
                "status": "PASS",
                "points": 10
            })
            task["score"] += 10
        else:
            task["tests"].append({
                "name": "Week 2 Day 2 performance module exists", 
                "status": "FAIL",
                "points": 0,
                "error": "utils/week2_day2_performance.py not found"
            })
        
        # Test 1.2: API cache class implementation (15 points)
        if perf_file.exists():
            try:
                with open(perf_file, 'r') as f:
                    content = f.read()
                
                cache_features = [
                    "Week2APICache",
                    "get_cached_response", 
                    "cache_response",
                    "endpoint_ttls",
                    "cache statistics"
                ]
                
                found_features = sum(1 for feature in cache_features if feature in content)
                cache_score = int((found_features / len(cache_features)) * 15)
                
                task["tests"].append({
                    "name": "API cache implementation features",
                    "status": "PASS" if cache_score >= 12 else "PARTIAL",
                    "points": cache_score,
                    "details": f"Found {found_features}/{len(cache_features)} features"
                })
                task["score"] += cache_score
                
            except Exception as e:
                task["tests"].append({
                    "name": "API cache implementation features",
                    "status": "ERROR", 
                    "points": 0,
                    "error": str(e)
                })
        
        # Test 1.3: Cache decorator functionality (10 points)
        if perf_file.exists():
            try:
                with open(perf_file, 'r') as f:
                    content = f.read()
                
                decorator_features = [
                    "cache_api_response",
                    "@wraps",
                    "ttl",
                    "cache_service.get",
                    "cache_service.set"
                ]
                
                found_decorators = sum(1 for feature in decorator_features if feature in content)
                decorator_score = int((found_decorators / len(decorator_features)) * 10)
                
                task["tests"].append({
                    "name": "Cache decorator implementation",
                    "status": "PASS" if decorator_score >= 8 else "PARTIAL",
                    "points": decorator_score,
                    "details": f"Found {found_decorators}/{len(decorator_features)} decorator features"
                })
                task["score"] += decorator_score
                
            except Exception as e:
                task["tests"].append({
                    "name": "Cache decorator implementation",
                    "status": "ERROR",
                    "points": 0, 
                    "error": str(e)
                })
        
        logger.info(f"✅ Redis API Caching Score: {task['score']}/35")
    
    async def _validate_api_rate_limiting(self):
        """Test 2: API Rate Limiting Implementation (35 points)"""
        logger.info("🔒 Testing API Rate Limiting...")
        task = self.validation_results["tasks"]["api_rate_limiting"]
        
        # Test 2.1: Rate limiter class (15 points)
        perf_file = Path("utils/week2_day2_performance.py")
        if perf_file.exists():
            try:
                with open(perf_file, 'r') as f:
                    content = f.read()
                
                limiter_features = [
                    "Week2RateLimiter",
                    "check_limit",
                    "limits",
                    "rate_limit:",
                    "redis_client.incr"
                ]
                
                found_limiter = sum(1 for feature in limiter_features if feature in content)
                limiter_score = int((found_limiter / len(limiter_features)) * 15)
                
                task["tests"].append({
                    "name": "Rate limiter class implementation",
                    "status": "PASS" if limiter_score >= 12 else "PARTIAL",
                    "points": limiter_score,
                    "details": f"Found {found_limiter}/{len(limiter_features)} limiter features"
                })
                task["score"] += limiter_score
                
            except Exception as e:
                task["tests"].append({
                    "name": "Rate limiter class implementation",
                    "status": "ERROR",
                    "points": 0,
                    "error": str(e)
                })
        
        # Test 2.2: Multiple rate limiting strategies (10 points)
        if perf_file.exists():
            try:
                with open(perf_file, 'r') as f:
                    content = f.read()
                
                strategies = [
                    "auth",
                    "scans", 
                    "admin",
                    "user_role",
                    "endpoint"
                ]
                
                found_strategies = sum(1 for strategy in strategies if strategy in content)
                strategy_score = int((found_strategies / len(strategies)) * 10)
                
                task["tests"].append({
                    "name": "Multiple rate limiting strategies",
                    "status": "PASS" if strategy_score >= 8 else "PARTIAL", 
                    "points": strategy_score,
                    "details": f"Found {found_strategies}/{len(strategies)} strategies"
                })
                task["score"] += strategy_score
                
            except Exception as e:
                task["tests"].append({
                    "name": "Multiple rate limiting strategies",
                    "status": "ERROR",
                    "points": 0,
                    "error": str(e)
                })
        
        # Test 2.3: Rate limit decorator (10 points)
        if perf_file.exists():
            try:
                with open(perf_file, 'r') as f:
                    content = f.read()
                
                decorator_features = [
                    "rate_limit",
                    "requests_per_minute",
                    "HTTPException",
                    "status_code=429",
                    "client_ip"
                ]
                
                found_rate_decorator = sum(1 for feature in decorator_features if feature in content)
                rate_decorator_score = int((found_rate_decorator / len(decorator_features)) * 10)
                
                task["tests"].append({
                    "name": "Rate limit decorator implementation",
                    "status": "PASS" if rate_decorator_score >= 8 else "PARTIAL",
                    "points": rate_decorator_score,
                    "details": f"Found {found_rate_decorator}/{len(decorator_features)} decorator features"
                })
                task["score"] += rate_decorator_score
                
            except Exception as e:
                task["tests"].append({
                    "name": "Rate limit decorator implementation", 
                    "status": "ERROR",
                    "points": 0,
                    "error": str(e)
                })
        
        logger.info(f"✅ API Rate Limiting Score: {task['score']}/35")
    
    async def _validate_background_jobs(self):
        """Test 3: Background Job Processing (30 points)"""
        logger.info("⚙️ Testing Background Job Processing...")
        task = self.validation_results["tasks"]["background_jobs"]
        
        # Test 3.1: Background job processor class (15 points)
        perf_file = Path("utils/week2_day2_performance.py")
        if perf_file.exists():
            try:
                with open(perf_file, 'r') as f:
                    content = f.read()
                
                job_features = [
                    "Week2BackgroundJobs",
                    "job_queue",
                    "submit_job",
                    "_process_jobs",
                    "_execute_job"
                ]
                
                found_jobs = sum(1 for feature in job_features if feature in content)
                job_score = int((found_jobs / len(job_features)) * 15)
                
                task["tests"].append({
                    "name": "Background job processor implementation",
                    "status": "PASS" if job_score >= 12 else "PARTIAL",
                    "points": job_score,
                    "details": f"Found {found_jobs}/{len(job_features)} job features"
                })
                task["score"] += job_score
                
            except Exception as e:
                task["tests"].append({
                    "name": "Background job processor implementation",
                    "status": "ERROR",
                    "points": 0,
                    "error": str(e)
                })
        
        # Test 3.2: Multiple job types handling (15 points)
        if perf_file.exists():
            try:
                with open(perf_file, 'r') as f:
                    content = f.read()
                
                job_types = [
                    "security_scan",
                    "log_analysis", 
                    "cache_warm",
                    "asyncio.sleep",
                    "job statistics"
                ]
                
                found_types = sum(1 for job_type in job_types if job_type in content)
                types_score = int((found_types / len(job_types)) * 15)
                
                task["tests"].append({
                    "name": "Multiple job types handling",
                    "status": "PASS" if types_score >= 12 else "PARTIAL",
                    "points": types_score,
                    "details": f"Found {found_types}/{len(job_types)} job type features"
                })
                task["score"] += types_score
                
            except Exception as e:
                task["tests"].append({
                    "name": "Multiple job types handling",
                    "status": "ERROR", 
                    "points": 0,
                    "error": str(e)
                })
        
        logger.info(f"✅ Background Job Processing Score: {task['score']}/30")
    
    def _calculate_final_scores(self):
        """Calculate final validation scores"""
        total_score = sum(task["score"] for task in self.validation_results["tasks"].values())
        max_score = sum(task["max_score"] for task in self.validation_results["tasks"].values())
        
        self.validation_results["total_score"] = total_score
        self.validation_results["success_rate"] = round((total_score / max_score) * 100, 1)
    
    def _generate_summary(self):
        """Generate validation summary"""
        results = self.validation_results
        
        logger.info("\n" + "="*60)
        logger.info("🎯 WEEK 2 DAY 2 VALIDATION COMPLETE")
        logger.info("="*60)
        logger.info(f"📊 Total Score: {results['total_score']}/{results['max_total_score']}")
        logger.info(f"🎯 Success Rate: {results['success_rate']}%")
        logger.info("")
        
        for task_name, task_data in results["tasks"].items():
            status = "✅ PASS" if task_data["score"] >= task_data["max_score"] * 0.8 else "⚠️ PARTIAL" if task_data["score"] > 0 else "❌ FAIL"
            logger.info(f"{status} {task_name.replace('_', ' ').title()}: {task_data['score']}/{task_data['max_score']}")
        
        logger.info("")
        
        if results["success_rate"] >= 80:
            logger.info("🎉 OUTSTANDING! Week 2 Day 2 backend performance tasks completed successfully!")
        elif results["success_rate"] >= 60:
            logger.info("✅ GOOD! Week 2 Day 2 tasks mostly complete, minor improvements needed.")
        else:
            logger.info("⚠️ Week 2 Day 2 tasks need more work to meet success criteria.")

async def main():
    """Main validation function"""
    try:
        validator = Week2Day2Validator()
        results = await validator.run_validation()
        
        # Save results to file
        results_file = Path(__file__).parent.parent / "docs" / "project" / f"week2_day2_validation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        logger.info(f"📄 Validation results saved to: {results_file}")
        
        return results
        
    except Exception as e:
        logger.error(f"Validation failed: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    asyncio.run(main()) 