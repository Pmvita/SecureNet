"""
SecureNet Enhanced JWT Authentication with MFA
Enterprise-grade authentication for privileged roles
"""

import jwt
import pyotp
import qrcode
import io
import base64
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional, List, Tuple
from passlib.context import CryptContext
from passlib.hash import argon2
import secrets
import hashlib
import logging
from dataclasses import dataclass
from enum import Enum
import redis
import json
import os
import time
from utils.logging_config import get_logger
from monitoring.prometheus_metrics import metrics

logger = logging.getLogger(__name__)

class UserRole(Enum):
    PLATFORM_OWNER = "platform_owner"
    SECURITY_ADMIN = "security_admin"
    SOC_ANALYST = "soc_analyst"

class MFAMethod(Enum):
    TOTP = "totp"
    SMS = "sms"
    EMAIL = "email"

@dataclass
class AuthConfig:
    """Authentication configuration"""
    jwt_secret: str
    jwt_algorithm: str = "RS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30
    mfa_required_roles: List[str] = None
    password_min_length: int = 12
    password_require_special: bool = True
    max_login_attempts: int = 5
    lockout_duration_minutes: int = 30

    def __post_init__(self):
        if self.mfa_required_roles is None:
            self.mfa_required_roles = [
                UserRole.PLATFORM_OWNER.value,
                UserRole.SECURITY_ADMIN.value
            ]

