"""
PostgreSQL Database Adapter for SecureNet Enterprise
Replaces SQLite with enterprise-grade PostgreSQL support
"""

import os
import uuid
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

import asyncpg
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import selectinload
from sqlalchemy import select, update, delete, func, and_, or_
from sqlalchemy.exc import IntegrityError, NoResultFound

from models import (
    Base, Organization, User, UserAPIKey, NetworkDevice, SecurityScan, 
    SecurityFinding, ThreatDetection, AuditLog, SystemLog, Notification, 
    MLModel, UserRole, OrganizationStatus, PlanType, ThreatSeverity, ScanStatus
)

# Configure logging
logger = logging.getLogger(__name__)

class PostgreSQLDatabase:
    """Enterprise PostgreSQL database adapter for SecureNet"""
    
    def __init__(self, database_url: str = None):
        self.database_url = database_url or os.getenv(
            "DATABASE_URL", 
            "postgresql+asyncpg://securenet:securenet@localhost:5432/securenet"
        )
        self.engine = None
        self.session_factory = None
        self._initialized = False
        
    async def initialize(self):
        """Initialize database connection and create tables"""
        if self._initialized:
            return
            
        try:
            # Create async engine
            self.engine = create_async_engine(
                self.database_url,
                echo=False,  # Set to True for SQL debugging
                pool_size=20,
                max_overflow=30,
                pool_pre_ping=True,
                pool_recycle=3600,
            )
            
            # Create session factory
            self.session_factory = async_sessionmaker(
                self.engine,
                class_=AsyncSession,
                expire_on_commit=False
            )
            
            # Create all tables
            async with self.engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            
            self._initialized = True
            logger.info("PostgreSQL database initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize PostgreSQL database: {e}")
            raise
    
    @asynccontextmanager
    async def get_session(self):
        """Get async database session"""
        if not self._initialized:
            await self.initialize()
            
        async with self.session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()
    
    async def close(self):
        """Close database connections"""
        if self.engine:
            await self.engine.dispose()
            self._initialized = False
    
    # ===== ORGANIZATION MANAGEMENT =====
    
    async def create_organization(self, name: str, owner_email: str, plan: PlanType = PlanType.FREE) -> str:
        """Create a new organization"""
        async with self.get_session() as session:
            org_id = str(uuid.uuid4())
            api_key = f"sk-{uuid.uuid4().hex}"
            
            organization = Organization(
                id=org_id,
                name=name,
                owner_email=owner_email,
                status=OrganizationStatus.TRIAL,
                plan_type=plan,
                api_key=api_key
            )
            
            session.add(organization)
            await session.flush()
            
            logger.info(f"Created organization: {name} with ID: {org_id}")
            return org_id
    
    async def get_organization_by_api_key(self, api_key: str) -> Optional[Dict]:
        """Get organization by API key"""
        async with self.get_session() as session:
            result = await session.execute(
                select(Organization).where(
                    and_(
                        Organization.api_key == api_key,
                        Organization.status != OrganizationStatus.SUSPENDED
                    )
                )
            )
            org = result.scalar_one_or_none()
            
            if org:
                return {
                    'id': str(org.id),
                    'name': org.name,
                    'owner_email': org.owner_email,
                    'status': org.status.value,
                    'plan_type': org.plan_type.value,
                    'device_limit': org.device_limit,
                    'created_at': org.created_at.isoformat(),
                    'updated_at': org.updated_at.isoformat()
                }
            return None
    
    async def get_organization_usage(self, org_id: str) -> Dict:
        """Get organization usage metrics"""
        async with self.get_session() as session:
            # Count devices
            device_count = await session.scalar(
                select(func.count(NetworkDevice.id)).where(
                    NetworkDevice.organization_id == org_id
                )
            )
            
            # Count active scans
            active_scans = await session.scalar(
                select(func.count(SecurityScan.id)).where(
                    and_(
                        SecurityScan.organization_id == org_id,
                        SecurityScan.status.in_([ScanStatus.PENDING, ScanStatus.RUNNING])
                    )
                )
            )
            
            # Count threats this month
            month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            threats_this_month = await session.scalar(
                select(func.count(ThreatDetection.id)).where(
                    and_(
                        ThreatDetection.organization_id == org_id,
                        ThreatDetection.detected_at >= month_start
                    )
                )
            )
            
            return {
                'device_count': device_count or 0,
                'active_scans': active_scans or 0,
                'threats_this_month': threats_this_month or 0
            }
    
    # ===== USER MANAGEMENT =====
    
    async def create_user(self, username: str, email: str, password_hash: str, 
                         role: UserRole, organization_id: str) -> int:
        """Create a new user"""
        async with self.get_session() as session:
            user = User(
                username=username,
                email=email,
                password_hash=password_hash,
                role=role,
                organization_id=organization_id
            )
            
            session.add(user)
            await session.flush()
            
            logger.info(f"Created user: {username} with role: {role.value}")
            return user.id
    
    async def get_user_by_username(self, username: str) -> Optional[Dict]:
        """Get user by username"""
        async with self.get_session() as session:
            result = await session.execute(
                select(User).options(selectinload(User.organization)).where(
                    User.username == username
                )
            )
            user = result.scalar_one_or_none()
            
            if user:
                return {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'password_hash': user.password_hash,
                    'role': user.role.value,
                    'organization_id': str(user.organization_id),
                    'organization_name': user.organization.name if user.organization else None,
                    'is_active': user.is_active,
                    'last_login': user.last_login.isoformat() if user.last_login else None,
                    'last_logout': user.last_logout.isoformat() if user.last_logout else None,
                    'login_count': user.login_count,
                    'two_factor_enabled': user.two_factor_enabled,
                    'created_at': user.created_at.isoformat()
                }
            return None
    
    async def update_user_login(self, user_id: int) -> bool:
        """Update user login timestamp and count"""
        async with self.get_session() as session:
            await session.execute(
                update(User).where(User.id == user_id).values(
                    last_login=datetime.now(),
                    login_count=User.login_count + 1,
                    failed_login_attempts=0
                )
            )
            return True
    
    async def update_user_logout(self, user_id: int) -> bool:
        """Update user logout timestamp"""
        async with self.get_session() as session:
            await session.execute(
                update(User).where(User.id == user_id).values(
                    last_logout=datetime.now()
                )
            )
            return True
    
    # ===== NETWORK DEVICE MANAGEMENT =====
    
    async def store_network_device(self, device_data: Dict, org_id: str) -> str:
        """Store or update network device"""
        async with self.get_session() as session:
            # Check if device exists
            result = await session.execute(
                select(NetworkDevice).where(
                    and_(
                        NetworkDevice.organization_id == org_id,
                        NetworkDevice.ip_address == device_data['ip_address']
                    )
                )
            )
            device = result.scalar_one_or_none()
            
            if device:
                # Update existing device
                for key, value in device_data.items():
                    if hasattr(device, key):
                        setattr(device, key, value)
                device.updated_at = datetime.now()
                device_id = str(device.id)
            else:
                # Create new device
                device_id = str(uuid.uuid4())
                device = NetworkDevice(
                    id=device_id,
                    organization_id=org_id,
                    **device_data
                )
                session.add(device)
            
            await session.flush()
            return device_id
    
    async def get_network_devices(self, org_id: str = None) -> List[Dict]:
        """Get network devices with optional organization scoping."""
        async with self.get_session() as session:
            try:
                query = select(NetworkDevice)
                if org_id:
                    query = query.where(NetworkDevice.organization_id == org_id)
                
                result = await session.execute(query.order_by(NetworkDevice.last_seen.desc()))
                devices = result.scalars().all()
                
                return [
                    {
                        'id': device.id,
                        'name': device.name,
                        'type': device.device_type,
                        'status': device.status,
                        'last_seen': device.last_seen.isoformat(),
                        'metadata': device.metadata or {}
                    }
                    for device in devices
                ]
            except Exception as e:
                logger.error(f"Error getting network devices: {e}")
                return []
    
    # ===== SECURITY SCAN MANAGEMENT =====
    
    async def create_security_scan(self, scan_data: Dict, org_id: str) -> str:
        """Create a new security scan"""
        async with self.get_session() as session:
            scan_id = str(uuid.uuid4())
            scan = SecurityScan(
                id=scan_id,
                organization_id=org_id,
                **scan_data
            )
            
            session.add(scan)
            await session.flush()
            
            logger.info(f"Created security scan: {scan_id}")
            return scan_id
    
    async def update_security_scan(self, scan_id: str, updates: Dict) -> bool:
        """Update security scan"""
        async with self.get_session() as session:
            await session.execute(
                update(SecurityScan).where(SecurityScan.id == scan_id).values(**updates)
            )
            return True
    
    async def get_security_scans(self, org_id: str, limit: int = 50) -> List[Dict]:
        """Get security scans for organization"""
        async with self.get_session() as session:
            result = await session.execute(
                select(SecurityScan).where(
                    SecurityScan.organization_id == org_id
                ).order_by(SecurityScan.created_at.desc()).limit(limit)
            )
            scans = result.scalars().all()
            
            return [
                {
                    'id': str(scan.id),
                    'scan_type': scan.scan_type,
                    'target': scan.target,
                    'status': scan.status.value,
                    'progress': scan.progress,
                    'findings_count': scan.findings_count,
                    'vulnerabilities_found': scan.vulnerabilities_found,
                    'started_at': scan.started_at.isoformat() if scan.started_at else None,
                    'completed_at': scan.completed_at.isoformat() if scan.completed_at else None,
                    'duration_seconds': scan.duration_seconds,
                    'created_at': scan.created_at.isoformat()
                }
                for scan in scans
            ]
    
    # ===== SECURITY FINDINGS =====
    
    async def store_security_finding(self, finding_data: Dict, scan_id: str) -> str:
        """Store security finding"""
        async with self.get_session() as session:
            finding_id = str(uuid.uuid4())
            finding = SecurityFinding(
                id=finding_id,
                scan_id=scan_id,
                **finding_data
            )
            
            session.add(finding)
            await session.flush()
            
            return finding_id
    
    async def get_security_findings(self, scan_id: str = None, org_id: str = None, 
                                  limit: int = 100) -> List[Dict]:
        """Get security findings"""
        async with self.get_session() as session:
            query = select(SecurityFinding).options(
                selectinload(SecurityFinding.scan),
                selectinload(SecurityFinding.device)
            )
            
            if scan_id:
                query = query.where(SecurityFinding.scan_id == scan_id)
            elif org_id:
                query = query.join(SecurityScan).where(SecurityScan.organization_id == org_id)
            
            query = query.order_by(SecurityFinding.created_at.desc()).limit(limit)
            
            result = await session.execute(query)
            findings = result.scalars().all()
            
            return [
                {
                    'id': str(finding.id),
                    'scan_id': str(finding.scan_id),
                    'device_id': str(finding.device_id) if finding.device_id else None,
                    'finding_type': finding.finding_type,
                    'severity': finding.severity.value,
                    'title': finding.title,
                    'description': finding.description,
                    'port': finding.port,
                    'service': finding.service,
                    'protocol': finding.protocol,
                    'cve_id': finding.cve_id,
                    'cvss_score': finding.cvss_score,
                    'status': finding.status,
                    'remediation': finding.remediation,
                    'false_positive': finding.false_positive,
                    'evidence': finding.evidence,
                    'additional_data': finding.additional_data,
                    'created_at': finding.created_at.isoformat()
                }
                for finding in findings
            ]
    
    # ===== THREAT DETECTION =====
    
    async def store_threat_detection(self, threat_data: Dict, org_id: str) -> str:
        """Store threat detection"""
        async with self.get_session() as session:
            threat_id = str(uuid.uuid4())
            threat = ThreatDetection(
                id=threat_id,
                organization_id=org_id,
                **threat_data
            )
            
            session.add(threat)
            await session.flush()
            
            logger.info(f"Stored threat detection: {threat_id}")
            return threat_id
    
    async def get_threat_detections(self, org_id: str, limit: int = 100) -> List[Dict]:
        """Get threat detections for organization"""
        async with self.get_session() as session:
            result = await session.execute(
                select(ThreatDetection).where(
                    ThreatDetection.organization_id == org_id
                ).order_by(ThreatDetection.detected_at.desc()).limit(limit)
            )
            threats = result.scalars().all()
            
            return [
                {
                    'id': str(threat.id),
                    'threat_type': threat.threat_type,
                    'severity': threat.severity.value,
                    'confidence': threat.confidence,
                    'source_ip': threat.source_ip,
                    'target_ip': threat.target_ip,
                    'source_port': threat.source_port,
                    'target_port': threat.target_port,
                    'protocol': threat.protocol,
                    'detection_method': threat.detection_method,
                    'ml_model_version': threat.ml_model_version,
                    'rule_id': threat.rule_id,
                    'status': threat.status,
                    'analysis_results': threat.analysis_results,
                    'false_positive': threat.false_positive,
                    'detected_at': threat.detected_at.isoformat(),
                    'resolved_at': threat.resolved_at.isoformat() if threat.resolved_at else None
                }
                for threat in threats
            ]
    
    # ===== AUDIT LOGGING =====
    
    async def log_audit_event(self, action: str, user_id: int = None, org_id: str = None,
                             resource_type: str = None, resource_id: str = None,
                             details: Dict = None, ip_address: str = None,
                             user_agent: str = None, request_method: str = None,
                             request_path: str = None, success: bool = True,
                             error_message: str = None) -> str:
        """Log audit event"""
        async with self.get_session() as session:
            audit_id = str(uuid.uuid4())
            audit_log = AuditLog(
                id=audit_id,
                organization_id=org_id,
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                details=details,
                ip_address=ip_address,
                user_agent=user_agent,
                request_method=request_method,
                request_path=request_path,
                success=success,
                error_message=error_message
            )
            
            session.add(audit_log)
            await session.flush()
            
            return audit_id
    
    async def get_audit_logs(self, org_id: str = None, user_id: int = None,
                           limit: int = 100) -> List[Dict]:
        """Get audit logs"""
        async with self.get_session() as session:
            query = select(AuditLog).options(selectinload(AuditLog.user))
            
            if org_id:
                query = query.where(AuditLog.organization_id == org_id)
            if user_id:
                query = query.where(AuditLog.user_id == user_id)
            
            query = query.order_by(AuditLog.timestamp.desc()).limit(limit)
            
            result = await session.execute(query)
            logs = result.scalars().all()
            
            return [
                {
                    'id': str(log.id),
                    'organization_id': str(log.organization_id) if log.organization_id else None,
                    'user_id': log.user_id,
                    'username': log.user.username if log.user else None,
                    'action': log.action,
                    'resource_type': log.resource_type,
                    'resource_id': log.resource_id,
                    'details': log.details,
                    'ip_address': log.ip_address,
                    'user_agent': log.user_agent,
                    'request_method': log.request_method,
                    'request_path': log.request_path,
                    'success': log.success,
                    'error_message': log.error_message,
                    'timestamp': log.timestamp.isoformat()
                }
                for log in logs
            ]
    
    # ===== SYSTEM LOGS =====
    
    async def store_system_log(self, level: str, message: str, category: str = None,
                              source: str = None, org_id: str = None,
                              additional_data: Dict = None, stack_trace: str = None) -> str:
        """Store system log"""
        async with self.get_session() as session:
            log_id = str(uuid.uuid4())
            system_log = SystemLog(
                id=log_id,
                organization_id=org_id,
                level=level,
                category=category,
                source=source,
                message=message,
                additional_data=additional_data,
                stack_trace=stack_trace
            )
            
            session.add(system_log)
            await session.flush()
            
            return log_id
    
    async def get_system_logs(self, org_id: str = None, level: str = None,
                             category: str = None, limit: int = 1000) -> List[Dict]:
        """Get system logs"""
        async with self.get_session() as session:
            query = select(SystemLog)
            
            conditions = []
            if org_id:
                conditions.append(SystemLog.organization_id == org_id)
            if level:
                conditions.append(SystemLog.level == level)
            if category:
                conditions.append(SystemLog.category == category)
            
            if conditions:
                query = query.where(and_(*conditions))
            
            query = query.order_by(SystemLog.timestamp.desc()).limit(limit)
            
            result = await session.execute(query)
            logs = result.scalars().all()
            
            return [
                {
                    'id': str(log.id),
                    'organization_id': str(log.organization_id) if log.organization_id else None,
                    'level': log.level,
                    'category': log.category,
                    'source': log.source,
                    'message': log.message,
                    'additional_data': log.additional_data,
                    'stack_trace': log.stack_trace,
                    'timestamp': log.timestamp.isoformat()
                }
                for log in logs
            ]
    
    # ===== NOTIFICATIONS =====
    
    async def create_notification(self, title: str, message: str, org_id: str = None,
                                 user_id: int = None, category: str = "system",
                                 severity: str = "info", additional_data: Dict = None,
                                 action_url: str = None, expires_at: datetime = None) -> str:
        """Create notification"""
        async with self.get_session() as session:
            notification_id = str(uuid.uuid4())
            notification = Notification(
                id=notification_id,
                organization_id=org_id,
                user_id=user_id,
                title=title,
                message=message,
                category=category,
                severity=severity,
                additional_data=additional_data,
                action_url=action_url,
                expires_at=expires_at
            )
            
            session.add(notification)
            await session.flush()
            
            return notification_id
    
    async def get_notifications(self, org_id: str = None, user_id: int = None,
                               unread_only: bool = False, limit: int = 50) -> List[Dict]:
        """Get notifications"""
        async with self.get_session() as session:
            query = select(Notification)
            
            conditions = []
            if org_id:
                conditions.append(Notification.organization_id == org_id)
            if user_id:
                conditions.append(Notification.user_id == user_id)
            if unread_only:
                conditions.append(Notification.is_read == False)
            
            # Filter out expired notifications
            conditions.append(
                or_(
                    Notification.expires_at.is_(None),
                    Notification.expires_at > datetime.now()
                )
            )
            
            if conditions:
                query = query.where(and_(*conditions))
            
            query = query.order_by(Notification.created_at.desc()).limit(limit)
            
            result = await session.execute(query)
            notifications = result.scalars().all()
            
            return [
                {
                    'id': str(notification.id),
                    'organization_id': str(notification.organization_id) if notification.organization_id else None,
                    'user_id': notification.user_id,
                    'title': notification.title,
                    'message': notification.message,
                    'category': notification.category,
                    'severity': notification.severity,
                    'is_read': notification.is_read,
                    'read_at': notification.read_at.isoformat() if notification.read_at else None,
                    'additional_data': notification.additional_data,
                    'action_url': notification.action_url,
                    'created_at': notification.created_at.isoformat(),
                    'expires_at': notification.expires_at.isoformat() if notification.expires_at else None
                }
                for notification in notifications
            ]
    
    async def mark_notification_read(self, notification_id: str, org_id: str = None) -> bool:
        """Mark notification as read"""
        async with self.get_session() as session:
            conditions = [Notification.id == notification_id]
            if org_id:
                conditions.append(Notification.organization_id == org_id)
            
            await session.execute(
                update(Notification).where(and_(*conditions)).values(
                    is_read=True,
                    read_at=datetime.now()
                )
            )
            return True
    
    # ===== ML MODEL MANAGEMENT =====
    
    async def store_ml_model(self, model_data: Dict) -> str:
        """Store ML model information"""
        async with self.get_session() as session:
            model_id = str(uuid.uuid4())
            ml_model = MLModel(
                id=model_id,
                **model_data
            )
            
            session.add(ml_model)
            await session.flush()
            
            logger.info(f"Stored ML model: {model_id}")
            return model_id
    
    async def get_ml_models(self, model_type: str = None, status: str = None,
                           limit: int = 50) -> List[Dict]:
        """Get ML models"""
        async with self.get_session() as session:
            query = select(MLModel)
            
            conditions = []
            if model_type:
                conditions.append(MLModel.model_type == model_type)
            if status:
                conditions.append(MLModel.status == status)
            
            if conditions:
                query = query.where(and_(*conditions))
            
            query = query.order_by(MLModel.created_at.desc()).limit(limit)
            
            result = await session.execute(query)
            models = result.scalars().all()
            
            return [
                {
                    'id': str(model.id),
                    'name': model.name,
                    'version': model.version,
                    'model_type': model.model_type,
                    'status': model.status,
                    'accuracy': model.accuracy,
                    'precision': model.precision,
                    'recall': model.recall,
                    'f1_score': model.f1_score,
                    'mlflow_run_id': model.mlflow_run_id,
                    'mlflow_model_uri': model.mlflow_model_uri,
                    'hyperparameters': model.hyperparameters,
                    'training_data_info': model.training_data_info,
                    'metrics': model.metrics,
                    'created_at': model.created_at.isoformat(),
                    'trained_at': model.trained_at.isoformat() if model.trained_at else None,
                    'deployed_at': model.deployed_at.isoformat() if model.deployed_at else None
                }
                for model in models
            ]

    # ===== MISSING METHODS FROM SQLITE VERSION =====
    
    async def ensure_default_organization(self) -> str:
        """Ensure default organization exists and return its ID"""
        async with self.get_session() as session:
            # Try to find existing default organization
            result = await session.execute(
                select(Organization).where(Organization.name == "Default Organization")
            )
            org = result.scalar_one_or_none()
            
            if org:
                return str(org.id)
            
            # Create default organization
            org_id = await self.create_organization(
                name="Default Organization",
                owner_email="admin@securenet.local",
                plan=PlanType.FREE
            )
            logger.info(f"Created default organization: {org_id}")
            return org_id
    
    async def store_log(self, log_data: Dict) -> str:
        """Store system log entry"""
        return await self.store_system_log(
            level=log_data.get('level', 'info'),
            message=log_data.get('message', ''),
            category=log_data.get('category', 'system'),
            source=log_data.get('source', 'application'),
            org_id=log_data.get('org_id'),
            additional_data=log_data.get('metadata')
        )
    
    async def get_user_organizations(self, user_id: int) -> List[Dict]:
        """Get organizations for a user"""
        async with self.get_session() as session:
            # For now, return default organization for all users
            # This is a simplified implementation
            default_org_id = await self.ensure_default_organization()
            return [
                {
                    'user_id': user_id,
                    'organization_id': default_org_id,
                    'role': 'member'
                }
            ]
    
    async def get_logs(self, page: int = 1, page_size: int = 20, filters: dict = None) -> List[Dict]:
        """Get paginated system logs"""
        offset = (page - 1) * page_size
        
        # Extract filters
        org_id = None
        level = None
        category = None
        if filters:
            org_id = filters.get('org_id')
            level = filters.get('level')
            category = filters.get('category')
        
        logs = await self.get_system_logs(
            org_id=org_id,
            level=level,
            category=category,
            limit=page_size
        )
        
        # Apply pagination (simple implementation)
        start_idx = offset
        end_idx = start_idx + page_size
        return logs[start_idx:end_idx]
    
    async def get_security_metrics(self) -> Dict:
        """Get security metrics summary"""
        async with self.get_session() as session:
            # Count security findings by severity
            high_severity = await session.scalar(
                select(func.count(SecurityFinding.id)).where(
                    SecurityFinding.severity == 'high'
                )
            ) or 0
            
            medium_severity = await session.scalar(
                select(func.count(SecurityFinding.id)).where(
                    SecurityFinding.severity == 'medium'
                )
            ) or 0
            
            low_severity = await session.scalar(
                select(func.count(SecurityFinding.id)).where(
                    SecurityFinding.severity == 'low'
                )
            ) or 0
            
            # Count active scans
            active_scans = await session.scalar(
                select(func.count(SecurityScan.id)).where(
                    SecurityScan.status.in_(['pending', 'running'])
                )
            ) or 0
            
            return {
                'total_findings': high_severity + medium_severity + low_severity,
                'high_severity_findings': high_severity,
                'medium_severity_findings': medium_severity,
                'low_severity_findings': low_severity,
                'active_scans': active_scans,
                'security_score': max(0, 100 - (high_severity * 10 + medium_severity * 5 + low_severity * 1))
            }
    
    async def get_anomalies(self, page: int = 1, page_size: int = 20, filters: dict = None) -> List[Dict]:
        """Get anomalies (placeholder implementation)"""
        # This is a placeholder - in a real implementation, you'd have an anomalies table
        # For now, return empty list or mock data
        return []
    
    async def get_anomalies_stats(self) -> Dict:
        """Get anomalies statistics (placeholder implementation)"""
        # Placeholder implementation
        return {
            'total': 0,
            'critical': 0,
            'high': 0,
            'medium': 0,
            'low': 0,
            'resolved': 0
        }
    
    async def get_user_with_session_info(self, user_id: int) -> Optional[Dict]:
        """Get user with session information"""
        async with self.get_session() as session:
            result = await session.execute(
                select(User).where(User.id == user_id)
            )
            user = result.scalar_one_or_none()
            
            if not user:
                return None
            
            return {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role.value,
                'is_active': user.is_active,
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'last_logout': user.last_logout.isoformat() if user.last_logout else None,
                'login_count': user.login_count,
                'created_at': user.created_at.isoformat(),
                'updated_at': user.updated_at.isoformat()
            }
    
    async def get_anomalies_count(self, filters: dict = None) -> int:
        """Get total count of anomalies (placeholder implementation)"""
        # Placeholder implementation - return 0 for now
        return 0
    
    async def get_logs_count(self, filters: dict = None) -> int:
        """Get total count of logs"""
        async with self.get_session() as session:
            query = select(func.count(SystemLog.id))
            
            conditions = []
            if filters:
                if filters.get('org_id'):
                    conditions.append(SystemLog.organization_id == filters['org_id'])
                if filters.get('level'):
                    conditions.append(SystemLog.level == filters['level'])
                if filters.get('category'):
                    conditions.append(SystemLog.category == filters['category'])
            
            if conditions:
                query = query.where(and_(*conditions))
            
            result = await session.scalar(query)
            return result or 0
    
    async def get_recent_scans(self, limit: int = 10) -> List[Dict]:
        """Get recent security scans"""
        async with self.get_session() as session:
            query = select(SecurityScan).order_by(
                SecurityScan.created_at.desc()
            ).limit(limit)
            
            result = await session.execute(query)
            scans = result.scalars().all()
            
            return [
                {
                    'id': str(scan.id),
                    'organization_id': str(scan.organization_id),
                    'scan_type': scan.scan_type,
                    'status': scan.status.value,
                    'target': scan.target,
                    'progress': scan.progress,
                    'findings_count': scan.findings_count,
                    'created_at': scan.created_at.isoformat(),
                    'updated_at': scan.updated_at.isoformat(),
                    'started_at': scan.started_at.isoformat() if scan.started_at else None,
                    'completed_at': scan.completed_at.isoformat() if scan.completed_at else None
                }
                for scan in scans
            ]
    
    async def get_settings(self) -> Dict:
        """Get system settings (placeholder implementation)"""
        # Placeholder implementation - return default settings
        return {
            'scan_frequency': 'daily',
            'alert_threshold': 'medium',
            'notification_enabled': True,
            'max_concurrent_scans': 5,
            'data_retention_days': 90,
            'auto_remediation': False,
            'security_level': 'standard',
            'log_level': 'info'
        }
    
    async def get_network_connections(self) -> List[Dict]:
        """Get network connections."""
        # PostgreSQL version doesn't have connections table yet
        # Return empty list for now
        return []
    
    async def get_network_traffic(self, limit: int = 100) -> List[Dict]:
        """Get network traffic data."""
        # PostgreSQL version doesn't have traffic table yet
        # Return sample data for now
        from datetime import datetime, timedelta
        import random
        
        traffic = []
        for i in range(min(limit, 10)):
            timestamp = datetime.now() - timedelta(minutes=i*5)
            traffic.append({
                'timestamp': timestamp.isoformat(),
                'bytes_in': random.randint(1000, 50000),
                'bytes_out': random.randint(1000, 45000),
                'packets_in': random.randint(10, 200),
                'packets_out': random.randint(10, 190),
                'source_ip': f'192.168.1.{random.randint(1, 254)}',
                'dest_ip': f'192.168.1.{random.randint(1, 254)}',
                'protocol': random.choice(['TCP', 'UDP', 'HTTP', 'HTTPS']),
                'metadata': {}
            })
        return traffic
    
    async def get_network_protocols(self) -> List[Dict]:
        """Get network protocol distribution."""
        # Return sample protocol data for now
        return [
            {'name': 'TCP', 'count': 150, 'percentage': 50.0},
            {'name': 'UDP', 'count': 75, 'percentage': 25.0},
            {'name': 'HTTP', 'count': 60, 'percentage': 20.0},
            {'name': 'HTTPS', 'count': 15, 'percentage': 5.0},
        ]
    
    async def get_network_stats(self) -> Dict:
        """Get network statistics."""
        async with self.get_session() as session:
            try:
                # Count total devices
                total_devices = await session.scalar(
                    select(func.count(NetworkDevice.id))
                )
                
                # Count active devices
                active_devices = await session.scalar(
                    select(func.count(NetworkDevice.id)).where(
                        NetworkDevice.status == 'active'
                    )
                )
                
                return {
                    'total_devices': total_devices or 0,
                    'active_devices': active_devices or 0,
                    'total_traffic': 95000,  # Sample data
                    'average_latency': 25    # Sample data
                }
            except Exception as e:
                logger.error(f"Error getting network stats: {e}")
                return {
                    'total_devices': 0,
                    'active_devices': 0,
                    'total_traffic': 0,
                    'average_latency': 0
                }
    
    async def update_settings(self, settings: dict) -> bool:
        """Update system settings (placeholder implementation)"""
        # Placeholder implementation - just log the update for now
        logger.info(f"Settings update requested: {settings}")
        return True

    async def update_db_schema(self):
        """Update database schema - for PostgreSQL, this is handled by the initialize method"""
        # In PostgreSQL version, schema updates are handled by SQLAlchemy models
        # and the initialize method already creates all tables
        logger.info("PostgreSQL schema is managed by SQLAlchemy models")
        pass

    # ===== SECURITY FINDINGS MANAGEMENT =====
    
    async def get_recent_findings(self, limit: int = 10) -> List[Dict]:
        """Get recent security findings."""
        async with self.get_session() as session:
            try:
                result = await session.execute(
                    select(SecurityFinding)
                    .order_by(SecurityFinding.created_at.desc())
                    .limit(limit)
                )
                findings = result.scalars().all()
                
                return [
                    {
                        'id': str(finding.id),
                        'scan_id': str(finding.scan_id) if finding.scan_id else None,
                        'type': finding.finding_type,
                        'severity': finding.severity.value if finding.severity else 'low',
                        'status': finding.status,
                        'description': finding.description,
                        'timestamp': finding.created_at.isoformat(),
                        'source': 'security_scan',
                        'metadata': finding.additional_data or {}
                    }
                    for finding in findings
                ]
            except Exception as e:
                logger.error(f"Error getting recent findings: {e}")
                return []

    # ===== USER ACTIVITY LOGGING =====
    
    async def get_user_activity_log(self, user_id: int, limit: int = 50) -> List[Dict]:
        """Get user activity log entries."""
        async with self.get_session() as session:
            try:
                result = await session.execute(
                    select(AuditLog)
                    .where(AuditLog.user_id == user_id)
                    .order_by(AuditLog.timestamp.desc())
                    .limit(limit)
                )
                logs = result.scalars().all()
                
                return [
                    {
                        'id': str(log.id),
                        'action': log.action,
                        'timestamp': log.timestamp.isoformat(),
                        'ip_address': log.ip_address,
                        'user_agent': log.user_agent or 'Unknown',
                        'success': log.success,
                        'details': log.details or {}
                    }
                    for log in logs
                ]
            except Exception as e:
                logger.error(f"Error getting user activity log: {e}")
                return []

# Global database instance
db = PostgreSQLDatabase()

# Export the database instance
__all__ = ['db', 'PostgreSQLDatabase'] 