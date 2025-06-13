✅ **Integrated in Phase 3** – See [phase guide](../integration/phase-3-advanced-tooling.md)

# Authlib - Enhanced OAuth & JWT

Authlib is a comprehensive Python library for building OAuth and OpenID Connect servers and clients. It provides advanced authentication and authorization capabilities beyond basic JWT handling.

## 🎯 Purpose for SecureNet

- **Advanced OAuth 2.0** - Full OAuth 2.0 server and client implementation
- **OpenID Connect** - Modern identity layer on top of OAuth 2.0
- **JWT Enhancement** - Advanced JWT features with proper validation
- **Multi-tenant Auth** - Sophisticated multi-tenant authentication
- **SSO Integration** - Single Sign-On with external providers
- **API Security** - Enhanced API authentication and authorization

## 📦 Installation

```bash
pip install authlib
pip install cryptography  # For JWT encryption
```

## 🔧 Integration

### Enhanced JWT Management

**File**: `auth/jwt_enhanced.py`

```python
from authlib.jose import JsonWebSignature, JsonWebToken, JWTClaims
from authlib.jose.errors import JoseError
from authlib.common.security import generate_token
import time
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import structlog
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import os
import base64

logger = structlog.get_logger()

class EnhancedJWTManager:
    """Enhanced JWT management with Authlib for SecureNet"""
    
    def __init__(self, 
                 secret_key: str,
                 algorithm: str = "HS256",
                 issuer: str = "securenet",
                 audience: str = "securenet-api"):
        
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.issuer = issuer
        self.audience = audience
        
        # Initialize JWT handler
        self.jwt = JsonWebToken([algorithm])
        
        # Token blacklist (in production, use Redis or database)
        self.blacklisted_tokens = set()
        
        logger.info("Enhanced JWT manager initialized", algorithm=algorithm)
    
    def create_access_token(self, 
                          user_id: str,
                          tenant_id: str,
                          roles: List[str],
                          permissions: List[str],
                          expires_delta: Optional[timedelta] = None) -> str:
        """
        Create enhanced access token with detailed claims
        
        Args:
            user_id: User identifier
            tenant_id: Tenant identifier
            roles: User roles
            permissions: User permissions
            expires_delta: Token expiration time
            
        Returns:
            JWT access token
        """
        
        if expires_delta is None:
            expires_delta = timedelta(hours=1)
        
        now = datetime.utcnow()
        exp = now + expires_delta
        
        # Enhanced claims
        payload = {
            # Standard claims
            "iss": self.issuer,
            "aud": self.audience,
            "sub": user_id,
            "iat": int(now.timestamp()),
            "exp": int(exp.timestamp()),
            "nbf": int(now.timestamp()),
            "jti": generate_token(32),  # Unique token ID
            
            # Custom SecureNet claims
            "tenant_id": tenant_id,
            "roles": roles,
            "permissions": permissions,
            "token_type": "access",
            "scope": "api:read api:write",
            
            # Security claims
            "auth_time": int(now.timestamp()),
            "session_id": generate_token(16)
        }
        
        # Create token
        header = {"alg": self.algorithm, "typ": "JWT"}
        token = self.jwt.encode(header, payload, self.secret_key)
        
        logger.debug(
            "Access token created",
            user_id=user_id,
            tenant_id=tenant_id,
            expires_at=exp.isoformat(),
            jti=payload["jti"]
        )
        
        return token.decode('utf-8')
    
    def create_refresh_token(self, 
                           user_id: str,
                           tenant_id: str,
                           access_token_jti: str,
                           expires_delta: Optional[timedelta] = None) -> str:
        """Create refresh token linked to access token"""
        
        if expires_delta is None:
            expires_delta = timedelta(days=30)
        
        now = datetime.utcnow()
        exp = now + expires_delta
        
        payload = {
            "iss": self.issuer,
            "aud": self.audience,
            "sub": user_id,
            "iat": int(now.timestamp()),
            "exp": int(exp.timestamp()),
            "jti": generate_token(32),
            
            # Refresh token specific claims
            "tenant_id": tenant_id,
            "token_type": "refresh",
            "access_token_jti": access_token_jti,
            "scope": "refresh"
        }
        
        header = {"alg": self.algorithm, "typ": "JWT"}
        token = self.jwt.encode(header, payload, self.secret_key)
        
        return token.decode('utf-8')
    
    def verify_token(self, token: str, token_type: str = "access") -> Dict[str, Any]:
        """
        Verify and decode JWT token with comprehensive validation
        
        Args:
            token: JWT token string
            token_type: Expected token type (access/refresh)
            
        Returns:
            Decoded token claims
            
        Raises:
            JoseError: If token is invalid
        """
        
        try:
            # Check if token is blacklisted
            if token in self.blacklisted_tokens:
                raise JoseError("Token has been revoked")
            
            # Decode and verify token
            claims = self.jwt.decode(token, self.secret_key)
            
            # Validate claims
            claims.validate()
            
            # Additional validations
            self._validate_custom_claims(claims, token_type)
            
            logger.debug(
                "Token verified successfully",
                user_id=claims.get("sub"),
                tenant_id=claims.get("tenant_id"),
                token_type=claims.get("token_type"),
                jti=claims.get("jti")
            )
            
            return dict(claims)
            
        except JoseError as e:
            logger.warning("Token verification failed", error=str(e))
            raise
    
    def _validate_custom_claims(self, claims: JWTClaims, expected_type: str):
        """Validate custom SecureNet claims"""
        
        # Check token type
        if claims.get("token_type") != expected_type:
            raise JoseError(f"Invalid token type. Expected {expected_type}")
        
        # Check issuer and audience
        if claims.get("iss") != self.issuer:
            raise JoseError("Invalid issuer")
        
        if claims.get("aud") != self.audience:
            raise JoseError("Invalid audience")
        
        # Check required custom claims
        required_claims = ["tenant_id", "jti"]
        for claim in required_claims:
            if not claims.get(claim):
                raise JoseError(f"Missing required claim: {claim}")
    
    def revoke_token(self, token: str):
        """Revoke a token by adding it to blacklist"""
        
        try:
            claims = self.jwt.decode(token, self.secret_key)
            jti = claims.get("jti")
            
            if jti:
                self.blacklisted_tokens.add(token)
                logger.info("Token revoked", jti=jti)
            
        except JoseError:
            # Token is already invalid, no need to blacklist
            pass
    
    def refresh_access_token(self, refresh_token: str) -> Dict[str, str]:
        """Create new access token using refresh token"""
        
        # Verify refresh token
        refresh_claims = self.verify_token(refresh_token, "refresh")
        
        # Extract user information
        user_id = refresh_claims["sub"]
        tenant_id = refresh_claims["tenant_id"]
        
        # Get user roles and permissions (would typically query database)
        roles, permissions = self._get_user_roles_permissions(user_id, tenant_id)
        
        # Create new access token
        access_token = self.create_access_token(
            user_id=user_id,
            tenant_id=tenant_id,
            roles=roles,
            permissions=permissions
        )
        
        # Optionally create new refresh token
        access_claims = self.verify_token(access_token, "access")
        new_refresh_token = self.create_refresh_token(
            user_id=user_id,
            tenant_id=tenant_id,
            access_token_jti=access_claims["jti"]
        )
        
        # Revoke old refresh token
        self.revoke_token(refresh_token)
        
        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "Bearer"
        }
    
    def _get_user_roles_permissions(self, user_id: str, tenant_id: str) -> tuple:
        """Get user roles and permissions (mock implementation)"""
        # In production, this would query the database
        return ["analyst"], ["read:threats", "write:scans"]
    
    def create_api_key_token(self, 
                           api_key_id: str,
                           tenant_id: str,
                           scopes: List[str],
                           expires_delta: Optional[timedelta] = None) -> str:
        """Create long-lived API key token"""
        
        if expires_delta is None:
            expires_delta = timedelta(days=365)  # 1 year
        
        now = datetime.utcnow()
        exp = now + expires_delta
        
        payload = {
            "iss": self.issuer,
            "aud": self.audience,
            "sub": f"api_key:{api_key_id}",
            "iat": int(now.timestamp()),
            "exp": int(exp.timestamp()),
            "jti": generate_token(32),
            
            "tenant_id": tenant_id,
            "token_type": "api_key",
            "scopes": scopes,
            "api_key_id": api_key_id
        }
        
        header = {"alg": self.algorithm, "typ": "JWT"}
        token = self.jwt.encode(header, payload, self.secret_key)
        
        return token.decode('utf-8')

class OAuthServer:
    """OAuth 2.0 server implementation for SecureNet"""
    
    def __init__(self, jwt_manager: EnhancedJWTManager):
        self.jwt_manager = jwt_manager
        self.authorization_codes = {}  # In production, use database
        self.clients = {}  # Registered OAuth clients
        
    def register_client(self, 
                       client_id: str,
                       client_secret: str,
                       redirect_uris: List[str],
                       scopes: List[str],
                       grant_types: List[str] = None) -> Dict[str, Any]:
        """Register OAuth client"""
        
        if grant_types is None:
            grant_types = ["authorization_code", "refresh_token"]
        
        client_info = {
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uris": redirect_uris,
            "scopes": scopes,
            "grant_types": grant_types,
            "created_at": datetime.utcnow().isoformat()
        }
        
        self.clients[client_id] = client_info
        
        logger.info(
            "OAuth client registered",
            client_id=client_id,
            scopes=scopes,
            grant_types=grant_types
        )
        
        return client_info
    
    def create_authorization_code(self, 
                                client_id: str,
                                user_id: str,
                                tenant_id: str,
                                redirect_uri: str,
                                scopes: List[str],
                                state: Optional[str] = None) -> str:
        """Create authorization code for OAuth flow"""
        
        # Validate client
        if client_id not in self.clients:
            raise ValueError("Invalid client_id")
        
        client = self.clients[client_id]
        
        # Validate redirect URI
        if redirect_uri not in client["redirect_uris"]:
            raise ValueError("Invalid redirect_uri")
        
        # Create authorization code
        code = generate_token(32)
        
        self.authorization_codes[code] = {
            "client_id": client_id,
            "user_id": user_id,
            "tenant_id": tenant_id,
            "redirect_uri": redirect_uri,
            "scopes": scopes,
            "state": state,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(minutes=10)
        }
        
        logger.info(
            "Authorization code created",
            client_id=client_id,
            user_id=user_id,
            scopes=scopes
        )
        
        return code
    
    def exchange_code_for_tokens(self, 
                               code: str,
                               client_id: str,
                               client_secret: str,
                               redirect_uri: str) -> Dict[str, str]:
        """Exchange authorization code for access and refresh tokens"""
        
        # Validate authorization code
        if code not in self.authorization_codes:
            raise ValueError("Invalid authorization code")
        
        code_data = self.authorization_codes[code]
        
        # Check expiration
        if datetime.utcnow() > code_data["expires_at"]:
            del self.authorization_codes[code]
            raise ValueError("Authorization code expired")
        
        # Validate client
        if (code_data["client_id"] != client_id or 
            self.clients[client_id]["client_secret"] != client_secret):
            raise ValueError("Invalid client credentials")
        
        # Validate redirect URI
        if code_data["redirect_uri"] != redirect_uri:
            raise ValueError("Invalid redirect_uri")
        
        # Create tokens
        user_id = code_data["user_id"]
        tenant_id = code_data["tenant_id"]
        scopes = code_data["scopes"]
        
        # Convert scopes to roles and permissions
        roles = ["user"]  # Default role
        permissions = [f"scope:{scope}" for scope in scopes]
        
        access_token = self.jwt_manager.create_access_token(
            user_id=user_id,
            tenant_id=tenant_id,
            roles=roles,
            permissions=permissions
        )
        
        # Get access token claims for refresh token
        access_claims = self.jwt_manager.verify_token(access_token, "access")
        
        refresh_token = self.jwt_manager.create_refresh_token(
            user_id=user_id,
            tenant_id=tenant_id,
            access_token_jti=access_claims["jti"]
        )
        
        # Clean up authorization code
        del self.authorization_codes[code]
        
        logger.info(
            "Tokens issued via OAuth",
            client_id=client_id,
            user_id=user_id,
            scopes=scopes
        )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "Bearer",
            "expires_in": 3600,  # 1 hour
            "scope": " ".join(scopes)
        }

class MultiTenantAuthManager:
    """Multi-tenant authentication manager"""
    
    def __init__(self, jwt_manager: EnhancedJWTManager):
        self.jwt_manager = jwt_manager
        self.tenant_configs = {}  # Tenant-specific auth configurations
        
    def configure_tenant_auth(self, 
                            tenant_id: str,
                            auth_config: Dict[str, Any]):
        """Configure authentication settings for a tenant"""
        
        default_config = {
            "password_policy": {
                "min_length": 8,
                "require_uppercase": True,
                "require_lowercase": True,
                "require_numbers": True,
                "require_symbols": True
            },
            "session_timeout": 3600,  # 1 hour
            "max_failed_attempts": 5,
            "lockout_duration": 900,  # 15 minutes
            "mfa_required": False,
            "allowed_domains": [],
            "sso_enabled": False
        }
        
        # Merge with provided config
        tenant_config = {**default_config, **auth_config}
        self.tenant_configs[tenant_id] = tenant_config
        
        logger.info(
            "Tenant auth configuration updated",
            tenant_id=tenant_id,
            mfa_required=tenant_config["mfa_required"],
            sso_enabled=tenant_config["sso_enabled"]
        )
    
    def authenticate_user(self, 
                         username: str,
                         password: str,
                         tenant_id: str,
                         mfa_token: Optional[str] = None) -> Dict[str, Any]:
        """Authenticate user with tenant-specific policies"""
        
        # Get tenant configuration
        tenant_config = self.tenant_configs.get(tenant_id, {})
        
        # Validate user credentials (mock implementation)
        user_data = self._validate_credentials(username, password, tenant_id)
        
        if not user_data:
            raise ValueError("Invalid credentials")
        
        # Check MFA if required
        if tenant_config.get("mfa_required", False):
            if not mfa_token or not self._validate_mfa(user_data["user_id"], mfa_token):
                raise ValueError("MFA token required or invalid")
        
        # Create tokens
        access_token = self.jwt_manager.create_access_token(
            user_id=user_data["user_id"],
            tenant_id=tenant_id,
            roles=user_data["roles"],
            permissions=user_data["permissions"]
        )
        
        access_claims = self.jwt_manager.verify_token(access_token, "access")
        
        refresh_token = self.jwt_manager.create_refresh_token(
            user_id=user_data["user_id"],
            tenant_id=tenant_id,
            access_token_jti=access_claims["jti"]
        )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "Bearer",
            "expires_in": 3600,
            "user": user_data
        }
    
    def _validate_credentials(self, username: str, password: str, tenant_id: str) -> Optional[Dict[str, Any]]:
        """Validate user credentials (mock implementation)"""
        # In production, this would query the database
        mock_users = {
            "admin": {
                "user_id": "admin_123",
                "username": "admin",
                "roles": ["superadmin"],
                "permissions": ["*"]
            },
            "analyst": {
                "user_id": "analyst_456",
                "username": "analyst",
                "roles": ["analyst"],
                "permissions": ["read:threats", "write:scans"]
            }
        }
        
        return mock_users.get(username)
    
    def _validate_mfa(self, user_id: str, mfa_token: str) -> bool:
        """Validate MFA token (mock implementation)"""
        # In production, this would validate TOTP or other MFA methods
        return len(mfa_token) == 6 and mfa_token.isdigit()
```

