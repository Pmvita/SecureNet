# 🔐 SecureNet

[![Python Version](https://img.shields.io/badge/python-3.8%2B-blue.svg)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE.txt)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.95.1-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)](tests/)
[![Security](https://img.shields.io/badge/security-enhanced-blue.svg)](SECURITY.md)
[![Status](https://img.shields.io/badge/status-active-success.svg)]()

> **AI-powered network security monitoring and management system** with real-time threat detection, network health monitoring, and comprehensive security management.

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.8+** and **Node.js 18+**
- **Git** for cloning the repository

### Installation (3 minutes)
```bash
# 1. Clone repository
git clone https://github.com/pmvita/SecureNet.git && cd SecureNet

# 2. Setup backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt && python scripts/init_db.py

# 3. Setup frontend & start
cd frontend && npm install && npm run dev
```

**🎯 Ready!** Open `http://localhost:5173` 
- **Username**: `admin` | **Password**: `admin123`

> For detailed installation, see **[INSTALLATION.md](INSTALLATION.md)**

---

## ✨ Key Features

### 🔍 **Real-time Security Monitoring**
- ML-based threat detection with scikit-learn
- Live anomaly detection with interactive visualizations
- Real-time security metrics via WebSocket

### 📊 **Professional SOC Dashboard**  
- 6-panel security metrics with gradient design
- Live threat monitoring with severity indicators
- Enterprise-grade visualizations and charts

### 🌐 **Advanced Network Management**
- Wireshark-style traffic monitoring
- Real-time device discovery and health monitoring
- Cross-platform compatibility (macOS, Linux, Windows)

### 📝 **Comprehensive Log Management**
- ELK Stack/Splunk-style interface
- Real-time log streaming with WebSocket
- Advanced filtering and export capabilities

### 🔔 **Smart Alerting System**
- Real-time notifications with unread counters
- Slack and email integration
- Configurable alert thresholds

> **📖 See complete features:** **[FEATURES.md](FEATURES.md)**

---

## 📸 Screenshots

| Dashboard | Network Monitoring | Security Center |
|-----------|-------------------|-----------------|
| ![Dashboard](screenshots/dashboard.png) | ![Network](screenshots/Network-monitoring.png) | ![Security](screenshots/security.png) |

> **🖼️ View all screenshots:** **[SCREENSHOTS.md](SCREENSHOTS.md)**

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[🚀 INSTALLATION.md](INSTALLATION.md)** | Complete setup guide with troubleshooting |
| **[✨ FEATURES.md](FEATURES.md)** | Detailed feature documentation |
| **[📸 SCREENSHOTS.md](SCREENSHOTS.md)** | Visual guide and interface overview |
| **[🔧 FRONTEND-ARCHITECTURE.md](FRONTEND-ARCHITECTURE.md)** | Frontend development guide |
| **[📖 API-Reference.md](API-Reference.md)** | Complete API documentation |
| **[📋 TODO.md](TODO.md)** | Project roadmap and development status |
| **[🤝 CONTRIBUTING.md](CONTRIBUTING.md)** | Contribution guidelines |

---

## 🏗️ Architecture Overview

```
SecureNet/
├── 🐍 Backend (Python + FastAPI)     # Real-time API & WebSocket server
├── ⚛️ Frontend (React + TypeScript)   # Modern SOC interface
├── 💾 Database (SQLite)              # Efficient data storage
├── 🤖 ML Engine (scikit-learn)       # Anomaly detection
└── 🔔 Alerting (Slack + Email)       # Notification system
```

**Development Modes:**
- **🚀 Mock Mode**: `npm run dev` (No backend required)
- **🔗 API Mode**: `npm run dev:api` (Full backend integration)

---

## 🛠️ Tech Stack

### Backend
- **FastAPI** - High-performance async API framework
- **SQLite** - Lightweight, efficient database
- **WebSocket** - Real-time data streaming
- **scikit-learn** - Machine learning for anomaly detection

### Frontend  
- **React 18** + **TypeScript** - Modern UI framework
- **Vite** - Lightning-fast development server
- **Tailwind CSS** - Utility-first styling
- **React Query** - Data fetching and caching
- **Heroicons** - Professional icon system

---

## 🎯 Use Cases

### 🏢 **Enterprise Security**
- SOC dashboard for security teams
- Real-time threat monitoring
- Compliance reporting and audit trails

### 🌐 **Network Operations**
- Network device health monitoring  
- Traffic analysis and bandwidth tracking
- Connection state management

### 📊 **IT Operations**
- Log aggregation and analysis
- System performance monitoring
- Automated alerting and notifications

---

## 🚦 Project Status

### ✅ **Production Ready**
- Real-time Security Monitoring
- Professional SOC Dashboard  
- Advanced Network Management
- Log Management System
- Enhanced Navigation System

### 🚧 **In Development**
- Advanced Analytics Dashboard
- Cloud Integration (AWS, Azure, GCP)
- GPT-based Security Analysis

### 📋 **Planned**
- Docker Containerization
- Zero-trust Security Model
- Mobile Application

> **📋 Full roadmap:** **[TODO.md](TODO.md)**

---

## 🤝 Contributing

We welcome contributions! SecureNet is built with modern technologies and follows best practices.

**Quick Contribution Guide:**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

> **📖 Detailed guide:** **[CONTRIBUTING.md](CONTRIBUTING.md)**

---

## 🔒 Security & Compliance

- **🔐 Encrypted data handling** with secure API authentication
- **🔄 Regular security updates** and dependency management  
- **📊 Audit logging** for all user actions and system changes
- **🌐 Secure WebSocket** connections with proper validation

---

## 📞 Support & Contact

- **📧 Email**: [petermvita@hotmail.com](mailto:petermvita@hotmail.com)
- **🐛 Issues**: [GitHub Issues](https://github.com/pmvita/SecureNet/issues)  
- **💬 Discussions**: [GitHub Discussions](https://github.com/pmvita/SecureNet/discussions)
- **📚 Wiki**: [Project Documentation](https://github.com/pmvita/SecureNet/wiki)

---

## 📄 License

This project is **proprietary software** with **all rights reserved** - see [LICENSE.txt](LICENSE.txt) for details.

**⚠️ RESTRICTED USE**: This software is for **personal evaluation only**. Commercial use, redistribution, or modification is **strictly prohibited** without written permission.

---

<div align="center">

**⭐ Star this repository if you find it useful!**

Made by **[Pierre Mvita](https://github.com/pmvita)**

</div> 