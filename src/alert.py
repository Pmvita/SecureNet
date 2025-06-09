"""
alert.py

Purpose:
- Send alerts via Slack when anomalies are detected.

Usage:
Import and call send_slack_alert(message) from detect_anomalies.py or any alerting module.
"""

import os
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

SLACK_TOKEN = os.getenv("SLACK_BOT_TOKEN")
SLACK_CHANNEL = os.getenv("SLACK_CHANNEL", "#alerts")

client = WebClient(token=SLACK_TOKEN)

def send_slack_alert(message):
    try:
        response = client.chat_postMessage(
            channel=SLACK_CHANNEL,
            text=f":rotating_light: SecureNet Alert :rotating_light:\n{message}"
        )
        return response
    except SlackApiError as e:
        print(f"Slack API Error: {e.response['error']}")