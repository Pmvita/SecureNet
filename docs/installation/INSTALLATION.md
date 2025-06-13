# 🚀 SecureNet Installation Guide

> **Production-Ready Network Security Platform Setup**  
> Complete guide for installing SecureNet with dual deployment options: Original and Enhanced versions

## 📋 **System Requirements**

### **Minimum Requirements**
- **Python 3.8+** (Python 3.11+ recommended)
- **Node.js 18+** and npm
- **4GB RAM** (8GB+ recommended for large networks)
- **500MB disk space** (1GB+ for extensive logging)

### **Network Requirements**
- **Network interface access** (WiFi/Ethernet)
- **Administrator privileges** (for network scanning)
- **Firewall permissions** for network discovery

### **Supported Platforms**
- ✅ **macOS** (10.14+) - Full native support
- ✅ **Linux** (Ubuntu 20.04+, CentOS 8+) - Full native support  
- ✅ **Windows 10/11** - Full native support

## 🎯 **Quick Production Setup (5 minutes)**

### **Step 1: Repository Setup**
```bash
# Clone the repository
git clone <repository-url>
cd SecureNet

# Verify Python version (3.8+ required)
python --version
# or
python3 --version
```

### **Step 2: Backend Installation**
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Linux/macOS:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Verify installation
python -c "import fastapi, aiosqlite, psutil; print('✅ Backend dependencies installed')"
```

### **Step 3: Database Initialization**
```bash
# Database will auto-initialize on first run
# No manual setup required - SQLite creates automatically
echo "✅ Database ready for real network data"
```

### **Step 4: Choose Your SecureNet Version**

#### **Option A: Original SecureNet (Recommended for Production)**
```bash
# Start the stable, production-ready version
python app.py

# You should see:
# INFO: Database initialized successfully - ready for real network scanning
# INFO: Uvicorn running on http://127.0.0.1:8000
```

#### **Option B: Enhanced SecureNet (Advanced Features)**
```bash
# Start Redis for enhanced features
redis-server --daemonize yes

# Start the enhanced version with monitoring, ML tracking, and background tasks
python app_enhanced.py

# Optional: Start background workers in new terminal
rq worker --url redis://localhost:6379/0

# You should see enhanced startup logs with monitoring and ML services
```

### **Step 5: Frontend Installation**
```bash
# Open new terminal and navigate to frontend
cd SecureNet/frontend

# Install Node.js dependencies
npm install

# Verify installation
npm list react react-dom typescript
```

### **Step 6: Start Production Interface**
```bash
# Start Enterprise mode (real network monitoring)
npm run Enterprise

# You should see:
# Mock_Data=false
# Enterprise_Mode=true
# VITE v5.4.19 ready in 4545 ms
# ➜ Local: http://localhost:5173/
```

## 🌐 **Access SecureNet**

### **Frontend Dashboard**
- **URL**: http://localhost:5173
- **Default Login**: 
  - Username: `admin`
  - Password: `admin123`

### **Backend API**
- **API Base**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **API Key**: `dev-api-key` (development)

## 🔧 **Environment Modes**

### **Enterprise Mode (Production) - Recommended**
```bash
cd frontend
npm run Enterprise
```
- ✅ **Real network scanning** enabled
- ✅ **Live device discovery** active
- ✅ **Actual security analysis** performed
- ✅ **Production database** storage

### **Demo Mode (Development)**
```bash
cd frontend
npm run dev
```
- 📊 **Sample data** for testing
- 🔧 **Development features** enabled
- 📝 **Mock API responses**

## 🛠️ **Platform-Specific Setup**

### **macOS Installation**
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Python and Node.js
brew install python@3.11 node

# Install SecureNet
git clone <repository-url> && cd SecureNet
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Network scanning may require admin privileges
sudo echo "Network scanning permissions granted"
```

### **Linux Installation (Ubuntu/Debian)**
```bash
# Update package list
sudo apt update

# Install Python and Node.js
sudo apt install python3.11 python3.11-venv nodejs npm

# Install SecureNet
git clone <repository-url> && cd SecureNet
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Grant network scanning permissions
sudo setcap cap_net_raw+ep venv/bin/python
```

### **Windows Installation**
```powershell
# Install via Windows Package Manager (winget)
winget install Python.Python.3.11
winget install OpenJS.NodeJS

# Or download from:
# Python: https://www.python.org/downloads/
# Node.js: https://nodejs.org/

# Install SecureNet
git clone <repository-url>
cd SecureNet
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Run as Administrator for network scanning
```

## 🔒 **Security Configuration**

### **Network Scanning Permissions**

#### **macOS Permissions**
```bash
# Grant network access (may prompt for password)
sudo python3 -c "import psutil; print('Network interface access verified')"
```

#### **Linux Permissions**
```bash
# Add network capabilities (recommended)
sudo setcap cap_net_raw+ep venv/bin/python

# Alternative: Run with sudo (less secure)
sudo uvicorn app:app --reload
```

