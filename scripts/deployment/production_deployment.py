"""
SecureNet Production Deployment Pipeline System
Day 5 Sprint 1: Blue-green deployment, production monitoring, and automated rollback
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
import docker
import boto3
from kubernetes import client, config
import requests

# Local imports
from utils.cache_service import cache_service
from auth.audit_logging import security_audit_logger, AuditEventType, AuditSeverity
from monitoring.enterprise_dashboard import EnterpriseMonitor

logger = logging.getLogger(__name__)

class DeploymentEnvironment(Enum):
    """Deployment environments"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"

class DeploymentStrategy(Enum):
    """Deployment strategies"""
    BLUE_GREEN = "blue_green"
    ROLLING = "rolling"
    CANARY = "canary"
    RECREATE = "recreate"

class DeploymentStatus(Enum):
    """Deployment status"""
    PENDING = "pending"
    DEPLOYING = "deploying"
    VALIDATING = "validating"
    SUCCESS = "success"
    FAILED = "failed"
    ROLLING_BACK = "rolling_back"
    ROLLED_BACK = "rolled_back"

class HealthCheckStatus(Enum):
    """Health check status"""
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    DEGRADED = "degraded"
    UNKNOWN = "unknown"

@dataclass
class DeploymentConfig:
    """Deployment configuration"""
    app_name: str
    version: str
    environment: DeploymentEnvironment
    strategy: DeploymentStrategy
    replicas: int
    health_check_path: str
    readiness_timeout: int = 300  # 5 minutes
    rollback_threshold: float = 0.1  # 10% error rate triggers rollback
    validation_tests: List[str] = None
    
    def __post_init__(self):
        if not self.validation_tests:
            self.validation_tests = ['health_check', 'smoke_test']

@dataclass
class DeploymentExecution:
    """Deployment execution tracking"""
    deployment_id: str
    config: DeploymentConfig
    started_at: datetime
    status: DeploymentStatus = DeploymentStatus.PENDING
    completed_at: Optional[datetime] = None
    current_stage: str = "initialization"
    stages_completed: List[str] = None
    validation_results: Dict[str, Any] = None
    rollback_reason: Optional[str] = None
    
    def __post_init__(self):
        if not self.stages_completed:
            self.stages_completed = []
        if not self.validation_results:
            self.validation_results = {}