### FastAPI Integration

**File**: `auth/fastapi_authlib.py`

```python
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from auth.jwt_enhanced import EnhancedJWTManager, OAuthServer, MultiTenantAuthManager
from authlib.jose.errors import JoseError
from typing import Dict, Any, Optional, List
import structlog

logger = structlog.get_logger()

# Initialize security
security = HTTPBearer()

# Global instances (in production, use dependency injection)
jwt_manager = EnhancedJWTManager(
    secret_key="your-secret-key",  # Use environment variable
    issuer="securenet",
    audience="securenet-api"
)

oauth_server = OAuthServer(jwt_manager)
auth_manager = MultiTenantAuthManager(jwt_manager)

class AuthDependency:
    """Authentication dependency for FastAPI"""
    
    def __init__(self, required_permissions: List[str] = None):
        self.required_permissions = required_permissions or []
    
    def __call__(self, credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
        """Verify JWT token and check permissions"""
        
        try:
            # Extract token
            token = credentials.credentials
            
            # Verify token
            claims = jwt_manager.verify_token(token, "access")
            
            # Check permissions if required
            if self.required_permissions:
                user_permissions = claims.get("permissions", [])
                
                for required_perm in self.required_permissions:
                    if required_perm not in user_permissions and "*" not in user_permissions:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail=f"Missing required permission: {required_perm}"
                        )
            
            return claims
            
        except JoseError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"}
            )

class TenantDependency:
    """Tenant isolation dependency"""
    
    def __call__(self, 
                 request: Request,
                 current_user: Dict[str, Any] = Depends(AuthDependency())) -> str:
        """Extract and validate tenant ID"""
        
        # Try to get tenant ID from header first
        tenant_id = request.headers.get("X-Tenant-ID")
        
        # Fall back to token claim
        if not tenant_id:
            tenant_id = current_user.get("tenant_id")
        
        if not tenant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tenant ID required"
            )
        
        # Verify user has access to this tenant
        user_tenant = current_user.get("tenant_id")
        if user_tenant != tenant_id and "superadmin" not in current_user.get("roles", []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this tenant"
            )
        
        return tenant_id

# Dependency instances
require_auth = AuthDependency()
require_admin = AuthDependency(["admin:*"])
require_analyst = AuthDependency(["read:threats"])
require_tenant = TenantDependency()

def setup_auth_routes(app: FastAPI):
    """Setup authentication routes"""
    
    @app.post("/api/auth/login")
    async def login(credentials: Dict[str, Any]):
        """User login endpoint"""
        
        try:
            username = credentials.get("username")
            password = credentials.get("password")
            tenant_id = credentials.get("tenant_id", "default")
            mfa_token = credentials.get("mfa_token")
            
            if not username or not password:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username and password required"
                )
            
            # Authenticate user
            auth_result = auth_manager.authenticate_user(
                username=username,
                password=password,
                tenant_id=tenant_id,
                mfa_token=mfa_token
            )
            
            return auth_result
            
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=str(e)
            )
    
    @app.post("/api/auth/refresh")
    async def refresh_token(refresh_data: Dict[str, str]):
        """Refresh access token"""
        
        try:
            refresh_token = refresh_data.get("refresh_token")
            
            if not refresh_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Refresh token required"
                )
            
            # Refresh tokens
            tokens = jwt_manager.refresh_access_token(refresh_token)
            
            return tokens
            
        except JoseError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid refresh token: {str(e)}"
            )
    
    @app.post("/api/auth/logout")
    async def logout(
        token_data: Dict[str, str],
        current_user: Dict[str, Any] = Depends(require_auth)
    ):
        """Logout and revoke tokens"""
        
        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")
        
        # Revoke tokens
        if access_token:
            jwt_manager.revoke_token(access_token)
        if refresh_token:
            jwt_manager.revoke_token(refresh_token)
        
        return {"message": "Logged out successfully"}
    
    @app.get("/api/auth/me")
    async def get_current_user(current_user: Dict[str, Any] = Depends(require_auth)):
        """Get current user information"""
        
        return {
            "user_id": current_user.get("sub"),
            "tenant_id": current_user.get("tenant_id"),
            "roles": current_user.get("roles", []),
            "permissions": current_user.get("permissions", []),
            "session_id": current_user.get("session_id")
        }
    
    # OAuth 2.0 endpoints
    @app.get("/api/oauth/authorize")
    async def oauth_authorize(
        client_id: str,
        redirect_uri: str,
        response_type: str = "code",
        scope: str = "read",
        state: Optional[str] = None,
        current_user: Dict[str, Any] = Depends(require_auth)
    ):
        """OAuth authorization endpoint"""
        
        if response_type != "code":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only authorization code flow supported"
            )
        
        try:
            # Create authorization code
            scopes = scope.split(" ")
            
            code = oauth_server.create_authorization_code(
                client_id=client_id,
                user_id=current_user["sub"],
                tenant_id=current_user["tenant_id"],
                redirect_uri=redirect_uri,
                scopes=scopes,
                state=state
            )
            
            # In a real implementation, this would redirect to the client
            return {
                "authorization_code": code,
                "state": state,
                "redirect_uri": redirect_uri
            }
            
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    
    @app.post("/api/oauth/token")
    async def oauth_token(token_request: Dict[str, str]):
        """OAuth token endpoint"""
        
        grant_type = token_request.get("grant_type")
        
        if grant_type == "authorization_code":
            try:
                tokens = oauth_server.exchange_code_for_tokens(
                    code=token_request.get("code"),
                    client_id=token_request.get("client_id"),
                    client_secret=token_request.get("client_secret"),
                    redirect_uri=token_request.get("redirect_uri")
                )
                
                return tokens
                
            except ValueError as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(e)
                )
        
        elif grant_type == "refresh_token":
            try:
                refresh_token = token_request.get("refresh_token")
                tokens = jwt_manager.refresh_access_token(refresh_token)
                
                return tokens
                
            except JoseError as e:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=str(e)
                )
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported grant type"
            )

def setup_auth_middleware(app: FastAPI):
    """Setup authentication middleware"""
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure appropriately for production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    @app.middleware("http")
    async def auth_middleware(request: Request, call_next):
        """Authentication middleware for logging and monitoring"""
        
        # Log authentication attempts
        if request.url.path.startswith("/api/auth/"):
            logger.info(
                "Auth request",
                path=request.url.path,
                method=request.method,
                client_ip=request.client.host
            )
        
        response = await call_next(request)
        
        # Log authentication results
        if request.url.path.startswith("/api/auth/") and response.status_code >= 400:
            logger.warning(
                "Auth failed",
                path=request.url.path,
                status_code=response.status_code,
                client_ip=request.client.host
            )
        
        return response

# Example usage in routes
def create_protected_routes(app: FastAPI):
    """Example protected routes using Authlib"""
    
    @app.get("/api/threats")
    async def get_threats(
        tenant_id: str = Depends(require_tenant),
        current_user: Dict[str, Any] = Depends(require_analyst)
    ):
        """Get threats for tenant - requires analyst permissions"""
        
        return {
            "threats": [],
            "tenant_id": tenant_id,
            "requested_by": current_user["sub"]
        }
    
    @app.post("/api/admin/users")
    async def create_user(
        user_data: Dict[str, Any],
        current_user: Dict[str, Any] = Depends(require_admin)
    ):
        """Create user - requires admin permissions"""
        
        return {
            "message": "User created",
            "created_by": current_user["sub"]
        }
    
    @app.get("/api/profile")
    async def get_profile(current_user: Dict[str, Any] = Depends(require_auth)):
        """Get user profile - requires authentication only"""
        
        return {
            "user_id": current_user["sub"],
            "tenant_id": current_user["tenant_id"],
            "roles": current_user["roles"]
        }
```

