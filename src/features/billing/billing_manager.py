"""
SecureNet Advanced Billing System
Phase 3: Production Platform - Advanced Billing System
"""

import stripe
import uuid
import os
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
from enum import Enum
import json
import logging
from dataclasses import dataclass

from database.database import Database
from src.features.multi_tenant.tenant_manager import TenantManager, TenantTier
from crypto.securenet_crypto import SecureNetCrypto

logger = logging.getLogger(__name__)

# Configure Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_...")  # Set from environment

class BillingStatus(Enum):
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    UNPAID = "unpaid"
    TRIALING = "trialing"
    INCOMPLETE = "incomplete"
    INCOMPLETE_EXPIRED = "incomplete_expired"

class BillingCycle(Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"

@dataclass
class BillingPlan:
    id: str
    name: str
    price_monthly: int  # in cents
    price_yearly: int   # in cents
    stripe_price_monthly: str
    stripe_price_yearly: str
    features: List[str]
    limits: Dict[str, int]

@dataclass
class Invoice:
    id: str
    tenant_id: str
    amount: int  # in cents
    currency: str
    status: str
    billing_reason: str
    created_at: datetime
    due_date: datetime
    paid_at: Optional[datetime] = None
    stripe_invoice_id: Optional[str] = None

class BillingManager:
    """Advanced billing management system for SecureNet"""
    
    def __init__(self, db: Database):
        self.db = db
        self.tenant_manager = TenantManager(db)
        
        # Define billing plans
        self.billing_plans = {
            "starter": BillingPlan(
                id="starter",
                name="Starter",
                price_monthly=9900,  # $99.00
                price_yearly=99000,  # $990.00
                stripe_price_monthly="price_starter_monthly",
                stripe_price_yearly="price_starter_yearly",
                features=[
                    "AI-powered threat detection",
                    "5 users included",
                    "25 devices",
                    "5GB storage",
                    "5,000 API calls/month",
                    "500 alerts/month",
                    "Email support",
                    "30-day log retention"
                ],
                limits={
                    "users": 5,
                    "devices": 25,
                    "storage_gb": 5,
                    "api_calls_per_month": 5000,
                    "alerts_per_month": 500
                }
            ),
            "professional": BillingPlan(
                id="professional",
                name="Professional",
                price_monthly=29900,  # $299.00
                price_yearly=299000,  # $2,990.00
                stripe_price_monthly="price_professional_monthly",
                stripe_price_yearly="price_professional_yearly",
                features=[
                    "Advanced AI threat detection",
                    "50 users",
                    "250 devices",
                    "25GB storage",
                    "25,000 API calls/month",
                    "2,500 alerts/month",
                    "Priority support",
                    "Compliance reporting",
                    "90-day log retention"
                ],
                limits={
                    "users": 50,
                    "devices": 250,
                    "storage_gb": 25,
                    "api_calls_per_month": 25000,
                    "alerts_per_month": 2500
                }
            ),
            "business": BillingPlan(
                id="business",
                name="Business",
                price_monthly=79900,  # $799.00
                price_yearly=799000,  # $7,990.00
                stripe_price_monthly="price_business_monthly",
                stripe_price_yearly="price_business_yearly",
                features=[
                    "Enterprise AI threat detection",
                    "500 users",
                    "2,500 devices",
                    "100GB storage",
                    "100,000 API calls/month",
                    "10,000 alerts/month",
                    "24/7 support",
                    "Custom integrations",
                    "Advanced analytics",
                    "Dedicated account manager"
                ],
                limits={
                    "users": 500,
                    "devices": 2500,
                    "storage_gb": 100,
                    "api_calls_per_month": 100000,
                    "alerts_per_month": 10000
                }
            ),
            "enterprise": BillingPlan(
                id="enterprise",
                name="Enterprise",
                price_monthly=199900,  # $1,999.00
                price_yearly=1999000,  # $19,990.00
                stripe_price_monthly="price_enterprise_monthly",
                stripe_price_yearly="price_enterprise_yearly",
                features=[
                    "Full enterprise security suite",
                    "1,000 users",
                    "5,000 devices",
                    "500GB storage",
                    "500,000 API calls/month",
                    "50,000 alerts/month",
                    "Dedicated support",
                    "Custom development",
                    "SLA guarantees",
                    "On-premise deployment"
                ],
                limits={
                    "users": 1000,
                    "devices": 5000,
                    "storage_gb": 500,
                    "api_calls_per_month": 500000,
                    "alerts_per_month": 50000
                }
            ),
            "msp": BillingPlan(
                id="msp",
                name="MSP Bundle",
                price_monthly=299900,  # $2,999.00
                price_yearly=2999000,  # $29,990.00
                stripe_price_monthly="price_msp_monthly",
                stripe_price_yearly="price_msp_yearly",
                features=[
                    "Complete MSP solution",
                    "1,000 users",
                    "10,000 devices",
                    "1TB storage",
                    "1,000,000 API calls/month",
                    "100,000 alerts/month",
                    "White-label options",
                    "Partner dashboard",
                    "Revenue sharing",
                    "Custom integrations"
                ],
                limits={
                    "users": 1000,
                    "devices": 10000,
                    "storage_gb": 1000,
                    "api_calls_per_month": 1000000,
                    "alerts_per_month": 100000
                }
            )
        }
    
    async def create_customer(self, tenant_id: str, email: str, name: str, 
                            phone: Optional[str] = None) -> str:
        """Create a Stripe customer for a tenant"""
        try:
            # Create Stripe customer
            customer = stripe.Customer.create(
                email=email,
                name=name,
                phone=phone,
                metadata={
                    "tenant_id": tenant_id,
                    "created_at": datetime.utcnow().isoformat()
                }
            )
            
            # Store customer ID in database
            await self.db.execute("""
                INSERT INTO tenant_billing (tenant_id, stripe_customer_id, created_at)
                VALUES ($1, $2, NOW())
                ON CONFLICT (tenant_id) 
                DO UPDATE SET stripe_customer_id = $2, updated_at = NOW()
            """, tenant_id, customer.id)
            
            logger.info(f"Created Stripe customer {customer.id} for tenant {tenant_id}")
            return customer.id
            
        except Exception as e:
            logger.error(f"Failed to create Stripe customer: {e}")
            raise
    
    async def create_subscription(self, tenant_id: str, plan_id: str, 
                                billing_cycle: BillingCycle, 
                                trial_days: int = 14) -> str:
        """Create a subscription for a tenant"""
        try:
            # Get tenant billing info
            billing_info = await self.db.fetch_one("""
                SELECT stripe_customer_id FROM tenant_billing WHERE tenant_id = $1
            """, tenant_id)
            
            if not billing_info or not billing_info['stripe_customer_id']:
                raise ValueError("No Stripe customer found for tenant")
            
            # Get billing plan
            plan = self.billing_plans.get(plan_id)
            if not plan:
                raise ValueError(f"Invalid plan ID: {plan_id}")
            
            # Determine Stripe price ID
            stripe_price_id = (plan.stripe_price_yearly if billing_cycle == BillingCycle.YEARLY 
                             else plan.stripe_price_monthly)
            
            # Create Stripe subscription
            subscription = stripe.Subscription.create(
                customer=billing_info['stripe_customer_id'],
                items=[{"price": stripe_price_id}],
                trial_period_days=trial_days,
                metadata={
                    "tenant_id": tenant_id,
                    "plan_id": plan_id,
                    "billing_cycle": billing_cycle.value
                }
            )
            
            # Update tenant billing info
            await self.db.execute("""
                UPDATE tenant_billing 
                SET stripe_subscription_id = $1, 
                    current_period_start = $2,
                    current_period_end = $3,
                    billing_cycle = $4,
                    amount_cents = $5,
                    status = $6,
                    updated_at = NOW()
                WHERE tenant_id = $7
            """, subscription.id, 
                 datetime.fromtimestamp(subscription.current_period_start),
                 datetime.fromtimestamp(subscription.current_period_end),
                 billing_cycle.value,
                 plan.price_yearly if billing_cycle == BillingCycle.YEARLY else plan.price_monthly,
                 subscription.status,
                 tenant_id)
            
            # Update tenant tier
            tier_mapping = {
                "starter": TenantTier.STARTER,
                "professional": TenantTier.PROFESSIONAL,
                "business": TenantTier.BUSINESS,
                "enterprise": TenantTier.ENTERPRISE,
                "msp": TenantTier.MSP
            }
            
            await self.tenant_manager.update_tenant_tier(tenant_id, tier_mapping[plan_id])
            
            logger.info(f"Created subscription {subscription.id} for tenant {tenant_id}")
            return subscription.id
            
        except Exception as e:
            logger.error(f"Failed to create subscription: {e}")
            raise
    
    async def cancel_subscription(self, tenant_id: str, cancel_at_period_end: bool = True) -> bool:
        """Cancel a tenant's subscription"""
        try:
            # Get subscription ID
            billing_info = await self.db.fetch_one("""
                SELECT stripe_subscription_id FROM tenant_billing WHERE tenant_id = $1
            """, tenant_id)
            
            if not billing_info or not billing_info['stripe_subscription_id']:
                raise ValueError("No subscription found for tenant")
            
            # Cancel Stripe subscription
            if cancel_at_period_end:
                subscription = stripe.Subscription.modify(
                    billing_info['stripe_subscription_id'],
                    cancel_at_period_end=True
                )
            else:
                subscription = stripe.Subscription.cancel(
                    billing_info['stripe_subscription_id']
                )
            
            # Update database
            await self.db.execute("""
                UPDATE tenant_billing 
                SET status = $1, updated_at = NOW()
                WHERE tenant_id = $2
            """, subscription.status, tenant_id)
            
            logger.info(f"Canceled subscription for tenant {tenant_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cancel subscription: {e}")
            return False
    
    async def update_subscription(self, tenant_id: str, new_plan_id: str, 
                                billing_cycle: BillingCycle) -> bool:
        """Update a tenant's subscription"""
        try:
            # Get current subscription
            billing_info = await self.db.fetch_one("""
                SELECT stripe_subscription_id FROM tenant_billing WHERE tenant_id = $1
            """, tenant_id)
            
            if not billing_info or not billing_info['stripe_subscription_id']:
                raise ValueError("No subscription found for tenant")
            
            # Get new plan
            plan = self.billing_plans.get(new_plan_id)
            if not plan:
                raise ValueError(f"Invalid plan ID: {new_plan_id}")
            
            # Determine new Stripe price ID
            stripe_price_id = (plan.stripe_price_yearly if billing_cycle == BillingCycle.YEARLY 
                             else plan.stripe_price_monthly)
            
            # Update Stripe subscription
            subscription = stripe.Subscription.modify(
                billing_info['stripe_subscription_id'],
                items=[{
                    "id": stripe.Subscription.retrieve(billing_info['stripe_subscription_id'])['data'][0]['id'],
                    "price": stripe_price_id
                }],
                proration_behavior='create_prorations',
                metadata={
                    "tenant_id": tenant_id,
                    "plan_id": new_plan_id,
                    "billing_cycle": billing_cycle.value
                }
            )
            
            # Update database
            await self.db.execute("""
                UPDATE tenant_billing 
                SET current_period_start = $1,
                    current_period_end = $2,
                    billing_cycle = $3,
                    amount_cents = $4,
                    status = $5,
                    updated_at = NOW()
                WHERE tenant_id = $6
            """, datetime.fromtimestamp(subscription.current_period_start),
                 datetime.fromtimestamp(subscription.current_period_end),
                 billing_cycle.value,
                 plan.price_yearly if billing_cycle == BillingCycle.YEARLY else plan.price_monthly,
                 subscription.status,
                 tenant_id)
            
            # Update tenant tier
            tier_mapping = {
                "starter": TenantTier.STARTER,
                "professional": TenantTier.PROFESSIONAL,
                "business": TenantTier.BUSINESS,
                "enterprise": TenantTier.ENTERPRISE,
                "msp": TenantTier.MSP
            }
            
            await self.tenant_manager.update_tenant_tier(tenant_id, tier_mapping[new_plan_id])
            
            logger.info(f"Updated subscription for tenant {tenant_id} to {new_plan_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update subscription: {e}")
            return False
    
    async def create_invoice(self, tenant_id: str, amount: int, currency: str = "usd",
                           billing_reason: str = "subscription_cycle") -> str:
        """Create an invoice for a tenant"""
        try:
            invoice_id = str(uuid.uuid4())
            
            # Get customer ID
            billing_info = await self.db.fetch_one("""
                SELECT stripe_customer_id FROM tenant_billing WHERE tenant_id = $1
            """, tenant_id)
            
            if not billing_info or not billing_info['stripe_customer_id']:
                raise ValueError("No Stripe customer found for tenant")
            
            # Create Stripe invoice
            stripe_invoice = stripe.Invoice.create(
                customer=billing_info['stripe_customer_id'],
                amount_due=amount,
                currency=currency,
                metadata={
                    "tenant_id": tenant_id,
                    "billing_reason": billing_reason
                }
            )
            
            # Store invoice in database
            await self.db.execute("""
                INSERT INTO invoices (id, tenant_id, amount_cents, currency, status, 
                                   billing_reason, created_at, due_date, stripe_invoice_id)
                VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8)
            """, invoice_id, tenant_id, amount, currency, stripe_invoice.status,
                 billing_reason, datetime.fromtimestamp(stripe_invoice.due_date),
                 stripe_invoice.id)
            
            logger.info(f"Created invoice {invoice_id} for tenant {tenant_id}")
            return invoice_id
            
        except Exception as e:
            logger.error(f"Failed to create invoice: {e}")
            raise
    
    async def get_billing_info(self, tenant_id: str) -> Optional[Dict]:
        """Get billing information for a tenant"""
        try:
            result = await self.db.fetch_one("""
                SELECT tb.*, o.name as organization_name, o.billing_email
                FROM tenant_billing tb
                JOIN organizations o ON tb.tenant_id = o.tenant_id
                WHERE tb.tenant_id = $1
            """, tenant_id)
            
            if result:
                return dict(result)
            return None
            
        except Exception as e:
            logger.error(f"Failed to get billing info: {e}")
            return None
    
    async def get_invoices(self, tenant_id: str, limit: int = 10, offset: int = 0) -> List[Dict]:
        """Get invoices for a tenant"""
        try:
            results = await self.db.fetch_all("""
                SELECT * FROM invoices 
                WHERE tenant_id = $1 
                ORDER BY created_at DESC 
                LIMIT $2 OFFSET $3
            """, tenant_id, limit, offset)
            
            return [dict(result) for result in results]
            
        except Exception as e:
            logger.error(f"Failed to get invoices: {e}")
            return []
    
    async def process_webhook(self, event_data: Dict) -> bool:
        """Process Stripe webhook events"""
        try:
            event_type = event_data.get('type')
            
            if event_type == 'invoice.payment_succeeded':
                await self._handle_payment_succeeded(event_data['data']['object'])
            elif event_type == 'invoice.payment_failed':
                await self._handle_payment_failed(event_data['data']['object'])
            elif event_type == 'customer.subscription.updated':
                await self._handle_subscription_updated(event_data['data']['object'])
            elif event_type == 'customer.subscription.deleted':
                await self._handle_subscription_deleted(event_data['data']['object'])
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to process webhook: {e}")
            return False
    
    async def _handle_payment_succeeded(self, invoice_data: Dict) -> None:
        """Handle successful payment"""
        tenant_id = invoice_data.get('metadata', {}).get('tenant_id')
        if not tenant_id:
            return
        
        # Update invoice status
        await self.db.execute("""
            UPDATE invoices 
            SET status = 'paid', paid_at = NOW()
            WHERE stripe_invoice_id = $1
        """, invoice_data['id'])
        
        # Update tenant billing status
        await self.db.execute("""
            UPDATE tenant_billing 
            SET status = 'active', updated_at = NOW()
            WHERE tenant_id = $1
        """, tenant_id)
        
        logger.info(f"Payment succeeded for tenant {tenant_id}")
    
    async def _handle_payment_failed(self, invoice_data: Dict) -> None:
        """Handle failed payment"""
        tenant_id = invoice_data.get('metadata', {}).get('tenant_id')
        if not tenant_id:
            return
        
        # Update invoice status
        await self.db.execute("""
            UPDATE invoices 
            SET status = 'failed'
            WHERE stripe_invoice_id = $1
        """, invoice_data['id'])
        
        # Update tenant billing status
        await self.db.execute("""
            UPDATE tenant_billing 
            SET status = 'past_due', updated_at = NOW()
            WHERE tenant_id = $1
        """, tenant_id)
        
        logger.warning(f"Payment failed for tenant {tenant_id}")
    
    async def _handle_subscription_updated(self, subscription_data: Dict) -> None:
        """Handle subscription update"""
        tenant_id = subscription_data.get('metadata', {}).get('tenant_id')
        if not tenant_id:
            return
        
        # Update tenant billing info
        await self.db.execute("""
            UPDATE tenant_billing 
            SET current_period_start = $1,
                current_period_end = $2,
                status = $3,
                updated_at = NOW()
            WHERE tenant_id = $4
        """, datetime.fromtimestamp(subscription_data['current_period_start']),
             datetime.fromtimestamp(subscription_data['current_period_end']),
             subscription_data['status'],
             tenant_id)
        
        logger.info(f"Subscription updated for tenant {tenant_id}")
    
    async def _handle_subscription_deleted(self, subscription_data: Dict) -> None:
        """Handle subscription deletion"""
        tenant_id = subscription_data.get('metadata', {}).get('tenant_id')
        if not tenant_id:
            return
        
        # Update tenant billing status
        await self.db.execute("""
            UPDATE tenant_billing 
            SET status = 'canceled', updated_at = NOW()
            WHERE tenant_id = $1
        """, tenant_id)
        
        # Suspend tenant
        await self.tenant_manager.update_tenant_status(tenant_id, "suspended")
        
        logger.info(f"Subscription canceled for tenant {tenant_id}")
    
    async def get_usage_billing(self, tenant_id: str, month: Optional[str] = None) -> Dict:
        """Calculate usage-based billing for a tenant"""
        try:
            if not month:
                month = date.today().strftime("%Y-%m")
            
            # Get tenant quotas and usage
            quotas = await self.tenant_manager.get_tenant_quotas(tenant_id)
            usage_logs = await self.db.fetch_all("""
                SELECT resource_type, SUM(usage_amount) as total_usage
                FROM tenant_usage_logs
                WHERE tenant_id = $1 AND DATE_TRUNC('month', usage_date) = DATE_TRUNC('month', $2::date)
                GROUP BY resource_type
            """, tenant_id, f"{month}-01")
            
            usage_data = {log['resource_type']: log['total_usage'] for log in usage_logs}
            
            # Calculate overages
            overages = {}
            for quota in quotas:
                current_usage = usage_data.get(quota.resource_type.value, 0)
                if current_usage > quota.quota_limit:
                    overages[quota.resource_type.value] = {
                        "limit": quota.quota_limit,
                        "usage": current_usage,
                        "overage": current_usage - quota.quota_limit
                    }
            
            return {
                "month": month,
                "quotas": [quota.__dict__ for quota in quotas],
                "usage": usage_data,
                "overages": overages
            }
            
        except Exception as e:
            logger.error(f"Failed to get usage billing: {e}")
            return {}
    
    async def create_usage_invoice(self, tenant_id: str, month: str) -> Optional[str]:
        """Create invoice for usage overages"""
        try:
            usage_data = await self.get_usage_billing(tenant_id, month)
            
            if not usage_data.get('overages'):
                return None
            
            # Calculate overage charges
            total_charge = 0
            overage_details = []
            
            # Define overage rates (in cents)
            overage_rates = {
                "users": 1000,      # $10 per additional user
                "devices": 500,     # $5 per additional device
                "storage_gb": 100,  # $1 per additional GB
                "api_calls": 1,     # $0.01 per additional API call
                "alerts_per_month": 10  # $0.10 per additional alert
            }
            
            for resource_type, overage in usage_data['overages'].items():
                rate = overage_rates.get(resource_type, 0)
                charge = overage['overage'] * rate
                total_charge += charge
                
                overage_details.append({
                    "resource_type": resource_type,
                    "overage": overage['overage'],
                    "rate": rate,
                    "charge": charge
                })
            
            if total_charge > 0:
                # Create invoice for overages
                invoice_id = await self.create_invoice(
                    tenant_id=tenant_id,
                    amount=total_charge,
                    billing_reason="usage_overage"
                )
                
                # Store overage details
                await self.db.execute("""
                    INSERT INTO invoice_items (invoice_id, description, amount_cents, quantity, metadata)
                    VALUES ($1, $2, $3, $4, $5)
                """, invoice_id, f"Usage overage for {month}", total_charge, 1,
                     json.dumps(overage_details))
                
                return invoice_id
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to create usage invoice: {e}")
            return None 