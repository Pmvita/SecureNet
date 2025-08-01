"""
SecureNet Multi-Tenant API Endpoints
Phase 3: Production Platform - Multi-Tenant Architecture
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, date

from database.database import get_database
from features.multi_tenant.tenant_manager import TenantManager, TenantStatus, TenantTier, ResourceType
from features.auth.auth import get_current_user, require_permissions
from features.auth.models import User

router = APIRouter(prefix="/api/tenants", tags=["Multi-Tenant Management"])

# Pydantic models
class TenantCreateRequest(BaseModel):
    organization_name: str = Field(..., min_length=1, max_length=255)
    tenant_tier: TenantTier = Field(default=TenantTier.FREE)
    billing_email: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=50)
    timezone: str = Field(default="UTC", max_length=50)
    locale: str = Field(default="en-US", max_length=10)

class TenantUpdateRequest(BaseModel):
    organization_name: Optional[str] = Field(None, min_length=1, max_length=255)
    tenant_status: Optional[TenantStatus] = None
    tenant_tier: Optional[TenantTier] = None
    billing_email: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=50)
    timezone: Optional[str] = Field(None, max_length=50)
    locale: Optional[str] = Field(None, max_length=10)

class TenantInfoResponse(BaseModel):
    tenant_id: str
    organization_name: str
    tenant_status: TenantStatus
    tenant_tier: TenantTier
    created_at: datetime
    billing_email: Optional[str] = None
    contact_phone: Optional[str] = None
    timezone: str
    locale: str

class TenantQuotaResponse(BaseModel):
    resource_type: ResourceType
    quota_limit: int
    current_usage: int
    reset_date: date
    usage_percentage: float

class TenantUsageLogResponse(BaseModel):
    resource_type: ResourceType
    usage_amount: int
    usage_date: date
    description: Optional[str] = None
    created_at: datetime

class TenantAuditLogResponse(BaseModel):
    user_id: Optional[str] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    old_values: Optional[Dict] = None
    new_values: Optional[Dict] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

class TenantSettingResponse(BaseModel):
    setting_key: str
    setting_value: str
    setting_type: str
    is_encrypted: bool

class TenantSettingUpdateRequest(BaseModel):
    setting_value: str
    is_encrypted: bool = False

# Helper function to get tenant manager
async def get_tenant_manager():
    db = await get_database()
    return TenantManager(db)

# Helper function to get tenant ID from user
async def get_user_tenant_id(user: User = Depends(get_current_user)) -> str:
    if not user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with any organization"
        )
    
    # Get tenant_id from organization
    db = await get_database()
    result = await db.fetch_one(
        "SELECT tenant_id FROM organizations WHERE id = $1",
        user.organization_id
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    return result['tenant_id']

@router.post("/", response_model=Dict[str, str])
@require_permissions(["system_admin"])
async def create_tenant(
    request: TenantCreateRequest,
    tenant_manager: TenantManager = Depends(get_tenant_manager),
    current_user: User = Depends(get_current_user)
):
    """Create a new tenant organization"""
    try:
        tenant_id = await tenant_manager.create_tenant(
            organization_name=request.organization_name,
            tenant_tier=request.tenant_tier,
            billing_email=request.billing_email,
            contact_phone=request.contact_phone,
            timezone=request.timezone,
            locale=request.locale
        )
        
        # Log audit event
        await tenant_manager.log_audit_event(
            tenant_id=tenant_id,
            user_id=str(current_user.id),
            action="tenant_created",
            resource_type="tenant",
            resource_id=tenant_id,
            new_values=request.dict(),
            ip_address=request.client.host if hasattr(request, 'client') else None
        )
        
        return {"tenant_id": tenant_id, "message": "Tenant created successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create tenant: {str(e)}"
        )

@router.get("/", response_model=List[TenantInfoResponse])
@require_permissions(["system_admin"])
async def list_tenants(
    status: Optional[TenantStatus] = None,
    tier: Optional[TenantTier] = None,
    tenant_manager: TenantManager = Depends(get_tenant_manager)
):
    """List all tenants with optional filtering"""
    try:
        tenants = await tenant_manager.get_all_tenants(status=status, tier=tier)
        return [TenantInfoResponse(**tenant.__dict__) for tenant in tenants]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list tenants: {str(e)}"
        )

@router.get("/current", response_model=TenantInfoResponse)
async def get_current_tenant(
    tenant_id: str = Depends(get_user_tenant_id),
    tenant_manager: TenantManager = Depends(get_tenant_manager)
):
    """Get current tenant information"""
    try:
        tenant_info = await tenant_manager.get_tenant_info(tenant_id)
        if not tenant_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        return TenantInfoResponse(**tenant_info.__dict__)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get tenant info: {str(e)}"
        )

@router.get("/{tenant_id}", response_model=TenantInfoResponse)
@require_permissions(["system_admin"])
async def get_tenant(
    tenant_id: str,
    tenant_manager: TenantManager = Depends(get_tenant_manager)
):
    """Get specific tenant information"""
    try:
        tenant_info = await tenant_manager.get_tenant_info(tenant_id)
        if not tenant_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        return TenantInfoResponse(**tenant_info.__dict__)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get tenant info: {str(e)}"
        )

@router.put("/{tenant_id}", response_model=Dict[str, str])
@require_permissions(["system_admin"])
async def update_tenant(
    tenant_id: str,
    request: TenantUpdateRequest,
    tenant_manager: TenantManager = Depends(get_tenant_manager),
    current_user: User = Depends(get_current_user)
):
    """Update tenant information"""
    try:
        # Get current tenant info for audit
        current_info = await tenant_manager.get_tenant_info(tenant_id)
        if not current_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # Update organization record
        db = await get_database()
        update_fields = []
        params = []
        param_count = 0
        
        if request.organization_name is not None:
            param_count += 1
            update_fields.append(f"name = ${param_count}")
            params.append(request.organization_name)
        
        if request.tenant_status is not None:
            param_count += 1
            update_fields.append(f"tenant_status = ${param_count}")
            params.append(request.tenant_status.value)
        
        if request.tenant_tier is not None:
            param_count += 1
            update_fields.append(f"tenant_tier = ${param_count}")
            params.append(request.tenant_tier.value)
        
        if request.billing_email is not None:
            param_count += 1
            update_fields.append(f"billing_email = ${param_count}")
            params.append(request.billing_email)
        
        if request.contact_phone is not None:
            param_count += 1
            update_fields.append(f"contact_phone = ${param_count}")
            params.append(request.contact_phone)
        
        if request.timezone is not None:
            param_count += 1
            update_fields.append(f"timezone = ${param_count}")
            params.append(request.timezone)
        
        if request.locale is not None:
            param_count += 1
            update_fields.append(f"locale = ${param_count}")
            params.append(request.locale)
        
        if update_fields:
            param_count += 1
            update_fields.append(f"updated_at = NOW()")
            params.append(tenant_id)
            
            query = f"UPDATE organizations SET {', '.join(update_fields)} WHERE tenant_id = ${param_count}"
            await db.execute(query, *params)
        
        # Update tier if changed
        if request.tenant_tier is not None and request.tenant_tier != current_info.tenant_tier:
            await tenant_manager.update_tenant_tier(tenant_id, request.tenant_tier)
        
        # Log audit event
        await tenant_manager.log_audit_event(
            tenant_id=tenant_id,
            user_id=str(current_user.id),
            action="tenant_updated",
            resource_type="tenant",
            resource_id=tenant_id,
            old_values=current_info.__dict__,
            new_values=request.dict(exclude_unset=True)
        )
        
        return {"message": "Tenant updated successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update tenant: {str(e)}"
        )

@router.get("/{tenant_id}/quotas", response_model=List[TenantQuotaResponse])
async def get_tenant_quotas(
    tenant_id: str = Depends(get_user_tenant_id),
    tenant_manager: TenantManager = Depends(get_tenant_manager)
):
    """Get tenant resource quotas"""
    try:
        quotas = await tenant_manager.get_tenant_quotas(tenant_id)
        
        quota_responses = []
        for quota in quotas:
            usage_percentage = (quota.current_usage / quota.quota_limit * 100) if quota.quota_limit > 0 else 0
            quota_responses.append(TenantQuotaResponse(
                resource_type=quota.resource_type,
                quota_limit=quota.quota_limit,
                current_usage=quota.current_usage,
                reset_date=quota.reset_date,
                usage_percentage=round(usage_percentage, 2)
            ))
        
        return quota_responses
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get tenant quotas: {str(e)}"
        )

@router.get("/{tenant_id}/usage-logs", response_model=List[TenantUsageLogResponse])
async def get_tenant_usage_logs(
    tenant_id: str = Depends(get_user_tenant_id),
    limit: int = 100,
    offset: int = 0,
    tenant_manager: TenantManager = Depends(get_tenant_manager)
):
    """Get tenant usage logs"""
    try:
        db = await get_database()
        results = await db.fetch_all("""
            SELECT resource_type, usage_amount, usage_date, description, created_at
            FROM tenant_usage_logs
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        """, tenant_id, limit, offset)
        
        return [TenantUsageLogResponse(**result) for result in results]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get usage logs: {str(e)}"
        )

@router.get("/{tenant_id}/audit-logs", response_model=List[TenantAuditLogResponse])
async def get_tenant_audit_logs(
    tenant_id: str = Depends(get_user_tenant_id),
    limit: int = 100,
    offset: int = 0,
    tenant_manager: TenantManager = Depends(get_tenant_manager)
):
    """Get tenant audit logs"""
    try:
        logs = await tenant_manager.get_tenant_audit_logs(tenant_id, limit, offset)
        return [TenantAuditLogResponse(**log) for log in logs]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get audit logs: {str(e)}"
        )

@router.get("/{tenant_id}/settings", response_model=List[TenantSettingResponse])
async def get_tenant_settings(
    tenant_id: str = Depends(get_user_tenant_id),
    tenant_manager: TenantManager = Depends(get_tenant_manager)
):
    """Get all tenant settings"""
    try:
        db = await get_database()
        results = await db.fetch_all("""
            SELECT setting_key, setting_value, setting_type, is_encrypted
            FROM tenant_settings
            WHERE tenant_id = $1
            ORDER BY setting_key
        """, tenant_id)
        
        settings = []
        for result in results:
            value = result['setting_value']
            if result['is_encrypted'] and value:
                value = "***ENCRYPTED***"
            
            settings.append(TenantSettingResponse(
                setting_key=result['setting_key'],
                setting_value=value,
                setting_type=result['setting_type'],
                is_encrypted=result['is_encrypted']
            ))
        
        return settings
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get tenant settings: {str(e)}"
        )

@router.get("/{tenant_id}/settings/{setting_key}", response_model=TenantSettingResponse)
async def get_tenant_setting(
    setting_key: str,
    tenant_id: str = Depends(get_user_tenant_id),
    tenant_manager: TenantManager = Depends(get_tenant_manager)
):
    """Get specific tenant setting"""
    try:
        db = await get_database()
        result = await db.fetch_one("""
            SELECT setting_key, setting_value, setting_type, is_encrypted
            FROM tenant_settings
            WHERE tenant_id = $1 AND setting_key = $2
        """, tenant_id, setting_key)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Setting not found"
            )
        
        value = result['setting_value']
        if result['is_encrypted'] and value:
            value = "***ENCRYPTED***"
        
        return TenantSettingResponse(
            setting_key=result['setting_key'],
            setting_value=value,
            setting_type=result['setting_type'],
            is_encrypted=result['is_encrypted']
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get tenant setting: {str(e)}"
        )

@router.put("/{tenant_id}/settings/{setting_key}", response_model=Dict[str, str])
async def update_tenant_setting(
    setting_key: str,
    request: TenantSettingUpdateRequest,
    tenant_id: str = Depends(get_user_tenant_id),
    tenant_manager: TenantManager = Depends(get_tenant_manager),
    current_user: User = Depends(get_current_user)
):
    """Update tenant setting"""
    try:
        success = await tenant_manager.set_tenant_setting(
            tenant_id, setting_key, request.setting_value, request.is_encrypted
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update setting"
            )
        
        # Log audit event
        await tenant_manager.log_audit_event(
            tenant_id=tenant_id,
            user_id=str(current_user.id),
            action="setting_updated",
            resource_type="setting",
            resource_id=setting_key,
            new_values={"setting_value": "***ENCRYPTED***" if request.is_encrypted else request.setting_value}
        )
        
        return {"message": "Setting updated successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update setting: {str(e)}"
        )

@router.post("/{tenant_id}/status/{status}", response_model=Dict[str, str])
@require_permissions(["system_admin"])
async def update_tenant_status(
    tenant_id: str,
    status: TenantStatus,
    tenant_manager: TenantManager = Depends(get_tenant_manager),
    current_user: User = Depends(get_current_user)
):
    """Update tenant status"""
    try:
        success = await tenant_manager.update_tenant_status(tenant_id, status)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update tenant status"
            )
        
        # Log audit event
        await tenant_manager.log_audit_event(
            tenant_id=tenant_id,
            user_id=str(current_user.id),
            action="status_updated",
            resource_type="tenant",
            resource_id=tenant_id,
            new_values={"status": status.value}
        )
        
        return {"message": f"Tenant status updated to {status.value}"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update tenant status: {str(e)}"
        )

@router.get("/{tenant_id}/health", response_model=Dict[str, Any])
async def get_tenant_health(
    tenant_id: str = Depends(get_user_tenant_id),
    tenant_manager: TenantManager = Depends(get_tenant_manager)
):
    """Get tenant health status"""
    try:
        # Get tenant info
        tenant_info = await tenant_manager.get_tenant_info(tenant_id)
        if not tenant_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # Get quotas
        quotas = await tenant_manager.get_tenant_quotas(tenant_id)
        
        # Calculate health metrics
        quota_health = {}
        overall_health = "healthy"
        
        for quota in quotas:
            usage_percentage = (quota.current_usage / quota.quota_limit * 100) if quota.quota_limit > 0 else 0
            quota_health[quota.resource_type.value] = {
                "usage_percentage": round(usage_percentage, 2),
                "status": "warning" if usage_percentage > 80 else "healthy" if usage_percentage > 50 else "good"
            }
            
            if usage_percentage > 95:
                overall_health = "critical"
            elif usage_percentage > 80 and overall_health != "critical":
                overall_health = "warning"
        
        return {
            "tenant_id": tenant_id,
            "organization_name": tenant_info.organization_name,
            "status": tenant_info.tenant_status.value,
            "tier": tenant_info.tenant_tier.value,
            "overall_health": overall_health,
            "quota_health": quota_health,
            "last_updated": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get tenant health: {str(e)}"
        ) 