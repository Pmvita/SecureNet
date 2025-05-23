-- Update logs table with new columns
ALTER TABLE logs ADD COLUMN acknowledged BOOLEAN DEFAULT 0;
ALTER TABLE logs ADD COLUMN acknowledged_at TIMESTAMP;
ALTER TABLE logs ADD COLUMN processed_at TIMESTAMP;
ALTER TABLE logs ADD COLUMN detection_run_at TIMESTAMP;
ALTER TABLE logs ADD COLUMN alert_sent_at TIMESTAMP;

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

-- Create index for faster anomaly queries
CREATE INDEX IF NOT EXISTS idx_logs_anomaly_score ON logs(anomaly_score);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_acknowledged ON logs(acknowledged); 