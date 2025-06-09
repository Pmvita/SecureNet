"""
Test script for the SecureNet dashboard.

This script:
1. Updates the database schema to include anomaly fields
2. Inserts test data
3. Verifies the dashboard functionality
"""

import sqlite3
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from src.app import app

# Test client
client = TestClient(app)

def setup_database():
    """Set up the test database with required schema and test data."""
    conn = sqlite3.connect("data/logs.db")
    cursor = conn.cursor()
    
    # Add anomaly columns if they don't exist
    try:
        cursor.execute("""
            ALTER TABLE logs 
            ADD COLUMN anomaly_score REAL;
        """)
    except sqlite3.OperationalError:
        pass  # Column might already exist
        
    try:
        cursor.execute("""
            ALTER TABLE logs 
            ADD COLUMN anomaly INTEGER;
        """)
    except sqlite3.OperationalError:
        pass  # Column might already exist
    
    # Clear existing test data
    cursor.execute("DELETE FROM logs WHERE source LIKE 'test_%'")
    
    # Insert test data
    test_data = [
        # Normal logs
        ("2024-03-20 10:00:00", "test_syslog", "Normal system startup", -0.1, 0),
        ("2024-03-20 10:01:00", "test_auth", "User login successful", -0.2, 0),
        
        # Anomaly logs with different severity levels
        ("2024-03-20 10:02:00", "test_auth", "Multiple failed login attempts", -0.8, 1),  # High severity
        ("2024-03-20 10:03:00", "test_cloud", "Unusual API access pattern", -0.5, 1),     # Medium severity
        ("2024-03-20 10:04:00", "test_syslog", "Suspicious file access", -0.3, 1),        # Low severity
    ]
    
    cursor.executemany("""
        INSERT INTO logs (timestamp, source, message, anomaly_score, anomaly)
        VALUES (?, ?, ?, ?, ?)
    """, test_data)
    
    conn.commit()
    conn.close()

def test_dashboard_loads():
    """Test that the dashboard loads successfully."""
    response = client.get("/")
    assert response.status_code == 200
    assert "SecureNet – Detected Anomalies" in response.text

def test_anomaly_display():
    """Test that anomalies are displayed correctly."""
    response = client.get("/")
    content = response.text
    
    # Check that anomaly rows are present
    assert "Multiple failed login attempts" in content
    assert "Unusual API access pattern" in content
    assert "Suspicious file access" in content
    
    # Check that normal logs are not displayed
    assert "Normal system startup" not in content
    assert "User login successful" not in content
    
    # Check that anomaly scores are formatted correctly
    assert "-0.80" in content  # High severity
    assert "-0.50" in content  # Medium severity
    assert "-0.30" in content  # Low severity

def test_dashboard_styling():
    """Test that anomaly rows are properly styled."""
    response = client.get("/")
    content = response.text
    
    # Check for CSS classes
    assert "class=\"anomaly\"" in content
    assert "class=\"score high\"" in content
    assert "class=\"score medium\"" in content
    assert "class=\"score low\"" in content

if __name__ == "__main__":
    # Set up the database before running tests
    setup_database()
    
    # Run the tests
    pytest.main([__file__, "-v"]) 