class EnhancedJWTManager:
    """Enterprise JWT manager with MFA support"""
    
    def __init__(self, config: AuthConfig, redis_client: Optional[redis.Redis] = None):
        self.config = config
        self.redis_client = redis_client or redis.Redis(host='localhost', port=6379, db=1)
        self.pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
        
        # Generate RSA key pair for JWT signing
        self._generate_rsa_keys()
    
    def _generate_rsa_keys(self):
        """Generate RSA key pair for JWT signing"""
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.hazmat.primitives import serialization
        
        # Generate private key
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )
        
        # Serialize private key
        self.private_key = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        
        # Serialize public key
        public_key = private_key.public_key()
        self.public_key = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
    
    def hash_password(self, password: str) -> str:
        """Hash password with Argon2"""
        return self.pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return self.pwd_context.verify(plain_password, hashed_password)
    
    def validate_password_strength(self, password: str) -> Tuple[bool, List[str]]:
        """Validate password meets enterprise requirements"""
        errors = []
        
        if len(password) < self.config.password_min_length:
            errors.append(f"Password must be at least {self.config.password_min_length} characters")
        
        if not any(c.isupper() for c in password):
            errors.append("Password must contain at least one uppercase letter")
        
        if not any(c.islower() for c in password):
            errors.append("Password must contain at least one lowercase letter")
        
        if not any(c.isdigit() for c in password):
            errors.append("Password must contain at least one digit")
        
        if self.config.password_require_special and not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            errors.append("Password must contain at least one special character")
        
        return len(errors) == 0, errors
    
    def generate_mfa_secret(self, username: str) -> str:
        """Generate TOTP secret for MFA"""
        secret = pyotp.random_base32()
        
        # Store secret in Redis with expiration
        self.redis_client.setex(
            f"mfa_setup:{username}",
            timedelta(minutes=10),
            secret
        )
        
        return secret
    
    def generate_mfa_qr_code(self, username: str, secret: str, issuer: str = "SecureNet") -> str:
        """Generate QR code for MFA setup"""
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=username,
            issuer_name=issuer
        )
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64 string
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
    
    def verify_mfa_token(self, username: str, token: str, secret: str) -> bool:
        """Verify TOTP token"""
        try:
            totp = pyotp.TOTP(secret)
            return totp.verify(token, valid_window=1)  # Allow 30-second window
        except Exception as e:
            logger.error(f"MFA verification error for {username}: {e}")
            return False
    
    def is_mfa_required(self, user_role: str) -> bool:
        """Check if MFA is required for user role"""
        return user_role in self.config.mfa_required_roles
    
    def check_login_attempts(self, username: str) -> Tuple[bool, int]:
        """Check if user is locked out due to failed attempts"""
        key = f"login_attempts:{username}"
        attempts = self.redis_client.get(key)
        
        if attempts is None:
            return True, 0
        
        attempts = int(attempts)
        if attempts >= self.config.max_login_attempts:
            # Check if lockout period has expired
            lockout_key = f"lockout:{username}"
            if self.redis_client.exists(lockout_key):
                return False, attempts
            else:
                # Lockout expired, reset attempts
                self.redis_client.delete(key)
                return True, 0
        
        return True, attempts
    
    def record_login_attempt(self, username: str, success: bool):
        """Record login attempt"""
        key = f"login_attempts:{username}"
        
        if success:
            # Clear failed attempts on successful login
            self.redis_client.delete(key)
            self.redis_client.delete(f"lockout:{username}")
        else:
            # Increment failed attempts
            attempts = self.redis_client.incr(key)
            self.redis_client.expire(key, timedelta(hours=1))
            
            if attempts >= self.config.max_login_attempts:
                # Lock out user
                lockout_key = f"lockout:{username}"
                self.redis_client.setex(
                    lockout_key,
                    timedelta(minutes=self.config.lockout_duration_minutes),
                    "locked"
                )
                logger.warning(f"User {username} locked out after {attempts} failed attempts")
    
    def create_access_token(self, user_data: Dict[str, Any], mfa_verified: bool = False) -> str:
        """Create JWT access token"""
        now = datetime.now(timezone.utc)
        expire = now + timedelta(minutes=self.config.access_token_expire_minutes)
        
        # Check if MFA is required but not verified
        if self.is_mfa_required(user_data.get("role")) and not mfa_verified:
            # Create limited token for MFA challenge
            payload = {
                "sub": user_data["username"],
                "user_id": user_data["id"],
                "organization_id": user_data["organization_id"],
                "role": user_data["role"],
                "mfa_required": True,
                "mfa_verified": False,
                "iat": now,
                "exp": now + timedelta(minutes=5),  # Short expiry for MFA challenge
                "type": "mfa_challenge"
            }
        else:
            payload = {
                "sub": user_data["username"],
                "user_id": user_data["id"],
                "organization_id": user_data["organization_id"],
                "role": user_data["role"],
                "permissions": user_data.get("permissions", []),
                "mfa_required": self.is_mfa_required(user_data.get("role")),
                "mfa_verified": mfa_verified,
                "iat": now,
                "exp": expire,
                "type": "access"
            }
        
        return jwt.encode(payload, self.private_key, algorithm=self.config.jwt_algorithm)
    
    def create_refresh_token(self, user_data: Dict[str, Any]) -> str:
        """Create JWT refresh token"""
        now = datetime.now(timezone.utc)
        expire = now + timedelta(days=self.config.refresh_token_expire_days)
        
        payload = {
            "sub": user_data["username"],
            "user_id": user_data["id"],
            "organization_id": user_data["organization_id"],
            "iat": now,
            "exp": expire,
            "type": "refresh"
        }
        
        token = jwt.encode(payload, self.private_key, algorithm=self.config.jwt_algorithm)
        
        # Store refresh token in Redis
        self.redis_client.setex(
            f"refresh_token:{user_data['id']}",
            timedelta(days=self.config.refresh_token_expire_days),
            token
        )
        
        return token
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify JWT token"""
        try:
            payload = jwt.decode(
                token,
                self.public_key,
                algorithms=[self.config.jwt_algorithm]
            )
            
            # Check if token is blacklisted
            if self.redis_client.exists(f"blacklist:{token}"):
                return None
            
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            return None
    
    def refresh_access_token(self, refresh_token: str) -> Optional[str]:
        """Refresh access token using refresh token"""
        payload = self.verify_token(refresh_token)
        
        if not payload or payload.get("type") != "refresh":
            return None
        
        # Verify refresh token exists in Redis
        stored_token = self.redis_client.get(f"refresh_token:{payload['user_id']}")
        if not stored_token or stored_token.decode() != refresh_token:
            return None
        
        # Create new access token (simplified user data)
        user_data = {
            "username": payload["sub"],
            "id": payload["user_id"],
            "organization_id": payload["organization_id"],
            "role": "soc_analyst",  # Default role for refresh
            "permissions": []
        }
        
        return self.create_access_token(user_data, mfa_verified=True)
    
    def revoke_token(self, token: str):
        """Revoke/blacklist a token"""
        payload = self.verify_token(token)
        if payload:
            # Add to blacklist until expiration
            exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
            ttl = exp - datetime.now(timezone.utc)
            
            if ttl.total_seconds() > 0:
                self.redis_client.setex(
                    f"blacklist:{token}",
                    ttl,
                    "revoked"
                )
    
    def revoke_all_user_tokens(self, user_id: str):
        """Revoke all tokens for a user"""
        # Remove refresh token
        self.redis_client.delete(f"refresh_token:{user_id}")
        
        # Note: Access tokens will expire naturally
        logger.info(f"Revoked all tokens for user {user_id}")

class EnhancedAuthManager:
    """Enhanced authentication manager with MFA"""
    
    def __init__(self, jwt_manager: EnhancedJWTManager, db_adapter):
        self.jwt_manager = jwt_manager
        self.db_adapter = db_adapter
    
    async def authenticate_user(self, username: str, password: str, mfa_token: str = None) -> Optional[Dict[str, Any]]:
        """Authenticate user with optional MFA"""
        
        # Check login attempts
        can_login, attempts = self.jwt_manager.check_login_attempts(username)
        if not can_login:
            logger.warning(f"User {username} is locked out")
            return None
        
        # Get user from database
        user = await self.db_adapter.get_user_by_username(username)
        if not user or not user.get("is_active"):
            self.jwt_manager.record_login_attempt(username, False)
            return None
        
        # Verify password
        if not self.jwt_manager.verify_password(password, user["password_hash"]):
            self.jwt_manager.record_login_attempt(username, False)
            return None
        
        # Check if MFA is required
        mfa_required = self.jwt_manager.is_mfa_required(user["role"])
        mfa_verified = False
        
        if mfa_required:
            if not user.get("mfa_enabled") or not user.get("mfa_secret"):
                # MFA setup required
                return {
                    "status": "mfa_setup_required",
                    "user": user,
                    "setup_required": True
                }
            
            if not mfa_token:
                # MFA token required
                return {
                    "status": "mfa_required",
                    "user": user,
                    "mfa_required": True
                }
            
            # Verify MFA token
            if not self.jwt_manager.verify_mfa_token(username, mfa_token, user["mfa_secret"]):
                self.jwt_manager.record_login_attempt(username, False)
                return None
            
            mfa_verified = True
        
        # Record successful login
        self.jwt_manager.record_login_attempt(username, True)
        
        # Create tokens
        access_token = self.jwt_manager.create_access_token(user, mfa_verified)
        refresh_token = self.jwt_manager.create_refresh_token(user)
        
        # Update last login
        await self.db_adapter.update_user_login(user["id"])
        
        return {
            "status": "success",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": user["id"],
                "username": user["username"],
                "email": user["email"],
                "role": user["role"],
                "organization_id": user["organization_id"],
                "mfa_enabled": user.get("mfa_enabled", False)
            }
        }
    
    async def setup_mfa(self, user_id: str) -> Dict[str, Any]:
        """Setup MFA for user"""
        user = await self.db_adapter.get_user_by_id(user_id)
        if not user:
            return {"error": "User not found"}
        
        # Generate MFA secret
        secret = self.jwt_manager.generate_mfa_secret(user["username"])
        
        # Generate QR code
        qr_code = self.jwt_manager.generate_mfa_qr_code(user["username"], secret)
        
        return {
            "secret": secret,
            "qr_code": qr_code,
            "backup_codes": self._generate_backup_codes()
        }
    
    async def verify_mfa_setup(self, user_id: str, token: str, secret: str) -> bool:
        """Verify MFA setup"""
        user = await self.db_adapter.get_user_by_id(user_id)
        if not user:
            return False
        
        if self.jwt_manager.verify_mfa_token(user["username"], token, secret):
            # Enable MFA for user
            await self.db_adapter.update_user_mfa(user_id, secret, True)
            return True
        
        return False
    
    def _generate_backup_codes(self) -> List[str]:
        """Generate backup codes for MFA"""
        return [secrets.token_hex(4).upper() for _ in range(10)]

# Global instances
jwt_manager: Optional[EnhancedJWTManager] = None
auth_manager: Optional[EnhancedAuthManager] = None

def get_jwt_manager() -> EnhancedJWTManager:
    """Get global JWT manager"""
    global jwt_manager
    if jwt_manager is None:
        config = AuthConfig(
            jwt_secret=os.getenv("JWT_SECRET", "development-secret"),
            mfa_required_roles=[
                UserRole.PLATFORM_OWNER.value,
                UserRole.SECURITY_ADMIN.value
            ]
        )
        jwt_manager = EnhancedJWTManager(config)
    return jwt_manager

def get_auth_manager(db_adapter) -> EnhancedAuthManager:
    """Get global auth manager"""
    global auth_manager
    if auth_manager is None:
        auth_manager = EnhancedAuthManager(get_jwt_manager(), db_adapter)
    return auth_manager 