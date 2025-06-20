"""
SecureNet Security Audit Logging System
Day 3 Sprint 1: Security audit logging and event tracking
"""

import json
import logging
import time
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union
from enum import Enum
from dataclasses import dataclass, asdict
from utils.cache_service import cache_service
from database.postgresql_adapter import get_db_connection

logger = logging.getLogger(__name__)

class AuditEventType(Enum):
    """Audit event types for security logging"""
    # Authentication Events
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    MFA_SETUP = "mfa_setup"
    MFA_SUCCESS = "mfa_success"
    MFA_FAILED = "mfa_failed"
    PASSWORD_CHANGE = "password_change"
    
    # Authorization Events
    PERMISSION_GRANTED = "permission_granted"
    PERMISSION_DENIED = "permission_denied"
    ROLE_CHANGE = "role_change"
    
    # Data Access Events
    DATA_ACCESS = "data_access"
    DATA_EXPORT = "data_export"
    SENSITIVE_DATA_VIEW = "sensitive_data_view"
    
    # System Events
    SYSTEM_CONFIG_CHANGE = "system_config_change"
    USER_CREATED = "user_created"
    USER_MODIFIED = "user_modified"
    USER_DELETED = "user_deleted"
    
    # Security Events
    SECURITY_THREAT_DETECTED = "security_threat_detected"
    IP_BLOCKED = "ip_blocked"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    VULNERABILITY_DETECTED = "vulnerability_detected"
    
    # API Events
    API_ACCESS = "api_access"
    API_RATE_LIMIT = "api_rate_limit"
    API_ERROR = "api_error"

