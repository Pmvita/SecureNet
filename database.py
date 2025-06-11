import json
import uuid
from datetime import datetime, timedelta
import secrets
import sqlite3
import os
import logging
from typing import Optional, List, Dict
import asyncio
import random

import aiosqlite
from src.security import get_password_hash

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
        """Internal method to initialize database."""
        try:
            self._ensure_db_directory()
            self.initialize_db()  # This will call create_tables
            self._initialized[os.getpid()] = True
            logger.info("Database initialized successfully")
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

    async def get_log_stats(self, start_time: Optional[str] = None, end_time: Optional[str] = None) -> Dict:
        """Get log statistics."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.cursor()

                # Build query conditions
                conditions = []
                params = []
                if start_time:
                    conditions.append("timestamp >= ?")
                    params.append(start_time)
                if end_time:
                    conditions.append("timestamp <= ?")
                    params.append(end_time)

                where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

                # Get total logs
                await cursor.execute(f"SELECT COUNT(*) FROM logs {where_clause}", params)
                total_logs = (await cursor.fetchone())[0] or 0

                # Get logs by level
                await cursor.execute(f"""
                    SELECT level, COUNT(*) as count 
                    FROM logs {where_clause}
                    GROUP BY level
                """, params)
                logs_by_level = {
                    'debug': 0,
                    'info': 0,
                    'warning': 0,
                    'error': 0,
                    'critical': 0
                }
                for row in await cursor.fetchall():
                    level, count = row
                    logs_by_level[level] = count

                # Get logs by category
                await cursor.execute(f"""
                    SELECT category, COUNT(*) as count 
                    FROM logs {where_clause}
                    GROUP BY category
            """, params)
                logs_by_category = {
                    'security': 0,
                    'network': 0,
                    'system': 0,
                    'application': 0
                }
                for row in await cursor.fetchall():
                    category, count = row
                    logs_by_category[category] = count

                # Get logs by source
                await cursor.execute(f"""
                    SELECT source_id, COUNT(*) as count 
                    FROM logs {where_clause}
                    GROUP BY source_id
            """, params)
                logs_by_source = {}
                for row in await cursor.fetchall():
                    source_id, count = row
                    logs_by_source[source_id] = count

                await cursor.close()
                
                return {
                    'total_logs': total_logs,
                    'logs_by_level': logs_by_level,
                    'logs_by_category': logs_by_category,
                    'logs_by_source': logs_by_source
                }
        except Exception as e:
            logger.error(f"Error getting log stats: {str(e)}")
            return {
                'total_logs': 0,
                'logs_by_level': {
                    'debug': 0,
                    'info': 0,
                    'warning': 0,
                    'error': 0,
                    'critical': 0
                },
                'logs_by_category': {
                    'security': 0,
                    'network': 0,
                    'system': 0,
                    'application': 0
                },
                'logs_by_source': {}
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

    def get_network_devices(self) -> dict:
        """Get all network devices and their connections."""
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                
                # Get all devices (order matches table definition)
                cursor.execute("""
                    SELECT id, name, type, ip_address, mac_address, status, last_seen, metadata, created_at, updated_at
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
                        'mac_address': row[4],
                        'status': row[5],
                        'last_seen': row[6],
                        'metadata': json.loads(row[7]) if row[7] else {},
                        'created_at': row[8],
                        'updated_at': row[9]
                    }
                    devices.append(device)

                # Get all connections
                cursor.execute("""
                    SELECT 
                        nc.id,
                        nc.source_device_id,
                        sd.name as source_device,
                        nc.target_device_id,
                        td.name as target_device,
                        nc.protocol,
                        nc.port,
                        nc.status,
                        nc.last_seen,
                        nc.metadata
                    FROM network_connections nc
                    JOIN network_devices sd ON nc.source_device_id = sd.id
                    JOIN network_devices td ON nc.target_device_id = td.id
                    ORDER BY nc.last_seen DESC
                """)
                connections = []
                for row in cursor.fetchall():
                    connection = {
                        'id': row[0],
                        'source_device_id': row[1],
                        'source_device': row[2],
                        'target_device_id': row[3],
                        'target_device': row[4],
                        'protocol': row[5],
                        'port': row[6],
                        'status': row[7],
                        'last_seen': row[8],
                        'metadata': json.loads(row[9]) if row[9] else {}
                    }
                    connections.append(connection)

                # Get traffic data for the last hour
                cursor.execute("""
                    SELECT 
                        timestamp,
                        SUM(bytes_sent) as bytes_out,
                        SUM(bytes_received) as bytes_in,
                        COUNT(*) as packet_count
                    FROM network_traffic
                    WHERE timestamp >= datetime('now', '-1 hour')
                    GROUP BY strftime('%Y-%m-%d %H:%M', timestamp)
                    ORDER BY timestamp DESC
                    LIMIT 60
                """)
                traffic = []
                for row in cursor.fetchall():
                    traffic.append({
                        'timestamp': row[0],
                        'bytes_out': row[1] or 0,
                        'bytes_in': row[2] or 0,
                        'packet_count': row[3] or 0
                    })

                # Get protocol distribution
                cursor.execute("""
                    SELECT protocol, COUNT(*) as count
                    FROM network_connections
                    WHERE status = 'active'
                    GROUP BY protocol
                """)
                protocols = []
                for row in cursor.fetchall():
                    protocols.append({
                        'name': row[0],
                        'count': row[1]
                    })

                # Calculate stats
                stats = {
                    'total_devices': len(devices),
                    'active_devices': sum(1 for d in devices if d['status'] == 'active'),
                    'average_latency': 0,  # This would need to be calculated from metrics
                    'total_traffic': sum(t['bytes_out'] + t['bytes_in'] for t in traffic)
                }

                return {
                    'devices': devices,
                    'connections': connections,
                    'traffic': traffic,
                    'protocols': protocols,
                    'stats': stats
                }
        except Exception as e:
            logger.error(f"Error getting network data: {str(e)}")
            return {
                'devices': [],
                'connections': [],
                'traffic': [],
                'protocols': [],
                'stats': {
                    'total_devices': 0,
                    'active_devices': 0,
                    'average_latency': 0,
                    'total_traffic': 0
                }
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
        """Create all necessary database tables."""
        try:
            with self.get_db() as db:
                cursor = db.cursor()

                # Create log_sources table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS log_sources (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL,
                        status TEXT NOT NULL,
                        config TEXT,
                        last_seen TEXT,
                        logs_count INTEGER DEFAULT 0,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                """)

                # Create logs table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS logs (
                        id TEXT PRIMARY KEY,
                        source_id TEXT NOT NULL,
                        level TEXT NOT NULL,
                        message TEXT NOT NULL,
                        timestamp TEXT NOT NULL,
                        category TEXT DEFAULT 'system',
                        metadata TEXT,
                        FOREIGN KEY (source_id) REFERENCES log_sources(id)
                    )
                """)

                # Create network_devices table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS network_devices (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL,
                        ip_address TEXT NOT NULL,
                        mac_address TEXT,
                        status TEXT NOT NULL,
                        last_seen TEXT,
                        metadata TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                """)

                # Create network_connections table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS network_connections (
                        id TEXT PRIMARY KEY,
                        source_device_id TEXT NOT NULL,
                        target_device_id TEXT NOT NULL,
                        status TEXT NOT NULL,
                        protocol TEXT,
                        port INTEGER,
                        last_seen TEXT,
                        metadata TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        FOREIGN KEY (source_device_id) REFERENCES network_devices(id),
                        FOREIGN KEY (target_device_id) REFERENCES network_devices(id)
                    )
                """)

                # Create network_traffic table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS network_traffic (
                        id TEXT PRIMARY KEY,
                        source_device_id TEXT NOT NULL,
                        target_device_id TEXT NOT NULL,
                        protocol TEXT NOT NULL,
                        bytes_sent INTEGER DEFAULT 0,
                        bytes_received INTEGER DEFAULT 0,
                        timestamp TEXT NOT NULL,
                        metadata TEXT,
                        FOREIGN KEY (source_device_id) REFERENCES network_devices(id),
                        FOREIGN KEY (target_device_id) REFERENCES network_devices(id)
                    )
                """)

                # Create anomalies table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS anomalies (
                        id TEXT PRIMARY KEY,
                        timestamp TEXT NOT NULL,
                        type TEXT NOT NULL,
                        severity TEXT NOT NULL,
                        status TEXT NOT NULL,
                        source TEXT NOT NULL,
                        description TEXT NOT NULL,
                        evidence TEXT,
                        resolution TEXT,
                        metadata TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                """)

                # Create indexes
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_source_id ON logs(source_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_network_devices_status ON network_devices(status)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_network_devices_last_seen ON network_devices(last_seen)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_network_connections_status ON network_connections(status)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_network_traffic_timestamp ON network_traffic(timestamp)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_anomalies_timestamp ON anomalies(timestamp)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON anomalies(severity)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_anomalies_status ON anomalies(status)")

                # Create network_metrics table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS network_metrics (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        source_device_id TEXT NOT NULL,
                        target_device_id TEXT NOT NULL,
                        metric_type TEXT NOT NULL,
                        value REAL NOT NULL,
                        timestamp TEXT NOT NULL,
                        metadata TEXT,
                        created_at TEXT NOT NULL,
                        FOREIGN KEY (source_device_id) REFERENCES network_devices(id),
                        FOREIGN KEY (target_device_id) REFERENCES network_devices(id)
                    )
                """)

                # Create security_scans table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS security_scans (
                        id TEXT PRIMARY KEY,
                        timestamp TEXT NOT NULL,
                        type TEXT NOT NULL,
                        status TEXT NOT NULL,
                        target TEXT NOT NULL,
                        progress REAL DEFAULT 0,
                        findings_count INTEGER DEFAULT 0,
                        start_time TEXT NOT NULL,
                        end_time TEXT,
                        metadata TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                """)

                # Create security_findings table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS security_findings (
                        id TEXT PRIMARY KEY,
                        scan_id TEXT NOT NULL,
                        type TEXT NOT NULL,
                        severity TEXT NOT NULL,
                        description TEXT NOT NULL,
                        details TEXT,
                        timestamp TEXT NOT NULL,
                        status TEXT NOT NULL,
                        remediation TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        FOREIGN KEY (scan_id) REFERENCES security_scans(id)
                    )
                """)

                # Create indexes for new tables
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_network_metrics_source_device ON network_metrics(source_device_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_network_metrics_target_device ON network_metrics(target_device_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_network_metrics_type ON network_metrics(metric_type)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_network_metrics_timestamp ON network_metrics(timestamp)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_security_scans_status ON security_scans(status)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_security_scans_timestamp ON security_scans(timestamp)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_security_findings_scan_id ON security_findings(scan_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_security_findings_severity ON security_findings(severity)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_security_findings_status ON security_findings(status)")

            db.commit()
            logger.info("Database schema initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing database schema: {str(e)}")
            raise

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
                conn.row_factory = aiosqlite.Row  # Enable dictionary-style access
                
                # Get active scans
                cursor = await conn.execute("""
                    SELECT COUNT(*) as count
                    FROM security_scans
                    WHERE status = 'running'
                """)
                active_scans = (await cursor.fetchone())['count'] or 0
                await cursor.close()
                
                # Get total findings
                cursor = await conn.execute("SELECT COUNT(*) as count FROM security_findings")
                total_findings = (await cursor.fetchone())['count'] or 0
                await cursor.close()
                
                # Get critical findings
                cursor = await conn.execute("""
                    SELECT COUNT(*) as count
                    FROM security_findings
                    WHERE severity = 'critical'
                """)
                critical_findings = (await cursor.fetchone())['count'] or 0
                await cursor.close()
                
                # Calculate security score
                cursor = await conn.execute("""
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
                    FROM security_findings
                    WHERE status = 'active'
                """)
                security_score = (await cursor.fetchone())['score'] or 100
                await cursor.close()
                
                # Get last scan info
                cursor = await conn.execute("""
                    SELECT id, status, start_time
                    FROM security_scans
                    ORDER BY start_time DESC
                    LIMIT 1
                """)
                last_scan_row = await cursor.fetchone()
                last_scan = None
                scan_status = 'idle'
                if last_scan_row:
                    last_scan = {
                        'id': last_scan_row['id'],
                        'status': last_scan_row['status'],
                        'start_time': last_scan_row['start_time']
                    }
                    scan_status = last_scan_row['status']
                await cursor.close()
                
                return {
                    'active_scans': active_scans,
                    'total_findings': total_findings,
                    'critical_findings': critical_findings,
                    'security_score': security_score,
                    'last_scan': last_scan,
                    'scan_status': scan_status
                }
        except Exception as e:
            logger.error(f"Error getting security metrics: {str(e)}")
            return {
                'active_scans': 0,
                'total_findings': 0,
                'critical_findings': 0,
                'security_score': 100,
                'last_scan': None,
                'scan_status': 'idle'
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
                conn.row_factory = aiosqlite.Row  # Enable dictionary-style access
                cursor = await conn.execute("""
                    SELECT f.id, f.scan_id, f.timestamp, f.type, f.severity,
                           f.description, f.details, f.status, f.remediation,
                           s.type as scan_type, s.target as scan_target
                    FROM security_findings f
                    JOIN security_scans s ON f.scan_id = s.id
                    ORDER BY f.timestamp DESC
                    LIMIT ?
                """, (limit,))
                rows = await cursor.fetchall()
                await cursor.close()
                
                findings = []
                for row in rows:
                    finding = {
                        'id': row['id'],
                        'scan_id': row['scan_id'],
                        'timestamp': row['timestamp'],
                        'type': row['type'],
                        'severity': row['severity'],
                        'description': row['description'],
                        'details': json.loads(row['details']) if row['details'] else {},
                        'status': row['status'],
                        'remediation': row['remediation'],
                        'scan_type': row['scan_type'],
                        'scan_target': row['scan_target']
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

    def _migrate_logs_table(self):
        """Migrate logs table to new schema if needed."""
        try:
            with self.get_db() as db:
                cursor = db.cursor()
                
                # Check if we need to migrate
                cursor.execute("PRAGMA table_info(logs)")
                columns = {row[1]: row for row in cursor.fetchall()}
                
                if 'source_id' not in columns or 'category' not in columns:
                    logger.info("Migrating logs table to new schema...")
                    
                    # Create temporary table with new schema
                    cursor.execute("""
                        CREATE TABLE logs_new (
                            id TEXT PRIMARY KEY,
                            source_id TEXT NOT NULL,
                            level TEXT NOT NULL,
                            message TEXT NOT NULL,
                            timestamp TEXT NOT NULL,
                            category TEXT DEFAULT 'system',
                            metadata TEXT,
                            FOREIGN KEY (source_id) REFERENCES log_sources(id)
                        )
                    """)
                    
                    # Create a default log source if none exists
                    cursor.execute("SELECT COUNT(*) FROM log_sources")
                    if cursor.fetchone()[0] == 0:
                        default_source_id = str(uuid.uuid4())
                        cursor.execute("""
                            INSERT INTO log_sources (
                                id, name, type, status, created_at
                            ) VALUES (?, ?, ?, ?, ?)
                        """, (
                            default_source_id,
                            'Legacy Logs',
                            'system',
                            'active',
                            datetime.utcnow().isoformat()
                        ))
                    else:
                        cursor.execute("SELECT id FROM log_sources LIMIT 1")
                        default_source_id = cursor.fetchone()[0]
                    
                    # Check if source column exists
                    has_source_column = 'source' in columns
                    
                    # Copy data to new table with conditional source handling
                    if has_source_column:
                        cursor.execute("""
                            INSERT INTO logs_new (
                                id, source_id, level, message, timestamp, category, metadata
                            )
                            SELECT 
                                COALESCE(id, hex(randomblob(16))),
                                ?,
                                level,
                                message,
                                COALESCE(timestamp, datetime('now')),
                                CASE 
                                    WHEN level IN ('error', 'critical') THEN 'security'
                                    WHEN source LIKE '%network%' THEN 'network'
                                    WHEN source LIKE '%app%' THEN 'application'
                                    ELSE 'system'
                                END,
                                json_object(
                                    'received_at', received_at,
                                    'acknowledged', acknowledged,
                                    'acknowledged_at', acknowledged_at,
                                    'processed_at', processed_at,
                                    'detection_run_at', detection_run_at,
                                    'alert_sent_at', alert_sent_at,
                                    'original_source', source
                                )
                            FROM logs
                        """, (default_source_id,))
                    else:
                        cursor.execute("""
                            INSERT INTO logs_new (
                                id, source_id, level, message, timestamp, category, metadata
                            )
                            SELECT 
                                COALESCE(id, hex(randomblob(16))),
                                ?,
                                level,
                                message,
                                COALESCE(timestamp, datetime('now')),
                                CASE 
                                    WHEN level IN ('error', 'critical') THEN 'security'
                                    ELSE 'system'
                                END,
                                json_object(
                                    'received_at', received_at,
                                    'acknowledged', acknowledged,
                                    'acknowledged_at', acknowledged_at,
                                    'processed_at', processed_at,
                                    'detection_run_at', detection_run_at,
                                    'alert_sent_at', alert_sent_at
                                )
                            FROM logs
                        """, (default_source_id,))
                    
                    # Drop old table and rename new one
                    cursor.execute("DROP TABLE logs")
                    cursor.execute("ALTER TABLE logs_new RENAME TO logs")
                    
                    # Create new indexes
                    cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)")
                    cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level)")
                    cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_source_id ON logs(source_id)")
                    cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_category ON logs(category)")
                    
                    db.commit()
                    logger.info("Logs table migration completed successfully")
                else:
                    logger.info("Logs table already has new schema")
        except Exception as e:
            logger.error(f"Error migrating logs table: {str(e)}")
            raise

    def create_default_admin(self):
        """Create default admin user if no users exist."""
        try:
            with self.get_db() as db:
                cursor = db.cursor()
                # Check if any users exist
                cursor.execute("SELECT COUNT(*) FROM users")
                if cursor.fetchone()[0] == 0:
                    # Create default admin user
                    cursor.execute("""
                        INSERT INTO users (
                            username, password_hash, email, role, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    """, (
                        'admin',
                        get_password_hash('admin123'),
                        'admin@securenet.local',
                        'admin',
                        datetime.utcnow().isoformat(),
                        datetime.utcnow().isoformat()
                    ))
                    db.commit()
                    logger.info("Default admin user created successfully")
        except Exception as e:
            logger.error(f"Error creating default admin user: {str(e)}")
            raise

    async def initialize_db(self):
        """Initialize the database and create default admin user if needed."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.cursor()
                # Ensure schema is up to date before any queries
                await self.update_db_schema()

                # Now safe to query users table
                await cursor.execute("SELECT id FROM users WHERE username = 'admin'")
                admin = await cursor.fetchone()
                if not admin:
                    password_hash = get_password_hash("admin123")
                    await cursor.execute(
                        """
                        INSERT INTO users (username, email, password_hash, role, is_active)
                        VALUES (?, ?, ?, ?, ?)
                        """,
                        ("admin", "admin@securenet.local", password_hash, "admin", 1)
                    )
                    await conn.commit()
                    logger.info("Default admin user created successfully")

                # Update schema (skip sample data for real network monitoring)
                await self.update_db_schema()
                # await self.insert_sample_data()  # Disabled for real network scanning
                logger.info("Database initialized successfully - ready for real network scanning")
        except Exception as e:
            logger.error(f"Error initializing database: {str(e)}")
            raise

    def get_user_by_username(self, username: str) -> Optional[dict]:
        """Get a user by username."""
        with self.get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                SELECT id, username, password_hash, email, role, api_key, last_login, created_at, updated_at
                FROM users
                WHERE username = ?
            """, (username,))
            row = cursor.fetchone()
            if not row:
                return None
            return {
                "id": row[0],
                "username": row[1],
                "password_hash": row[2],
                "email": row[3],
                "role": row[4],
                "api_key": row[5],
                "last_login": row[6],
                "created_at": row[7],
                "updated_at": row[8],
            }

    async def get_anomalies(self, page: int = 1, page_size: int = 20, filters: dict = None) -> List[Dict]:
        """Get anomalies with pagination and filtering."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                conn.row_factory = aiosqlite.Row
                cursor = await conn.cursor()

                # Build query conditions
                conditions = []
                params = []
                if filters:
                    if filters.get('status'):
                        conditions.append("status = ?")
                        params.append(filters['status'])
                    if filters.get('severity'):
                        conditions.append("severity = ?")
                        params.append(filters['severity'])
                    if filters.get('type'):
                        conditions.append("type = ?")
                        params.append(filters['type'])
                    if filters.get('start_date'):
                        conditions.append("timestamp >= ?")
                        params.append(filters['start_date'])
                    if filters.get('end_date'):
                        conditions.append("timestamp <= ?")
                        params.append(filters['end_date'])

                # Build the query
                query = ["SELECT * FROM anomalies"]
                if conditions:
                    query.append("WHERE " + " AND ".join(conditions))
                query.append("ORDER BY timestamp DESC")
                query.append("LIMIT ? OFFSET ?")
                params.extend([page_size, (page - 1) * page_size])

                # Execute query
                await cursor.execute(" ".join(query), params)
                rows = await cursor.fetchall()
                await cursor.close()

                # Convert rows to dictionaries
                anomalies = []
                for row in rows:
                    anomaly = dict(row)
                    if anomaly.get('metadata'):
                        anomaly['metadata'] = json.loads(anomaly['metadata'])
                    anomalies.append(anomaly)

                return anomalies
        except Exception as e:
            logger.error(f"Error getting anomalies: {str(e)}")
            return []

    async def get_anomalies_count(self, filters: dict = None) -> int:
        """Get total count of anomalies with optional filtering."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.cursor()

                # Build query conditions
                conditions = []
                params = []
                if filters:
                    if filters.get('status'):
                        conditions.append("status = ?")
                        params.append(filters['status'])
                    if filters.get('severity'):
                        conditions.append("severity = ?")
                        params.append(filters['severity'])
                    if filters.get('type'):
                        conditions.append("type = ?")
                        params.append(filters['type'])
                    if filters.get('start_date'):
                        conditions.append("timestamp >= ?")
                        params.append(filters['start_date'])
                    if filters.get('end_date'):
                        conditions.append("timestamp <= ?")
                        params.append(filters['end_date'])

                # Build the query
                query = ["SELECT COUNT(*) FROM anomalies"]
                if conditions:
                    query.append("WHERE " + " AND ".join(conditions))

                # Execute query
                await cursor.execute(" ".join(query), params)
                count = (await cursor.fetchone())[0]
                await cursor.close()

                return count or 0
        except Exception as e:
            logger.error(f"Error getting anomalies count: {str(e)}")
            return 0

    async def get_recent_scans(self, limit: int = 10) -> List[Dict]:
        """Get recent security scans."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                conn.row_factory = aiosqlite.Row
                cursor = await conn.execute("""
                    SELECT id, type, target, status, findings_count,
                           start_time, end_time, metadata
                    FROM security_scans
                    ORDER BY start_time DESC
                    LIMIT ?
                """, (limit,))
                rows = await cursor.fetchall()
                await cursor.close()
                
                scans = []
                for row in rows:
                    scan = dict(row)
                    if scan.get('metadata'):
                        scan['metadata'] = json.loads(scan['metadata'])
                    # Add progress field for frontend compatibility
                    scan['progress'] = 100 if scan.get('status') == 'completed' else 0
                    scans.append(scan)
                return scans
        except Exception as e:
            logger.error(f"Error getting recent scans: {str(e)}")
            return []

    async def initialize_network_monitoring(self) -> None:
        """Initialize network monitoring tables and settings."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                # Create network_metrics table if it doesn't exist
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS network_metrics (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        source_device_id TEXT NOT NULL,
                        target_device_id TEXT NOT NULL,
                        metric_type TEXT NOT NULL,
                        value REAL NOT NULL,
                        timestamp TEXT NOT NULL,
                        metadata TEXT,
                        created_at TEXT NOT NULL,
                        FOREIGN KEY (source_device_id) REFERENCES network_devices(id),
                        FOREIGN KEY (target_device_id) REFERENCES network_devices(id)
                    )
                """)
                
                # Create network_devices table if it doesn't exist
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS network_devices (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL,
                        ip_address TEXT,
                        mac_address TEXT,
                        status TEXT NOT NULL,
                        last_seen TEXT,
                        metadata TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                """)
                
                # Create indexes
                await conn.execute("CREATE INDEX IF NOT EXISTS idx_network_metrics_source_device ON network_metrics(source_device_id)")
                await conn.execute("CREATE INDEX IF NOT EXISTS idx_network_metrics_target_device ON network_metrics(target_device_id)")
                await conn.execute("CREATE INDEX IF NOT EXISTS idx_network_metrics_type ON network_metrics(metric_type)")
                await conn.execute("CREATE INDEX IF NOT EXISTS idx_network_metrics_timestamp ON network_metrics(timestamp)")
                
                await conn.commit()
                logger.info("Network monitoring tables initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing network monitoring: {str(e)}")
            raise

    async def store_security_scan_config(self, config: Dict) -> str:
        """Store security scan configuration and return scan ID."""
        try:
            scan_id = str(uuid.uuid4())
            async with aiosqlite.connect(self.db_path) as conn:
                await conn.execute("""
                    INSERT INTO security_scans (
                        id, timestamp, type, status, target, progress,
                        findings_count, start_time, metadata, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    scan_id,
                    datetime.utcnow().isoformat(),
                    config.get('type', 'vulnerability'),
                    'pending',
                    config.get('target', ''),
                    0.0,
                    0,
                    datetime.utcnow().isoformat(),
                    json.dumps(config),
                    datetime.utcnow().isoformat(),
                    datetime.utcnow().isoformat()
                ))
                await conn.commit()
                return scan_id
        except Exception as e:
            logger.error(f"Error storing security scan config: {str(e)}")
            raise

    async def get_settings(self) -> Dict:
        """Get all system settings."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                conn.row_factory = aiosqlite.Row
                cursor = await conn.cursor()
                
                # Create settings table if it doesn't exist
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS settings (
                        key TEXT PRIMARY KEY,
                        value TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                """)
                
                # Get all settings
                await cursor.execute("SELECT key, value FROM settings")
                rows = await cursor.fetchall()
                
                settings = {}
                for row in rows:
                    try:
                        settings[row['key']] = json.loads(row['value'])
                    except json.JSONDecodeError:
                        # Fallback for non-JSON values
                        settings[row['key']] = row['value']
                
                # Return default settings if none exist
                if not settings:
                    default_settings = {
                        'system': {
                            'app_name': 'SecureNet',
                            'theme': 'dark',
                            'auto_refresh': True,
                            'refresh_interval': 30
                        },
                        'network_monitoring': {
                            'enabled': True,
                            'interval': 300,
                            'timeout': 30,
                            'interface': 'auto',
                            'ip_ranges': '192.168.1.0/24,10.0.0.0/8',
                            'discovery_method': 'ping_arp',
                            'max_devices': 1000,
                            'traffic_analysis': False,
                            'packet_capture': False,
                            'capture_filter': 'tcp port 80 or tcp port 443',
                            'dns_monitoring': True,
                            'port_scan_detection': True,
                            'bandwidth_threshold': 100
                        },
                        'security_scanning': {
                            'enabled': True,
                            'interval': 3600,
                            'severity_threshold': 'medium'
                        },
                        'notifications': {
                            'enabled': True,
                            'email': '',
                            'slack_webhook': ''
                        },
                        'logging': {
                            'level': 'info',
                            'retention_days': 30,
                            'audit_enabled': True
                        }
                    }
                    return default_settings
                
                return settings
        except Exception as e:
            logger.error(f"Error getting settings: {str(e)}")
            raise

    async def update_settings(self, settings: Dict) -> None:
        """Update system settings."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                # Create settings table if it doesn't exist
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS settings (
                        key TEXT PRIMARY KEY,
                        value TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                """)
                
                # Update or insert settings
                for key, value in settings.items():
                    await conn.execute("""
                        INSERT INTO settings (key, value, updated_at)
                        VALUES (?, ?, ?)
                        ON CONFLICT(key) DO UPDATE SET
                            value = excluded.value,
                            updated_at = excluded.updated_at
                    """, (
                        key,
                        json.dumps(value),
                        datetime.utcnow().isoformat()
                    ))
                
                await conn.commit()
                logger.info("Settings updated successfully")
        except Exception as e:
            logger.error(f"Error updating settings: {str(e)}")
            raise

    def insert_sample_devices(self):
        """Insert sample network devices for testing."""
        try:
            with self.get_db() as db:
                cursor = db.cursor()
                now = datetime.utcnow().isoformat()
                
                # Sample devices
                devices = [
                    ('dev_001', 'Router-01', 'router', '192.168.1.1', '00:11:22:33:44:55', 'active', now, json.dumps({'vendor': 'Cisco', 'model': 'ISR4321'}), now, now),
                    ('dev_002', 'Switch-01', 'switch', '192.168.1.2', '00:11:22:33:44:56', 'active', now, json.dumps({'vendor': 'HP', 'model': 'Aruba 2930F'}), now, now),
                    ('dev_003', 'Server-01', 'server', '192.168.1.10', '00:11:22:33:44:57', 'active', now, json.dumps({'os': 'Ubuntu', 'version': '22.04'}), now, now),
                    ('dev_004', 'Workstation-01', 'workstation', '192.168.1.100', '00:11:22:33:44:58', 'active', now, json.dumps({'os': 'Windows', 'version': '11'}), now, now),
                    ('dev_005', 'Printer-01', 'printer', '192.168.1.50', '192.168.1.50', 'inactive', now, json.dumps({'vendor': 'HP', 'model': 'LaserJet Pro'}), now, now)
                ]
                
                # First, ensure the table exists with the correct schema
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS network_devices (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL,
                        ip_address TEXT,
                        mac_address TEXT,
                        status TEXT NOT NULL,
                        last_seen TEXT,
                        metadata TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                """)
                
                # Insert devices
                cursor.executemany("""
                    INSERT INTO network_devices (
                        id, name, type, ip_address, mac_address, status, last_seen, metadata, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, devices)
                
                # Sample connections
                connections = [
                    ('conn_001', 'dev_001', 'dev_002', 'active', 'TCP', 80, now, json.dumps({'bandwidth': '1Gbps'}), now, now),
                    ('conn_002', 'dev_002', 'dev_003', 'active', 'TCP', 443, now, json.dumps({'bandwidth': '1Gbps'}), now, now),
                    ('conn_003', 'dev_003', 'dev_004', 'active', 'TCP', 22, now, json.dumps({'bandwidth': '100Mbps'}), now, now),
                    ('conn_004', 'dev_004', 'dev_005', 'inactive', 'TCP', 9100, now, json.dumps({'bandwidth': '100Mbps'}), now, now)
                ]
                
                # Ensure connections table exists
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS network_connections (
                        id TEXT PRIMARY KEY,
                        source_device_id TEXT NOT NULL,
                        target_device_id TEXT NOT NULL,
                        status TEXT NOT NULL,
                        protocol TEXT,
                        port INTEGER,
                        last_seen TEXT,
                        metadata TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        FOREIGN KEY (source_device_id) REFERENCES network_devices(id),
                        FOREIGN KEY (target_device_id) REFERENCES network_devices(id)
                    )
                """)
                
                # Insert connections
                cursor.executemany("""
                    INSERT INTO network_connections (
                        id, source_device_id, target_device_id, status, protocol, port, last_seen, metadata, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, connections)
                
                # Sample traffic data
                traffic = []
                for i in range(60):  # Last hour of data
                    timestamp = (datetime.utcnow() - timedelta(minutes=i)).isoformat()
                    traffic.append((
                        f'traffic_{i:03d}',
                        'dev_001',
                        'dev_002',
                        'TCP',
                        random.randint(1000, 10000),  # bytes_sent
                        random.randint(1000, 10000),  # bytes_received
                        timestamp,
                        json.dumps({'packet_count': random.randint(100, 1000)})
                    ))
                
                # Ensure traffic table exists
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS network_traffic (
                        id TEXT PRIMARY KEY,
                        source_device_id TEXT NOT NULL,
                        target_device_id TEXT NOT NULL,
                        protocol TEXT NOT NULL,
                        bytes_sent INTEGER DEFAULT 0,
                        bytes_received INTEGER DEFAULT 0,
                        timestamp TEXT NOT NULL,
                        metadata TEXT,
                        FOREIGN KEY (source_device_id) REFERENCES network_devices(id),
                        FOREIGN KEY (target_device_id) REFERENCES network_devices(id)
                    )
                """)
                
                # Insert traffic data
                cursor.executemany("""
                    INSERT INTO network_traffic (
                        id, source_device_id, target_device_id, protocol, bytes_sent, bytes_received, timestamp, metadata
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, traffic)
                
                db.commit()
                logger.info("Sample network data inserted successfully")
                return True
        except Exception as e:
            logger.error(f"Error inserting sample devices: {str(e)}")
            return False

    def reset_user_password(self, username: str, new_password: str) -> bool:
        """Reset a user's password."""
        try:
            with self.get_db() as db:
                cursor = db.cursor()
                # Update password hash
                cursor.execute("""
                    UPDATE users
                    SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE username = ?
                """, (get_password_hash(new_password), username))
                db.commit()
                logger.info(f"Password reset for user '{username}'")
                return True
        except Exception as e:
            logger.error(f"Error resetting password for user '{username}': {str(e)}")
            return False

    async def get_logs(self, page: int = 1, page_size: int = 20, filters: dict = None) -> List[Dict]:
        """Get logs with optional filtering and pagination."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                conn.row_factory = aiosqlite.Row
                cursor = await conn.cursor()

                # Build query conditions
                conditions = []
                params = []
                if filters:
                    if filters.get('level'):
                        conditions.append("level = ?")
                        params.append(filters['level'])
                    if filters.get('category'):
                        conditions.append("category = ?")
                        params.append(filters['category'])
                    if filters.get('source'):
                        conditions.append("source = ?")
                        params.append(filters['source'])
                    if filters.get('start_date'):
                        conditions.append("timestamp >= ?")
                        params.append(filters['start_date'])
                    if filters.get('end_date'):
                        conditions.append("timestamp <= ?")
                        params.append(filters['end_date'])
                    if filters.get('search'):
                        conditions.append("(message LIKE ? OR source LIKE ?)")
                        search_term = f"%{filters['search']}%"
                        params.extend([search_term, search_term])

                # Build the query
                query = ["SELECT * FROM logs"]
                if conditions:
                    query.append("WHERE " + " AND ".join(conditions))
                query.append("ORDER BY timestamp DESC")
                query.append("LIMIT ? OFFSET ?")
                params.extend([page_size, (page - 1) * page_size])

                # Execute query
                await cursor.execute(" ".join(query), params)
                rows = await cursor.fetchall()
                await cursor.close()

                logs = []
                for row in rows:
                    log = dict(row)
                    if log.get('metadata'):
                        log['metadata'] = json.loads(log['metadata'])
                    logs.append(log)

                return logs
        except Exception as e:
            logger.error(f"Error getting logs: {str(e)}")
            return []

    async def get_logs_count(self, filters: dict = None) -> int:
        """Get total count of logs with optional filtering."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.cursor()

                # Build query conditions
                conditions = []
                params = []
                if filters:
                    if filters.get('level'):
                        conditions.append("level = ?")
                        params.append(filters['level'])
                    if filters.get('category'):
                        conditions.append("category = ?")
                        params.append(filters['category'])
                    if filters.get('source'):
                        conditions.append("source = ?")
                        params.append(filters['source'])
                    if filters.get('start_date'):
                        conditions.append("timestamp >= ?")
                        params.append(filters['start_date'])
                    if filters.get('end_date'):
                        conditions.append("timestamp <= ?")
                        params.append(filters['end_date'])
                    if filters.get('search'):
                        conditions.append("(message LIKE ? OR source LIKE ?)")
                        search_term = f"%{filters['search']}%"
                        params.extend([search_term, search_term])

                # Build the query
                query = ["SELECT COUNT(*) FROM logs"]
                if conditions:
                    query.append("WHERE " + " AND ".join(conditions))

                # Execute query
                await cursor.execute(" ".join(query), params)
                count = (await cursor.fetchone())[0]
                await cursor.close()

                return count or 0
        except Exception as e:
            logger.error(f"Error getting logs count: {str(e)}")
            return 0

    async def get_logs_stats(self, start_date: str = None, end_date: str = None) -> Dict:
        """Get log statistics."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.cursor()

                # Build date filter
                date_filter = ""
                params = []
                if start_date or end_date:
                    conditions = []
                    if start_date:
                        conditions.append("timestamp >= ?")
                        params.append(start_date)
                    if end_date:
                        conditions.append("timestamp <= ?")
                        params.append(end_date)
                    date_filter = "WHERE " + " AND ".join(conditions)

                # Get total logs
                await cursor.execute(f"SELECT COUNT(*) FROM logs {date_filter}", params)
                total_logs = (await cursor.fetchone())[0] or 0

                # Get logs by level
                await cursor.execute(f"""
                    SELECT level, COUNT(*) as count
                    FROM logs {date_filter}
                    GROUP BY level
                """, params)
                logs_by_level = {row[0]: row[1] for row in await cursor.fetchall()}

                # Get logs by category
                await cursor.execute(f"""
                    SELECT category, COUNT(*) as count
                    FROM logs {date_filter}
                    GROUP BY category
                """, params)
                logs_by_category = {row[0]: row[1] for row in await cursor.fetchall()}

                # Get logs by source
                await cursor.execute(f"""
                    SELECT source, COUNT(*) as count
                    FROM logs {date_filter}
                    GROUP BY source
                """, params)
                logs_by_source = {row[0]: row[1] for row in await cursor.fetchall()}

                # Get error count and rate
                await cursor.execute(f"""
                    SELECT COUNT(*) as count
                    FROM logs {date_filter}
                    WHERE level IN ('error', 'critical')
                """, params)
                error_count = (await cursor.fetchone())[0] or 0
                error_rate = (error_count / total_logs * 100) if total_logs > 0 else 0

                return {
                    "total_logs": total_logs,
                    "logs_by_level": logs_by_level,
                    "logs_by_category": logs_by_category,
                    "logs_by_source": logs_by_source,
                    "error_count": error_count,
                    "error_rate": error_rate
                }
        except Exception as e:
            logger.error(f"Error getting logs stats: {str(e)}")
            return {
                "total_logs": 0,
                "logs_by_level": {},
                "logs_by_category": {},
                "logs_by_source": {},
                "error_count": 0,
                "error_rate": 0
            }

    async def get_security_metrics(self) -> Dict:
        """Get security metrics."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.cursor()

                # Get active scans count
                await cursor.execute("""
                    SELECT COUNT(*) FROM security_scans
                    WHERE status = 'running'
                """)
                active_scans = (await cursor.fetchone())[0] or 0

                # Get total findings
                await cursor.execute("SELECT COUNT(*) FROM security_findings")
                total_findings = (await cursor.fetchone())[0] or 0

                # Get critical findings
                await cursor.execute("""
                    SELECT COUNT(*) FROM security_findings
                    WHERE severity = 'critical'
                """)
                critical_findings = (await cursor.fetchone())[0] or 0

                # Get last scan
                await cursor.execute("""
                    SELECT end_time FROM security_scans
                    WHERE status = 'completed'
                    ORDER BY end_time DESC
                    LIMIT 1
                """)
                last_scan_row = await cursor.fetchone()
                last_scan = last_scan_row[0] if last_scan_row else None

                # Calculate security score (placeholder implementation)
                security_score = 100 - (critical_findings * 10)  # Simple scoring based on critical findings

                return {
                    "active_scans": active_scans,
                    "total_findings": total_findings,
                    "critical_findings": critical_findings,
                    "security_score": max(0, min(100, security_score)),
                    "last_scan": last_scan,
                    "scan_status": "idle" if active_scans == 0 else "running"
                }
        except Exception as e:
            logger.error(f"Error getting security metrics: {str(e)}")
            return {
                "active_scans": 0,
                "total_findings": 0,
                "critical_findings": 0,
                "security_score": 0,
                "last_scan": None,
                "scan_status": "idle"
            }

    async def get_recent_findings(self, limit: int = 10) -> List[Dict]:
        """Get recent security findings."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                conn.row_factory = aiosqlite.Row
                cursor = await conn.execute("""
                    SELECT id, scan_id, type, severity, status, description,
                           timestamp, source, metadata
                    FROM security_findings
                    ORDER BY timestamp DESC
                    LIMIT ?
                """, (limit,))
                rows = await cursor.fetchall()
                await cursor.close()
                
                findings = []
                for row in rows:
                    finding = dict(row)
                    if finding.get('metadata'):
                        finding['metadata'] = json.loads(finding['metadata'])
                    findings.append(finding)
                return findings
        except Exception as e:
            logger.error(f"Error getting recent findings: {str(e)}")
            return []

    async def get_network_devices(self) -> List[Dict]:
        """Get network devices."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                conn.row_factory = aiosqlite.Row
                cursor = await conn.execute("""
                    SELECT id, name, type, status, last_seen, metadata
                    FROM network_devices
                    ORDER BY last_seen DESC
                """)
                rows = await cursor.fetchall()
                await cursor.close()
                
                devices = []
                for row in rows:
                    device = dict(row)
                    if device.get('metadata'):
                        device['metadata'] = json.loads(device['metadata'])
                    devices.append(device)
                return devices
        except Exception as e:
            logger.error(f"Error getting network devices: {str(e)}")
            return []

    async def get_network_traffic(self, limit: int = 100) -> List[Dict]:
        """Get network traffic data."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                conn.row_factory = aiosqlite.Row
                cursor = await conn.execute("""
                    SELECT timestamp, bytes_in, bytes_out, packets_in, packets_out,
                           source_ip, dest_ip, protocol, metadata
                    FROM network_traffic
                    ORDER BY timestamp DESC
                    LIMIT ?
                """, (limit,))
                rows = await cursor.fetchall()
                await cursor.close()
                
                traffic = []
                for row in rows:
                    entry = dict(row)
                    if entry.get('metadata'):
                        entry['metadata'] = json.loads(entry['metadata'])
                    traffic.append(entry)
                return traffic
        except Exception as e:
            logger.error(f"Error getting network traffic: {str(e)}")
            return []

    async def get_network_protocols(self) -> List[Dict]:
        """Get network protocol distribution."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.cursor()
                await cursor.execute("""
                    SELECT protocol, COUNT(*) as count
                    FROM network_traffic
                    GROUP BY protocol
                    ORDER BY count DESC
                """)
                rows = await cursor.fetchall()
                await cursor.close()

                total = sum(row[1] for row in rows)
                protocols = []
                for protocol, count in rows:
                    protocols.append({
                        "name": protocol,
                        "count": count,
                        "percentage": (count / total * 100) if total > 0 else 0
                    })
                return protocols
        except Exception as e:
            logger.error(f"Error getting network protocols: {str(e)}")
            return []

    async def get_network_stats(self) -> Dict:
        """Get network statistics."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.cursor()

                # Get total devices
                await cursor.execute("SELECT COUNT(*) FROM network_devices")
                total_devices = (await cursor.fetchone())[0] or 0

                # Get active devices
                await cursor.execute("""
                    SELECT COUNT(*) FROM network_devices
                    WHERE status = 'active'
                """)
                active_devices = (await cursor.fetchone())[0] or 0

                # Get total traffic from network_traffic table
                await cursor.execute("""
                    SELECT SUM(bytes_in + bytes_out) as total
                    FROM network_traffic
                """)
                total_traffic = (await cursor.fetchone())[0] or 0

                # Get average latency (placeholder implementation)
                average_latency = 50  # Placeholder value

                await cursor.close()
                
                return {
                    "total_devices": total_devices,
                    "active_devices": active_devices,
                    "total_traffic": total_traffic,
                    "average_latency": average_latency
                }
        except Exception as e:
            logger.error(f"Error getting network stats: {str(e)}")
            return {
                "total_devices": 0,
                "active_devices": 0,
                "total_traffic": 0,
                "average_latency": 0
            }

    async def get_anomalies_stats(self) -> Dict:
        """Get anomalies statistics."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.cursor()

                # Get total anomalies
                await cursor.execute("SELECT COUNT(*) FROM anomalies")
                total = (await cursor.fetchone())[0] or 0

                # Get open anomalies
                await cursor.execute("""
                    SELECT COUNT(*) FROM anomalies
                    WHERE status = 'active'
                """)
                open_count = (await cursor.fetchone())[0] or 0

                # Get critical anomalies
                await cursor.execute("""
                    SELECT COUNT(*) FROM anomalies
                    WHERE severity = 'critical'
                """)
                critical_count = (await cursor.fetchone())[0] or 0

                # Get resolved anomalies
                await cursor.execute("""
                    SELECT COUNT(*) FROM anomalies
                    WHERE status = 'resolved'
                """)
                resolved_count = (await cursor.fetchone())[0] or 0

                # Get anomalies by type
                await cursor.execute("""
                    SELECT type, COUNT(*) as count
                    FROM anomalies
                    GROUP BY type
                """)
                by_type = {row[0]: row[1] for row in await cursor.fetchall()}

                # Get anomalies by severity
                await cursor.execute("""
                    SELECT severity, COUNT(*) as count
                    FROM anomalies
                    GROUP BY severity
                """)
                by_severity = {row[0]: row[1] for row in await cursor.fetchall()}

                return {
                    "total": total,
                    "open": open_count,
                    "critical": critical_count,
                    "resolved": resolved_count,
                    "by_type": by_type,
                    "by_severity": by_severity
                }
        except Exception as e:
            logger.error(f"Error getting anomalies stats: {str(e)}")
            return {
                "total": 0,
                "open": 0,
                "critical": 0,
                "resolved": 0,
                "by_type": {},
                "by_severity": {}
            }

    async def update_db_schema(self):
        """Update database schema."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.cursor()

                # Helper function to check if a column exists
                async def column_exists(table: str, column: str) -> bool:
                    await cursor.execute(f"PRAGMA table_info({table})")
                    columns = await cursor.fetchall()
                    return any(col[1] == column for col in columns)

                # Helper function to add a column if it doesn't exist
                async def add_column_if_not_exists(table: str, column: str, definition: str):
                    if not await column_exists(table, column):
                        try:
                            await cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
                        except sqlite3.OperationalError as e:
                            if "duplicate column name" not in str(e).lower():
                                raise

                # Create or update users table
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT UNIQUE NOT NULL,
                        email TEXT UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        role TEXT NOT NULL,
                        is_active BOOLEAN NOT NULL DEFAULT 1,
                        last_login TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                # Create or update logs table
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS logs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        level TEXT NOT NULL,
                        category TEXT NOT NULL,
                        source TEXT NOT NULL,
                        message TEXT NOT NULL,
                        metadata TEXT
                    )
                """)

                # Create or update security_scans table
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS security_scans (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        end_time TIMESTAMP,
                        status TEXT NOT NULL,
                        type TEXT NOT NULL,
                        target TEXT NOT NULL,
                        findings_count INTEGER DEFAULT 0,
                        metadata TEXT
                    )
                """)

                # Create or update security_findings table
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS security_findings (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        scan_id INTEGER NOT NULL,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        type TEXT NOT NULL,
                        severity TEXT NOT NULL,
                        status TEXT NOT NULL,
                        description TEXT NOT NULL,
                        source TEXT NOT NULL,
                        metadata TEXT,
                        FOREIGN KEY (scan_id) REFERENCES security_scans(id)
                    )
                """)

                # Create or update network_devices table
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS network_devices (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL,
                        status TEXT NOT NULL,
                        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        metadata TEXT
                    )
                """)

                # Create or update network_traffic table
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS network_traffic (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        source_ip TEXT NOT NULL,
                        dest_ip TEXT NOT NULL,
                        protocol TEXT NOT NULL,
                        bytes_in INTEGER DEFAULT 0,
                        bytes_out INTEGER DEFAULT 0,
                        packets_in INTEGER DEFAULT 0,
                        packets_out INTEGER DEFAULT 0,
                        metadata TEXT
                    )
                """)

                # Create or update anomalies table
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS anomalies (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        type TEXT NOT NULL,
                        severity TEXT NOT NULL,
                        status TEXT NOT NULL,
                        description TEXT NOT NULL,
                        source TEXT NOT NULL,
                        metadata TEXT
                    )
                """)

                # Add any missing columns to existing tables
                await add_column_if_not_exists("logs", "source", "TEXT NOT NULL DEFAULT 'system'")
                await add_column_if_not_exists("logs", "metadata", "TEXT")
                await add_column_if_not_exists("security_scans", "metadata", "TEXT")
                await add_column_if_not_exists("security_findings", "source", "TEXT NOT NULL DEFAULT 'system'")
                await add_column_if_not_exists("security_findings", "metadata", "TEXT")
                await add_column_if_not_exists("network_devices", "metadata", "TEXT")
                await add_column_if_not_exists("network_traffic", "metadata", "TEXT")
                await add_column_if_not_exists("anomalies", "source", "TEXT NOT NULL DEFAULT 'system'")
                await add_column_if_not_exists("anomalies", "metadata", "TEXT")

                # Create indexes only if the tables exist and have the required columns
                if await column_exists("logs", "timestamp"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)")
                if await column_exists("logs", "level"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level)")
                if await column_exists("logs", "category"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_category ON logs(category)")
                if await column_exists("logs", "source"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_source ON logs(source)")

                if await column_exists("security_scans", "status"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_scans_status ON security_scans(status)")
                if await column_exists("security_scans", "type"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_scans_type ON security_scans(type)")

                if await column_exists("security_findings", "severity"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_findings_severity ON security_findings(severity)")
                if await column_exists("security_findings", "status"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_findings_status ON security_findings(status)")
                if await column_exists("security_findings", "type"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_findings_type ON security_findings(type)")

                if await column_exists("network_devices", "status"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_devices_status ON network_devices(status)")
                if await column_exists("network_devices", "type"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_devices_type ON network_devices(type)")

                if await column_exists("network_traffic", "timestamp"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_traffic_timestamp ON network_traffic(timestamp)")
                if await column_exists("network_traffic", "protocol"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_traffic_protocol ON network_traffic(protocol)")

                if await column_exists("anomalies", "timestamp"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_anomalies_timestamp ON anomalies(timestamp)")
                if await column_exists("anomalies", "severity"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON anomalies(severity)")
                if await column_exists("anomalies", "status"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_anomalies_status ON anomalies(status)")
                if await column_exists("anomalies", "type"):
                    await cursor.execute("CREATE INDEX IF NOT EXISTS idx_anomalies_type ON anomalies(type)")

                await conn.commit()
                logger.info("Database schema updated successfully")
        except Exception as e:
            logger.error(f"Error updating database schema: {str(e)}")
            raise

    async def insert_sample_data(self):
        """Insert sample data for development and testing."""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.cursor()

                # Sample logs
                sample_logs = [
                    (datetime.now(), 'info', 'system', 'system', 'System startup complete', '{"component": "core"}'),
                    (datetime.now(), 'warning', 'security', 'firewall', 'Suspicious connection attempt', '{"ip": "192.168.1.100"}'),
                    (datetime.now(), 'error', 'network', 'router', 'Connection timeout', '{"device": "router-1"}'),
                    (datetime.now(), 'critical', 'security', 'ids', 'Potential intrusion detected', '{"severity": "high"}'),
                    (datetime.now(), 'info', 'system', 'database', 'Backup completed', '{"size": "1.2GB"}'),
                ]
                await cursor.executemany("""
                    INSERT INTO logs (timestamp, level, category, source, message, metadata)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, sample_logs)

                # Sample security scan
                scan_time = datetime.now()
                await cursor.execute("""
                    INSERT INTO security_scans (start_time, end_time, status, type, target, findings_count, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (scan_time, scan_time + timedelta(minutes=30), 'completed', 'full', 'network', 5, '{"duration": "30m"}'))

                # Get the scan ID
                scan_id = cursor.lastrowid

                # Sample security findings
                sample_findings = [
                    (scan_id, datetime.now(), 'vulnerability', 'high', 'open', 'SQL Injection vulnerability', 'scanner', '{"cve": "CVE-2023-1234"}'),
                    (scan_id, datetime.now(), 'misconfiguration', 'medium', 'open', 'Weak password policy', 'scanner', '{"policy": "password"}'),
                    (scan_id, datetime.now(), 'malware', 'critical', 'open', 'Ransomware detected', 'scanner', '{"type": "crypto"}'),
                    (scan_id, datetime.now(), 'vulnerability', 'low', 'resolved', 'Outdated software', 'scanner', '{"component": "web-server"}'),
                    (scan_id, datetime.now(), 'misconfiguration', 'medium', 'open', 'Exposed API endpoint', 'scanner', '{"endpoint": "/api/v1"}'),
                ]
                await cursor.executemany("""
                    INSERT INTO security_findings (scan_id, timestamp, type, severity, status, description, source, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, sample_findings)

                # Sample network devices
                sample_devices = [
                    ('router-1', 'router', 'active', datetime.now(), '{"ip": "192.168.1.1", "model": "Cisco"}'),
                    ('switch-1', 'switch', 'active', datetime.now(), '{"ip": "192.168.1.2", "ports": 48}'),
                    ('firewall-1', 'firewall', 'active', datetime.now(), '{"ip": "192.168.1.3", "rules": 150}'),
                    ('server-1', 'server', 'active', datetime.now(), '{"ip": "192.168.1.10", "os": "Linux"}'),
                    ('printer-1', 'printer', 'inactive', datetime.now() - timedelta(hours=1), '{"ip": "192.168.1.20", "model": "HP"}'),
                ]
                await cursor.executemany("""
                    INSERT INTO network_devices (name, type, status, last_seen, metadata)
                    VALUES (?, ?, ?, ?, ?)
                """, sample_devices)

                # Sample network traffic
                sample_traffic = [
                    (datetime.now(), '192.168.1.10', '8.8.8.8', 'HTTP', 1500, 750, 10, 5, '{"port": 80}'),
                    (datetime.now(), '192.168.1.20', '8.8.4.4', 'HTTPS', 2000, 1000, 15, 8, '{"port": 443}'),
                    (datetime.now(), '192.168.1.30', '1.1.1.1', 'DNS', 100, 50, 2, 1, '{"port": 53}'),
                    (datetime.now(), '192.168.1.40', '9.9.9.9', 'SMTP', 500, 250, 5, 3, '{"port": 25}'),
                    (datetime.now(), '192.168.1.50', '208.67.222.222', 'ICMP', 100, 100, 1, 1, '{"type": "echo"}'),
                ]
                await cursor.executemany("""
                    INSERT INTO network_traffic (timestamp, source_ip, dest_ip, protocol, bytes_in, bytes_out, packets_in, packets_out, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, sample_traffic)

                # Sample anomalies
                sample_anomalies = [
                    (datetime.now(), 'traffic_spike', 'high', 'open', 'Unusual network traffic detected', 'ids', '{"threshold": "1000%"}'),
                    (datetime.now(), 'failed_login', 'medium', 'open', 'Multiple failed login attempts', 'auth', '{"user": "admin", "count": 10}'),
                    (datetime.now(), 'port_scan', 'high', 'open', 'Port scanning activity detected', 'ids', '{"source": "192.168.1.100"}'),
                    (datetime.now(), 'data_exfiltration', 'critical', 'open', 'Large data transfer detected', 'ids', '{"size": "1GB"}'),
                    (datetime.now(), 'service_outage', 'medium', 'resolved', 'Service unavailable', 'monitoring', '{"service": "web-server"}'),
                ]
                await cursor.executemany("""
                    INSERT INTO anomalies (timestamp, type, severity, status, description, source, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, sample_anomalies)

                await conn.commit()
                logger.info("Sample data inserted successfully")
        except Exception as e:
            logger.error(f"Error inserting sample data: {str(e)}")
            raise