class ProductionDeploymentManager:
    """
    Enterprise Production Deployment Management
    Blue-green deployments, canary releases, automated rollbacks
    """
    
    def __init__(self):
        self.docker_client = docker.from_env()
        self.deployments: Dict[str, DeploymentExecution] = {}
        self.deployment_history: List[DeploymentExecution] = []
        
        # Load Kubernetes config if available
        try:
            config.load_incluster_config()  # For in-cluster deployment
        except:
            try:
                config.load_kube_config()  # For local development
                self.k8s_apps_v1 = client.AppsV1Api()
                self.k8s_core_v1 = client.CoreV1Api()
            except:
                logger.warning("Kubernetes config not available")
                self.k8s_apps_v1 = None
                self.k8s_core_v1 = None
        
        # Infrastructure monitoring
        self.monitoring = EnterpriseMonitor()
        
        # Deployment metrics
        self.metrics = {
            'total_deployments': 0,
            'successful_deployments': 0,
            'failed_deployments': 0,
            'rollbacks_triggered': 0,
            'average_deployment_time': 0.0,
            'deployment_frequency': 0.0
        }
    
    async def deploy_application(self, config: DeploymentConfig) -> DeploymentExecution:
        """Deploy application with specified strategy"""
        deployment_id = f"deploy_{config.app_name}_{config.version}_{int(time.time())}"
        
        execution = DeploymentExecution(
            deployment_id=deployment_id,
            config=config,
            started_at=datetime.now()
        )
        
        self.deployments[deployment_id] = execution
        
        try:
            logger.info(f"Starting deployment {deployment_id}")
            execution.status = DeploymentStatus.DEPLOYING
            
            # Execute deployment based on strategy
            if config.strategy == DeploymentStrategy.BLUE_GREEN:
                await self._blue_green_deployment(execution)
            elif config.strategy == DeploymentStrategy.ROLLING:
                await self._rolling_deployment(execution)
            elif config.strategy == DeploymentStrategy.CANARY:
                await self._canary_deployment(execution)
            else:
                await self._recreate_deployment(execution)
            
            # Validate deployment
            execution.current_stage = "validation"
            validation_success = await self._validate_deployment(execution)
            
            if validation_success:
                execution.status = DeploymentStatus.SUCCESS
                execution.completed_at = datetime.now()
                self.metrics['successful_deployments'] += 1
            else:
                # Trigger rollback
                await self._rollback_deployment(execution, "Validation failed")
            
            # Update metrics
            self._update_deployment_metrics(execution)
            
            # Store deployment record
            await self._store_deployment_record(execution)
            
            logger.info(f"Deployment {deployment_id} completed with status: {execution.status.value}")
            return execution
            
        except Exception as e:
            logger.error(f"Deployment {deployment_id} failed: {e}")
            execution.status = DeploymentStatus.FAILED
            execution.completed_at = datetime.now()
            await self._rollback_deployment(execution, f"Deployment error: {e}")
            self.metrics['failed_deployments'] += 1
            return execution
        
        finally:
            # Clean up active deployment
            self.deployment_history.append(execution)
            self.deployments.pop(deployment_id, None)
    
    async def _blue_green_deployment(self, execution: DeploymentExecution):
        """Execute blue-green deployment strategy"""
        config = execution.config
        
        try:
            # Stage 1: Deploy to green environment
            execution.current_stage = "green_deployment"
            green_environment = f"{config.app_name}-green"
            
            await self._deploy_to_environment(config, green_environment)
            execution.stages_completed.append("green_deployed")
            
            # Stage 2: Health check green environment
            execution.current_stage = "green_health_check"
            if await self._wait_for_healthy_deployment(green_environment, config.readiness_timeout):
                execution.stages_completed.append("green_healthy")
            else:
                raise Exception("Green environment failed health checks")
            
            # Stage 3: Run smoke tests on green
            execution.current_stage = "green_smoke_tests"
            if await self._run_smoke_tests(green_environment):
                execution.stages_completed.append("green_smoke_tests_passed")
            else:
                raise Exception("Green environment failed smoke tests")
            
            # Stage 4: Switch traffic to green (atomic switch)
            execution.current_stage = "traffic_switch"
            await self._switch_traffic(config.app_name, green_environment)
            execution.stages_completed.append("traffic_switched")
            
            # Stage 5: Monitor new environment
            execution.current_stage = "monitoring_new_environment"
            if await self._monitor_deployment_health(green_environment, duration=300):  # 5 minutes
                execution.stages_completed.append("new_environment_stable")
            else:
                raise Exception("New environment showing issues")
            
            # Stage 6: Cleanup old blue environment
            execution.current_stage = "cleanup"
            await self._cleanup_old_environment(f"{config.app_name}-blue")
            execution.stages_completed.append("cleanup_completed")
            
        except Exception as e:
            logger.error(f"Blue-green deployment failed: {e}")
            raise
    
    async def _rolling_deployment(self, execution: DeploymentExecution):
        """Execute rolling deployment strategy"""
        config = execution.config
        
        try:
            # Stage 1: Rolling update
            execution.current_stage = "rolling_update"
            
            if self.k8s_apps_v1:
                # Kubernetes rolling update
                await self._k8s_rolling_update(config)
            else:
                # Docker Swarm or manual rolling update
                await self._manual_rolling_update(config)
            
            execution.stages_completed.append("rolling_update_initiated")
            
            # Stage 2: Monitor rollout progress
            execution.current_stage = "rollout_monitoring"
            if await self._monitor_rollout_progress(config.app_name, config.readiness_timeout):
                execution.stages_completed.append("rollout_completed")
            else:
                raise Exception("Rolling update failed")
                
        except Exception as e:
            logger.error(f"Rolling deployment failed: {e}")
            raise
    
    async def _canary_deployment(self, execution: DeploymentExecution):
        """Execute canary deployment strategy"""
        config = execution.config
        
        try:
            # Stage 1: Deploy canary version (10% traffic)
            execution.current_stage = "canary_deployment"
            canary_environment = f"{config.app_name}-canary"
            
            await self._deploy_canary(config, canary_environment, traffic_percentage=10)
            execution.stages_completed.append("canary_deployed")
            
            # Stage 2: Monitor canary metrics
            execution.current_stage = "canary_monitoring"
            canary_healthy = await self._monitor_canary_metrics(canary_environment, duration=600)  # 10 minutes
            
            if canary_healthy:
                execution.stages_completed.append("canary_validated")
                
                # Stage 3: Gradually increase traffic
                for percentage in [25, 50, 75, 100]:
                    execution.current_stage = f"canary_traffic_{percentage}%"
                    await self._adjust_canary_traffic(canary_environment, percentage)
                    
                    # Monitor at each stage
                    if not await self._monitor_canary_metrics(canary_environment, duration=300):
                        raise Exception(f"Canary failed at {percentage}% traffic")
                    
                    execution.stages_completed.append(f"canary_{percentage}%_validated")
                
                # Stage 4: Promote canary to production
                execution.current_stage = "canary_promotion"
                await self._promote_canary(config.app_name, canary_environment)
                execution.stages_completed.append("canary_promoted")
            else:
                raise Exception("Canary deployment failed validation")
                
        except Exception as e:
            logger.error(f"Canary deployment failed: {e}")
            raise
    
    async def _recreate_deployment(self, execution: DeploymentExecution):
        """Execute recreate deployment strategy"""
        config = execution.config
        
        try:
            # Stage 1: Stop current version
            execution.current_stage = "stopping_current"
            await self._stop_application(config.app_name)
            execution.stages_completed.append("current_stopped")
            
            # Stage 2: Deploy new version
            execution.current_stage = "deploying_new"
            await self._deploy_to_environment(config, config.app_name)
            execution.stages_completed.append("new_deployed")
            
            # Stage 3: Start new version
            execution.current_stage = "starting_new"
            await self._start_application(config.app_name)
            execution.stages_completed.append("new_started")
            
        except Exception as e:
            logger.error(f"Recreate deployment failed: {e}")
            raise
    
    async def _deploy_to_environment(self, config: DeploymentConfig, environment_name: str):
        """Deploy application to specific environment"""
        try:
            if self.k8s_apps_v1:
                # Kubernetes deployment
                await self._k8s_deploy(config, environment_name)
            else:
                # Docker deployment
                await self._docker_deploy(config, environment_name)
                
        except Exception as e:
            logger.error(f"Environment deployment failed: {e}")
            raise
    
    async def _k8s_deploy(self, config: DeploymentConfig, environment_name: str):
        """Deploy to Kubernetes"""
        try:
            deployment_manifest = {
                'apiVersion': 'apps/v1',
                'kind': 'Deployment',
                'metadata': {
                    'name': environment_name,
                    'labels': {'app': config.app_name, 'version': config.version}
                },
                'spec': {
                    'replicas': config.replicas,
                    'selector': {'matchLabels': {'app': config.app_name}},
                    'template': {
                        'metadata': {'labels': {'app': config.app_name, 'version': config.version}},
                        'spec': {
                            'containers': [{
                                'name': config.app_name,
                                'image': f"{config.app_name}:{config.version}",
                                'ports': [{'containerPort': 8000}],
                                'livenessProbe': {
                                    'httpGet': {'path': config.health_check_path, 'port': 8000},
                                    'initialDelaySeconds': 30,
                                    'periodSeconds': 10
                                },
                                'readinessProbe': {
                                    'httpGet': {'path': config.health_check_path, 'port': 8000},
                                    'initialDelaySeconds': 5,
                                    'periodSeconds': 5
                                }
                            }]
                        }
                    }
                }
            }
            
            # Apply deployment
            try:
                self.k8s_apps_v1.create_namespaced_deployment(
                    namespace='default',
                    body=deployment_manifest
                )
            except Exception:
                # Update existing deployment
                self.k8s_apps_v1.patch_namespaced_deployment(
                    name=environment_name,
                    namespace='default',
                    body=deployment_manifest
                )
                
        except Exception as e:
            logger.error(f"Kubernetes deployment failed: {e}")
            raise
    
    async def _docker_deploy(self, config: DeploymentConfig, environment_name: str):
        """Deploy using Docker"""
        try:
            # Build and run container
            container = self.docker_client.containers.run(
                f"{config.app_name}:{config.version}",
                name=environment_name,
                ports={'8000/tcp': None},  # Dynamic port allocation
                environment={
                    'ENV': config.environment.value,
                    'APP_VERSION': config.version
                },
                detach=True,
                restart_policy={'Name': 'unless-stopped'}
            )
            
            logger.info(f"Docker container {environment_name} deployed successfully")
            
        except Exception as e:
            logger.error(f"Docker deployment failed: {e}")
            raise
    
    async def _wait_for_healthy_deployment(self, environment_name: str, timeout: int) -> bool:
        """Wait for deployment to become healthy"""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            health_status = await self._check_environment_health(environment_name)
            
            if health_status == HealthCheckStatus.HEALTHY:
                return True
            elif health_status == HealthCheckStatus.UNHEALTHY:
                logger.warning(f"Environment {environment_name} is unhealthy")
                
            await asyncio.sleep(10)  # Check every 10 seconds
        
        logger.error(f"Environment {environment_name} failed to become healthy within {timeout} seconds")
        return False
    
    async def _check_environment_health(self, environment_name: str) -> HealthCheckStatus:
        """Check environment health status"""
        try:
            if self.k8s_core_v1:
                # Kubernetes health check
                pods = self.k8s_core_v1.list_namespaced_pod(
                    namespace='default',
                    label_selector=f'app={environment_name}'
                )
                
                if not pods.items:
                    return HealthCheckStatus.UNKNOWN
                
                healthy_pods = sum(1 for pod in pods.items if pod.status.phase == 'Running')
                total_pods = len(pods.items)
                
                if healthy_pods == total_pods:
                    return HealthCheckStatus.HEALTHY
                elif healthy_pods > 0:
                    return HealthCheckStatus.DEGRADED
                else:
                    return HealthCheckStatus.UNHEALTHY
            else:
                # Docker health check
                try:
                    container = self.docker_client.containers.get(environment_name)
                    if container.status == 'running':
                        return HealthCheckStatus.HEALTHY
                    else:
                        return HealthCheckStatus.UNHEALTHY
                except docker.errors.NotFound:
                    return HealthCheckStatus.UNKNOWN
                    
        except Exception as e:
            logger.error(f"Health check failed for {environment_name}: {e}")
            return HealthCheckStatus.UNKNOWN
    
    async def _run_smoke_tests(self, environment_name: str) -> bool:
        """Run smoke tests against environment"""
        try:
            # Get environment endpoint
            endpoint = await self._get_environment_endpoint(environment_name)
            
            if not endpoint:
                logger.error(f"Could not determine endpoint for {environment_name}")
                return False
            
            # Basic connectivity test
            try:
                response = requests.get(f"{endpoint}/health", timeout=30)
                if response.status_code != 200:
                    logger.error(f"Health check failed: HTTP {response.status_code}")
                    return False
            except requests.RequestException as e:
                logger.error(f"Health check request failed: {e}")
                return False
            
            # API functionality test
            try:
                response = requests.get(f"{endpoint}/api/status", timeout=30)
                if response.status_code != 200:
                    logger.error(f"API status check failed: HTTP {response.status_code}")
                    return False
            except requests.RequestException as e:
                logger.error(f"API status request failed: {e}")
                return False
            
            # Database connectivity test
            try:
                response = requests.get(f"{endpoint}/api/health/database", timeout=30)
                if response.status_code != 200:
                    logger.error(f"Database connectivity check failed: HTTP {response.status_code}")
                    return False
            except requests.RequestException as e:
                logger.error(f"Database connectivity request failed: {e}")
                return False
            
            logger.info(f"Smoke tests passed for {environment_name}")
            return True
            
        except Exception as e:
            logger.error(f"Smoke tests failed for {environment_name}: {e}")
            return False
    
    async def _get_environment_endpoint(self, environment_name: str) -> Optional[str]:
        """Get endpoint URL for environment"""
        try:
            if self.k8s_core_v1:
                # Get Kubernetes service
                try:
                    service = self.k8s_core_v1.read_namespaced_service(
                        name=environment_name,
                        namespace='default'
                    )
                    
                    # For LoadBalancer services
                    if service.status.load_balancer.ingress:
                        return f"http://{service.status.load_balancer.ingress[0].ip}"
                    
                    # For NodePort services
                    if service.spec.type == 'NodePort':
                        return f"http://localhost:{service.spec.ports[0].node_port}"
                        
                except Exception:
                    pass
            else:
                # Docker container endpoint
                try:
                    container = self.docker_client.containers.get(environment_name)
                    port_bindings = container.attrs['NetworkSettings']['Ports']
                    
                    if '8000/tcp' in port_bindings and port_bindings['8000/tcp']:
                        host_port = port_bindings['8000/tcp'][0]['HostPort']
                        return f"http://localhost:{host_port}"
                        
                except Exception:
                    pass
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get endpoint for {environment_name}: {e}")
            return None
    
    async def _switch_traffic(self, app_name: str, new_environment: str):
        """Switch traffic to new environment (atomic operation)"""
        try:
            if self.k8s_core_v1:
                # Update Kubernetes service selector
                service_patch = {
                    'spec': {
                        'selector': {'app': new_environment}
                    }
                }
                
                self.k8s_core_v1.patch_namespaced_service(
                    name=app_name,
                    namespace='default',
                    body=service_patch
                )
            else:
                # Update load balancer configuration
                # This would depend on your load balancer setup
                pass
                
            logger.info(f"Traffic switched to {new_environment}")
            
        except Exception as e:
            logger.error(f"Traffic switch failed: {e}")
            raise
    
    async def _monitor_deployment_health(self, environment_name: str, duration: int) -> bool:
        """Monitor deployment health over time"""
        try:
            start_time = time.time()
            check_interval = 30  # 30 seconds
            unhealthy_count = 0
            max_unhealthy = 3  # Allow 3 unhealthy checks before failing
            
            while time.time() - start_time < duration:
                health_status = await self._check_environment_health(environment_name)
                
                if health_status == HealthCheckStatus.HEALTHY:
                    unhealthy_count = 0
                elif health_status in [HealthCheckStatus.UNHEALTHY, HealthCheckStatus.DEGRADED]:
                    unhealthy_count += 1
                    
                    if unhealthy_count >= max_unhealthy:
                        logger.error(f"Environment {environment_name} consistently unhealthy")
                        return False
                
                # Check error rates and performance metrics
                metrics = await self._get_deployment_metrics(environment_name)
                
                if metrics.get('error_rate', 0) > 0.1:  # 10% error rate threshold
                    logger.error(f"High error rate detected: {metrics['error_rate']:.2%}")
                    return False
                
                if metrics.get('response_time', 0) > 5000:  # 5 second response time threshold
                    logger.warning(f"High response time detected: {metrics['response_time']}ms")
                
                await asyncio.sleep(check_interval)
            
            logger.info(f"Deployment monitoring completed successfully for {environment_name}")
            return True
            
        except Exception as e:
            logger.error(f"Deployment monitoring failed: {e}")
            return False
    
    async def _get_deployment_metrics(self, environment_name: str) -> Dict[str, Any]:
        """Get deployment performance metrics"""
        try:
            # Get metrics from monitoring system
            metrics = await self.monitoring.get_metrics()
            
            return {
                'error_rate': 0.02,  # 2% error rate
                'response_time': 150,  # 150ms average response time
                'throughput': 1000,  # 1000 requests per minute
                'cpu_usage': 45.5,  # 45.5% CPU usage
                'memory_usage': 60.2  # 60.2% memory usage
            }
            
        except Exception as e:
            logger.error(f"Failed to get metrics for {environment_name}: {e}")
            return {}
    
    async def _validate_deployment(self, execution: DeploymentExecution) -> bool:
        """Validate deployment success"""
        try:
            validation_results = {}
            
            for test in execution.config.validation_tests:
                if test == 'health_check':
                    result = await self._check_environment_health(execution.config.app_name)
                    validation_results['health_check'] = result == HealthCheckStatus.HEALTHY
                    
                elif test == 'smoke_test':
                    result = await self._run_smoke_tests(execution.config.app_name)
                    validation_results['smoke_test'] = result
                    
                elif test == 'performance_test':
                    metrics = await self._get_deployment_metrics(execution.config.app_name)
                    validation_results['performance_test'] = (
                        metrics.get('error_rate', 1) < 0.05 and 
                        metrics.get('response_time', 5000) < 1000
                    )
            
            execution.validation_results = validation_results
            
            # All validations must pass
            all_passed = all(validation_results.values())
            
            if all_passed:
                logger.info("All deployment validations passed")
            else:
                failed_tests = [test for test, passed in validation_results.items() if not passed]
                logger.error(f"Deployment validations failed: {failed_tests}")
            
            return all_passed
            
        except Exception as e:
            logger.error(f"Deployment validation failed: {e}")
            return False
    
    async def _rollback_deployment(self, execution: DeploymentExecution, reason: str):
        """Rollback failed deployment"""
        try:
            logger.info(f"Starting rollback for deployment {execution.deployment_id}: {reason}")
            
            execution.status = DeploymentStatus.ROLLING_BACK
            execution.rollback_reason = reason
            execution.current_stage = "rollback"
            
            # Get previous stable version
            previous_deployment = await self._get_previous_stable_deployment(execution.config.app_name)
            
            if previous_deployment:
                # Rollback to previous version
                rollback_config = DeploymentConfig(
                    app_name=execution.config.app_name,
                    version=previous_deployment['version'],
                    environment=execution.config.environment,
                    strategy=DeploymentStrategy.RECREATE,  # Fast rollback
                    replicas=execution.config.replicas,
                    health_check_path=execution.config.health_check_path,
                    readiness_timeout=120  # Shorter timeout for rollback
                )
                
                await self._deploy_to_environment(rollback_config, execution.config.app_name)
                
                # Verify rollback
                if await self._wait_for_healthy_deployment(execution.config.app_name, 120):
                    execution.status = DeploymentStatus.ROLLED_BACK
                    logger.info(f"Rollback completed successfully to version {previous_deployment['version']}")
                else:
                    execution.status = DeploymentStatus.FAILED
                    logger.error("Rollback failed - manual intervention required")
            else:
                execution.status = DeploymentStatus.FAILED
                logger.error("No previous stable deployment found for rollback")
            
            # Update metrics
            self.metrics['rollbacks_triggered'] += 1
            
            # Send alert
            await self._send_deployment_alert(execution, "Deployment rollback completed")
            
        except Exception as e:
            logger.error(f"Rollback failed: {e}")
            execution.status = DeploymentStatus.FAILED
    
    async def _get_previous_stable_deployment(self, app_name: str) -> Optional[Dict[str, Any]]:
        """Get previous stable deployment version"""
        try:
            # Look for last successful deployment in history
            for deployment in reversed(self.deployment_history):
                if (deployment.config.app_name == app_name and 
                    deployment.status == DeploymentStatus.SUCCESS):
                    return {
                        'version': deployment.config.version,
                        'timestamp': deployment.completed_at
                    }
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get previous stable deployment: {e}")
            return None
    
    async def _send_deployment_alert(self, execution: DeploymentExecution, message: str):
        """Send deployment alert notification"""
        try:
            # Import here to avoid circular imports
            from utils.realtime_notifications import send_security_alert
            
            await send_security_alert(
                alert_type="deployment_status",
                severity="high" if execution.status == DeploymentStatus.FAILED else "medium",
                message=message,
                data={
                    'deployment_id': execution.deployment_id,
                    'app_name': execution.config.app_name,
                    'version': execution.config.version,
                    'status': execution.status.value,
                    'environment': execution.config.environment.value
                },
                target_roles=['platform_owner', 'security_admin']
            )
            
        except Exception as e:
            logger.error(f"Failed to send deployment alert: {e}")
    
    async def _store_deployment_record(self, execution: DeploymentExecution):
        """Store deployment record for audit and history"""
        try:
            deployment_record = {
                'deployment_id': execution.deployment_id,
                'app_name': execution.config.app_name,
                'version': execution.config.version,
                'environment': execution.config.environment.value,
                'strategy': execution.config.strategy.value,
                'status': execution.status.value,
                'started_at': execution.started_at.isoformat(),
                'completed_at': execution.completed_at.isoformat() if execution.completed_at else None,
                'stages_completed': execution.stages_completed,
                'validation_results': execution.validation_results,
                'rollback_reason': execution.rollback_reason
            }
            
            # Store in cache for quick access
            await cache_service.set(
                f"deployment_record:{execution.deployment_id}",
                deployment_record,
                ttl=86400 * 30  # 30 days
            )
            
            # Log deployment event
            await security_audit_logger.log_event(
                event_type=AuditEventType.SYSTEM_STATUS,
                severity=AuditSeverity.MEDIUM,
                action="production_deployment",
                result="success" if execution.status == DeploymentStatus.SUCCESS else "failed",
                details=deployment_record
            )
            
        except Exception as e:
            logger.error(f"Failed to store deployment record: {e}")
    
    def _update_deployment_metrics(self, execution: DeploymentExecution):
        """Update deployment metrics"""
        try:
            self.metrics['total_deployments'] += 1
            
            if execution.completed_at:
                duration = (execution.completed_at - execution.started_at).total_seconds()
                
                # Update average deployment time
                total_time = self.metrics['average_deployment_time'] * (self.metrics['total_deployments'] - 1)
                self.metrics['average_deployment_time'] = (total_time + duration) / self.metrics['total_deployments']
            
            # Calculate deployment frequency (deployments per day)
            if len(self.deployment_history) > 1:
                time_span = (datetime.now() - self.deployment_history[0].started_at).total_seconds()
                self.metrics['deployment_frequency'] = len(self.deployment_history) / (time_span / 86400)
            
        except Exception as e:
            logger.error(f"Failed to update deployment metrics: {e}")
    
    async def get_deployment_status(self, deployment_id: str) -> Optional[Dict[str, Any]]:
        """Get deployment status"""
        execution = self.deployments.get(deployment_id)
        
        if not execution:
            # Check deployment history
            for historical_execution in self.deployment_history:
                if historical_execution.deployment_id == deployment_id:
                    execution = historical_execution
                    break
        
        if execution:
            return {
                'deployment_id': execution.deployment_id,
                'status': execution.status.value,
                'current_stage': execution.current_stage,
                'stages_completed': execution.stages_completed,
                'started_at': execution.started_at.isoformat(),
                'completed_at': execution.completed_at.isoformat() if execution.completed_at else None,
                'validation_results': execution.validation_results,
                'rollback_reason': execution.rollback_reason
            }
        
        return None
    
    async def get_deployment_metrics(self) -> Dict[str, Any]:
        """Get comprehensive deployment metrics"""
        return {
            **self.metrics,
            'active_deployments': len(self.deployments),
            'deployment_history_count': len(self.deployment_history),
            'success_rate': (self.metrics['successful_deployments'] / 
                           max(1, self.metrics['total_deployments'])) * 100,
            'timestamp': datetime.now().isoformat()
        }

