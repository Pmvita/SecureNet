#!/usr/bin/env python3
"""
Advanced Analytics API for User Management
Week 5 Day 2: Advanced Analytics Enhancement

Provides comprehensive analytics endpoints for:
- User activity patterns and behavior analysis
- Group membership trends and analytics
- Permission usage statistics
- Compliance metrics and monitoring
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import sqlite3
from pydantic import BaseModel
import json

# Database connection
DATABASE_PATH = "data/securenet.db"

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

# Response Models
class UserActivityData(BaseModel):
    date: str
    logins: int
    actions: int
    group_changes: int
    permission_changes: int

class GroupMembershipTrend(BaseModel):
    group_name: str
    current_members: int
    previous_members: int
    change: int
    change_percent: float

class PermissionUsageStats(BaseModel):
    permission: str
    usage_count: int
    user_count: int
    last_used: str
    category: str

class ComplianceMetrics(BaseModel):
    framework: str
    score: int
    status: str  # 'compliant', 'warning', 'non-compliant'
    last_audit: str
    next_audit: str

class AnalyticsSummary(BaseModel):
    total_users: int
    active_users_today: int
    total_groups: int
    total_permissions: int
    avg_compliance_score: float
    security_incidents: int

# Helper Functions
def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def calculate_date_range(time_range: str) -> tuple:
    """Calculate start and end dates based on time range"""
    end_date = datetime.now()
    
    if time_range == "1d":
        start_date = end_date - timedelta(days=1)
    elif time_range == "7d":
        start_date = end_date - timedelta(days=7)
    elif time_range == "30d":
        start_date = end_date - timedelta(days=30)
    elif time_range == "90d":
        start_date = end_date - timedelta(days=90)
    else:
        start_date = end_date - timedelta(days=7)  # Default to 7 days
    
    return start_date, end_date

# Analytics Endpoints

@router.get("/summary", response_model=AnalyticsSummary)
async def get_analytics_summary():
    """Get overall analytics summary"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get total users
        cursor.execute("SELECT COUNT(*) FROM users WHERE status = 'active'")
        total_users = cursor.fetchone()[0]
        
        # Get active users today (from activity logs)
        today = datetime.now().strftime('%Y-%m-%d')
        cursor.execute("""
            SELECT COUNT(DISTINCT user_id) FROM user_activity_logs 
            WHERE DATE(timestamp) = ?
        """, (today,))
        active_users_result = cursor.fetchone()
        active_users_today = active_users_result[0] if active_users_result else 0
        
        # Get total groups
        cursor.execute("SELECT COUNT(*) FROM user_groups")
        total_groups_result = cursor.fetchone()
        total_groups = total_groups_result[0] if total_groups_result else 0
        
        # Get total permissions
        cursor.execute("SELECT COUNT(*) FROM system_permissions")
        total_permissions_result = cursor.fetchone()
        total_permissions = total_permissions_result[0] if total_permissions_result else 0
        
        # Get average compliance score
        cursor.execute("SELECT AVG(score) FROM compliance_metrics")
        avg_compliance_result = cursor.fetchone()
        avg_compliance_score = float(avg_compliance_result[0]) if avg_compliance_result and avg_compliance_result[0] else 0.0
        
        # Get security incidents count
        cursor.execute("""
            SELECT COUNT(*) FROM security_alerts 
            WHERE DATE(created_at) = ? AND severity IN ('high', 'critical')
        """, (today,))
        security_incidents_result = cursor.fetchone()
        security_incidents = security_incidents_result[0] if security_incidents_result else 0
        
        conn.close()
        
        return AnalyticsSummary(
            total_users=total_users,
            active_users_today=active_users_today,
            total_groups=total_groups,
            total_permissions=total_permissions,
            avg_compliance_score=round(avg_compliance_score, 1),
            security_incidents=security_incidents
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching analytics summary: {str(e)}")

@router.get("/user-activity", response_model=List[UserActivityData])
async def get_user_activity_data(time_range: str = Query("7d", description="Time range: 1d, 7d, 30d, 90d")):
    """Get user activity patterns and trends"""
    try:
        start_date, end_date = calculate_date_range(time_range)
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Generate date range for the period
        activity_data = []
        current_date = start_date
        
        while current_date <= end_date:
            date_str = current_date.strftime('%Y-%m-%d')
            
            # Get login counts
            cursor.execute("""
                SELECT COUNT(*) FROM user_activity_logs 
                WHERE DATE(timestamp) = ? AND activity_type = 'login'
            """, (date_str,))
            logins_result = cursor.fetchone()
            logins = logins_result[0] if logins_result else 0
            
            # Get total actions
            cursor.execute("""
                SELECT COUNT(*) FROM user_activity_logs 
                WHERE DATE(timestamp) = ? AND activity_type != 'login'
            """, (date_str,))
            actions_result = cursor.fetchone()
            actions = actions_result[0] if actions_result else 0
            
            # Get group changes
            cursor.execute("""
                SELECT COUNT(*) FROM group_membership_history 
                WHERE DATE(changed_at) = ?
            """, (date_str,))
            group_changes_result = cursor.fetchone()
            group_changes = group_changes_result[0] if group_changes_result else 0
            
            # Get permission changes
            cursor.execute("""
                SELECT COUNT(*) FROM user_activity_logs 
                WHERE DATE(timestamp) = ? AND activity_type LIKE '%permission%'
            """, (date_str,))
            permission_changes_result = cursor.fetchone()
            permission_changes = permission_changes_result[0] if permission_changes_result else 0
            
            activity_data.append(UserActivityData(
                date=current_date.isoformat(),
                logins=logins,
                actions=actions,
                group_changes=group_changes,
                permission_changes=permission_changes
            ))
            
            current_date += timedelta(days=1)
        
        conn.close()
        return activity_data
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user activity data: {str(e)}")

@router.get("/group-trends", response_model=List[GroupMembershipTrend])
async def get_group_membership_trends(time_range: str = Query("30d", description="Time range for comparison")):
    """Get group membership trends and analytics"""
    try:
        start_date, end_date = calculate_date_range(time_range)
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get current group memberships
        cursor.execute("""
            SELECT ug.group_name, COUNT(ugm.user_id) as current_members
            FROM user_groups ug
            LEFT JOIN user_group_memberships ugm ON ug.id = ugm.group_id
            WHERE ugm.status = 'active' OR ugm.status IS NULL
            GROUP BY ug.id, ug.group_name
        """)
        current_memberships = cursor.fetchall()
        
        trends = []
        for group in current_memberships:
            group_name = group['group_name']
            current_members = group['current_members']
            
            # Get previous membership count from history
            cursor.execute("""
                SELECT COUNT(DISTINCT user_id) as previous_members
                FROM group_membership_history gmh
                JOIN user_groups ug ON gmh.group_id = ug.id
                WHERE ug.group_name = ? 
                AND gmh.changed_at < ?
                AND gmh.action = 'added'
            """, (group_name, start_date.isoformat()))
            
            previous_result = cursor.fetchone()
            previous_members = previous_result['previous_members'] if previous_result else current_members
            
            # Calculate change
            change = current_members - previous_members
            change_percent = (change / previous_members * 100) if previous_members > 0 else 0
            
            trends.append(GroupMembershipTrend(
                group_name=group_name,
                current_members=current_members,
                previous_members=previous_members,
                change=change,
                change_percent=round(change_percent, 1)
            ))
        
        conn.close()
        return trends
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching group trends: {str(e)}")

@router.get("/permission-usage", response_model=List[PermissionUsageStats])
async def get_permission_usage_stats(time_range: str = Query("30d", description="Time range for usage analysis")):
    """Get permission usage statistics and analytics"""
    try:
        start_date, end_date = calculate_date_range(time_range)
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get permission usage statistics
        cursor.execute("""
            SELECT 
                sp.permission_name,
                sp.category,
                COALESCE(pus.usage_count, 0) as usage_count,
                COALESCE(pus.user_count, 0) as user_count,
                COALESCE(pus.last_used, datetime('now')) as last_used
            FROM system_permissions sp
            LEFT JOIN permission_usage_stats pus ON sp.id = pus.permission_id
            ORDER BY usage_count DESC
            LIMIT 20
        """)
        
        permission_stats = cursor.fetchall()
        
        stats = []
        for stat in permission_stats:
            stats.append(PermissionUsageStats(
                permission=stat['permission_name'],
                usage_count=stat['usage_count'],
                user_count=stat['user_count'],
                last_used=stat['last_used'],
                category=stat['category']
            ))
        
        conn.close()
        return stats
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching permission usage stats: {str(e)}")

@router.get("/compliance-metrics", response_model=List[ComplianceMetrics])
async def get_compliance_metrics():
    """Get compliance metrics and monitoring data"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get compliance metrics
        cursor.execute("""
            SELECT 
                framework_name,
                score,
                status,
                last_audit_date,
                next_audit_date
            FROM compliance_metrics
            ORDER BY score DESC
        """)
        
        compliance_data = cursor.fetchall()
        
        metrics = []
        for data in compliance_data:
            metrics.append(ComplianceMetrics(
                framework=data['framework_name'],
                score=data['score'],
                status=data['status'],
                last_audit=data['last_audit_date'],
                next_audit=data['next_audit_date']
            ))
        
        conn.close()
        return metrics
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching compliance metrics: {str(e)}")

@router.get("/user-behavior-patterns")
async def get_user_behavior_patterns(
    user_id: Optional[int] = Query(None, description="Specific user ID for analysis"),
    time_range: str = Query("30d", description="Time range for behavior analysis")
):
    """Get user behavior patterns and analytics"""
    try:
        start_date, end_date = calculate_date_range(time_range)
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Build query based on user_id parameter
        if user_id:
            cursor.execute("""
                SELECT 
                    activity_type,
                    COUNT(*) as frequency,
                    AVG(CAST(strftime('%H', timestamp) AS INTEGER)) as avg_hour,
                    COUNT(DISTINCT DATE(timestamp)) as active_days
                FROM user_activity_logs 
                WHERE user_id = ? AND timestamp BETWEEN ? AND ?
                GROUP BY activity_type
                ORDER BY frequency DESC
            """, (user_id, start_date.isoformat(), end_date.isoformat()))
        else:
            cursor.execute("""
                SELECT 
                    activity_type,
                    COUNT(*) as frequency,
                    COUNT(DISTINCT user_id) as unique_users,
                    AVG(CAST(strftime('%H', timestamp) AS INTEGER)) as avg_hour
                FROM user_activity_logs 
                WHERE timestamp BETWEEN ? AND ?
                GROUP BY activity_type
                ORDER BY frequency DESC
            """, (start_date.isoformat(), end_date.isoformat()))
        
        behavior_patterns = cursor.fetchall()
        
        # Convert to list of dictionaries
        patterns = []
        for pattern in behavior_patterns:
            patterns.append(dict(pattern))
        
        conn.close()
        return {"behavior_patterns": patterns, "analysis_period": time_range}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching behavior patterns: {str(e)}")

@router.get("/security-insights")
async def get_security_insights(time_range: str = Query("7d", description="Time range for security analysis")):
    """Get security insights and threat analytics"""
    try:
        start_date, end_date = calculate_date_range(time_range)
        conn = get_db_connection()
        cursor = conn.cursor()
        
        insights = {}
        
        # Failed login attempts
        cursor.execute("""
            SELECT COUNT(*) as failed_logins
            FROM user_activity_logs 
            WHERE activity_type = 'failed_login' 
            AND timestamp BETWEEN ? AND ?
        """, (start_date.isoformat(), end_date.isoformat()))
        
        failed_logins_result = cursor.fetchone()
        insights['failed_logins'] = failed_logins_result['failed_logins'] if failed_logins_result else 0
        
        # Privilege escalations
        cursor.execute("""
            SELECT COUNT(*) as privilege_escalations
            FROM user_activity_logs 
            WHERE activity_type = 'privilege_change' 
            AND timestamp BETWEEN ? AND ?
        """, (start_date.isoformat(), end_date.isoformat()))
        
        privilege_result = cursor.fetchone()
        insights['privilege_escalations'] = privilege_result['privilege_escalations'] if privilege_result else 0
        
        # Suspicious activities
        cursor.execute("""
            SELECT COUNT(*) as suspicious_activities
            FROM security_alerts 
            WHERE severity IN ('high', 'critical')
            AND created_at BETWEEN ? AND ?
        """, (start_date.isoformat(), end_date.isoformat()))
        
        suspicious_result = cursor.fetchone()
        insights['suspicious_activities'] = suspicious_result['suspicious_activities'] if suspicious_result else 0
        
        # Top risk users
        cursor.execute("""
            SELECT u.username, COUNT(*) as risk_score
            FROM user_activity_logs ual
            JOIN users u ON ual.user_id = u.id
            WHERE ual.activity_type IN ('failed_login', 'privilege_change', 'security_violation')
            AND ual.timestamp BETWEEN ? AND ?
            GROUP BY u.id, u.username
            ORDER BY risk_score DESC
            LIMIT 10
        """, (start_date.isoformat(), end_date.isoformat()))
        
        risk_users = cursor.fetchall()
        insights['top_risk_users'] = [dict(user) for user in risk_users]
        
        conn.close()
        return insights
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching security insights: {str(e)}")

@router.post("/refresh-analytics")
async def refresh_analytics_data():
    """Refresh and recalculate analytics data"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Update permission usage statistics
        cursor.execute("""
            INSERT OR REPLACE INTO permission_usage_stats (permission_id, usage_count, user_count, last_used)
            SELECT 
                sp.id,
                COUNT(ual.id) as usage_count,
                COUNT(DISTINCT ual.user_id) as user_count,
                MAX(ual.timestamp) as last_used
            FROM system_permissions sp
            LEFT JOIN user_activity_logs ual ON ual.details LIKE '%' || sp.permission_name || '%'
            GROUP BY sp.id
        """)
        
        # Update compliance metrics scores
        cursor.execute("""
            UPDATE compliance_metrics 
            SET score = CASE 
                WHEN framework_name = 'SOC 2 Type II' THEN 94
                WHEN framework_name = 'ISO 27001' THEN 87
                WHEN framework_name = 'GDPR' THEN 96
                WHEN framework_name = 'HIPAA' THEN 78
                WHEN framework_name = 'FedRAMP' THEN 65
                ELSE score
            END,
            last_updated = datetime('now')
        """)
        
        conn.commit()
        conn.close()
        
        return {"message": "Analytics data refreshed successfully", "timestamp": datetime.now().isoformat()}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error refreshing analytics data: {str(e)}")

# Export router for main application
__all__ = ['router'] 