## 🚀 Usage Examples

### Basic JWT Enhancement

```python
from auth.jwt_enhanced import EnhancedJWTManager

# Initialize JWT manager
jwt_manager = EnhancedJWTManager(
    secret_key="your-secret-key",
    algorithm="HS256",
    issuer="securenet"
)

# Create enhanced access token
access_token = jwt_manager.create_access_token(
    user_id="user_123",
    tenant_id="tenant_456",
    roles=["analyst"],
    permissions=["read:threats", "write:scans"]
)

# Verify token
claims = jwt_manager.verify_token(access_token, "access")
print(f"User: {claims['sub']}, Tenant: {claims['tenant_id']}")
```

### OAuth 2.0 Server Setup

```python
from auth.jwt_enhanced import OAuthServer

# Setup OAuth server
oauth_server = OAuthServer(jwt_manager)

# Register OAuth client
client_info = oauth_server.register_client(
    client_id="securenet_mobile",
    client_secret="client_secret",
    redirect_uris=["https://app.securenet.com/callback"],
    scopes=["read", "write"],
    grant_types=["authorization_code", "refresh_token"]
)

# Create authorization code
auth_code = oauth_server.create_authorization_code(
    client_id="securenet_mobile",
    user_id="user_123",
    tenant_id="tenant_456",
    redirect_uri="https://app.securenet.com/callback",
    scopes=["read", "write"]
)

# Exchange code for tokens
tokens = oauth_server.exchange_code_for_tokens(
    code=auth_code,
    client_id="securenet_mobile",
    client_secret="client_secret",
    redirect_uri="https://app.securenet.com/callback"
)
```

