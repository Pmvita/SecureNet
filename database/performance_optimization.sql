-- SecureNet Production Database Optimization
-- Sprint 1, Week 1, Day 1 - Database Index Creation and Performance Tuning

-- Primary security findings index for critical queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_findings_severity_created 
ON security_findings(severity, created_at DESC);

-- Network scanning optimization indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_network_devices_status_updated
ON network_devices(status, last_seen DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_network_scans_timestamp
ON network_scans(timestamp DESC);

-- User authentication optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username_active
ON users(username) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_token_expires
ON user_sessions(token_hash, expires_at) WHERE is_active = true;

-- Security events and alerts optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_timestamp_severity
ON security_events(timestamp DESC, severity);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_created_status
ON alerts(created_at DESC, status);

-- CVE and vulnerability tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vulnerabilities_severity_published
ON vulnerabilities(severity, published_date DESC);

-- Audit logs performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_timestamp_user
ON audit_logs(timestamp DESC, user_id);

-- Performance monitoring queries
-- Query to check index usage
CREATE OR REPLACE VIEW idx_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Query performance monitoring view
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
WHERE mean_time > 50  -- Queries slower than 50ms
ORDER BY mean_time DESC;

-- Connection pool optimization settings
-- These would be applied to PostgreSQL configuration
-- max_connections = 100
-- shared_buffers = 256MB
-- effective_cache_size = 1GB
-- work_mem = 4MB
-- maintenance_work_mem = 64MB

-- Vacuum and analyze for updated statistics
ANALYZE security_findings;
ANALYZE network_devices;
ANALYZE security_events;
ANALYZE alerts;
ANALYZE users;
ANALYZE user_sessions; 