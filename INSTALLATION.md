# 🚀 SecureNet Installation Guide

> Complete installation and setup instructions for SecureNet **real network monitoring** platform

## Prerequisites

### System Requirements
- **Python 3.8 or higher**
- **Node.js 18 or higher**
- **npm package manager**
- **Network access** for WiFi device discovery
- **psutil library** for network interface detection
- **SQLite3** (included with Python)
- **Virtual environment** (recommended)
- **Git** for version control

### Operating System Support
- ✅ **macOS** (native support with enhanced network monitoring)
- ✅ **Linux** (Ubuntu, CentOS, Debian)
- ✅ **Windows** (with WSL recommended for network scanning)

### Network Permissions
SecureNet performs **real network scanning** and requires appropriate permissions:
- **macOS**: Administrator privileges may be required for comprehensive scanning
- **Linux**: Root access recommended for full network interface access
- **Windows**: Administrator rights for network scanning capabilities

---

## Quick Start Installation

### 1. Clone Repository
```bash
git clone https://github.com/pmvita/SecureNet.git
cd SecureNet
```

### 2. Backend Setup (Real Network Monitoring)
```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies (includes psutil for network scanning)
pip install -r requirements.txt

# Initialize database for real device storage
python scripts/init_db.py

# Generate API key
python scripts/generate_api_key.py
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cd ..
```

### 4. Start Application

**Recommended: Real Network Monitoring**
```bash
# Terminal 1: Start backend with real network scanner
source venv/bin/activate
uvicorn app:app --reload

# Terminal 2: Start frontend with Enterprise mode (real data)
cd frontend
npm run Enterprise
```
Access at: `http://localhost:5173` - **Discovers your actual WiFi devices**

**Development Mode: Mock Data (Optional)**
```bash
cd frontend
npm run dev          # Uses sample data for development
```

---

## Development Modes

### Enterprise Mode (Real Network Monitoring) - **Recommended**
Full functionality with live WiFi network discovery and device monitoring.

```bash
# First: Start backend server (Terminal 1)
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn app:app --reload

# Then: Start frontend with real network scanning (Terminal 2)
cd frontend
npm run Enterprise      # VITE_MOCK_DATA=false - Real network data
```

**Features:**
- ✅ **Live WiFi device discovery** - Scans your actual network (192.168.x.0/24)
- ✅ **Real device monitoring** - MAC addresses, IP addresses, device types
- ✅ **Actual traffic analysis** - Real network traffic and bandwidth monitoring
- ✅ **Port scanning** - Service detection on discovered devices
- ✅ **Device classification** - Router, Server, Endpoint, Printer identification
- ✅ **Multi-subnet support** - Automatic network range detection

**Live Discovery Results:**
```
🌐 Your WiFi Network Discovery:
├── 📍 192.168.2.1   - Router (mynetwork) - MAC: 44:E9:DD:4C:7C:74
├── 📱 192.168.2.17  - Endpoint - MAC: F0:5C:77:75:DD:F6  
├── 💻 192.168.2.28  - Endpoint - MAC: 26:29:45:1F:E5:2B
├── 🖥️  192.168.2.50  - Endpoint - MAC: 4A:D6:CC:65:97:8E
└── 📺 192.168.2.54  - Endpoint - Ports: 80, 443
```

### Mock Data Mode (Development Only)
For frontend development and UI testing without network scanning.

```bash
cd frontend
npm run dev          # Uses comprehensive mock data
# OR
npm run dev:mock     # Same as above, explicit mock mode
```

**Features:**
- ✅ Sample network data for development
- ✅ No real network scanning or backend dependencies
- ✅ Consistent test data for UI development
- ✅ Fast development without network access

---

## Environment Configuration

### Environment Variables
Create a `.env` file in the project root:

```env
# Security Configuration
SECRET_KEY=your-super-secret-key-here
API_KEY=your-generated-api-key

# Database Configuration
DATABASE_URL=sqlite:///data/securenet.db

# Network Monitoring Configuration
NETWORK_INTERFACE=auto          # Auto-detect network interfaces
MONITORING_INTERVAL=300         # Scan interval in seconds
NETWORK_SCAN_TIMEOUT=30        # Device discovery timeout
MAX_CONCURRENT_SCANS=50        # Parallel scanning threads

# Real Network Discovery Settings
ENABLE_PORT_SCANNING=true      # Enable service detection
PING_TIMEOUT=1                 # Ping timeout in seconds
ARP_CACHE_ENABLED=true        # Use ARP cache for MAC detection

# Logging Configuration
LOG_LEVEL=INFO
LOG_FILE=logs/securenet.log

# Email Configuration (Optional)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Slack Integration (Optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/your-webhook
```

### Frontend Environment
The frontend mode is controlled by the `VITE_MOCK_DATA` environment variable:

```bash
# Real network monitoring (Enterprise mode)
VITE_MOCK_DATA=false

# Mock data mode (Development)
VITE_MOCK_DATA=true
```

---

## Detailed Setup Instructions

### Backend Configuration

#### 1. Python Environment Setup
```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies (includes psutil for network scanning)
pip install -r requirements.txt
```

#### 2. Database Initialization
```bash
# Initialize SQLite database for real device storage
python scripts/init_db.py

# Verify database creation
ls -la data/securenet.db
```

