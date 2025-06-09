"""
detect_anomalies.py

Purpose:
- Load logs from SQLite database
- Preprocess log data into features
- Train Isolation Forest on existing data
- Identify and score anomalies
- Print or flag alerts based on anomaly score

Usage:
$ python detect_anomalies.py
"""

import sqlite3
import pandas as pd
from sklearn.ensemble import IsolationForest
from datetime import datetime

from src.alert import send_slack_alert

DB_NAME = "data/logs.db"
ALERT_THRESHOLD = -0.15  # Lower = more suspicious

def fetch_logs():
    conn = sqlite3.connect(DB_NAME)
    df = pd.read_sql_query("SELECT * FROM logs", conn)
    conn.close()
    return df

def preprocess_logs(df):
    # Convert timestamp to datetime features
    df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
    df['hour'] = df['timestamp'].dt.hour
    df['day_of_week'] = df['timestamp'].dt.dayofweek
    df['message_length'] = df['message'].apply(len)
    feature_df = df[['hour', 'day_of_week', 'message_length']]
    return feature_df, df

def detect_anomalies(features, original_df):
    clf = IsolationForest(contamination=0.05, random_state=42)
    clf.fit(features)
    scores = clf.decision_function(features)
    preds = clf.predict(features)

    original_df['anomaly_score'] = scores
    original_df['anomaly'] = preds
    return original_df

def alert_on_anomalies(df):
    flagged = df[df['anomaly_score'] < ALERT_THRESHOLD]
    for _, row in flagged.iterrows():
        alert_message = (
            f"[ALERT] Suspicious log detected:\n"
            f"  Time: {row['timestamp']}\n"
            f"  Source: {row['source']}\n"
            f"  Score: {row['anomaly_score']:.4f}\n"
            f"  Message: {row['message']}"
        )
        print(alert_message)
        send_slack_alert(alert_message)

def main():
    logs_df = fetch_logs()
    if logs_df.empty:
        print("No logs found in database.")
        return

    features, enriched_df = preprocess_logs(logs_df)
    results_df = detect_anomalies(features, enriched_df)
    alert_on_anomalies(results_df)

if __name__ == "__main__":
    main()