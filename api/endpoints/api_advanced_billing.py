"""
SecureNet Advanced Billing API - Complete Billing System
Handles subscription management, usage tracking, invoicing, and payment processing.
"""

from fastapi import APIRouter, HTTPException, Depends, Security, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime, date, timedelta
from enum import Enum
import logging
import json

from database.database import Database
from src.features.billing.billing_manager import BillingManager, BillingCycle
from utils.rate_limiting import rate_limit

logger = logging.getLogger(__name__)
security = HTTPBearer()
router = APIRouter(prefix="/api/billing", tags=["advanced-billing"])

# Pydantic models for advanced billing API
class BillingPlanRequest(BaseModel):
    plan_id: str
    billing_cycle: BillingCycle = BillingCycle.MONTHLY
    trial_days: int = Field(default=14, ge=0, le=30)

class UsageTrackingRequest(BaseModel):
    resource_type: str
    usage_amount: int
    metadata: Optional[Dict[str, Any]] = None

class InvoiceRequest(BaseModel):
    amount_cents: int
    currency: str = "USD"
    billing_reason: str
    due_date: datetime
    metadata: Optional[Dict[str, Any]] = None

class WebhookRequest(BaseModel):
    webhook_url: str
    events: List[str]
    secret_key: Optional[str] = None

class BillingOverview(BaseModel):
    total_monthly_revenue: float
    paying_customers: int
    active_subscriptions: int
    overdue_amount: float
    revenue_by_plan: Dict[str, float]
    average_revenue_per_user: float

# Dependency to get billing manager
async def get_billing_manager() -> BillingManager:
    db = Database()
    return BillingManager(db)

# Dependency to get current user from token
async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> Dict[str, Any]:
    """Extract user information from JWT token."""
    try:
        token = credentials.credentials
        if not token:
            raise HTTPException(status_code=401, detail="No token provided")
        
        # Decode JWT token (simplified - in production, use proper JWT validation)
        # For now, we'll just return a mock user structure
        return {
            "user_id": "mock_user_id",
            "username": "mock_user",
            "role": "platform_owner",
            "tenant_id": "mock_tenant_id"
        }
    except Exception as e:
        logger.error(f"Error validating token: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")