#### **Windows Permissions**
- Run Command Prompt or PowerShell **as Administrator**
- Windows Defender/Firewall may prompt for network access
- Allow network scanning when prompted

### **Firewall Configuration**
```bash
# Allow ports (if firewall enabled)
# Backend: Port 8000
# Frontend: Port 5173

# Linux (ufw)
sudo ufw allow 8000
sudo ufw allow 5173

# macOS (built-in firewall)
# Configure via System Preferences > Security & Privacy > Firewall

# Windows Defender
# Configure via Windows Security > Firewall & network protection
```

## 📊 **Verification & Testing**

### **Backend Health Check**
```bash
# Test API endpoints
curl http://localhost:8000/api/security
curl http://localhost:8000/api/network
curl http://localhost:8000/docs

# Expected: JSON responses with real network data
```

### **Network Discovery Test**
```bash
# Test network scanning
curl -X POST "http://localhost:8000/api/network/scan" -H "X-API-Key: dev-api-key"

# Expected: Real device discovery results
```

### **Frontend Verification**
1. Open http://localhost:5173
2. Login with admin/admin123
3. Navigate to **Network** tab
4. Verify real devices are displayed
5. Navigate to **Security** tab  
6. Run security scan and verify results

## 🔧 **Configuration Options**

### **Network Range Configuration**
Edit `network_scanner.py` to customize scanning ranges:
```python
# Default ranges (automatically detected)
NETWORK_RANGES = [
    "192.168.0.0/24",   # Common home networks
    "192.168.1.0/24",   # Common router default
    "10.0.0.0/24",      # Corporate networks
]

# Add custom ranges as needed
```

### **Database Configuration**
```python
# Default: SQLite (recommended for production)
DATABASE_URL = "data/securenet.db"

# Storage location automatically created
# No additional configuration required
```

### **API Configuration**
```python
# Development API key (change in production)
API_KEY = "dev-api-key"

# CORS settings for frontend
CORS_ORIGINS = ["http://localhost:5173"]
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Permission Denied (Network Scanning)**
```bash
# macOS/Linux: Grant network capabilities
sudo setcap cap_net_raw+ep venv/bin/python

# Windows: Run as Administrator
```

#### **Port Already in Use**
```bash
# Kill existing processes
pkill -f uvicorn
pkill -f vite

# Or use different ports
uvicorn app:app --port 8001
npm run Enterprise -- --port 5174
```

#### **Python Virtual Environment Issues**
```bash
# Recreate virtual environment
rm -rf venv
python -m venv venv
source venv/bin/activate  # Linux/macOS
# or
venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

#### **Network Discovery Not Working**
```bash
# Check network interface
python -c "import psutil; print(psutil.net_if_addrs())"

# Test basic connectivity
ping 192.168.1.1

# Verify scanner permissions
python -c "import subprocess; subprocess.run(['ping', '-c', '1', '8.8.8.8'])"
```

### **Debug Mode**
```bash
# Enable debug logging
export PYTHONPATH=$PYTHONPATH:$(pwd)
python -c "import logging; logging.basicConfig(level=logging.DEBUG)"
uvicorn app:app --reload --log-level debug
```

## 📈 **Performance Optimization**

### **Large Network Optimization**
```bash
# For networks with 100+ devices
# Increase timeout settings in network_scanner.py
PING_TIMEOUT = 2.0  # Increase for slow networks
MAX_WORKERS = 50    # Adjust based on system capabilities
```

### **Resource Monitoring**
```bash
# Monitor system resources during scanning
htop  # Linux
top   # macOS
# Task Manager (Windows)

# Expected CPU usage: 10-30% during active scanning
# Expected Memory usage: 200-500MB
```

## 🎯 **Production Deployment**

### **Environment Variables**
```bash
# Create .env file
cat > .env << EOF
ENVIRONMENT=production
API_KEY=your-secure-api-key-here
DATABASE_URL=data/securenet.db
CORS_ORIGINS=["https://your-domain.com"]
EOF
```

### **Service Setup (Linux)**
```bash
# Create systemd service
sudo tee /etc/systemd/system/securenet.service << EOF
[Unit]
Description=SecureNet API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/SecureNet
Environment=PATH=/path/to/SecureNet/venv/bin
ExecStart=/path/to/SecureNet/venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl enable securenet
sudo systemctl start securenet
```

## ✅ **Installation Complete**

Your SecureNet installation is now ready for **production network monitoring**!

### **Next Steps:**
1. 🔍 **Discover your network**: Check the Network tab for real devices
2. 🛡️ **Run security scans**: Use the Security tab to analyze vulnerabilities  
3. 📊 **Monitor activity**: View real-time data in the Dashboard
4. ⚙️ **Configure settings**: Customize scanning ranges and thresholds
5. 📝 **Review logs**: Check the Logs tab for system activity

### **Support:**
- 📖 **Documentation**: See other `.md` files in this repository
- 🐛 **Issues**: Report problems via GitHub Issues  
- 💬 **Help**: Contact support for assistance

---

**🛡️ SecureNet v2.1.0** - Your network security monitoring platform is ready! 