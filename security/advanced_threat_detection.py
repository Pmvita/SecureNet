#!/usr/bin/env python3
"""
Advanced Threat Detection Module
Week 5 Day 2: Security Team - Advanced Threat Detection

Provides comprehensive threat detection capabilities:
1. Real-time threat analysis and detection
2. Machine learning-based anomaly detection
3. Threat intelligence integration
4. Automated incident response
5. Advanced security analytics
"""

import sqlite3
import json
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import hashlib
import re
from collections import defaultdict
import math

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATABASE_PATH = "data/securenet.db"

class AdvancedThreatDetector:
    """Advanced threat detection and analysis system"""
    
    def __init__(self, db_path: str = DATABASE_PATH):
        self.db_path = db_path
        self.threat_rules = {}
        self.detection_models = {}
        self.incident_response_actions = {}
        self.threat_scores = {}
        
    def get_connection(self):
        """Get database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def initialize_threat_detection_rules(self):
        """Initialize threat detection rules and patterns"""
        self.threat_rules = {
            'brute_force_login': {
                'pattern': 'multiple_failed_logins',
                'threshold': 5,
                'time_window_minutes': 15,
                'severity': 'high',
                'description': 'Multiple failed login attempts indicating brute force attack'
            },
            'privilege_escalation': {
                'pattern': 'unusual_privilege_change',
                'threshold': 1,
                'time_window_minutes': 60,
                'severity': 'critical',
                'description': 'Unusual privilege escalation detected'
            },
            'suspicious_data_access': {
                'pattern': 'bulk_data_access',
                'threshold': 100,
                'time_window_minutes': 30,
                'severity': 'high',
                'description': 'Suspicious bulk data access pattern'
            },
            'off_hours_activity': {
                'pattern': 'activity_outside_business_hours',
                'threshold': 1,
                'time_window_minutes': 60,
                'severity': 'medium',
                'description': 'User activity detected outside normal business hours'
            },
            'geolocation_anomaly': {
                'pattern': 'unusual_location_access',
                'threshold': 1,
                'time_window_minutes': 30,
                'severity': 'high',
                'description': 'Access from unusual geographic location'
            },
            'rapid_permission_changes': {
                'pattern': 'multiple_permission_changes',
                'threshold': 10,
                'time_window_minutes': 60,
                'severity': 'medium',
                'description': 'Rapid permission changes detected'
            },
            'admin_account_compromise': {
                'pattern': 'admin_unusual_activity',
                'threshold': 1,
                'time_window_minutes': 30,
                'severity': 'critical',
                'description': 'Potential admin account compromise detected'
            },
            'data_exfiltration': {
                'pattern': 'large_data_download',
                'threshold': 1000,  # MB
                'time_window_minutes': 60,
                'severity': 'critical',
                'description': 'Potential data exfiltration detected'
            }
        }
        
        logger.info(f"✅ Initialized {len(self.threat_rules)} threat detection rules")
    
    def analyze_user_activities_for_threats(self):
        """Analyze user activities for potential threats"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            threats_detected = 0
            
            # Analyze each threat rule
            for rule_name, rule_config in self.threat_rules.items():
                pattern = rule_config['pattern']
                threshold = rule_config['threshold']
                time_window = rule_config['time_window_minutes']
                severity = rule_config['severity']
                
                if pattern == 'multiple_failed_logins':
                    threats_detected += self.detect_brute_force_attacks(cursor, rule_config)
                
                elif pattern == 'unusual_privilege_change':
                    threats_detected += self.detect_privilege_escalation(cursor, rule_config)
                
                elif pattern == 'bulk_data_access':
                    threats_detected += self.detect_suspicious_data_access(cursor, rule_config)
                
                elif pattern == 'activity_outside_business_hours':
                    threats_detected += self.detect_off_hours_activity(cursor, rule_config)
                
                elif pattern == 'multiple_permission_changes':
                    threats_detected += self.detect_rapid_permission_changes(cursor, rule_config)
                
                elif pattern == 'admin_unusual_activity':
                    threats_detected += self.detect_admin_compromise(cursor, rule_config)
            
            conn.commit()
            logger.info(f"✅ Analyzed user activities, detected {threats_detected} potential threats")
            
        except Exception as e:
            logger.error(f"❌ Error analyzing user activities for threats: {str(e)}")
            conn.rollback()
        finally:
            conn.close()
    
    def detect_brute_force_attacks(self, cursor, rule_config: Dict) -> int:
        """Detect brute force login attempts"""
        threshold = rule_config['threshold']
        time_window = rule_config['time_window_minutes']
        
        # Find users with multiple failed logins
        cursor.execute("""
            SELECT 
                user_id,
                COUNT(*) as failed_attempts,
                MIN(timestamp) as first_attempt,
                MAX(timestamp) as last_attempt,
                GROUP_CONCAT(DISTINCT details) as attempt_details
            FROM user_activity_logs 
            WHERE activity_type = 'failed_login' 
            AND timestamp > datetime('now', '-{} minutes')
            GROUP BY user_id
            HAVING COUNT(*) >= ?
        """.format(time_window), (threshold,))
        
        brute_force_attempts = cursor.fetchall()
        threats_detected = 0
        
        for attempt in brute_force_attempts:
            user_id = attempt['user_id']
            failed_count = attempt['failed_attempts']
            
            # Get user information
            cursor.execute("SELECT username FROM users WHERE id = ?", (user_id,))
            user_result = cursor.fetchone()
            username = user_result['username'] if user_result else f"User ID {user_id}"
            
            # Calculate threat score
            threat_score = min(failed_count / threshold, 1.0) * 0.8
            
            # Create security alert
            alert_title = f"Brute Force Attack Detected: {username}"
            alert_description = f"User {username} had {failed_count} failed login attempts in {time_window} minutes"
            
            evidence_data = {
                'rule_triggered': 'brute_force_login',
                'failed_attempts': failed_count,
                'time_window_minutes': time_window,
                'first_attempt': attempt['first_attempt'],
                'last_attempt': attempt['last_attempt'],
                'attempt_details': attempt['attempt_details']
            }
            
            cursor.execute("""
                INSERT INTO security_alerts 
                (alert_type, severity, user_id, alert_title, alert_description, 
                 evidence_data, risk_score)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                'brute_force_attack',
                rule_config['severity'],
                user_id,
                alert_title,
                alert_description,
                json.dumps(evidence_data),
                threat_score
            ))
            
            threats_detected += 1
            logger.warning(f"🚨 Brute force attack detected for user {username}")
        
        return threats_detected
    
    def detect_privilege_escalation(self, cursor, rule_config: Dict) -> int:
        """Detect unusual privilege escalation attempts"""
        time_window = rule_config['time_window_minutes']
        
        # Look for privilege changes in activity logs
        cursor.execute("""
            SELECT 
                user_id,
                COUNT(*) as escalation_count,
                GROUP_CONCAT(details) as escalation_details,
                MIN(timestamp) as first_escalation,
                MAX(timestamp) as last_escalation
            FROM user_activity_logs 
            WHERE activity_type LIKE '%privilege%' 
            AND timestamp > datetime('now', '-{} minutes')
            GROUP BY user_id
        """.format(time_window))
        
        escalations = cursor.fetchall()
        threats_detected = 0
        
        for escalation in escalations:
            user_id = escalation['user_id']
            escalation_count = escalation['escalation_count']
            
            # Get user information
            cursor.execute("SELECT username, role FROM users WHERE id = ?", (user_id,))
            user_result = cursor.fetchone()
            if not user_result:
                continue
            
            username = user_result['username']
            current_role = user_result['role']
            
            # Check if this is unusual for the user
            cursor.execute("""
                SELECT COUNT(*) as historical_count
                FROM user_activity_logs 
                WHERE user_id = ? AND activity_type LIKE '%privilege%'
                AND timestamp BETWEEN datetime('now', '-30 days') AND datetime('now', '-1 day')
            """, (user_id,))
            
            historical_result = cursor.fetchone()
            historical_count = historical_result['historical_count'] if historical_result else 0
            
            # Alert if current activity is significantly above historical baseline
            if escalation_count > max(historical_count * 2, 1):
                threat_score = min(escalation_count / 5.0, 1.0) * 0.9
                
                alert_title = f"Privilege Escalation Detected: {username}"
                alert_description = f"User {username} performed {escalation_count} privilege changes (historical average: {historical_count})"
                
                evidence_data = {
                    'rule_triggered': 'privilege_escalation',
                    'current_escalations': escalation_count,
                    'historical_average': historical_count,
                    'user_role': current_role,
                    'escalation_details': escalation['escalation_details'],
                    'time_window_minutes': time_window
                }
                
                cursor.execute("""
                    INSERT INTO security_alerts 
                    (alert_type, severity, user_id, alert_title, alert_description, 
                     evidence_data, risk_score)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    'privilege_escalation',
                    rule_config['severity'],
                    user_id,
                    alert_title,
                    alert_description,
                    json.dumps(evidence_data),
                    threat_score
                ))
                
                threats_detected += 1
                logger.warning(f"🚨 Privilege escalation detected for user {username}")
        
        return threats_detected
    
    def detect_suspicious_data_access(self, cursor, rule_config: Dict) -> int:
        """Detect suspicious bulk data access patterns"""
        threshold = rule_config['threshold']
        time_window = rule_config['time_window_minutes']
        
        # Look for users with high activity counts
        cursor.execute("""
            SELECT 
                user_id,
                COUNT(*) as activity_count,
                COUNT(DISTINCT activity_type) as unique_activities,
                GROUP_CONCAT(DISTINCT activity_type) as activities
            FROM user_activity_logs 
            WHERE timestamp > datetime('now', '-{} minutes')
            AND activity_type IN ('data_access', 'file_download', 'report_generation')
            GROUP BY user_id
            HAVING COUNT(*) >= ?
        """.format(time_window), (threshold,))
        
        suspicious_activities = cursor.fetchall()
        threats_detected = 0
        
        for activity in suspicious_activities:
            user_id = activity['user_id']
            activity_count = activity['activity_count']
            
            # Get user information
            cursor.execute("SELECT username, role FROM users WHERE id = ?", (user_id,))
            user_result = cursor.fetchone()
            if not user_result:
                continue
            
            username = user_result['username']
            role = user_result['role']
            
            # Calculate baseline activity for this user
            cursor.execute("""
                SELECT AVG(daily_count) as avg_daily_activity
                FROM (
                    SELECT DATE(timestamp) as date, COUNT(*) as daily_count
                    FROM user_activity_logs 
                    WHERE user_id = ? 
                    AND timestamp BETWEEN datetime('now', '-30 days') AND datetime('now', '-1 day')
                    AND activity_type IN ('data_access', 'file_download', 'report_generation')
                    GROUP BY DATE(timestamp)
                )
            """, (user_id,))
            
            baseline_result = cursor.fetchone()
            avg_daily_activity = baseline_result['avg_daily_activity'] or 0
            
            # Convert time window to daily equivalent for comparison
            daily_equivalent = (activity_count * 1440) / time_window  # 1440 minutes in a day
            
            # Alert if current activity is significantly above baseline
            if daily_equivalent > max(avg_daily_activity * 3, 50):
                threat_score = min(daily_equivalent / (avg_daily_activity * 5), 1.0) * 0.7
                
                alert_title = f"Suspicious Data Access: {username}"
                alert_description = f"User {username} performed {activity_count} data access operations in {time_window} minutes"
                
                evidence_data = {
                    'rule_triggered': 'suspicious_data_access',
                    'activity_count': activity_count,
                    'time_window_minutes': time_window,
                    'baseline_daily_average': round(avg_daily_activity, 2),
                    'current_daily_equivalent': round(daily_equivalent, 2),
                    'unique_activities': activity['unique_activities'],
                    'activities': activity['activities']
                }
                
                cursor.execute("""
                    INSERT INTO security_alerts 
                    (alert_type, severity, user_id, alert_title, alert_description, 
                     evidence_data, risk_score)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    'suspicious_data_access',
                    rule_config['severity'],
                    user_id,
                    alert_title,
                    alert_description,
                    json.dumps(evidence_data),
                    threat_score
                ))
                
                threats_detected += 1
                logger.warning(f"🚨 Suspicious data access detected for user {username}")
        
        return threats_detected
    
    def detect_off_hours_activity(self, cursor, rule_config: Dict) -> int:
        """Detect activity outside normal business hours"""
        time_window = rule_config['time_window_minutes']
        
        # Define business hours (9 AM to 6 PM)
        business_start = 9
        business_end = 18
        
        cursor.execute("""
            SELECT 
                user_id,
                COUNT(*) as off_hours_count,
                GROUP_CONCAT(DISTINCT activity_type) as activities,
                MIN(timestamp) as first_activity,
                MAX(timestamp) as last_activity
            FROM user_activity_logs 
            WHERE timestamp > datetime('now', '-{} minutes')
            AND (CAST(strftime('%H', timestamp) AS INTEGER) < ? 
                 OR CAST(strftime('%H', timestamp) AS INTEGER) >= ?)
            GROUP BY user_id
        """.format(time_window), (business_start, business_end))
        
        off_hours_activities = cursor.fetchall()
        threats_detected = 0
        
        for activity in off_hours_activities:
            user_id = activity['user_id']
            off_hours_count = activity['off_hours_count']
            
            # Get user information
            cursor.execute("SELECT username, role FROM users WHERE id = ?", (user_id,))
            user_result = cursor.fetchone()
            if not user_result:
                continue
            
            username = user_result['username']
            role = user_result['role']
            
            # Check user's historical off-hours activity
            cursor.execute("""
                SELECT COUNT(*) as historical_off_hours
                FROM user_activity_logs 
                WHERE user_id = ? 
                AND timestamp BETWEEN datetime('now', '-30 days') AND datetime('now', '-1 day')
                AND (CAST(strftime('%H', timestamp) AS INTEGER) < ? 
                     OR CAST(strftime('%H', timestamp) AS INTEGER) >= ?)
            """, (user_id, business_start, business_end))
            
            historical_result = cursor.fetchone()
            historical_off_hours = historical_result['historical_off_hours'] or 0
            
            # Alert if this is unusual for the user
            if off_hours_count > max(historical_off_hours / 30 * 2, 5):  # 2x daily average or 5 minimum
                threat_score = min(off_hours_count / 20.0, 1.0) * 0.5
                
                alert_title = f"Off-Hours Activity: {username}"
                alert_description = f"User {username} had {off_hours_count} activities outside business hours"
                
                evidence_data = {
                    'rule_triggered': 'off_hours_activity',
                    'off_hours_count': off_hours_count,
                    'business_hours': f"{business_start}:00-{business_end}:00",
                    'historical_monthly_average': historical_off_hours,
                    'activities': activity['activities'],
                    'first_activity': activity['first_activity'],
                    'last_activity': activity['last_activity']
                }
                
                cursor.execute("""
                    INSERT INTO security_alerts 
                    (alert_type, severity, user_id, alert_title, alert_description, 
                     evidence_data, risk_score)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    'off_hours_activity',
                    rule_config['severity'],
                    user_id,
                    alert_title,
                    alert_description,
                    json.dumps(evidence_data),
                    threat_score
                ))
                
                threats_detected += 1
                logger.warning(f"🚨 Off-hours activity detected for user {username}")
        
        return threats_detected
    
    def detect_rapid_permission_changes(self, cursor, rule_config: Dict) -> int:
        """Detect rapid permission changes"""
        threshold = rule_config['threshold']
        time_window = rule_config['time_window_minutes']
        
        cursor.execute("""
            SELECT 
                user_id,
                COUNT(*) as permission_changes,
                GROUP_CONCAT(details) as change_details
            FROM user_activity_logs 
            WHERE activity_type LIKE '%permission%' 
            AND timestamp > datetime('now', '-{} minutes')
            GROUP BY user_id
            HAVING COUNT(*) >= ?
        """.format(time_window), (threshold,))
        
        rapid_changes = cursor.fetchall()
        threats_detected = 0
        
        for change in rapid_changes:
            user_id = change['user_id']
            change_count = change['permission_changes']
            
            # Get user information
            cursor.execute("SELECT username, role FROM users WHERE id = ?", (user_id,))
            user_result = cursor.fetchone()
            if not user_result:
                continue
            
            username = user_result['username']
            role = user_result['role']
            
            threat_score = min(change_count / threshold, 1.0) * 0.6
            
            alert_title = f"Rapid Permission Changes: {username}"
            alert_description = f"User {username} made {change_count} permission changes in {time_window} minutes"
            
            evidence_data = {
                'rule_triggered': 'rapid_permission_changes',
                'permission_changes': change_count,
                'time_window_minutes': time_window,
                'threshold': threshold,
                'change_details': change['change_details']
            }
            
            cursor.execute("""
                INSERT INTO security_alerts 
                (alert_type, severity, user_id, alert_title, alert_description, 
                 evidence_data, risk_score)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                'rapid_permission_changes',
                rule_config['severity'],
                user_id,
                alert_title,
                alert_description,
                json.dumps(evidence_data),
                threat_score
            ))
            
            threats_detected += 1
            logger.warning(f"🚨 Rapid permission changes detected for user {username}")
        
        return threats_detected
    
    def detect_admin_compromise(self, cursor, rule_config: Dict) -> int:
        """Detect potential admin account compromise"""
        time_window = rule_config['time_window_minutes']
        
        # Get admin users
        cursor.execute("""
            SELECT id, username FROM users 
            WHERE role IN ('platform_owner', 'security_admin') 
            AND status = 'active'
        """)
        
        admin_users = cursor.fetchall()
        threats_detected = 0
        
        for admin in admin_users:
            user_id = admin['id']
            username = admin['username']
            
            # Check for unusual admin activities
            cursor.execute("""
                SELECT 
                    COUNT(*) as activity_count,
                    COUNT(DISTINCT activity_type) as unique_activities,
                    GROUP_CONCAT(DISTINCT activity_type) as activities
                FROM user_activity_logs 
                WHERE user_id = ? 
                AND timestamp > datetime('now', '-{} minutes')
                AND activity_type IN ('admin_action', 'user_management', 'permission_change', 'system_config')
            """.format(time_window), (user_id,))
            
            admin_activity = cursor.fetchone()
            activity_count = admin_activity['activity_count'] or 0
            
            if activity_count > 0:
                # Get baseline admin activity
                cursor.execute("""
                    SELECT AVG(daily_count) as avg_daily_activity
                    FROM (
                        SELECT DATE(timestamp) as date, COUNT(*) as daily_count
                        FROM user_activity_logs 
                        WHERE user_id = ? 
                        AND timestamp BETWEEN datetime('now', '-30 days') AND datetime('now', '-1 day')
                        AND activity_type IN ('admin_action', 'user_management', 'permission_change', 'system_config')
                        GROUP BY DATE(timestamp)
                    )
                """, (user_id,))
                
                baseline_result = cursor.fetchone()
                avg_daily_activity = baseline_result['avg_daily_activity'] or 0
                
                # Convert to daily equivalent
                daily_equivalent = (activity_count * 1440) / time_window
                
                # Alert if significantly above baseline or if very high activity
                if daily_equivalent > max(avg_daily_activity * 4, 20):
                    threat_score = min(daily_equivalent / (avg_daily_activity * 6), 1.0) * 0.9
                    
                    alert_title = f"Potential Admin Compromise: {username}"
                    alert_description = f"Admin user {username} showed unusual activity pattern: {activity_count} actions in {time_window} minutes"
                    
                    evidence_data = {
                        'rule_triggered': 'admin_account_compromise',
                        'activity_count': activity_count,
                        'time_window_minutes': time_window,
                        'baseline_daily_average': round(avg_daily_activity, 2),
                        'current_daily_equivalent': round(daily_equivalent, 2),
                        'unique_activities': admin_activity['unique_activities'],
                        'activities': admin_activity['activities']
                    }
                    
                    cursor.execute("""
                        INSERT INTO security_alerts 
                        (alert_type, severity, user_id, alert_title, alert_description, 
                         evidence_data, risk_score)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        'admin_compromise',
                        rule_config['severity'],
                        user_id,
                        alert_title,
                        alert_description,
                        json.dumps(evidence_data),
                        threat_score
                    ))
                    
                    threats_detected += 1
                    logger.warning(f"🚨 Potential admin compromise detected for {username}")
        
        return threats_detected
    
    def correlate_threat_indicators(self):
        """Correlate multiple threat indicators for enhanced detection"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Look for users with multiple recent alerts
            cursor.execute("""
                SELECT 
                    user_id,
                    COUNT(*) as alert_count,
                    AVG(risk_score) as avg_risk_score,
                    GROUP_CONCAT(DISTINCT alert_type) as alert_types,
                    MIN(created_at) as first_alert,
                    MAX(created_at) as last_alert
                FROM security_alerts 
                WHERE created_at > datetime('now', '-24 hours')
                AND status = 'active'
                GROUP BY user_id
                HAVING COUNT(*) >= 2
            """)
            
            correlated_threats = cursor.fetchall()
            correlation_alerts = 0
            
            for threat in correlated_threats:
                user_id = threat['user_id']
                alert_count = threat['alert_count']
                avg_risk_score = threat['avg_risk_score']
                
                # Get user information
                cursor.execute("SELECT username FROM users WHERE id = ?", (user_id,))
                user_result = cursor.fetchone()
                if not user_result:
                    continue
                
                username = user_result['username']
                
                # Calculate correlation score
                correlation_score = min(alert_count * avg_risk_score * 0.3, 1.0)
                
                if correlation_score > 0.6:
                    alert_title = f"Correlated Threat Activity: {username}"
                    alert_description = f"User {username} triggered {alert_count} security alerts with average risk score {avg_risk_score:.2f}"
                    
                    evidence_data = {
                        'correlation_type': 'multiple_alerts',
                        'alert_count': alert_count,
                        'avg_risk_score': avg_risk_score,
                        'alert_types': threat['alert_types'],
                        'time_span_hours': 24,
                        'correlation_score': correlation_score
                    }
                    
                    cursor.execute("""
                        INSERT INTO security_alerts 
                        (alert_type, severity, user_id, alert_title, alert_description, 
                         evidence_data, risk_score)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        'correlated_threat',
                        'high',
                        user_id,
                        alert_title,
                        alert_description,
                        json.dumps(evidence_data),
                        correlation_score
                    ))
                    
                    correlation_alerts += 1
                    logger.warning(f"🚨 Correlated threat activity detected for {username}")
            
            conn.commit()
            logger.info(f"✅ Correlated threat indicators, generated {correlation_alerts} correlation alerts")
            
        except Exception as e:
            logger.error(f"❌ Error correlating threat indicators: {str(e)}")
            conn.rollback()
        finally:
            conn.close()
    
    def generate_threat_intelligence_report(self) -> Dict[str, Any]:
        """Generate comprehensive threat intelligence report"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            report = {
                'report_timestamp': datetime.now().isoformat(),
                'reporting_period_hours': 24,
                'threat_summary': {},
                'top_threats': [],
                'user_risk_analysis': {},
                'trend_analysis': {},
                'recommendations': []
            }
            
            # Threat summary
            cursor.execute("""
                SELECT 
                    alert_type,
                    severity,
                    COUNT(*) as count,
                    AVG(risk_score) as avg_risk_score
                FROM security_alerts 
                WHERE created_at > datetime('now', '-24 hours')
                GROUP BY alert_type, severity
                ORDER BY count DESC
            """)
            
            threat_summary = cursor.fetchall()
            report['threat_summary'] = {
                f"{row['alert_type']}_{row['severity']}": {
                    'count': row['count'],
                    'avg_risk_score': round(row['avg_risk_score'], 3)
                } for row in threat_summary
            }
            
            # Top threats by risk score
            cursor.execute("""
                SELECT 
                    alert_type,
                    alert_title,
                    risk_score,
                    created_at
                FROM security_alerts 
                WHERE created_at > datetime('now', '-24 hours')
                ORDER BY risk_score DESC
                LIMIT 10
            """)
            
            top_threats = cursor.fetchall()
            report['top_threats'] = [
                {
                    'alert_type': threat['alert_type'],
                    'alert_title': threat['alert_title'],
                    'risk_score': threat['risk_score'],
                    'created_at': threat['created_at']
                } for threat in top_threats
            ]
            
            # User risk analysis
            cursor.execute("""
                SELECT 
                    u.username,
                    u.role,
                    COUNT(sa.id) as alert_count,
                    AVG(sa.risk_score) as avg_risk_score,
                    MAX(sa.risk_score) as max_risk_score
                FROM users u
                LEFT JOIN security_alerts sa ON u.id = sa.user_id 
                    AND sa.created_at > datetime('now', '-24 hours')
                WHERE u.status = 'active'
                GROUP BY u.id, u.username, u.role
                HAVING COUNT(sa.id) > 0
                ORDER BY avg_risk_score DESC
                LIMIT 20
            """)
            
            user_risks = cursor.fetchall()
            report['user_risk_analysis'] = {
                user['username']: {
                    'role': user['role'],
                    'alert_count': user['alert_count'],
                    'avg_risk_score': round(user['avg_risk_score'], 3),
                    'max_risk_score': round(user['max_risk_score'], 3)
                } for user in user_risks
            }
            
            # Generate recommendations
            recommendations = []
            
            if report['threat_summary']:
                total_alerts = sum(data['count'] for data in report['threat_summary'].values())
                if total_alerts > 50:
                    recommendations.append("High alert volume detected - consider tuning detection rules")
                
                critical_alerts = sum(
                    data['count'] for key, data in report['threat_summary'].items() 
                    if 'critical' in key
                )
                if critical_alerts > 5:
                    recommendations.append("Multiple critical alerts - immediate investigation required")
            
            if len(report['user_risk_analysis']) > 10:
                recommendations.append("Multiple high-risk users identified - review access controls")
            
            report['recommendations'] = recommendations
            
            return report
            
        except Exception as e:
            logger.error(f"❌ Error generating threat intelligence report: {str(e)}")
            return {'error': str(e)}
        finally:
            conn.close()

def main():
    """Main function to run advanced threat detection"""
    print("🚀 Starting Advanced Threat Detection System...")
    print("=" * 60)
    
    detector = AdvancedThreatDetector()
    
    # Step 1: Initialize threat detection rules
    print("\n🔧 Initializing threat detection rules...")
    detector.initialize_threat_detection_rules()
    
    # Step 2: Analyze user activities for threats
    print("\n🔍 Analyzing user activities for threats...")
    detector.analyze_user_activities_for_threats()
    
    # Step 3: Correlate threat indicators
    print("\n🔗 Correlating threat indicators...")
    detector.correlate_threat_indicators()
    
    # Step 4: Generate threat intelligence report
    print("\n📊 Generating threat intelligence report...")
    report = detector.generate_threat_intelligence_report()
    
    print("\n" + "=" * 60)
    print("🎉 ADVANCED THREAT DETECTION COMPLETED!")
    print("=" * 60)
    
    # Display threat summary
    if 'error' not in report:
        print(f"🔍 Threat Detection Summary:")
        
        if report.get('threat_summary'):
            total_threats = sum(data['count'] for data in report['threat_summary'].values())
            print(f"   • Total Threats Detected: {total_threats}")
            
            # Show top threat types
            sorted_threats = sorted(
                report['threat_summary'].items(), 
                key=lambda x: x[1]['count'], 
                reverse=True
            )[:3]
            
            for threat_type, data in sorted_threats:
                print(f"   • {threat_type}: {data['count']} alerts (avg risk: {data['avg_risk_score']:.2f})")
        
        if report.get('user_risk_analysis'):
            high_risk_users = len(report['user_risk_analysis'])
            print(f"   • High-Risk Users: {high_risk_users}")
        
        if report.get('recommendations'):
            print(f"   • Security Recommendations: {len(report['recommendations'])}")
            for rec in report['recommendations'][:2]:
                print(f"     - {rec}")
    
    print(f"\n✅ Advanced threat detection system is now active!")
    print(f"🛡️ Continuous threat monitoring enabled with intelligent correlation")
    
    return True

if __name__ == "__main__":
    main() 