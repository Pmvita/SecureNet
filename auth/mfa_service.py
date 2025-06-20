"""
SecureNet Enterprise Multi-Factor Authentication Service
Day 2 Sprint 1: MFA Backend Preparation for Enhanced Security
"""

import pyotp
import qrcode
import secrets
import string
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from io import BytesIO
import base64
import json

logger = logging.getLogger(__name__)

class MFAService:
    """
    Enterprise MFA service supporting TOTP (Time-based One-Time Password)
    Includes QR code generation, backup codes, and recovery mechanisms
    """
    
    def __init__(self):
        self.issuer_name = "SecureNet Enterprise"
        self.backup_codes_count = 10
        self.backup_code_length = 8
        self.totp_period = 30  # 30 seconds
        self.totp_digits = 6   # 6-digit codes
        
    def generate_secret_key(self) -> str:
        """Generate a secure random secret key for TOTP"""
        try:
            # Generate a 32-character base32 secret (160 bits of entropy)
            secret = pyotp.random_base32()
            logger.info("New TOTP secret key generated successfully")
            return secret
        except Exception as e:
            logger.error(f"Failed to generate TOTP secret: {e}")
            raise
    
    def generate_totp_uri(self, secret: str, user_email: str, user_id: str) -> str:
        """Generate TOTP URI for authenticator apps"""
        try:
            totp = pyotp.TOTP(secret)
            
            # Create provisioning URI with issuer and account info
            uri = totp.provisioning_uri(
                name=user_email,
                issuer_name=self.issuer_name,
                image=None  # Could add SecureNet logo URL here
            )
            
            logger.info(f"TOTP URI generated for user {user_id}")
            return uri
            
        except Exception as e:
            logger.error(f"Failed to generate TOTP URI for user {user_id}: {e}")
            raise
    
    def generate_qr_code(self, totp_uri: str) -> str:
        """Generate QR code image as base64 string"""
        try:
            # Create QR code
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(totp_uri)
            qr.make(fit=True)
            
            # Create image
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Convert to base64 string
            buffered = BytesIO()
            img.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode()
            
            logger.info("QR code generated successfully")
            return f"data:image/png;base64,{img_str}"
            
        except Exception as e:
            logger.error(f"Failed to generate QR code: {e}")
            raise
    
    def generate_backup_codes(self) -> List[str]:
        """Generate backup codes for MFA recovery"""
        try:
            backup_codes = []
            
            for _ in range(self.backup_codes_count):
                # Generate random alphanumeric code
                code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) 
                              for _ in range(self.backup_code_length))
                
                # Format with dashes for readability (XXXX-XXXX)
                formatted_code = f"{code[:4]}-{code[4:]}"
                backup_codes.append(formatted_code)
            
            logger.info(f"Generated {len(backup_codes)} backup codes")
            return backup_codes
            
        except Exception as e:
            logger.error(f"Failed to generate backup codes: {e}")
            raise
    
    def verify_totp_token(self, secret: str, token: str, valid_window: int = 1) -> bool:
        """
        Verify TOTP token with time window tolerance
        valid_window=1 allows ±30 seconds tolerance
        """
        try:
            totp = pyotp.TOTP(secret)
            
            # Verify with time window tolerance
            is_valid = totp.verify(token, valid_window=valid_window)
            
            if is_valid:
                logger.info("TOTP token verified successfully")
            else:
                logger.warning("TOTP token verification failed")
            
            return is_valid
            
        except Exception as e:
            logger.error(f"TOTP token verification error: {e}")
            return False
    
    def verify_backup_code(self, provided_code: str, stored_codes: List[str]) -> Tuple[bool, List[str]]:
        """
        Verify backup code and remove it from available codes
        Returns (is_valid, updated_codes_list)
        """
        try:
            # Normalize the provided code (remove spaces, convert to uppercase)
            normalized_code = provided_code.strip().upper().replace(" ", "").replace("-", "")
            
            for i, stored_code in enumerate(stored_codes):
                normalized_stored = stored_code.replace("-", "").upper()
                
                if normalized_code == normalized_stored:
                    # Remove the used backup code
                    updated_codes = stored_codes.copy()
                    updated_codes.pop(i)
                    
                    logger.info("Backup code verified and consumed successfully")
                    return True, updated_codes
            
            logger.warning("Backup code verification failed")
            return False, stored_codes
            
        except Exception as e:
            logger.error(f"Backup code verification error: {e}")
            return False, stored_codes
    
    def setup_mfa_for_user(self, user_email: str, user_id: str) -> Dict[str, any]:
        """
        Complete MFA setup for a user
        Returns all necessary data for MFA enrollment
        """
        try:
            # Generate secret key
            secret = self.generate_secret_key()
            
            # Generate TOTP URI
            totp_uri = self.generate_totp_uri(secret, user_email, user_id)
            
            # Generate QR code
            qr_code = self.generate_qr_code(totp_uri)
            
            # Generate backup codes
            backup_codes = self.generate_backup_codes()
            
            mfa_setup = {
                "secret_key": secret,
                "totp_uri": totp_uri,
                "qr_code": qr_code,
                "backup_codes": backup_codes,
                "setup_timestamp": datetime.utcnow().isoformat(),
                "issuer": self.issuer_name,
                "algorithm": "SHA1",
                "digits": self.totp_digits,
                "period": self.totp_period
            }
            
            logger.info(f"MFA setup completed for user {user_id}")
            return mfa_setup
            
        except Exception as e:
            logger.error(f"MFA setup failed for user {user_id}: {e}")
            raise
    
    def validate_mfa_settings(self, mfa_data: Dict) -> bool:
        """Validate MFA settings data structure"""
        required_fields = [
            "secret_key", "backup_codes", "setup_timestamp"
        ]
        
        try:
            for field in required_fields:
                if field not in mfa_data:
                    logger.error(f"Missing required MFA field: {field}")
                    return False
            
            # Validate secret key format
            if not isinstance(mfa_data["secret_key"], str) or len(mfa_data["secret_key"]) < 16:
                logger.error("Invalid secret key format")
                return False
            
            # Validate backup codes
            backup_codes = mfa_data["backup_codes"]
            if not isinstance(backup_codes, list) or len(backup_codes) == 0:
                logger.error("Invalid backup codes format")
                return False
            
            logger.info("MFA settings validation passed")
            return True
            
        except Exception as e:
            logger.error(f"MFA settings validation error: {e}")
            return False
    
    def get_remaining_backup_codes_count(self, backup_codes: List[str]) -> int:
        """Get count of remaining unused backup codes"""
        return len(backup_codes) if backup_codes else 0
    
    def should_regenerate_backup_codes(self, backup_codes: List[str]) -> bool:
        """Check if backup codes should be regenerated (when running low)"""
        remaining = self.get_remaining_backup_codes_count(backup_codes)
        return remaining <= 2  # Suggest regeneration when ≤2 codes remain
    
    def get_totp_current_time_step(self) -> int:
        """Get current TOTP time step for synchronization"""
        import time
        return int(time.time()) // self.totp_period
    
    def get_next_totp_refresh_time(self) -> datetime:
        """Get timestamp when next TOTP code will be valid"""
        import time
        current_time = int(time.time())
        next_period = ((current_time // self.totp_period) + 1) * self.totp_period
        return datetime.fromtimestamp(next_period)

# Global MFA service instance
mfa_service = MFAService()

# Database schema for MFA (SQL DDL)
MFA_SCHEMA_SQL = """
-- SecureNet MFA Database Schema
-- Day 2 Sprint 1: MFA Backend Preparation

CREATE TABLE IF NOT EXISTS user_mfa_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    secret_key TEXT NOT NULL,
    backup_codes JSONB NOT NULL DEFAULT '[]',
    enabled BOOLEAN DEFAULT FALSE,
    verified BOOLEAN DEFAULT FALSE,
    setup_timestamp TIMESTAMP DEFAULT NOW(),
    last_used TIMESTAMP,
    last_backup_code_used TIMESTAMP,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure one MFA setting per user
    UNIQUE(user_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_mfa_settings_user_id 
ON user_mfa_settings(user_id);

CREATE INDEX IF NOT EXISTS idx_user_mfa_settings_enabled 
ON user_mfa_settings(enabled) WHERE enabled = true;

-- Audit table for MFA events
CREATE TABLE IF NOT EXISTS mfa_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'setup', 'verify_success', 'verify_fail', 'backup_used', 'disabled'
    event_details JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_mfa_audit_logs_user_timestamp 
ON mfa_audit_logs(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_mfa_audit_logs_event_type 
ON mfa_audit_logs(event_type, timestamp DESC);
""" 