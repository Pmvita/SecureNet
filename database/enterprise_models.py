"""
SecureNet Enterprise Database Models
PostgreSQL-optimized models with SOC 2 compliance, audit trails, and enterprise features
"""

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, Float, JSON, UUID,
    ForeignKey, Index, CheckConstraint, UniqueConstraint, text,
    TIMESTAMP, Enum as SQLEnum
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, validates
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID, JSONB, TSVECTOR, INET
from sqlalchemy.sql import func
from enum import Enum
import uuid
from datetime import datetime
from typing import Optional, Dict, Any

Base = declarative_base()

# Enums for type safety
class UserRole(Enum):
    PLATFORM_OWNER = "platform_owner"
    SECURITY_ADMIN = "security_admin"
    SOC_ANALYST = "soc_analyst"

class OrganizationStatus(Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DEACTIVATED = "deactivated"

class PlanType(Enum):
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"
    GOV_CLOUD = "gov_cloud"

class ThreatLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ComplianceFramework(Enum):
    SOC2 = "soc2"
    ISO27001 = "iso27001"
    NIST = "nist"
    HIPAA = "hipaa"
    GDPR = "gdpr"

# Base model with audit fields
class AuditMixin:
    """Mixin for audit trail functionality required for SOC 2 compliance"""
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_by = Column(PostgresUUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    updated_by = Column(PostgresUUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    version = Column(Integer, default=1, nullable=False)  # Optimistic locking

# Core Enterprise Models
class Organization(Base, AuditMixin):
    __tablename__ = 'organizations'

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    status = Column(SQLEnum(OrganizationStatus), default=OrganizationStatus.ACTIVE, nullable=False)
    plan_type = Column(SQLEnum(PlanType), default=PlanType.FREE, nullable=False)
    
    # Enterprise features
    device_limit = Column(Integer, default=10, nullable=False)
    user_limit = Column(Integer, default=5, nullable=False)
    retention_days = Column(Integer, default=30, nullable=False)
    
    # Compliance settings
    compliance_frameworks = Column(JSONB, default=list)
    data_residency = Column(String(3), default='US')  # ISO 3166-1 alpha-3
    encryption_required = Column(Boolean, default=True, nullable=False)
    
    # Billing information
    stripe_customer_id = Column(String(255), unique=True, nullable=True)
    subscription_id = Column(String(255), unique=True, nullable=True)
    trial_ends_at = Column(TIMESTAMP(timezone=True), nullable=True)
    
    # Contact information
    primary_contact_email = Column(String(255), nullable=False)
    billing_email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(JSONB, nullable=True)
    
    # Usage metrics
    monthly_api_calls = Column(Integer, default=0, nullable=False)
    storage_used_bytes = Column(Integer, default=0, nullable=False)
    
    # Relationships
    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    devices = relationship("NetworkDevice", back_populates="organization", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('device_limit > 0', name='positive_device_limit'),
        CheckConstraint('user_limit > 0', name='positive_user_limit'),
        CheckConstraint('retention_days >= 1', name='minimum_retention'),
        Index('idx_org_status', 'status'),
        Index('idx_org_plan', 'plan_type'),
        Index('idx_org_created', 'created_at'),
    )

class User(Base, AuditMixin):
    __tablename__ = 'users'

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(PostgresUUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    
    # Authentication
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    
    # Profile
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    title = Column(String(100), nullable=True)
    department = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    
    # Authorization
    role = Column(SQLEnum(UserRole), default=UserRole.SOC_ANALYST, nullable=False)
    permissions = Column(JSONB, default=dict)
    
    # Security
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    mfa_enabled = Column(Boolean, default=False, nullable=False)
    mfa_secret = Column(String(32), nullable=True)
    
    # Access tracking
    last_login = Column(TIMESTAMP(timezone=True), nullable=True)
    login_count = Column(Integer, default=0, nullable=False)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    lockout_until = Column(TIMESTAMP(timezone=True), nullable=True)
    
    # Session management
    current_session_id = Column(String(128), nullable=True)
    session_expires_at = Column(TIMESTAMP(timezone=True), nullable=True)
    
    # Compliance
    last_password_change = Column(TIMESTAMP(timezone=True), server_default=func.now())
    requires_password_change = Column(Boolean, default=False, nullable=False)
    terms_accepted_at = Column(TIMESTAMP(timezone=True), nullable=True)
    privacy_accepted_at = Column(TIMESTAMP(timezone=True), nullable=True)
    
    # Relationships
    organization = relationship("Organization", back_populates="users")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        Index('idx_user_org', 'organization_id'),
        Index('idx_user_email', 'email'),
        Index('idx_user_username', 'username'),
        Index('idx_user_role', 'role'),
        Index('idx_user_active', 'is_active'),
        Index('idx_user_login', 'last_login'),
    )

class NetworkDevice(Base, AuditMixin):
    __tablename__ = 'network_devices'

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(PostgresUUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    
    # Device identification
    name = Column(String(255), nullable=False)
    hostname = Column(String(255), nullable=True)
    ip_address = Column(INET, nullable=False)
    mac_address = Column(String(17), nullable=True)
    
    # Device classification
    device_type = Column(String(100), nullable=False)  # router, switch, server, etc.
    vendor = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    operating_system = Column(String(100), nullable=True)
    firmware_version = Column(String(100), nullable=True)
    
    # Network information
    network_segment = Column(String(100), nullable=True)
    vlan_id = Column(Integer, nullable=True)
    port_count = Column(Integer, nullable=True)
    
    # Status and monitoring
    status = Column(String(20), default='active', nullable=False)
    is_managed = Column(Boolean, default=False, nullable=False)
    monitoring_enabled = Column(Boolean, default=True, nullable=False)
    
    # Discovery information
    first_seen = Column(TIMESTAMP(timezone=True), server_default=func.now())
    last_seen = Column(TIMESTAMP(timezone=True), server_default=func.now())
    discovery_method = Column(String(50), nullable=False)  # scan, dhcp, manual
    
    # Security posture
    risk_score = Column(Float, default=0.0, nullable=False)
    vulnerability_count = Column(Integer, default=0, nullable=False)
    compliance_status = Column(String(20), default='unknown', nullable=False)
    
    # Metadata
    tags = Column(JSONB, default=list)
    custom_fields = Column(JSONB, default=dict)
    
    # Relationships
    organization = relationship("Organization", back_populates="devices")
    vulnerabilities = relationship("SecurityFinding", back_populates="device", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('organization_id', 'ip_address', name='unique_org_ip'),
        Index('idx_device_org', 'organization_id'),
        Index('idx_device_ip', 'ip_address'),
        Index('idx_device_type', 'device_type'),
        Index('idx_device_status', 'status'),
        Index('idx_device_last_seen', 'last_seen'),
        Index('idx_device_risk', 'risk_score'),
    )

class SecurityFinding(Base, AuditMixin):
    __tablename__ = 'security_findings'

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(PostgresUUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    device_id = Column(PostgresUUID(as_uuid=True), ForeignKey('network_devices.id'), nullable=True)
    
    # Finding classification
    finding_type = Column(String(100), nullable=False)  # vulnerability, misconfiguration, anomaly
    severity = Column(SQLEnum(ThreatLevel), nullable=False)
    
    # Vulnerability details
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    cve_id = Column(String(50), nullable=True)
    cvss_score = Column(Float, nullable=True)
    cvss_vector = Column(String(200), nullable=True)
    
    # Risk assessment
    risk_score = Column(Integer, nullable=False)  # 0-100
    exploitability = Column(String(20), nullable=True)
    impact = Column(String(20), nullable=True)
    
    # Status tracking
    status = Column(String(50), default='open', nullable=False)
    assigned_to = Column(PostgresUUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    
    # Timestamps
    discovered_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    resolved_at = Column(TIMESTAMP(timezone=True), nullable=True)
    verified_at = Column(TIMESTAMP(timezone=True), nullable=True)
    
    # Technical details
    affected_service = Column(String(100), nullable=True)
    affected_port = Column(Integer, nullable=True)
    detection_method = Column(String(100), nullable=False)
    scanner_name = Column(String(100), nullable=True)
    
    # Evidence and remediation
    evidence = Column(JSONB, default=dict)
    remediation_steps = Column(Text, nullable=True)
    references = Column(JSONB, default=list)
    
    # Full-text search
    search_vector = Column(TSVECTOR)
    
    # Relationships
    device = relationship("NetworkDevice", back_populates="vulnerabilities")
    assigned_user = relationship("User", foreign_keys=[assigned_to])
    
    # Constraints
    __table_args__ = (
        Index('idx_finding_org', 'organization_id'),
        Index('idx_finding_device', 'device_id'),
        Index('idx_finding_severity', 'severity'),
        Index('idx_finding_status', 'status'),
        Index('idx_finding_discovered', 'discovered_at'),
        Index('idx_finding_cve', 'cve_id'),
        Index('idx_finding_search', 'search_vector', postgresql_using='gin'),
        CheckConstraint('risk_score >= 0 AND risk_score <= 100', name='valid_risk_score'),
        CheckConstraint('cvss_score IS NULL OR (cvss_score >= 0 AND cvss_score <= 10)', name='valid_cvss_score'),
    )

class AuditLog(Base):
    __tablename__ = 'audit_logs'

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(PostgresUUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    user_id = Column(PostgresUUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    
    # Event details
    event_type = Column(String(100), nullable=False)  # login, logout, create, update, delete
    resource_type = Column(String(100), nullable=True)  # user, device, scan, etc.
    resource_id = Column(String(255), nullable=True)
    action = Column(String(255), nullable=False)
    
    # Request context
    ip_address = Column(INET, nullable=True)
    user_agent = Column(Text, nullable=True)
    session_id = Column(String(128), nullable=True)
    
    # Result
    success = Column(Boolean, nullable=False)
    error_message = Column(Text, nullable=True)
    
    # Additional context
    details = Column(JSONB, default=dict)
    changes = Column(JSONB, default=dict)  # Before/after for data changes
    
    # Compliance fields
    retention_date = Column(TIMESTAMP(timezone=True), nullable=False)  # When to delete this log
    timestamp = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
    
    # Constraints
    __table_args__ = (
        Index('idx_audit_org', 'organization_id'),
        Index('idx_audit_user', 'user_id'),
        Index('idx_audit_timestamp', 'timestamp'),
        Index('idx_audit_event_type', 'event_type'),
        Index('idx_audit_resource', 'resource_type', 'resource_id'),
        Index('idx_audit_ip', 'ip_address'),
        Index('idx_audit_retention', 'retention_date'),
    )

class ComplianceControl(Base, AuditMixin):
    __tablename__ = 'compliance_controls'

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(PostgresUUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    
    # Control identification
    framework = Column(SQLEnum(ComplianceFramework), nullable=False)
    control_id = Column(String(50), nullable=False)  # e.g., "CC6.1" for SOC 2
    control_name = Column(String(255), nullable=False)
    control_description = Column(Text, nullable=True)
    
    # Implementation status
    implementation_status = Column(String(50), default='not_implemented', nullable=False)
    effectiveness = Column(String(50), default='not_tested', nullable=False)
    
    # Testing
    last_tested = Column(TIMESTAMP(timezone=True), nullable=True)
    next_test_date = Column(TIMESTAMP(timezone=True), nullable=True)
    test_frequency = Column(String(50), nullable=False)  # monthly, quarterly, annually
    
    # Evidence
    evidence_links = Column(JSONB, default=list)
    testing_procedures = Column(Text, nullable=True)
    
    # Risk assessment
    risk_level = Column(SQLEnum(ThreatLevel), default=ThreatLevel.MEDIUM)
    mitigation_steps = Column(Text, nullable=True)
    
    # Metadata
    owner = Column(PostgresUUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    tags = Column(JSONB, default=list)
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('organization_id', 'framework', 'control_id', name='unique_org_control'),
        Index('idx_control_org', 'organization_id'),
        Index('idx_control_framework', 'framework'),
        Index('idx_control_status', 'implementation_status'),
        Index('idx_control_next_test', 'next_test_date'),
    )

class SecurityScan(Base, AuditMixin):
    __tablename__ = 'security_scans'

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(PostgresUUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    
    # Scan details
    scan_type = Column(String(100), nullable=False)  # vulnerability, compliance, network
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Execution
    status = Column(String(50), default='queued', nullable=False)
    started_at = Column(TIMESTAMP(timezone=True), nullable=True)
    completed_at = Column(TIMESTAMP(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    
    # Configuration
    scan_config = Column(JSONB, default=dict)
    target_specifications = Column(JSONB, default=dict)
    
    # Results
    findings_count = Column(Integer, default=0, nullable=False)
    critical_count = Column(Integer, default=0, nullable=False)
    high_count = Column(Integer, default=0, nullable=False)
    medium_count = Column(Integer, default=0, nullable=False)
    low_count = Column(Integer, default=0, nullable=False)
    
    # Progress tracking
    progress_percentage = Column(Integer, default=0, nullable=False)
    current_stage = Column(String(100), nullable=True)
    
    # Error handling
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    
    # Metadata
    scanner_version = Column(String(50), nullable=True)
    tags = Column(JSONB, default=list)
    
    # Constraints
    __table_args__ = (
        Index('idx_scan_org', 'organization_id'),
        Index('idx_scan_status', 'status'),
        Index('idx_scan_type', 'scan_type'),
        Index('idx_scan_started', 'started_at'),
        Index('idx_scan_completed', 'completed_at'),
        CheckConstraint('progress_percentage >= 0 AND progress_percentage <= 100', name='valid_progress'),
        CheckConstraint('retry_count >= 0', name='non_negative_retries'),
    )

# Full-text search functions
def update_search_vector():
    """SQL function to update search vectors"""
    return text("""
        CREATE OR REPLACE FUNCTION update_security_finding_search_vector()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.search_vector := to_tsvector('english', 
                COALESCE(NEW.title, '') || ' ' || 
                COALESCE(NEW.description, '') || ' ' ||
                COALESCE(NEW.cve_id, '')
            );
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        
        DROP TRIGGER IF EXISTS security_finding_search_vector_trigger ON security_findings;
        CREATE TRIGGER security_finding_search_vector_trigger
            BEFORE INSERT OR UPDATE ON security_findings
            FOR EACH ROW EXECUTE PROCEDURE update_security_finding_search_vector();
    """)

# Database initialization
def create_indexes_and_constraints():
    """Additional indexes and constraints for performance"""
    return [
        # Partial indexes for active records
        text("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active ON users (id) WHERE is_active = true;"),
        text("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_devices_active ON network_devices (id) WHERE status = 'active';"),
        
        # Composite indexes for common queries
        text("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_findings_org_severity_status ON security_findings (organization_id, severity, status);"),
        text("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_time_user ON audit_logs (timestamp DESC, user_id);"),
        
        # Functional indexes
        text("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));"),
        text("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_devices_hostname_lower ON network_devices (LOWER(hostname));"),
    ]

def create_database_functions():
    """Create utility functions for the database"""
    return [
        # Function to calculate device risk score
        text("""
            CREATE OR REPLACE FUNCTION calculate_device_risk_score(device_uuid UUID)
            RETURNS FLOAT AS $$
            DECLARE
                risk_score FLOAT := 0.0;
                vuln_count INTEGER;
                critical_count INTEGER;
                high_count INTEGER;
            BEGIN
                SELECT 
                    COUNT(*),
                    COUNT(*) FILTER (WHERE severity = 'critical'),
                    COUNT(*) FILTER (WHERE severity = 'high')
                INTO vuln_count, critical_count, high_count
                FROM security_findings 
                WHERE device_id = device_uuid AND status = 'open';
                
                -- Base score calculation
                risk_score := (critical_count * 10) + (high_count * 5) + ((vuln_count - critical_count - high_count) * 1.5);
                
                -- Cap at 100
                IF risk_score > 100 THEN
                    risk_score := 100;
                END IF;
                
                RETURN risk_score;
            END;
            $$ LANGUAGE plpgsql;
        """),
        
        # Function to update organization usage statistics
        text("""
            CREATE OR REPLACE FUNCTION update_organization_stats(org_uuid UUID)
            RETURNS VOID AS $$
            BEGIN
                UPDATE organizations SET
                    updated_at = NOW()
                WHERE id = org_uuid;
            END;
            $$ LANGUAGE plpgsql;
        """)
    ] 