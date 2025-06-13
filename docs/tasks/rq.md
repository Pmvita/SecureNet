✅ **Integrated in Phase 3** – See [phase guide](../integration/phase-3-advanced-tooling.md)

# RQ - Alternative Task Queue

RQ (Redis Queue) is a simple Python library for queueing jobs and processing them in the background with workers. It's backed by Redis and provides a lightweight alternative to Celery.

## 🎯 Purpose for SecureNet

- **Background Processing** - Handle long-running security scans
- **Job Scheduling** - Schedule periodic threat detection tasks
- **Scalable Workers** - Distribute workload across multiple workers
- **Failure Handling** - Robust error handling and job retry mechanisms
- **Real-time Monitoring** - Monitor job progress and worker status

## 📦 Installation

```bash
pip install rq
pip install redis
```

## 🔧 Integration

### Core RQ Setup

**File**: `tasks/rq_service.py`

```python
import rq
from rq import Queue, Worker, Connection
from rq.job import Job
from rq.registry import StartedJobRegistry, FinishedJobRegistry, FailedJobRegistry
import redis
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timedelta
import structlog
import json

logger = structlog.get_logger()

class SecureNetRQ:
    """RQ task queue service for SecureNet"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379/0"):
        self.redis_conn = redis.from_url(redis_url)
        
        # Initialize queues with different priorities
        self.high_priority_queue = Queue('high_priority', connection=self.redis_conn)
        self.default_queue = Queue('default', connection=self.redis_conn)
        self.low_priority_queue = Queue('low_priority', connection=self.redis_conn)
        
        logger.info("RQ service initialized", redis_url=redis_url)
    
    def enqueue_scan_job(self, 
                        scan_type: str,
                        target: str,
                        tenant_id: str,
                        scan_config: Dict[str, Any],
                        priority: str = "default") -> str:
        """Enqueue network scan job"""
        
        queue = self._get_queue(priority)
        
        job = queue.enqueue(
            'tasks.scan_tasks.run_network_scan',
            scan_type=scan_type,
            target=target,
            tenant_id=tenant_id,
            scan_config=scan_config,
            job_timeout='30m',
            result_ttl=86400,  # Keep results for 24 hours
            meta={
                'tenant_id': tenant_id,
                'scan_type': scan_type,
                'target': target,
                'created_at': datetime.utcnow().isoformat()
            }
        )
        
        logger.info(
            "Scan job enqueued",
            job_id=job.id,
            scan_type=scan_type,
            target=target,
            tenant_id=tenant_id,
            priority=priority
        )
        
        return job.id
    
    def enqueue_threat_analysis(self,
                              network_data: List[Dict],
                              tenant_id: str,
                              analysis_config: Dict[str, Any]) -> str:
        """Enqueue threat analysis job"""
        
        job = self.high_priority_queue.enqueue(
            'tasks.analysis_tasks.analyze_threats',
            network_data=network_data,
            tenant_id=tenant_id,
            analysis_config=analysis_config,
            job_timeout='10m',
            result_ttl=3600,  # Keep results for 1 hour
            meta={
                'tenant_id': tenant_id,
                'data_points': len(network_data),
                'created_at': datetime.utcnow().isoformat()
            }
        )
        
        logger.info(
            "Threat analysis job enqueued",
            job_id=job.id,
            tenant_id=tenant_id,
            data_points=len(network_data)
        )
        
        return job.id
    
    def enqueue_report_generation(self,
                                report_type: str,
                                tenant_id: str,
                                report_config: Dict[str, Any]) -> str:
        """Enqueue report generation job"""
        
        job = self.low_priority_queue.enqueue(
            'tasks.report_tasks.generate_report',
            report_type=report_type,
            tenant_id=tenant_id,
            report_config=report_config,
            job_timeout='1h',
            result_ttl=604800,  # Keep results for 1 week
            meta={
                'tenant_id': tenant_id,
                'report_type': report_type,
                'created_at': datetime.utcnow().isoformat()
            }
        )
        
        logger.info(
            "Report generation job enqueued",
            job_id=job.id,
            report_type=report_type,
            tenant_id=tenant_id
        )
        
        return job.id
    
    def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """Get job status and progress"""
        
        try:
            job = Job.fetch(job_id, connection=self.redis_conn)
            
            status_info = {
                'job_id': job_id,
                'status': job.get_status(),
                'created_at': job.created_at.isoformat() if job.created_at else None,
                'started_at': job.started_at.isoformat() if job.started_at else None,
                'ended_at': job.ended_at.isoformat() if job.ended_at else None,
                'meta': job.meta,
                'progress': job.meta.get('progress', 0) if job.meta else 0
            }
            
            # Add result if job is finished
            if job.is_finished:
                status_info['result'] = job.result
            
            # Add error info if job failed
            if job.is_failed:
                status_info['error'] = str(job.exc_info) if job.exc_info else "Unknown error"
            
            return status_info
            
        except Exception as e:
            logger.error("Failed to get job status", job_id=job_id, error=str(e))
            return {
                'job_id': job_id,
                'status': 'not_found',
                'error': str(e)
            }
    
    def cancel_job(self, job_id: str) -> bool:
        """Cancel a queued or running job"""
        
        try:
            job = Job.fetch(job_id, connection=self.redis_conn)
            
            if job.is_queued:
                job.cancel()
                logger.info("Job cancelled", job_id=job_id)
                return True
            elif job.is_started:
                # For running jobs, we can only mark them for cancellation
                job.meta['cancelled'] = True
                job.save_meta()
                logger.info("Job marked for cancellation", job_id=job_id)
                return True
            else:
                logger.warning("Job cannot be cancelled", job_id=job_id, status=job.get_status())
                return False
                
        except Exception as e:
            logger.error("Failed to cancel job", job_id=job_id, error=str(e))
            return False
    
    def get_queue_stats(self) -> Dict[str, Any]:
        """Get statistics for all queues"""
        
        stats = {}
        
        for queue_name, queue in [
            ('high_priority', self.high_priority_queue),
            ('default', self.default_queue),
            ('low_priority', self.low_priority_queue)
        ]:
            stats[queue_name] = {
                'queued_jobs': len(queue),
                'started_jobs': len(StartedJobRegistry(queue=queue)),
                'finished_jobs': len(FinishedJobRegistry(queue=queue)),
                'failed_jobs': len(FailedJobRegistry(queue=queue))
            }
        
        return stats
    
    def _get_queue(self, priority: str) -> Queue:
        """Get queue by priority"""
        
        queue_map = {
            'high': self.high_priority_queue,
            'default': self.default_queue,
            'low': self.low_priority_queue
        }
        
        return queue_map.get(priority, self.default_queue)

class RQWorkerManager:
    """Manage RQ workers"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379/0"):
        self.redis_conn = redis.from_url(redis_url)
        
    def start_worker(self, 
                    queues: List[str] = None,
                    worker_name: str = None) -> Worker:
        """Start RQ worker"""
        
        if queues is None:
            queues = ['high_priority', 'default', 'low_priority']
        
        queue_objects = [Queue(name, connection=self.redis_conn) for name in queues]
        
        worker = Worker(
            queues=queue_objects,
            connection=self.redis_conn,
            name=worker_name
        )
        
        logger.info("Starting RQ worker", worker_name=worker_name, queues=queues)
        
        # Start worker (this blocks)
        worker.work()
        
        return worker
    
    def get_worker_stats(self) -> List[Dict[str, Any]]:
        """Get statistics for all workers"""
        
        workers = Worker.all(connection=self.redis_conn)
        
        worker_stats = []
        for worker in workers:
            stats = {
                'name': worker.name,
                'state': worker.get_state(),
                'current_job': worker.get_current_job_id(),
                'successful_jobs': worker.successful_job_count,
                'failed_jobs': worker.failed_job_count,
                'total_working_time': worker.total_working_time,
                'birth_date': worker.birth_date.isoformat() if worker.birth_date else None,
                'last_heartbeat': worker.last_heartbeat.isoformat() if worker.last_heartbeat else None
            }
            worker_stats.append(stats)
        
        return worker_stats
```

