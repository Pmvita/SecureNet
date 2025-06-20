"""
SecureNet CI/CD Pipeline Optimization System
Day 4 Sprint 1: Automated testing, deployment optimization, and pipeline monitoring
"""

import asyncio
import subprocess
import logging
import time
import json
import yaml
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
from dataclasses import dataclass, asdict
from pathlib import Path
import concurrent.futures
from utils.cache_service import cache_service

logger = logging.getLogger(__name__)

class PipelineStage(Enum):
    """CI/CD Pipeline stages"""
    CHECKOUT = "checkout"
    DEPENDENCY_INSTALL = "dependency_install"
    LINT = "lint"
    TYPE_CHECK = "type_check"
    UNIT_TESTS = "unit_tests"
    INTEGRATION_TESTS = "integration_tests"
    E2E_TESTS = "e2e_tests"
    SECURITY_SCAN = "security_scan"
    BUILD = "build"
    PACKAGE = "package"
    DEPLOY_STAGING = "deploy_staging"
    SMOKE_TESTS = "smoke_tests"
    DEPLOY_PRODUCTION = "deploy_production"
    HEALTH_CHECK = "health_check"

class PipelineStatus(Enum):
    """Pipeline execution status"""
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"
    SKIPPED = "skipped"

class DeploymentEnvironment(Enum):
    """Deployment environments"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"

@dataclass
class PipelineExecution:
    """Pipeline execution tracking"""
    id: str
    commit_hash: str
    branch: str
    trigger: str  # push, pull_request, manual, scheduled
    environment: DeploymentEnvironment
    started_at: datetime
    completed_at: Optional[datetime] = None
    status: PipelineStatus = PipelineStatus.PENDING
    stages: Dict[str, Dict[str, Any]] = None
    artifacts: List[str] = None
    test_results: Dict[str, Any] = None
    deployment_info: Dict[str, Any] = None
    
    def __post_init__(self):
        if not self.stages:
            self.stages = {}
        if not self.artifacts:
            self.artifacts = []
        if not self.test_results:
            self.test_results = {}
        if not self.deployment_info:
            self.deployment_info = {}

class CICDOptimizer:
    """
    CI/CD Pipeline Optimization Engine
    Automated testing, deployment, and performance optimization
    """
    
    def __init__(self, project_root: Path = None):
        self.project_root = project_root or Path.cwd()
        self.pipeline_config = self._load_pipeline_config()
        self.execution_history: List[PipelineExecution] = []
        self.active_executions: Dict[str, PipelineExecution] = {}
        
        # Performance metrics
        self.metrics = {
            "total_executions": 0,
            "success_rate": 0.0,
            "average_duration": 0.0,
            "fastest_execution": float('inf'),
            "slowest_execution": 0.0,
            "stage_performance": {},
            "deployment_frequency": 0.0,
            "failure_recovery_time": 0.0
        }
        
        # Optimization settings
        self.optimization_config = {
            "parallel_jobs": 4,
            "cache_enabled": True,
            "skip_redundant_tests": True,
            "fast_fail": True,
            "dependency_caching": True,
            "build_optimization": True
        }
    
    def _load_pipeline_config(self) -> Dict[str, Any]:
        """Load CI/CD pipeline configuration"""
        try:
            config_file = self.project_root / '.github' / 'workflows' / 'securenet-ci.yml'
            if config_file.exists():
                with open(config_file, 'r') as f:
                    return yaml.safe_load(f)
            
            # Default configuration
            return {
                "name": "SecureNet CI/CD",
                "stages": [stage.value for stage in PipelineStage],
                "parallel_stages": ["lint", "type_check", "unit_tests"],
                "required_stages": ["unit_tests", "security_scan"],
                "deployment_stages": ["deploy_staging", "deploy_production"],
                "environments": {
                    "staging": {
                        "url": "https://staging.securenet.com",
                        "auto_deploy": True,
                        "require_approval": False
                    },
                    "production": {
                        "url": "https://securenet.com", 
                        "auto_deploy": False,
                        "require_approval": True
                    }
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to load pipeline config: {e}")
            return {}
    
    async def execute_pipeline(self, 
                             commit_hash: str,
                             branch: str,
                             trigger: str = "manual",
                             environment: DeploymentEnvironment = DeploymentEnvironment.STAGING,
                             stages_to_run: List[PipelineStage] = None) -> PipelineExecution:
        """Execute CI/CD pipeline with optimization"""
        
        execution_id = f"exec_{int(time.time())}_{commit_hash[:8]}"
        execution = PipelineExecution(
            id=execution_id,
            commit_hash=commit_hash,
            branch=branch,
            trigger=trigger,
            environment=environment,
            started_at=datetime.now()
        )
        
        self.active_executions[execution_id] = execution
        
        try:
            logger.info(f"Starting pipeline execution {execution_id}")
            execution.status = PipelineStatus.RUNNING
            
            # Determine stages to run
            if not stages_to_run:
                stages_to_run = self._get_stages_for_environment(environment)
            
            # Optimize stage execution order
            optimized_stages = self._optimize_stage_order(stages_to_run)
            
            # Execute stages
            for stage_group in optimized_stages:
                if isinstance(stage_group, list):
                    # Parallel execution
                    await self._execute_stages_parallel(execution, stage_group)
                else:
                    # Sequential execution
                    await self._execute_stage(execution, stage_group)
                
                # Check for failures
                if execution.status == PipelineStatus.FAILED:
                    if self.optimization_config["fast_fail"]:
                        break
            
            # Finalize execution
            execution.completed_at = datetime.now()
            if execution.status == PipelineStatus.RUNNING:
                execution.status = PipelineStatus.SUCCESS
            
            # Update metrics
            await self._update_metrics(execution)
            
            # Store execution history
            self.execution_history.append(execution)
            
            # Cache successful builds
            if execution.status == PipelineStatus.SUCCESS and self.optimization_config["cache_enabled"]:
                await self._cache_build_artifacts(execution)
            
            logger.info(f"Pipeline execution {execution_id} completed with status: {execution.status.value}")
            return execution
            
        except Exception as e:
            logger.error(f"Pipeline execution failed: {e}")
            execution.status = PipelineStatus.FAILED
            execution.completed_at = datetime.now()
            return execution
        
        finally:
            # Clean up active execution
            self.active_executions.pop(execution_id, None)
    
    def _get_stages_for_environment(self, environment: DeploymentEnvironment) -> List[PipelineStage]:
        """Get appropriate stages for deployment environment"""
        base_stages = [
            PipelineStage.CHECKOUT,
            PipelineStage.DEPENDENCY_INSTALL,
            PipelineStage.LINT,
            PipelineStage.TYPE_CHECK,
            PipelineStage.UNIT_TESTS,
            PipelineStage.SECURITY_SCAN,
            PipelineStage.BUILD
        ]
        
        if environment == DeploymentEnvironment.STAGING:
            return base_stages + [
                PipelineStage.INTEGRATION_TESTS,
                PipelineStage.PACKAGE,
                PipelineStage.DEPLOY_STAGING,
                PipelineStage.SMOKE_TESTS,
                PipelineStage.HEALTH_CHECK
            ]
        elif environment == DeploymentEnvironment.PRODUCTION:
            return base_stages + [
                PipelineStage.INTEGRATION_TESTS,
                PipelineStage.E2E_TESTS,
                PipelineStage.PACKAGE,
                PipelineStage.DEPLOY_PRODUCTION,
                PipelineStage.SMOKE_TESTS,
                PipelineStage.HEALTH_CHECK
            ]
        else:
            return base_stages
    
    def _optimize_stage_order(self, stages: List[PipelineStage]) -> List[Any]:
        """Optimize stage execution order for parallel processing"""
        # Group stages that can run in parallel
        parallel_groups = []
        sequential_stages = []
        
        # Parallel group 1: Independent checks
        parallel_1 = []
        for stage in [PipelineStage.LINT, PipelineStage.TYPE_CHECK, PipelineStage.UNIT_TESTS]:
            if stage in stages:
                parallel_1.append(stage)
        if parallel_1:
            parallel_groups.append(parallel_1)
        
        # Sequential stages that depend on each other
        sequential_order = [
            PipelineStage.CHECKOUT,
            PipelineStage.DEPENDENCY_INSTALL,
            # parallel_1 goes here
            PipelineStage.SECURITY_SCAN,
            PipelineStage.BUILD,
            PipelineStage.INTEGRATION_TESTS,
            PipelineStage.E2E_TESTS,
            PipelineStage.PACKAGE,
            PipelineStage.DEPLOY_STAGING,
            PipelineStage.DEPLOY_PRODUCTION,
            PipelineStage.SMOKE_TESTS,
            PipelineStage.HEALTH_CHECK
        ]
        
        # Build optimized execution plan
        optimized = []
        
        # Add initial sequential stages
        for stage in sequential_order[:2]:  # checkout, dependency_install
            if stage in stages:
                optimized.append(stage)
        
        # Add parallel group
        if parallel_1:
            optimized.append(parallel_1)
        
        # Add remaining sequential stages
        for stage in sequential_order[2:]:
            if stage in stages and stage not in parallel_1:
                optimized.append(stage)
        
        return optimized
    
    async def _execute_stages_parallel(self, execution: PipelineExecution, stages: List[PipelineStage]):
        """Execute multiple stages in parallel"""
        tasks = []
        for stage in stages:
            task = asyncio.create_task(self._execute_stage(execution, stage))
            tasks.append(task)
        
        # Wait for all parallel stages to complete
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Check for failures
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Parallel stage execution failed: {result}")
                execution.status = PipelineStatus.FAILED
    
    async def _execute_stage(self, execution: PipelineExecution, stage: PipelineStage) -> bool:
        """Execute a single pipeline stage"""
        stage_start = datetime.now()
        stage_info = {
            "started_at": stage_start.isoformat(),
            "status": PipelineStatus.RUNNING.value,
            "duration": 0,
            "output": "",
            "error": ""
        }
        
        execution.stages[stage.value] = stage_info
        
        try:
            logger.info(f"Executing stage: {stage.value}")
            
            # Check if stage can be skipped (cached results)
            if await self._can_skip_stage(execution, stage):
                stage_info["status"] = PipelineStatus.SKIPPED.value
                stage_info["output"] = "Skipped (cached result)"
                logger.info(f"Skipping stage {stage.value} (cached)")
                return True
            
            # Execute stage based on type
            success = False
            if stage == PipelineStage.CHECKOUT:
                success = await self._stage_checkout(execution)
            elif stage == PipelineStage.DEPENDENCY_INSTALL:
                success = await self._stage_dependency_install(execution)
            elif stage == PipelineStage.LINT:
                success = await self._stage_lint(execution)
            elif stage == PipelineStage.TYPE_CHECK:
                success = await self._stage_type_check(execution)
            elif stage == PipelineStage.UNIT_TESTS:
                success = await self._stage_unit_tests(execution)
            elif stage == PipelineStage.INTEGRATION_TESTS:
                success = await self._stage_integration_tests(execution)
            elif stage == PipelineStage.E2E_TESTS:
                success = await self._stage_e2e_tests(execution)
            elif stage == PipelineStage.SECURITY_SCAN:
                success = await self._stage_security_scan(execution)
            elif stage == PipelineStage.BUILD:
                success = await self._stage_build(execution)
            elif stage == PipelineStage.PACKAGE:
                success = await self._stage_package(execution)
            elif stage == PipelineStage.DEPLOY_STAGING:
                success = await self._stage_deploy(execution, DeploymentEnvironment.STAGING)
            elif stage == PipelineStage.DEPLOY_PRODUCTION:
                success = await self._stage_deploy(execution, DeploymentEnvironment.PRODUCTION)
            elif stage == PipelineStage.SMOKE_TESTS:
                success = await self._stage_smoke_tests(execution)
            elif stage == PipelineStage.HEALTH_CHECK:
                success = await self._stage_health_check(execution)
            else:
                logger.warning(f"Unknown stage: {stage.value}")
                success = True
            
            # Update stage info
            stage_end = datetime.now()
            stage_info["completed_at"] = stage_end.isoformat()
            stage_info["duration"] = (stage_end - stage_start).total_seconds()
            stage_info["status"] = PipelineStatus.SUCCESS.value if success else PipelineStatus.FAILED.value
            
            if not success:
                execution.status = PipelineStatus.FAILED
                logger.error(f"Stage {stage.value} failed")
            
            return success
            
        except Exception as e:
            stage_info["status"] = PipelineStatus.FAILED.value
            stage_info["error"] = str(e)
            execution.status = PipelineStatus.FAILED
            logger.error(f"Stage {stage.value} exception: {e}")
            return False
    
    async def _can_skip_stage(self, execution: PipelineExecution, stage: PipelineStage) -> bool:
        """Check if stage can be skipped based on caching"""
        if not self.optimization_config["cache_enabled"]:
            return False
        
        # For now, only skip certain stages if we have cached results
        cacheable_stages = [PipelineStage.DEPENDENCY_INSTALL, PipelineStage.LINT, PipelineStage.TYPE_CHECK]
        
        if stage not in cacheable_stages:
            return False
        
        # Check cache for this commit and stage
        cache_key = f"pipeline_cache:{execution.commit_hash}:{stage.value}"
        cached_result = await cache_service.get(cache_key)
        
        return cached_result is not None and cached_result.get("success", False)
    
    async def _run_command(self, command: str, cwd: Path = None, timeout: int = 300) -> Tuple[bool, str, str]:
        """Run shell command with timeout and capture output"""
        try:
            cwd = cwd or self.project_root
            
            # Use asyncio.create_subprocess_shell for non-blocking execution
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=cwd
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout)
                return_code = process.returncode
                
                stdout_str = stdout.decode('utf-8') if stdout else ""
                stderr_str = stderr.decode('utf-8') if stderr else ""
                
                return return_code == 0, stdout_str, stderr_str
                
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
                return False, "", f"Command timed out after {timeout} seconds"
                
        except Exception as e:
            return False, "", str(e)
    
    # Stage implementations
    async def _stage_checkout(self, execution: PipelineExecution) -> bool:
        """Checkout code from repository"""
        success, stdout, stderr = await self._run_command(f"git checkout {execution.commit_hash}")
        execution.stages[PipelineStage.CHECKOUT.value]["output"] = stdout
        execution.stages[PipelineStage.CHECKOUT.value]["error"] = stderr
        return success
    
    async def _stage_dependency_install(self, execution: PipelineExecution) -> bool:
        """Install project dependencies"""
        # Backend dependencies
        backend_success, stdout1, stderr1 = await self._run_command("pip install -r requirements.txt")
        
        # Frontend dependencies
        frontend_success, stdout2, stderr2 = await self._run_command("npm install", cwd=self.project_root / "frontend")
        
        execution.stages[PipelineStage.DEPENDENCY_INSTALL.value]["output"] = f"Backend:\n{stdout1}\nFrontend:\n{stdout2}"
        execution.stages[PipelineStage.DEPENDENCY_INSTALL.value]["error"] = f"Backend:\n{stderr1}\nFrontend:\n{stderr2}"
        
        return backend_success and frontend_success
    
    async def _stage_lint(self, execution: PipelineExecution) -> bool:
        """Run linting checks"""
        # Python linting
        python_success, stdout1, stderr1 = await self._run_command("flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics")
        
        # TypeScript linting
        ts_success, stdout2, stderr2 = await self._run_command("npm run lint", cwd=self.project_root / "frontend")
        
        execution.stages[PipelineStage.LINT.value]["output"] = f"Python:\n{stdout1}\nTypeScript:\n{stdout2}"
        execution.stages[PipelineStage.LINT.value]["error"] = f"Python:\n{stderr1}\nTypeScript:\n{stderr2}"
        
        return python_success and ts_success
    
    async def _stage_type_check(self, execution: PipelineExecution) -> bool:
        """Run type checking"""
        # Python type checking with mypy
        python_success, stdout1, stderr1 = await self._run_command("mypy . --ignore-missing-imports")
        
        # TypeScript type checking
        ts_success, stdout2, stderr2 = await self._run_command("npm run type-check", cwd=self.project_root / "frontend")
        
        execution.stages[PipelineStage.TYPE_CHECK.value]["output"] = f"Python:\n{stdout1}\nTypeScript:\n{stdout2}"
        execution.stages[PipelineStage.TYPE_CHECK.value]["error"] = f"Python:\n{stderr1}\nTypeScript:\n{stderr2}"
        
        return python_success and ts_success
    
    async def _stage_unit_tests(self, execution: PipelineExecution) -> bool:
        """Run unit tests"""
        # Python unit tests
        python_success, stdout1, stderr1 = await self._run_command("python -m pytest tests/ -v --tb=short")
        
        # Frontend unit tests
        frontend_success, stdout2, stderr2 = await self._run_command("npm test -- --passWithNoTests", cwd=self.project_root / "frontend")
        
        # Parse test results
        execution.test_results["unit_tests"] = {
            "python": {"output": stdout1, "error": stderr1, "success": python_success},
            "frontend": {"output": stdout2, "error": stderr2, "success": frontend_success}
        }
        
        execution.stages[PipelineStage.UNIT_TESTS.value]["output"] = f"Python:\n{stdout1}\nFrontend:\n{stdout2}"
        execution.stages[PipelineStage.UNIT_TESTS.value]["error"] = f"Python:\n{stderr1}\nFrontend:\n{stderr2}"
        
        return python_success and frontend_success
    
    async def _stage_integration_tests(self, execution: PipelineExecution) -> bool:
        """Run integration tests"""
        success, stdout, stderr = await self._run_command("python -m pytest tests/integration/ -v --tb=short")
        
        execution.test_results["integration_tests"] = {"output": stdout, "error": stderr, "success": success}
        execution.stages[PipelineStage.INTEGRATION_TESTS.value]["output"] = stdout
        execution.stages[PipelineStage.INTEGRATION_TESTS.value]["error"] = stderr
        
        return success
    
    async def _stage_e2e_tests(self, execution: PipelineExecution) -> bool:
        """Run end-to-end tests"""
        success, stdout, stderr = await self._run_command("npm run test:e2e", cwd=self.project_root / "frontend")
        
        execution.test_results["e2e_tests"] = {"output": stdout, "error": stderr, "success": success}
        execution.stages[PipelineStage.E2E_TESTS.value]["output"] = stdout
        execution.stages[PipelineStage.E2E_TESTS.value]["error"] = stderr
        
        return success
    
    async def _stage_security_scan(self, execution: PipelineExecution) -> bool:
        """Run security vulnerability scanning"""
        # Python security scan
        python_success, stdout1, stderr1 = await self._run_command("safety check")
        
        # npm audit
        npm_success, stdout2, stderr2 = await self._run_command("npm audit --audit-level moderate", cwd=self.project_root / "frontend")
        
        execution.stages[PipelineStage.SECURITY_SCAN.value]["output"] = f"Python:\n{stdout1}\nNPM:\n{stdout2}"
        execution.stages[PipelineStage.SECURITY_SCAN.value]["error"] = f"Python:\n{stderr1}\nNPM:\n{stderr2}"
        
        return python_success and npm_success
    
    async def _stage_build(self, execution: PipelineExecution) -> bool:
        """Build application"""
        # Build frontend
        success, stdout, stderr = await self._run_command("npm run build", cwd=self.project_root / "frontend")
        
        execution.stages[PipelineStage.BUILD.value]["output"] = stdout
        execution.stages[PipelineStage.BUILD.value]["error"] = stderr
        
        if success:
            execution.artifacts.append("frontend/dist")
        
        return success
    
    async def _stage_package(self, execution: PipelineExecution) -> bool:
        """Package application for deployment"""
        # Create deployment package
        package_name = f"securenet-{execution.commit_hash[:8]}.tar.gz"
        success, stdout, stderr = await self._run_command(f"tar -czf {package_name} --exclude=node_modules --exclude=venv .")
        
        execution.stages[PipelineStage.PACKAGE.value]["output"] = stdout
        execution.stages[PipelineStage.PACKAGE.value]["error"] = stderr
        
        if success:
            execution.artifacts.append(package_name)
        
        return success
    
    async def _stage_deploy(self, execution: PipelineExecution, environment: DeploymentEnvironment) -> bool:
        """Deploy to specified environment"""
        # Simulate deployment process
        deploy_script = f"scripts/deploy_{environment.value}.sh"
        success, stdout, stderr = await self._run_command(f"bash {deploy_script}")
        
        stage_name = f"deploy_{environment.value}"
        execution.stages[stage_name]["output"] = stdout
        execution.stages[stage_name]["error"] = stderr
        
        if success:
            execution.deployment_info[environment.value] = {
                "deployed_at": datetime.now().isoformat(),
                "commit_hash": execution.commit_hash,
                "artifacts": execution.artifacts
            }
        
        return success
    
    async def _stage_smoke_tests(self, execution: PipelineExecution) -> bool:
        """Run smoke tests against deployed application"""
        success, stdout, stderr = await self._run_command("python scripts/smoke_tests.py")
        
        execution.stages[PipelineStage.SMOKE_TESTS.value]["output"] = stdout
        execution.stages[PipelineStage.SMOKE_TESTS.value]["error"] = stderr
        
        return success
    
    async def _stage_health_check(self, execution: PipelineExecution) -> bool:
        """Check application health after deployment"""
        success, stdout, stderr = await self._run_command("python scripts/health_check.py")
        
        execution.stages[PipelineStage.HEALTH_CHECK.value]["output"] = stdout
        execution.stages[PipelineStage.HEALTH_CHECK.value]["error"] = stderr
        
        return success
    
    async def _cache_build_artifacts(self, execution: PipelineExecution):
        """Cache successful build artifacts and results"""
        try:
            cache_key = f"pipeline_cache:{execution.commit_hash}"
            cache_data = {
                "execution_id": execution.id,
                "success": execution.status == PipelineStatus.SUCCESS,
                "artifacts": execution.artifacts,
                "test_results": execution.test_results,
                "cached_at": datetime.now().isoformat()
            }
            
            # Cache for 7 days
            await cache_service.set(cache_key, cache_data, ttl=604800)
            
            # Cache individual stage results
            for stage_name, stage_info in execution.stages.items():
                if stage_info["status"] == PipelineStatus.SUCCESS.value:
                    stage_cache_key = f"pipeline_cache:{execution.commit_hash}:{stage_name}"
                    await cache_service.set(stage_cache_key, {"success": True}, ttl=604800)
                    
        except Exception as e:
            logger.error(f"Failed to cache build artifacts: {e}")
    
    async def _update_metrics(self, execution: PipelineExecution):
        """Update performance metrics based on execution"""
        try:
            self.metrics["total_executions"] += 1
            
            # Calculate success rate
            successful_executions = sum(1 for e in self.execution_history if e.status == PipelineStatus.SUCCESS)
            self.metrics["success_rate"] = successful_executions / len(self.execution_history) if self.execution_history else 0.0
            
            # Calculate duration metrics
            if execution.completed_at:
                duration = (execution.completed_at - execution.started_at).total_seconds()
                
                # Update duration metrics
                total_duration = self.metrics["average_duration"] * (self.metrics["total_executions"] - 1)
                self.metrics["average_duration"] = (total_duration + duration) / self.metrics["total_executions"]
                
                if duration < self.metrics["fastest_execution"]:
                    self.metrics["fastest_execution"] = duration
                
                if duration > self.metrics["slowest_execution"]:
                    self.metrics["slowest_execution"] = duration
                
                # Update stage performance metrics
                for stage_name, stage_info in execution.stages.items():
                    if stage_name not in self.metrics["stage_performance"]:
                        self.metrics["stage_performance"][stage_name] = {
                            "total_runs": 0,
                            "average_duration": 0.0,
                            "success_rate": 0.0
                        }
                    
                    stage_metrics = self.metrics["stage_performance"][stage_name]
                    stage_metrics["total_runs"] += 1
                    
                    if "duration" in stage_info:
                        total_stage_duration = stage_metrics["average_duration"] * (stage_metrics["total_runs"] - 1)
                        stage_metrics["average_duration"] = (total_stage_duration + stage_info["duration"]) / stage_metrics["total_runs"]
                    
                    # Update stage success rate
                    successful_stage_runs = sum(
                        1 for e in self.execution_history 
                        for s_name, s_info in e.stages.items()
                        if s_name == stage_name and s_info.get("status") == PipelineStatus.SUCCESS.value
                    )
                    stage_metrics["success_rate"] = successful_stage_runs / stage_metrics["total_runs"]
            
        except Exception as e:
            logger.error(f"Failed to update metrics: {e}")
    
    async def get_pipeline_metrics(self) -> Dict[str, Any]:
        """Get comprehensive pipeline metrics"""
        return {
            **self.metrics,
            "active_executions": len(self.active_executions),
            "recent_executions": [
                {
                    "id": e.id,
                    "status": e.status.value,
                    "duration": (e.completed_at - e.started_at).total_seconds() if e.completed_at else None,
                    "branch": e.branch,
                    "environment": e.environment.value
                }
                for e in self.execution_history[-10:]  # Last 10 executions
            ],
            "timestamp": datetime.now().isoformat()
        }
    
    async def optimize_pipeline_config(self) -> Dict[str, Any]:
        """Analyze execution history and suggest optimizations"""
        suggestions = []
        
        try:
            if len(self.execution_history) < 5:
                return {"suggestions": ["Need more execution history for meaningful analysis"]}
            
            # Analyze stage performance
            slowest_stages = []
            for stage_name, metrics in self.metrics["stage_performance"].items():
                if metrics["average_duration"] > 60:  # Stages taking more than 1 minute
                    slowest_stages.append({
                        "stage": stage_name,
                        "duration": metrics["average_duration"],
                        "success_rate": metrics["success_rate"]
                    })
            
            # Sort by duration
            slowest_stages.sort(key=lambda x: x["duration"], reverse=True)
            
            # Generate suggestions
            if slowest_stages:
                suggestions.append(f"Consider optimizing these slow stages: {', '.join([s['stage'] for s in slowest_stages[:3]])}")
            
            if self.metrics["success_rate"] < 0.8:
                suggestions.append("Success rate is low - review failing stages and improve test reliability")
            
            if self.metrics["average_duration"] > 900:  # 15 minutes
                suggestions.append("Pipeline duration is high - consider more aggressive parallelization")
            
            # Check for cache opportunities
            cacheable_stages = ["dependency_install", "lint", "type_check"]
            for stage in cacheable_stages:
                if stage in self.metrics["stage_performance"]:
                    if self.metrics["stage_performance"][stage]["average_duration"] > 30:
                        suggestions.append(f"Enable caching for {stage} stage to improve performance")
            
            return {
                "suggestions": suggestions,
                "slowest_stages": slowest_stages[:5],
                "optimization_config": self.optimization_config,
                "analysis_timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze pipeline optimization: {e}")
            return {"suggestions": ["Analysis failed"], "error": str(e)}

# Global CI/CD optimizer instance
cicd_optimizer = CICDOptimizer()

# Convenience functions
async def run_pipeline(commit_hash: str, branch: str = "main", environment: str = "staging") -> PipelineExecution:
    """Run CI/CD pipeline for given commit"""
    env = DeploymentEnvironment(environment.lower())
    return await cicd_optimizer.execute_pipeline(commit_hash, branch, "manual", env)

async def get_pipeline_status(execution_id: str) -> Optional[PipelineExecution]:
    """Get status of pipeline execution"""
    return cicd_optimizer.active_executions.get(execution_id)

async def get_optimization_suggestions() -> Dict[str, Any]:
    """Get pipeline optimization suggestions"""
    return await cicd_optimizer.optimize_pipeline_config() 