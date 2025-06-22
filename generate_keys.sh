#!/bin/bash
# SecureNet Enhanced - Generate Production Keys

echo "🔐 Generating secure keys for SecureNet Enhanced..."
echo ""

echo "# Generated SecureNet Production Keys - $(date)"
echo "# Add these to your .env file"
echo ""

echo "JWT_SECRET=$(openssl rand -hex 32)"
echo "ENCRYPTION_KEY=$(python3 -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())')"
echo "MASTER_KEY_MATERIAL=$(openssl rand -hex 64)"

echo ""
echo "✅ Keys generated successfully!"
echo "⚠️  IMPORTANT: Store these keys securely and never commit them to version control!" 