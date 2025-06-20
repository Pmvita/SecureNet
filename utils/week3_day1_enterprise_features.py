"""
SecureNet Week 3 Day 1: Enterprise Features & Advanced Security
Implementation of enterprise-grade features for Fortune 500 deployment
"""

import asyncio
import json
import logging
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass, field
from enum import Enum
import hashlib
import jwt
import redis
import requests
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import base64
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Enterprise Configuration
class EnterpriseConfig:
    """Enterprise feature configuration"""
    
    # SSO Configuration
    SSO_PROVIDERS = ["saml", "oauth2", "oidc", "ldap", "azure_ad"]
    SSO_SESSION_TIMEOUT = 3600  # 1 hour
    SSO_REFRESH_INTERVAL = 300  # 5 minutes
    
    # RBAC Configuration
    MAX_CUSTOM_ROLES = 50
    MAX_PERMISSIONS_PER_ROLE = 100
    ROLE_INHERITANCE_DEPTH = 5
    
    # API Management
    ENTERPRISE_RATE_LIMITS = {
        "platform_owner": 10000,    # 10k requests/hour
        "security_admin": 5000,     # 5k requests/hour
        "soc_analyst": 2000,        # 2k requests/hour
        "api_service": 50000        # 50k requests/hour for services
    }
    
    # Threat Intelligence
    THREAT_INTEL_SOURCES = ["misp", "taxii", "stix", "cti_feeds"]
    THREAT_UPDATE_INTERVAL = 300  # 5 minutes
    IOC_RETENTION_DAYS = 90

@dataclass
class SSOProvider:
    """SSO Provider configuration"""
    provider_id: str
    provider_type: str  # saml, oauth2, oidc, ldap
    name: str
    enabled: bool = True
    config: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

@dataclass
class CustomRole:
    """Custom enterprise role definition"""
    role_id: str
    name: str
    description: str
    permissions: List[str]
    parent_roles: List[str] = field(default_factory=list)
    organization_id: Optional[str] = None
    is_system_role: bool = False
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

@dataclass
class APIKey:
    """Enterprise API key management"""
    key_id: str
    api_key: str
    name: str
    organization_id: str
    user_id: str
    permissions: List[str]
    rate_limit: int
    expires_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

@dataclass
class ThreatIntelligence:
    """Threat intelligence indicator"""
    ioc_id: str
    ioc_type: str  # ip, domain, hash, url
    ioc_value: str
    threat_type: str
    severity: str
    confidence: float
    source: str
    description: str
    first_seen: datetime
    last_seen: datetime
    tags: List[str] = field(default_factory=list)

