"""
SecureNet Admin API - Super Admin Interface
Handles platform administration, user management, and system oversight.
"""

from fastapi import APIRouter, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime
import logging
import os
from jose import JWTError, jwt

from database import Database, UserRole
from src.security import SECRET_KEY, ALGORITHM

logger = logging.getLogger(__name__)
security = HTTPBearer()
router = APIRouter(prefix="/api/admin", tags=["admin"])

# Pydantic models for admin API
class UserInfo(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    last_login: Optional[str]
    last_logout: Optional[str]
    login_count: int
    created_at: str
    organizations: List[str] = []

class OrganizationInfo(BaseModel):
    id: str
    name: str
    owner_email: str
    plan_type: str
    status: str
    device_limit: int
    user_count: int
    current_usage: Dict
    created_at: str
    updated_at: str

class AuditLogEntry(BaseModel):
    id: int
    timestamp: str
    level: str
    category: str
    source: str
    message: str
    metadata: Optional[str]
    organization_name: Optional[str]

class UserRoleUpdate(BaseModel):
    user_id: int
    new_role: str

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    plan_type: Optional[str] = None
    device_limit: Optional[int] = None

class CreateUserRequest(BaseModel):
    username: str
    email: str
    password: str
    role: str
    organization_id: Optional[str] = None

class UpdateUserRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

# Add after line 15
DEV_MODE = os.getenv("DEV_MODE", "true").lower() == "true"

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> Dict:
    """Verify JWT token and return user info."""
    # In development mode, return a dev superadmin user (skip JWT validation)
    if DEV_MODE:
        return {
            "id": 1,
            "username": "admin",
            "email": "admin@securenet.local",
            "role": "platform_owner",
            "last_login": datetime.now().isoformat()
        }
    
    try:
        # Extract token from credentials
        if not credentials:
            logger.error("No credentials provided")
            raise HTTPException(status_code=401, detail="Authorization header required")
        
        token = credentials.credentials
        if not token:
            logger.error("No token in credentials")
            raise HTTPException(status_code=401, detail="Token required")
        
        # First try JWT authentication (for frontend)
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            
            # Handle both username-based (sub) and user_id-based tokens
            user_id = payload.get("user_id")
            username = payload.get("sub")
            
            if not user_id and not username:
                logger.error(f"Invalid token payload: {payload}")
                raise HTTPException(status_code=401, detail="Invalid token payload")
            
            db = Database()
            
            # If we have user_id, use it directly
            if user_id:
                user = await db.get_user_with_session_info(user_id)
            # Otherwise, look up by username
            elif username:
                from app import get_user_by_username
                user = get_user_by_username(username)
                if user:
                    # Convert to the format expected by admin API
                    user = await db.get_user_with_session_info(user['id'])
            
            if not user:
                logger.error(f"User not found for user_id={user_id}, username={username}")
                raise HTTPException(status_code=401, detail="User not found")
            
            # Ensure the user has sufficient permissions for admin access
            allowed_admin_roles = ['platform_owner', 'security_admin', 'superadmin', 'manager', 'platform_admin']
            if user.get('role', '').lower() not in allowed_admin_roles:
                logger.error(f"Insufficient permissions for user {user.get('username')} with role {user.get('role')}")
                raise HTTPException(status_code=403, detail="Admin access required")
            
            return user
            
        except JWTError as e:
            logger.error(f"JWT validation error: {str(e)}")
            # Fall back to API key authentication (for API clients)
            if token.startswith("sk-"):
                db = Database()
                org = await db.get_organization_by_api_key(token)
                if not org:
                    raise HTTPException(status_code=401, detail="Invalid API key")
                
                # Return a superadmin user for API key access
                return {
                    'id': 1,
                    'role': 'platform_owner',
                    'username': 'api_access',
                    'email': 'api@securenet.com',
                    'organization_id': org['id']
                }
            else:
                raise HTTPException(status_code=401, detail="Invalid authentication token")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating authentication: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")

async def verify_superadmin_permission(user: Dict = Depends(get_current_user)) -> Dict:
    """Verify user has superadmin permissions."""
    user_role = user.get('role', '').lower()
    # Support both old and new role names for backward compatibility
    allowed_roles = ['platform_owner', 'security_admin', 'superadmin', 'manager', 'platform_admin', UserRole.PLATFORM_OWNER.value, UserRole.SECURITY_ADMIN.value]
    if user_role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Superadmin or Manager access required")
    return user

@router.get("/users", response_model=List[UserInfo])
async def get_all_users(
    org_filter: Optional[str] = None,
    role_filter: Optional[str] = None,
    user: Dict = Depends(verify_superadmin_permission)
) -> List[UserInfo]:
    """Get all users across all organizations with optional filtering (superadmin only)."""
    try:
        db = Database()
        users = await db.get_all_users_for_admin(user['role'])
        
        # Apply filters if provided
        if org_filter:
            users = [u for u in users if org_filter in u.get('organizations', [])]
        
        if role_filter and role_filter != 'all':
            users = [u for u in users if u.get('role') == role_filter]
        
        return [UserInfo(**user_data) for user_data in users]
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting all users: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get users")

@router.get("/organizations", response_model=List[OrganizationInfo])
async def get_all_organizations(user: Dict = Depends(verify_superadmin_permission)) -> List[OrganizationInfo]:
    """Get all organizations with usage statistics (superadmin only)."""
    try:
        db = Database()
        organizations = await db.get_all_organizations_for_admin(user['role'])
        
        return [OrganizationInfo(**org_data) for org_data in organizations]
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting all organizations: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get organizations")

@router.get("/organizations/{org_id}/users", response_model=List[UserInfo])
async def get_organization_users(
    org_id: str,
    user: Dict = Depends(verify_superadmin_permission)
) -> List[UserInfo]:
    """Get users for a specific organization (superadmin only)."""
    try:
        db = Database()
        users = await db.get_organization_users(org_id, user['role'])
        
        return [UserInfo(**user_data) for user_data in users]
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting organization users: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get organization users")

@router.put("/users/role")
async def update_user_role(
    role_update: UserRoleUpdate,
    user: Dict = Depends(verify_superadmin_permission)
) -> Dict:
    """Update user role (superadmin only)."""
    try:
        if role_update.new_role not in [role.value for role in UserRole]:
            raise HTTPException(status_code=400, detail="Invalid role")
        
        db = Database()
        success = await db.update_user_role(role_update.user_id, role_update.new_role)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update user role")
        
        # Log the role change for audit
        await db.store_log({
            'level': 'info',
            'category': 'admin',
            'source': 'admin_api',
            'message': f"User {role_update.user_id} role updated to {role_update.new_role}",
            'metadata': f'{{"admin_user_id": {user["id"]}, "target_user_id": {role_update.user_id}}}'
        })
        
        return {"success": True, "message": "User role updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user role: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update user role")

@router.put("/organizations/{org_id}")
async def update_organization(
    org_id: str,
    org_update: OrganizationUpdate,
    user: Dict = Depends(verify_superadmin_permission)
) -> Dict:
    """Update organization details (superadmin only)."""
    try:
        db = Database()
        
        # Update organization plan if specified
        if org_update.plan_type and org_update.device_limit:
            success = await db.update_organization_plan(
                org_id, 
                org_update.plan_type, 
                org_update.device_limit
            )
            if not success:
                raise HTTPException(status_code=500, detail="Failed to update organization plan")
        
        # Log the organization change for audit
        await db.store_log({
            'level': 'info',
            'category': 'admin',
            'source': 'admin_api',
            'message': f"Organization {org_id} updated",
            'metadata': f'{{"admin_user_id": {user["id"]}, "organization_id": "{org_id}", "changes": {org_update.dict(exclude_none=True)}}}'
        })
        
        return {"success": True, "message": "Organization updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating organization: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update organization")

@router.get("/audit-logs", response_model=List[AuditLogEntry])
async def get_audit_logs(
    limit: int = 100,
    user: Dict = Depends(verify_superadmin_permission)
) -> List[AuditLogEntry]:
    """Get system audit logs (superadmin only)."""
    try:
        db = Database()
        logs = await db.get_audit_logs(user['role'], limit)
        
        return [AuditLogEntry(**log_data) for log_data in logs]
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting audit logs: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get audit logs")

@router.get("/system/stats")
async def get_system_stats(user: Dict = Depends(verify_superadmin_permission)) -> Dict:
    """Get system-wide statistics (superadmin only)."""
    try:
        db = Database()
        
        # Get basic counts
        organizations = await db.get_all_organizations_for_admin(user['role'])
        users = await db.get_all_users_for_admin(user['role'])
        
        # Calculate statistics
        total_orgs = len(organizations)
        total_users = len(users)
        active_users = len([u for u in users if u['is_active']])
        
        # Plan distribution
        plan_distribution = {}
        total_devices = 0
        for org in organizations:
            plan = org['plan_type']
            plan_distribution[plan] = plan_distribution.get(plan, 0) + 1
            total_devices += org['current_usage']['device_count']
        
        # Role distribution
        role_distribution = {}
        for user_data in users:
            role = user_data['role']
            role_distribution[role] = role_distribution.get(role, 0) + 1
        
        return {
            "total_organizations": total_orgs,
            "total_users": total_users,
            "active_users": active_users,
            "total_devices": total_devices,
            "plan_distribution": plan_distribution,
            "role_distribution": role_distribution,
            "system_health": "operational",
            "last_updated": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting system stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get system statistics")

@router.get("/billing/overview")
async def get_billing_overview(user: Dict = Depends(verify_superadmin_permission)) -> Dict:
    """Get billing overview across all organizations (superadmin only)."""
    try:
        db = Database()
        organizations = await db.get_all_organizations_for_admin(user['role'])
        
        total_revenue = 0
        plan_revenue = {"free": 0, "pro": 0, "enterprise": 0}
        plan_prices = {"free": 0, "pro": 99, "enterprise": 499}
        
        for org in organizations:
            plan = org['plan_type']
            monthly_revenue = plan_prices.get(plan, 0)
            total_revenue += monthly_revenue
            plan_revenue[plan] += monthly_revenue
        
        return {
            "total_monthly_revenue": total_revenue,
            "revenue_by_plan": plan_revenue,
            "total_organizations": len(organizations),
            "paying_customers": len([o for o in organizations if o['plan_type'] != 'free']),
            "average_revenue_per_user": total_revenue / len(organizations) if organizations else 0,
            "last_updated": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting billing overview: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get billing overview")

@router.post("/impersonate/{user_id}")
async def impersonate_user(
    user_id: int,
    user: Dict = Depends(verify_superadmin_permission)
) -> Dict:
    """Generate impersonation token for user (superadmin only)."""
    try:
        db = Database()
        target_user = await db.get_user_with_session_info(user_id)
        
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Log the impersonation for audit
        await db.store_log({
            'level': 'warning',
            'category': 'admin',
            'source': 'admin_api',
            'message': f"Superadmin impersonating user {user_id}",
            'metadata': f'{{"admin_user_id": {user["id"]}, "target_user_id": {user_id}}}'
        })
        
        # In a real implementation, you'd generate a special impersonation JWT
        # For now, return user info for frontend to handle
        return {
            "impersonation_token": f"impersonate_{user_id}_{datetime.now().timestamp()}",
            "target_user": target_user,
            "expires_in": 3600,  # 1 hour
            "warning": "Impersonation session active"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating impersonation session: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create impersonation session")

@router.post("/users")
async def create_user(
    user_data: CreateUserRequest,
    user: Dict = Depends(verify_superadmin_permission)
) -> Dict:
    """Create a new user (superadmin only)."""
    try:
        # Validate role
        if user_data.role not in [role.value for role in UserRole]:
            raise HTTPException(status_code=400, detail="Invalid role")
        
        db = Database()
        
        # Check if user already exists
        existing_user = db.get_user_by_username(user_data.username)
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")
        
        # Check if email already exists
        existing_email = await db.get_user_by_email(user_data.email)
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already exists")
        
        # Create user
        user_id = await db.create_user_admin(
            username=user_data.username,
            email=user_data.email,
            password=user_data.password,
            role=user_data.role,
            organization_id=user_data.organization_id
        )
        
        if not user_id:
            raise HTTPException(status_code=500, detail="Failed to create user")
        
        # Log the user creation for audit
        await db.store_log({
            'level': 'info',
            'category': 'admin',
            'source': 'admin_api',
            'message': f"User created: {user_data.username} (ID: {user_id})",
            'metadata': f'{{"admin_user_id": {user["id"]}, "created_user_id": {user_id}, "role": "{user_data.role}"}}'
        })
        
        return {
            "success": True, 
            "message": "User created successfully",
            "user_id": user_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create user")

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    user: Dict = Depends(verify_superadmin_permission)
) -> Dict:
    """Delete a user (superadmin only)."""
    try:
        db = Database()
        
        # Get user info before deletion for logging
        target_user = await db.get_user_with_session_info(user_id)
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prevent deletion of superadmin users for safety
        if target_user['role'] == UserRole.PLATFORM_OWNER.value:
            raise HTTPException(status_code=400, detail="Cannot delete superadmin users")
        
        # Delete user
        success = await db.delete_user_admin(user_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete user")
        
        # Log the user deletion for audit
        await db.store_log({
            'level': 'warning',
            'category': 'admin',
            'source': 'admin_api',
            'message': f"User deleted: {target_user['username']} (ID: {user_id})",
            'metadata': f'{{"admin_user_id": {user["id"]}, "deleted_user_id": {user_id}, "deleted_username": "{target_user["username"]}"}}'
        })
        
        return {"success": True, "message": "User deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete user")

@router.patch("/users/{user_id}")
async def update_user(
    user_id: int,
    user_data: UpdateUserRequest,
    user: Dict = Depends(verify_superadmin_permission)
) -> Dict:
    """Update user information (superadmin only)."""
    try:
        db = Database()
        
        # Validate role if provided
        if user_data.role and user_data.role not in [role.value for role in UserRole]:
            raise HTTPException(status_code=400, detail="Invalid role")
        
        # Get existing user
        existing_user = await db.get_user_with_session_info(user_id)
        if not existing_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update user
        success = await db.update_user_admin(user_id, user_data.dict(exclude_none=True))
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update user")
        
        # Log the user update for audit
        changes = user_data.dict(exclude_none=True)
        await db.store_log({
            'level': 'info',
            'category': 'admin',
            'source': 'admin_api',
            'message': f"User updated: {existing_user['username']} (ID: {user_id})",
            'metadata': f'{{"admin_user_id": {user["id"]}, "updated_user_id": {user_id}, "changes": {changes}}}'
        })
        
        return {"success": True, "message": "User updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update user") 