"""
security.py

Purpose:
- Centralize security-related configurations and utilities
- Provide security middleware and authentication helpers
- Handle API key management and validation
"""

import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader
from jose import JWTError, jwt
from passlib.context import CryptContext
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Security constants
SECRET_KEY = os.getenv("SECRET_KEY", os.urandom(32).hex())
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
API_KEY_NAME = "X-API-Key"
API_KEY = os.getenv("API_KEY", os.urandom(32).hex())

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# API key header
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=True)

def verify_api_key(api_key: str = Security(api_key_header)) -> str:
    """Verify API key from header."""
    if api_key != API_KEY:
        raise HTTPException(
            status_code=403,
            detail="Invalid API Key"
        )
    return api_key

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token with role and organization information."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Add timestamp for token tracking
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "token_type": "access"
    })
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> dict:
    """Verify JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials"
        )

def get_password_hash(password: str) -> str:
    """Hash password using bcrypt."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash."""
    return pwd_context.verify(plain_password, hashed_password)

# Security headers
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; "
        "font-src 'self'; "
        "connect-src 'self' ws: wss:;"
    ),
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": (
        "accelerometer=(), camera=(), geolocation=(), "
        "gyroscope=(), magnetometer=(), microphone=(), "
        "payment=(), usb=()"
    )
}

# Rate limiting configuration
RATE_LIMITS = {
    "default": "60/minute",
    "api": "30/minute",
    "auth": "5/minute",
    "websocket": "100/minute"
}

# CORS configuration
CORS_CONFIG = {
    "allow_origins": os.getenv("ALLOWED_ORIGINS", "http://localhost:8000").split(","),
    "allow_credentials": True,
    "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["*"],
    "expose_headers": ["X-API-Key"],
    "max_age": 600
}

# Log source validation
ALLOWED_LOG_SOURCES = {
    "file": {
        "required_fields": ["file_path"],
        "validations": {
            "file_path": lambda x: os.path.exists(x) and os.access(x, os.R_OK)
        }
    },
    "syslog": {
        "required_fields": ["host", "port"],
        "validations": {
            "port": lambda x: isinstance(x, int) and 0 < x < 65536
        }
    },
    "aws": {
        "required_fields": ["region", "log_group"],
        "validations": {
            "region": lambda x: x in ["us-east-1", "us-west-2", "eu-west-1"]
        }
    },
    "custom": {
        "required_fields": ["endpoint", "method"],
        "validations": {
            "method": lambda x: x in ["GET", "POST"]
        }
    }
}

def validate_log_source(source_type: str, config: dict) -> bool:
    """Validate log source configuration."""
    if source_type not in ALLOWED_LOG_SOURCES:
        raise HTTPException(status_code=400, detail="Invalid source type")
    
    source_config = ALLOWED_LOG_SOURCES[source_type]
    
    # Check required fields
    for field in source_config["required_fields"]:
        if field not in config:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required field: {field}"
            )
    
    # Run validations
    for field, validator in source_config["validations"].items():
        if field in config and not validator(config[field]):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid value for field: {field}"
            )
    
    return True 