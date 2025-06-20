"""
SQLAlchemy Models for SecureNet Enterprise PostgreSQL Database
"""

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, 
    JSON, Enum as SQLEnum, Index, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()

# Enums
class UserRole(str, Enum):
    PLATFORM_OWNER = "platform_owner"
    SECURITY_ADMIN = "security_admin"
    SOC_ANALYST = "soc_analyst"

class OrganizationStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    TRIAL = "trial"
    EXPIRED = "expired"

class PlanType(str, Enum):
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"

class ThreatSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ScanStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

# Core Models
class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    owner_email = Column(String(255), nullable=False)
    status = Column(SQLEnum(OrganizationStatus), default=OrganizationStatus.TRIAL)
    plan_type = Column(SQLEnum(PlanType), default=PlanType.FREE)
    device_limit = Column(Integer, default=10)
    api_key = Column(String(255), unique=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    users = relationship("User", back_populates="organization")
    network_devices = relationship("NetworkDevice", back_populates="organization")
    security_scans = relationship("SecurityScan", back_populates="organization")
    audit_logs = relationship("AuditLog", back_populates="organization")
    
    __table_args__ = (
        Index('idx_org_api_key', 'api_key'),
        Index('idx_org_status', 'status'),
    )

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.SOC_ANALYST)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    
    # Security fields
    is_active = Column(Boolean, default=True)
    failed_login_attempts = Column(Integer, default=0)
    last_login_attempt = Column(DateTime(timezone=True))
    last_login = Column(DateTime(timezone=True))
    last_logout = Column(DateTime(timezone=True))
    login_count = Column(Integer, default=0)
    two_factor_enabled = Column(Boolean, default=False)
    
    # Profile fields
    name = Column(String(255))
    phone = Column(String(50))
    department = Column(String(100))
    title = Column(String(100))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    organization = relationship("Organization", back_populates="users")
    audit_logs = relationship("AuditLog", back_populates="user")
    api_keys = relationship("UserAPIKey", back_populates="user")
    
    __table_args__ = (
        Index('idx_user_username', 'username'),
        Index('idx_user_email', 'email'),
        Index('idx_user_org_id', 'organization_id'),
        Index('idx_user_role', 'role'),
    )

class UserAPIKey(Base):
    __tablename__ = "user_api_keys"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    key_hash = Column(String(255), nullable=False)
    last_used = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="api_keys")
    
    __table_args__ = (
        Index('idx_api_key_user_id', 'user_id'),
        Index('idx_api_key_hash', 'key_hash'),
    )

class NetworkDevice(Base):
    __tablename__ = "network_devices"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    
    # Device information
    name = Column(String(255))
    ip_address = Column(String(45), nullable=False)  # IPv4/IPv6
    mac_address = Column(String(17))
    device_type = Column(String(50))
    vendor = Column(String(100))
    model = Column(String(100))
    os_info = Column(String(255))
    
    # Status and health
    status = Column(String(20), default="unknown")
    is_online = Column(Boolean, default=False)
    last_seen = Column(DateTime(timezone=True))
    response_time = Column(Float)
    
    # Security information
    open_ports = Column(JSON)
    services = Column(JSON)
    vulnerabilities = Column(JSON)
    risk_score = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    organization = relationship("Organization", back_populates="network_devices")
    security_findings = relationship("SecurityFinding", back_populates="device")
    
    __table_args__ = (
        Index('idx_device_org_id', 'organization_id'),
        Index('idx_device_ip', 'ip_address'),
        Index('idx_device_mac', 'mac_address'),
        Index('idx_device_status', 'status'),
        UniqueConstraint('organization_id', 'ip_address', name='uq_org_device_ip'),
    )

class SecurityScan(Base):
    __tablename__ = "security_scans"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    
    # Scan details
    scan_type = Column(String(50), nullable=False)
    target = Column(String(255), nullable=False)
    status = Column(SQLEnum(ScanStatus), default=ScanStatus.PENDING)
    progress = Column(Integer, default=0)
    
    # Configuration and results
    config = Column(JSON)
    results = Column(JSON)
    findings_count = Column(Integer, default=0)
    vulnerabilities_found = Column(Integer, default=0)
    
    # Timing
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    duration_seconds = Column(Integer)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    organization = relationship("Organization", back_populates="security_scans")
    findings = relationship("SecurityFinding", back_populates="scan")
    
    __table_args__ = (
        Index('idx_scan_org_id', 'organization_id'),
        Index('idx_scan_type', 'scan_type'),
        Index('idx_scan_status', 'status'),
        Index('idx_scan_created', 'created_at'),
    )

