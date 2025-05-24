import json
import uuid
from datetime import datetime, timedelta
import secrets
import sqlite3
import os
import logging
from typing import Optional, List

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
                       SUM(bytes_sent) as bytes_sent,
                       SUM(bytes_received) as bytes_received
                FROM network_traffic
                WHERE timestamp >= ?
                GROUP BY strftime('{sql_interval}', timestamp)
                ORDER BY time_bucket
                LIMIT ?
            """, (start_time.isoformat(), points))
            
            # Fill in missing points with zeros
            data_points = [{'inbound': 0, 'outbound': 0} for _ in range(points)]
            for i, (_, sent, received) in enumerate(cursor.fetchall()):
                if i < points:
                    data_points[i] = {
                        'inbound': received or 0,
                        'outbound': sent or 0
                    }
            
            return data_points

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

    def get_network_traffic_stats(self, start_time=None, end_time=None):
        """Get network traffic statistics for a time range."""
        with self.get_db() as db:
            cursor = db.cursor()
            
            query = """
                SELECT 
                    SUM(bytes_sent) as total_bytes_sent,
                    SUM(bytes_recv) as total_bytes_recv,
                    SUM(packets_sent) as total_packets_sent,
                    SUM(packets_recv) as total_packets_recv,
                    COUNT(*) as sample_count
                FROM network_traffic
            """
            params = []
            
            if start_time or end_time:
                conditions = []
                if start_time:
                    conditions.append("timestamp >= ?")
                    params.append(start_time)
                if end_time:
                    conditions.append("timestamp <= ?")
                    params.append(end_time)
                query += " WHERE " + " AND ".join(conditions)
            
            cursor.execute(query, params)
            row = cursor.fetchone()
            
            if not row or not row[4]:  # No samples
                return {
                    'bytes_sent': 0,
                    'bytes_recv': 0,
                    'packets_sent': 0,
                    'packets_recv': 0,
                    'sample_count': 0
                }
            
            return {
                'bytes_sent': row[0],
                'bytes_recv': row[1],
                'packets_sent': row[2],
                'packets_recv': row[3],
                'sample_count': row[4]
            }

    def get_log_count(self, source_id: Optional[str] = None, level: Optional[str] = None,
                     start_time: Optional[str] = None, end_time: Optional[str] = None) -> int:
        """Get the count of logs matching the specified criteria."""
        try:
            query = "SELECT COUNT(*) FROM logs WHERE 1=1"
            params = []
            
            if source_id:
                query += " AND source_id = ?"
                params.append(source_id)
            
            if level:
                query += " AND level = ?"
                params.append(level.upper())
            
            if start_time:
                query += " AND timestamp >= ?"
                params.append(start_time)
            
            if end_time:
                query += " AND timestamp <= ?"
                params.append(end_time)
            
            with self.get_db() as conn:
                cursor = conn.execute(query, params)
                return cursor.fetchone()[0]
        except Exception as e:
            logger.error(f"Error getting log count: {str(e)}")
            raise

    def get_current_log_rate(self) -> float:
        """Get the current log ingestion rate (logs per minute)."""
        try:
            # Get logs from the last minute
            one_minute_ago = (datetime.now() - timedelta(minutes=1)).isoformat()
            
            with self.get_db() as conn:
                cursor = conn.execute(
                    "SELECT COUNT(*) FROM logs WHERE timestamp >= ?",
                    [one_minute_ago]
                )
                return cursor.fetchone()[0]
        except Exception as e:
            logger.error(f"Error getting current log rate: {str(e)}")
            raise

    def get_log_rate_data(self, start_time: datetime, interval: str, points: int) -> List[float]:
        """Get log rate data points for the specified time range and interval."""
        try:
            # Convert interval to SQLite datetime format
            interval_map = {
                "1m": "1 minute",
                "5m": "5 minutes",
                "1h": "1 hour"
            }
            sql_interval = interval_map.get(interval, "5 minutes")
            
            # Generate time buckets
            buckets = []
            current = start_time
            for _ in range(points):
                if interval == "1m":
                    next_time = current + timedelta(minutes=1)
                elif interval == "5m":
                    next_time = current + timedelta(minutes=5)
                else:  # 1h
                    next_time = current + timedelta(hours=1)
                
                buckets.append((current.isoformat(), next_time.isoformat()))
                current = next_time
            
            # Get log counts for each bucket
            rates = []
            with self.get_db() as conn:
                for start, end in buckets:
                    cursor = conn.execute(
                        "SELECT COUNT(*) FROM logs WHERE timestamp >= ? AND timestamp < ?",
                        [start, end]
                    )
                    count = cursor.fetchone()[0]
                    
                    # Convert to rate per minute
                    if interval == "1m":
                        rate = count
                    elif interval == "5m":
                        rate = count / 5
                    else:  # 1h
                        rate = count / 60
                    
                    rates.append(rate)
            
            return rates
        except Exception as e:
            logger.error(f"Error getting log rate data: {str(e)}")
            raise

    def update_network_metrics(self, metrics_data):
        """Update network metrics."""
        with self.get_db() as db:
            cursor = db.cursor()
            metrics_id = str(uuid.uuid4())
            
            cursor.execute("""
                INSERT INTO network_metrics (
                    id, timestamp, load, latency,
                    packet_loss, bandwidth_usage,
                    active_connections, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                metrics_id,
                metrics_data['timestamp'],
                metrics_data['load'],
                metrics_data.get('latency'),
                metrics_data.get('packet_loss'),
                metrics_data.get('bandwidth_usage'),
                metrics_data.get('active_connections'),
                json.dumps(metrics_data.get('metadata', {}))
            ))
            
            db.commit()
            return metrics_id

    def init_db(self):
        """Initialize the database schema."""
        with self.get_db() as db:
            cursor = db.cursor()
            
            # Create tables
            cursor.executescript("""
                -- Logs table
                CREATE TABLE IF NOT EXISTS logs (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    level TEXT NOT NULL DEFAULT 'info',
                    source TEXT NOT NULL,
                    message TEXT NOT NULL,
                    received_at TEXT NOT NULL,
                    metadata TEXT,
                    anomaly_score REAL,
                    acknowledged BOOLEAN DEFAULT 0,
                    acknowledged_at TEXT,
                    processed_at TEXT,
                    detection_run_at TEXT,
                    alert_sent_at TEXT
                );

                -- Threats table
                CREATE TABLE IF NOT EXISTS threats (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    source TEXT NOT NULL,
                    description TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'active',
                    resolution TEXT,
                    resolved_at TEXT,
                    metadata TEXT
                );

                -- System patches table
                CREATE TABLE IF NOT EXISTS system_patches (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    package_name TEXT NOT NULL,
                    current_version TEXT,
                    available_version TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'missing',
                    installed_at TEXT,
                    metadata TEXT
                );

                -- Security incidents table
                CREATE TABLE IF NOT EXISTS security_incidents (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    source TEXT NOT NULL,
                    description TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'active',
                    resolution TEXT,
                    resolved_at TEXT,
                    metadata TEXT
                );

                -- Assets table
                CREATE TABLE IF NOT EXISTS assets (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'protected',
                    health TEXT NOT NULL DEFAULT 'healthy',
                    last_scan TEXT,
                    metadata TEXT
                );

                -- System metrics table
                CREATE TABLE IF NOT EXISTS system_metrics (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    metric TEXT NOT NULL,
                    value REAL NOT NULL,
                    metadata TEXT
                );

                -- Vulnerabilities table
                CREATE TABLE IF NOT EXISTS vulnerabilities (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    type TEXT NOT NULL,
                    source TEXT NOT NULL,
                    description TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'open',
                    resolution TEXT,
                    resolved_at TEXT,
                    metadata TEXT
                );

                -- Log sources table
                CREATE TABLE IF NOT EXISTS log_sources (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    config TEXT NOT NULL,
                    format TEXT NOT NULL,
                    format_pattern TEXT,
                    status TEXT NOT NULL DEFAULT 'inactive',
                    last_update TEXT NOT NULL,
                    logs_per_minute INTEGER DEFAULT 0,
                    tags TEXT
                );

                -- Network devices table
                CREATE TABLE IF NOT EXISTS network_devices (
                    id TEXT PRIMARY KEY,
                    ip_address TEXT NOT NULL,
                    mac_address TEXT,
                    name TEXT,
                    type TEXT,
                    status TEXT DEFAULT 'active',
                    last_seen TEXT NOT NULL,
                    first_seen TEXT NOT NULL,
                    metadata TEXT,
                    UNIQUE(ip_address)
                );
                
                -- Network connections table
                CREATE TABLE IF NOT EXISTS network_connections (
                    id TEXT PRIMARY KEY,
                    source_device TEXT NOT NULL,
                    dest_device TEXT,
                    protocol TEXT NOT NULL,
                    source_port INTEGER NOT NULL,
                    dest_port INTEGER,
                    status TEXT NOT NULL DEFAULT 'established',
                    start_time TEXT NOT NULL,
                    end_time TEXT,
                    data_transferred INTEGER DEFAULT 0,
                    metadata TEXT,
                    FOREIGN KEY (source_device) REFERENCES network_devices(id),
                    FOREIGN KEY (dest_device) REFERENCES network_devices(id)
                );
                
                -- Network traffic table
                CREATE TABLE IF NOT EXISTS network_traffic (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    bytes_sent INTEGER NOT NULL,
                    bytes_received INTEGER NOT NULL,
                    packets_sent INTEGER NOT NULL,
                    packets_received INTEGER NOT NULL,
                    protocol TEXT,
                    source_device TEXT,
                    dest_device TEXT,
                    metadata TEXT,
                    FOREIGN KEY (source_device) REFERENCES network_devices(id),
                    FOREIGN KEY (dest_device) REFERENCES network_devices(id)
                );

                -- Network monitoring status table
                CREATE TABLE IF NOT EXISTS network_monitoring (
                    id INTEGER PRIMARY KEY,
                    status TEXT NOT NULL DEFAULT 'stopped',
                    last_scan TEXT,
                    devices_discovered INTEGER DEFAULT 0,
                    connections_tracked INTEGER DEFAULT 0,
                    traffic_analyzed INTEGER DEFAULT 0,
                    last_updated TEXT NOT NULL
                );

                -- Network protocols table
                CREATE TABLE IF NOT EXISTS network_protocols (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    protocol TEXT NOT NULL,
                    port INTEGER,
                    type TEXT NOT NULL,
                    description TEXT,
                    risk_level TEXT DEFAULT 'low',
                    last_seen TEXT,
                    metadata TEXT
                );

                -- Network metrics table
                CREATE TABLE IF NOT EXISTS network_metrics (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    load REAL NOT NULL,
                    latency REAL,
                    packet_loss REAL,
                    bandwidth_usage REAL,
                    active_connections INTEGER,
                    metadata TEXT
                );

                -- Settings table
                CREATE TABLE IF NOT EXISTS settings (
                    id INTEGER PRIMARY KEY,
                    api_key TEXT NOT NULL,
                    log_retention_days INTEGER DEFAULT 30,
                    alert_threshold INTEGER DEFAULT 100,
                    notification_email TEXT,
                    allowed_ips TEXT,
                    auto_block BOOLEAN DEFAULT 0,
                    block_duration INTEGER DEFAULT 3600,
                    scan_interval INTEGER DEFAULT 300,
                    last_updated TEXT
                );

                -- Alerts table
                CREATE TABLE IF NOT EXISTS alerts (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    source TEXT NOT NULL,
                    message TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'new',
                    metadata TEXT,
                    resolved_at TEXT,
                    resolution TEXT
                );

                -- Security scans table
                CREATE TABLE IF NOT EXISTS scans (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    type TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'running',
                    target TEXT NOT NULL,
                    progress INTEGER DEFAULT 0,
                    findings_count INTEGER DEFAULT 0,
                    start_time TEXT NOT NULL,
                    end_time TEXT,
                    metadata TEXT,
                    error_message TEXT
                );

                -- Scan findings table
                CREATE TABLE IF NOT EXISTS scan_findings (
                    id TEXT PRIMARY KEY,
                    scan_id TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    description TEXT NOT NULL,
                    location TEXT,
                    evidence TEXT,
                    status TEXT NOT NULL DEFAULT 'new',
                    resolution TEXT,
                    resolved_at TEXT,
                    metadata TEXT,
                    FOREIGN KEY (scan_id) REFERENCES scans(id)
                );

                -- Scan schedules table
                CREATE TABLE IF NOT EXISTS scan_schedules (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    target TEXT NOT NULL,
                    schedule TEXT NOT NULL,
                    last_run TEXT,
                    next_run TEXT,
                    status TEXT NOT NULL DEFAULT 'active',
                    metadata TEXT
                );

                -- Create indexes after all tables are created
                CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
                CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
                CREATE INDEX IF NOT EXISTS idx_logs_source ON logs(source);
                CREATE INDEX IF NOT EXISTS idx_logs_anomaly_score ON logs(anomaly_score);
                CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON vulnerabilities(severity);
                CREATE INDEX IF NOT EXISTS idx_vulnerabilities_status ON vulnerabilities(status);
                CREATE INDEX IF NOT EXISTS idx_network_devices_ip ON network_devices(ip_address);
                CREATE INDEX IF NOT EXISTS idx_network_devices_mac ON network_devices(mac_address);
                CREATE INDEX IF NOT EXISTS idx_network_connections_source ON network_connections(source_device);
                CREATE INDEX IF NOT EXISTS idx_network_connections_dest ON network_connections(dest_device);
                CREATE INDEX IF NOT EXISTS idx_network_connections_status ON network_connections(status);
                CREATE INDEX IF NOT EXISTS idx_network_traffic_timestamp ON network_traffic(timestamp);
                CREATE INDEX IF NOT EXISTS idx_network_traffic_protocol ON network_traffic(protocol);
                CREATE INDEX IF NOT EXISTS idx_network_protocols_port ON network_protocols(port);
                CREATE INDEX IF NOT EXISTS idx_network_protocols_protocol ON network_protocols(protocol);

                -- Create indexes for new tables
                CREATE INDEX IF NOT EXISTS idx_threats_severity ON threats(severity);
                CREATE INDEX IF NOT EXISTS idx_threats_status ON threats(status);
                CREATE INDEX IF NOT EXISTS idx_threats_timestamp ON threats(timestamp);
                CREATE INDEX IF NOT EXISTS idx_system_patches_severity ON system_patches(severity);
                CREATE INDEX IF NOT EXISTS idx_system_patches_status ON system_patches(status);
                CREATE INDEX IF NOT EXISTS idx_system_patches_timestamp ON system_patches(timestamp);
                CREATE INDEX IF NOT EXISTS idx_security_incidents_severity ON security_incidents(severity);
                CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON security_incidents(status);
                CREATE INDEX IF NOT EXISTS idx_security_incidents_timestamp ON security_incidents(timestamp);
                CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
                CREATE INDEX IF NOT EXISTS idx_assets_health ON assets(health);
                CREATE INDEX IF NOT EXISTS idx_system_metrics_metric ON system_metrics(metric);
                CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp);
                CREATE INDEX IF NOT EXISTS idx_scan_findings_severity ON scan_findings(severity);
                CREATE INDEX IF NOT EXISTS idx_scan_findings_status ON scan_findings(status);
                CREATE INDEX IF NOT EXISTS idx_scan_findings_scan_id ON scan_findings(scan_id);
                CREATE INDEX IF NOT EXISTS idx_scans_type ON scans(type);
                CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);
                CREATE INDEX IF NOT EXISTS idx_scans_timestamp ON scans(timestamp);
                CREATE INDEX IF NOT EXISTS idx_scan_schedules_status ON scan_schedules(status);
                CREATE INDEX IF NOT EXISTS idx_scan_schedules_next_run ON scan_schedules(next_run);
                CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp);
                CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
                CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
            """)
            
            # Initialize network monitoring status if not exists
            cursor.execute("SELECT COUNT(*) FROM network_monitoring")
            if cursor.fetchone()[0] == 0:
                cursor.execute("""
                    INSERT INTO network_monitoring (
                        id, status, last_scan, devices_discovered,
                        connections_tracked, traffic_analyzed, last_updated
                    ) VALUES (1, 'stopped', NULL, 0, 0, 0, ?)
                """, (datetime.utcnow().isoformat(),))

            # Insert default settings if not exists
            cursor.execute("SELECT COUNT(*) FROM settings")
            if cursor.fetchone()[0] == 0:
                cursor.execute("""
                    INSERT INTO settings (
                        id, api_key, log_retention_days, alert_threshold,
                        notification_email, allowed_ips, auto_block,
                        block_duration, scan_interval, last_updated
                    ) VALUES (1, ?, 30, 100, '', '[]', 0, 3600, 300, ?)
                """, (secrets.token_urlsafe(32), datetime.utcnow().isoformat()))

            # Insert default asset if not exists
            cursor.execute("SELECT COUNT(*) FROM assets")
            if cursor.fetchone()[0] == 0:
                cursor.execute("""
                    INSERT INTO assets (
                        id, name, type, status, health, last_scan, metadata
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    str(uuid.uuid4()),
                    'Local Network',
                    'network',
                    'protected',
                    'healthy',
                    datetime.utcnow().isoformat(),
                    json.dumps({
                        'description': 'Local network infrastructure',
                        'components': ['router', 'switches', 'firewall']
                    })
                ))
            
            db.commit()
            logger.info("Database schema initialized successfully")

    def update_network_device(self, device_data):
        """Update or insert a network device."""
        with self.get_db() as db:
            cursor = db.cursor()
            now = datetime.utcnow().isoformat()
            
            # Check if device exists
            cursor.execute("""
                SELECT id, first_seen FROM network_devices
                WHERE ip_address = ?
            """, (device_data['ip'],))
            existing = cursor.fetchone()
            
            if existing:
                # Update existing device
                cursor.execute("""
                    UPDATE network_devices
                    SET mac_address = ?,
                        status = 'active',
                        last_seen = ?,
                        metadata = ?
                    WHERE ip_address = ?
                """, (
                    device_data.get('mac'),
                    now,
                    json.dumps(device_data.get('metadata', {})),
                    device_data['ip']
                ))
                device_id = existing[0]
            else:
                # Insert new device
                device_id = str(uuid.uuid4())
                cursor.execute("""
                    INSERT INTO network_devices (
                        id, ip_address, mac_address, status,
                        last_seen, first_seen, metadata
                    ) VALUES (?, ?, ?, 'active', ?, ?, ?)
                """, (
                    device_id,
                    device_data['ip'],
                    device_data.get('mac'),
                    now,
                    now,
                    json.dumps(device_data.get('metadata', {}))
                ))
            
            db.commit()
            return device_id

    def add_network_connection(self, connection_data):
        """Add a new network connection."""
        with self.get_db() as db:
            cursor = db.cursor()
            connection_id = str(uuid.uuid4())
            
            cursor.execute("""
                INSERT INTO network_connections (
                    id, source_device, dest_device, protocol,
                    source_port, dest_port, status, start_time, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                connection_id,
                connection_data['source_device'],
                connection_data.get('dest_device'),
                connection_data['protocol'],
                connection_data['source_port'],
                connection_data.get('dest_port'),
                connection_data['status'],
                connection_data['start_time'],
                json.dumps(connection_data.get('metadata', {}))
            ))
            
            db.commit()
            return connection_id

    def update_network_traffic(self, traffic_data):
        """Add network traffic statistics."""
        with self.get_db() as db:
            cursor = db.cursor()
            traffic_id = str(uuid.uuid4())
            
            cursor.execute("""
                INSERT INTO network_traffic (
                    id, timestamp, bytes_sent, bytes_recv,
                    packets_sent, packets_recv, protocol, source_device, dest_device, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                traffic_id,
                traffic_data['timestamp'],
                traffic_data['bytes_sent'],
                traffic_data['bytes_recv'],
                traffic_data['packets_sent'],
                traffic_data['packets_recv'],
                traffic_data['protocol'],
                traffic_data['source_device'],
                traffic_data.get('dest_device'),
                json.dumps(traffic_data.get('metadata', {}))
            ))
            
            db.commit()
            return traffic_id

    def get_network_devices(self, status=None):
        """Get network devices with optional status filter."""
        with self.get_db() as db:
            cursor = db.cursor()
            
            query = """
                SELECT id, ip_address, mac_address, name, type,
                       status, last_seen, first_seen, metadata
                FROM network_devices
            """
            params = []
            
            if status:
                query += " WHERE status = ?"
                params.append(status)
            
            query += " ORDER BY last_seen DESC"
            
            cursor.execute(query, params)
            devices = []
            for row in cursor.fetchall():
                device = {
                    'id': row[0],
                    'ip_address': row[1],
                    'mac_address': row[2],
                    'name': row[3],
                    'type': row[4],
                    'status': row[5],
                    'last_seen': row[6],
                    'first_seen': row[7],
                    'metadata': json.loads(row[8]) if row[8] else {}
                }
                devices.append(device)
            
            return devices

    def get_network_connections(self, status=None, limit=100):
        """Get network connections with optional status filter."""
        with self.get_db() as db:
            cursor = db.cursor()
            
            query = """
                SELECT c.id, c.source_device, c.dest_device, c.protocol, c.source_port, c.dest_port,
                       c.status, c.start_time, c.end_time, c.data_transferred, c.metadata,
                       s.name as source_name, d.name as dest_name
                FROM network_connections c
                LEFT JOIN network_devices s ON c.source_device = s.id
                LEFT JOIN network_devices d ON c.dest_device = d.id
            """
            params = []
            
            if status:
                query += " WHERE c.status = ?"
                params.append(status)
            
            query += " ORDER BY c.start_time DESC LIMIT ?"
            params.append(limit)
            
            cursor.execute(query, params)
            connections = []
            for row in cursor.fetchall():
                connection = {
                    'id': row[0],
                    'source': {
                        'device_id': row[1],
                        'name': row[12]
                    },
                    'destination': {
                        'device_id': row[2],
                        'name': row[13]
                    },
                    'protocol': row[3],
                    'source_port': row[4],
                    'dest_port': row[5],
                    'status': row[6],
                    'start_time': row[7],
                    'end_time': row[8],
                    'data_transferred': row[9],
                    'metadata': json.loads(row[10]) if row[10] else {}
                }
                connections.append(connection)
            
            return connections

    def get_network_traffic_stats(self, start_time=None, end_time=None):
        """Get network traffic statistics for a time range."""
        with self.get_db() as db:
            cursor = db.cursor()
            
            query = """
                SELECT 
                    SUM(bytes_sent) as total_bytes_sent,
                    SUM(bytes_recv) as total_bytes_recv,
                    SUM(packets_sent) as total_packets_sent,
                    SUM(packets_recv) as total_packets_recv,
                    COUNT(*) as sample_count
                FROM network_traffic
            """
            params = []
            
            if start_time or end_time:
                conditions = []
                if start_time:
                    conditions.append("timestamp >= ?")
                    params.append(start_time)
                if end_time:
                    conditions.append("timestamp <= ?")
                    params.append(end_time)
                query += " WHERE " + " AND ".join(conditions)
            
            cursor.execute(query, params)
            row = cursor.fetchone()
            
            if not row or not row[4]:  # No samples
                return {
                    'bytes_sent': 0,
                    'bytes_recv': 0,
                    'packets_sent': 0,
                    'packets_recv': 0,
                    'sample_count': 0
                }
            
            return {
                'bytes_sent': row[0],
                'bytes_recv': row[1],
                'packets_sent': row[2],
                'packets_recv': row[3],
                'sample_count': row[4]
            }

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
        """Start a new security scan."""
        with self.get_db() as db:
            cursor = db.cursor()
            scan_id = str(uuid.uuid4())
            timestamp = datetime.utcnow().isoformat()
            
            cursor.execute("""
                INSERT INTO scans (
                    id, timestamp, type, status, target,
                    progress, findings_count, start_time, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                scan_id,
                timestamp,
                'security',
                'running',
                'system',
                0,
                0,
                timestamp,
                json.dumps({
                    'scan_type': 'full',
                    'modules': ['vulnerabilities', 'configuration', 'compliance']
                })
            ))
            db.commit()
            return scan_id

    def update_scan_status(self, scan_id, status, progress=None, findings_count=None, error_message=None):
        """Update the status of a security scan."""
        with self.get_db() as db:
            cursor = db.cursor()
            updates = ["status = ?"]
            params = [status]
            
            if progress is not None:
                updates.append("progress = ?")
                params.append(progress)
            if findings_count is not None:
                updates.append("findings_count = ?")
                params.append(findings_count)
            if error_message is not None:
                updates.append("error_message = ?")
                params.append(error_message)
            if status in ['completed', 'failed']:
                updates.append("end_time = ?")
                params.append(datetime.utcnow().isoformat())
            
            params.append(scan_id)
            cursor.execute(f"""
                UPDATE scans
                SET {", ".join(updates)}
                WHERE id = ?
            """, params)
            db.commit()
            return cursor.rowcount > 0

    def add_scan_finding(self, scan_id, finding):
        """Add a finding to a security scan."""
        with self.get_db() as db:
            cursor = db.cursor()
            finding_id = str(uuid.uuid4())
            timestamp = datetime.utcnow().isoformat()
            
            cursor.execute("""
                INSERT INTO scan_findings (
                    id, scan_id, timestamp, type, severity,
                    description, location, evidence, status, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                finding_id,
                scan_id,
                timestamp,
                finding['type'],
                finding['severity'],
                finding['description'],
                finding.get('location'),
                finding.get('evidence'),
                'new',
                json.dumps(finding.get('metadata', {}))
            ))
            
            # Update findings count in scan
            cursor.execute("""
                UPDATE scans
                SET findings_count = findings_count + 1
                WHERE id = ?
            """, (scan_id,))
            
            db.commit()
            return finding_id

    def get_scan(self, scan_id):
        """Get details of a specific scan."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                SELECT id, timestamp, type, status, target,
                       progress, findings_count, start_time, end_time,
                       metadata, error_message
                FROM scans
                WHERE id = ?
            """, (scan_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return {
                'id': row[0],
                'timestamp': row[1],
                'type': row[2],
                'status': row[3],
                'target': row[4],
                'progress': row[5],
                'findings_count': row[6],
                'start_time': row[7],
                'end_time': row[8],
                'metadata': json.loads(row[9]) if row[9] else {},
                'error_message': row[10]
            }

    def get_scan_findings(self, scan_id, status=None, severity=None):
        """Get findings for a specific scan."""
        with self.get_db() as db:
            cursor = db.cursor()
            query = ["""
                SELECT id, timestamp, type, severity, description,
                       location, evidence, status, resolution, resolved_at,
                       metadata
                FROM scan_findings
                WHERE scan_id = ?
            """]
            params = [scan_id]
            
            if status:
                query.append("AND status = ?")
                params.append(status)
            if severity:
                query.append("AND severity = ?")
                params.append(severity)
            
            query.append("ORDER BY severity DESC, timestamp DESC")
            cursor.execute(" ".join(query), params)
            
            findings = []
            for row in cursor.fetchall():
                finding = {
                    'id': row[0],
                    'timestamp': row[1],
                    'type': row[2],
                    'severity': row[3],
                    'description': row[4],
                    'location': row[5],
                    'evidence': row[6],
                    'status': row[7],
                    'resolution': row[8],
                    'resolved_at': row[9],
                    'metadata': json.loads(row[10]) if row[10] else {}
                }
                findings.append(finding)
            return findings

    def update_finding_status(self, finding_id, status, resolution=None):
        """Update the status of a scan finding."""
        with self.get_db() as db:
            cursor = db.cursor()
            updates = ["status = ?"]
            params = [status]
            
            if resolution:
                updates.append("resolution = ?")
                params.append(resolution)
            if status == 'resolved':
                updates.append("resolved_at = ?")
                params.append(datetime.utcnow().isoformat())
            
            params.append(finding_id)
            cursor.execute(f"""
                UPDATE scan_findings
                SET {", ".join(updates)}
                WHERE id = ?
            """, params)
            db.commit()
            return cursor.rowcount > 0

    def get_active_scans(self):
        """Get all active security scans."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                SELECT id, timestamp, type, status, target,
                       progress, findings_count, start_time, end_time,
                       metadata, error_message
                FROM scans
                WHERE status IN ('running', 'queued')
                ORDER BY start_time DESC
            """)
            scans = []
            for row in cursor.fetchall():
                scan = {
                    'id': row[0],
                    'timestamp': row[1],
                    'type': row[2],
                    'status': row[3],
                    'target': row[4],
                    'progress': row[5],
                    'findings_count': row[6],
                    'start_time': row[7],
                    'end_time': row[8],
                    'metadata': json.loads(row[9]) if row[9] else {},
                    'error_message': row[10]
                }
                scans.append(scan)
            return scans

    def get_recent_scans(self, limit=10):
        """Get recent security scans."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                SELECT id, timestamp, type, status, target,
                       progress, findings_count, start_time, end_time,
                       metadata, error_message
                FROM scans
                ORDER BY start_time DESC
                LIMIT ?
            """, (limit,))
            scans = []
            for row in cursor.fetchall():
                scan = {
                    'id': row[0],
                    'timestamp': row[1],
                    'type': row[2],
                    'status': row[3],
                    'target': row[4],
                    'progress': row[5],
                    'findings_count': row[6],
                    'start_time': row[7],
                    'end_time': row[8],
                    'metadata': json.loads(row[9]) if row[9] else {},
                    'error_message': row[10]
                }
                scans.append(scan)
            return scans

    def schedule_scan(self, schedule):
        """Schedule a new security scan."""
        with self.get_db() as db:
            cursor = db.cursor()
            schedule_id = str(uuid.uuid4())
            
            cursor.execute("""
                INSERT INTO scan_schedules (
                    id, name, type, target, schedule,
                    last_run, next_run, status, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                schedule_id,
                schedule['name'],
                schedule['type'],
                schedule['target'],
                schedule['schedule'],
                None,
                self._calculate_next_run(schedule['schedule']),
                'active',
                json.dumps(schedule.get('metadata', {}))
            ))
            db.commit()
            return schedule_id

    def _calculate_next_run(self, schedule):
        """Calculate the next run time based on the schedule."""
        # This is a placeholder. In a real implementation, you would parse the schedule
        # (which could be cron-style or interval-based) and calculate the next run time
        return (datetime.utcnow() + timedelta(hours=24)).isoformat()

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

    def get_alerts(self, start_time=None, end_time=None, severity=None, status=None, limit=100):
        """Get security alerts with optional filtering."""
        with self.get_db() as db:
            cursor = db.cursor()
            query = ["SELECT * FROM alerts WHERE 1=1"]
            params = []
            
            if start_time:
                query.append("AND timestamp >= ?")
                params.append(start_time)
            if end_time:
                query.append("AND timestamp <= ?")
                params.append(end_time)
            if severity:
                query.append("AND severity = ?")
                params.append(severity)
            if status:
                query.append("AND status = ?")
                params.append(status)
            
            query.append("ORDER BY timestamp DESC LIMIT ?")
            params.append(limit)
            
            cursor.execute(" ".join(query), params)
            alerts = []
            for row in cursor.fetchall():
                alert = {
                    'id': row[0],
                    'timestamp': row[1],
                    'type': row[2],
                    'severity': row[3],
                    'source': row[4],
                    'message': row[5],
                    'status': row[6],
                    'metadata': json.loads(row[7]) if row[7] else {},
                    'resolved_at': row[8],
                    'resolution': row[9]
                }
                alerts.append(alert)
            return alerts

    def get_network_protocols(self):
        """Get network protocol distribution from traffic data."""
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                
                # Get protocol distribution from traffic data for the last 24 hours
                cursor.execute("""
                    SELECT protocol, COUNT(*) as count
                    FROM network_traffic
                    WHERE timestamp >= datetime('now', '-24 hours')
                    GROUP BY protocol
                """)
                
                protocols = {
                    'http_https': 0,
                    'dns': 0,
                    'ssh': 0,
                    'smtp': 0,
                    'other': 0
                }
                
                for protocol, count in cursor.fetchall():
                    if protocol in ['http', 'https']:
                        protocols['http_https'] += count
                    elif protocol == 'dns':
                        protocols['dns'] = count
                    elif protocol == 'ssh':
                        protocols['ssh'] = count
                    elif protocol == 'smtp':
                        protocols['smtp'] = count
                    else:
                        protocols['other'] += count
                
                return protocols
        except Exception as e:
            logger.error(f"Error getting network protocols: {str(e)}")
            return {
                'http_https': 0,
                'dns': 0,
                'ssh': 0,
                'smtp': 0,
                'other': 0
            } 