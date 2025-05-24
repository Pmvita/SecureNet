import json
import uuid
from datetime import datetime

# Log Source Management
def get_log_sources():
    """Get all configured log sources."""
    with get_db() as db:
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

def get_log_source(source_id):
    """Get a specific log source by ID."""
    with get_db() as db:
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

def create_log_source(source):
    """Create a new log source."""
    with get_db() as db:
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

def update_log_source(source_id, source):
    """Update an existing log source."""
    with get_db() as db:
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

def delete_log_source(source_id):
    """Delete a log source."""
    with get_db() as db:
        cursor = db.cursor()
        cursor.execute("DELETE FROM log_sources WHERE id = ?", (source_id,))
        db.commit()
        return cursor.rowcount > 0

def toggle_log_source(source_id):
    """Toggle a log source's status between active and inactive."""
    with get_db() as db:
        cursor = db.cursor()
        cursor.execute("""
            UPDATE log_sources
            SET status = CASE WHEN status = 'active' THEN 'inactive' ELSE 'active' END,
                last_update = ?
            WHERE id = ?
        """, (datetime.utcnow().isoformat(), source_id))
        db.commit()
        return cursor.rowcount > 0

def update_log_source_stats(source_id, logs_count):
    """Update log source statistics."""
    with get_db() as db:
        cursor = db.cursor()
        cursor.execute("""
            UPDATE log_sources
            SET logs_per_minute = ?,
                last_update = ?
            WHERE id = ?
        """, (logs_count, datetime.utcnow().isoformat(), source_id))
        db.commit()

# Log Storage
def store_log(log):
    """Store a log entry."""
    with get_db() as db:
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

def get_logs(source_id=None, level=None, start_time=None, end_time=None, limit=1000):
    """Get logs with optional filtering."""
    with get_db() as db:
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

def get_log_stats(source_id=None, start_time=None, end_time=None):
    """Get log statistics."""
    with get_db() as db:
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
        stats = {row[0]: row[1] for row in cursor.fetchall()}
        return stats

# Database Schema
def init_db():
    """Initialize the database schema."""
    with get_db() as db:
        cursor = db.cursor()
        
        # Log Sources Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS log_sources (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                config TEXT NOT NULL,
                format TEXT NOT NULL,
                format_pattern TEXT,
                status TEXT NOT NULL,
                last_update TEXT NOT NULL,
                logs_per_minute INTEGER NOT NULL DEFAULT 0,
                tags TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        
        # Logs Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS logs (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                level TEXT NOT NULL,
                source TEXT NOT NULL,
                message TEXT NOT NULL,
                received_at TEXT NOT NULL,
                metadata TEXT,
                created_at TEXT NOT NULL
            )
        """)
        
        # Indexes
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_logs_timestamp
            ON logs(timestamp)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_logs_source
            ON logs(source)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_logs_level
            ON logs(level)
        """)
        
        db.commit() 