### Task Implementations

**File**: `tasks/scan_tasks.py`

```python
from rq import get_current_job
import time
import random
from typing import Dict, Any, List
import structlog

logger = structlog.get_logger()

def run_network_scan(scan_type: str, 
                    target: str, 
                    tenant_id: str, 
                    scan_config: Dict[str, Any]) -> Dict[str, Any]:
    """Network scan task implementation"""
    
    job = get_current_job()
    
    logger.info(
        "Starting network scan",
        job_id=job.id,
        scan_type=scan_type,
        target=target,
        tenant_id=tenant_id
    )
    
    try:
        # Update job progress
        job.meta['progress'] = 0
        job.meta['status'] = 'initializing'
        job.save_meta()
        
        # Simulate scan phases
        phases = [
            ('discovery', 20),
            ('port_scanning', 40),
            ('vulnerability_detection', 70),
            ('analysis', 90),
            ('reporting', 100)
        ]
        
        results = {
            'scan_id': job.id,
            'scan_type': scan_type,
            'target': target,
            'tenant_id': tenant_id,
            'hosts_discovered': [],
            'vulnerabilities': [],
            'scan_duration': 0
        }
        
        start_time = time.time()
        
        for phase, progress in phases:
            # Check for cancellation
            job.refresh()
            if job.meta.get('cancelled', False):
                logger.info("Scan cancelled", job_id=job.id)
                return {'status': 'cancelled', 'message': 'Scan was cancelled'}
            
            # Update progress
            job.meta['progress'] = progress
            job.meta['current_phase'] = phase
            job.save_meta()
            
            # Simulate work
            time.sleep(random.uniform(1, 3))
            
            # Generate mock results based on phase
            if phase == 'discovery':
                results['hosts_discovered'] = [
                    f"{target.split('/')[0]}.{i}" for i in range(1, random.randint(5, 20))
                ]
            elif phase == 'vulnerability_detection':
                results['vulnerabilities'] = [
                    {
                        'cve_id': f"CVE-2023-{random.randint(1000, 9999)}",
                        'severity': random.choice(['low', 'medium', 'high', 'critical']),
                        'host': random.choice(results['hosts_discovered']),
                        'description': f"Mock vulnerability {random.randint(1, 100)}"
                    }
                    for _ in range(random.randint(0, 10))
                ]
        
        # Finalize results
        results['scan_duration'] = time.time() - start_time
        results['status'] = 'completed'
        results['completed_at'] = time.time()
        
        logger.info(
            "Network scan completed",
            job_id=job.id,
            hosts_found=len(results['hosts_discovered']),
            vulnerabilities_found=len(results['vulnerabilities']),
            duration=results['scan_duration']
        )
        
        return results
        
    except Exception as e:
        logger.error("Network scan failed", job_id=job.id, error=str(e))
        raise

def run_vulnerability_scan(target: str, tenant_id: str, scan_config: Dict[str, Any]) -> Dict[str, Any]:
    """Vulnerability scan task"""
    
    job = get_current_job()
    
    # Simulate vulnerability scanning
    time.sleep(random.uniform(5, 15))
    
    vulnerabilities = [
        {
            'cve_id': f"CVE-2023-{random.randint(1000, 9999)}",
            'severity': random.choice(['low', 'medium', 'high', 'critical']),
            'cvss_score': random.uniform(1.0, 10.0),
            'description': f"Vulnerability found in {target}",
            'remediation': "Update to latest version"
        }
        for _ in range(random.randint(0, 5))
    ]
    
    return {
        'scan_id': job.id,
        'target': target,
        'tenant_id': tenant_id,
        'vulnerabilities': vulnerabilities,
        'scan_type': 'vulnerability',
        'status': 'completed'
    }
```

