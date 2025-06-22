"""
SecureNet Sentry Error Tracking Configuration
Phase 1: Observability - Sentry Integration
"""

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
import os
from typing import Dict, Any, Optional
from utils.logging_config import get_logger

logger = get_logger(__name__)

def configure_sentry():
    """Configure Sentry for error tracking and performance monitoring"""
    
    sentry_dsn = os.getenv("SENTRY_DSN")
    environment = os.getenv("ENVIRONMENT", "development")
    
    # Skip Sentry configuration in development or if DSN is not properly configured
    if not sentry_dsn or sentry_dsn.strip() == "" or sentry_dsn in ["your-sentry-dsn-here", "project-id"] or "project-id" in sentry_dsn:
        # Only log if enterprise boot logs are not disabled
        if not os.getenv("DISABLE_ENTERPRISE_BOOT_LOGS", "false").lower() == "true":
            logger.info("✓ Sentry error tracking disabled (no valid DSN configured)")
        return
    
    try:
        sentry_sdk.init(
            dsn=sentry_dsn,
            environment=environment,
            integrations=[
                FastApiIntegration(),
                SqlalchemyIntegration(),
            ],
            traces_sample_rate=0.1,  # 10% of transactions for performance monitoring
            profiles_sample_rate=0.1,  # 10% for profiling
            before_send=filter_sensitive_data,
            before_send_transaction=filter_sensitive_transactions,
        )
        
        logger.info("Sentry error tracking configured", environment=environment)
    except Exception as e:
        logger.warning(f"Failed to configure Sentry: {e} - error tracking disabled")

def filter_sensitive_data(event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Filter sensitive data from Sentry events"""
    
    # Remove sensitive headers
    if 'request' in event and 'headers' in event['request']:
        headers = event['request']['headers']
        sensitive_headers = ['authorization', 'x-api-key', 'cookie']
        
        for header in sensitive_headers:
            if header in headers:
                headers[header] = '[Filtered]'
    
    # Remove sensitive form data
    if 'request' in event and 'data' in event['request']:
        data = event['request']['data']
        if isinstance(data, dict):
            sensitive_fields = ['password', 'token', 'secret', 'key']
            for field in sensitive_fields:
                if field in data:
                    data[field] = '[Filtered]'
    
    return event

def filter_sensitive_transactions(event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Filter sensitive data from transaction events"""
    
    # Skip health check endpoints
    if 'request' in event and 'url' in event['request']:
        url = event['request']['url']
        if any(path in url for path in ['/health', '/metrics', '/ping']):
            return None
    
    return event

class SentrySecurityMonitor:
    """Security-focused Sentry monitoring"""
    
    def __init__(self):
        self.logger = get_logger("sentry_security")
    
    def capture_security_event(self, event_type: str, details: Dict[str, Any], level: str = "warning"):
        """Capture security-related events"""
        
        with sentry_sdk.configure_scope() as scope:
            scope.set_tag("event_type", "security")
            scope.set_tag("security_event", event_type)
            scope.set_context("security_details", details)
            
            if level == "error":
                sentry_sdk.capture_exception()
            else:
                sentry_sdk.capture_message(
                    f"Security Event: {event_type}",
                    level=level
                )
        
        self.logger.info(
            "Security event captured in Sentry",
            event_type=event_type,
            level=level
        )
    
    def capture_threat_detection(self, threat_data: Dict[str, Any], tenant_id: str):
        """Capture threat detection events"""
        
        with sentry_sdk.configure_scope() as scope:
            scope.set_tag("tenant_id", tenant_id)
            scope.set_tag("threat_type", threat_data.get("type"))
            scope.set_tag("severity", threat_data.get("severity"))
            scope.set_context("threat_details", threat_data)
            
            sentry_sdk.capture_message(
                f"Threat Detected: {threat_data.get('type')}",
                level="warning"
            )
    
    def capture_failed_authentication(self, user_id: str, reason: str, ip_address: str):
        """Capture failed authentication attempts"""
        
        with sentry_sdk.configure_scope() as scope:
            scope.set_tag("event_type", "auth_failure")
            scope.set_tag("user_id", user_id)
            scope.set_context("auth_failure", {
                "reason": reason,
                "ip_address": ip_address,
                "timestamp": sentry_sdk.utils.utc_from_timestamp(sentry_sdk.utils.now())
            })
            
            sentry_sdk.capture_message(
                f"Authentication Failed: {reason}",
                level="warning"
            )
    
    def capture_scan_error(self, scan_id: str, error: Exception, scan_config: Dict[str, Any]):
        """Capture scan execution errors"""
        
        with sentry_sdk.configure_scope() as scope:
            scope.set_tag("event_type", "scan_error")
            scope.set_tag("scan_id", scan_id)
            scope.set_context("scan_config", scan_config)
            
            sentry_sdk.capture_exception(error)

# Global Sentry security monitor
sentry_security = SentrySecurityMonitor() 