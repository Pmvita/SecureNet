import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv
from src.alert import send_slack_alert

# Load your "real" Slack token and channel (from your .env file)
load_dotenv()

# Call your Slack posting function
try:
    response = send_slack_alert("🔔 Test message from SecureNet smoke test")
    print("✅ Slack alert sent successfully!")
except Exception as e:
    print(f"❌ Slack alert failed: {str(e)}")
