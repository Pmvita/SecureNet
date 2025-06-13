"""
SecureNet Structured Logging Configuration
Phase 1: Observability - Structlog Integration
"""

import structlog
import logging
import sys
from typing import Dict, Any
from datetime import datetime
import json

def configure_structlog():
    """Configure structured logging for SecureNet"""
    
    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=logging.INFO,
    )
    
    # Configure structlog
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

def get_logger(name: str = None):
    """Get a structured logger instance"""
    return structlog.get_logger(name)

class SecurityEventLogger:
    """Specialized logger for security events"""
    
    def __init__(self):
        self.logger = get_logger("security")
    
    def log_threat_detected(self, threat_data: Dict[str, Any], tenant_id: str):
        """Log threat detection event"""
        self.logger.warning(
            "Threat detected",
            event_type="threat_detection",
            tenant_id=tenant_id,
            threat_type=threat_data.get("type"),
            severity=threat_data.get("severity"),
            source_ip=threat_data.get("source_ip"),
            confidence=threat_data.get("confidence"),
            timestamp=datetime.utcnow().isoformat()
        )
    
    def log_scan_completed(self, scan_data: Dict[str, Any], tenant_id: str):
        """Log scan completion event"""
        self.logger.info(
            "Security scan completed",
            event_type="scan_completed",
            tenant_id=tenant_id,
            scan_type=scan_data.get("type"),
            target=scan_data.get("target"),
            vulnerabilities_found=scan_data.get("vulnerabilities_count", 0),
            duration=scan_data.get("duration"),
            timestamp=datetime.utcnow().isoformat()
        )
    
    def log_user_action(self, action: str, user_id: str, tenant_id: str, details: Dict[str, Any] = None):
        """Log user action for audit trail"""
        self.logger.info(
            "User action",
            event_type="user_action",
            action=action,
            user_id=user_id,
            tenant_id=tenant_id,
            details=details or {},
            timestamp=datetime.utcnow().isoformat()
        )
    
    def log_auth_event(self, event_type: str, user_id: str, success: bool, details: Dict[str, Any] = None):
        """Log authentication events"""
        level = "info" if success else "warning"
        getattr(self.logger, level)(
            f"Authentication {event_type}",
            event_type=f"auth_{event_type}",
            user_id=user_id,
            success=success,
            details=details or {},
            timestamp=datetime.utcnow().isoformat()
        )

# Global security logger instance
security_logger = SecurityEventLogger() 