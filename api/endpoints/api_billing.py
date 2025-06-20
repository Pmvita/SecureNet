"""
SecureNet Billing API - Multi-Tenant SaaS Billing System
Handles subscription plans, usage tracking, and billing management.
"""

from fastapi import APIRouter, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime
import logging

from database.database import Database, PlanType

logger = logging.getLogger(__name__)
security = HTTPBearer()
router = APIRouter(prefix="/api/billing", tags=["billing"])

# Pydantic models for billing API
class SubscriptionPlan(BaseModel):
    name: str
    price_monthly: float
    price_yearly: float
    device_limit: int
    scan_limit: int
    log_retention_days: int
    features: List[str]

class UsageReport(BaseModel):
    organization_id: str
    month: str
    device_count: int
    scan_count: int
    log_count: int
    api_requests: int
    overage_charges: float

class PlanUpgradeRequest(BaseModel):
    plan_type: str
    billing_cycle: str = "monthly"  # monthly or yearly

# Subscription plan definitions
SUBSCRIPTION_PLANS = {
    "free": SubscriptionPlan(
        name="Free",
        price_monthly=0.0,
        price_yearly=0.0,
        device_limit=5,
        scan_limit=10,
        log_retention_days=7,
        features=["Basic network scanning", "Email alerts", "7-day log retention"]
    ),
    "pro": SubscriptionPlan(
        name="Professional",
        price_monthly=99.0,
        price_yearly=990.0,
        device_limit=50,
        scan_limit=500,
        log_retention_days=30,
        features=[
            "Advanced vulnerability scanning", 
            "ML anomaly detection",
            "Slack/Teams integration",
            "30-day log retention",
            "Custom dashboards",
            "API access"
        ]
    ),
    "enterprise": SubscriptionPlan(
        name="Enterprise",
        price_monthly=499.0,
        price_yearly=4990.0,
        device_limit=1000,
        scan_limit=10000,
        log_retention_days=365,
        features=[
            "Unlimited vulnerability scanning",
            "Advanced ML threat detection",
            "Full integrations suite",
            "1-year log retention",
            "White-label options",
            "Dedicated support",
            "Compliance reporting",
            "On-premise deployment"
        ]
    )
}

async def get_organization_from_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
    """Extract organization ID from API token."""
    try:
        api_key = credentials.credentials
        if not api_key or not api_key.startswith("sk-"):
            raise HTTPException(status_code=401, detail="Invalid API key format")
        
        db = Database()
        org = await db.get_organization_by_api_key(api_key)
        if not org:
            raise HTTPException(status_code=401, detail="Invalid API key")
        
        return org['id']
    except Exception as e:
        logger.error(f"Error validating API key: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")

@router.get("/plans")
async def get_subscription_plans() -> Dict[str, SubscriptionPlan]:
    """Get all available subscription plans."""
    return SUBSCRIPTION_PLANS

@router.get("/usage")
async def get_usage_report(
    months: int = 12,
    org_id: str = Depends(get_organization_from_token)
) -> List[UsageReport]:
    """Get billing usage report for organization."""
    try:
        db = Database()
        usage_data = await db.get_billing_usage(org_id, months)
        
        reports = []
        for usage in usage_data:
            # Calculate overage charges based on plan limits
            org = await db.get_organization_by_api_key(org_id)  # This needs the API key, will fix
            plan = SUBSCRIPTION_PLANS.get(org.get('plan_type', 'free'))
            
            overage_charges = 0.0
            if plan:
                if usage['device_count'] > plan.device_limit:
                    overage_charges += (usage['device_count'] - plan.device_limit) * 5.0  # $5 per extra device
                if usage['scan_count'] > plan.scan_limit:
                    overage_charges += (usage['scan_count'] - plan.scan_limit) * 0.10  # $0.10 per extra scan
            
            reports.append(UsageReport(
                organization_id=org_id,
                month=usage['month'],
                device_count=usage['device_count'],
                scan_count=usage['scan_count'],
                log_count=usage['log_count'],
                api_requests=usage['api_requests'],
                overage_charges=overage_charges
            ))
        
        return reports
    except Exception as e:
        logger.error(f"Error getting usage report: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get usage report")

