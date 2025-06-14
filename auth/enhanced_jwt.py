"""
SecureNet Enhanced JWT Authentication
Phase 3: Advanced Tooling - Authlib Integration
"""

from authlib.jose import JsonWebSignature, JsonWebToken, JWTClaims
from authlib.jose.errors import JoseError
from authlib.integrations.fastapi_oauth2 import AuthorizationServer
from authlib.oauth2.rfc6749 import grants
import os
import time
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import secrets
from utils.logging_config import get_logger
from monitoring.prometheus_metrics import metrics

logger = get_logger(__name__)

class EnhancedJWTManager:
    """Enhanced JWT management with advanced security features"""
    
    def __init__(self, secret_key: str = None, algorithm: str = "HS256"):
        self.secret_key = secret_key or os.getenv("JWT_SECRET", "dev-secret-key")
        self.algorithm = algorithm
        self.jws = JsonWebSignature()
        self.jwt = JsonWebToken()
        
        # Token expiration settings
        self.access_token_expire = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
        self.refresh_token_expire = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
        
        # Security settings
        self.max_failed_attempts = int(os.getenv("MAX_FAILED_ATTEMPTS", "5"))
        self.lockout_duration = int(os.getenv("LOCKOUT_DURATION_MINUTES", "15"))
        
        # Token blacklist (in production, use Redis)
        self.blacklisted_tokens = set()
        self.failed_attempts = {}
        
        logger.info("Enhanced JWT manager initialized")
    
    def create_access_token(self, 
                          user_id: str, 
                          tenant_id: str, 
                          role: str, 
                          permissions: List[str] = None,
                          additional_claims: Dict[str, Any] = None) -> str:
        """Create an access token with enhanced claims"""
        
        now = datetime.utcnow()
        expire = now + timedelta(minutes=self.access_token_expire)
        
        payload = {
            "sub": user_id,
            "tenant_id": tenant_id,
            "role": role,
            "permissions": permissions or [],
            "token_type": "access",
            "iat": int(now.timestamp()),
            "exp": int(expire.timestamp()),
            "jti": secrets.token_urlsafe(16),  # JWT ID for blacklisting
            "iss": "SecureNet",
            "aud": "securenet-api"
        }
        
        if additional_claims:
            payload.update(additional_claims)
        
        token = self.jwt.encode({"alg": self.algorithm}, payload, self.secret_key)
        
        # Record token creation
        metrics.record_auth_attempt(tenant_id, "token_created", "jwt")
        
        logger.info(
            "Access token created",
            user_id=user_id,
            tenant_id=tenant_id,
            role=role,
            expires_at=expire.isoformat()
        )
        
        return token.decode('utf-8')
    
    def create_refresh_token(self, user_id: str, tenant_id: str) -> str:
        """Create a refresh token"""
        
        now = datetime.utcnow()
        expire = now + timedelta(days=self.refresh_token_expire)
        
        payload = {
            "sub": user_id,
            "tenant_id": tenant_id,
            "token_type": "refresh",
            "iat": int(now.timestamp()),
            "exp": int(expire.timestamp()),
            "jti": secrets.token_urlsafe(16),
            "iss": "SecureNet",
            "aud": "securenet-api"
        }
        
        token = self.jwt.encode({"alg": self.algorithm}, payload, self.secret_key)
        
        logger.info(
            "Refresh token created",
            user_id=user_id,
            tenant_id=tenant_id,
            expires_at=expire.isoformat()
        )
        
        return token.decode('utf-8')
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify and decode a JWT token"""
        
        try:
            # Check if token is blacklisted
            if token in self.blacklisted_tokens:
                logger.warning("Attempted use of blacklisted token")
                return None
            
            # Decode and verify token
            claims = self.jwt.decode(token, self.secret_key)
            claims.validate()
            
            # Additional security checks
            if not self._validate_token_claims(claims):
                return None
            
            return dict(claims)
            
        except JoseError as e:
            logger.warning(
                "Token verification failed",
                error=str(e),
                token_prefix=token[:20] + "..." if len(token) > 20 else token
            )
            return None
    
    def _validate_token_claims(self, claims: JWTClaims) -> bool:
        """Validate token claims for security"""
        
        # Check required claims
        required_claims = ["sub", "tenant_id", "token_type", "iat", "exp", "jti"]
        for claim in required_claims:
            if claim not in claims:
                logger.warning(f"Missing required claim: {claim}")
                return False
        
        # Check token type
        if claims.get("token_type") not in ["access", "refresh"]:
            logger.warning(f"Invalid token type: {claims.get('token_type')}")
            return False
        
        # Check issuer and audience
        if claims.get("iss") != "SecureNet":
            logger.warning(f"Invalid issuer: {claims.get('iss')}")
            return False
        
        if claims.get("aud") != "securenet-api":
            logger.warning(f"Invalid audience: {claims.get('aud')}")
            return False
        
        return True
    
    def refresh_access_token(self, refresh_token: str) -> Optional[str]:
        """Create new access token from refresh token"""
        
        claims = self.verify_token(refresh_token)
        if not claims or claims.get("token_type") != "refresh":
            logger.warning("Invalid refresh token provided")
            return None
        
        # Blacklist the old refresh token
        self.blacklist_token(refresh_token)
        
        # Create new access token (would need to fetch user data)
        # This is a simplified version - in production, fetch from database
        return self.create_access_token(
            user_id=claims["sub"],
            tenant_id=claims["tenant_id"],
            role="user",  # Would fetch from database
            permissions=[]  # Would fetch from database
        )
    
    def blacklist_token(self, token: str):
        """Add token to blacklist"""
        self.blacklisted_tokens.add(token)
        logger.info("Token blacklisted")
    
    def record_failed_attempt(self, identifier: str) -> bool:
        """Record failed authentication attempt and check for lockout"""
        
        now = time.time()
        
        if identifier not in self.failed_attempts:
            self.failed_attempts[identifier] = []
        
        # Clean old attempts
        self.failed_attempts[identifier] = [
            attempt for attempt in self.failed_attempts[identifier]
            if now - attempt < (self.lockout_duration * 60)
        ]
        
        # Add new attempt
        self.failed_attempts[identifier].append(now)
        
        # Check if locked out
        if len(self.failed_attempts[identifier]) >= self.max_failed_attempts:
            logger.warning(
                "Account locked due to failed attempts",
                identifier=identifier,
                attempts=len(self.failed_attempts[identifier])
            )
            return True
        
        return False
    
    def is_locked_out(self, identifier: str) -> bool:
        """Check if identifier is locked out"""
        
        if identifier not in self.failed_attempts:
            return False
        
        now = time.time()
        recent_attempts = [
            attempt for attempt in self.failed_attempts[identifier]
            if now - attempt < (self.lockout_duration * 60)
        ]
        
        return len(recent_attempts) >= self.max_failed_attempts
    
    def clear_failed_attempts(self, identifier: str):
        """Clear failed attempts for identifier"""
        if identifier in self.failed_attempts:
            del self.failed_attempts[identifier]

class MultiTenantAuthManager:
    """Multi-tenant authentication manager"""
    
    def __init__(self, jwt_manager: EnhancedJWTManager):
        self.jwt_manager = jwt_manager
        self.logger = get_logger("multi_tenant_auth")
    
    def authenticate_tenant_user(self, 
                                username: str, 
                                password: str, 
                                tenant_id: str) -> Optional[Dict[str, Any]]:
        """Authenticate user within specific tenant context"""
        
        # Check for lockout
        lockout_key = f"{tenant_id}:{username}"
        if self.jwt_manager.is_locked_out(lockout_key):
            self.logger.warning(
                "Authentication blocked - account locked",
                username=username,
                tenant_id=tenant_id
            )
            return None
        
        # Authenticate user (simplified - would use database)
        user_data = self._verify_credentials(username, password, tenant_id)
        
        if not user_data:
            # Record failed attempt
            is_locked = self.jwt_manager.record_failed_attempt(lockout_key)
            metrics.record_auth_attempt(tenant_id, "failure", "password")
            
            self.logger.warning(
                "Authentication failed",
                username=username,
                tenant_id=tenant_id,
                locked_out=is_locked
            )
            return None
        
        # Clear failed attempts on success
        self.jwt_manager.clear_failed_attempts(lockout_key)
        
        # Create tokens
        access_token = self.jwt_manager.create_access_token(
            user_id=user_data["id"],
            tenant_id=tenant_id,
            role=user_data["role"],
            permissions=user_data.get("permissions", [])
        )
        
        refresh_token = self.jwt_manager.create_refresh_token(
            user_id=user_data["id"],
            tenant_id=tenant_id
        )
        
        metrics.record_auth_attempt(tenant_id, "success", "password")
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": self.jwt_manager.access_token_expire * 60,
            "user": user_data
        }
    
    def _verify_credentials(self, username: str, password: str, tenant_id: str) -> Optional[Dict[str, Any]]:
        """Verify user credentials (simplified implementation)"""
        
        # This would typically query the database
        # For demo purposes, using hardcoded values
        test_users = {
            "ceo": {"id": "1", "role": "platform_owner", "password": "superadmin123"},
            "admin": {"id": "2", "role": "security_admin", "password": "platform123"},
            "user": {"id": "3", "role": "soc_analyst", "password": "enduser123"}
        }
        
        if username in test_users:
            user = test_users[username]
            if user["password"] == password:
                return {
                    "id": user["id"],
                    "username": username,
                    "role": user["role"],
                    "tenant_id": tenant_id,
                    "permissions": self._get_role_permissions(user["role"])
                }
        
        return None
    
    def _get_role_permissions(self, role: str) -> List[str]:
        """Get permissions for role"""
        
        role_permissions = {
            "platform_owner": [
                "admin:read", "admin:write", "admin:delete",
                "tenant:read", "tenant:write", "tenant:delete",
                "user:read", "user:write", "user:delete",
                "scan:read", "scan:write", "scan:execute",
                "alert:read", "alert:write", "alert:delete"
            ],
            "security_admin": [
                "tenant:read", "tenant:write",
                "user:read", "user:write",
                "scan:read", "scan:write", "scan:execute",
                "alert:read", "alert:write"
            ],
            "soc_analyst": [
                "scan:read", "scan:execute",
                "alert:read"
            ],
            # Legacy role mappings for backward compatibility
            "superadmin": [
                "admin:read", "admin:write", "admin:delete",
                "tenant:read", "tenant:write", "tenant:delete",
                "user:read", "user:write", "user:delete",
                "scan:read", "scan:write", "scan:execute",
                "alert:read", "alert:write", "alert:delete"
            ],
            "manager": [
                "tenant:read", "tenant:write",
                "user:read", "user:write",
                "scan:read", "scan:write", "scan:execute",
                "alert:read", "alert:write"
            ],
            "analyst": [
                "scan:read", "scan:execute",
                "alert:read"
            ]
        }
        
        return role_permissions.get(role, [])

# Global instances
jwt_manager = EnhancedJWTManager()
auth_manager = MultiTenantAuthManager(jwt_manager) 