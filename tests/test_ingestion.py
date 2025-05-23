import os
import sqlite3
import pytest
from src.ingest_logs import init_db, save_logs

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

TEST_DB = "data/test_logs.db"

@pytest.fixture(scope="function")
def setup_test_db(monkeypatch):
    monkeypatch.setattr("src.ingest_logs.DB_NAME", TEST_DB)
    init_db()
    yield
    os.remove(TEST_DB)

def test_log_ingestion_creates_table(setup_test_db):
    conn = sqlite3.connect(TEST_DB)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='logs';")
    result = cursor.fetchone()
    conn.close()
    assert result is not None

def test_save_single_log_entry(setup_test_db):
    test_entry = [{
        "timestamp": "2025-05-15T12:00:00Z",
        "source": "test-source",
        "message": "Unit test log entry"
    }]
    save_logs(test_entry)
    
    conn = sqlite3.connect(TEST_DB)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM logs;")
    results = cursor.fetchall()
    conn.close()
    
    assert len(results) == 1
    assert results[0][2] == "test-source"