@router.get("/current-plan")
async def get_current_plan(org_id: str = Depends(get_organization_from_token)) -> Dict:
    """Get current subscription plan for organization."""
    try:
        db = Database()
        
        # Get organization details - need to modify this to work with org_id
        query = "SELECT plan_type, device_limit, status FROM organizations WHERE id = ?"
        async with db.get_db_async() as conn:
            cursor = await conn.execute(query, (org_id,))
            org_row = await cursor.fetchone()
        
        if not org_row:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        plan_type, device_limit, status = org_row
        plan = SUBSCRIPTION_PLANS.get(plan_type)
        
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        # Get current usage
        usage = await db.get_organization_usage(org_id)
        
        return {
            "plan": plan.dict(),
            "status": status,
            "current_usage": usage,
            "within_limits": usage.get('device_count', 0) <= device_limit
        }
    except Exception as e:
        logger.error(f"Error getting current plan: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get current plan")

@router.post("/upgrade")
async def upgrade_plan(
    upgrade_request: PlanUpgradeRequest,
    org_id: str = Depends(get_organization_from_token)
) -> Dict:
    """Upgrade organization subscription plan."""
    try:
        if upgrade_request.plan_type not in SUBSCRIPTION_PLANS:
            raise HTTPException(status_code=400, detail="Invalid plan type")
        
        plan = SUBSCRIPTION_PLANS[upgrade_request.plan_type]
        
        db = Database()
        success = await db.update_organization_plan(
            org_id, 
            upgrade_request.plan_type, 
            plan.device_limit
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to upgrade plan")
        
        # In a real implementation, this would integrate with Stripe/payment processor
        logger.info(f"Organization {org_id} upgraded to {upgrade_request.plan_type}")
        
        return {
            "success": True,
            "plan": plan.dict(),
            "billing_cycle": upgrade_request.billing_cycle,
            "effective_date": datetime.now().isoformat(),
            "message": f"Successfully upgraded to {plan.name} plan"
        }
    except Exception as e:
        logger.error(f"Error upgrading plan: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upgrade plan")

@router.post("/webhook/stripe")
async def stripe_webhook(webhook_data: Dict) -> Dict:
    """Handle Stripe webhook events for billing updates."""
    try:
        # In a real implementation, this would:
        # 1. Verify webhook signature
        # 2. Handle subscription events (created, updated, deleted)
        # 3. Update organization status based on payment status
        # 4. Send notifications for billing events
        
        event_type = webhook_data.get("type")
        logger.info(f"Received Stripe webhook: {event_type}")
        
        if event_type == "invoice.payment_succeeded":
            # Handle successful payment
            customer_id = webhook_data.get("data", {}).get("object", {}).get("customer")
            # Update organization status to active
            
        elif event_type == "invoice.payment_failed":
            # Handle failed payment
            customer_id = webhook_data.get("data", {}).get("object", {}).get("customer")
            # Suspend organization or send warning
            
        elif event_type == "customer.subscription.deleted":
            # Handle subscription cancellation
            customer_id = webhook_data.get("data", {}).get("object", {}).get("customer")
            # Downgrade to free plan
        
        return {"received": True}
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")

@router.get("/invoice/{invoice_id}")
async def get_invoice(
    invoice_id: str,
    org_id: str = Depends(get_organization_from_token)
) -> Dict:
    """Get invoice details (placeholder for Stripe integration)."""
    try:
        # In a real implementation, this would fetch from Stripe
        return {
            "invoice_id": invoice_id,
            "organization_id": org_id,
            "status": "paid",
            "amount": 99.00,
            "period": "2024-01-01 to 2024-01-31",
            "download_url": f"https://billing.securenet.ai/invoices/{invoice_id}.pdf"
        }
    except Exception as e:
        logger.error(f"Error getting invoice: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get invoice")

@router.get("/limits/check")
async def check_limits(org_id: str = Depends(get_organization_from_token)) -> Dict:
    """Check if organization is within subscription limits."""
    try:
        db = Database()
        limits_check = await db.check_organization_limits(org_id)
        return limits_check
    except Exception as e:
        logger.error(f"Error checking limits: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to check limits") 