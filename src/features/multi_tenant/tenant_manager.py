"""
SecureNet Multi-Tenant Management System
Phase 3: Production Platform - Multi-Tenant Architecture
"""

import uuid
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
from enum import Enum
import json
import logging
from dataclasses import dataclass

from database.database import Database
from crypto.securenet_crypto import SecureNetCrypto

logger = logging.getLogger(__name__)

class TenantStatus(Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    PENDING = "pending"
    CANCELLED = "cancelled"

class TenantTier(Enum):
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"
    MSP = "msp"

class ResourceType(Enum):
    USERS = "users"
    DEVICES = "devices"
    STORAGE_GB = "storage_gb"
    API_CALLS = "api_calls"
    ALERTS_PER_MONTH = "alerts_per_month"

@dataclass
class TenantQuota:
    resource_type: ResourceType
    quota_limit: int
    current_usage: int
    reset_date: date

@dataclass
class TenantInfo:
    tenant_id: str
    organization_name: str
    tenant_status: TenantStatus
    tenant_tier: TenantTier
    created_at: datetime
    billing_email: Optional[str] = None
    contact_phone: Optional[str] = None
    timezone: str = "UTC"
    locale: str = "en-US"

class TenantManager:
    """Multi-tenant management system for SecureNet"""
    
    def __init__(self, db: Database):
        self.db = db
        self._tenant_cache = {}
        self.crypto = SecureNetCrypto()
    
    async def create_tenant(self, organization_name: str, tenant_tier: TenantTier = TenantTier.FREE, 
                          billing_email: Optional[str] = None, contact_phone: Optional[str] = None,
                          timezone: str = "UTC", locale: str = "en-US") -> str:
        """Create a new tenant"""
        try:
            tenant_id = str(uuid.uuid4())
            
            # Create organization record
            await self.db.execute("""
                INSERT INTO organizations (tenant_id, name, tenant_status, tenant_tier, 
                                         billing_email, contact_phone, timezone, locale)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """, tenant_id, organization_name, TenantStatus.PENDING.value, tenant_tier.value,
                 billing_email, contact_phone, timezone, locale)
            
            # Initialize resource quotas
            await self._initialize_tenant_quotas(tenant_id, tenant_tier)
            
            # Initialize default settings
            await self._initialize_tenant_settings(tenant_id, tenant_tier)
            
            # Initialize branding
            await self._initialize_tenant_branding(tenant_id, organization_name)
            
            logger.info(f"Created new tenant: {tenant_id} for organization: {organization_name}")
            return tenant_id
            
        except Exception as e:
            logger.error(f"Failed to create tenant: {e}")
            raise
    
    async def get_tenant_info(self, tenant_id: str) -> Optional[TenantInfo]:
        """Get tenant information"""
        try:
            result = await self.db.fetch_one("""
                SELECT tenant_id, name, tenant_status, tenant_tier, created_at,
                       billing_email, contact_phone, timezone, locale
                FROM organizations
                WHERE tenant_id = $1
            """, tenant_id)
            
            if result:
                return TenantInfo(
                    tenant_id=result['tenant_id'],
                    organization_name=result['name'],
                    tenant_status=TenantStatus(result['tenant_status']),
                    tenant_tier=TenantTier(result['tenant_tier']),
                    created_at=result['created_at'],
                    billing_email=result['billing_email'],
                    contact_phone=result['contact_phone'],
                    timezone=result['timezone'],
                    locale=result['locale']
                )
            return None
            
        except Exception as e:
            logger.error(f"Failed to get tenant info: {e}")
            return None
    
    async def update_tenant_status(self, tenant_id: str, status: TenantStatus) -> bool:
        """Update tenant status"""
        try:
            await self.db.execute("""
                UPDATE organizations 
                SET tenant_status = $1, updated_at = NOW()
                WHERE tenant_id = $2
            """, status.value, tenant_id)
            
            logger.info(f"Updated tenant {tenant_id} status to {status.value}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update tenant status: {e}")
            return False
    
    async def update_tenant_tier(self, tenant_id: str, tier: TenantTier) -> bool:
        """Update tenant tier and adjust quotas"""
        try:
            # Update tier
            await self.db.execute("""
                UPDATE organizations 
                SET tenant_tier = $1, updated_at = NOW()
                WHERE tenant_id = $2
            """, tier.value, tenant_id)
            
            # Update quotas for new tier
            await self._update_tenant_quotas_for_tier(tenant_id, tier)
            
            # Update settings for new tier
            await self._update_tenant_settings_for_tier(tenant_id, tier)
            
            logger.info(f"Updated tenant {tenant_id} tier to {tier.value}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update tenant tier: {e}")
            return False
    
    async def get_tenant_quotas(self, tenant_id: str) -> List[TenantQuota]:
        """Get tenant resource quotas"""
        try:
            results = await self.db.fetch_all("""
                SELECT resource_type, quota_limit, current_usage, reset_date
                FROM tenant_resource_quotas
                WHERE tenant_id = $1
            """, tenant_id)
            
            quotas = []
            for result in results:
                quotas.append(TenantQuota(
                    resource_type=ResourceType(result['resource_type']),
                    quota_limit=result['quota_limit'],
                    current_usage=result['current_usage'],
                    reset_date=result['reset_date']
                ))
            
            return quotas
            
        except Exception as e:
            logger.error(f"Failed to get tenant quotas: {e}")
            return []
    
    async def check_quota(self, tenant_id: str, resource_type: ResourceType, amount: int = 1) -> bool:
        """Check if tenant has quota available for resource"""
        try:
            result = await self.db.fetch_one("""
                SELECT quota_limit, current_usage
                FROM tenant_resource_quotas
                WHERE tenant_id = $1 AND resource_type = $2
            """, tenant_id, resource_type.value)
            
            if not result:
                return False
            
            # Check if adding amount would exceed quota
            return (result['current_usage'] + amount) <= result['quota_limit']
            
        except Exception as e:
            logger.error(f"Failed to check quota: {e}")
            return False
    
    async def increment_usage(self, tenant_id: str, resource_type: ResourceType, amount: int = 1, 
                            description: Optional[str] = None) -> bool:
        """Increment resource usage for tenant"""
        try:
            # Update current usage
            await self.db.execute("""
                UPDATE tenant_resource_quotas
                SET current_usage = current_usage + $1, updated_at = NOW()
                WHERE tenant_id = $2 AND resource_type = $3
            """, amount, tenant_id, resource_type.value)
            
            # Log usage
            await self.db.execute("""
                INSERT INTO tenant_usage_logs (tenant_id, resource_type, usage_amount, usage_date, description)
                VALUES ($1, $2, $3, $4, $5)
            """, tenant_id, resource_type.value, amount, date.today(), description)
            
            logger.debug(f"Incremented {resource_type.value} usage for tenant {tenant_id} by {amount}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to increment usage: {e}")
            return False
    
    async def get_tenant_setting(self, tenant_id: str, setting_key: str) -> Optional[str]:
        """Get tenant setting value"""
        try:
            result = await self.db.fetch_one("""
                SELECT setting_value, is_encrypted
                FROM tenant_settings
                WHERE tenant_id = $1 AND setting_key = $2
            """, tenant_id, setting_key)
            
            if result:
                value = result['setting_value']
                if result['is_encrypted'] and value:
                    return self.crypto.decrypt_data(value).decode('utf-8')
                return value
            return None
            
        except Exception as e:
            logger.error(f"Failed to get tenant setting: {e}")
            return None
    
    async def set_tenant_setting(self, tenant_id: str, setting_key: str, setting_value: str, 
                               is_encrypted: bool = False) -> bool:
        """Set tenant setting value"""
        try:
            value = setting_value
            if is_encrypted and value:
                value = self.crypto.encrypt_data(value)
            
            await self.db.execute("""
                INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, is_encrypted)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (tenant_id, setting_key) 
                DO UPDATE SET setting_value = $3, is_encrypted = $4, updated_at = NOW()
            """, tenant_id, setting_key, value, is_encrypted)
            
            logger.debug(f"Set tenant setting {setting_key} for tenant {tenant_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to set tenant setting: {e}")
            return False
    
    async def log_audit_event(self, tenant_id: str, user_id: Optional[str], action: str,
                            resource_type: Optional[str] = None, resource_id: Optional[str] = None,
                            old_values: Optional[Dict] = None, new_values: Optional[Dict] = None,
                            ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> bool:
        """Log audit event for tenant"""
        try:
            await self.db.execute("""
                INSERT INTO tenant_audit_logs (tenant_id, user_id, action, resource_type, resource_id,
                                             old_values, new_values, ip_address, user_agent)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """, tenant_id, user_id, action, resource_type, resource_id,
                 json.dumps(old_values) if old_values else None,
                 json.dumps(new_values) if new_values else None,
                 ip_address, user_agent)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to log audit event: {e}")
            return False
    
    async def get_tenant_audit_logs(self, tenant_id: str, limit: int = 100, offset: int = 0) -> List[Dict]:
        """Get tenant audit logs"""
        try:
            results = await self.db.fetch_all("""
                SELECT user_id, action, resource_type, resource_id, old_values, new_values,
                       ip_address, user_agent, created_at
                FROM tenant_audit_logs
                WHERE tenant_id = $1
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
            """, tenant_id, limit, offset)
            
            logs = []
            for result in results:
                log = dict(result)
                if log['old_values']:
                    log['old_values'] = json.loads(log['old_values'])
                if log['new_values']:
                    log['new_values'] = json.loads(log['new_values'])
                logs.append(log)
            
            return logs
            
        except Exception as e:
            logger.error(f"Failed to get tenant audit logs: {e}")
            return []
    
    async def get_all_tenants(self, status: Optional[TenantStatus] = None, 
                            tier: Optional[TenantTier] = None) -> List[TenantInfo]:
        """Get all tenants with optional filtering"""
        try:
            query = """
                SELECT tenant_id, name, tenant_status, tenant_tier, created_at,
                       billing_email, contact_phone, timezone, locale
                FROM organizations
                WHERE 1=1
            """
            params = []
            param_count = 0
            
            if status:
                param_count += 1
                query += f" AND tenant_status = ${param_count}"
                params.append(status.value)
            
            if tier:
                param_count += 1
                query += f" AND tenant_tier = ${param_count}"
                params.append(tier.value)
            
            query += " ORDER BY created_at DESC"
            
            results = await self.db.fetch_all(query, *params)
            
            tenants = []
            for result in results:
                tenants.append(TenantInfo(
                    tenant_id=result['tenant_id'],
                    organization_name=result['name'],
                    tenant_status=TenantStatus(result['tenant_status']),
                    tenant_tier=TenantTier(result['tenant_tier']),
                    created_at=result['created_at'],
                    billing_email=result['billing_email'],
                    contact_phone=result['contact_phone'],
                    timezone=result['timezone'],
                    locale=result['locale']
                ))
            
            return tenants
            
        except Exception as e:
            logger.error(f"Failed to get all tenants: {e}")
            return []
    
    async def _initialize_tenant_quotas(self, tenant_id: str, tier: TenantTier) -> None:
        """Initialize resource quotas for new tenant"""
        quota_limits = {
            TenantTier.STARTER: {
                ResourceType.USERS: 5,
                ResourceType.DEVICES: 25,
                ResourceType.STORAGE_GB: 5,
                ResourceType.API_CALLS: 5000,
                ResourceType.ALERTS_PER_MONTH: 500
            },
            TenantTier.PROFESSIONAL: {
                ResourceType.USERS: 50,
                ResourceType.DEVICES: 250,
                ResourceType.STORAGE_GB: 25,
                ResourceType.API_CALLS: 25000,
                ResourceType.ALERTS_PER_MONTH: 2500
            },
            TenantTier.BUSINESS: {
                ResourceType.USERS: 500,
                ResourceType.DEVICES: 2500,
                ResourceType.STORAGE_GB: 100,
                ResourceType.API_CALLS: 100000,
                ResourceType.ALERTS_PER_MONTH: 10000
            },
            TenantTier.ENTERPRISE: {
                ResourceType.USERS: 1000,
                ResourceType.DEVICES: 5000,
                ResourceType.STORAGE_GB: 500,
                ResourceType.API_CALLS: 500000,
                ResourceType.ALERTS_PER_MONTH: 50000
            },
            TenantTier.MSP: {
                ResourceType.USERS: 1000,
                ResourceType.DEVICES: 10000,
                ResourceType.STORAGE_GB: 1000,
                ResourceType.API_CALLS: 1000000,
                ResourceType.ALERTS_PER_MONTH: 100000
            }
        }
        
        reset_date = date.today().replace(day=1) + timedelta(days=32)
        reset_date = reset_date.replace(day=1)
        
        for resource_type, limit in quota_limits[tier].items():
            await self.db.execute("""
                INSERT INTO tenant_resource_quotas (tenant_id, resource_type, quota_limit, reset_date)
                VALUES ($1, $2, $3, $4)
            """, tenant_id, resource_type.value, limit, reset_date)
    
    async def _initialize_tenant_settings(self, tenant_id: str, tier: TenantTier) -> None:
        """Initialize default settings for new tenant"""
        settings = {
            'security_level': 'basic' if tier == TenantTier.FREE else 'standard',
            'retention_days': '30' if tier == TenantTier.FREE else '90',
            'auto_backup': 'false' if tier == TenantTier.FREE else 'true',
            'advanced_monitoring': 'false' if tier == TenantTier.FREE else 'true'
        }
        
        for key, value in settings.items():
            await self.set_tenant_setting(tenant_id, key, value)
    
    async def _initialize_tenant_branding(self, tenant_id: str, organization_name: str) -> None:
        """Initialize branding for new tenant"""
        await self.db.execute("""
            INSERT INTO tenant_branding (tenant_id, company_name)
            VALUES ($1, $2)
        """, tenant_id, organization_name)
    
    async def _update_tenant_quotas_for_tier(self, tenant_id: str, tier: TenantTier) -> None:
        """Update quotas when tenant tier changes"""
        quota_limits = {
            TenantTier.FREE: {
                ResourceType.USERS: 5,
                ResourceType.DEVICES: 10,
                ResourceType.STORAGE_GB: 1,
                ResourceType.API_CALLS: 1000,
                ResourceType.ALERTS_PER_MONTH: 100
            },
            TenantTier.PRO: {
                ResourceType.USERS: 50,
                ResourceType.DEVICES: 100,
                ResourceType.STORAGE_GB: 10,
                ResourceType.API_CALLS: 10000,
                ResourceType.ALERTS_PER_MONTH: 1000
            },
            TenantTier.ENTERPRISE: {
                ResourceType.USERS: 500,
                ResourceType.DEVICES: 1000,
                ResourceType.STORAGE_GB: 100,
                ResourceType.API_CALLS: 100000,
                ResourceType.ALERTS_PER_MONTH: 10000
            },
            TenantTier.MSP: {
                ResourceType.USERS: 1000,
                ResourceType.DEVICES: 5000,
                ResourceType.STORAGE_GB: 500,
                ResourceType.API_CALLS: 500000,
                ResourceType.ALERTS_PER_MONTH: 50000
            }
        }
        
        for resource_type, limit in quota_limits[tier].items():
            await self.db.execute("""
                UPDATE tenant_resource_quotas
                SET quota_limit = $1, updated_at = NOW()
                WHERE tenant_id = $2 AND resource_type = $3
            """, limit, tenant_id, resource_type.value)
    
    async def _update_tenant_settings_for_tier(self, tenant_id: str, tier: TenantTier) -> None:
        """Update settings when tenant tier changes"""
        settings = {
            'security_level': 'basic' if tier == TenantTier.FREE else 'standard',
            'retention_days': '30' if tier == TenantTier.FREE else '90',
            'auto_backup': 'false' if tier == TenantTier.FREE else 'true',
            'advanced_monitoring': 'false' if tier == TenantTier.FREE else 'true'
        }
        
        for key, value in settings.items():
            await self.set_tenant_setting(tenant_id, key, value) 