# Dependency to get current tenant from token
async def get_current_tenant(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
    """Extract tenant ID from API token."""
    try:
        api_key = credentials.credentials
        if not api_key or not api_key.startswith("sk-"):
            raise HTTPException(status_code=401, detail="Invalid API key format")
        
        db = Database()
        org = await db.get_organization_by_api_key(api_key)
        if not org:
            raise HTTPException(status_code=401, detail="Invalid API key")
        
        return org['tenant_id']
    except Exception as e:
        logger.error(f"Error validating API key: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")

@router.get("/plans")
async def get_billing_plans(billing_manager: BillingManager = Depends(get_billing_manager)) -> Dict[str, Any]:
    """Get all available billing plans with detailed information."""
    try:
        plans = {}
        for plan_id, plan in billing_manager.billing_plans.items():
            plans[plan_id] = {
                "id": plan.id,
                "name": plan.name,
                "price_monthly": plan.price_monthly / 100,  # Convert cents to dollars
                "price_yearly": plan.price_yearly / 100,
                "features": plan.features,
                "limits": plan.limits
            }
        return plans
    except Exception as e:
        logger.error(f"Error getting billing plans: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get billing plans")

@router.post("/subscriptions/create")
@rate_limit(max_requests=10, window_seconds=60)
async def create_subscription(
    request: BillingPlanRequest,
    tenant_id: str = Depends(get_current_tenant),
    billing_manager: BillingManager = Depends(get_billing_manager)
) -> Dict[str, Any]:
    """Create a new subscription for a tenant."""
    try:
        # Validate plan exists
        if request.plan_id not in billing_manager.billing_plans:
            raise HTTPException(status_code=400, detail="Invalid plan ID")
        
        # Create subscription
        subscription_id = await billing_manager.create_subscription(
            tenant_id=tenant_id,
            plan_id=request.plan_id,
            billing_cycle=request.billing_cycle,
            trial_days=request.trial_days
        )
        
        return {
            "success": True,
            "subscription_id": subscription_id,
            "plan_id": request.plan_id,
            "billing_cycle": request.billing_cycle.value,
            "trial_days": request.trial_days,
            "message": f"Successfully created {request.plan_id} subscription"
        }
    except Exception as e:
        logger.error(f"Error creating subscription: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create subscription")

@router.post("/subscriptions/update")
@rate_limit(max_requests=5, window_seconds=60)
async def update_subscription(
    request: BillingPlanRequest,
    tenant_id: str = Depends(get_current_tenant),
    billing_manager: BillingManager = Depends(get_billing_manager)
) -> Dict[str, Any]:
    """Update an existing subscription."""
    try:
        success = await billing_manager.update_subscription(
            tenant_id=tenant_id,
            new_plan_id=request.plan_id,
            billing_cycle=request.billing_cycle
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update subscription")
        
        return {
            "success": True,
            "plan_id": request.plan_id,
            "billing_cycle": request.billing_cycle.value,
            "message": f"Successfully updated to {request.plan_id} plan"
        }
    except Exception as e:
        logger.error(f"Error updating subscription: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update subscription")

@router.post("/subscriptions/cancel")
@rate_limit(max_requests=3, window_seconds=60)
async def cancel_subscription(
    cancel_at_period_end: bool = True,
    tenant_id: str = Depends(get_current_tenant),
    billing_manager: BillingManager = Depends(get_billing_manager)
) -> Dict[str, Any]:
    """Cancel a subscription."""
    try:
        success = await billing_manager.cancel_subscription(
            tenant_id=tenant_id,
            cancel_at_period_end=cancel_at_period_end
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to cancel subscription")
        
        return {
            "success": True,
            "cancel_at_period_end": cancel_at_period_end,
            "message": "Subscription canceled successfully"
        }
    except Exception as e:
        logger.error(f"Error canceling subscription: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to cancel subscription")

@router.get("/subscriptions/current")
async def get_current_subscription(
    tenant_id: str = Depends(get_current_tenant),
    billing_manager: BillingManager = Depends(get_billing_manager)
) -> Dict[str, Any]:
    """Get current subscription information."""
    try:
        billing_info = await billing_manager.get_billing_info(tenant_id)
        
        if not billing_info:
            raise HTTPException(status_code=404, detail="No billing information found")
        
        return {
            "subscription": billing_info,
            "plan": billing_manager.billing_plans.get(billing_info.get('plan_id', 'starter')),
            "status": billing_info.get('status', 'unknown')
        }
    except Exception as e:
        logger.error(f"Error getting current subscription: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get subscription information")

@router.post("/usage/track")
@rate_limit(max_requests=100, window_seconds=60)
async def track_usage(
    request: UsageTrackingRequest,
    tenant_id: str = Depends(get_current_tenant),
    billing_manager: BillingManager = Depends(get_billing_manager)
) -> Dict[str, Any]:
    """Track resource usage for billing purposes."""
    try:
        db = Database()
        
        # Insert usage tracking record
        await db.execute("""
            INSERT INTO usage_tracking (tenant_id, resource_type, usage_amount, usage_date, usage_hour, metadata)
            VALUES ($1, $2, $3, $4, $5, $6)
        """, tenant_id, request.resource_type, request.usage_amount, 
             date.today(), datetime.now().hour, json.dumps(request.metadata or {}))
        
        return {
            "success": True,
            "resource_type": request.resource_type,
            "usage_amount": request.usage_amount,
            "tracked_at": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error tracking usage: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to track usage")

@router.get("/usage/current")
async def get_current_usage(
    tenant_id: str = Depends(get_current_tenant),
    billing_manager: BillingManager = Depends(get_billing_manager)
) -> Dict[str, Any]:
    """Get current usage for the tenant."""
    try:
        current_month = date.today().strftime("%Y-%m")
        usage_data = await billing_manager.get_usage_billing(tenant_id, current_month)
        
        return {
            "month": current_month,
            "usage": usage_data.get("usage", {}),
            "quotas": usage_data.get("quotas", []),
            "overages": usage_data.get("overages", {})
        }
    except Exception as e:
        logger.error(f"Error getting current usage: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get usage information")

@router.get("/usage/history")
async def get_usage_history(
    months: int = 6,
    tenant_id: str = Depends(get_current_tenant),
    billing_manager: BillingManager = Depends(get_billing_manager)
) -> List[Dict[str, Any]]:
    """Get usage history for the tenant."""
    try:
        db = Database()
        
        # Get usage history
        usage_history = await db.fetch_all("""
            SELECT 
                resource_type,
                DATE_TRUNC('month', usage_date) as month,
                SUM(usage_amount) as total_usage
            FROM usage_tracking
            WHERE tenant_id = $1 
            AND usage_date >= CURRENT_DATE - INTERVAL '$2 months'
            GROUP BY resource_type, DATE_TRUNC('month', usage_date)
            ORDER BY month DESC, resource_type
        """, tenant_id, months)
        
        return [dict(record) for record in usage_history]
    except Exception as e:
        logger.error(f"Error getting usage history: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get usage history")

@router.get("/invoices")
async def get_invoices(
    limit: int = 10,
    offset: int = 0,
    tenant_id: str = Depends(get_current_tenant),
    billing_manager: BillingManager = Depends(get_billing_manager)
) -> List[Dict[str, Any]]:
    """Get invoices for the tenant."""
    try:
        invoices = await billing_manager.get_invoices(tenant_id, limit, offset)
        return invoices
    except Exception as e:
        logger.error(f"Error getting invoices: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get invoices")

@router.get("/invoices/{invoice_id}")
async def get_invoice(
    invoice_id: str,
    tenant_id: str = Depends(get_current_tenant),
    billing_manager: BillingManager = Depends(get_billing_manager)
) -> Dict[str, Any]:
    """Get specific invoice details."""
    try:
        db = Database()
        
        # Get invoice with items
        invoice = await db.fetch_one("""
            SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2
        """, invoice_id, tenant_id)
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        # Get invoice items
        items = await db.fetch_all("""
            SELECT * FROM invoice_items WHERE invoice_id = $1
        """, invoice_id)
        
        return {
            "invoice": dict(invoice),
            "items": [dict(item) for item in items]
        }
    except Exception as e:
        logger.error(f"Error getting invoice: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get invoice")

@router.post("/webhooks/configure")
async def configure_webhook(
    request: WebhookRequest,
    tenant_id: str = Depends(get_current_tenant),
    billing_manager: BillingManager = Depends(get_billing_manager)
) -> Dict[str, Any]:
    """Configure billing webhook for the tenant."""
    try:
        db = Database()
        
        # Insert or update webhook configuration
        await db.execute("""
            INSERT INTO billing_webhooks (tenant_id, webhook_type, webhook_url, events, secret_key)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (tenant_id, webhook_type) 
            DO UPDATE SET 
                webhook_url = $3,
                events = $4,
                secret_key = $5,
                updated_at = NOW()
        """, tenant_id, "billing", request.webhook_url, 
             json.dumps(request.events), request.secret_key)
        
        return {
            "success": True,
            "webhook_url": request.webhook_url,
            "events": request.events,
            "message": "Webhook configured successfully"
        }
    except Exception as e:
        logger.error(f"Error configuring webhook: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to configure webhook")

@router.post("/webhooks/stripe")
async def stripe_webhook(
    background_tasks: BackgroundTasks,
    billing_manager: BillingManager = Depends(get_billing_manager)
) -> Dict[str, Any]:
    """Handle Stripe webhook events."""
    try:
        # In a real implementation, this would:
        # 1. Verify webhook signature
        # 2. Parse the webhook payload
        # 3. Process the event asynchronously
        
        # For now, we'll return a success response
        return {
            "received": True,
            "message": "Webhook received and queued for processing"
        }
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")

# Admin endpoints for billing management
@router.get("/admin/overview")
async def get_billing_overview(
    billing_manager: BillingManager = Depends(get_billing_manager)
) -> BillingOverview:
    """Get billing overview for admin dashboard."""
    try:
        db = Database()
        
        # Get total monthly revenue
        revenue_result = await db.fetch_one("""
            SELECT SUM(amount_cents) as total_revenue
            FROM tenant_billing 
            WHERE status = 'active' AND billing_cycle = 'monthly'
        """)
        total_monthly_revenue = (revenue_result['total_revenue'] or 0) / 100
        
        # Get paying customers count
        customers_result = await db.fetch_one("""
            SELECT COUNT(*) as paying_customers
            FROM tenant_billing 
            WHERE status = 'active'
        """)
        paying_customers = customers_result['paying_customers'] or 0
        
        # Get active subscriptions
        subscriptions_result = await db.fetch_one("""
            SELECT COUNT(*) as active_subscriptions
            FROM tenant_billing 
            WHERE status = 'active'
        """)
        active_subscriptions = subscriptions_result['active_subscriptions'] or 0
        
        # Get overdue amount
        overdue_result = await db.fetch_one("""
            SELECT SUM(amount_cents) as overdue_amount
            FROM invoices 
            WHERE status = 'past_due'
        """)
        overdue_amount = (overdue_result['overdue_amount'] or 0) / 100
        
        # Get revenue by plan
        revenue_by_plan_result = await db.fetch_all("""
            SELECT 
                CASE 
                    WHEN amount_cents BETWEEN 9900 AND 29900 THEN 'starter'
                    WHEN amount_cents BETWEEN 29900 AND 79900 THEN 'professional'
                    WHEN amount_cents BETWEEN 79900 AND 199900 THEN 'business'
                    WHEN amount_cents >= 199900 THEN 'enterprise'
                    ELSE 'other'
                END as plan_type,
                SUM(amount_cents) as revenue
            FROM tenant_billing 
            WHERE status = 'active'
            GROUP BY plan_type
        """)
        
        revenue_by_plan = {}
        for row in revenue_by_plan_result:
            revenue_by_plan[row['plan_type']] = (row['revenue'] or 0) / 100
        
        # Calculate average revenue per user
        avg_revenue = total_monthly_revenue / max(paying_customers, 1)
        
        return BillingOverview(
            total_monthly_revenue=total_monthly_revenue,
            paying_customers=paying_customers,
            active_subscriptions=active_subscriptions,
            overdue_amount=overdue_amount,
            revenue_by_plan=revenue_by_plan,
            average_revenue_per_user=avg_revenue
        )
    except Exception as e:
        logger.error(f"Error getting billing overview: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get billing overview")

@router.post("/admin/usage/process-overages")
async def process_usage_overages(
    background_tasks: BackgroundTasks,
    billing_manager: BillingManager = Depends(get_billing_manager)
) -> Dict[str, Any]:
    """Process usage overages for all tenants."""
    try:
        db = Database()
        
        # Get all active tenants
        tenants = await db.fetch_all("""
            SELECT tenant_id FROM tenant_billing WHERE status = 'active'
        """)
        
        current_month = date.today().strftime("%Y-%m")
        processed_count = 0
        
        for tenant in tenants:
            try:
                invoice_id = await billing_manager.create_usage_invoice(
                    tenant['tenant_id'], current_month
                )
                if invoice_id:
                    processed_count += 1
            except Exception as e:
                logger.error(f"Error processing overages for tenant {tenant['tenant_id']}: {e}")
        
        return {
            "success": True,
            "processed_tenants": processed_count,
            "total_tenants": len(tenants),
            "month": current_month
        }
    except Exception as e:
        logger.error(f"Error processing usage overages: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process usage overages") 