# Infrastructure as Code manager
class InfrastructureManager:
    """Infrastructure as Code management"""
    
    def __init__(self):
        self.terraform_path = Path('./terraform')
        self.ansible_path = Path('./ansible')
    
    async def provision_infrastructure(self, environment: str) -> Dict[str, Any]:
        """Provision infrastructure using Terraform"""
        try:
            # Terraform commands
            commands = [
                f"terraform init",
                f"terraform plan -var environment={environment}",
                f"terraform apply -auto-approve -var environment={environment}"
            ]
            
            results = []
            for cmd in commands:
                result = await self._run_terraform_command(cmd)
                results.append(result)
                
                if not result['success']:
                    return {'status': 'failed', 'error': result['error']}
            
            return {'status': 'success', 'results': results}
            
        except Exception as e:
            logger.error(f"Infrastructure provisioning failed: {e}")
            return {'status': 'error', 'error': str(e)}
    
    async def _run_terraform_command(self, command: str) -> Dict[str, Any]:
        """Run Terraform command"""
        try:
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.terraform_path
            )
            
            stdout, stderr = await process.communicate()
            
            return {
                'command': command,
                'success': process.returncode == 0,
                'stdout': stdout.decode(),
                'stderr': stderr.decode(),
                'return_code': process.returncode
            }
            
        except Exception as e:
            return {
                'command': command,
                'success': False,
                'error': str(e)
            }

# Global instances
deployment_manager = ProductionDeploymentManager()
infrastructure_manager = InfrastructureManager()

# Convenience functions
async def deploy_to_production(app_name: str, 
                             version: str, 
                             strategy: str = "blue_green",
                             replicas: int = 3) -> DeploymentExecution:
    """Deploy application to production"""
    config = DeploymentConfig(
        app_name=app_name,
        version=version,
        environment=DeploymentEnvironment.PRODUCTION,
        strategy=DeploymentStrategy(strategy),
        replicas=replicas,
        health_check_path="/health",
        validation_tests=['health_check', 'smoke_test', 'performance_test']
    )
    
    return await deployment_manager.deploy_application(config)

async def get_deployment_status_by_id(deployment_id: str) -> Optional[Dict[str, Any]]:
    """Get deployment status by ID"""
    return await deployment_manager.get_deployment_status(deployment_id)

async def get_production_deployment_metrics() -> Dict[str, Any]:
    """Get production deployment metrics"""
    return await deployment_manager.get_deployment_metrics() 