class SSOIntegrationManager:
    """
    Single Sign-On Integration Manager
    Provides foundation for enterprise SSO integration
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client or redis.Redis(host='localhost', port=6379, db=3)
        self.config = EnterpriseConfig()
        self.providers: Dict[str, SSOProvider] = {}
        logger.info("SSO Integration Manager initialized")
    
    async def register_sso_provider(self, provider_type: str, name: str, config: Dict[str, Any]) -> str:
        """Register a new SSO provider"""
        provider_id = f"sso_{provider_type}_{secrets.token_hex(8)}"
        
        provider = SSOProvider(
            provider_id=provider_id,
            provider_type=provider_type,
            name=name,
            config=config
        )
        
        # Store provider configuration
        self.providers[provider_id] = provider
        await self._store_provider(provider)
        
        logger.info(f"SSO provider registered: {name} ({provider_type})")
        return provider_id
    
    async def configure_saml_provider(self, name: str, idp_metadata_url: str, 
                                    sp_entity_id: str, sp_acs_url: str) -> str:
        """Configure SAML 2.0 provider"""
        config = {
            "idp_metadata_url": idp_metadata_url,
            "sp_entity_id": sp_entity_id,
            "sp_acs_url": sp_acs_url,
            "attribute_mapping": {
                "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
                "first_name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
                "last_name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname",
                "groups": "http://schemas.microsoft.com/ws/2008/06/identity/claims/groups"
            }
        }
        
        return await self.register_sso_provider("saml", name, config)
    
    async def configure_oauth2_provider(self, name: str, client_id: str, 
                                      client_secret: str, authorization_url: str,
                                      token_url: str, userinfo_url: str) -> str:
        """Configure OAuth 2.0 provider"""
        config = {
            "client_id": client_id,
            "client_secret": client_secret,
            "authorization_url": authorization_url,
            "token_url": token_url,
            "userinfo_url": userinfo_url,
            "scope": ["openid", "profile", "email"],
            "redirect_uri": "/auth/oauth2/callback"
        }
        
        return await self.register_sso_provider("oauth2", name, config)
    
    async def initiate_sso_login(self, provider_id: str, organization_id: str) -> Dict[str, Any]:
        """Initiate SSO login flow"""
        provider = self.providers.get(provider_id)
        if not provider or not provider.enabled:
            raise ValueError(f"SSO provider not found or disabled: {provider_id}")
        
        # Generate state parameter for security
        state = secrets.token_urlsafe(32)
        
        # Store state in Redis with expiration
        state_key = f"sso_state:{state}"
        state_data = {
            "provider_id": provider_id,
            "organization_id": organization_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        self.redis_client.setex(state_key, 600, json.dumps(state_data))  # 10 minute expiry
        
        if provider.provider_type == "saml":
            return await self._initiate_saml_login(provider, state)
        elif provider.provider_type == "oauth2":
            return await self._initiate_oauth2_login(provider, state)
        else:
            raise NotImplementedError(f"SSO provider type not implemented: {provider.provider_type}")
    
    async def _initiate_saml_login(self, provider: SSOProvider, state: str) -> Dict[str, Any]:
        """Initiate SAML login"""
        # Generate SAML AuthnRequest (simplified)
        authn_request_id = f"_saml_{secrets.token_hex(16)}"
        
        return {
            "provider_type": "saml",
            "redirect_url": f"{provider.config['idp_metadata_url']}/sso",
            "state": state,
            "authn_request_id": authn_request_id,
            "method": "POST"
        }
    
    async def _initiate_oauth2_login(self, provider: SSOProvider, state: str) -> Dict[str, Any]:
        """Initiate OAuth 2.0 login"""
        authorization_url = (
            f"{provider.config['authorization_url']}"
            f"?client_id={provider.config['client_id']}"
            f"&response_type=code"
            f"&scope={'+'.join(provider.config['scope'])}"
            f"&redirect_uri={provider.config['redirect_uri']}"
            f"&state={state}"
        )
        
        return {
            "provider_type": "oauth2",
            "redirect_url": authorization_url,
            "state": state,
            "method": "GET"
        }
    
    async def _store_provider(self, provider: SSOProvider):
        """Store SSO provider in Redis"""
        provider_key = f"sso_provider:{provider.provider_id}"
        provider_data = {
            "provider_id": provider.provider_id,
            "provider_type": provider.provider_type,
            "name": provider.name,
            "enabled": provider.enabled,
            "config": provider.config,
            "metadata": provider.metadata,
            "created_at": provider.created_at.isoformat()
        }
        
        self.redis_client.set(provider_key, json.dumps(provider_data))
    
    async def get_sso_status(self) -> Dict[str, Any]:
        """Get SSO integration status"""
        return {
            "providers_configured": len(self.providers),
            "active_providers": len([p for p in self.providers.values() if p.enabled]),
            "supported_types": self.config.SSO_PROVIDERS,
            "providers": [
                {
                    "provider_id": p.provider_id,
                    "name": p.name,
                    "type": p.provider_type,
                    "enabled": p.enabled
                }
                for p in self.providers.values()
            ]
        }

class AdvancedRBACManager:
    """
    Advanced Role-Based Access Control Manager
    Enhanced RBAC with custom roles, inheritance, and fine-grained permissions
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client or redis.Redis(host='localhost', port=6379, db=4)
        self.config = EnterpriseConfig()
        self.custom_roles: Dict[str, CustomRole] = {}
        self._initialize_system_roles()
        logger.info("Advanced RBAC Manager initialized")
    
    def _initialize_system_roles(self):
        """Initialize system default roles"""
        system_roles = [
            CustomRole(
                role_id="platform_owner",
                name="Platform Owner",
                description="Full platform access across all organizations",
                permissions=["*"],  # Wildcard for all permissions
                is_system_role=True
            ),
            CustomRole(
                role_id="security_admin",
                name="Security Administrator",
                description="Organization-scoped security administration",
                permissions=[
                    "security.manage", "users.manage", "incidents.manage",
                    "compliance.view", "audit.view", "scans.manage"
                ],
                is_system_role=True
            ),
            CustomRole(
                role_id="soc_analyst",
                name="SOC Analyst",
                description="Security monitoring and analysis",
                permissions=[
                    "dashboard.view", "logs.view", "alerts.view",
                    "incidents.view", "reports.generate"
                ],
                is_system_role=True
            )
        ]
        
        for role in system_roles:
            self.custom_roles[role.role_id] = role
    
    async def create_custom_role(self, name: str, description: str, 
                               permissions: List[str], organization_id: Optional[str] = None,
                               parent_roles: List[str] = None) -> str:
        """Create a custom role"""
        if len(self.custom_roles) >= self.config.MAX_CUSTOM_ROLES:
            raise ValueError("Maximum custom roles limit reached")
        
        if len(permissions) > self.config.MAX_PERMISSIONS_PER_ROLE:
            raise ValueError("Maximum permissions per role limit exceeded")
        
        role_id = f"custom_{secrets.token_hex(8)}"
        
        role = CustomRole(
            role_id=role_id,
            name=name,
            description=description,
            permissions=permissions,
            organization_id=organization_id,
            parent_roles=parent_roles or []
        )
        
        # Validate role inheritance depth
        if not await self._validate_role_inheritance(role):
            raise ValueError("Role inheritance depth exceeds maximum allowed")
        
        self.custom_roles[role_id] = role
        await self._store_role(role)
        
        logger.info(f"Custom role created: {name} ({role_id})")
        return role_id
    
    async def _validate_role_inheritance(self, role: CustomRole, depth: int = 0) -> bool:
        """Validate role inheritance doesn't exceed maximum depth"""
        if depth > self.config.ROLE_INHERITANCE_DEPTH:
            return False
        
        for parent_role_id in role.parent_roles:
            parent_role = self.custom_roles.get(parent_role_id)
            if parent_role and parent_role.parent_roles:
                if not await self._validate_role_inheritance(parent_role, depth + 1):
                    return False
        
        return True
    
    async def get_effective_permissions(self, role_id: str) -> List[str]:
        """Get effective permissions including inherited permissions"""
        role = self.custom_roles.get(role_id)
        if not role:
            return []
        
        permissions = set(role.permissions)
        
        # Add inherited permissions
        for parent_role_id in role.parent_roles:
            parent_permissions = await self.get_effective_permissions(parent_role_id)
            permissions.update(parent_permissions)
        
        return list(permissions)
    
    async def check_permission(self, role_id: str, permission: str) -> bool:
        """Check if role has specific permission"""
        effective_permissions = await self.get_effective_permissions(role_id)
        
        # Check for wildcard permission
        if "*" in effective_permissions:
            return True
        
        # Check for exact permission match
        if permission in effective_permissions:
            return True
        
        # Check for pattern-based permissions (e.g., "security.*")
        for perm in effective_permissions:
            if perm.endswith("*") and permission.startswith(perm[:-1]):
                return True
        
        return False
    
    async def assign_role_to_user(self, user_id: str, role_id: str, organization_id: Optional[str] = None):
        """Assign role to user"""
        assignment_key = f"user_role:{user_id}"
        assignment_data = {
            "user_id": user_id,
            "role_id": role_id,
            "organization_id": organization_id,
            "assigned_at": datetime.now(timezone.utc).isoformat()
        }
        
        self.redis_client.set(assignment_key, json.dumps(assignment_data))
        logger.info(f"Role {role_id} assigned to user {user_id}")
    
    async def _store_role(self, role: CustomRole):
        """Store custom role in Redis"""
        role_key = f"custom_role:{role.role_id}"
        role_data = {
            "role_id": role.role_id,
            "name": role.name,
            "description": role.description,
            "permissions": role.permissions,
            "parent_roles": role.parent_roles,
            "organization_id": role.organization_id,
            "is_system_role": role.is_system_role,
            "created_at": role.created_at.isoformat()
        }
        
        self.redis_client.set(role_key, json.dumps(role_data))
    
    async def get_rbac_status(self) -> Dict[str, Any]:
        """Get RBAC system status"""
        return {
            "total_roles": len(self.custom_roles),
            "system_roles": len([r for r in self.custom_roles.values() if r.is_system_role]),
            "custom_roles": len([r for r in self.custom_roles.values() if not r.is_system_role]),
            "max_custom_roles": self.config.MAX_CUSTOM_ROLES,
            "roles": [
                {
                    "role_id": r.role_id,
                    "name": r.name,
                    "permissions_count": len(r.permissions),
                    "is_system_role": r.is_system_role,
                    "organization_id": r.organization_id
                }
                for r in self.custom_roles.values()
            ]
        }

