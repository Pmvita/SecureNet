"""
SecureNet Advanced Threat Detection System
Day 4 Sprint 1: AI-powered anomaly detection and automated threat response
"""

import asyncio
import logging
import time
import json
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple, Set
from enum import Enum
from dataclasses import dataclass, asdict
import hashlib
from collections import defaultdict, deque
from utils.cache_service import cache_service
from auth.audit_logging import security_audit_logger, AuditEventType, AuditSeverity
from utils.realtime_notifications import send_security_alert, NotificationPriority
from database.postgresql_adapter import get_db_connection

logger = logging.getLogger(__name__)

class ThreatLevel(Enum):
    """Threat severity levels"""
    INFO = "info"
    LOW = "low" 
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ThreatType(Enum):
    """Types of security threats"""
    BRUTE_FORCE = "brute_force"
    ANOMALOUS_LOGIN = "anomalous_login"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    DATA_EXFILTRATION = "data_exfiltration"
    MALICIOUS_IP = "malicious_ip"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    RATE_LIMIT_ABUSE = "rate_limit_abuse"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    BEHAVIORAL_ANOMALY = "behavioral_anomaly"
    NETWORK_INTRUSION = "network_intrusion"

class ThreatStatus(Enum):
    """Threat detection status"""
    DETECTED = "detected"
    INVESTIGATING = "investigating"
    CONFIRMED = "confirmed"
    FALSE_POSITIVE = "false_positive"
    MITIGATED = "mitigated"
    RESOLVED = "resolved"

@dataclass
class ThreatEvent:
    """Structured threat event data"""
    id: str
    threat_type: ThreatType
    threat_level: ThreatLevel
    status: ThreatStatus
    source_ip: str
    user_id: Optional[str]
    username: Optional[str]
    description: str
    evidence: Dict[str, Any]
    confidence_score: float  # 0.0 to 1.0
    risk_score: int  # 0 to 100
    timestamp: datetime
    detection_method: str
    affected_resources: List[str]
    recommended_actions: List[str]
    auto_response_taken: bool = False
    escalated: bool = False
    
    def __post_init__(self):
        """Generate threat ID if not provided"""
        if not self.id:
            threat_hash = hashlib.md5(
                f"{self.threat_type.value}{self.source_ip}{self.timestamp.isoformat()}".encode()
            ).hexdigest()[:8]
            self.id = f"threat_{int(self.timestamp.timestamp())}_{threat_hash}"