**File**: `tasks/analysis_tasks.py`

```python
from rq import get_current_job
import time
import random
from typing import Dict, Any, List
import structlog

logger = structlog.get_logger()

def analyze_threats(network_data: List[Dict], 
                   tenant_id: str, 
                   analysis_config: Dict[str, Any]) -> Dict[str, Any]:
    """Threat analysis task implementation"""
    
    job = get_current_job()
    
    logger.info(
        "Starting threat analysis",
        job_id=job.id,
        tenant_id=tenant_id,
        data_points=len(network_data)
    )
    
    try:
        # Update progress
        job.meta['progress'] = 0
        job.meta['status'] = 'analyzing'
        job.save_meta()
        
        threats_detected = []
        
        # Simulate analysis of network data
        for i, data_point in enumerate(network_data):
            # Check for cancellation
            job.refresh()
            if job.meta.get('cancelled', False):
                return {'status': 'cancelled'}
            
            # Update progress
            progress = int((i + 1) / len(network_data) * 100)
            job.meta['progress'] = progress
            job.save_meta()
            
            # Simulate threat detection logic
            if random.random() < 0.1:  # 10% chance of threat
                threat = {
                    'threat_id': f"threat_{job.id}_{i}",
                    'type': random.choice(['malware', 'intrusion', 'anomaly']),
                    'severity': random.choice(['low', 'medium', 'high', 'critical']),
                    'confidence': random.uniform(0.7, 1.0),
                    'source_ip': data_point.get('source_ip', '192.168.1.100'),
                    'detected_at': time.time(),
                    'description': f"Suspicious activity detected in network traffic"
                }
                threats_detected.append(threat)
            
            # Small delay to simulate processing
            time.sleep(0.01)
        
        results = {
            'analysis_id': job.id,
            'tenant_id': tenant_id,
            'data_points_analyzed': len(network_data),
            'threats_detected': threats_detected,
            'threat_count': len(threats_detected),
            'analysis_duration': time.time() - job.started_at.timestamp(),
            'status': 'completed'
        }
        
        logger.info(
            "Threat analysis completed",
            job_id=job.id,
            threats_found=len(threats_detected),
            data_points=len(network_data)
        )
        
        return results
        
    except Exception as e:
        logger.error("Threat analysis failed", job_id=job.id, error=str(e))
        raise

def analyze_network_anomalies(network_data: List[Dict], 
                             tenant_id: str) -> Dict[str, Any]:
    """Network anomaly detection task"""
    
    job = get_current_job()
    
    # Simulate ML-based anomaly detection
    time.sleep(random.uniform(2, 8))
    
    anomalies = []
    for i, data_point in enumerate(network_data):
        if random.random() < 0.05:  # 5% anomaly rate
            anomaly = {
                'anomaly_id': f"anomaly_{job.id}_{i}",
                'anomaly_score': random.uniform(0.8, 1.0),
                'data_point': data_point,
                'detected_at': time.time()
            }
            anomalies.append(anomaly)
    
    return {
        'analysis_id': job.id,
        'tenant_id': tenant_id,
        'anomalies': anomalies,
        'anomaly_count': len(anomalies),
        'status': 'completed'
    }
```

