"""
SecureNet RQ Task Queue Service
Phase 3: Advanced Tooling - RQ Integration
"""

import rq
from rq import Queue, Worker
from rq.job import Job
from rq.registry import StartedJobRegistry, FinishedJobRegistry, FailedJobRegistry
import redis
import os
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime, timedelta
import json
from utils.logging_config import get_logger
from monitoring.prometheus_metrics import metrics

logger = get_logger(__name__)

class SecureNetRQ:
    """SecureNet RQ task queue service"""
    
    def __init__(self, redis_url: str = None):
        """Initialize SecureNet RQ service"""
        
        if redis_url is None:
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        
        self.redis_conn = redis.from_url(redis_url)
        
        # Create queues with different priorities
        self.high_queue = Queue("high", connection=self.redis_conn)
        self.default_queue = Queue("default", connection=self.redis_conn)
        self.low_queue = Queue("low", connection=self.redis_conn)
        
        logger.info("RQ service initialized", redis_url=redis_url)
    
    async def initialize(self):
        """Initialize the RQ service (async method for compatibility)"""
        # Test Redis connection
        try:
            self.redis_conn.ping()
            logger.info("✅ RQ service initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize RQ service: {e}")
            raise
    
    async def close(self):
        """Close RQ service connections"""
        try:
            if self.redis_conn:
                self.redis_conn.close()
            logger.info("✅ RQ service closed successfully")
        except Exception as e:
            logger.error(f"❌ Error closing RQ service: {e}")
    
    def enqueue_scan_task(self, 
                         tenant_id: str, 
                         scan_type: str, 
                         target: str, 
                         config: Dict[str, Any] = None,
                         priority: str = "default") -> str:
        """Enqueue a security scan task"""
        
        task_data = {
            "tenant_id": tenant_id,
            "scan_type": scan_type,
            "target": target,
            "config": config or {},
            "created_at": datetime.utcnow().isoformat()
        }
        
        queue = self._get_queue(priority)
        job = queue.enqueue(
            'tasks.scan_tasks.execute_scan',
            task_data,
            job_timeout='30m',
            result_ttl=86400,  # Keep results for 24 hours
            failure_ttl=86400,
            job_id=f"scan_{tenant_id}_{scan_type}_{int(datetime.utcnow().timestamp())}"
        )
        
        logger.info(
            "Scan task enqueued",
            job_id=job.id,
            tenant_id=tenant_id,
            scan_type=scan_type,
            target=target,
            priority=priority
        )
        
        return job.id
    
    def enqueue_threat_analysis(self, 
                              tenant_id: str, 
                              threat_data: Dict[str, Any],
                              priority: str = "high") -> str:
        """Enqueue threat analysis task"""
        
        task_data = {
            "tenant_id": tenant_id,
            "threat_data": threat_data,
            "created_at": datetime.utcnow().isoformat()
        }
        
        queue = self._get_queue(priority)
        job = queue.enqueue(
            'tasks.threat_tasks.analyze_threat',
            task_data,
            job_timeout='10m',
            result_ttl=86400,
            failure_ttl=86400,
            job_id=f"threat_{tenant_id}_{int(datetime.utcnow().timestamp())}"
        )
        
        logger.info(
            "Threat analysis task enqueued",
            job_id=job.id,
            tenant_id=tenant_id,
            priority=priority
        )
        
        return job.id
    
    def enqueue_report_generation(self, 
                                tenant_id: str, 
                                report_type: str, 
                                parameters: Dict[str, Any],
                                priority: str = "low") -> str:
        """Enqueue report generation task"""
        
        task_data = {
            "tenant_id": tenant_id,
            "report_type": report_type,
            "parameters": parameters,
            "created_at": datetime.utcnow().isoformat()
        }
        
        queue = self._get_queue(priority)
        job = queue.enqueue(
            'tasks.report_tasks.generate_report',
            task_data,
            job_timeout='60m',
            result_ttl=604800,  # Keep reports for 7 days
            failure_ttl=86400,
            job_id=f"report_{tenant_id}_{report_type}_{int(datetime.utcnow().timestamp())}"
        )
        
        logger.info(
            "Report generation task enqueued",
            job_id=job.id,
            tenant_id=tenant_id,
            report_type=report_type,
            priority=priority
        )
        
        return job.id
    
    def enqueue_ml_training(self, 
                          model_name: str, 
                          training_config: Dict[str, Any],
                          priority: str = "low") -> str:
        """Enqueue ML model training task"""
        
        task_data = {
            "model_name": model_name,
            "training_config": training_config,
            "created_at": datetime.utcnow().isoformat()
        }
        
        queue = self._get_queue(priority)
        job = queue.enqueue(
            'tasks.ml_tasks.train_model',
            task_data,
            job_timeout='120m',
            result_ttl=604800,
            failure_ttl=86400,
            job_id=f"ml_train_{model_name}_{int(datetime.utcnow().timestamp())}"
        )
        
        logger.info(
            "ML training task enqueued",
            job_id=job.id,
            model_name=model_name,
            priority=priority
        )
        
        return job.id
    
    def is_healthy(self) -> bool:
        """Check if RQ service is healthy"""
        try:
            # Test Redis connection
            self.redis_conn.ping()
            
            # Check if queues are accessible
            high_count = len(self.high_queue)
            default_count = len(self.default_queue)
            low_count = len(self.low_queue)
            
            logger.debug(f"RQ service health check passed - Queues: high={high_count}, default={default_count}, low={low_count}")
            return True
            
        except Exception as e:
            logger.error(f"RQ service health check failed: {e}")
            return False
    
    def health_check(self) -> str:
        """Get health check status as string"""
        return "healthy" if self.is_healthy() else "unhealthy"
    
    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job status and details"""
        
        try:
            job = Job.fetch(job_id, connection=self.redis_conn)
            
            return {
                "id": job.id,
                "status": job.get_status(),
                "created_at": job.created_at.isoformat() if job.created_at else None,
                "started_at": job.started_at.isoformat() if job.started_at else None,
                "ended_at": job.ended_at.isoformat() if job.ended_at else None,
                "result": job.result,
                "exc_info": job.exc_info,
                "meta": job.meta
            }
            
        except Exception as e:
            logger.error("Failed to fetch job status", job_id=job_id, error=str(e))
            return None
    
    def cancel_job(self, job_id: str) -> bool:
        """Cancel a job"""
        
        try:
            job = Job.fetch(job_id, connection=self.redis_conn)
            job.cancel()
            
            logger.info("Job cancelled", job_id=job_id)
            return True
            
        except Exception as e:
            logger.error("Failed to cancel job", job_id=job_id, error=str(e))
            return False
    
    def get_queue_stats(self) -> Dict[str, Any]:
        """Get queue statistics"""
        
        stats = {}
        
        for queue_name, queue in [
            ("high", self.high_queue),
            ("default", self.default_queue),
            ("low", self.low_queue)
        ]:
            stats[queue_name] = {
                "length": len(queue),
                "started_jobs": len(StartedJobRegistry(queue=queue)),
                "finished_jobs": len(FinishedJobRegistry(queue=queue)),
                "failed_jobs": len(FailedJobRegistry(queue=queue))
            }
        
        return stats
    
    def get_failed_jobs(self, queue_name: str = "default") -> List[Dict[str, Any]]:
        """Get failed jobs from queue"""
        
        queue = self._get_queue(queue_name)
        failed_registry = FailedJobRegistry(queue=queue)
        
        failed_jobs = []
        for job_id in failed_registry.get_job_ids():
            try:
                job = Job.fetch(job_id, connection=self.redis_conn)
                failed_jobs.append({
                    "id": job.id,
                    "created_at": job.created_at.isoformat() if job.created_at else None,
                    "failed_at": job.ended_at.isoformat() if job.ended_at else None,
                    "exc_info": job.exc_info,
                    "meta": job.meta
                })
            except Exception as e:
                logger.error("Failed to fetch failed job", job_id=job_id, error=str(e))
        
        return failed_jobs
    
    def retry_failed_job(self, job_id: str) -> bool:
        """Retry a failed job"""
        
        try:
            job = Job.fetch(job_id, connection=self.redis_conn)
            job.retry()
            
            logger.info("Job retried", job_id=job_id)
            return True
            
        except Exception as e:
            logger.error("Failed to retry job", job_id=job_id, error=str(e))
            return False
    
    def _get_queue(self, priority: str) -> Queue:
        """Get queue by priority"""
        
        queue_map = {
            "high": self.high_queue,
            "default": self.default_queue,
            "low": self.low_queue
        }
        
        return queue_map.get(priority, self.default_queue)

class RQWorkerManager:
    """RQ worker management"""
    
    def __init__(self, rq_service: SecureNetRQ):
        self.rq_service = rq_service
        self.logger = get_logger("rq_worker_manager")
        self.workers = []
    
    def start_worker(self, 
                    queues: List[str] = None, 
                    worker_name: str = None,
                    max_jobs: int = None) -> Worker:
        """Start an RQ worker"""
        
        if queues is None:
            queues = ['high', 'default', 'low']
        
        queue_objects = [self.rq_service._get_queue(q) for q in queues]
        
        worker = Worker(
            queue_objects,
            connection=self.rq_service.redis_conn,
            name=worker_name
        )
        
        if max_jobs:
            worker.max_jobs = max_jobs
        
        self.workers.append(worker)
        
        self.logger.info(
            "Worker started",
            worker_name=worker.name,
            queues=queues,
            max_jobs=max_jobs
        )
        
        return worker
    
    def get_worker_stats(self) -> List[Dict[str, Any]]:
        """Get statistics for all workers"""
        
        stats = []
        
        for worker in Worker.all(connection=self.rq_service.redis_conn):
            stats.append({
                "name": worker.name,
                "state": worker.get_state(),
                "current_job": worker.get_current_job_id(),
                "successful_jobs": worker.successful_job_count,
                "failed_jobs": worker.failed_job_count,
                "total_working_time": worker.total_working_time,
                "birth_date": worker.birth_date.isoformat() if worker.birth_date else None,
                "last_heartbeat": worker.last_heartbeat.isoformat() if worker.last_heartbeat else None
            })
        
        return stats
    
    def stop_worker(self, worker_name: str) -> bool:
        """Stop a specific worker"""
        
        try:
            workers = Worker.all(connection=self.rq_service.redis_conn)
            for worker in workers:
                if worker.name == worker_name:
                    worker.request_stop()
                    self.logger.info("Worker stop requested", worker_name=worker_name)
                    return True
            
            return False
            
        except Exception as e:
            self.logger.error("Failed to stop worker", worker_name=worker_name, error=str(e))
            return False

# Task functions (these would be in separate modules)
def execute_scan(task_data: Dict[str, Any]) -> Dict[str, Any]:
    """Execute security scan task"""
    
    logger.info("Executing scan task", task_data=task_data)
    
    # Simulate scan execution
    import time
    time.sleep(5)  # Simulate work
    
    result = {
        "scan_id": f"scan_{int(datetime.utcnow().timestamp())}",
        "status": "completed",
        "vulnerabilities_found": 3,
        "completed_at": datetime.utcnow().isoformat()
    }
    
    # Record metrics
    metrics.record_scan_duration(
        task_data["tenant_id"], 
        task_data["scan_type"], 
        5.0
    )
    
    return result

def analyze_threat(task_data: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze threat task"""
    
    logger.info("Analyzing threat", task_data=task_data)
    
    # Simulate threat analysis
    import time
    time.sleep(2)
    
    result = {
        "analysis_id": f"analysis_{int(datetime.utcnow().timestamp())}",
        "threat_level": "medium",
        "confidence": 0.85,
        "recommendations": ["Block IP", "Update firewall rules"],
        "completed_at": datetime.utcnow().isoformat()
    }
    
    # Record metrics
    metrics.record_threat_detection(
        task_data["tenant_id"],
        task_data["threat_data"].get("type", "unknown"),
        "medium"
    )
    
    return result

# Global RQ service instance
rq_service = SecureNetRQ()
worker_manager = RQWorkerManager(rq_service) 