class BehaviorAnalyzer:
    """
    AI-powered user behavior analysis for anomaly detection
    """
    
    def __init__(self):
        self.user_profiles: Dict[str, Dict[str, Any]] = {}
        self.baseline_window = timedelta(days=30)
        self.anomaly_threshold = 0.8  # Z-score threshold for anomaly detection
        
    async def build_user_profile(self, user_id: str) -> Dict[str, Any]:
        """Build behavioral profile for user"""
        try:
            # Get user activity from last 30 days
            end_time = datetime.now()
            start_time = end_time - self.baseline_window
            
            async with get_db_connection() as conn:
                # Login patterns
                login_data = await conn.fetch("""
                    SELECT 
                        EXTRACT(hour FROM timestamp) as login_hour,
                        EXTRACT(dow FROM timestamp) as login_dow,
                        source_ip,
                        user_agent,
                        COUNT(*) as frequency
                    FROM audit_logs 
                    WHERE user_id = $1 
                    AND event_type = 'login_success'
                    AND timestamp BETWEEN $2 AND $3
                    GROUP BY login_hour, login_dow, source_ip, user_agent
                """, user_id, start_time, end_time)
                
                # Access patterns
                access_data = await conn.fetch("""
                    SELECT 
                        resource,
                        action,
                        COUNT(*) as frequency,
                        AVG(EXTRACT(epoch FROM timestamp))::bigint as avg_timestamp
                    FROM audit_logs 
                    WHERE user_id = $1 
                    AND event_type = 'data_access'
                    AND timestamp BETWEEN $2 AND $3
                    GROUP BY resource, action
                """, user_id, start_time, end_time)
                
                # Location patterns (IP geolocation)
                location_data = await conn.fetch("""
                    SELECT 
                        source_ip,
                        COUNT(*) as frequency,
                        MIN(timestamp) as first_seen,
                        MAX(timestamp) as last_seen
                    FROM audit_logs 
                    WHERE user_id = $1 
                    AND timestamp BETWEEN $2 AND $3
                    GROUP BY source_ip
                """, user_id, start_time, end_time)
            
            # Calculate behavioral metrics
            profile = {
                "user_id": user_id,
                "profile_created": datetime.now().isoformat(),
                "baseline_period": {
                    "start": start_time.isoformat(),
                    "end": end_time.isoformat()
                },
                "login_patterns": {
                    "typical_hours": self._extract_typical_hours([row['login_hour'] for row in login_data]),
                    "typical_days": self._extract_typical_days([row['login_dow'] for row in login_data]),
                    "known_ips": list(set([row['source_ip'] for row in location_data])),
                    "known_user_agents": list(set([row['user_agent'] for row in login_data if row['user_agent']]))
                },
                "access_patterns": {
                    "common_resources": [row['resource'] for row in access_data if row['frequency'] > 5],
                    "common_actions": [row['action'] for row in access_data if row['frequency'] > 3],
                    "activity_frequency": len(access_data)
                },
                "location_patterns": {
                    "primary_ips": [row['source_ip'] for row in location_data if row['frequency'] > 10],
                    "total_unique_ips": len(location_data),
                    "ip_stability_score": self._calculate_ip_stability(location_data)
                },
                "risk_indicators": {
                    "frequent_ip_changes": len(location_data) > 20,
                    "off_hours_activity": self._check_off_hours_activity(login_data),
                    "resource_access_variance": len(access_data) > 50
                }
            }
            
            # Cache profile
            await cache_service.set(f"user_profile:{user_id}", profile, ttl=86400)
            self.user_profiles[user_id] = profile
            
            return profile
            
        except Exception as e:
            logger.error(f"Failed to build user profile for {user_id}: {e}")
            return {}
    
    def _extract_typical_hours(self, hours: List[int]) -> List[int]:
        """Extract typical login hours"""
        if not hours:
            return []
        
        hour_counts = defaultdict(int)
        for hour in hours:
            hour_counts[hour] += 1
        
        # Return hours with frequency > 10% of total
        total = len(hours)
        threshold = max(1, total * 0.1)
        return [hour for hour, count in hour_counts.items() if count >= threshold]
    
    def _extract_typical_days(self, days: List[int]) -> List[int]:
        """Extract typical days of week (0=Sunday, 6=Saturday)"""
        if not days:
            return []
        
        day_counts = defaultdict(int)
        for day in days:
            day_counts[day] += 1
        
        total = len(days)
        threshold = max(1, total * 0.1)
        return [day for day, count in day_counts.items() if count >= threshold]
    
    def _calculate_ip_stability(self, location_data: List[Dict]) -> float:
        """Calculate IP stability score (0.0 to 1.0)"""
        if not location_data:
            return 0.0
        
        total_activity = sum(row['frequency'] for row in location_data)
        
        # Find the most frequently used IP
        max_frequency = max(row['frequency'] for row in location_data)
        
        # Stability = (most frequent IP usage) / (total activity)
        return min(1.0, max_frequency / total_activity)
    
    def _check_off_hours_activity(self, login_data: List[Dict]) -> bool:
        """Check if user has significant off-hours activity"""
        if not login_data:
            return False
        
        # Define business hours (9 AM to 6 PM, weekdays)
        business_hours = set(range(9, 18))
        business_days = set(range(1, 6))  # Monday to Friday
        
        off_hours_count = 0
        for row in login_data:
            hour = row['login_hour']
            day = row['login_dow']
            
            if hour not in business_hours or day not in business_days:
                off_hours_count += row['frequency']
        
        total_logins = sum(row['frequency'] for row in login_data)
        off_hours_ratio = off_hours_count / total_logins if total_logins > 0 else 0
        
        return off_hours_ratio > 0.3  # More than 30% off-hours activity
    
    async def analyze_current_behavior(self, user_id: str, current_activity: Dict[str, Any]) -> Tuple[float, List[str]]:
        """Analyze current user behavior against baseline profile"""
        try:
            # Get or build user profile
            profile = self.user_profiles.get(user_id)
            if not profile:
                profile = await self.build_user_profile(user_id)
            
            if not profile:
                return 0.0, ["No baseline profile available"]
            
            anomalies = []
            anomaly_scores = []
            
            # Check login time anomaly
            current_hour = datetime.now().hour
            typical_hours = profile.get("login_patterns", {}).get("typical_hours", [])
            if typical_hours and current_hour not in typical_hours:
                anomalies.append(f"Login at unusual hour: {current_hour}")
                anomaly_scores.append(0.7)
            
            # Check IP address anomaly
            current_ip = current_activity.get("source_ip")
            known_ips = profile.get("login_patterns", {}).get("known_ips", [])
            if current_ip and current_ip not in known_ips:
                anomalies.append(f"Login from unknown IP: {current_ip}")
                anomaly_scores.append(0.8)
            
            # Check user agent anomaly
            current_user_agent = current_activity.get("user_agent")
            known_agents = profile.get("login_patterns", {}).get("known_user_agents", [])
            if current_user_agent and current_user_agent not in known_agents:
                anomalies.append(f"Login from unknown device/browser")
                anomaly_scores.append(0.6)
            
            # Check access pattern anomaly
            requested_resource = current_activity.get("resource")
            common_resources = profile.get("access_patterns", {}).get("common_resources", [])
            if requested_resource and requested_resource not in common_resources:
                anomalies.append(f"Access to unusual resource: {requested_resource}")
                anomaly_scores.append(0.5)
            
            # Calculate overall anomaly score
            overall_score = max(anomaly_scores) if anomaly_scores else 0.0
            
            return overall_score, anomalies
            
        except Exception as e:
            logger.error(f"Failed to analyze behavior for {user_id}: {e}")
            return 0.0, ["Analysis failed"]

