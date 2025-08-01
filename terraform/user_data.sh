#!/bin/bash

# SecureNet EC2 User Data Script
# Automatically installs and configures SecureNet on EC2 instance

set -euo pipefail

# Update system
echo "Updating system packages..."
apt-get update
apt-get upgrade -y

# Install required packages
echo "Installing required packages..."
apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    git \
    curl \
    wget \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    nginx \
    certbot \
    python3-certbot-nginx

# Install Docker
echo "Installing Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Install Docker Compose
echo "Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create securenet user
echo "Creating securenet user..."
useradd -m -s /bin/bash securenet
usermod -aG docker securenet

# Create application directory
echo "Setting up application directory..."
mkdir -p /opt/securenet
cd /opt/securenet

# Clone SecureNet repository (you'll need to set up a private repo or use S3)
echo "Setting up SecureNet application..."
# For now, we'll create a placeholder - you'll need to upload your code
cat > /opt/securenet/docker-compose.yml << 'EOF'
version: '3.8'

services:
  securenet-api:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - ENVIRONMENT=production
      - DATABASE_URL=postgresql://securenet:${DB_PASSWORD}@${DB_HOST}:5432/securenet
      - REDIS_URL=redis://${REDIS_HOST}:${REDIS_PORT}/0
      - JWT_SECRET=${JWT_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    ports:
      - "8000:8000"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  securenet-frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      - VITE_MOCK_DATA=false
      - VITE_API_BASE_URL=http://localhost:8000
    ports:
      - "3000:3000"
    depends_on:
      - securenet-api
    restart: unless-stopped
EOF

# Create environment file
cat > /opt/securenet/.env << EOF
DB_HOST=${db_host}
DB_NAME=${db_name}
DB_USER=${db_user}
DB_PASSWORD=${db_password}
REDIS_HOST=${redis_host}
REDIS_PORT=${redis_port}
JWT_SECRET=securenet_jwt_secret_key_2025_enterprise_production_ready
ENCRYPTION_KEY=securenet_encryption_key_2025_enterprise_production_ready_32_bytes
EOF

# Set proper permissions
chown -R securenet:securenet /opt/securenet
chmod 600 /opt/securenet/.env

# Create systemd service for SecureNet
cat > /etc/systemd/system/securenet.service << 'EOF'
[Unit]
Description=SecureNet Application
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/securenet
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
User=securenet
Group=securenet

[Install]
WantedBy=multi-user.target
EOF

# Enable and start SecureNet service
systemctl enable securenet.service
systemctl start securenet.service

# Configure Nginx
cat > /etc/nginx/sites-available/securenet << 'EOF'
server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # API endpoints
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:8000/health;
        access_log off;
    }
}
EOF

# Enable Nginx site
ln -sf /etc/nginx/sites-available/securenet /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx

# Install CloudWatch agent for monitoring
echo "Installing CloudWatch agent..."
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i amazon-cloudwatch-agent.deb

# Configure CloudWatch agent
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'EOF'
{
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/var/log/securenet/*.log",
                        "log_group_name": "/aws/ec2/securenet/application",
                        "log_stream_name": "{instance_id}"
                    },
                    {
                        "file_path": "/var/log/nginx/access.log",
                        "log_group_name": "/aws/ec2/securenet/nginx/access",
                        "log_stream_name": "{instance_id}"
                    },
                    {
                        "file_path": "/var/log/nginx/error.log",
                        "log_group_name": "/aws/ec2/securenet/nginx/error",
                        "log_stream_name": "{instance_id}"
                    }
                ]
            }
        }
    },
    "metrics": {
        "metrics_collected": {
            "disk": {
                "measurement": ["used_percent"],
                "metrics_collection_interval": 60,
                "resources": ["*"]
            },
            "mem": {
                "measurement": ["mem_used_percent"],
                "metrics_collection_interval": 60
            }
        }
    }
}
EOF

# Start CloudWatch agent
systemctl enable amazon-cloudwatch-agent
systemctl start amazon-cloudwatch-agent

# Create log directory
mkdir -p /var/log/securenet
chown securenet:securenet /var/log/securenet

# Set up log rotation
cat > /etc/logrotate.d/securenet << 'EOF'
/var/log/securenet/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 securenet securenet
    postrotate
        systemctl reload nginx
    endscript
}
EOF

# Create deployment script
cat > /opt/securenet/deploy.sh << 'EOF'
#!/bin/bash
cd /opt/securenet
docker-compose pull
docker-compose up -d --force-recreate
docker system prune -f
EOF

chmod +x /opt/securenet/deploy.sh

echo "SecureNet deployment completed successfully!"
echo "Application will be available at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo "Health check: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)/health" 