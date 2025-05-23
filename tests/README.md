

# 🧪 SecureNet MVP – Testing Guide

This directory contains unit tests for SecureNet's core components.

## 📦 Structure

- `test_ingestion.py`: Verifies that log ingestion into SQLite works correctly.
- `test_detect_anomalies.py`: Tests the preprocessing and ML anomaly detection logic.

## 🚀 How to Run Tests

Make sure you are in your virtual environment and in the root of the SecureNet project.

### 1. Activate your virtual environment

**Linux/macOS:**
```bash
source venv/bin/activate
```

**Windows:**
```bash
venv\Scripts\activate
```

### 2. Install test dependencies

Ensure `pytest` is installed:
```bash
pip install pytest
```

### 3. Run all tests

From the root of the project:
```bash
pytest
```

Use `-v` for verbose output:
```bash
pytest -v
```

## 🧹 Tips

- Logs are stored in an isolated test database (`data/test_logs.db`).
- Each test cleans up after itself via `pytest` fixtures.
- Use `pytest --tb=short` for cleaner error traces.

## 📬 Contact

Maintained by [Pierre Mvita](https://github.com/pierre-mvita).