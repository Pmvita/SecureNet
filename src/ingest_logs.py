"""
ingest_logs.py

Purpose:
- Ingest logs from either a local JSON log file or system logs (Linux syslog format).
- Normalize the logs into a consistent format.
- Store the normalized logs into a local SQLite database for later analysis.

Usage:
$ python3 ingest_logs.py --source sample_logs.json
"""

import argparse
import json
import os
import sqlite3
from datetime import datetime

DB_NAME = "data/logs.db"

def init_db():
    os.makedirs("data", exist_ok=True)
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            source TEXT,
            message TEXT
        )
    ''')
    conn.commit()
    conn.close()

def parse_json_log(file_path):
    with open(file_path, 'r') as f:
        return json.load(f)

def normalize_log(entry):
    return {
        "timestamp": entry.get("timestamp", datetime.utcnow().isoformat()),
        "source": entry.get("source", "unknown"),
        "message": entry.get("message", "")
    }

def save_logs(logs):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    for entry in logs:
        norm = normalize_log(entry)
        cursor.execute('''
            INSERT INTO logs (timestamp, source, message) 
            VALUES (?, ?, ?)
        ''', (norm["timestamp"], norm["source"], norm["message"]))
    conn.commit()
    conn.close()

def main():
    parser = argparse.ArgumentParser(description="Ingest system or JSON logs.")
    parser.add_argument("--source", required=True, help="Path to log file (JSON format)")
    args = parser.parse_args()

    init_db()
    logs = parse_json_log(args.source)
    save_logs(logs)
    print(f"Ingested {len(logs)} logs into {DB_NAME}")

if __name__ == "__main__":
    main()