class AuditSeverity(Enum):
    """Audit event severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class AuditEvent:
    """Audit event data structure"""
    event_type: AuditEventType
    severity: AuditSeverity
    user_id: Optional[str]
    username: Optional[str]
    user_role: Optional[str]
    source_ip: str
    user_agent: Optional[str]
    resource: Optional[str]
    action: str
    result: str  # success, failed, denied
    details: Dict[str, Any]
    timestamp: datetime
    session_id: Optional[str] = None
    request_id: Optional[str] = None
    organization_id: Optional[str] = None
    
    def __post_init__(self):
        """Generate event ID and hash"""
        self.event_id = self._generate_event_id()
        self.event_hash = self._generate_event_hash()
    
    def _generate_event_id(self) -> str:
        """Generate unique event ID"""
        timestamp_ms = int(self.timestamp.timestamp() * 1000)
        return f"audit_{timestamp_ms}_{hash(str(self.details)) % 10000:04d}"
    
    def _generate_event_hash(self) -> str:
        """Generate integrity hash for the event"""
        event_string = f"{self.event_type.value}{self.timestamp.isoformat()}{self.user_id}{self.source_ip}{self.action}{self.result}"
        return hashlib.sha256(event_string.encode()).hexdigest()[:16]

class SecurityAuditLogger:
    """
    Enterprise Security Audit Logging System
    Comprehensive audit trail for all security-related events
    """
    
    def __init__(self):
        self.retention_days = 90  # Configurable retention period
        self.real_time_alerts = True
        self.alert_thresholds = {
            "failed_logins_per_minute": 5,
            "suspicious_activity_score": 80,
            "critical_events_per_hour": 10
        }
    
    async def log_event(self, 
                       event_type: AuditEventType,
                       severity: AuditSeverity,
                       user_id: Optional[str] = None,
                       username: Optional[str] = None,
                       user_role: Optional[str] = None,
                       source_ip: str = "unknown",
                       user_agent: Optional[str] = None,
                       resource: Optional[str] = None,
                       action: str = "",
                       result: str = "success",
                       details: Optional[Dict[str, Any]] = None,
                       session_id: Optional[str] = None,
                       request_id: Optional[str] = None,
                       organization_id: Optional[str] = None) -> str:
        """
        Log a security audit event
        Returns the event ID for tracking
        """
        try:
            # Create audit event
            event = AuditEvent(
                event_type=event_type,
                severity=severity,
                user_id=user_id,
                username=username,
                user_role=user_role,
                source_ip=source_ip,
                user_agent=user_agent,
                resource=resource,
                action=action,
                result=result,
                details=details or {},
                timestamp=datetime.now(),
                session_id=session_id,
                request_id=request_id,
                organization_id=organization_id
            )
            
            # Store in database
            await self._store_audit_event(event)
            
            # Cache recent events for real-time monitoring
            await self._cache_recent_event(event)
            
            # Check for real-time alerts
            if self.real_time_alerts:
                await self._check_real_time_alerts(event)
            
            # Log to application logger
            logger.info(f"Audit Event: {event.event_type.value} - {event.action} - {event.result}")
            
            return event.event_id
            
        except Exception as e:
            logger.error(f"Failed to log audit event: {e}")
            # Fallback to file logging if database fails
            await self._fallback_file_log(event_type, severity, details)
            raise
    
    async def _store_audit_event(self, event: AuditEvent):
        """Store audit event in database"""
        try:
            async with get_db_connection() as conn:
                await conn.execute("""
                    INSERT INTO audit_logs (
                        event_id, event_hash, event_type, severity,
                        user_id, username, user_role, source_ip, user_agent,
                        resource, action, result, details, timestamp,
                        session_id, request_id, organization_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                """, 
                    event.event_id, event.event_hash, event.event_type.value, event.severity.value,
                    event.user_id, event.username, event.user_role, event.source_ip, event.user_agent,
                    event.resource, event.action, event.result, json.dumps(event.details), event.timestamp,
                    event.session_id, event.request_id, event.organization_id
                )
                
        except Exception as e:
            logger.error(f"Database audit logging failed: {e}")
            raise
    
    async def _cache_recent_event(self, event: AuditEvent):
        """Cache recent events for real-time monitoring"""
        try:
            # Add to recent events list (last 100 events)
            recent_key = "audit:recent_events"
            event_data = {
                "event_id": event.event_id,
                "event_type": event.event_type.value,
                "severity": event.severity.value,
                "user_id": event.user_id,
                "username": event.username,
                "action": event.action,
                "result": event.result,
                "timestamp": event.timestamp.isoformat(),
                "source_ip": event.source_ip
            }
            
            # Use Redis list with limited size
            await cache_service.redis_client.lpush(recent_key, json.dumps(event_data))
            await cache_service.redis_client.ltrim(recent_key, 0, 99)  # Keep only last 100
            await cache_service.redis_client.expire(recent_key, 3600)  # 1 hour TTL
            
        except Exception as e:
            logger.error(f"Failed to cache audit event: {e}")
    
    async def _check_real_time_alerts(self, event: AuditEvent):
        """Check for real-time security alerts"""
        try:
            alerts = []
            
            # Check for critical events
            if event.severity == AuditSeverity.CRITICAL:
                alerts.append({
                    "type": "critical_event",
                    "message": f"Critical security event: {event.event_type.value}",
                    "event_id": event.event_id,
                    "user": event.username,
                    "ip": event.source_ip
                })
            
            # Check for failed login patterns
            if event.event_type == AuditEventType.LOGIN_FAILED:
                failed_count = await self._count_recent_failed_logins(event.source_ip)
                if failed_count >= self.alert_thresholds["failed_logins_per_minute"]:
                    alerts.append({
                        "type": "brute_force_attempt",
                        "message": f"Multiple failed login attempts from {event.source_ip}",
                        "count": failed_count,
                        "ip": event.source_ip
                    })
            
            # Check for suspicious user activity
            if event.user_id:
                risk_score = await self._calculate_user_risk_score(event.user_id)
                if risk_score >= self.alert_thresholds["suspicious_activity_score"]:
                    alerts.append({
                        "type": "suspicious_user_activity",
                        "message": f"Suspicious activity detected for user {event.username}",
                        "risk_score": risk_score,
                        "user": event.username
                    })
            
            # Send alerts if any triggered
            for alert in alerts:
                await self._send_security_alert(alert)
                
        except Exception as e:
            logger.error(f"Real-time alert checking failed: {e}")
    
    async def _count_recent_failed_logins(self, source_ip: str) -> int:
        """Count failed login attempts from IP in last minute"""
        try:
            one_minute_ago = datetime.now() - timedelta(minutes=1)
            
            async with get_db_connection() as conn:
                result = await conn.fetchval("""
                    SELECT COUNT(*) FROM audit_logs 
                    WHERE event_type = $1 
                    AND source_ip = $2 
                    AND timestamp > $3
                """, AuditEventType.LOGIN_FAILED.value, source_ip, one_minute_ago)
                
            return result or 0
            
        except Exception as e:
            logger.error(f"Failed to count recent failed logins: {e}")
            return 0
    
    async def _calculate_user_risk_score(self, user_id: str) -> int:
        """Calculate user risk score based on recent activity"""
        try:
            # This is a simplified risk scoring algorithm
            risk_score = 0
            last_hour = datetime.now() - timedelta(hours=1)
            
            async with get_db_connection() as conn:
                # Count different types of events
                events = await conn.fetch("""
                    SELECT event_type, COUNT(*) as count 
                    FROM audit_logs 
                    WHERE user_id = $1 AND timestamp > $2 
                    GROUP BY event_type
                """, user_id, last_hour)
                
                for event in events:
                    event_type = event['event_type']
                    count = event['count']
                    
                    # Score based on event patterns
                    if event_type == AuditEventType.LOGIN_FAILED.value:
                        risk_score += count * 15
                    elif event_type == AuditEventType.PERMISSION_DENIED.value:
                        risk_score += count * 10
                    elif event_type == AuditEventType.DATA_ACCESS.value and count > 20:
                        risk_score += count * 2
                    elif event_type == AuditEventType.API_ERROR.value:
                        risk_score += count * 5
            
            return min(risk_score, 100)  # Cap at 100
            
        except Exception as e:
            logger.error(f"Risk score calculation failed: {e}")
            return 0
    
    async def _send_security_alert(self, alert: Dict[str, Any]):
        """Send security alert to monitoring systems"""
        try:
            # Cache alert for dashboard
            alert_key = f"security_alerts:{int(time.time())}"
            await cache_service.set(alert_key, alert, ttl=3600)
            
            # Add to alerts list
            await cache_service.redis_client.lpush("security:active_alerts", json.dumps(alert))
            await cache_service.redis_client.ltrim("security:active_alerts", 0, 49)  # Keep 50 alerts
            
            # Log alert
            logger.warning(f"Security Alert: {alert}")
            
            # Here you would integrate with external alerting systems
            # (email, Slack, PagerDuty, etc.)
            
        except Exception as e:
            logger.error(f"Failed to send security alert: {e}")
    
    async def _fallback_file_log(self, event_type: AuditEventType, severity: AuditSeverity, details: Dict[str, Any]):
        """Fallback file logging when database is unavailable"""
        try:
            fallback_entry = {
                "timestamp": datetime.now().isoformat(),
                "event_type": event_type.value,
                "severity": severity.value,
                "details": details
            }
            
            # Write to local file
            with open("logs/audit_fallback.log", "a") as f:
                f.write(json.dumps(fallback_entry) + "\n")
                
        except Exception as e:
            logger.error(f"Fallback logging failed: {e}")
    
    async def get_audit_summary(self, 
                               start_time: Optional[datetime] = None,
                               end_time: Optional[datetime] = None,
                               user_id: Optional[str] = None,
                               event_type: Optional[AuditEventType] = None) -> Dict[str, Any]:
        """Get audit log summary and statistics"""
        try:
            if not start_time:
                start_time = datetime.now() - timedelta(hours=24)
            if not end_time:
                end_time = datetime.now()
            
            async with get_db_connection() as conn:
                # Base query conditions
                conditions = ["timestamp BETWEEN $1 AND $2"]
                params = [start_time, end_time]
                param_count = 2
                
                if user_id:
                    param_count += 1
                    conditions.append(f"user_id = ${param_count}")
                    params.append(user_id)
                
                if event_type:
                    param_count += 1
                    conditions.append(f"event_type = ${param_count}")
                    params.append(event_type.value)
                
                where_clause = " AND ".join(conditions)
                
                # Get event counts by type
                event_counts = await conn.fetch(f"""
                    SELECT event_type, severity, COUNT(*) as count
                    FROM audit_logs 
                    WHERE {where_clause}
                    GROUP BY event_type, severity
                    ORDER BY count DESC
                """, *params)
                
                # Get user activity
                user_activity = await conn.fetch(f"""
                    SELECT username, COUNT(*) as event_count
                    FROM audit_logs 
                    WHERE {where_clause} AND username IS NOT NULL
                    GROUP BY username
                    ORDER BY event_count DESC
                    LIMIT 10
                """, *params)
                
                # Get IP activity
                ip_activity = await conn.fetch(f"""
                    SELECT source_ip, COUNT(*) as event_count
                    FROM audit_logs 
                    WHERE {where_clause}
                    GROUP BY source_ip
                    ORDER BY event_count DESC
                    LIMIT 10
                """, *params)
                
                # Get failed events
                failed_events = await conn.fetchval(f"""
                    SELECT COUNT(*) FROM audit_logs 
                    WHERE {where_clause} AND result = 'failed'
                """, *params)
                
                # Get critical events
                critical_events = await conn.fetchval(f"""
                    SELECT COUNT(*) FROM audit_logs 
                    WHERE {where_clause} AND severity = 'critical'
                """, *params)
                
                return {
                    "summary": {
                        "start_time": start_time.isoformat(),
                        "end_time": end_time.isoformat(),
                        "total_events": sum(row['count'] for row in event_counts),
                        "failed_events": failed_events,
                        "critical_events": critical_events,
                        "unique_users": len(user_activity),
                        "unique_ips": len(ip_activity)
                    },
                    "event_breakdown": [dict(row) for row in event_counts],
                    "top_users": [dict(row) for row in user_activity],
                    "top_ips": [dict(row) for row in ip_activity]
                }
                
        except Exception as e:
            logger.error(f"Failed to get audit summary: {e}")
            return {"error": str(e)}
    
    async def get_recent_events(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent audit events from cache"""
        try:
            recent_events = await cache_service.redis_client.lrange("audit:recent_events", 0, limit - 1)
            return [json.loads(event) for event in recent_events]
            
        except Exception as e:
            logger.error(f"Failed to get recent events: {e}")
            return []
    
    async def get_security_alerts(self) -> List[Dict[str, Any]]:
        """Get active security alerts"""
        try:
            alerts = await cache_service.redis_client.lrange("security:active_alerts", 0, 49)
            return [json.loads(alert) for alert in alerts]
            
        except Exception as e:
            logger.error(f"Failed to get security alerts: {e}")
            return []

# Global audit logger instance
security_audit_logger = SecurityAuditLogger()

# Convenience functions for common audit events
async def log_login_success(user_id: str, username: str, user_role: str, source_ip: str, 
                           session_id: str, user_agent: Optional[str] = None):
    """Log successful login"""
    return await security_audit_logger.log_event(
        event_type=AuditEventType.LOGIN_SUCCESS,
        severity=AuditSeverity.LOW,
        user_id=user_id,
        username=username,
        user_role=user_role,
        source_ip=source_ip,
        user_agent=user_agent,
        action="user_login",
        result="success",
        session_id=session_id,
        details={"authentication_method": "password"}
    )

async def log_login_failed(username: str, source_ip: str, reason: str, user_agent: Optional[str] = None):
    """Log failed login attempt"""
    return await security_audit_logger.log_event(
        event_type=AuditEventType.LOGIN_FAILED,
        severity=AuditSeverity.MEDIUM,
        username=username,
        source_ip=source_ip,
        user_agent=user_agent,
        action="user_login",
        result="failed",
        details={"failure_reason": reason}
    )

async def log_mfa_event(user_id: str, username: str, source_ip: str, 
                       event_type: AuditEventType, result: str, details: Dict[str, Any]):
    """Log MFA-related events"""
    severity = AuditSeverity.MEDIUM if result == "success" else AuditSeverity.HIGH
    return await security_audit_logger.log_event(
        event_type=event_type,
        severity=severity,
        user_id=user_id,
        username=username,
        source_ip=source_ip,
        action="mfa_operation",
        result=result,
        details=details
    )

async def log_security_threat(threat_type: str, source_ip: str, details: Dict[str, Any]):
    """Log security threat detection"""
    return await security_audit_logger.log_event(
        event_type=AuditEventType.SECURITY_THREAT_DETECTED,
        severity=AuditSeverity.CRITICAL,
        source_ip=source_ip,
        action="threat_detection",
        result="detected",
        details={"threat_type": threat_type, **details}
    ) 