class ThreatDetectionEngine:
    """
    Advanced threat detection engine with multiple detection methods
    """
    
    def __init__(self):
        self.behavior_analyzer = BehaviorAnalyzer()
        self.detection_rules: Dict[str, Dict[str, Any]] = {}
        self.threat_history: deque = deque(maxlen=10000)  # Keep last 10k threats
        self.active_threats: Dict[str, ThreatEvent] = {}
        self.false_positive_patterns: Set[str] = set()
        
        # Initialize detection rules
        self._initialize_detection_rules()
        
        # Performance metrics
        self.metrics = {
            "total_threats_detected": 0,
            "threats_by_type": defaultdict(int),
            "threats_by_level": defaultdict(int),
            "false_positive_rate": 0.0,
            "avg_detection_time": 0.0,
            "auto_responses_triggered": 0
        }
    
    def _initialize_detection_rules(self):
        """Initialize threat detection rules"""
        self.detection_rules = {
            "brute_force_login": {
                "description": "Detect brute force login attempts",
                "threshold": 5,  # attempts
                "window": 300,   # seconds
                "threat_level": ThreatLevel.HIGH,
                "auto_response": True
            },
            "anomalous_login_location": {
                "description": "Detect logins from unusual locations",
                "threshold": 0.8,  # anomaly score
                "threat_level": ThreatLevel.MEDIUM,
                "auto_response": False
            },
            "privilege_escalation": {
                "description": "Detect privilege escalation attempts",
                "patterns": ["admin", "root", "sudo", "elevation"],
                "threat_level": ThreatLevel.CRITICAL,
                "auto_response": True
            },
            "suspicious_data_access": {
                "description": "Detect suspicious data access patterns",
                "threshold": 10,  # requests per minute
                "threat_level": ThreatLevel.MEDIUM,
                "auto_response": False
            },
            "malicious_ip_activity": {
                "description": "Activity from known malicious IPs",
                "threat_level": ThreatLevel.HIGH,
                "auto_response": True
            },
            "rate_limit_abuse": {
                "description": "Detect rate limit abuse attempts",
                "threshold": 100,  # requests per minute
                "threat_level": ThreatLevel.MEDIUM,
                "auto_response": True
            }
        }
    
    async def detect_brute_force_attack(self, source_ip: str, username: str) -> Optional[ThreatEvent]:
        """Detect brute force login attempts"""
        try:
            rule = self.detection_rules["brute_force_login"]
            window = rule["window"]
            threshold = rule["threshold"]
            
            # Count failed login attempts in time window
            now = datetime.now()
            start_time = now - timedelta(seconds=window)
            
            async with get_db_connection() as conn:
                failed_attempts = await conn.fetchval("""
                    SELECT COUNT(*) FROM audit_logs 
                    WHERE event_type = 'login_failed'
                    AND source_ip = $1 
                    AND username = $2
                    AND timestamp > $3
                """, source_ip, username, start_time)
            
            if failed_attempts >= threshold:
                threat = ThreatEvent(
                    id="",
                    threat_type=ThreatType.BRUTE_FORCE,
                    threat_level=rule["threat_level"],
                    status=ThreatStatus.DETECTED,
                    source_ip=source_ip,
                    user_id=None,
                    username=username,
                    description=f"Brute force attack detected: {failed_attempts} failed login attempts in {window} seconds",
                    evidence={
                        "failed_attempts": failed_attempts,
                        "time_window": window,
                        "detection_rule": "brute_force_login"
                    },
                    confidence_score=min(1.0, failed_attempts / (threshold * 2)),
                    risk_score=min(100, failed_attempts * 10),
                    timestamp=now,
                    detection_method="rule_based",
                    affected_resources=[f"user:{username}"],
                    recommended_actions=[
                        "Block IP address temporarily",
                        "Lock user account",
                        "Require MFA verification",
                        "Investigate source of attacks"
                    ],
                    auto_response_taken=rule["auto_response"]
                )
                
                return threat
            
            return None
            
        except Exception as e:
            logger.error(f"Brute force detection failed: {e}")
            return None
    
    async def detect_behavioral_anomaly(self, user_id: str, activity: Dict[str, Any]) -> Optional[ThreatEvent]:
        """Detect behavioral anomalies using AI analysis"""
        try:
            anomaly_score, anomalies = await self.behavior_analyzer.analyze_current_behavior(user_id, activity)
            
            if anomaly_score >= 0.8:  # High anomaly threshold
                threat = ThreatEvent(
                    id="",
                    threat_type=ThreatType.BEHAVIORAL_ANOMALY,
                    threat_level=ThreatLevel.MEDIUM if anomaly_score < 0.9 else ThreatLevel.HIGH,
                    status=ThreatStatus.DETECTED,
                    source_ip=activity.get("source_ip", "unknown"),
                    user_id=user_id,
                    username=activity.get("username"),
                    description=f"Behavioral anomaly detected (score: {anomaly_score:.2f})",
                    evidence={
                        "anomaly_score": anomaly_score,
                        "anomalies": anomalies,
                        "activity": activity,
                        "detection_rule": "behavioral_analysis"
                    },
                    confidence_score=anomaly_score,
                    risk_score=int(anomaly_score * 100),
                    timestamp=datetime.now(),
                    detection_method="ai_behavioral_analysis",
                    affected_resources=[f"user:{user_id}"],
                    recommended_actions=[
                        "Verify user identity",
                        "Monitor continued activity",
                        "Require additional authentication",
                        "Review recent access patterns"
                    ]
                )
                
                return threat
            
            return None
            
        except Exception as e:
            logger.error(f"Behavioral anomaly detection failed: {e}")
            return None
    
    async def detect_privilege_escalation(self, user_id: str, action: str, resource: str) -> Optional[ThreatEvent]:
        """Detect privilege escalation attempts"""
        try:
            rule = self.detection_rules["privilege_escalation"]
            patterns = rule["patterns"]
            
            # Check if action or resource contains privilege escalation indicators
            escalation_indicators = []
            action_lower = action.lower()
            resource_lower = resource.lower()
            
            for pattern in patterns:
                if pattern in action_lower or pattern in resource_lower:
                    escalation_indicators.append(pattern)
            
            if escalation_indicators:
                # Get user's current role to check if escalation is legitimate
                async with get_db_connection() as conn:
                    user_role = await conn.fetchval("""
                        SELECT role FROM users WHERE id = $1
                    """, user_id)
                
                # If user is not admin/platform_owner, this is suspicious
                if user_role not in ['platform_owner', 'security_admin']:
                    threat = ThreatEvent(
                        id="",
                        threat_type=ThreatType.PRIVILEGE_ESCALATION,
                        threat_level=rule["threat_level"],
                        status=ThreatStatus.DETECTED,
                        source_ip="unknown",  # Would need to be passed in
                        user_id=user_id,
                        username=None,
                        description=f"Privilege escalation attempt detected",
                        evidence={
                            "action": action,
                            "resource": resource,
                            "indicators": escalation_indicators,
                            "user_role": user_role,
                            "detection_rule": "privilege_escalation"
                        },
                        confidence_score=0.9,
                        risk_score=95,
                        timestamp=datetime.now(),
                        detection_method="pattern_matching",
                        affected_resources=[resource],
                        recommended_actions=[
                            "Immediately investigate user activity",
                            "Suspend user account if confirmed",
                            "Review recent privilege changes",
                            "Audit system access logs"
                        ],
                        auto_response_taken=rule["auto_response"]
                    )
                    
                    return threat
            
            return None
            
        except Exception as e:
            logger.error(f"Privilege escalation detection failed: {e}")
            return None
    
    async def check_malicious_ip(self, source_ip: str) -> Optional[ThreatEvent]:
        """Check if IP is in malicious IP database"""
        try:
            # Check against cached threat intelligence
            threat_ip_key = f"threat_intel:malicious_ips"
            is_malicious = await cache_service.redis_client.sismember(threat_ip_key, source_ip)
            
            if is_malicious:
                threat = ThreatEvent(
                    id="",
                    threat_type=ThreatType.MALICIOUS_IP,
                    threat_level=ThreatLevel.HIGH,
                    status=ThreatStatus.DETECTED,
                    source_ip=source_ip,
                    user_id=None,
                    username=None,
                    description=f"Activity from known malicious IP: {source_ip}",
                    evidence={
                        "threat_intel_source": "malicious_ip_database",
                        "detection_rule": "malicious_ip_activity"
                    },
                    confidence_score=0.95,
                    risk_score=90,
                    timestamp=datetime.now(),
                    detection_method="threat_intelligence",
                    affected_resources=["network"],
                    recommended_actions=[
                        "Block IP address immediately",
                        "Investigate all recent activity from this IP",
                        "Check for successful authentications",
                        "Review firewall rules"
                    ],
                    auto_response_taken=True
                )
                
                return threat
            
            return None
            
        except Exception as e:
            logger.error(f"Malicious IP check failed: {e}")
            return None
    
    async def process_threat_detection(self, activity: Dict[str, Any]) -> List[ThreatEvent]:
        """Process activity through all threat detection methods"""
        detected_threats = []
        
        try:
            source_ip = activity.get("source_ip", "unknown")
            user_id = activity.get("user_id")
            username = activity.get("username")
            action = activity.get("action", "")
            resource = activity.get("resource", "")
            event_type = activity.get("event_type", "")
            
            # Run detection methods in parallel
            detection_tasks = []
            
            # Brute force detection (for failed logins)
            if event_type == "login_failed" and username:
                detection_tasks.append(self.detect_brute_force_attack(source_ip, username))
            
            # Behavioral anomaly detection (for authenticated users)
            if user_id:
                detection_tasks.append(self.detect_behavioral_anomaly(user_id, activity))
            
            # Privilege escalation detection
            if user_id and action and resource:
                detection_tasks.append(self.detect_privilege_escalation(user_id, action, resource))
            
            # Malicious IP check
            if source_ip != "unknown":
                detection_tasks.append(self.check_malicious_ip(source_ip))
            
            # Execute all detection methods
            if detection_tasks:
                results = await asyncio.gather(*detection_tasks, return_exceptions=True)
                
                for result in results:
                    if isinstance(result, ThreatEvent):
                        detected_threats.append(result)
                    elif isinstance(result, Exception):
                        logger.error(f"Threat detection error: {result}")
            
            # Process detected threats
            for threat in detected_threats:
                await self._process_detected_threat(threat)
            
            return detected_threats
            
        except Exception as e:
            logger.error(f"Threat detection processing failed: {e}")
            return []
    
    async def _process_detected_threat(self, threat: ThreatEvent):
        """Process and respond to detected threat"""
        try:
            # Store threat
            self.active_threats[threat.id] = threat
            self.threat_history.append(threat)
            
            # Update metrics
            self.metrics["total_threats_detected"] += 1
            self.metrics["threats_by_type"][threat.threat_type.value] += 1
            self.metrics["threats_by_level"][threat.threat_level.value] += 1
            
            # Store in database
            await self._store_threat_event(threat)
            
            # Send real-time notification
            await send_security_alert(
                alert_type=threat.threat_type.value,
                severity=threat.threat_level.value,
                message=threat.description,
                data={
                    "threat_id": threat.id,
                    "confidence_score": threat.confidence_score,
                    "risk_score": threat.risk_score,
                    "source_ip": threat.source_ip,
                    "affected_user": threat.username or threat.user_id,
                    "recommended_actions": threat.recommended_actions
                }
            )
            
            # Log audit event
            await security_audit_logger.log_event(
                event_type=AuditEventType.SECURITY_THREAT_DETECTED,
                severity=AuditSeverity.CRITICAL if threat.threat_level == ThreatLevel.CRITICAL else AuditSeverity.HIGH,
                user_id=threat.user_id,
                username=threat.username,
                source_ip=threat.source_ip,
                action="threat_detected",
                result="detected",
                details={
                    "threat_id": threat.id,
                    "threat_type": threat.threat_type.value,
                    "confidence_score": threat.confidence_score,
                    "detection_method": threat.detection_method
                }
            )
            
            # Execute automated response if enabled
            if threat.auto_response_taken:
                await self._execute_automated_response(threat)
            
        except Exception as e:
            logger.error(f"Failed to process threat {threat.id}: {e}")
    
    async def _store_threat_event(self, threat: ThreatEvent):
        """Store threat event in database"""
        try:
            async with get_db_connection() as conn:
                await conn.execute("""
                    INSERT INTO threat_events (
                        id, threat_type, threat_level, status, source_ip,
                        user_id, username, description, evidence, confidence_score,
                        risk_score, timestamp, detection_method, affected_resources,
                        recommended_actions, auto_response_taken
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                """, 
                    threat.id, threat.threat_type.value, threat.threat_level.value,
                    threat.status.value, threat.source_ip, threat.user_id, threat.username,
                    threat.description, json.dumps(threat.evidence), threat.confidence_score,
                    threat.risk_score, threat.timestamp, threat.detection_method,
                    json.dumps(threat.affected_resources), json.dumps(threat.recommended_actions),
                    threat.auto_response_taken
                )
                
        except Exception as e:
            logger.error(f"Failed to store threat event: {e}")
    
    async def _execute_automated_response(self, threat: ThreatEvent):
        """Execute automated response to threat"""
        try:
            responses_taken = []
            
            if threat.threat_type == ThreatType.BRUTE_FORCE:
                # Block IP temporarily
                await self._block_ip_address(threat.source_ip, duration=3600)  # 1 hour
                responses_taken.append(f"Blocked IP {threat.source_ip} for 1 hour")
                
                # If username is known, implement account lockout
                if threat.username:
                    await self._lock_user_account(threat.username, duration=1800)  # 30 minutes
                    responses_taken.append(f"Locked account {threat.username} for 30 minutes")
            
            elif threat.threat_type == ThreatType.MALICIOUS_IP:
                # Block malicious IP immediately
                await self._block_ip_address(threat.source_ip, duration=86400)  # 24 hours
                responses_taken.append(f"Blocked malicious IP {threat.source_ip} for 24 hours")
            
            elif threat.threat_type == ThreatType.PRIVILEGE_ESCALATION:
                # Suspend user account immediately
                if threat.user_id:
                    await self._suspend_user_account(threat.user_id)
                    responses_taken.append(f"Suspended user account {threat.user_id}")
            
            # Update metrics
            self.metrics["auto_responses_triggered"] += len(responses_taken)
            
            # Log automated responses
            await security_audit_logger.log_event(
                event_type=AuditEventType.SYSTEM_STATUS,
                severity=AuditSeverity.HIGH,
                action="automated_threat_response",
                result="executed",
                details={
                    "threat_id": threat.id,
                    "responses_taken": responses_taken
                }
            )
            
        except Exception as e:
            logger.error(f"Automated response failed for threat {threat.id}: {e}")
    
    async def _block_ip_address(self, ip_address: str, duration: int):
        """Block IP address for specified duration"""
        try:
            block_key = f"blocked_ips:{ip_address}"
            await cache_service.set(block_key, {"blocked_at": datetime.now().isoformat()}, ttl=duration)
            
            # Add to blocked IPs set
            await cache_service.redis_client.sadd("blocked_ips_set", ip_address)
            await cache_service.redis_client.expire("blocked_ips_set", duration)
            
        except Exception as e:
            logger.error(f"Failed to block IP {ip_address}: {e}")
    
    async def _lock_user_account(self, username: str, duration: int):
        """Lock user account for specified duration"""
        try:
            lock_key = f"locked_accounts:{username}"
            await cache_service.set(lock_key, {"locked_at": datetime.now().isoformat()}, ttl=duration)
            
        except Exception as e:
            logger.error(f"Failed to lock account {username}: {e}")
    
    async def _suspend_user_account(self, user_id: str):
        """Suspend user account indefinitely"""
        try:
            async with get_db_connection() as conn:
                await conn.execute("""
                    UPDATE users SET is_active = false, suspended_at = $1 
                    WHERE id = $2
                """, datetime.now(), user_id)
                
        except Exception as e:
            logger.error(f"Failed to suspend user {user_id}: {e}")
    
    async def get_threat_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get threat detection summary for specified time period"""
        try:
            since = datetime.now() - timedelta(hours=hours)
            
            # Filter recent threats
            recent_threats = [
                threat for threat in self.threat_history 
                if threat.timestamp >= since
            ]
            
            # Calculate statistics
            threat_counts = defaultdict(int)
            level_counts = defaultdict(int)
            high_confidence_threats = 0
            auto_responses = 0
            
            for threat in recent_threats:
                threat_counts[threat.threat_type.value] += 1
                level_counts[threat.threat_level.value] += 1
                
                if threat.confidence_score >= 0.8:
                    high_confidence_threats += 1
                
                if threat.auto_response_taken:
                    auto_responses += 1
            
            return {
                "time_period_hours": hours,
                "total_threats": len(recent_threats),
                "threats_by_type": dict(threat_counts),
                "threats_by_level": dict(level_counts),
                "high_confidence_threats": high_confidence_threats,
                "automated_responses": auto_responses,
                "false_positive_rate": self.metrics["false_positive_rate"],
                "active_threats": len(self.active_threats),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get threat summary: {e}")
            return {}

# Global threat detection engine
threat_detector = ThreatDetectionEngine()

# Convenience functions
async def analyze_activity_for_threats(activity: Dict[str, Any]) -> List[ThreatEvent]:
    """Analyze activity for potential threats"""
    return await threat_detector.process_threat_detection(activity)

async def build_user_behavior_profile(user_id: str) -> Dict[str, Any]:
    """Build behavioral profile for user"""
    return await threat_detector.behavior_analyzer.build_user_profile(user_id)

async def get_threat_detection_metrics() -> Dict[str, Any]:
    """Get threat detection system metrics"""
    return threat_detector.metrics 