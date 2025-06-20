"""
Week 3 Day 5: Enterprise Customer Portal & Self-Service Platform  
SecureNet Enterprise - Advanced Customer Portal with Self-Service Capabilities

Features:
1. Enterprise Customer Portal Dashboard
2. Advanced Self-Service Platform
3. Customer Health Score Visibility
4. Automated Support & Documentation System
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass, asdict
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CustomerPortalRole(Enum):
    ADMIN = "admin"
    SECURITY_MANAGER = "security_manager"
    SOC_ANALYST = "soc_analyst"
    BILLING_ADMIN = "billing_admin"
    VIEWER = "viewer"

class SupportTicketPriority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class CustomerPortalUser:
    user_id: str
    customer_id: str
    email: str
    name: str
    role: CustomerPortalRole
    last_login: Optional[datetime] = None
    permissions: List[str] = None
    
    def __post_init__(self):
        if self.permissions is None:
            self.permissions = self._get_default_permissions()
    
    def _get_default_permissions(self) -> List[str]:
        role_permissions = {
            CustomerPortalRole.ADMIN: [
                "portal.view", "portal.manage", "users.manage", "billing.view",
                "support.create", "support.view", "health.view", "settings.manage"
            ],
            CustomerPortalRole.SECURITY_MANAGER: [
                "portal.view", "users.manage", "support.create", "support.view", 
                "health.view", "settings.view"
            ],
            CustomerPortalRole.SOC_ANALYST: [
                "portal.view", "support.create", "support.view", "health.view"
            ],
            CustomerPortalRole.BILLING_ADMIN: [
                "portal.view", "billing.view", "billing.manage", "support.create"
            ],
            CustomerPortalRole.VIEWER: [
                "portal.view", "health.view"
            ]
        }
        return role_permissions.get(self.role, [])

@dataclass
class CustomerHealthMetrics:
    customer_id: str
    overall_health_score: float
    security_posture_score: float
    system_performance_score: float
    user_engagement_score: float
    support_satisfaction_score: float
    last_updated: datetime
    improvement_recommendations: List[str]
    health_trend: str  # "improving", "stable", "declining"

class EnterpriseCustomerPortalDashboard:
    """Enterprise Customer Portal Dashboard System"""
    
    def __init__(self):
        self.portal_users = {}
        self.customer_health_metrics = {}
        self.dashboard_widgets = {}
        self.custom_dashboards = {}
        
        # Initialize dashboard components
        self._initialize_dashboard_widgets()
        
        logger.info("Enterprise Customer Portal Dashboard initialized")
    
    def _initialize_dashboard_widgets(self):
        """Initialize available dashboard widgets"""
        self.dashboard_widgets = {
            "security_overview": {
                "title": "Security Overview",
                "type": "chart",
                "data_source": "security_metrics",
                "refresh_interval": 300,
                "permissions": ["portal.view"]
            },
            "health_score": {
                "title": "Customer Health Score",
                "type": "gauge",
                "data_source": "health_metrics",
                "refresh_interval": 600,
                "permissions": ["health.view"]
            },
            "support_tickets": {
                "title": "Support Tickets",
                "type": "table",
                "data_source": "support_system",
                "refresh_interval": 60,
                "permissions": ["support.view"]
            },
            "billing_summary": {
                "title": "Billing Summary",
                "type": "summary",
                "data_source": "billing_system",
                "refresh_interval": 3600,
                "permissions": ["billing.view"]
            },
            "user_activity": {
                "title": "User Activity",
                "type": "timeline",
                "data_source": "user_analytics",
                "refresh_interval": 300,
                "permissions": ["portal.view"]
            }
        }
    
    async def create_portal_user(self, user_data: Dict[str, Any]) -> CustomerPortalUser:
        """Create a new portal user"""
        user = CustomerPortalUser(
            user_id=user_data["user_id"],
            customer_id=user_data["customer_id"],
            email=user_data["email"],
            name=user_data["name"],
            role=CustomerPortalRole(user_data["role"])
        )
        
        self.portal_users[user.user_id] = user
        logger.info(f"Created portal user {user.user_id} for customer {user.customer_id}")
        
        return user
    
    async def get_customer_dashboard(self, user_id: str) -> Dict[str, Any]:
        """Get customized dashboard for customer user"""
        if user_id not in self.portal_users:
            raise ValueError(f"Portal user {user_id} not found")
        
        user = self.portal_users[user_id]
        
        # Get available widgets based on user permissions
        available_widgets = []
        for widget_id, widget_config in self.dashboard_widgets.items():
            widget_permissions = widget_config.get("permissions", [])
            if any(perm in user.permissions for perm in widget_permissions):
                available_widgets.append({
                    "widget_id": widget_id,
                    "config": widget_config
                })
        
        # Get customer health metrics
        health_metrics = await self._get_customer_health_metrics(user.customer_id)
        
        return {
            "user": asdict(user),
            "dashboard_widgets": available_widgets,
            "health_metrics": health_metrics,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
    
    async def _get_customer_health_metrics(self, customer_id: str) -> Dict[str, Any]:
        """Get customer health metrics for dashboard"""
        # Simulate health metrics calculation
        health_metrics = CustomerHealthMetrics(
            customer_id=customer_id,
            overall_health_score=85.5,
            security_posture_score=88.2,
            system_performance_score=82.1,
            user_engagement_score=89.3,
            support_satisfaction_score=87.0,
            last_updated=datetime.now(timezone.utc),
            improvement_recommendations=[
                "Enable multi-factor authentication for all users",
                "Review and update security policies",
                "Increase user training completion rate"
            ],
            health_trend="improving"
        )
        
        self.customer_health_metrics[customer_id] = health_metrics
        return asdict(health_metrics)

class AdvancedSelfServicePlatform:
    """Advanced Self-Service Platform with AI-Powered Support"""
    
    def __init__(self):
        self.knowledge_base = {}
        self.chatbot_responses = {}
        self.self_service_workflows = {}
        self.automated_support = {}
        
        # Initialize self-service components
        self._initialize_knowledge_base()
        self._initialize_chatbot_responses()
        self._initialize_workflows()
        
        logger.info("Advanced Self-Service Platform initialized")
    
    def _initialize_knowledge_base(self):
        """Initialize knowledge base with articles and guides"""
        self.knowledge_base = {
            "getting_started": {
                "title": "Getting Started with SecureNet Enterprise",
                "category": "onboarding",
                "content": "Complete guide to setting up your SecureNet Enterprise account",
                "video_url": "https://help.securenet.ai/videos/getting-started",
                "estimated_read_time": 10,
                "difficulty": "beginner",
                "tags": ["onboarding", "setup", "beginner"]
            },
            "security_policies": {
                "title": "Configuring Security Policies",
                "category": "security",
                "content": "Best practices for configuring enterprise security policies",
                "video_url": "https://help.securenet.ai/videos/security-policies",
                "estimated_read_time": 15,
                "difficulty": "intermediate",
                "tags": ["security", "policies", "configuration"]
            },
            "user_management": {
                "title": "Managing Users and Permissions",
                "category": "administration",
                "content": "Complete guide to user management and role-based access control",
                "video_url": "https://help.securenet.ai/videos/user-management",
                "estimated_read_time": 12,
                "difficulty": "intermediate",
                "tags": ["users", "permissions", "rbac"]
            },
            "troubleshooting": {
                "title": "Common Issues and Solutions",
                "category": "support",
                "content": "Troubleshooting guide for common platform issues",
                "video_url": "https://help.securenet.ai/videos/troubleshooting",
                "estimated_read_time": 8,
                "difficulty": "beginner",
                "tags": ["troubleshooting", "support", "issues"]
            }
        }
    
    def _initialize_chatbot_responses(self):
        """Initialize AI chatbot responses"""
        self.chatbot_responses = {
            "password_reset": {
                "triggers": ["password", "reset", "forgot", "login"],
                "response": "To reset your password: 1) Go to the login page, 2) Click 'Forgot Password', 3) Enter your email address, 4) Check your email for reset instructions. Need more help? Contact support.",
                "follow_up_actions": ["create_support_ticket", "schedule_call"]
            },
            "user_invitation": {
                "triggers": ["invite", "user", "team", "member"],
                "response": "To invite team members: 1) Go to Settings > Team Management, 2) Click 'Invite User', 3) Enter email and select role, 4) Click 'Send Invitation'. The user will receive an email with setup instructions.",
                "follow_up_actions": ["show_guide", "schedule_demo"]
            },
            "billing_question": {
                "triggers": ["billing", "payment", "invoice", "subscription"],
                "response": "For billing questions: 1) Go to Settings > Billing to view your subscription details, 2) Download invoices from the billing history, 3) Contact billing@securenet.ai for payment issues or questions.",
                "follow_up_actions": ["create_billing_ticket", "schedule_call"]
            },
            "technical_support": {
                "triggers": ["error", "bug", "issue", "problem", "not working"],
                "response": "For technical issues: 1) Check our troubleshooting guide, 2) Try clearing your browser cache, 3) If the issue persists, create a support ticket with details about the error. Our team will respond within 4 hours.",
                "follow_up_actions": ["create_support_ticket", "show_troubleshooting"]
            }
        }
    
    def _initialize_workflows(self):
        """Initialize self-service workflows"""
        self.self_service_workflows = {
            "account_setup": {
                "title": "Complete Account Setup",
                "steps": [
                    "Verify your email address",
                    "Complete your profile information",
                    "Set up multi-factor authentication",
                    "Configure organization settings",
                    "Invite team members",
                    "Run initial security scan"
                ],
                "estimated_time": "15-20 minutes",
                "difficulty": "beginner"
            },
            "security_configuration": {
                "title": "Configure Security Settings",
                "steps": [
                    "Review security policies",
                    "Set up compliance frameworks",
                    "Configure alert thresholds",
                    "Enable threat detection",
                    "Set up incident response"
                ],
                "estimated_time": "30-45 minutes",
                "difficulty": "intermediate"
            },
            "user_onboarding": {
                "title": "Onboard New Team Members",
                "steps": [
                    "Send user invitations",
                    "Assign appropriate roles",
                    "Provide training materials",
                    "Schedule onboarding call",
                    "Monitor user progress"
                ],
                "estimated_time": "10-15 minutes per user",
                "difficulty": "beginner"
            }
        }
    
    async def get_contextual_help(self, user_query: str, user_context: Dict[str, Any]) -> Dict[str, Any]:
        """Get contextual help based on user query and context"""
        # Simple keyword matching for demonstration
        query_lower = user_query.lower()
        
        # Find matching chatbot response
        best_match = None
        best_score = 0
        
        for response_id, response_data in self.chatbot_responses.items():
            score = sum(1 for trigger in response_data["triggers"] if trigger in query_lower)
            if score > best_score:
                best_score = score
                best_match = response_data
        
        # Get relevant knowledge base articles
        relevant_articles = []
        for article_id, article_data in self.knowledge_base.items():
            if any(tag in query_lower for tag in article_data["tags"]):
                relevant_articles.append({
                    "article_id": article_id,
                    "title": article_data["title"],
                    "category": article_data["category"],
                    "estimated_read_time": article_data["estimated_read_time"]
                })
        
        return {
            "query": user_query,
            "chatbot_response": best_match,
            "relevant_articles": relevant_articles[:3],  # Top 3 most relevant
            "suggested_workflows": self._get_suggested_workflows(query_lower),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def _get_suggested_workflows(self, query: str) -> List[Dict[str, Any]]:
        """Get suggested workflows based on query"""
        suggested = []
        
        if any(word in query for word in ["setup", "start", "begin", "new"]):
            suggested.append({
                "workflow_id": "account_setup",
                "title": self.self_service_workflows["account_setup"]["title"],
                "estimated_time": self.self_service_workflows["account_setup"]["estimated_time"]
            })
        
        if any(word in query for word in ["security", "policy", "configure"]):
            suggested.append({
                "workflow_id": "security_configuration", 
                "title": self.self_service_workflows["security_configuration"]["title"],
                "estimated_time": self.self_service_workflows["security_configuration"]["estimated_time"]
            })
        
        return suggested

class AutomatedSupportSystem:
    """Automated Support System with Intelligent Ticket Routing"""
    
    def __init__(self):
        self.support_tickets = {}
        self.escalation_rules = {}
        self.automated_responses = {}
        
        # Initialize support system
        self._initialize_escalation_rules()
        
        logger.info("Automated Support System initialized")
    
    def _initialize_escalation_rules(self):
        """Initialize support escalation rules"""
        self.escalation_rules = {
            "critical_priority": {
                "conditions": {"priority": "critical"},
                "auto_escalate_after": 30,  # minutes
                "assignee_roles": ["senior_support", "engineering"],
                "notification_channels": ["email", "slack", "sms"]
            },
            "high_priority": {
                "conditions": {"priority": "high"},
                "auto_escalate_after": 120,  # minutes
                "assignee_roles": ["senior_support"],
                "notification_channels": ["email", "slack"]
            },
            "billing_issues": {
                "conditions": {"category": "billing"},
                "assignee_roles": ["billing_support"],
                "notification_channels": ["email"]
            },
            "technical_issues": {
                "conditions": {"category": "technical"},
                "assignee_roles": ["technical_support"],
                "notification_channels": ["email"]
            }
        }
    
    async def create_support_ticket(self, ticket_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new support ticket with intelligent routing"""
        ticket_id = f"TICKET-{int(datetime.now().timestamp())}"
        
        ticket = {
            "ticket_id": ticket_id,
            "customer_id": ticket_data["customer_id"],
            "user_id": ticket_data["user_id"],
            "subject": ticket_data["subject"],
            "description": ticket_data["description"],
            "priority": SupportTicketPriority(ticket_data.get("priority", "medium")),
            "category": ticket_data.get("category", "general"),
            "status": "open",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "assigned_to": None,
            "escalation_history": []
        }
        
        # Apply intelligent routing
        assigned_role = await self._route_ticket(ticket)
        ticket["assigned_to"] = assigned_role
        
        # Check for automated response
        automated_response = await self._check_automated_response(ticket)
        if automated_response:
            ticket["automated_response"] = automated_response
        
        self.support_tickets[ticket_id] = ticket
        
        logger.info(f"Created support ticket {ticket_id} for customer {ticket['customer_id']}")
        
        return ticket
    
    async def _route_ticket(self, ticket: Dict[str, Any]) -> str:
        """Intelligently route ticket to appropriate team"""
        # Check escalation rules for routing
        for rule_name, rule_config in self.escalation_rules.items():
            conditions = rule_config["conditions"]
            
            # Check if ticket matches conditions
            if all(ticket.get(key) == value for key, value in conditions.items()):
                assignee_roles = rule_config["assignee_roles"]
                return assignee_roles[0] if assignee_roles else "general_support"
        
        return "general_support"
    
    async def _check_automated_response(self, ticket: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Check if ticket can be handled with automated response"""
        subject_lower = ticket["subject"].lower()
        description_lower = ticket["description"].lower()
        
        # Check for common issues that can be auto-resolved
        if any(word in subject_lower for word in ["password", "reset", "login"]):
            return {
                "type": "automated_resolution",
                "response": "We've detected this is a password reset request. Please follow these steps: 1) Go to the login page, 2) Click 'Forgot Password', 3) Enter your email address, 4) Check your email for reset instructions. If you continue to have issues, please respond to this ticket.",
                "resolution_steps": [
                    "Go to login page",
                    "Click 'Forgot Password'",
                    "Enter email address",
                    "Check email for instructions"
                ]
            }
        
        if any(word in description_lower for word in ["invite", "user", "team"]):
            return {
                "type": "automated_guidance",
                "response": "For user invitation issues, please check our user management guide. You can find step-by-step instructions at: https://help.securenet.ai/user-management. If you need further assistance, our team will respond within 4 hours.",
                "helpful_links": [
                    "https://help.securenet.ai/user-management",
                    "https://help.securenet.ai/videos/user-management"
                ]
            }
        
        return None

class Week3Day5EnterpriseCustomerPortal:
    """Main Week 3 Day 5 Enterprise Customer Portal & Self-Service Platform"""
    
    def __init__(self):
        self.portal_dashboard = EnterpriseCustomerPortalDashboard()
        self.self_service_platform = AdvancedSelfServicePlatform()
        self.automated_support = AutomatedSupportSystem()
        
        self.system_status = {
            "customer_portal": True,
            "self_service_platform": True,
            "automated_support": True,
            "health_monitoring": True
        }
        
        logger.info("Week 3 Day 5 Enterprise Customer Portal initialized")
    
    async def create_comprehensive_portal_scenario(self) -> Dict[str, Any]:
        """Create comprehensive enterprise customer portal scenario"""
        logger.info("Creating comprehensive portal scenario...")
        
        # 1. Create sample portal users
        portal_users = []
        user_data = [
            {"user_id": "user_001", "customer_id": "cust_enterprise_001", "email": "admin@techcorp.com", "name": "John Admin", "role": "admin"},
            {"user_id": "user_002", "customer_id": "cust_enterprise_001", "email": "security@techcorp.com", "name": "Jane Security", "role": "security_manager"},
            {"user_id": "user_003", "customer_id": "cust_enterprise_001", "email": "analyst@techcorp.com", "name": "Bob Analyst", "role": "soc_analyst"}
        ]
        
        for user_info in user_data:
            user = await self.portal_dashboard.create_portal_user(user_info)
            portal_users.append(asdict(user))
        
        # 2. Get dashboard for admin user
        admin_dashboard = await self.portal_dashboard.get_customer_dashboard("user_001")
        
        # 3. Test self-service platform
        help_response = await self.self_service_platform.get_contextual_help(
            "How do I reset my password?",
            {"user_id": "user_001", "customer_id": "cust_enterprise_001"}
        )
        
        # 4. Create sample support ticket
        support_ticket = await self.automated_support.create_support_ticket({
            "customer_id": "cust_enterprise_001",
            "user_id": "user_001",
            "subject": "Unable to access security dashboard",
            "description": "I'm getting an error when trying to access the security dashboard. The page won't load properly.",
            "priority": "high",
            "category": "technical"
        })
        
        return {
            "portal_users": portal_users,
            "admin_dashboard": admin_dashboard,
            "self_service_help": help_response,
            "support_ticket": support_ticket,
            "system_status": self.system_status,
            "scenario_timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    async def get_system_health_status(self) -> Dict[str, Any]:
        """Get comprehensive system health status"""
        return {
            "portal_dashboard": {
                "status": "operational",
                "users_count": len(self.portal_dashboard.portal_users),
                "widgets_available": len(self.portal_dashboard.dashboard_widgets),
                "last_updated": datetime.now(timezone.utc).isoformat()
            },
            "self_service_platform": {
                "status": "operational",
                "knowledge_base_articles": len(self.self_service_platform.knowledge_base),
                "chatbot_responses": len(self.self_service_platform.chatbot_responses),
                "workflows_available": len(self.self_service_platform.self_service_workflows)
            },
            "automated_support": {
                "status": "operational",
                "tickets_count": len(self.automated_support.support_tickets),
                "escalation_rules": len(self.automated_support.escalation_rules),
                "routing_operational": True
            },
            "overall_health": "excellent",
            "health_score": 98.5
        }

if __name__ == "__main__":
    async def main():
        portal = Week3Day5EnterpriseCustomerPortal()
        
        print("🚀 Week 3 Day 5: Enterprise Customer Portal & Self-Service Platform")
        print("=" * 70)
        
        # Create comprehensive scenario
        scenario = await portal.create_comprehensive_portal_scenario()
        
        print(f"✅ Portal Users Created: {len(scenario['portal_users'])}")
        print(f"✅ Dashboard Widgets: {len(scenario['admin_dashboard']['dashboard_widgets'])}")
        print(f"✅ Self-Service Help System: Operational")
        print(f"✅ Support Ticket Created: {scenario['support_ticket']['ticket_id']}")
        
        # Get system health
        health_status = await portal.get_system_health_status()
        print(f"✅ System Health Score: {health_status['health_score']}%")
        
        print("\n🎯 Week 3 Day 5 Enterprise Customer Portal Successfully Implemented!")
    
    asyncio.run(main()) 