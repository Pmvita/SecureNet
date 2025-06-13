✅ **Integrated in Phase 3** – See [phase guide](../integration/phase-3-advanced-tooling.md)

# APScheduler - In-Process Scheduling

Advanced Python Scheduler (APScheduler) is a Python library that lets you schedule your Python code to be executed later, either just once or periodically.

## 🎯 Purpose for SecureNet

- **Periodic Scans** - Schedule regular security scans
- **Maintenance Tasks** - Automate system maintenance and cleanup
- **Report Generation** - Schedule automated report generation
- **Data Processing** - Periodic data analysis and processing
- **Health Checks** - Regular system health monitoring

## 📦 Installation

```bash
pip install apscheduler
```

## 🔧 Integration

### Core Scheduler Service

**File**: `tasks/scheduler_service.py`

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.executors.pool import ThreadPoolExecutor
from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR, EVENT_JOB_MISSED
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable
import structlog

logger = structlog.get_logger()

class SecureNetScheduler:
    """Advanced scheduler service for SecureNet"""
    
    def __init__(self, 
                 database_url: str = "sqlite:///scheduler.db",
                 max_workers: int = 10):
        
        # Configure job stores
        jobstores = {
            'default': SQLAlchemyJobStore(url=database_url)
        }
        
        # Configure executors
        executors = {
            'default': ThreadPoolExecutor(max_workers),
        }
        
        # Job defaults
        job_defaults = {
            'coalesce': False,
            'max_instances': 3,
            'misfire_grace_time': 30
        }
        
        # Initialize scheduler
        self.scheduler = AsyncIOScheduler(
            jobstores=jobstores,
            executors=executors,
            job_defaults=job_defaults,
            timezone='UTC'
        )
        
        # Add event listeners
        self.scheduler.add_listener(self._job_executed, EVENT_JOB_EXECUTED)
        self.scheduler.add_listener(self._job_error, EVENT_JOB_ERROR)
        self.scheduler.add_listener(self._job_missed, EVENT_JOB_MISSED)
        
        self.is_running = False
        
        logger.info("Scheduler service initialized", max_workers=max_workers)
    
    def start(self):
        """Start the scheduler"""
        if not self.is_running:
            self.scheduler.start()
            self.is_running = True
            logger.info("Scheduler started")
    
    def shutdown(self, wait: bool = True):
        """Shutdown the scheduler"""
        if self.is_running:
            self.scheduler.shutdown(wait=wait)
            self.is_running = False
            logger.info("Scheduler shutdown")
    
    def schedule_periodic_scan(self, 
                             tenant_id: str,
                             scan_type: str,
                             target: str,
                             scan_config: Dict[str, Any],
                             interval_minutes: int = 60,
                             start_date: Optional[datetime] = None) -> str:
        """Schedule periodic security scan"""
        
        job_id = f"scan_{tenant_id}_{scan_type}_{hash(target)}"
        
        job = self.scheduler.add_job(
            func=self._execute_scan,
            trigger='interval',
            minutes=interval_minutes,
            start_date=start_date or datetime.utcnow(),
            args=[tenant_id, scan_type, target, scan_config],
            id=job_id,
            name=f"Periodic {scan_type} scan for {tenant_id}",
            replace_existing=True,
            max_instances=1
        )
        
        logger.info(
            "Periodic scan scheduled",
            job_id=job_id,
            tenant_id=tenant_id,
            scan_type=scan_type,
            interval_minutes=interval_minutes
        )
        
        return job_id
    
    def schedule_daily_report(self,
                            tenant_id: str,
                            report_type: str,
                            report_config: Dict[str, Any],
                            hour: int = 6,
                            minute: int = 0) -> str:
        """Schedule daily report generation"""
        
        job_id = f"report_{tenant_id}_{report_type}_daily"
        
        job = self.scheduler.add_job(
            func=self._generate_report,
            trigger='cron',
            hour=hour,
            minute=minute,
            args=[tenant_id, report_type, report_config],
            id=job_id,
            name=f"Daily {report_type} report for {tenant_id}",
            replace_existing=True
        )
        
        logger.info(
            "Daily report scheduled",
            job_id=job_id,
            tenant_id=tenant_id,
            report_type=report_type,
            time=f"{hour:02d}:{minute:02d}"
        )
        
        return job_id
    
    def schedule_maintenance_task(self,
                                task_name: str,
                                task_func: Callable,
                                cron_expression: str,
                                **kwargs) -> str:
        """Schedule maintenance task with cron expression"""
        
        job_id = f"maintenance_{task_name}"
        
        # Parse cron expression
        cron_parts = cron_expression.split()
        if len(cron_parts) != 5:
            raise ValueError("Invalid cron expression. Expected format: 'minute hour day month day_of_week'")
        
        minute, hour, day, month, day_of_week = cron_parts
        
        job = self.scheduler.add_job(
            func=task_func,
            trigger='cron',
            minute=minute,
            hour=hour,
            day=day,
            month=month,
            day_of_week=day_of_week,
            kwargs=kwargs,
            id=job_id,
            name=f"Maintenance: {task_name}",
            replace_existing=True
        )
        
        logger.info(
            "Maintenance task scheduled",
            job_id=job_id,
            task_name=task_name,
            cron=cron_expression
        )
        
        return job_id
    
    def schedule_one_time_task(self,
                             task_func: Callable,
                             run_date: datetime,
                             task_name: str = None,
                             **kwargs) -> str:
        """Schedule one-time task"""
        
        job_id = f"onetime_{task_name or 'task'}_{int(run_date.timestamp())}"
        
        job = self.scheduler.add_job(
            func=task_func,
            trigger='date',
            run_date=run_date,
            kwargs=kwargs,
            id=job_id,
            name=f"One-time: {task_name or 'task'}",
            replace_existing=True
        )
        
        logger.info(
            "One-time task scheduled",
            job_id=job_id,
            task_name=task_name,
            run_date=run_date.isoformat()
        )
        
        return job_id
    
    def get_job_info(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a scheduled job"""
        
        job = self.scheduler.get_job(job_id)
        
        if not job:
            return None
        
        return {
            'id': job.id,
            'name': job.name,
            'func': f"{job.func.__module__}.{job.func.__name__}",
            'trigger': str(job.trigger),
            'next_run_time': job.next_run_time.isoformat() if job.next_run_time else None,
            'args': job.args,
            'kwargs': job.kwargs
        }
    
    def list_jobs(self) -> List[Dict[str, Any]]:
        """List all scheduled jobs"""
        
        jobs = []
        for job in self.scheduler.get_jobs():
            jobs.append({
                'id': job.id,
                'name': job.name,
                'func': f"{job.func.__module__}.{job.func.__name__}",
                'trigger': str(job.trigger),
                'next_run_time': job.next_run_time.isoformat() if job.next_run_time else None
            })
        
        return jobs
    
    def remove_job(self, job_id: str) -> bool:
        """Remove a scheduled job"""
        
        try:
            self.scheduler.remove_job(job_id)
            logger.info("Job removed", job_id=job_id)
            return True
        except Exception as e:
            logger.error("Failed to remove job", job_id=job_id, error=str(e))
            return False
    
    def pause_job(self, job_id: str) -> bool:
        """Pause a scheduled job"""
        
        try:
            self.scheduler.pause_job(job_id)
            logger.info("Job paused", job_id=job_id)
            return True
        except Exception as e:
            logger.error("Failed to pause job", job_id=job_id, error=str(e))
            return False
    
    def resume_job(self, job_id: str) -> bool:
        """Resume a paused job"""
        
        try:
            self.scheduler.resume_job(job_id)
            logger.info("Job resumed", job_id=job_id)
            return True
        except Exception as e:
            logger.error("Failed to resume job", job_id=job_id, error=str(e))
            return False
    
    def _execute_scan(self, tenant_id: str, scan_type: str, target: str, scan_config: Dict[str, Any]):
        """Execute scheduled scan"""
        
        logger.info(
            "Executing scheduled scan",
            tenant_id=tenant_id,
            scan_type=scan_type,
            target=target
        )
        
        try:
            # Import here to avoid circular imports
            from tasks.rq_service import SecureNetRQ
            
            rq_service = SecureNetRQ()
            job_id = rq_service.enqueue_scan_job(
                scan_type=scan_type,
                target=target,
                tenant_id=tenant_id,
                scan_config=scan_config,
                priority="default"
            )
            
            logger.info("Scheduled scan enqueued", job_id=job_id)
            
        except Exception as e:
            logger.error("Failed to execute scheduled scan", error=str(e))
            raise
    
    def _generate_report(self, tenant_id: str, report_type: str, report_config: Dict[str, Any]):
        """Generate scheduled report"""
        
        logger.info(
            "Generating scheduled report",
            tenant_id=tenant_id,
            report_type=report_type
        )
        
        try:
            # Import here to avoid circular imports
            from tasks.rq_service import SecureNetRQ
            
            rq_service = SecureNetRQ()
            job_id = rq_service.enqueue_report_generation(
                report_type=report_type,
                tenant_id=tenant_id,
                report_config=report_config
            )
            
            logger.info("Scheduled report enqueued", job_id=job_id)
            
        except Exception as e:
            logger.error("Failed to generate scheduled report", error=str(e))
            raise
    
    def _job_executed(self, event):
        """Handle job execution event"""
        logger.info(
            "Job executed successfully",
            job_id=event.job_id,
            scheduled_run_time=event.scheduled_run_time.isoformat()
        )
    
    def _job_error(self, event):
        """Handle job error event"""
        logger.error(
            "Job execution failed",
            job_id=event.job_id,
            exception=str(event.exception),
            traceback=event.traceback
        )
    
    def _job_missed(self, event):
        """Handle missed job event"""
        logger.warning(
            "Job missed",
            job_id=event.job_id,
            scheduled_run_time=event.scheduled_run_time.isoformat()
        )

# Maintenance tasks
def cleanup_old_logs():
    """Clean up old log files"""
    logger.info("Running log cleanup maintenance task")
    # Implementation here
    
def cleanup_old_scan_results():
    """Clean up old scan results"""
    logger.info("Running scan results cleanup")
    # Implementation here
    
def update_threat_intelligence():
    """Update threat intelligence feeds"""
    logger.info("Updating threat intelligence")
    # Implementation here
    
def system_health_check():
    """Perform system health check"""
    logger.info("Performing system health check")
    # Implementation here
```

### FastAPI Integration

**File**: `api/scheduler_endpoints.py`

```python
from fastapi import APIRouter, HTTPException, Depends
from tasks.scheduler_service import SecureNetScheduler
from datetime import datetime, timedelta
from typing import Dict, Any, List
import structlog

logger = structlog.get_logger()
router = APIRouter(prefix="/api/scheduler", tags=["scheduler"])

# Initialize scheduler service
scheduler_service = SecureNetScheduler()

@router.on_event("startup")
async def startup_event():
    """Start scheduler on application startup"""
    scheduler_service.start()

@router.on_event("shutdown")
async def shutdown_event():
    """Shutdown scheduler on application shutdown"""
    scheduler_service.shutdown()

@router.post("/scan/periodic")
async def schedule_periodic_scan(schedule_request: Dict[str, Any]):
    """Schedule periodic scan"""
    
    try:
        job_id = scheduler_service.schedule_periodic_scan(
            tenant_id=schedule_request["tenant_id"],
            scan_type=schedule_request["scan_type"],
            target=schedule_request["target"],
            scan_config=schedule_request.get("scan_config", {}),
            interval_minutes=schedule_request.get("interval_minutes", 60),
            start_date=datetime.fromisoformat(schedule_request["start_date"]) if "start_date" in schedule_request else None
        )
        
        return {
            "job_id": job_id,
            "message": "Periodic scan scheduled successfully"
        }
        
    except Exception as e:
        logger.error("Failed to schedule periodic scan", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/report/daily")
async def schedule_daily_report(schedule_request: Dict[str, Any]):
    """Schedule daily report"""
    
    try:
        job_id = scheduler_service.schedule_daily_report(
            tenant_id=schedule_request["tenant_id"],
            report_type=schedule_request["report_type"],
            report_config=schedule_request.get("report_config", {}),
            hour=schedule_request.get("hour", 6),
            minute=schedule_request.get("minute", 0)
        )
        
        return {
            "job_id": job_id,
            "message": "Daily report scheduled successfully"
        }
        
    except Exception as e:
        logger.error("Failed to schedule daily report", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/maintenance")
async def schedule_maintenance_task(schedule_request: Dict[str, Any]):
    """Schedule maintenance task"""
    
    try:
        # Map task names to functions
        task_functions = {
            "cleanup_logs": "tasks.scheduler_service.cleanup_old_logs",
            "cleanup_scans": "tasks.scheduler_service.cleanup_old_scan_results",
            "update_threat_intel": "tasks.scheduler_service.update_threat_intelligence",
            "health_check": "tasks.scheduler_service.system_health_check"
        }
        
        task_name = schedule_request["task_name"]
        if task_name not in task_functions:
            raise HTTPException(status_code=400, detail=f"Unknown task: {task_name}")
        
        # Import task function
        module_path, func_name = task_functions[task_name].rsplit('.', 1)
        module = __import__(module_path, fromlist=[func_name])
        task_func = getattr(module, func_name)
        
        job_id = scheduler_service.schedule_maintenance_task(
            task_name=task_name,
            task_func=task_func,
            cron_expression=schedule_request["cron_expression"]
        )
        
        return {
            "job_id": job_id,
            "message": "Maintenance task scheduled successfully"
        }
        
    except Exception as e:
        logger.error("Failed to schedule maintenance task", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs")
async def list_scheduled_jobs():
    """List all scheduled jobs"""
    
    return scheduler_service.list_jobs()

@router.get("/jobs/{job_id}")
async def get_job_info(job_id: str):
    """Get job information"""
    
    job_info = scheduler_service.get_job_info(job_id)
    
    if not job_info:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return job_info

@router.delete("/jobs/{job_id}")
async def remove_job(job_id: str):
    """Remove scheduled job"""
    
    success = scheduler_service.remove_job(job_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to remove job")
    
    return {"message": "Job removed successfully"}

@router.post("/jobs/{job_id}/pause")
async def pause_job(job_id: str):
    """Pause scheduled job"""
    
    success = scheduler_service.pause_job(job_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to pause job")
    
    return {"message": "Job paused successfully"}

@router.post("/jobs/{job_id}/resume")
async def resume_job(job_id: str):
    """Resume paused job"""
    
    success = scheduler_service.resume_job(job_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to resume job")
    
    return {"message": "Job resumed successfully"}
```

### Tenant-Specific Scheduling

**File**: `tasks/tenant_scheduler.py`

```python
from tasks.scheduler_service import SecureNetScheduler
from typing import Dict, Any, List
import structlog

logger = structlog.get_logger()

class TenantSchedulerManager:
    """Manage tenant-specific scheduled tasks"""
    
    def __init__(self, scheduler: SecureNetScheduler):
        self.scheduler = scheduler
        self.tenant_configs = {}
    
    def setup_tenant_schedules(self, tenant_id: str, config: Dict[str, Any]):
        """Setup all scheduled tasks for a tenant"""
        
        self.tenant_configs[tenant_id] = config
        
        # Schedule periodic scans
        if "periodic_scans" in config:
            for scan_config in config["periodic_scans"]:
                self.scheduler.schedule_periodic_scan(
                    tenant_id=tenant_id,
                    scan_type=scan_config["type"],
                    target=scan_config["target"],
                    scan_config=scan_config.get("config", {}),
                    interval_minutes=scan_config.get("interval_minutes", 60)
                )
        
        # Schedule reports
        if "reports" in config:
            for report_config in config["reports"]:
                if report_config.get("frequency") == "daily":
                    self.scheduler.schedule_daily_report(
                        tenant_id=tenant_id,
                        report_type=report_config["type"],
                        report_config=report_config.get("config", {}),
                        hour=report_config.get("hour", 6),
                        minute=report_config.get("minute", 0)
                    )
        
        logger.info("Tenant schedules configured", tenant_id=tenant_id)
    
    def remove_tenant_schedules(self, tenant_id: str):
        """Remove all scheduled tasks for a tenant"""
        
        jobs = self.scheduler.list_jobs()
        
        for job in jobs:
            if tenant_id in job["id"]:
                self.scheduler.remove_job(job["id"])
        
        if tenant_id in self.tenant_configs:
            del self.tenant_configs[tenant_id]
        
        logger.info("Tenant schedules removed", tenant_id=tenant_id)
    
    def get_tenant_schedules(self, tenant_id: str) -> List[Dict[str, Any]]:
        """Get all scheduled tasks for a tenant"""
        
        jobs = self.scheduler.list_jobs()
        tenant_jobs = [job for job in jobs if tenant_id in job["id"]]
        
        return tenant_jobs
```

## 🚀 Usage Examples

### Basic Scheduling

```python
from tasks.scheduler_service import SecureNetScheduler
from datetime import datetime, timedelta

# Initialize scheduler
scheduler = SecureNetScheduler()
scheduler.start()

# Schedule periodic scan
job_id = scheduler.schedule_periodic_scan(
    tenant_id="tenant_123",
    scan_type="vulnerability",
    target="192.168.1.0/24",
    scan_config={"deep_scan": True},
    interval_minutes=120  # Every 2 hours
)

# Schedule daily report
report_job_id = scheduler.schedule_daily_report(
    tenant_id="tenant_123",
    report_type="security_summary",
    report_config={"include_charts": True},
    hour=8,  # 8 AM
    minute=0
)

# Schedule one-time task
future_time = datetime.utcnow() + timedelta(hours=1)
onetime_job_id = scheduler.schedule_one_time_task(
    task_func=lambda: print("One-time task executed"),
    run_date=future_time,
    task_name="test_task"
)
```

### Maintenance Tasks

```python
# Schedule maintenance tasks
scheduler.schedule_maintenance_task(
    task_name="log_cleanup",
    task_func=cleanup_old_logs,
    cron_expression="0 2 * * *"  # Daily at 2 AM
)

scheduler.schedule_maintenance_task(
    task_name="threat_intel_update",
    task_func=update_threat_intelligence,
    cron_expression="0 */6 * * *"  # Every 6 hours
)
```

### Job Management

```python
# List all jobs
jobs = scheduler.list_jobs()
for job in jobs:
    print(f"Job: {job['name']}, Next run: {job['next_run_time']}")

# Get specific job info
job_info = scheduler.get_job_info(job_id)
print(f"Job trigger: {job_info['trigger']}")

# Pause and resume jobs
scheduler.pause_job(job_id)
scheduler.resume_job(job_id)

# Remove job
scheduler.remove_job(job_id)
```

## ✅ Validation Steps

1. **Install APScheduler**:
   ```bash
   pip install apscheduler
   ```

2. **Test Basic Scheduling**:
   ```python
   from tasks.scheduler_service import SecureNetScheduler
   
   scheduler = SecureNetScheduler()
   scheduler.start()
   
   # Schedule test job
   job_id = scheduler.schedule_one_time_task(
       task_func=lambda: print("Test job executed"),
       run_date=datetime.utcnow() + timedelta(seconds=5),
       task_name="test"
   )
   ```

3. **Test FastAPI Integration**:
   ```bash
   uvicorn main:app --reload
   # Test scheduler endpoints
   ```

4. **Monitor Jobs**:
   ```python
   jobs = scheduler.list_jobs()
   print(f"Scheduled jobs: {len(jobs)}")
   ```

## 📈 Benefits for SecureNet

- **In-Process Scheduling** - No external dependencies required
- **Persistent Jobs** - Jobs survive application restarts
- **Flexible Triggers** - Support for cron, interval, and one-time schedules
- **Event Handling** - Built-in job execution monitoring
- **Thread-Safe** - Safe for multi-threaded applications
- **Database Backed** - Reliable job persistence

## 🔗 Related Documentation

- [Phase 3: Advanced Tooling](../integration/phase-3-advanced-tooling.md)
- [Task Management Overview](README.md)
- [RQ Integration](rq.md) 