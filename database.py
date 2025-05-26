import json
import uuid
from datetime import datetime, timedelta
import secrets
import sqlite3
import os
import logging
from typing import Optional, List, Dict
import asyncio

import aiosqlite

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
    _instances = {}  # Process-specific instances
    _initialized = {}  # Process-specific initialization flags

    def __new__(cls, db_path="data/securenet.db"):
        pid = os.getpid()
        if pid not in cls._instances:
            cls._instances[pid] = super(Database, cls).__new__(cls)
            cls._initialized[pid] = False
        return cls._instances[pid]

    def __init__(self, db_path="data/securenet.db"):
        pid = os.getpid()
        if not self._initialized.get(pid, False):
            self.db_path = db_path
            self._ensure_db_directory()
            self._initialized[pid] = True

    def _ensure_db_directory(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)

    def get_db(self):
        return sqlite3.connect(self.db_path)

    async def init_db(self):
        async with aiosqlite.connect(self.db_path) as conn:
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS assets (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    type VARCHAR(50) NOT NULL,
                    status VARCHAR(50) NOT NULL,
                    ip_address VARCHAR(45),
                    mac_address VARCHAR(17),
                    last_seen TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS health_trends (
                    id SERIAL PRIMARY KEY,
                    metric_name VARCHAR(50) NOT NULL,
                    value FLOAT NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS alerts (
                    id SERIAL PRIMARY KEY,
                    type VARCHAR(50) NOT NULL,
                    severity VARCHAR(20) NOT NULL,
                    message TEXT NOT NULL,
                    source VARCHAR(255),
                    status VARCHAR(20) DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    resolved_at TIMESTAMP
                )
            ''')
            await conn.commit()

    async def get_db_async(self):
        return aiosqlite.connect(self.db_path)

    def _init_db(self):
        """Initialize the database schema synchronously."""
        try:
            # Create tables synchronously first
            with self.get_db() as db:
                cursor = db.cursor()
                
                # Create settings table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS settings (
                        key TEXT PRIMARY KEY,
                        value TEXT NOT NULL,
                        type TEXT DEFAULT 'string',
                        description TEXT,
                        section TEXT DEFAULT 'global',
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Create other essential tables...
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS network_monitoring (
                        id INTEGER PRIMARY KEY,
                        status TEXT DEFAULT 'stopped',
                        last_check TIMESTAMP,
                        active_monitors INTEGER DEFAULT 0,
                        devices_discovered INTEGER DEFAULT 0,
                        connections_tracked INTEGER DEFAULT 0,
                        traffic_analyzed INTEGER DEFAULT 0,
                        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Initialize network monitoring if not exists
                cursor.execute("""
                    INSERT OR IGNORE INTO network_monitoring (id, status)
                    VALUES (1, 'stopped')
                """)
                
                db.commit()
                logger.info("Database schema initialized successfully")
            
            # Initialize async pool in background
            asyncio.create_task(self._init_pool())
            
        except Exception as e:
            logger.error(f"Error initializing database: {str(e)}")
            raise

    @classmethod
    def cleanup(cls):
        """Clean up process-specific instance."""
        process_id = os.getpid()
        if process_id in cls._instances:
            instance = cls._instances[process_id]
            if instance._pool:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.create_task(instance._pool.close())
                else:
                    loop.run_until_complete(instance._pool.close())
            del cls._instances[process_id]
            if process_id in cls._initialized:
                del cls._initialized[process_id]

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
            total_devices = cursor.fetchone()[0] or 0
            
            # Get active connections
            cursor.execute("""
                SELECT COUNT(*) FROM network_connections
                WHERE status = 'active'
            """)
            active_connections = cursor.fetchone()[0] or 0
            
            # Get blocked attempts
            cursor.execute("""
                SELECT COUNT(*) FROM network_connections
                WHERE status = 'blocked'
            """)
            blocked_attempts = cursor.fetchone()[0] or 0
            
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
                       SUM(bytes_recv) as bytes_recv
                FROM network_traffic
                WHERE timestamp >= ?
                GROUP BY strftime('{sql_interval}', timestamp)
                ORDER BY time_bucket
                LIMIT ?
            """, (start_time.isoformat(), points))
            
            # Fill in missing points with zeros
            data_points = [{'inbound': 0, 'outbound': 0} for _ in range(points)]
            for i, (_, sent, recv) in enumerate(cursor.fetchall()):
                if i < points:
                    data_points[i] = {
                        'inbound': recv or 0,
                        'outbound': sent or 0
                    }
            
            return data_points

    def get_network_connections(self, status=None, limit=100):
        """Get network connections with optional status filter."""
        with self.get_db() as db:
            cursor = db.cursor()
            
            query = """
                SELECT c.id, c.source_device, c.dest_device, c.protocol, c.source_port, c.dest_port,
                       c.status, c.start_time, c.end_time, c.data_transferred, c.metadata,
                       COALESCE(s.name, s.ip_address) as source_name, s.ip_address as source_ip,
                       COALESCE(d.name, d.ip_address) as dest_name, d.ip_address as dest_ip
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
                        'name': row[12],
                        'ip': row[13]
                    },
                    'destination': {
                        'device_id': row[2],
                        'name': row[14],
                        'ip': row[15]
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
            now = datetime.utcnow().isoformat()
            cursor.execute("""
                UPDATE network_connections
                SET status = 'blocked',
                    end_time = ?,
                    status_changed_at = ?,
                    updated_at = ?
                WHERE id = ?
            """, (now, now, now, connection_id))
            db.commit()
            return cursor.rowcount > 0

    def update_connection_status(self, connection_id, new_status):
        """Update a connection's status."""
        with self.get_db() as db:
            cursor = db.cursor()
            now = datetime.utcnow().isoformat()
            cursor.execute("""
                UPDATE network_connections
                SET status = ?,
                    status_changed_at = ?,
                    updated_at = ?
                WHERE id = ?
            """, (new_status, now, now, connection_id))
            db.commit()
            return cursor.rowcount > 0

    def add_network_connection(self, connection_data):
        """Add a new network connection."""
        with self.get_db() as db:
            cursor = db.cursor()
            connection_id = str(uuid.uuid4())
            now = datetime.utcnow().isoformat()
            
            cursor.execute("""
                INSERT INTO network_connections (
                    id, source_device, dest_device, protocol,
                    source_port, dest_port, status, start_time,
                    status_changed_at, metadata, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                connection_id,
                connection_data['source_device'],
                connection_data.get('dest_device'),
                connection_data['protocol'],
                connection_data['source_port'],
                connection_data.get('dest_port'),
                connection_data['status'],
                connection_data['start_time'],
                now,  # status_changed_at
                json.dumps(connection_data.get('metadata', {})),
                now,  # created_at
                now   # updated_at
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
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                
                # Get vulnerability count by severity
                cursor.execute("""
                    SELECT severity, COUNT(*) as count
                    FROM vulnerabilities
                    WHERE status != 'resolved'
                    GROUP BY severity
                """)
                vulnerabilities = {row[0]: row[1] for row in cursor.fetchall()}
                
                # Get patch status
                cursor.execute("""
                    SELECT status, COUNT(*) as count
                    FROM system_patches
                    GROUP BY status
                """)
                patches = {row[0]: row[1] for row in cursor.fetchall()}
                
                # Calculate base score (100 points)
                score = 100
                
                # Deduct points for vulnerabilities
                score -= (
                    (vulnerabilities.get('critical', 0) * 20) +
                    (vulnerabilities.get('high', 0) * 10) +
                    (vulnerabilities.get('medium', 0) * 5) +
                    (vulnerabilities.get('low', 0) * 2)
                )
                
                # Deduct points for pending patches
                score -= patches.get('pending', 0) * 5
                
                # Ensure score is between 0 and 100
                score = max(0, min(100, score))
                
                # Determine status
                if score >= 90:
                    status = "excellent"
                elif score >= 75:
                    status = "good"
                elif score >= 50:
                    status = "fair"
                else:
                    status = "poor"
                
                return {
                    "score": score,
                    "status": status,
                    "vulnerability_level": {
                        "critical": vulnerabilities.get('critical', 0),
                        "high": vulnerabilities.get('high', 0),
                        "medium": vulnerabilities.get('medium', 0),
                        "low": vulnerabilities.get('low', 0)
                    },
                    "patch_status": {
                        "applied": patches.get('applied', 0),
                        "pending": patches.get('pending', 0),
                        "failed": patches.get('failed', 0)
                    }
                }
        except Exception as e:
            logger.error(f"Error getting security score: {str(e)}")
            return {
                "score": 0,
                "status": "unknown",
                "vulnerability_level": {},
                "patch_status": {}
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
        """Get all currently active security scans."""
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, type, status, progress, findings_count, start_time, end_time, metadata
                    FROM scans
                    WHERE status IN ('running', 'queued', 'paused')
                    ORDER BY start_time DESC
                """)
                scans = cursor.fetchall()
                return [{
                    'id': scan[0],
                    'type': scan[1],
                    'status': scan[2],
                    'progress': scan[3],
                    'findings_count': scan[4],
                    'start_time': scan[5],
                    'end_time': scan[6],
                    'metadata': json.loads(scan[7]) if scan[7] else {}
                } for scan in scans]
        except Exception as e:
            logger.error(f"Error getting active scans: {str(e)}")
            return []

    def get_recent_findings(self, limit=50):
        """Get recent security findings."""
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, scan_id, timestamp, type, severity, description, location, status, evidence, metadata
                    FROM scan_findings
                    ORDER BY timestamp DESC
                    LIMIT ?
                """, (limit,))
                findings = cursor.fetchall()
                return [{
                    'id': finding[0],
                    'scan_id': finding[1],
                    'timestamp': finding[2],
                    'type': finding[3],
                    'severity': finding[4],
                    'description': finding[5],
                    'location': finding[6],
                    'status': finding[7],
                    'evidence': finding[8],
                    'metadata': json.loads(finding[9]) if finding[9] else {}
                } for finding in findings]
        except Exception as e:
            logger.error(f"Error getting recent findings: {str(e)}")
            return []

    def get_security_metrics(self):
        """Get current security metrics."""
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                
                # Get total scans
                cursor.execute("SELECT COUNT(*) FROM scans")
                total_scans = cursor.fetchone()[0] or 0
                
                # Get active threats
                cursor.execute("""
                    SELECT COUNT(*) FROM scan_findings 
                    WHERE status = 'open' AND severity IN ('critical', 'high')
                """)
                active_threats = cursor.fetchone()[0] or 0
                
                # Get security score (based on various factors)
                cursor.execute("""
                    SELECT 
                        CASE 
                            WHEN COUNT(*) = 0 THEN 100
                            ELSE 100 - (
                                (COUNT(CASE WHEN severity = 'critical' THEN 1 END) * 10) +
                                (COUNT(CASE WHEN severity = 'high' THEN 1 END) * 5) +
                                (COUNT(CASE WHEN severity = 'medium' THEN 1 END) * 2) +
                                (COUNT(CASE WHEN severity = 'low' THEN 1 END) * 1)
                            )
                        END as score
                    FROM scan_findings
                    WHERE status = 'open'
                """)
                security_score = max(0, min(100, cursor.fetchone()[0] or 100))
                
                # Get protected assets count
                cursor.execute("SELECT COUNT(*) FROM assets WHERE status = 'protected'")
                protected_assets = cursor.fetchone()[0] or 0
                
                return {
                    'total_scans': total_scans,
                    'active_threats': active_threats,
                    'security_score': security_score,
                    'protected_assets': protected_assets
                }
        except Exception as e:
            logger.error(f"Error getting security metrics: {str(e)}")
            return {
                'total_scans': 0,
                'active_threats': 0,
                'security_score': 100,
                'protected_assets': 0
            }

    def get_scan_statistics(self):
        """Get statistics about security scans."""
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                
                # Get total findings
                cursor.execute("SELECT COUNT(*) FROM scan_findings")
                total_findings = cursor.fetchone()[0] or 0
                
                # Get critical findings
                cursor.execute("""
                    SELECT COUNT(*) FROM scan_findings 
                    WHERE severity = 'critical'
                """)
                critical_findings = cursor.fetchone()[0] or 0
                
                # Get success rate
                cursor.execute("""
                    SELECT 
                        COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*)
                    FROM scans
                    WHERE status IN ('completed', 'failed')
                """)
                success_rate = round(cursor.fetchone()[0] or 0, 1)
                
                # Get average scan time
                cursor.execute("""
                    SELECT AVG(
                        (strftime('%s', end_time) - strftime('%s', start_time))
                    )
                    FROM scans
                    WHERE status = 'completed'
                    AND end_time IS NOT NULL
                """)
                avg_scan_time = round(cursor.fetchone()[0] or 0, 1)
                
                return {
                    'total_findings': total_findings,
                    'critical_findings': critical_findings,
                    'success_rate': success_rate,
                    'avg_scan_time': avg_scan_time
                }
        except Exception as e:
            logger.error(f"Error getting scan statistics: {str(e)}")
            return {
                'total_findings': 0,
                'critical_findings': 0,
                'success_rate': 0,
                'avg_scan_time': 0
            }

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

    def get_page_settings(self, section: str) -> dict:
        """Get settings for a specific section."""
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT key, value, type, description
                    FROM settings
                    WHERE section = ?
                """, (section,))
                settings = {}
                for row in cursor.fetchall():
                    key, value, type_, description = row
                    # Convert value based on type
                    if type_ == 'boolean':
                        settings[key] = value.lower() == 'true'
                    elif type_ == 'integer':
                        settings[key] = int(value)
                    elif type_ == 'float':
                        settings[key] = float(value)
                    elif type_ == 'json':
                        settings[key] = json.loads(value)
                    else:
                        settings[key] = value
                return settings
        except Exception as e:
            logger.error(f"Error getting {section} settings: {str(e)}")
            raise

    def get_network_monitoring_status(self) -> dict:
        """Get current network monitoring status."""
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                # Get monitoring status
                cursor.execute("""
                    SELECT status, last_check, active_monitors
                    FROM network_monitoring
                    WHERE id = 1
                """)
                row = cursor.fetchone()
                if not row:
                    return {
                        "status": "inactive",
                        "last_check": None,
                        "active_monitors": 0,
                        "alerts": []
                    }
                
                status, last_check, active_monitors = row
                
                # Get recent alerts
                cursor.execute("""
                    SELECT id, timestamp, severity, message, source
                    FROM network_alerts
                    WHERE timestamp >= datetime('now', '-1 hour')
                    ORDER BY timestamp DESC
                    LIMIT 10
                """)
                alerts = []
                for alert_row in cursor.fetchall():
                    alert_id, timestamp, severity, message, source = alert_row
                    alerts.append({
                        "id": alert_id,
                        "timestamp": timestamp,
                        "severity": severity,
                        "message": message,
                        "source": source
                    })
                
                return {
                    "status": status,
                    "last_check": last_check,
                    "active_monitors": active_monitors,
                    "alerts": alerts
                }
        except Exception as e:
            logger.error(f"Error getting network monitoring status: {str(e)}")
            raise

    def start_network_monitoring(self) -> bool:
        """Start network monitoring."""
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                # Check if monitoring is already active
                cursor.execute("""
                    SELECT status FROM network_monitoring WHERE id = 1
                """)
                row = cursor.fetchone()
                if row and row[0] == 'active':
                    return False
                
                # Update monitoring status
                cursor.execute("""
                    INSERT INTO network_monitoring (id, status, last_check, active_monitors)
                    VALUES (1, 'active', datetime('now'), 0)
                    ON CONFLICT(id) DO UPDATE SET
                        status = 'active',
                        last_check = datetime('now')
                """)
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error starting network monitoring: {str(e)}")
            raise

    def stop_network_monitoring(self) -> bool:
        """Stop network monitoring."""
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                # Check if monitoring is already inactive
                cursor.execute("""
                    SELECT status FROM network_monitoring WHERE id = 1
                """)
                row = cursor.fetchone()
                if row and row[0] == 'inactive':
                    return False
                
                # Update monitoring status
                cursor.execute("""
                    UPDATE network_monitoring
                    SET status = 'inactive',
                        last_check = datetime('now')
                    WHERE id = 1
                """)
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error stopping network monitoring: {str(e)}")
            raise

    def initialize_network_monitoring(self):
        """Initialize network monitoring tables if they don't exist."""
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                
                # Create network_monitoring table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS network_monitoring (
                        id INTEGER PRIMARY KEY,
                        status TEXT NOT NULL DEFAULT 'stopped',
                        last_check TIMESTAMP,
                        active_monitors INTEGER DEFAULT 0,
                        devices_discovered INTEGER DEFAULT 0,
                        connections_tracked INTEGER DEFAULT 0,
                        traffic_analyzed INTEGER DEFAULT 0,
                        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Create network_alerts table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS network_alerts (
                        id TEXT PRIMARY KEY,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        severity TEXT NOT NULL,
                        message TEXT NOT NULL,
                        source TEXT,
                        status TEXT DEFAULT 'active',
                        resolution TEXT,
                        resolved_at TIMESTAMP
                    )
                """)
                
                # Create network_monitors table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS network_monitors (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL,
                        status TEXT DEFAULT 'active',
                        config TEXT,
                        last_check TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Initialize network monitoring if not exists
                cursor.execute("""
                    INSERT OR IGNORE INTO network_monitoring (
                        id, status, last_check, active_monitors,
                        devices_discovered, connections_tracked, traffic_analyzed
                    ) VALUES (1, 'stopped', NULL, 0, 0, 0, 0)
                """)
                
                conn.commit()
                logger.info("Network monitoring tables initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing network monitoring tables: {str(e)}")
            raise

    def get_settings(self) -> dict:
        """Get global application settings."""
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                # First ensure the settings table exists with correct schema
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS settings (
                        key TEXT PRIMARY KEY,
                        value TEXT NOT NULL,
                        type TEXT DEFAULT 'string',
                        description TEXT,
                        section TEXT DEFAULT 'global',
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Get all settings
                cursor.execute("SELECT key, value, type, description FROM settings")
                settings = {}
                for row in cursor.fetchall():
                    key, value, type_, description = row
                    if not value:  # Skip empty values
                        continue
                    try:
                        # Convert value based on type
                        if type_ == 'boolean':
                            settings[key] = value.lower() == 'true'
                        elif type_ == 'integer':
                            settings[key] = int(value)
                        elif type_ == 'float':
                            settings[key] = float(value)
                        elif type_ == 'json':
                            settings[key] = json.loads(value)
                        else:
                            settings[key] = value
                    except (json.JSONDecodeError, ValueError):
                        # If conversion fails, use as is
                        settings[key] = value
                
                # Ensure API key is synchronized with environment
                env_api_key = os.getenv('API_KEY')
                if env_api_key and env_api_key != settings.get('api_key'):
                    settings['api_key'] = env_api_key
                    cursor.execute("""
                        UPDATE settings 
                        SET value = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE key = 'api_key'
                    """, (env_api_key,))
                    conn.commit()
                elif not env_api_key and 'api_key' not in settings:
                    # Generate new API key if none exists
                    new_key = secrets.token_urlsafe(32)
                    os.environ['API_KEY'] = new_key
                    settings['api_key'] = new_key
                    cursor.execute("""
                        INSERT INTO settings (key, value, updated_at)
                        VALUES (?, ?, CURRENT_TIMESTAMP)
                    """, ('api_key', new_key))
                    conn.commit()
                
                # Ensure other required settings exist with defaults
                required_settings = {
                    'network_monitoring_enabled': True,
                    'log_retention_days': 30,
                    'alert_threshold': 0.8
                }
                
                needs_update = False
                for key, default_value in required_settings.items():
                    if key not in settings:
                        settings[key] = default_value
                        cursor.execute("""
                            INSERT INTO settings (key, value, updated_at)
                            VALUES (?, ?, ?)
                        """, (
                            key,
                            json.dumps(default_value) if not isinstance(default_value, str) else default_value,
                            datetime.utcnow().isoformat()
                        ))
                        needs_update = True
                
                if needs_update:
                    conn.commit()
                
                return settings
        except Exception as e:
            logger.error(f"Error getting settings: {str(e)}")
            # Return default settings if database access fails
            api_key = os.getenv('API_KEY', secrets.token_urlsafe(32))
            if not os.getenv('API_KEY'):
                os.environ['API_KEY'] = api_key
            return {
                'api_key': api_key,
                'network_monitoring_enabled': True,
                'log_retention_days': 30,
                'alert_threshold': 0.8
            }

    def update_settings(self, settings: dict) -> bool:
        """Update global application settings."""
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                # First ensure the settings table exists
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS settings (
                        key TEXT PRIMARY KEY,
                        value TEXT NOT NULL,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Update each setting
                for key, value in settings.items():
                    # Convert value to JSON string if it's not a string
                    if not isinstance(value, str):
                        value = json.dumps(value)
                    
                    cursor.execute("""
                        INSERT INTO settings (key, value, updated_at)
                        VALUES (?, ?, ?)
                        ON CONFLICT(key) DO UPDATE SET
                            value = ?,
                            updated_at = ?
                    """, (
                        key,
                        value,
                        datetime.utcnow().isoformat(),
                        value,
                        datetime.utcnow().isoformat()
                    ))
                
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error updating settings: {str(e)}")
            return False

    def update_page_settings(self, page_name: str, settings: dict) -> bool:
        """Update settings for a specific page."""
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                # First ensure the page_settings table exists
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS page_settings (
                        page_name TEXT PRIMARY KEY,
                        settings TEXT NOT NULL,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Update or insert settings
                cursor.execute("""
                    INSERT INTO page_settings (page_name, settings, updated_at)
                    VALUES (?, ?, ?)
                    ON CONFLICT(page_name) DO UPDATE SET
                        settings = ?,
                        updated_at = ?
                """, (
                    page_name,
                    json.dumps(settings),
                    datetime.utcnow().isoformat(),
                    json.dumps(settings),
                    datetime.utcnow().isoformat()
                ))
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error updating page settings: {str(e)}")
            return False

    def get_log_trend(self, days: int = 7) -> float:
        """Calculate the log trend over the specified number of days."""
        try:
            # Get current period count
            current_count = self.get_log_count(days=days)
            # Get previous period count
            previous_count = self.get_log_count(days=days*2) - current_count
            
            if previous_count == 0:
                return 0.0
                
            return ((current_count - previous_count) / previous_count) * 100
        except Exception as e:
            logger.error(f"Error calculating log trend: {str(e)}")
            return 0.0

    def update_network_metrics(self, metrics_data):
        """Update network metrics with new data."""
        with self.get_db() as db:
            cursor = db.cursor()
            metrics_id = str(uuid.uuid4())
            
            cursor.execute("""
                INSERT INTO network_metrics (
                    id, timestamp, load, active_connections,
                    devices_discovered, metadata, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                metrics_id,
                metrics_data['timestamp'],
                metrics_data.get('load', 0),
                metrics_data.get('active_connections', 0),
                metrics_data.get('devices_discovered', 0),
                json.dumps(metrics_data.get('metadata', {})),
                datetime.utcnow().isoformat()
            ))
            
            db.commit()
            return metrics_id

    def update_network_device(self, device_data):
        """Update or create a network device."""
        with self.get_db() as db:
            cursor = db.cursor()
            now = datetime.utcnow().isoformat()
            
            # Check if device exists
            cursor.execute("""
                SELECT id FROM network_devices
                WHERE ip_address = ?
            """, (device_data['ip'],))
            result = cursor.fetchone()
            
            if result:
                # Update existing device
                device_id = result[0]
                cursor.execute("""
                    UPDATE network_devices
                    SET status = 'active',
                        last_seen = ?,
                        metadata = ?,
                        updated_at = ?
                    WHERE id = ?
                """, (
                    now,
                    json.dumps(device_data.get('metadata', {})),
                    now,
                    device_id
                ))
            else:
                # Create new device
                device_id = str(uuid.uuid4())
                cursor.execute("""
                    INSERT INTO network_devices (
                        id, ip_address, type, status,
                        metadata, created_at, updated_at, last_seen, first_seen
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    device_id,
                    device_data['ip'],
                    device_data.get('type', 'unknown'),
                    'active',
                    json.dumps(device_data.get('metadata', {})),
                    now,
                    now,
                    now,
                    now  # first_seen
                ))
            
            db.commit()
            return device_id

    def migrate_first_seen(self):
        """Set first_seen for devices where it is NULL."""
        with self.get_db() as db:
            cursor = db.cursor()
            now = datetime.utcnow().isoformat()
            cursor.execute("""
                UPDATE network_devices
                SET first_seen = COALESCE(last_seen, ?)
                WHERE first_seen IS NULL OR first_seen = ''
            """, (now,))
            db.commit()

    def get_log_count(self, days: int = 1) -> int:
        """Get the count of logs within the specified number of days."""
        try:
            with self.get_db() as db:
                cursor = db.cursor()
                cursor.execute("""
                    SELECT COUNT(*) FROM logs 
                    WHERE timestamp >= datetime('now', ?)
                """, (f'-{days} days',))
                return cursor.fetchone()[0] or 0
        except Exception as e:
            logger.error(f"Error getting log count: {str(e)}")
            return 0

    def get_active_threats(self) -> dict:
        """Get count of active threats by severity level."""
        try:
            with self.get_db() as db:
                cursor = db.cursor()
                cursor.execute("""
                    SELECT severity, COUNT(*) as count
                    FROM scan_findings 
                    WHERE status = 'open'
                    GROUP BY severity
                """)
                threats = {row[0]: row[1] for row in cursor.fetchall()}
                return {
                    'critical': threats.get('critical', 0),
                    'high': threats.get('high', 0),
                    'medium': threats.get('medium', 0),
                    'low': threats.get('low', 0),
                    'total': sum(threats.values())
                }
        except Exception as e:
            logger.error(f"Error getting active threats: {str(e)}")
            return {
                'critical': 0,
                'high': 0,
                'medium': 0,
                'low': 0,
                'total': 0
            }

    async def get_settings_async(self) -> dict:
        """Get application settings asynchronously."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS settings (
                        key TEXT PRIMARY KEY,
                        value TEXT NOT NULL,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                cursor = await conn.execute("SELECT key, value FROM settings")
                rows = await cursor.fetchall()
                await cursor.close()
                settings = {}
                for row in rows:
                    key, value = row
                    if not value:
                        continue
                    try:
                        settings[key] = json.loads(value)
                    except json.JSONDecodeError:
                        settings[key] = value
                # ... (rest of logic unchanged)
                return settings
        except Exception as e:
            logger.error(f"Error getting settings: {str(e)}")
            api_key = os.getenv('API_KEY', secrets.token_urlsafe(32))
            if not os.getenv('API_KEY'):
                os.environ['API_KEY'] = api_key
            return {
                'api_key': api_key,
                'network_monitoring_enabled': True,
                'log_retention_days': 30,
                'alert_threshold': 0.8
            }

    async def update_settings_async(self, settings: dict) -> bool:
        """Update application settings asynchronously."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                for key, value in settings.items():
                    await conn.execute(
                        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
                        (key, json.dumps(value))
                    )
                await conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error updating settings: {str(e)}")
            return False

    async def get_network_metrics(self) -> dict:
        """Get current network metrics."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.execute("""
                    SELECT 
                        COUNT(*) as active_connections,
                        SUM(data_transferred) as total_traffic,
                        (SELECT MAX(last_seen) FROM network_devices) as last_update
                    FROM network_connections 
                    WHERE status = 'active'
                """)
                row = await cursor.fetchone()
                await cursor.close()
                
                if row:
                    return {
                        'active_connections': row[0] or 0,
                        'total_traffic': row[1] or 0,
                        'last_update': row[2] or datetime.utcnow().isoformat()
                    }
                return {
                    'active_connections': 0,
                    'total_traffic': 0,
                    'last_update': datetime.utcnow().isoformat()
                }
        except Exception as e:
            logger.error(f"Error getting network metrics: {str(e)}")
            return {
                'active_connections': 0,
                'total_traffic': 0,
                'last_update': datetime.utcnow().isoformat()
            }

    def get_threats_trend(self, days: int = 7) -> float:
        """Calculate the trend in threats over the specified number of days."""
        try:
            with self.get_db() as db:
                cursor = db.cursor()
                
                # Get current period count
                cursor.execute("""
                    SELECT COUNT(*) FROM scan_findings
                    WHERE timestamp >= datetime('now', ?)
                    AND severity IN ('critical', 'high')
                """, (f'-{days} days',))
                current_count = cursor.fetchone()[0] or 0
                
                # Get previous period count
                cursor.execute("""
                    SELECT COUNT(*) FROM scan_findings
                    WHERE timestamp >= datetime('now', ?)
                    AND timestamp < datetime('now', ?)
                    AND severity IN ('critical', 'high')
                """, (f'-{days*2} days', f'-{days} days'))
                previous_count = cursor.fetchone()[0] or 0
                
                if previous_count == 0:
                    return 0.0
                
                return ((current_count - previous_count) / previous_count) * 100
        except Exception as e:
            logger.error(f"Error calculating threats trend: {str(e)}")
            return 0.0

    async def get_threats_trend_async(self, days: int = 7) -> float:
        """Asynchronous version of get_threats_trend."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.execute("""
                    SELECT COUNT(*) FROM scan_findings
                    WHERE timestamp >= datetime('now', ?)
                    AND severity IN ('critical', 'high')
                """, (f'-{days} days',))
                current_count = (await cursor.fetchone())[0] or 0
                await cursor.close()
                
                cursor = await conn.execute("""
                    SELECT COUNT(*) FROM scan_findings
                    WHERE timestamp >= datetime('now', ?)
                    AND timestamp < datetime('now', ?)
                    AND severity IN ('critical', 'high')
                """, (f'-{days*2} days', f'-{days} days'))
                previous_count = (await cursor.fetchone())[0] or 0
                await cursor.close()
                
                if previous_count == 0:
                    return 0.0
                
                return ((current_count - previous_count) / previous_count) * 100
        except Exception as e:
            logger.error(f"Error calculating threats trend: {str(e)}")
            return 0.0

    def validate_api_key(self, api_key: str) -> bool:
        """Validate the provided API key against stored key."""
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT value FROM settings WHERE key = 'api_key'")
                result = cursor.fetchone()
                if not result:
                    return False
                stored_key = result[0]
                return api_key == stored_key
        except Exception as e:
            logger.error(f"Error validating API key: {str(e)}")
            return False

    def get_network_health(self) -> dict:
        """Get current network health metrics."""
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                
                # Get active devices count
                cursor.execute("""
                    SELECT COUNT(*) FROM network_devices 
                    WHERE status = 'active' 
                    AND last_seen >= datetime('now', '-5 minutes')
                """)
                active_devices = cursor.fetchone()[0] or 0
                
                # Get total devices count
                cursor.execute("SELECT COUNT(*) FROM network_devices")
                total_devices = cursor.fetchone()[0] or 0
                
                # Get active connections
                cursor.execute("""
                    SELECT COUNT(*) FROM network_connections 
                    WHERE status = 'active'
                """)
                active_connections = cursor.fetchone()[0] or 0
                
                # Get blocked connections in last hour
                cursor.execute("""
                    SELECT COUNT(*) FROM network_connections 
                    WHERE status = 'blocked' 
                    AND end_time >= datetime('now', '-1 hour')
                """)
                blocked_connections = cursor.fetchone()[0] or 0
                
                # Calculate health score (0-100)
                if total_devices == 0:
                    health_score = 100  # No devices means perfect health
                else:
                    device_health = (active_devices / total_devices) * 100
                    connection_health = 100 - (blocked_connections / max(active_connections, 1)) * 100
                    health_score = (device_health + connection_health) / 2
                
                return {
                    'score': round(health_score, 1),
                    'active_devices': active_devices,
                    'total_devices': total_devices,
                    'active_connections': active_connections,
                    'blocked_connections': blocked_connections,
                    'status': 'healthy' if health_score >= 80 else 'warning' if health_score >= 50 else 'critical'
                }
        except Exception as e:
            logger.error(f"Error getting network health: {str(e)}")
            return {
                'score': 0,
                'active_devices': 0,
                'total_devices': 0,
                'active_connections': 0,
                'blocked_connections': 0,
                'status': 'unknown'
            }

    def update_scan(self, scan_id: str, scan_data: dict):
        """Update scan details in the database."""
        try:
            with self.get_db() as db:
                cursor = db.cursor()
                cursor.execute("""
                    UPDATE scans
                    SET type = ?, target = ?, status = ?, started_at = ?, config = ?
                    WHERE id = ?
                """, (
                    scan_data["type"],
                    scan_data["target"],
                    scan_data["status"],
                    scan_data["started_at"],
                    json.dumps(scan_data["config"]),
                    scan_id
                ))
                db.commit()
                return True
        except Exception as e:
            logger.error(f"Error updating scan: {str(e)}")
            return False

    def get_report(self, report_id: str) -> Optional[dict]:
        """Get report details from the database."""
        try:
            with self.get_db() as db:
                cursor = db.cursor()
                cursor.execute("""
                    SELECT id, type, format, time_range, status, created_at, url
                    FROM reports
                    WHERE id = ?
                """, (report_id,))
                row = cursor.fetchone()
                if row:
                    return {
                        "id": row[0],
                        "type": row[1],
                        "format": row[2],
                        "time_range": row[3],
                        "status": row[4],
                        "created_at": row[5],
                        "url": row[6]
                    }
                return None
        except Exception as e:
            logger.error(f"Error getting report: {str(e)}")
            return None

    def get_maintenance_schedules(self) -> List[dict]:
        """Get all scheduled maintenance windows."""
        try:
            with self.get_db() as db:
                cursor = db.cursor()
                cursor.execute("""
                    SELECT id, start_time, end_time, type, description, status
                    FROM maintenance
                    WHERE status = 'scheduled'
                    ORDER BY start_time ASC
                """)
                rows = cursor.fetchall()
                return [{
                    "id": row[0],
                    "start_time": row[1],
                    "end_time": row[2],
                    "type": row[3],
                    "description": row[4],
                    "status": row[5]
                } for row in rows]
        except Exception as e:
            logger.error(f"Error getting maintenance schedules: {str(e)}")
            return []

    def cancel_maintenance(self, maintenance_id: str) -> bool:
        """Cancel a scheduled maintenance window."""
        try:
            with self.get_db() as db:
                cursor = db.cursor()
                cursor.execute("""
                    UPDATE maintenance
                    SET status = 'cancelled'
                    WHERE id = ? AND status = 'scheduled'
                """, (maintenance_id,))
                db.commit()
                return cursor.rowcount > 0
        except Exception as e:
            logger.error(f"Error cancelling maintenance: {str(e)}")
            return False

    def create_tables(self):
        """Create necessary database tables if they don't exist."""
        try:
            with self.get_db() as db:
                cursor = db.cursor()
                
                # Create reports table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS reports (
                        id TEXT PRIMARY KEY,
                        type TEXT NOT NULL,
                        format TEXT NOT NULL,
                        time_range TEXT NOT NULL,
                        status TEXT NOT NULL,
                        created_at TEXT NOT NULL,
                        url TEXT,
                        data TEXT
                    )
                """)
                
                # Create maintenance table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS maintenance (
                        id TEXT PRIMARY KEY,
                        start_time TEXT NOT NULL,
                        end_time TEXT NOT NULL,
                        type TEXT NOT NULL,
                        description TEXT,
                        status TEXT NOT NULL,
                        created_at TEXT NOT NULL,
                        updated_at TEXT
                    )
                """)
                
                # Create scans table if it doesn't exist
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS scans (
                        id TEXT PRIMARY KEY,
                        type TEXT NOT NULL,
                        target TEXT NOT NULL,
                        status TEXT NOT NULL,
                        started_at TEXT NOT NULL,
                        completed_at TEXT,
                        config TEXT,
                        results TEXT
                    )
                """)
                
                db.commit()
                return True
        except Exception as e:
            logger.error(f"Error creating database tables: {str(e)}")
            return False

    async def get_health_trend(self, metric_name: str, hours: int = 24) -> List[Dict]:
        """Get health trend data for a specific metric"""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                # Create health_trends table if it doesn't exist
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS health_trends (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        metric_name TEXT NOT NULL,
                        value REAL NOT NULL,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Get trend data
                cursor = await conn.execute("""
                    SELECT value, timestamp 
                    FROM health_trends 
                    WHERE metric_name = ? 
                    AND timestamp >= datetime('now', ? || ' hours')
                    ORDER BY timestamp ASC
                """, (metric_name, -hours))
                
                rows = await cursor.fetchall()
                await cursor.close()
                
                # Convert rows to list of dicts
                return [{
                    'value': row[0],
                    'timestamp': row[1]
                } for row in rows]
        except Exception as e:
            logger.error(f"Error getting health trend: {str(e)}")
            return []

    async def get_security_metrics(self) -> Dict:
        """Get security metrics including asset status"""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                # Get asset counts by status
                asset_query = '''
                    SELECT status, COUNT(*) as count
                    FROM assets
                    GROUP BY status
                '''
                asset_rows = await conn.execute(asset_query)
                asset_counts = {row['status']: row['count'] for row in asset_rows}
                
                # Get active alerts
                alert_query = '''
                    SELECT severity, COUNT(*) as count
                    FROM alerts
                    WHERE status = 'active'
                    GROUP BY severity
                '''
                alert_rows = await conn.execute(alert_query)
                alert_counts = {row['severity']: row['count'] for row in alert_rows}
                
                return {
                    'total_assets': sum(asset_counts.values()),
                    'asset_status': asset_counts,
                    'active_alerts': alert_counts,
                    'security_score': self._calculate_security_score(asset_counts, alert_counts)
                }
        except Exception as e:
            logger.error(f"Error getting security metrics: {str(e)}")
            return {
                'total_assets': 0,
                'asset_status': {},
                'active_alerts': {},
                'security_score': 0
            }

    async def get_recent_alerts(self, limit: int = 50) -> List[Dict]:
        """Get recent alerts"""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                query = '''
                    SELECT id, type, severity, message, source, status, created_at, resolved_at
                    FROM alerts
                    ORDER BY created_at DESC
                    LIMIT $1
                '''
                rows = await conn.execute(query, limit)
                await conn.commit()
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting recent alerts: {str(e)}")
            return []

    def _calculate_security_score(self, asset_counts: Dict, alert_counts: Dict) -> int:
        """Calculate overall security score based on assets and alerts"""
        # Base score starts at 100
        score = 100
        
        # Deduct points for inactive assets
        inactive_assets = asset_counts.get('inactive', 0)
        score -= inactive_assets * 5
        
        # Deduct points for alerts based on severity
        severity_weights = {
            'critical': 10,
            'high': 5,
            'medium': 3,
            'low': 1
        }
        
        for severity, count in alert_counts.items():
            score -= count * severity_weights.get(severity, 0)
        
        # Ensure score stays within 0-100 range
        return max(0, min(100, score)) 

    def get_protected_assets(self) -> dict:
        """Get count of protected network devices."""
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                
                # Get total devices
                cursor.execute("SELECT COUNT(*) FROM network_devices")
                total_devices = cursor.fetchone()[0] or 0
                
                # Get protected devices (those with active security measures)
                cursor.execute("""
                    SELECT COUNT(*) FROM network_devices 
                    WHERE status = 'active' 
                    AND last_seen >= datetime('now', '-5 minutes')
                """)
                protected_devices = cursor.fetchone()[0] or 0
                
                return {
                    'total': total_devices,
                    'protected': protected_devices,
                    'unprotected': total_devices - protected_devices
                }
        except Exception as e:
            logger.error(f"Error getting protected assets: {str(e)}")
            return {
                'total': 0,
                'protected': 0,
                'unprotected': 0
            }

    def get_assets_status(self) -> dict:
        """Get status distribution of network assets."""
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT status, COUNT(*) as count
                    FROM network_devices
                    GROUP BY status
                """)
                status_counts = {row[0]: row[1] for row in cursor.fetchall()}
                
                return {
                    'active': status_counts.get('active', 0),
                    'inactive': status_counts.get('inactive', 0),
                    'maintenance': status_counts.get('maintenance', 0),
                    'blocked': status_counts.get('blocked', 0)
                }
        except Exception as e:
            logger.error(f"Error getting assets status: {str(e)}")
            return {
                'active': 0,
                'inactive': 0,
                'maintenance': 0,
                'blocked': 0
            }

    async def get_active_scans_async(self) -> List[Dict]:
        """Get all active security scans asynchronously."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.execute("""
                    SELECT id, type, target, status, progress, findings_count,
                           start_time, metadata
                    FROM scans
                    WHERE status = 'running'
                    ORDER BY start_time DESC
                """)
                rows = await cursor.fetchall()
                await cursor.close()
                
                scans = []
                for row in rows:
                    scan = {
                        'id': row[0],
                        'type': row[1],
                        'target': row[2],
                        'status': row[3],
                        'progress': row[4],
                        'findings_count': row[5],
                        'start_time': row[6],
                        'metadata': json.loads(row[7]) if row[7] else {}
                    }
                    scans.append(scan)
                return scans
        except Exception as e:
            logger.error(f"Error getting active scans: {str(e)}")
            return []

    async def get_recent_findings_async(self, limit: int = 50) -> List[Dict]:
        """Get recent security findings asynchronously."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.execute("""
                    SELECT f.id, f.scan_id, f.timestamp, f.type, f.severity,
                           f.description, f.location, f.evidence, f.status,
                           f.resolution, f.resolved_at, f.metadata,
                           s.type as scan_type, s.target as scan_target
                    FROM scan_findings f
                    JOIN scans s ON f.scan_id = s.id
                    ORDER BY f.timestamp DESC
                    LIMIT ?
                """, (limit,))
                rows = await cursor.fetchall()
                await cursor.close()
                
                findings = []
                for row in rows:
                    finding = {
                        'id': row[0],
                        'scan_id': row[1],
                        'timestamp': row[2],
                        'type': row[3],
                        'severity': row[4],
                        'description': row[5],
                        'location': row[6],
                        'evidence': row[7],
                        'status': row[8],
                        'resolution': row[9],
                        'resolved_at': row[10],
                        'metadata': json.loads(row[11]) if row[11] else {},
                        'scan_type': row[12],
                        'scan_target': row[13]
                    }
                    findings.append(finding)
                return findings
        except Exception as e:
            logger.error(f"Error getting recent findings: {str(e)}")
            return []

    async def get_scan_statistics_async(self) -> Dict:
        """Get scan statistics asynchronously."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                # Get total scans
                cursor = await conn.execute("SELECT COUNT(*) FROM scans")
                total_scans = (await cursor.fetchone())[0] or 0
                await cursor.close()
                
                # Get scans by status
                cursor = await conn.execute("""
                    SELECT status, COUNT(*) as count
                    FROM scans
                    GROUP BY status
                """)
                status_counts = {row[0]: row[1] for row in await cursor.fetchall()}
                await cursor.close()
                
                # Get scans by type
                cursor = await conn.execute("""
                    SELECT type, COUNT(*) as count
                    FROM scans
                    GROUP BY type
                """)
                type_counts = {row[0]: row[1] for row in await cursor.fetchall()}
                await cursor.close()
                
                # Get findings by severity
                cursor = await conn.execute("""
                    SELECT severity, COUNT(*) as count
                    FROM scan_findings
                    GROUP BY severity
                """)
                severity_counts = {row[0]: row[1] for row in await cursor.fetchall()}
                await cursor.close()
                
                return {
                    'total_scans': total_scans,
                    'status_distribution': status_counts,
                    'type_distribution': type_counts,
                    'severity_distribution': severity_counts
                }
        except Exception as e:
            logger.error(f"Error getting scan statistics: {str(e)}")
            return {
                'total_scans': 0,
                'status_distribution': {},
                'type_distribution': {},
                'severity_distribution': {}
            }

    def initialize_db(self):
        """Initialize the database schema."""
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                
                # Create users table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        email TEXT UNIQUE,
                        role TEXT NOT NULL DEFAULT 'user',
                        api_key TEXT UNIQUE,
                        last_login TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Create scans table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS scans (
                        id TEXT PRIMARY KEY,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        type TEXT NOT NULL,
                        status TEXT NOT NULL,
                        target TEXT NOT NULL,
                        progress INTEGER DEFAULT 0,
                        findings_count INTEGER DEFAULT 0,
                        start_time TIMESTAMP,
                        end_time TIMESTAMP,
                        metadata TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Create scan findings table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS scan_findings (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        scan_id TEXT NOT NULL,
                        severity TEXT NOT NULL,
                        category TEXT NOT NULL,
                        description TEXT NOT NULL,
                        location TEXT,
                        remediation TEXT,
                        status TEXT DEFAULT 'new',
                        resolved_at TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (scan_id) REFERENCES scans(id)
                    )
                """)
                
                # Create network devices table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS network_devices (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        ip_address TEXT NOT NULL,
                        mac_address TEXT,
                        type TEXT NOT NULL,
                        status TEXT DEFAULT 'active',
                        last_seen TIMESTAMP,
                        security_status TEXT DEFAULT 'unknown',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Create maintenance windows table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS maintenance_windows (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        start_time TIMESTAMP NOT NULL,
                        end_time TIMESTAMP NOT NULL,
                        type TEXT NOT NULL,
                        description TEXT,
                        status TEXT DEFAULT 'scheduled',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Create security metrics table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS security_metrics (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        total_devices INTEGER DEFAULT 0,
                        protected_devices INTEGER DEFAULT 0,
                        active_scans INTEGER DEFAULT 0,
                        critical_findings INTEGER DEFAULT 0,
                        high_findings INTEGER DEFAULT 0,
                        medium_findings INTEGER DEFAULT 0,
                        low_findings INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Create network connections table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS network_connections (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        source_ip TEXT NOT NULL,
                        destination_ip TEXT NOT NULL,
                        protocol TEXT NOT NULL,
                        port INTEGER,
                        status TEXT DEFAULT 'active',
                        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        end_time TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Initialize network monitoring tables
                self.initialize_network_monitoring()
                
                # Create default admin user if not exists
                cursor.execute("SELECT id FROM users WHERE username = 'admin'")
                if not cursor.fetchone():
                    default_password = "admin123"  # Change this in production
                    password_hash = self.hash_password(default_password)
                    api_key = self.generate_api_key()
                    cursor.execute("""
                        INSERT INTO users (username, password_hash, role, api_key)
                        VALUES (?, ?, ?, ?)
                    """, ('admin', password_hash, 'admin', api_key))
                
                conn.commit()
                logger.info("Database schema initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing database schema: {str(e)}")
            raise