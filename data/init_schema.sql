-- Create logs table
CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    anomaly_score REAL,
    acknowledged BOOLEAN DEFAULT 0,
    acknowledged_at TIMESTAMP,
    processed_at TIMESTAMP,
    detection_run_at TIMESTAMP,
    alert_sent_at TIMESTAMP
);

-- Create service_logs table to track service operations
CREATE TABLE IF NOT EXISTS service_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_name TEXT NOT NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create service_settings table for configuration
CREATE TABLE IF NOT EXISTS service_settings (
    service_name TEXT PRIMARY KEY,
    is_enabled BOOLEAN DEFAULT 0,
    config JSON,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default service settings
INSERT OR IGNORE INTO service_settings (service_name, is_enabled, config) VALUES
    ('ingestion', 0, '{"batch_size": 100, "interval_seconds": 1}'),
    ('detection', 0, '{"threshold": -0.5, "interval_seconds": 5}'),
    ('alerts', 0, '{"channels": ["email", "slack"], "interval_seconds": 10}');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_logs_anomaly_score ON logs(anomaly_score);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_acknowledged ON logs(acknowledged);
CREATE INDEX IF NOT EXISTS idx_logs_source ON logs(source);

-- Insert some sample data for testing
INSERT OR IGNORE INTO logs (source, message, anomaly_score) VALUES
    ('system', 'Normal system operation', -0.1),
    ('auth', 'Failed login attempt', -0.8),
    ('network', 'Unusual traffic pattern detected', -0.6),
    ('system', 'High CPU usage detected', -0.7),
    ('auth', 'Multiple failed login attempts', -0.9); 