### FastAPI Integration

**File**: `api/rq_endpoints.py`

```python
from fastapi import APIRouter, HTTPException, Depends
from tasks.rq_service import SecureNetRQ
from typing import Dict, Any, List
import structlog

logger = structlog.get_logger()
router = APIRouter(prefix="/api/jobs", tags=["jobs"])

# Initialize RQ service
rq_service = SecureNetRQ()

@router.post("/scan")
async def start_scan_job(scan_request: Dict[str, Any]):
    """Start network scan job"""
    
    try:
        job_id = rq_service.enqueue_scan_job(
            scan_type=scan_request.get("scan_type", "network"),
            target=scan_request["target"],
            tenant_id=scan_request["tenant_id"],
            scan_config=scan_request.get("config", {}),
            priority=scan_request.get("priority", "default")
        )
        
        return {
            "job_id": job_id,
            "status": "queued",
            "message": "Scan job started successfully"
        }
        
    except Exception as e:
        logger.error("Failed to start scan job", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analysis")
async def start_analysis_job(analysis_request: Dict[str, Any]):
    """Start threat analysis job"""
    
    try:
        job_id = rq_service.enqueue_threat_analysis(
            network_data=analysis_request["network_data"],
            tenant_id=analysis_request["tenant_id"],
            analysis_config=analysis_request.get("config", {})
        )
        
        return {
            "job_id": job_id,
            "status": "queued",
            "message": "Analysis job started successfully"
        }
        
    except Exception as e:
        logger.error("Failed to start analysis job", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{job_id}")
async def get_job_status(job_id: str):
    """Get job status and progress"""
    
    status = rq_service.get_job_status(job_id)
    
    if status.get('status') == 'not_found':
        raise HTTPException(status_code=404, detail="Job not found")
    
    return status

@router.delete("/cancel/{job_id}")
async def cancel_job(job_id: str):
    """Cancel a job"""
    
    success = rq_service.cancel_job(job_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Job could not be cancelled")
    
    return {"message": "Job cancelled successfully"}

@router.get("/stats")
async def get_queue_stats():
    """Get queue statistics"""
    
    return rq_service.get_queue_stats()
```

