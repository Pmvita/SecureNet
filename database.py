import json
import uuid
from datetime import datetime, timedelta
import secrets
import sqlite3
import os
import logging

# Configure logging for the database module
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Add handler if none exists
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

class Database:
    def __init__(self, db_path="data/securenet.db"):
        """Initialize the database connection and schema."""
        self.db_path = db_path
        self._ensure_db_directory()
        self.init_db()

    def _ensure_db_directory(self):
        """Ensure the database directory exists."""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)

    def get_db(self):
        """Get a database connection."""
        return sqlite3.connect(self.db_path)

    # Log Source Management
    def get_log_sources(self):
        """Get all configured log sources."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                SELECT id, name, type, config, format, format_pattern, status,
                       last_update, logs_per_minute, tags
                FROM log_sources
                ORDER BY name
            """)
            sources = []
            for row in cursor.fetchall():
                source = {
                    'id': row[0],
                    'name': row[1],
                    'type': row[2],
                    'config': json.loads(row[3]),
                    'format': row[4],
                    'format_pattern': row[5],
                    'status': row[6],
                    'last_update': row[7],
                    'logs_per_minute': row[8],
                    'tags': json.loads(row[9]) if row[9] else []
                }
                sources.append(source)
            return sources

    def get_log_source(self, source_id):
        """Get a specific log source by ID."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                SELECT id, name, type, config, format, format_pattern, status,
                       last_update, logs_per_minute, tags
                FROM log_sources
                WHERE id = ?
            """, (source_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return {
                'id': row[0],
                'name': row[1],
                'type': row[2],
                'config': json.loads(row[3]),
                'format': row[4],
                'format_pattern': row[5],
                'status': row[6],
                'last_update': row[7],
                'logs_per_minute': row[8],
                'tags': json.loads(row[9]) if row[9] else []
            }

    def create_log_source(self, source):
        """Create a new log source."""
        with self.get_db() as db:
            cursor = db.cursor()
            source_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO log_sources (
                    id, name, type, config, format, format_pattern,
                    status, last_update, logs_per_minute, tags
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                source_id,
                source['name'],
                source['type'],
                json.dumps(source['config']),
                source['format'],
                source.get('format_pattern'),
                'inactive',
                datetime.utcnow().isoformat(),
                0,
                json.dumps(source.get('tags', []))
            ))
            db.commit()
            return source_id

    def update_log_source(self, source_id, source):
        """Update an existing log source."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                UPDATE log_sources
                SET name = ?, type = ?, config = ?, format = ?, format_pattern = ?,
                    tags = ?
                WHERE id = ?
            """, (
                source['name'],
                source['type'],
                json.dumps(source['config']),
                source['format'],
                source.get('format_pattern'),
                json.dumps(source.get('tags', [])),
                source_id
            ))
            db.commit()
            return cursor.rowcount > 0

    def delete_log_source(self, source_id):
        """Delete a log source."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("DELETE FROM log_sources WHERE id = ?", (source_id,))
            db.commit()
            return cursor.rowcount > 0

    def toggle_log_source(self, source_id):
        """Toggle a log source's status between active and inactive."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                UPDATE log_sources
                SET status = CASE WHEN status = 'active' THEN 'inactive' ELSE 'active' END,
                    last_update = ?
                WHERE id = ?
            """, (datetime.utcnow().isoformat(), source_id))
            db.commit()
            return cursor.rowcount > 0

    def update_log_source_stats(self, source_id, logs_count):
        """Update log source statistics."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                UPDATE log_sources
                SET logs_per_minute = ?,
                    last_update = ?
                WHERE id = ?
            """, (logs_count, datetime.utcnow().isoformat(), source_id))
            db.commit()

    # Log Storage
    def store_log(self, log):
        """Store a log entry."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                INSERT INTO logs (
                    id, timestamp, level, source, message,
                    received_at, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                log['id'],
                log['timestamp'],
                log['level'],
                log['source'],
                log['message'],
                log['received_at'],
                json.dumps(log.get('metadata', {}))
            ))
            db.commit()

    def get_logs(self, source_id=None, level=None, start_time=None, end_time=None, limit=1000):
        """Get logs with optional filtering."""
        with self.get_db() as db:
            cursor = db.cursor()
            query = ["SELECT * FROM logs WHERE 1=1"]
            params = []
            
            if source_id:
                query.append("AND source = ?")
                params.append(source_id)
            if level:
                query.append("AND level = ?")
                params.append(level)
            if start_time:
                query.append("AND timestamp >= ?")
                params.append(start_time)
            if end_time:
                query.append("AND timestamp <= ?")
                params.append(end_time)
            
            query.append("ORDER BY timestamp DESC LIMIT ?")
            params.append(limit)
            
            cursor.execute(" ".join(query), params)
            logs = []
            for row in cursor.fetchall():
                log = {
                    'id': row[0],
                    'timestamp': row[1],
                    'level': row[2],
                    'source': row[3],
                    'message': row[4],
                    'received_at': row[5],
                    'metadata': json.loads(row[6]) if row[6] else {}
                }
                logs.append(log)
            return logs

    def get_log_stats(self, source_id=None, start_time=None, end_time=None):
        """Get log statistics."""
        with self.get_db() as db:
            cursor = db.cursor()
            query = ["SELECT level, COUNT(*) as count FROM logs WHERE 1=1"]
            params = []
            
            if source_id:
                query.append("AND source = ?")
                params.append(source_id)
            if start_time:
                query.append("AND timestamp >= ?")
                params.append(start_time)
            if end_time:
                query.append("AND timestamp <= ?")
                params.append(end_time)
            
            query.append("GROUP BY level")
            cursor.execute(" ".join(query), params)
            
            stats = {
                'total': 0,
                'by_level': {}
            }
            
            for row in cursor.fetchall():
                level, count = row
                stats['by_level'][level] = count
                stats['total'] += count
            
            return stats

    # Anomaly Management
    def get_anomalies(self):
        """Get all anomalies."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                SELECT id, timestamp, severity, type, source, description, status,
                       resolution_timestamp, metadata
                FROM anomalies
                ORDER BY timestamp DESC
            """)
            anomalies = []
            for row in cursor.fetchall():
                anomaly = {
                    'id': row[0],
                    'timestamp': row[1],
                    'severity': row[2],
                    'type': row[3],
                    'source': row[4],
                    'description': row[5],
                    'status': row[6],
                    'resolution_timestamp': row[7],
                    'metadata': json.loads(row[8]) if row[8] else {}
                }
                anomalies.append(anomaly)
            return anomalies

    def get_anomaly(self, anomaly_id):
        """Get a specific anomaly by ID."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                SELECT id, timestamp, severity, type, source, description, status,
                       resolution_timestamp, metadata
                FROM anomalies
                WHERE id = ?
            """, (anomaly_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return {
                'id': row[0],
                'timestamp': row[1],
                'severity': row[2],
                'type': row[3],
                'source': row[4],
                'description': row[5],
                'status': row[6],
                'resolution_timestamp': row[7],
                'metadata': json.loads(row[8]) if row[8] else {}
            }

    def resolve_anomaly(self, anomaly_id):
        """Resolve an anomaly."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                UPDATE anomalies
                SET status = 'resolved',
                    resolution_timestamp = ?
                WHERE id = ?
            """, (datetime.utcnow().isoformat(), anomaly_id))
            db.commit()
            return cursor.rowcount > 0

    # Network Management
    def get_network_overview(self):
        """Get network overview statistics."""
        with self.get_db() as db:
            cursor = db.cursor()
            
            # Get total devices
            cursor.execute("SELECT COUNT(*) FROM network_devices")
            total_devices = cursor.fetchone()[0]
            
            # Get active connections
            cursor.execute("""
                SELECT COUNT(*) FROM network_connections
                WHERE status = 'active'
            """)
            active_connections = cursor.fetchone()[0]
            
            # Get blocked attempts
            cursor.execute("""
                SELECT COUNT(*) FROM network_connections
                WHERE status = 'blocked'
            """)
            blocked_attempts = cursor.fetchone()[0]
            
            # Get average network load
            cursor.execute("""
                SELECT AVG(load) FROM network_metrics
                WHERE timestamp >= datetime('now', '-5 minutes')
            """)
            avg_load = cursor.fetchone()[0] or 0
            
            # Get network devices
            cursor.execute("""
                SELECT id, name, type, ip_address, status, last_seen
                FROM network_devices
                ORDER BY name
            """)
            devices = []
            for row in cursor.fetchall():
                device = {
                    'id': row[0],
                    'name': row[1],
                    'type': row[2],
                    'ip_address': row[3],
                    'status': row[4],
                    'last_seen': row[5]
                }
                devices.append(device)
            
            return {
                'total_devices': total_devices,
                'active_connections': active_connections,
                'blocked_attempts': blocked_attempts,
                'network_load': avg_load,
                'devices': devices
            }

    def get_network_traffic(self):
        """Get network traffic data for the last hour."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                SELECT timestamp, inbound, outbound
                FROM network_traffic
                WHERE timestamp >= datetime('now', '-1 hour')
                ORDER BY timestamp
            """)
            traffic = []
            for row in cursor.fetchall():
                traffic.append({
                    'timestamp': row[0],
                    'inbound': row[1],
                    'outbound': row[2]
                })
            return traffic

    def get_network_connections(self):
        """Get all network connections."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                SELECT c.id, c.source_device, c.dest_device, c.protocol,
                       c.source_port, c.dest_port, c.status, c.start_time,
                       c.end_time, c.data_transferred,
                       s.name as source_name, s.ip_address as source_ip,
                       d.name as dest_name, d.ip_address as dest_ip
                FROM network_connections c
                JOIN network_devices s ON c.source_device = s.id
                JOIN network_devices d ON c.dest_device = d.id
                ORDER BY c.start_time DESC
            """)
            connections = []
            for row in cursor.fetchall():
                connection = {
                    'id': row[0],
                    'source': {
                        'device_id': row[1],
                        'name': row[10],
                        'ip': row[11]
                    },
                    'destination': {
                        'device_id': row[2],
                        'name': row[12],
                        'ip': row[13]
                    },
                    'protocol': row[3],
                    'source_port': row[4],
                    'dest_port': row[5],
                    'status': row[6],
                    'start_time': row[7],
                    'end_time': row[8],
                    'data_transferred': row[9]
                }
                connections.append(connection)
            return connections

    def get_network_connection(self, connection_id):
        """Get a specific network connection by ID."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                SELECT c.id, c.source_device, c.dest_device, c.protocol,
                       c.source_port, c.dest_port, c.status, c.start_time,
                       c.end_time, c.data_transferred,
                       s.name as source_name, s.ip_address as source_ip,
                       d.name as dest_name, d.ip_address as dest_ip
                FROM network_connections c
                JOIN network_devices s ON c.source_device = s.id
                JOIN network_devices d ON c.dest_device = d.id
                WHERE c.id = ?
            """, (connection_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return {
                'id': row[0],
                'source': {
                    'device_id': row[1],
                    'name': row[10],
                    'ip': row[11]
                },
                'destination': {
                    'device_id': row[2],
                    'name': row[12],
                    'ip': row[13]
                },
                'protocol': row[3],
                'source_port': row[4],
                'dest_port': row[5],
                'status': row[6],
                'start_time': row[7],
                'end_time': row[8],
                'data_transferred': row[9]
            }

    def block_network_connection(self, connection_id):
        """Block a network connection."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                UPDATE network_connections
                SET status = 'blocked',
                    end_time = ?
                WHERE id = ?
            """, (datetime.utcnow().isoformat(), connection_id))
            db.commit()
            return cursor.rowcount > 0

    # Settings Management
    def get_settings(self):
        """Get current settings."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("SELECT * FROM settings")
            row = cursor.fetchone()
            if not row:
                return self._get_default_settings()
            return {
                'id': row[0],
                'api_key': row[1],
                'log_retention_days': row[2],
                'alert_threshold': row[3],
                'notification_email': row[4],
                'allowed_ips': json.loads(row[5]) if row[5] else [],
                'auto_block': row[6],
                'block_duration': row[7],
                'scan_interval': row[8],
                'last_updated': row[9]
            }

    def update_settings(self, settings):
        """Update settings."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                UPDATE settings
                SET log_retention_days = ?,
                    alert_threshold = ?,
                    notification_email = ?,
                    allowed_ips = ?,
                    auto_block = ?,
                    block_duration = ?,
                    scan_interval = ?,
                    last_updated = ?
                WHERE id = 1
            """, (
                settings['log_retention_days'],
                settings['alert_threshold'],
                settings['notification_email'],
                json.dumps(settings['allowed_ips']),
                settings['auto_block'],
                settings['block_duration'],
                settings['scan_interval'],
                datetime.utcnow().isoformat()
            ))
            db.commit()
            return cursor.rowcount > 0

    def regenerate_api_key(self):
        """Regenerate the API key."""
        with self.get_db() as db:
            cursor = db.cursor()
            new_key = secrets.token_urlsafe(32)
            cursor.execute("""
                UPDATE settings
                SET api_key = ?,
                    last_updated = ?
                WHERE id = 1
            """, (new_key, datetime.utcnow().isoformat()))
            db.commit()
            return new_key if cursor.rowcount > 0 else None

    def _get_default_settings(self):
        """Get default settings."""
        return {
            'id': 1,
            'api_key': secrets.token_urlsafe(32),
            'log_retention_days': 30,
            'alert_threshold': 100,
            'notification_email': '',
            'allowed_ips': [],
            'auto_block': False,
            'block_duration': 3600,
            'scan_interval': 300,
            'last_updated': datetime.utcnow().isoformat()
        }

    def get_log_trend(self, days=7):
        """Calculate log trend compared to previous period."""
        with self.get_db() as db:
            cursor = db.cursor()
            now = datetime.utcnow()
            current_period_start = now - timedelta(days=days)
            previous_period_start = current_period_start - timedelta(days=days)
            
            # Get current period count
            cursor.execute("""
                SELECT COUNT(*) FROM logs
                WHERE timestamp >= ? AND timestamp <= ?
            """, (current_period_start.isoformat(), now.isoformat()))
            current_count = cursor.fetchone()[0]
            
            # Get previous period count
            cursor.execute("""
                SELECT COUNT(*) FROM logs
                WHERE timestamp >= ? AND timestamp <= ?
            """, (previous_period_start.isoformat(), current_period_start.isoformat()))
            previous_count = cursor.fetchone()[0]
            
            if previous_count == 0:
                return 0
            
            # Calculate percentage change
            return round(((current_count - previous_count) / previous_count) * 100, 1)

    def get_active_threats(self):
        """Get currently active security threats."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                SELECT id, timestamp, type, severity, source, description, status
                FROM threats
                WHERE status = 'active'
                ORDER BY timestamp DESC
            """)
            threats = []
            for row in cursor.fetchall():
                threat = {
                    'id': row[0],
                    'timestamp': row[1],
                    'type': row[2],
                    'severity': row[3],
                    'source': row[4],
                    'description': row[5],
                    'status': row[6]
                }
                threats.append(threat)
            return threats

    def get_threats_trend(self, days=7):
        """Calculate threats trend compared to previous period."""
        with self.get_db() as db:
            cursor = db.cursor()
            now = datetime.utcnow()
            current_period_start = now - timedelta(days=days)
            previous_period_start = current_period_start - timedelta(days=days)
            
            # Get current period count
            cursor.execute("""
                SELECT COUNT(*) FROM threats
                WHERE timestamp >= ? AND timestamp <= ?
                AND status = 'active'
            """, (current_period_start.isoformat(), now.isoformat()))
            current_count = cursor.fetchone()[0]
            
            # Get previous period count
            cursor.execute("""
                SELECT COUNT(*) FROM threats
                WHERE timestamp >= ? AND timestamp <= ?
                AND status = 'active'
            """, (previous_period_start.isoformat(), current_period_start.isoformat()))
            previous_count = cursor.fetchone()[0]
            
            if previous_count == 0:
                return 0
            
            # Calculate percentage change
            return round(((current_count - previous_count) / previous_count) * 100, 1)

    def get_network_health(self):
        """Calculate overall network health score."""
        with self.get_db() as db:
            cursor = db.cursor()
            
            # Get various health metrics
            metrics = {}
            
            # Check system uptime
            cursor.execute("""
                SELECT COUNT(*) FROM system_metrics
                WHERE metric = 'uptime' AND value > 0
                AND timestamp >= datetime('now', '-1 hour')
            """)
            metrics['uptime'] = cursor.fetchone()[0] / 60  # Convert to percentage
            
            # Check network latency
            cursor.execute("""
                SELECT AVG(value) FROM system_metrics
                WHERE metric = 'latency'
                AND timestamp >= datetime('now', '-1 hour')
            """)
            metrics['latency'] = cursor.fetchone()[0] or 0
            
            # Check packet loss
            cursor.execute("""
                SELECT AVG(value) FROM system_metrics
                WHERE metric = 'packet_loss'
                AND timestamp >= datetime('now', '-1 hour')
            """)
            metrics['packet_loss'] = cursor.fetchone()[0] or 0
            
            # Calculate overall health score
            health_score = (
                metrics['uptime'] * 0.4 +  # 40% weight
                (1 - min(metrics['latency'] / 1000, 1)) * 0.3 +  # 30% weight
                (1 - metrics['packet_loss']) * 0.3  # 30% weight
            ) * 100
            
            return round(min(max(health_score, 0), 100))

    def get_health_trend(self, days=7):
        """Calculate network health trend compared to previous period."""
        with self.get_db() as db:
            cursor = db.cursor()
            now = datetime.utcnow()
            current_period_start = now - timedelta(days=days)
            previous_period_start = current_period_start - timedelta(days=days)
            
            # Get current period average health
            cursor.execute("""
                SELECT AVG(value) FROM system_metrics
                WHERE metric = 'health_score'
                AND timestamp >= ? AND timestamp <= ?
            """, (current_period_start.isoformat(), now.isoformat()))
            current_health = cursor.fetchone()[0] or 0
            
            # Get previous period average health
            cursor.execute("""
                SELECT AVG(value) FROM system_metrics
                WHERE metric = 'health_score'
                AND timestamp >= ? AND timestamp <= ?
            """, (previous_period_start.isoformat(), current_period_start.isoformat()))
            previous_health = cursor.fetchone()[0] or 0
            
            if previous_health == 0:
                return 0
            
            # Calculate percentage change
            return round(((current_health - previous_health) / previous_health) * 100, 1)

    def get_protected_assets(self):
        """Get count of protected network assets."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                SELECT COUNT(*) FROM assets
                WHERE status = 'protected'
            """)
            return cursor.fetchone()[0]

    def get_assets_status(self):
        """Get overall status of protected assets."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                SELECT COUNT(*) FROM assets
                WHERE status = 'protected' AND health = 'healthy'
            """)
            healthy_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM assets WHERE status = 'protected'")
            total_count = cursor.fetchone()[0]
            
            if total_count == 0:
                return "No assets configured"
            
            if healthy_count == total_count:
                return "All systems operational"
            elif healthy_count == 0:
                return "Critical systems down"
            else:
                return f"{healthy_count}/{total_count} systems operational"

    def get_network_traffic(self, start_time, interval, points):
        """Get network traffic data for the specified time range."""
        with self.get_db() as db:
            cursor = db.cursor()
            
            # Convert interval to SQLite time format
            interval_map = {
                "1m": "1 minute",
                "5m": "5 minutes",
                "1h": "1 hour"
            }
            sql_interval = interval_map.get(interval, "5 minutes")
            
            # Get traffic data points
            cursor.execute(f"""
                SELECT strftime('%Y-%m-%d %H:%M', timestamp) as time_bucket,
                       SUM(bytes_sent + bytes_received) as total_bytes
                FROM network_traffic
                WHERE timestamp >= ?
                GROUP BY strftime('{sql_interval}', timestamp)
                ORDER BY time_bucket
                LIMIT ?
            """, (start_time.isoformat(), points))
            
            # Fill in missing points with zeros
            data_points = [0] * points
            for i, (_, bytes_count) in enumerate(cursor.fetchall()):
                if i < points:
                    data_points[i] = bytes_count
            
            return data_points

    def get_security_score(self):
        """Get current security score and status."""
        with self.get_db() as db:
            cursor = db.cursor()
            
            # Get various security metrics
            metrics = {}
            
            # Check for critical vulnerabilities
            cursor.execute("""
                SELECT COUNT(*) FROM vulnerabilities
                WHERE severity = 'critical' AND status = 'open'
            """)
            metrics['critical_vulns'] = cursor.fetchone()[0]
            
            # Check for missing patches
            cursor.execute("""
                SELECT COUNT(*) FROM system_patches
                WHERE status = 'missing' AND severity >= 'high'
            """)
            metrics['missing_patches'] = cursor.fetchone()[0]
            
            # Check for security incidents
            cursor.execute("""
                SELECT COUNT(*) FROM security_incidents
                WHERE status = 'active' AND severity >= 'high'
            """)
            metrics['active_incidents'] = cursor.fetchone()[0]
            
            # Calculate base score
            base_score = 100
            base_score -= metrics['critical_vulns'] * 10  # -10 points per critical vuln
            base_score -= metrics['missing_patches'] * 5  # -5 points per missing patch
            base_score -= metrics['active_incidents'] * 15  # -15 points per active incident
            
            # Ensure score is between 0 and 100
            final_score = max(min(round(base_score), 100), 0)
            
            # Determine status
            if final_score >= 90:
                status = "Excellent"
                vuln_level = "Low"
            elif final_score >= 70:
                status = "Good"
                vuln_level = "Medium"
            else:
                status = "Needs Attention"
                vuln_level = "High"
            
            # Get patch status
            cursor.execute("""
                SELECT COUNT(*) FROM system_patches
                WHERE status = 'missing'
            """)
            missing_patches = cursor.fetchone()[0]
            
            if missing_patches == 0:
                patch_status = "Up to date"
            elif missing_patches <= 5:
                patch_status = "Minor updates available"
            else:
                patch_status = "Updates required"
            
            return {
                "score": final_score,
                "status": status,
                "vulnerability_level": vuln_level,
                "patch_status": patch_status
            }

    def start_scan(self):
        """Start a new network scan."""
        with self.get_db() as db:
            cursor = db.cursor()
            scan_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO scans (
                    id, type, status, started_at, completed_at, results
                ) VALUES (?, ?, ?, ?, NULL, NULL)
            """, (
                scan_id,
                'network',
                'running',
                datetime.utcnow().isoformat()
            ))
            db.commit()
            return scan_id

    def start_security_scan(self):
        """Start a comprehensive security scan."""
        with self.get_db() as db:
            cursor = db.cursor()
            scan_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO scans (
                    id, type, status, started_at, completed_at, results
                ) VALUES (?, ?, ?, ?, NULL, NULL)
            """, (
                scan_id,
                'security',
                'running',
                datetime.utcnow().isoformat()
            ))
            db.commit()
            return scan_id

    def schedule_maintenance(self, schedule):
        """Schedule a system maintenance window."""
        with self.get_db() as db:
            cursor = db.cursor()
            maintenance_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO maintenance (
                    id, start_time, end_time, type, description, status
                ) VALUES (?, ?, ?, ?, ?, ?)
            """, (
                maintenance_id,
                schedule['start_time'],
                schedule['end_time'],
                schedule['type'],
                schedule['description'],
                'scheduled'
            ))
            db.commit()
            return maintenance_id

    def generate_report(self, report_type):
        """Generate a security report."""
        with self.get_db() as db:
            cursor = db.cursor()
            
            # Get report data based on type
            if report_type == "security":
                # Get security metrics
                cursor.execute("""
                    SELECT 
                        COUNT(*) as total_threats,
                        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_threats,
                        SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high_threats,
                        AVG(CASE WHEN metric = 'health_score' THEN value ELSE NULL END) as avg_health
                    FROM (
                        SELECT severity, 'threat' as type FROM threats WHERE status = 'active'
                        UNION ALL
                        SELECT metric, 'metric' as type FROM system_metrics
                        WHERE timestamp >= datetime('now', '-24 hours')
                    )
                """)
                row = cursor.fetchone()
                
                # Get recent incidents
                cursor.execute("""
                    SELECT id, timestamp, type, severity, description, status
                    FROM security_incidents
                    WHERE timestamp >= datetime('now', '-7 days')
                    ORDER BY timestamp DESC
                    LIMIT 10
                """)
                incidents = []
                for incident_row in cursor.fetchall():
                    incidents.append({
                        'id': incident_row[0],
                        'timestamp': incident_row[1],
                        'type': incident_row[2],
                        'severity': incident_row[3],
                        'description': incident_row[4],
                        'status': incident_row[5]
                    })
                
                return {
                    'type': 'security',
                    'generated_at': datetime.utcnow().isoformat(),
                    'metrics': {
                        'total_threats': row[0],
                        'critical_threats': row[1],
                        'high_threats': row[2],
                        'avg_health': round(row[3] or 0, 1)
                    },
                    'recent_incidents': incidents
                }
            else:
                raise ValueError(f"Unsupported report type: {report_type}")

    def init_db(self):
        """Initialize the database schema."""
        with self.get_db() as db:
            cursor = db.cursor()
            
            # Create tables if they don't exist
            cursor.executescript("""
                -- Existing tables...
                
                -- System metrics table
                CREATE TABLE IF NOT EXISTS system_metrics (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    metric TEXT NOT NULL,
                    value REAL NOT NULL,
                    metadata TEXT
                );
                
                -- Threats table
                CREATE TABLE IF NOT EXISTS threats (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    source TEXT NOT NULL,
                    description TEXT NOT NULL,
                    status TEXT NOT NULL,
                    metadata TEXT
                );
                
                -- Assets table
                CREATE TABLE IF NOT EXISTS assets (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    health TEXT NOT NULL,
                    last_scan TEXT,
                    metadata TEXT
                );
                
                -- Network traffic table
                CREATE TABLE IF NOT EXISTS network_traffic (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    source_ip TEXT NOT NULL,
                    dest_ip TEXT NOT NULL,
                    protocol TEXT NOT NULL,
                    bytes_sent INTEGER NOT NULL,
                    bytes_received INTEGER NOT NULL,
                    metadata TEXT
                );
                
                -- Scans table
                CREATE TABLE IF NOT EXISTS scans (
                    id TEXT PRIMARY KEY,
                    type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    started_at TEXT NOT NULL,
                    completed_at TEXT,
                    results TEXT
                );
                
                -- Maintenance table
                CREATE TABLE IF NOT EXISTS maintenance (
                    id TEXT PRIMARY KEY,
                    start_time TEXT NOT NULL,
                    end_time TEXT NOT NULL,
                    type TEXT NOT NULL,
                    description TEXT NOT NULL,
                    status TEXT NOT NULL,
                    metadata TEXT
                );
                
                -- Vulnerabilities table
                CREATE TABLE IF NOT EXISTS vulnerabilities (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    asset_id TEXT NOT NULL,
                    type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    description TEXT NOT NULL,
                    status TEXT NOT NULL,
                    metadata TEXT,
                    FOREIGN KEY (asset_id) REFERENCES assets(id)
                );
                
                -- System patches table
                CREATE TABLE IF NOT EXISTS system_patches (
                    id TEXT PRIMARY KEY,
                    asset_id TEXT NOT NULL,
                    patch_id TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    status TEXT NOT NULL,
                    last_check TEXT NOT NULL,
                    metadata TEXT,
                    FOREIGN KEY (asset_id) REFERENCES assets(id)
                );
                
                -- Security incidents table
                CREATE TABLE IF NOT EXISTS security_incidents (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    description TEXT NOT NULL,
                    status TEXT NOT NULL,
                    resolution TEXT,
                    metadata TEXT
                );
                
                -- Create indexes
                CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp);
                CREATE INDEX IF NOT EXISTS idx_threats_timestamp ON threats(timestamp);
                CREATE INDEX IF NOT EXISTS idx_network_traffic_timestamp ON network_traffic(timestamp);
                CREATE INDEX IF NOT EXISTS idx_vulnerabilities_asset ON vulnerabilities(asset_id);
                CREATE INDEX IF NOT EXISTS idx_patches_asset ON system_patches(asset_id);
                CREATE INDEX IF NOT EXISTS idx_incidents_timestamp ON security_incidents(timestamp);
            """)
            
            db.commit()
            logger.info("Database schema initialized successfully") 