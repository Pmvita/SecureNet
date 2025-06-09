#!/bin/bash

# Set the API key
API_KEY="pH0CKCExsHbu-bmu8fMX3INW1_At3sXhrdYyN1As5N8"

# Add to .env file
echo "SECURENET_API_KEY=$API_KEY" > .env

# Add to shell profile
echo "export SECURENET_API_KEY=$API_KEY" >> ~/.zshrc

# Set for current session
export SECURENET_API_KEY=$API_KEY

echo "API key has been set to: ${API_KEY:0:8}..."
echo "Please restart your terminal or run 'source ~/.zshrc' to apply changes" 