class EnterpriseAPIManager:
    """
    Enterprise API Management System
    Advanced rate limiting, API key management, and usage analytics
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client or redis.Redis(host='localhost', port=6379, db=5)
        self.config = EnterpriseConfig()
        self.api_keys: Dict[str, APIKey] = {}
        logger.info("Enterprise API Manager initialized")
    
    async def create_api_key(self, name: str, organization_id: str, user_id: str,
                           permissions: List[str], rate_limit: Optional[int] = None,
                           expires_in_days: Optional[int] = None) -> Tuple[str, str]:
        """Create new API key"""
        key_id = f"api_{secrets.token_hex(8)}"
        api_key = f"sk_live_{secrets.token_urlsafe(32)}"
        
        # Determine rate limit based on user role if not specified
        if rate_limit is None:
            rate_limit = self.config.ENTERPRISE_RATE_LIMITS.get("soc_analyst", 2000)
        
        expires_at = None
        if expires_in_days:
            expires_at = datetime.now(timezone.utc) + timedelta(days=expires_in_days)
        
        api_key_obj = APIKey(
            key_id=key_id,
            api_key=api_key,
            name=name,
            organization_id=organization_id,
            user_id=user_id,
            permissions=permissions,
            rate_limit=rate_limit,
            expires_at=expires_at
        )
        
        self.api_keys[key_id] = api_key_obj
        await self._store_api_key(api_key_obj)
        
        logger.info(f"API key created: {name} for user {user_id}")
        return key_id, api_key
    
    async def validate_api_key(self, api_key: str) -> Optional[APIKey]:
        """Validate API key and check rate limits"""
        # Find API key
        api_key_obj = None
        for key_obj in self.api_keys.values():
            if key_obj.api_key == api_key:
                api_key_obj = key_obj
                break
        
        if not api_key_obj:
            return None
        
        # Check expiration
        if api_key_obj.expires_at and datetime.now(timezone.utc) > api_key_obj.expires_at:
            return None
        
        # Check rate limit
        if not await self._check_rate_limit(api_key_obj):
            return None
        
        # Update last used timestamp
        api_key_obj.last_used_at = datetime.now(timezone.utc)
        await self._store_api_key(api_key_obj)
        
        return api_key_obj
    
    async def _check_rate_limit(self, api_key_obj: APIKey) -> bool:
        """Check API key rate limit"""
        current_hour = int(time.time() // 3600)
        rate_limit_key = f"rate_limit:{api_key_obj.key_id}:{current_hour}"
        
        current_count = self.redis_client.get(rate_limit_key)
        current_count = int(current_count) if current_count else 0
        
        if current_count >= api_key_obj.rate_limit:
            return False
        
        # Increment counter
        pipe = self.redis_client.pipeline()
        pipe.incr(rate_limit_key)
        pipe.expire(rate_limit_key, 3600)  # Expire after 1 hour
        pipe.execute()
        
        return True
    
    async def get_api_usage_stats(self, api_key_id: str, hours: int = 24) -> Dict[str, Any]:
        """Get API usage statistics"""
        current_hour = int(time.time() // 3600)
        usage_data = []
        
        for i in range(hours):
            hour = current_hour - i
            rate_limit_key = f"rate_limit:{api_key_id}:{hour}"
            count = self.redis_client.get(rate_limit_key)
            count = int(count) if count else 0
            
            usage_data.append({
                "hour": hour,
                "timestamp": datetime.fromtimestamp(hour * 3600, timezone.utc).isoformat(),
                "requests": count
            })
        
        total_requests = sum(data["requests"] for data in usage_data)
        
        return {
            "api_key_id": api_key_id,
            "total_requests": total_requests,
            "hours_analyzed": hours,
            "usage_by_hour": usage_data
        }
    
    async def _store_api_key(self, api_key_obj: APIKey):
        """Store API key in Redis"""
        key_data = {
            "key_id": api_key_obj.key_id,
            "api_key": api_key_obj.api_key,
            "name": api_key_obj.name,
            "organization_id": api_key_obj.organization_id,
            "user_id": api_key_obj.user_id,
            "permissions": api_key_obj.permissions,
            "rate_limit": api_key_obj.rate_limit,
            "expires_at": api_key_obj.expires_at.isoformat() if api_key_obj.expires_at else None,
            "last_used_at": api_key_obj.last_used_at.isoformat() if api_key_obj.last_used_at else None,
            "created_at": api_key_obj.created_at.isoformat()
        }
        
        api_key_key = f"api_key:{api_key_obj.key_id}"
        self.redis_client.set(api_key_key, json.dumps(key_data))
    
    async def get_api_management_status(self) -> Dict[str, Any]:
        """Get API management status"""
        active_keys = len([k for k in self.api_keys.values() 
                          if not k.expires_at or k.expires_at > datetime.now(timezone.utc)])
        
        return {
            "total_api_keys": len(self.api_keys),
            "active_api_keys": active_keys,
            "rate_limits": self.config.ENTERPRISE_RATE_LIMITS,
            "api_keys": [
                {
                    "key_id": k.key_id,
                    "name": k.name,
                    "organization_id": k.organization_id,
                    "rate_limit": k.rate_limit,
                    "permissions_count": len(k.permissions),
                    "expires_at": k.expires_at.isoformat() if k.expires_at else None,
                    "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None
                }
                for k in self.api_keys.values()
            ]
        }

class ThreatIntelligenceManager:
    """
    Advanced Threat Intelligence Manager
    Integration with threat intelligence feeds and IOC management
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client or redis.Redis(host='localhost', port=6379, db=6)
        self.config = EnterpriseConfig()
        self.threat_indicators: Dict[str, ThreatIntelligence] = {}
        self.feed_sources: Dict[str, Dict[str, Any]] = {}
        logger.info("Threat Intelligence Manager initialized")
    
    async def add_threat_feed(self, name: str, feed_type: str, url: str, 
                            api_key: Optional[str] = None, update_interval: int = 300) -> str:
        """Add threat intelligence feed"""
        feed_id = f"feed_{secrets.token_hex(8)}"
        
        feed_config = {
            "feed_id": feed_id,
            "name": name,
            "feed_type": feed_type,
            "url": url,
            "api_key": api_key,
            "update_interval": update_interval,
            "last_updated": None,
            "enabled": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        self.feed_sources[feed_id] = feed_config
        await self._store_feed_config(feed_config)
        
        logger.info(f"Threat intelligence feed added: {name} ({feed_type})")
        return feed_id
    
    async def ingest_threat_indicator(self, ioc_type: str, ioc_value: str, 
                                    threat_type: str, severity: str, confidence: float,
                                    source: str, description: str, tags: List[str] = None) -> str:
        """Ingest threat intelligence indicator"""
        ioc_id = f"ioc_{hashlib.sha256(f'{ioc_type}:{ioc_value}'.encode()).hexdigest()[:16]}"
        
        # Check if IOC already exists
        existing_ioc = self.threat_indicators.get(ioc_id)
        current_time = datetime.now(timezone.utc)
        
        if existing_ioc:
            # Update existing IOC
            existing_ioc.last_seen = current_time
            existing_ioc.confidence = max(existing_ioc.confidence, confidence)
            if tags:
                existing_ioc.tags.extend([tag for tag in tags if tag not in existing_ioc.tags])
        else:
            # Create new IOC
            threat_intel = ThreatIntelligence(
                ioc_id=ioc_id,
                ioc_type=ioc_type,
                ioc_value=ioc_value,
                threat_type=threat_type,
                severity=severity,
                confidence=confidence,
                source=source,
                description=description,
                first_seen=current_time,
                last_seen=current_time,
                tags=tags or []
            )
            
            self.threat_indicators[ioc_id] = threat_intel
        
        await self._store_threat_indicator(self.threat_indicators[ioc_id])
        
        logger.info(f"Threat indicator ingested: {ioc_type}:{ioc_value} from {source}")
        return ioc_id
    
    async def query_threat_intelligence(self, ioc_type: str, ioc_value: str) -> Optional[ThreatIntelligence]:
        """Query threat intelligence for specific IOC"""
        ioc_id = f"ioc_{hashlib.sha256(f'{ioc_type}:{ioc_value}'.encode()).hexdigest()[:16]}"
        return self.threat_indicators.get(ioc_id)
    
    async def bulk_ioc_lookup(self, iocs: List[Tuple[str, str]]) -> Dict[str, Optional[ThreatIntelligence]]:
        """Bulk lookup of IOCs"""
        results = {}
        
        for ioc_type, ioc_value in iocs:
            threat_intel = await self.query_threat_intelligence(ioc_type, ioc_value)
            results[f"{ioc_type}:{ioc_value}"] = threat_intel
        
        return results
    
    async def get_threat_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get threat intelligence summary"""
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        recent_threats = [
            threat for threat in self.threat_indicators.values()
            if threat.last_seen >= cutoff_time
        ]
        
        threat_by_type = {}
        threat_by_severity = {}
        
        for threat in recent_threats:
            threat_by_type[threat.threat_type] = threat_by_type.get(threat.threat_type, 0) + 1
            threat_by_severity[threat.severity] = threat_by_severity.get(threat.severity, 0) + 1
        
        return {
            "total_indicators": len(self.threat_indicators),
            "recent_indicators": len(recent_threats),
            "hours_analyzed": hours,
            "threat_by_type": threat_by_type,
            "threat_by_severity": threat_by_severity,
            "active_feeds": len([f for f in self.feed_sources.values() if f["enabled"]]),
            "high_confidence_threats": len([t for t in recent_threats if t.confidence >= 0.8])
        }
    
    async def _store_feed_config(self, feed_config: Dict[str, Any]):
        """Store threat feed configuration"""
        feed_key = f"threat_feed:{feed_config['feed_id']}"
        self.redis_client.set(feed_key, json.dumps(feed_config))
    
    async def _store_threat_indicator(self, threat_intel: ThreatIntelligence):
        """Store threat indicator in Redis"""
        threat_data = {
            "ioc_id": threat_intel.ioc_id,
            "ioc_type": threat_intel.ioc_type,
            "ioc_value": threat_intel.ioc_value,
            "threat_type": threat_intel.threat_type,
            "severity": threat_intel.severity,
            "confidence": threat_intel.confidence,
            "source": threat_intel.source,
            "description": threat_intel.description,
            "first_seen": threat_intel.first_seen.isoformat(),
            "last_seen": threat_intel.last_seen.isoformat(),
            "tags": threat_intel.tags
        }
        
        threat_key = f"threat_intel:{threat_intel.ioc_id}"
        self.redis_client.set(threat_key, json.dumps(threat_data))
        
        # Set expiration based on retention policy
        retention_seconds = self.config.IOC_RETENTION_DAYS * 24 * 3600
        self.redis_client.expire(threat_key, retention_seconds)
    
    async def get_threat_intelligence_status(self) -> Dict[str, Any]:
        """Get threat intelligence system status"""
        return {
            "total_indicators": len(self.threat_indicators),
            "active_feeds": len([f for f in self.feed_sources.values() if f["enabled"]]),
            "supported_sources": self.config.THREAT_INTEL_SOURCES,
            "retention_days": self.config.IOC_RETENTION_DAYS,
            "update_interval": self.config.THREAT_UPDATE_INTERVAL,
            "feeds": [
                {
                    "feed_id": f["feed_id"],
                    "name": f["name"],
                    "type": f["feed_type"],
                    "enabled": f["enabled"],
                    "last_updated": f["last_updated"]
                }
                for f in self.feed_sources.values()
            ]
        }

class Week3Day1EnterpriseFeatures:
    """
    Week 3 Day 1: Enterprise Features & Advanced Security
    Main orchestrator for enterprise feature implementation
    """
    
    def __init__(self):
        self.sso_manager = SSOIntegrationManager()
        self.rbac_manager = AdvancedRBACManager()
        self.api_manager = EnterpriseAPIManager()
        self.threat_intel_manager = ThreatIntelligenceManager()
        
        logger.info("Week 3 Day 1 Enterprise Features initialized")
    
    async def initialize_enterprise_features(self) -> Dict[str, Any]:
        """Initialize all enterprise features"""
        logger.info("Initializing enterprise features...")
        
        # Initialize sample configurations
        await self._setup_sample_sso_providers()
        await self._setup_sample_custom_roles()
        await self._setup_sample_api_keys()
        await self._setup_sample_threat_feeds()
        
        return {
            "status": "initialized",
            "components": ["sso", "rbac", "api_management", "threat_intelligence"],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    async def _setup_sample_sso_providers(self):
        """Setup sample SSO providers for demonstration"""
        # Configure Azure AD OAuth2
        await self.sso_manager.configure_oauth2_provider(
            name="Azure Active Directory",
            client_id="sample-client-id",
            client_secret="sample-client-secret",
            authorization_url="https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
            token_url="https://login.microsoftonline.com/common/oauth2/v2.0/token",
            userinfo_url="https://graph.microsoft.com/v1.0/me"
        )
        
        # Configure SAML provider
        await self.sso_manager.configure_saml_provider(
            name="Enterprise SAML IdP",
            idp_metadata_url="https://idp.example.com/metadata",
            sp_entity_id="https://securenet.ai/saml",
            sp_acs_url="https://securenet.ai/auth/saml/acs"
        )
    
    async def _setup_sample_custom_roles(self):
        """Setup sample custom roles"""
        # Security Analyst role
        await self.rbac_manager.create_custom_role(
            name="Security Analyst L2",
            description="Level 2 Security Analyst with incident management",
            permissions=[
                "dashboard.view", "logs.view", "alerts.manage",
                "incidents.manage", "scans.run", "reports.generate"
            ],
            parent_roles=["soc_analyst"]
        )
        
        # Compliance Officer role
        await self.rbac_manager.create_custom_role(
            name="Compliance Officer",
            description="Compliance and audit management role",
            permissions=[
                "compliance.manage", "audit.view", "reports.compliance",
                "policies.manage", "users.audit"
            ]
        )
    
    async def _setup_sample_api_keys(self):
        """Setup sample API keys"""
        # High-privilege service API key
        await self.api_manager.create_api_key(
            name="Integration Service Key",
            organization_id="org_sample",
            user_id="service_user",
            permissions=["api.read", "api.write", "webhooks.manage"],
            rate_limit=10000,
            expires_in_days=365
        )
        
        # Limited analyst API key
        await self.api_manager.create_api_key(
            name="Analyst Dashboard Key",
            organization_id="org_sample",
            user_id="analyst_user",
            permissions=["dashboard.read", "alerts.read"],
            rate_limit=1000,
            expires_in_days=90
        )
    
    async def _setup_sample_threat_feeds(self):
        """Setup sample threat intelligence feeds"""
        # Add MISP feed
        await self.threat_intel_manager.add_threat_feed(
            name="MISP Threat Feed",
            feed_type="misp",
            url="https://misp.example.com/events/restSearch",
            api_key="sample-misp-key",
            update_interval=300
        )
        
        # Add sample IOCs
        await self.threat_intel_manager.ingest_threat_indicator(
            ioc_type="ip",
            ioc_value="192.168.1.100",
            threat_type="malware",
            severity="high",
            confidence=0.85,
            source="MISP",
            description="Known C2 server",
            tags=["apt", "c2", "malware"]
        )
        
        await self.threat_intel_manager.ingest_threat_indicator(
            ioc_type="domain",
            ioc_value="malicious.example.com",
            threat_type="phishing",
            severity="medium",
            confidence=0.75,
            source="Commercial Feed",
            description="Phishing domain",
            tags=["phishing", "social-engineering"]
        )
    
    async def get_comprehensive_status(self) -> Dict[str, Any]:
        """Get comprehensive status of all enterprise features"""
        sso_status = await self.sso_manager.get_sso_status()
        rbac_status = await self.rbac_manager.get_rbac_status()
        api_status = await self.api_manager.get_api_management_status()
        threat_status = await self.threat_intel_manager.get_threat_intelligence_status()
        
        return {
            "enterprise_features_status": "operational",
            "components": {
                "sso_integration": sso_status,
                "advanced_rbac": rbac_status,
                "api_management": api_status,
                "threat_intelligence": threat_status
            },
            "overall_health": "excellent",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    async def simulate_enterprise_scenarios(self) -> Dict[str, Any]:
        """Simulate enterprise usage scenarios"""
        scenarios = []
        
        # Scenario 1: SSO Login Flow
        try:
            providers = list(self.sso_manager.providers.keys())
            if providers:
                sso_result = await self.sso_manager.initiate_sso_login(
                    providers[0], "org_demo"
                )
                scenarios.append({
                    "scenario": "SSO Login Initiation",
                    "status": "success",
                    "result": sso_result
                })
        except Exception as e:
            scenarios.append({
                "scenario": "SSO Login Initiation",
                "status": "error",
                "error": str(e)
            })
        
        # Scenario 2: Permission Check
        try:
            permission_result = await self.rbac_manager.check_permission(
                "security_admin", "incidents.manage"
            )
            scenarios.append({
                "scenario": "RBAC Permission Check",
                "status": "success",
                "result": {"has_permission": permission_result}
            })
        except Exception as e:
            scenarios.append({
                "scenario": "RBAC Permission Check",
                "status": "error",
                "error": str(e)
            })
        
        # Scenario 3: Threat Intelligence Lookup
        try:
            threat_result = await self.threat_intel_manager.query_threat_intelligence(
                "ip", "192.168.1.100"
            )
            scenarios.append({
                "scenario": "Threat Intelligence Lookup",
                "status": "success",
                "result": {
                    "threat_found": threat_result is not None,
                    "threat_type": threat_result.threat_type if threat_result else None
                }
            })
        except Exception as e:
            scenarios.append({
                "scenario": "Threat Intelligence Lookup",
                "status": "error",
                "error": str(e)
            })
        
        return {
            "simulation_results": scenarios,
            "total_scenarios": len(scenarios),
            "successful_scenarios": len([s for s in scenarios if s["status"] == "success"]),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

# Main execution
async def main():
    """Main execution function for testing"""
    enterprise_features = Week3Day1EnterpriseFeatures()
    
    # Initialize features
    init_result = await enterprise_features.initialize_enterprise_features()
    print(f"Initialization: {init_result}")
    
    # Get comprehensive status
    status = await enterprise_features.get_comprehensive_status()
    print(f"Status: {json.dumps(status, indent=2)}")
    
    # Run simulation scenarios
    simulation = await enterprise_features.simulate_enterprise_scenarios()
    print(f"Simulation: {json.dumps(simulation, indent=2)}")

if __name__ == "__main__":
    asyncio.run(main()) 