class SecurityFinding(Base):
    __tablename__ = "security_findings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id = Column(UUID(as_uuid=True), ForeignKey("security_scans.id"), nullable=False)
    device_id = Column(UUID(as_uuid=True), ForeignKey("network_devices.id"))
    
    # Finding details
    finding_type = Column(String(50), nullable=False)
    severity = Column(SQLEnum(ThreatSeverity), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Technical details
    port = Column(Integer)
    service = Column(String(100))
    protocol = Column(String(20))
    cve_id = Column(String(20))
    cvss_score = Column(Float)
    
    # Status and remediation
    status = Column(String(20), default="open")
    remediation = Column(Text)
    false_positive = Column(Boolean, default=False)
    
    # Additional data
    evidence = Column(JSON)
    additional_data = Column(JSON)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    scan = relationship("SecurityScan", back_populates="findings")
    device = relationship("NetworkDevice", back_populates="security_findings")
    
    __table_args__ = (
        Index('idx_finding_scan_id', 'scan_id'),
        Index('idx_finding_device_id', 'device_id'),
        Index('idx_finding_severity', 'severity'),
        Index('idx_finding_type', 'finding_type'),
        Index('idx_finding_cve', 'cve_id'),
    )

class ThreatDetection(Base):
    __tablename__ = "threat_detections"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    
    # Threat details
    threat_type = Column(String(50), nullable=False)
    severity = Column(SQLEnum(ThreatSeverity), nullable=False)
    confidence = Column(Float, nullable=False)
    
    # Network details
    source_ip = Column(String(45))
    target_ip = Column(String(45))
    source_port = Column(Integer)
    target_port = Column(Integer)
    protocol = Column(String(20))
    
    # Detection details
    detection_method = Column(String(50))
    ml_model_version = Column(String(50))
    rule_id = Column(String(100))
    
    # Status and analysis
    status = Column(String(20), default="active")
    analysis_results = Column(JSON)
    false_positive = Column(Boolean, default=False)
    
    # Timestamps
    detected_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_threat_org_id', 'organization_id'),
        Index('idx_threat_type', 'threat_type'),
        Index('idx_threat_severity', 'severity'),
        Index('idx_threat_detected', 'detected_at'),
        Index('idx_threat_source_ip', 'source_ip'),
        Index('idx_threat_target_ip', 'target_ip'),
    )

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Action details
    action = Column(String(100), nullable=False)
    resource_type = Column(String(50))
    resource_id = Column(String(255))
    
    # Request details
    ip_address = Column(String(45))
    user_agent = Column(Text)
    request_method = Column(String(10))
    request_path = Column(String(500))
    
    # Additional data
    details = Column(JSON)
    success = Column(Boolean, default=True)
    error_message = Column(Text)
    
    # Timestamp
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    organization = relationship("Organization", back_populates="audit_logs")
    user = relationship("User", back_populates="audit_logs")
    
    __table_args__ = (
        Index('idx_audit_org_id', 'organization_id'),
        Index('idx_audit_user_id', 'user_id'),
        Index('idx_audit_action', 'action'),
        Index('idx_audit_timestamp', 'timestamp'),
        Index('idx_audit_resource', 'resource_type', 'resource_id'),
    )

class SystemLog(Base):
    __tablename__ = "system_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    
    # Log details
    level = Column(String(20), nullable=False)
    category = Column(String(50))
    source = Column(String(100))
    message = Column(Text, nullable=False)
    
    # Additional data
    additional_data = Column(JSON)
    stack_trace = Column(Text)
    
    # Timestamp
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index('idx_log_org_id', 'organization_id'),
        Index('idx_log_level', 'level'),
        Index('idx_log_category', 'category'),
        Index('idx_log_timestamp', 'timestamp'),
        Index('idx_log_source', 'source'),
    )

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Notification details
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(50), default="system")
    severity = Column(String(20), default="info")
    
    # Status
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True))
    
    # Additional data
    additional_data = Column(JSON)
    action_url = Column(String(500))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
    
    __table_args__ = (
        Index('idx_notification_org_id', 'organization_id'),
        Index('idx_notification_user_id', 'user_id'),
        Index('idx_notification_category', 'category'),
        Index('idx_notification_created', 'created_at'),
        Index('idx_notification_unread', 'is_read', 'created_at'),
    )

class MLModel(Base):
    __tablename__ = "ml_models"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Model details
    name = Column(String(100), nullable=False)
    version = Column(String(50), nullable=False)
    model_type = Column(String(50), nullable=False)
    status = Column(String(20), default="training")
    
    # Performance metrics
    accuracy = Column(Float)
    precision = Column(Float)
    recall = Column(Float)
    f1_score = Column(Float)
    
    # MLflow integration
    mlflow_run_id = Column(String(255))
    mlflow_model_uri = Column(String(500))
    
    # Additional data
    hyperparameters = Column(JSON)
    training_data_info = Column(JSON)
    metrics = Column(JSON)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    trained_at = Column(DateTime(timezone=True))
    deployed_at = Column(DateTime(timezone=True))
    
    __table_args__ = (
        Index('idx_model_name_version', 'name', 'version'),
        Index('idx_model_type', 'model_type'),
        Index('idx_model_status', 'status'),
        UniqueConstraint('name', 'version', name='uq_model_name_version'),
    ) 