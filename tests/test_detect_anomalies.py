

import sqlite3
import pandas as pd
import pytest
from src.detect_anomalies import preprocess_logs, detect_anomalies

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

TEST_DB = "data/test_logs.db"

@pytest.fixture(scope="module")
def sample_logs_df():
    data = {
        "timestamp": ["2025-05-15T10:00:00Z", "2025-05-15T11:00:00Z"],
        "source": ["syslog", "syslog"],
        "message": ["Test login failed", "Suspicious kernel panic"]
    }
    df = pd.DataFrame(data)
    return df

def test_preprocess_logs_returns_correct_features(sample_logs_df):
    features, enriched = preprocess_logs(sample_logs_df)
    assert "hour" in features.columns
    assert "day_of_week" in features.columns
    assert "message_length" in features.columns
    assert len(features) == 2

def test_detect_anomalies_outputs_expected_columns(sample_logs_df):
    features, enriched = preprocess_logs(sample_logs_df)
    result = detect_anomalies(features, enriched)
    assert "anomaly_score" in result.columns
    assert "anomaly" in result.columns
    assert result.shape[0] == 2