## 🚀 Usage Examples

### Basic Job Enqueueing

```python
from tasks.rq_service import SecureNetRQ

# Initialize RQ service
rq_service = SecureNetRQ()

# Enqueue scan job
job_id = rq_service.enqueue_scan_job(
    scan_type="vulnerability",
    target="192.168.1.0/24",
    tenant_id="tenant_123",
    scan_config={"deep_scan": True},
    priority="high"
)

print(f"Job enqueued: {job_id}")

# Check job status
status = rq_service.get_job_status(job_id)
print(f"Job status: {status['status']}")
```

### Starting Workers

```bash
# Start RQ worker
python -m rq worker high_priority default low_priority --url redis://localhost:6379

# Start worker with specific name
python -m rq worker --name securenet-worker-1 --url redis://localhost:6379
```

### Monitoring Jobs

```python
# Get queue statistics
stats = rq_service.get_queue_stats()
print(f"Queued jobs: {stats['default']['queued_jobs']}")

# Monitor job progress
import time

while True:
    status = rq_service.get_job_status(job_id)
    print(f"Progress: {status.get('progress', 0)}%")
    
    if status['status'] in ['finished', 'failed']:
        break
    
    time.sleep(1)
```

## ✅ Validation Steps

1. **Install RQ and Redis**:
   ```bash
   pip install rq redis
   # Start Redis server
   redis-server
   ```

2. **Test Job Enqueueing**:
   ```python
   from tasks.rq_service import SecureNetRQ
   
   rq_service = SecureNetRQ()
   job_id = rq_service.enqueue_scan_job("test", "127.0.0.1", "test_tenant", {})
   print(f"Job ID: {job_id}")
   ```

3. **Start Worker**:
   ```bash
   python -m rq worker --url redis://localhost:6379
   ```

4. **Monitor with RQ Dashboard**:
   ```bash
   pip install rq-dashboard
   rq-dashboard --redis-url redis://localhost:6379
   # Open http://localhost:9181
   ```

## 📈 Benefits for SecureNet

- **Lightweight** - Simpler than Celery for basic use cases
- **Redis-backed** - Reliable job persistence and distribution
- **Real-time Monitoring** - Built-in job progress tracking
- **Failure Handling** - Automatic retry and error handling
- **Scalable** - Easy horizontal scaling with multiple workers
- **Python-native** - Pure Python implementation

## 🔗 Related Documentation

- [Phase 3: Advanced Tooling](../integration/phase-3-advanced-tooling.md)
- [Task Management Overview](README.md)
- [APScheduler Integration](apscheduler.md) 