#### 3. Network Scanner Configuration
```bash
# Test network scanning capabilities
python -c "
import psutil
import subprocess
print('Network interfaces:', list(psutil.net_if_addrs().keys()))
print('Testing ping capability...')
subprocess.run(['ping', '-c', '1', '8.8.8.8'])
"
```

### Real Network Monitoring Setup

#### Network Interface Detection
SecureNet automatically detects your network interfaces and scans appropriate ranges:

```python
# Supported network ranges:
- 192.168.x.0/24  (Home/Office networks)
- 10.x.x.0/24     (Corporate networks)  
- 172.16.x.0/24   (Private networks)
```

#### Device Discovery Methods
1. **Ping Sweep**: Fast discovery of responsive devices
2. **ARP Table Analysis**: MAC address resolution and vendor identification
3. **Port Scanning**: Service detection (HTTP, HTTPS, SSH, FTP, etc.)
4. **Device Classification**: Automatic categorization based on services

#### Scanning Process
```bash
# Manual network scan trigger
curl -X POST http://localhost:8000/api/network/scan

# View discovered devices
curl http://localhost:8000/api/network
```

### Frontend Configuration

#### 1. Node.js Dependencies
```bash
cd frontend

# Install all dependencies
npm install

# Optional: Audit for security vulnerabilities
npm audit

# Optional: Update dependencies
npm update
```

#### 2. Development Server Options
```bash
# Mock data mode (no backend required)
npm run dev

# Real API mode (requires backend)
npm run Enterprise

# Build for production
npm run build

# Preview production build
npm run preview
```

#### 3. Environment Configuration
Create `frontend/.env.local` for local development:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000

# Development Mode
VITE_MOCK_DATA=true

# Feature Flags
VITE_ENABLE_DEBUG=true
VITE_ENABLE_STORYBOOK=true
```

---

## Default Credentials

### Application Access
- **URL**: `http://localhost:5173` (frontend) / `http://localhost:8000` (backend)
- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@example.com`

### API Access
- **API Docs**: `http://localhost:8000/docs`
- **API Key**: Generated during setup (save this value)
- **WebSocket**: `ws://localhost:8000/ws/*`

---

## Verification & Testing

### 1. Backend Health Check
```bash
# Check API health
curl http://localhost:8000/health

# Check API documentation
open http://localhost:8000/docs
```

### 2. Frontend Verification
```bash
# Run frontend tests
cd frontend
npm test

# Run TypeScript checks
npm run type-check

# Run linting
npm run lint
```

### 3. Database Verification
```bash
# Check database tables
sqlite3 data/securenet.db ".tables"

# Verify sample data
sqlite3 data/securenet.db "SELECT COUNT(*) FROM logs;"
```

---

## Development Tools

### Frontend Development
```bash
cd frontend

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run Storybook for component development
npm run storybook

# Type checking
npm run type-check

# Linting and formatting
npm run lint
npm run format
```

### Backend Development
```bash
# Run Python tests
pytest -v

# Run specific test file
pytest tests/test_dashboard.py -v

# Code formatting
black .

# Type checking
mypy app.py
```

---

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

#### Permission Issues (macOS/Linux)
```bash
# Fix Python permissions
sudo chown -R $(whoami) venv/

# Fix Node.js permissions
sudo chown -R $(whoami) ~/.npm
```

#### Database Issues
```bash
# Reset database
rm data/securenet.db
python scripts/init_db.py

# Check database permissions
ls -la data/
```

#### API Key Issues
```bash
# Regenerate API key
python scripts/generate_api_key.py

# Verify API key in logs
tail -f logs/securenet.log | grep "API"
```

### Performance Optimization

#### Backend Performance
```bash
# Install uvloop for better performance (Linux/macOS)
pip install uvloop

# Use gunicorn for production
pip install gunicorn
gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker
```

#### Frontend Performance
```bash
# Analyze bundle size
cd frontend
npm run build
npm run analyze

# Optimize dependencies
npm run deps:check
npm run deps:update
```

---

## Production Deployment

### Environment Setup
```bash
# Set production environment variables
export NODE_ENV=production
export VITE_MOCK_DATA=false
export API_KEY=your-production-api-key

# Build frontend for production
cd frontend
npm run build

# Start backend in production mode
uvicorn app:app --host 0.0.0.0 --port 8000
```

### Security Considerations
- 🔐 Use strong API keys and secrets
- 🌐 Configure HTTPS in production
- 🔥 Set up proper firewall rules
- 📊 Enable logging and monitoring
- 🔄 Regular security updates

---

## Next Steps

After successful installation:

1. 📖 **Read Documentation**: [FEATURES.md](FEATURES.md), [API-Reference.md](API-Reference.md)
2. 🎨 **Explore UI**: Visit `http://localhost:5173` and explore the dashboard
3. 🔧 **Configure Settings**: Customize network monitoring and security settings
4. 📊 **View Screenshots**: Check [SCREENSHOTS.md](SCREENSHOTS.md) for feature overview
5. 🤝 **Contribute**: See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines

---

## Support

- 📧 **Email**: [petermvita@hotmail.com](mailto:petermvita@hotmail.com)
- 🐛 **Issues**: [GitHub Issues](https://github.com/pmvita/SecureNet/issues)
- 📚 **Documentation**: [Project Wiki](https://github.com/pmvita/SecureNet/wiki)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/pmvita/SecureNet/discussions) 