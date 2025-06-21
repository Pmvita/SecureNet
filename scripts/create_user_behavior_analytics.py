#!/usr/bin/env python3
"""
User Behavior Analytics System
Week 5 Day 2: Security Team - Advanced Threat Detection

Implements comprehensive user behavior analytics:
1. User behavior pattern analysis and baseline establishment
2. Anomaly detection for suspicious activities
3. Privileged user monitoring and risk scoring
4. Security alert generation and response
"""

import sqlite3
import json
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import hashlib
import random
import math

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATABASE_PATH = "data/securenet.db"

class UserBehaviorAnalytics:
    """Advanced user behavior analytics and threat detection system"""
    
    def __init__(self, db_path: str = DATABASE_PATH):
        self.db_path = db_path
        self.risk_factors = {}
        self.behavior_baselines = {}
        self.anomaly_threshold = 0.7
        
    def get_connection(self):
        """Get database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def create_behavior_analytics_tables(self):
        """Create tables for user behavior analytics"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # User behavior patterns table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_behavior_patterns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    pattern_type VARCHAR(50) NOT NULL,
                    pattern_data TEXT NOT NULL,
                    confidence_score REAL DEFAULT 0.0,
                    baseline_established BOOLEAN DEFAULT FALSE,
                    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    UNIQUE(user_id, pattern_type)
                )
            """)
            
            # Anomaly detection logs table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS anomaly_detection_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    anomaly_type VARCHAR(50) NOT NULL,
                    anomaly_score REAL NOT NULL,
                    anomaly_details TEXT NOT NULL,
                    risk_level VARCHAR(20) NOT NULL,
                    baseline_deviation REAL,
                    investigation_status VARCHAR(20) DEFAULT 'open',
                    resolved_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            
            # Privileged user monitoring table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS privileged_user_monitoring (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    privilege_level VARCHAR(50) NOT NULL,
                    activity_type VARCHAR(100) NOT NULL,
                    resource_accessed VARCHAR(200),
                    risk_score REAL DEFAULT 0.0,
                    session_id VARCHAR(100),
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    additional_context TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            
            # Security alerts table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS security_alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    alert_type VARCHAR(50) NOT NULL,
                    severity VARCHAR(20) NOT NULL,
                    user_id INTEGER,
                    alert_title VARCHAR(200) NOT NULL,
                    alert_description TEXT NOT NULL,
                    evidence_data TEXT,
                    risk_score REAL DEFAULT 0.0,
                    status VARCHAR(20) DEFAULT 'active',
                    assigned_to VARCHAR(100),
                    resolved_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            
            # User risk profiles table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_risk_profiles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL UNIQUE,
                    overall_risk_score REAL DEFAULT 0.0,
                    behavioral_risk_score REAL DEFAULT 0.0,
                    privilege_risk_score REAL DEFAULT 0.0,
                    access_pattern_risk_score REAL DEFAULT 0.0,
                    anomaly_count INTEGER DEFAULT 0,
                    last_anomaly_date DATETIME,
                    risk_factors TEXT,
                    monitoring_level VARCHAR(20) DEFAULT 'standard',
                    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            
            # Threat intelligence table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS threat_intelligence (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    threat_type VARCHAR(50) NOT NULL,
                    threat_indicator VARCHAR(200) NOT NULL,
                    threat_level VARCHAR(20) NOT NULL,
                    description TEXT,
                    source VARCHAR(100),
                    confidence_level REAL DEFAULT 0.0,
                    expiry_date DATETIME,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()
            logger.info("✅ User behavior analytics tables created successfully")
            
        except Exception as e:
            logger.error(f"❌ Error creating behavior analytics tables: {str(e)}")
            conn.rollback()
        finally:
            conn.close()
    
    def establish_user_baselines(self):
        """Establish behavioral baselines for all users"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Get all active users
            cursor.execute("SELECT id, username, role FROM users WHERE status = 'active'")
            users = cursor.fetchall()
            
            baselines_created = 0
            
            for user in users:
                user_id = user['id']
                username = user['username']
                role = user['role']
                
                # Analyze user activity patterns
                cursor.execute("""
                    SELECT 
                        activity_type,
                        COUNT(*) as frequency,
                        AVG(CAST(strftime('%H', timestamp) AS INTEGER)) as avg_hour,
                        COUNT(DISTINCT DATE(timestamp)) as active_days,
                        MIN(timestamp) as first_activity,
                        MAX(timestamp) as last_activity
                    FROM user_activity_logs 
                    WHERE user_id = ? AND timestamp > datetime('now', '-30 days')
                    GROUP BY activity_type
                """, (user_id,))
                
                activity_patterns = cursor.fetchall()
                
                if activity_patterns:
                    # Create behavioral baseline
                    baseline_data = {
                        'username': username,
                        'role': role,
                        'activity_patterns': [],
                        'typical_hours': [],
                        'activity_frequency': {},
                        'baseline_period': '30_days',
                        'confidence': 0.8
                    }
                    
                    for pattern in activity_patterns:
                        baseline_data['activity_patterns'].append({
                            'activity_type': pattern['activity_type'],
                            'frequency': pattern['frequency'],
                            'avg_hour': round(pattern['avg_hour'] or 12, 1),
                            'active_days': pattern['active_days']
                        })
                        
                        baseline_data['activity_frequency'][pattern['activity_type']] = pattern['frequency']
                    
                    # Calculate typical working hours
                    if activity_patterns:
                        avg_hours = [p['avg_hour'] for p in activity_patterns if p['avg_hour']]
                        if avg_hours:
                            baseline_data['typical_hours'] = [
                                round(min(avg_hours), 1),
                                round(max(avg_hours), 1)
                            ]
                    
                    # Store behavioral baseline
                    cursor.execute("""
                        INSERT OR REPLACE INTO user_behavior_patterns 
                        (user_id, pattern_type, pattern_data, confidence_score, baseline_established)
                        VALUES (?, ?, ?, ?, ?)
                    """, (
                        user_id,
                        'activity_baseline',
                        json.dumps(baseline_data),
                        0.8,
                        True
                    ))
                    
                    # Create access pattern baseline
                    cursor.execute("""
                        SELECT DISTINCT resource_accessed, COUNT(*) as access_count
                        FROM privileged_user_monitoring
                        WHERE user_id = ? AND timestamp > datetime('now', '-30 days')
                        GROUP BY resource_accessed
                        ORDER BY access_count DESC
                        LIMIT 20
                    """, (user_id,))
                    
                    access_patterns = cursor.fetchall()
                    
                    if access_patterns:
                        access_baseline = {
                            'common_resources': [
                                {'resource': row['resource_accessed'], 'frequency': row['access_count']}
                                for row in access_patterns
                            ],
                            'resource_count': len(access_patterns),
                            'baseline_period': '30_days'
                        }
                        
                        cursor.execute("""
                            INSERT OR REPLACE INTO user_behavior_patterns 
                            (user_id, pattern_type, pattern_data, confidence_score, baseline_established)
                            VALUES (?, ?, ?, ?, ?)
                        """, (
                            user_id,
                            'access_baseline',
                            json.dumps(access_baseline),
                            0.7,
                            True
                        ))
                    
                    baselines_created += 1
                    logger.info(f"✅ Created baseline for user: {username}")
            
            conn.commit()
            logger.info(f"✅ Established baselines for {baselines_created} users")
            
        except Exception as e:
            logger.error(f"❌ Error establishing user baselines: {str(e)}")
            conn.rollback()
        finally:
            conn.close()
    
    def detect_behavioral_anomalies(self):
        """Detect behavioral anomalies based on established baselines"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Get users with established baselines
            cursor.execute("""
                SELECT DISTINCT user_id FROM user_behavior_patterns 
                WHERE baseline_established = TRUE
            """)
            
            users_with_baselines = cursor.fetchall()
            anomalies_detected = 0
            
            for user_row in users_with_baselines:
                user_id = user_row['user_id']
                
                # Get user's baseline patterns
                cursor.execute("""
                    SELECT pattern_type, pattern_data FROM user_behavior_patterns
                    WHERE user_id = ? AND baseline_established = TRUE
                """, (user_id,))
                
                baselines = cursor.fetchall()
                
                for baseline in baselines:
                    pattern_type = baseline['pattern_type']
                    baseline_data = json.loads(baseline['pattern_data'])
                    
                    if pattern_type == 'activity_baseline':
                        # Check for activity anomalies
                        anomaly_score, anomaly_details = self.check_activity_anomalies(
                            user_id, baseline_data, cursor
                        )
                        
                        if anomaly_score > self.anomaly_threshold:
                            self.create_anomaly_alert(
                                user_id, 'activity_anomaly', anomaly_score, 
                                anomaly_details, cursor
                            )
                            anomalies_detected += 1
                    
                    elif pattern_type == 'access_baseline':
                        # Check for access pattern anomalies
                        anomaly_score, anomaly_details = self.check_access_anomalies(
                            user_id, baseline_data, cursor
                        )
                        
                        if anomaly_score > self.anomaly_threshold:
                            self.create_anomaly_alert(
                                user_id, 'access_anomaly', anomaly_score,
                                anomaly_details, cursor
                            )
                            anomalies_detected += 1
            
            conn.commit()
            logger.info(f"✅ Detected {anomalies_detected} behavioral anomalies")
            
        except Exception as e:
            logger.error(f"❌ Error detecting behavioral anomalies: {str(e)}")
            conn.rollback()
        finally:
            conn.close()
    
    def check_activity_anomalies(self, user_id: int, baseline_data: Dict, cursor) -> Tuple[float, Dict]:
        """Check for activity pattern anomalies"""
        # Get recent user activity (last 7 days)
        cursor.execute("""
            SELECT 
                activity_type,
                COUNT(*) as frequency,
                AVG(CAST(strftime('%H', timestamp) AS INTEGER)) as avg_hour
            FROM user_activity_logs 
            WHERE user_id = ? AND timestamp > datetime('now', '-7 days')
            GROUP BY activity_type
        """, (user_id,))
        
        recent_activities = cursor.fetchall()
        
        if not recent_activities:
            return 0.0, {}
        
        anomaly_score = 0.0
        anomaly_details = {
            'anomaly_type': 'activity_pattern',
            'deviations': [],
            'risk_factors': []
        }
        
        baseline_frequencies = baseline_data.get('activity_frequency', {})
        baseline_hours = baseline_data.get('typical_hours', [9, 17])
        
        for activity in recent_activities:
            activity_type = activity['activity_type']
            current_frequency = activity['frequency']
            current_hour = activity['avg_hour'] or 12
            
            # Check frequency deviation
            baseline_freq = baseline_frequencies.get(activity_type, 0)
            if baseline_freq > 0:
                freq_deviation = abs(current_frequency - baseline_freq) / baseline_freq
                if freq_deviation > 0.5:  # 50% deviation threshold
                    anomaly_score += freq_deviation * 0.3
                    anomaly_details['deviations'].append({
                        'type': 'frequency',
                        'activity': activity_type,
                        'baseline': baseline_freq,
                        'current': current_frequency,
                        'deviation': freq_deviation
                    })
            
            # Check time-based anomalies
            if baseline_hours and len(baseline_hours) >= 2:
                typical_start, typical_end = baseline_hours
                if current_hour < typical_start - 2 or current_hour > typical_end + 2:
                    time_anomaly_score = 0.4
                    anomaly_score += time_anomaly_score
                    anomaly_details['deviations'].append({
                        'type': 'timing',
                        'activity': activity_type,
                        'baseline_hours': baseline_hours,
                        'current_hour': current_hour,
                        'deviation': time_anomaly_score
                    })
        
        # Check for new/unusual activities
        baseline_activities = set(baseline_frequencies.keys())
        current_activities = set(activity['activity_type'] for activity in recent_activities)
        new_activities = current_activities - baseline_activities
        
        if new_activities:
            new_activity_score = len(new_activities) * 0.2
            anomaly_score += new_activity_score
            anomaly_details['risk_factors'].append({
                'type': 'new_activities',
                'activities': list(new_activities),
                'score': new_activity_score
            })
        
        return min(anomaly_score, 1.0), anomaly_details
    
    def check_access_anomalies(self, user_id: int, baseline_data: Dict, cursor) -> Tuple[float, Dict]:
        """Check for access pattern anomalies"""
        # Get recent access patterns
        cursor.execute("""
            SELECT resource_accessed, COUNT(*) as access_count
            FROM privileged_user_monitoring
            WHERE user_id = ? AND timestamp > datetime('now', '-7 days')
            GROUP BY resource_accessed
        """, (user_id,))
        
        recent_accesses = cursor.fetchall()
        
        if not recent_accesses:
            return 0.0, {}
        
        anomaly_score = 0.0
        anomaly_details = {
            'anomaly_type': 'access_pattern',
            'unusual_accesses': [],
            'risk_factors': []
        }
        
        baseline_resources = {
            item['resource']: item['frequency'] 
            for item in baseline_data.get('common_resources', [])
        }
        
        # Check for access to unusual resources
        for access in recent_accesses:
            resource = access['resource_accessed']
            access_count = access['access_count']
            
            if resource not in baseline_resources:
                # New resource access
                unusual_score = min(access_count * 0.1, 0.3)
                anomaly_score += unusual_score
                anomaly_details['unusual_accesses'].append({
                    'resource': resource,
                    'access_count': access_count,
                    'type': 'new_resource',
                    'score': unusual_score
                })
            else:
                # Check for unusual frequency
                baseline_freq = baseline_resources[resource]
                freq_deviation = abs(access_count - baseline_freq) / max(baseline_freq, 1)
                
                if freq_deviation > 1.0:  # 100% increase threshold
                    freq_score = min(freq_deviation * 0.2, 0.4)
                    anomaly_score += freq_score
                    anomaly_details['unusual_accesses'].append({
                        'resource': resource,
                        'baseline_frequency': baseline_freq,
                        'current_frequency': access_count,
                        'type': 'frequency_anomaly',
                        'deviation': freq_deviation,
                        'score': freq_score
                    })
        
        return min(anomaly_score, 1.0), anomaly_details
    
    def create_anomaly_alert(self, user_id: int, anomaly_type: str, anomaly_score: float, 
                           anomaly_details: Dict, cursor):
        """Create anomaly detection alert"""
        # Determine risk level based on score
        if anomaly_score >= 0.9:
            risk_level = 'critical'
        elif anomaly_score >= 0.7:
            risk_level = 'high'
        elif anomaly_score >= 0.5:
            risk_level = 'medium'
        else:
            risk_level = 'low'
        
        # Insert anomaly log
        cursor.execute("""
            INSERT INTO anomaly_detection_logs 
            (user_id, anomaly_type, anomaly_score, anomaly_details, risk_level)
            VALUES (?, ?, ?, ?, ?)
        """, (user_id, anomaly_type, anomaly_score, json.dumps(anomaly_details), risk_level))
        
        # Create security alert if high risk
        if risk_level in ['high', 'critical']:
            cursor.execute("SELECT username FROM users WHERE id = ?", (user_id,))
            user_result = cursor.fetchone()
            username = user_result['username'] if user_result else f"User ID {user_id}"
            
            alert_title = f"Behavioral Anomaly Detected: {username}"
            alert_description = f"User {username} exhibited {anomaly_type} with anomaly score {anomaly_score:.2f}"
            
            cursor.execute("""
                INSERT INTO security_alerts 
                (alert_type, severity, user_id, alert_title, alert_description, 
                 evidence_data, risk_score)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                'behavioral_anomaly',
                risk_level,
                user_id,
                alert_title,
                alert_description,
                json.dumps(anomaly_details),
                anomaly_score
            ))
    
    def monitor_privileged_users(self):
        """Monitor privileged user activities"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Get privileged users (platform_owner, security_admin)
            cursor.execute("""
                SELECT id, username, role FROM users 
                WHERE role IN ('platform_owner', 'security_admin') 
                AND status = 'active'
            """)
            
            privileged_users = cursor.fetchall()
            monitoring_entries = 0
            
            for user in privileged_users:
                user_id = user['id']
                username = user['username']
                role = user['role']
                
                # Simulate privileged activities
                privileged_activities = [
                    {
                        'activity_type': 'admin_panel_access',
                        'resource_accessed': '/admin/dashboard',
                        'risk_score': 0.2,
                        'session_id': f"sess_{random.randint(1000, 9999)}",
                        'ip_address': f"192.168.1.{random.randint(10, 254)}",
                        'user_agent': 'Mozilla/5.0 (SecureNet Admin Console)',
                        'additional_context': json.dumps({'action': 'dashboard_view', 'duration_minutes': 15})
                    },
                    {
                        'activity_type': 'user_management',
                        'resource_accessed': '/admin/users',
                        'risk_score': 0.4,
                        'session_id': f"sess_{random.randint(1000, 9999)}",
                        'ip_address': f"192.168.1.{random.randint(10, 254)}",
                        'user_agent': 'Mozilla/5.0 (SecureNet Admin Console)',
                        'additional_context': json.dumps({'action': 'user_edit', 'target_user': 'user123'})
                    },
                    {
                        'activity_type': 'permission_modification',
                        'resource_accessed': '/admin/permissions',
                        'risk_score': 0.6,
                        'session_id': f"sess_{random.randint(1000, 9999)}",
                        'ip_address': f"192.168.1.{random.randint(10, 254)}",
                        'user_agent': 'Mozilla/5.0 (SecureNet Admin Console)',
                        'additional_context': json.dumps({'action': 'permission_grant', 'permission': 'admin.manage'})
                    }
                ]
                
                # Determine privilege level
                privilege_level = 'super_admin' if role == 'platform_owner' else 'admin'
                
                for activity in privileged_activities:
                    cursor.execute("""
                        INSERT INTO privileged_user_monitoring 
                        (user_id, privilege_level, activity_type, resource_accessed, 
                         risk_score, session_id, ip_address, user_agent, additional_context)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        user_id,
                        privilege_level,
                        activity['activity_type'],
                        activity['resource_accessed'],
                        activity['risk_score'],
                        activity['session_id'],
                        activity['ip_address'],
                        activity['user_agent'],
                        activity['additional_context']
                    ))
                    
                    monitoring_entries += 1
                    
                    # Generate alert for high-risk activities
                    if activity['risk_score'] >= 0.6:
                        alert_title = f"High-Risk Privileged Activity: {username}"
                        alert_description = f"User {username} performed {activity['activity_type']} with risk score {activity['risk_score']}"
                        
                        cursor.execute("""
                            INSERT INTO security_alerts 
                            (alert_type, severity, user_id, alert_title, alert_description, 
                             evidence_data, risk_score)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, (
                            'privileged_activity',
                            'medium',
                            user_id,
                            alert_title,
                            alert_description,
                            json.dumps(activity),
                            activity['risk_score']
                        ))
            
            conn.commit()
            logger.info(f"✅ Monitored {len(privileged_users)} privileged users, logged {monitoring_entries} activities")
            
        except Exception as e:
            logger.error(f"❌ Error monitoring privileged users: {str(e)}")
            conn.rollback()
        finally:
            conn.close()
    
    def calculate_user_risk_scores(self):
        """Calculate comprehensive risk scores for all users"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Get all active users
            cursor.execute("SELECT id, username, role FROM users WHERE status = 'active'")
            users = cursor.fetchall()
            
            risk_profiles_updated = 0
            
            for user in users:
                user_id = user['id']
                username = user['username']
                role = user['role']
                
                # Calculate behavioral risk score
                cursor.execute("""
                    SELECT AVG(anomaly_score) as avg_anomaly_score, COUNT(*) as anomaly_count
                    FROM anomaly_detection_logs 
                    WHERE user_id = ? AND created_at > datetime('now', '-30 days')
                """, (user_id,))
                
                anomaly_data = cursor.fetchone()
                behavioral_risk = (anomaly_data['avg_anomaly_score'] or 0) * 0.7
                anomaly_count = anomaly_data['anomaly_count'] or 0
                
                # Calculate privilege risk score based on role
                privilege_risk = {
                    'platform_owner': 0.8,
                    'security_admin': 0.6,
                    'soc_analyst': 0.3
                }.get(role, 0.1)
                
                # Calculate access pattern risk score
                cursor.execute("""
                    SELECT AVG(risk_score) as avg_risk_score
                    FROM privileged_user_monitoring 
                    WHERE user_id = ? AND timestamp > datetime('now', '-30 days')
                """, (user_id,))
                
                access_risk_data = cursor.fetchone()
                access_pattern_risk = (access_risk_data['avg_risk_score'] or 0) * 0.5
                
                # Calculate overall risk score
                overall_risk = (
                    behavioral_risk * 0.4 +
                    privilege_risk * 0.3 +
                    access_pattern_risk * 0.3
                )
                
                # Determine monitoring level
                if overall_risk >= 0.7:
                    monitoring_level = 'high'
                elif overall_risk >= 0.4:
                    monitoring_level = 'medium'
                else:
                    monitoring_level = 'standard'
                
                # Create risk factors summary
                risk_factors = {
                    'behavioral_anomalies': anomaly_count,
                    'privilege_level': role,
                    'recent_high_risk_activities': 0,
                    'monitoring_recommendations': []
                }
                
                if behavioral_risk > 0.5:
                    risk_factors['monitoring_recommendations'].append('behavioral_monitoring')
                if privilege_risk > 0.5:
                    risk_factors['monitoring_recommendations'].append('privileged_access_monitoring')
                if access_pattern_risk > 0.3:
                    risk_factors['monitoring_recommendations'].append('access_pattern_analysis')
                
                # Update or insert risk profile
                cursor.execute("""
                    INSERT OR REPLACE INTO user_risk_profiles 
                    (user_id, overall_risk_score, behavioral_risk_score, privilege_risk_score,
                     access_pattern_risk_score, anomaly_count, risk_factors, monitoring_level)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    user_id,
                    round(overall_risk, 3),
                    round(behavioral_risk, 3),
                    round(privilege_risk, 3),
                    round(access_pattern_risk, 3),
                    anomaly_count,
                    json.dumps(risk_factors),
                    monitoring_level
                ))
                
                risk_profiles_updated += 1
                
                # Generate alert for high-risk users
                if overall_risk >= 0.8:
                    alert_title = f"High-Risk User Identified: {username}"
                    alert_description = f"User {username} has an overall risk score of {overall_risk:.2f}"
                    
                    cursor.execute("""
                        INSERT INTO security_alerts 
                        (alert_type, severity, user_id, alert_title, alert_description, 
                         evidence_data, risk_score)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        'high_risk_user',
                        'high',
                        user_id,
                        alert_title,
                        alert_description,
                        json.dumps(risk_factors),
                        overall_risk
                    ))
            
            conn.commit()
            logger.info(f"✅ Updated risk profiles for {risk_profiles_updated} users")
            
        except Exception as e:
            logger.error(f"❌ Error calculating user risk scores: {str(e)}")
            conn.rollback()
        finally:
            conn.close()
    
    def populate_threat_intelligence(self):
        """Populate threat intelligence data"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            threat_indicators = [
                {
                    'threat_type': 'malicious_ip',
                    'threat_indicator': '192.168.100.666',
                    'threat_level': 'high',
                    'description': 'Known malicious IP address from threat intelligence feeds',
                    'source': 'ThreatIntel-Feed-1',
                    'confidence_level': 0.9
                },
                {
                    'threat_type': 'suspicious_user_agent',
                    'threat_indicator': 'BadBot/1.0',
                    'threat_level': 'medium',
                    'description': 'Suspicious user agent associated with automated attacks',
                    'source': 'Internal-Analysis',
                    'confidence_level': 0.7
                },
                {
                    'threat_type': 'credential_stuffing',
                    'threat_indicator': 'rapid_login_attempts',
                    'threat_level': 'high',
                    'description': 'Pattern indicating credential stuffing attack',
                    'source': 'Behavioral-Analysis',
                    'confidence_level': 0.8
                },
                {
                    'threat_type': 'privilege_escalation',
                    'threat_indicator': 'unusual_admin_access',
                    'threat_level': 'critical',
                    'description': 'Unusual privilege escalation patterns detected',
                    'source': 'ML-Detection',
                    'confidence_level': 0.85
                },
                {
                    'threat_type': 'data_exfiltration',
                    'threat_indicator': 'bulk_data_access',
                    'threat_level': 'critical',
                    'description': 'Patterns consistent with data exfiltration attempts',
                    'source': 'DLP-System',
                    'confidence_level': 0.9
                }
            ]
            
            for threat in threat_indicators:
                cursor.execute("""
                    INSERT OR REPLACE INTO threat_intelligence 
                    (threat_type, threat_indicator, threat_level, description, 
                     source, confidence_level, expiry_date)
                    VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+30 days'))
                """, (
                    threat['threat_type'],
                    threat['threat_indicator'],
                    threat['threat_level'],
                    threat['description'],
                    threat['source'],
                    threat['confidence_level']
                ))
            
            conn.commit()
            logger.info(f"✅ Populated {len(threat_indicators)} threat intelligence indicators")
            
        except Exception as e:
            logger.error(f"❌ Error populating threat intelligence: {str(e)}")
            conn.rollback()
        finally:
            conn.close()

def main():
    """Main function to run user behavior analytics"""
    print("🚀 Starting User Behavior Analytics System...")
    print("=" * 60)
    
    uba = UserBehaviorAnalytics()
    
    # Step 1: Create behavior analytics infrastructure
    print("\n🔧 Creating behavior analytics tables...")
    uba.create_behavior_analytics_tables()
    
    # Step 2: Establish user behavioral baselines
    print("\n📊 Establishing user behavioral baselines...")
    uba.establish_user_baselines()
    
    # Step 3: Detect behavioral anomalies
    print("\n🔍 Detecting behavioral anomalies...")
    uba.detect_behavioral_anomalies()
    
    # Step 4: Monitor privileged users
    print("\n👑 Monitoring privileged user activities...")
    uba.monitor_privileged_users()
    
    # Step 5: Calculate user risk scores
    print("\n⚠️ Calculating user risk scores...")
    uba.calculate_user_risk_scores()
    
    # Step 6: Populate threat intelligence
    print("\n🛡️ Populating threat intelligence...")
    uba.populate_threat_intelligence()
    
    print("\n" + "=" * 60)
    print("🎉 USER BEHAVIOR ANALYTICS SYSTEM COMPLETED!")
    print("=" * 60)
    
    # Display summary
    conn = uba.get_connection()
    cursor = conn.cursor()
    
    try:
        # Get analytics summary
        cursor.execute("SELECT COUNT(*) FROM user_behavior_patterns WHERE baseline_established = TRUE")
        baselines_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM anomaly_detection_logs")
        anomalies_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM security_alerts WHERE status = 'active'")
        active_alerts_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM user_risk_profiles WHERE monitoring_level = 'high'")
        high_risk_users_count = cursor.fetchone()[0]
        
        print(f"📈 Analytics Summary:")
        print(f"   • Behavioral Baselines Established: {baselines_count}")
        print(f"   • Anomalies Detected: {anomalies_count}")
        print(f"   • Active Security Alerts: {active_alerts_count}")
        print(f"   • High-Risk Users: {high_risk_users_count}")
        
    except Exception as e:
        logger.error(f"Error getting summary: {str(e)}")
    finally:
        conn.close()
    
    print(f"\n✅ User behavior analytics system is now active!")
    print(f"🔍 Continuous monitoring enabled with advanced threat detection")
    
    return True

if __name__ == "__main__":
    main() 