### FastAPI Integration

```python
from fastapi import FastAPI, Depends
from auth.fastapi_authlib import require_auth, require_admin, setup_auth_routes

app = FastAPI()

# Setup authentication
setup_auth_routes(app)

# Protected route
@app.get("/api/secure-data")
async def get_secure_data(current_user = Depends(require_auth)):
    return {"data": "sensitive information", "user": current_user["sub"]}

# Admin-only route
@app.get("/api/admin/stats")
async def get_admin_stats(current_user = Depends(require_admin)):
    return {"stats": "admin data"}
```

## ✅ Validation Steps

1. **Install Authlib**:
   ```bash
   pip install authlib cryptography
   ```

2. **Test JWT Enhancement**:
   ```python
   from auth.jwt_enhanced import EnhancedJWTManager
   
   jwt_manager = EnhancedJWTManager("test-secret")
   token = jwt_manager.create_access_token("user1", "tenant1", ["user"], ["read"])
   claims = jwt_manager.verify_token(token)
   print(claims)
   ```

3. **Test OAuth Flow**:
   ```python
   from auth.jwt_enhanced import OAuthServer
   
   oauth = OAuthServer(jwt_manager)
   oauth.register_client("test_client", "secret", ["http://localhost"], ["read"])
   ```

4. **Test FastAPI Integration**:
   ```bash
   uvicorn main:app --reload
   # Test endpoints with Postman or curl
   ```

## 📈 Benefits for SecureNet

- **Enhanced Security** - Advanced JWT features with proper validation
- **OAuth 2.0 Support** - Standard OAuth flows for third-party integrations
- **Multi-tenant Auth** - Sophisticated tenant isolation and configuration
- **SSO Ready** - Foundation for Single Sign-On implementations
- **API Security** - Comprehensive API authentication and authorization
- **Compliance** - Standards-compliant authentication implementation

## 🔗 Related Documentation

- [Phase 3: Advanced Tooling](../integration/phase-3-advanced-tooling.md)
- [Authentication Overview](README.md)
- [PyNaCl Integration](pynacl.md) 