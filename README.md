# 🛡️ SecureNet

> **Real-time network defense. Enterprise-grade intelligence. One dashboard.**

[![GitHub Stars](https://img.shields.io/github/stars/yourusername/securenet?style=social)](https://github.com/yourusername/securenet)
[![Documentation](https://img.shields.io/badge/docs-available-brightgreen)](./docs/installation/INSTALLATION.md)
[![License](https://img.shields.io/badge/license-Proprietary-red)](./LICENSE.txt)
[![Status](https://img.shields.io/badge/status-Production%20Ready-success)](./docs/system/SYSTEM-STATUS.md)
[![SOC 2](https://img.shields.io/badge/SOC%202-In%20Progress-orange)](./docs/compliance/soc2-readiness.md)
[![ISO 27001](https://img.shields.io/badge/ISO%2027001-Controls%20Implemented-blue)](./docs/compliance/security-hardening.md)

**SecureNet** is an enterprise-grade AI-powered cybersecurity platform delivering autonomous threat detection, predictive risk assessment, and intelligent security operations management. Engineered for Fortune 500 enterprises, government agencies, and managed security service providers (MSSPs), SecureNet combines advanced machine learning algorithms with real-time network intelligence to provide comprehensive security posture management and compliance automation.

---

## ⭐ **Quick Actions**

<div align="center">

[⭐ **Star this repo**](https://github.com/yourusername/securenet) • [📖 **View Documentation**](./docs/installation/INSTALLATION.md) • [🚀 **System Status**](./docs/system/SYSTEM-STATUS.md) • [🔥 **CVE Integration**](./docs/features/CVE-INTEGRATION-SUMMARY.md)

</div>

---

## 🚀 **Key Features**

<table>
<tr>
<td width="50%">

### 🧠 **AI-Powered Threat Detection**
- Machine learning anomaly detection
- Behavioral pattern recognition
- Predictive risk assessment
- Automated threat classification

### 🔍 **Live Network Discovery**
- Real-time device scanning (192.168.x.0/24)
- Smart device classification (Router, IoT, Mobile)
- Cross-platform support (macOS, Linux, Windows)
- Network topology visualization

### 🔔 **Real-Time Alert System**
- WebSocket-powered notifications
- Smart categorization & priority filtering
- Bulk operations & search functionality
- Mobile-responsive notification center

</td>
<td width="50%">

### 🔐 **Enterprise Security & RBAC**
- 3-tier role-based access control
- JWT + API key authentication
- Session tracking & audit logging
- Multi-tenant SaaS architecture

### 📊 **CVE Intelligence Integration**
- NIST NVD API connectivity
- Real-time vulnerability scoring (CVSS v3)
- CISA KEV tracking
- Vendor-specific analysis (Cisco, Fortinet, etc.)

### 📦 **SaaS Infrastructure**
- Stripe billing integration
- Organization management
- Usage analytics & metrics
- Docker deployment ready

</td>
</tr>
</table>

---

## 📸 **Platform Screenshots**

*Enterprise-Grade Security Operations Center Interface*

| Dashboard Overview | Log Management | Security Management |
|:------------------:|:-----------------:|:---------------:|
| ![Dashboard](screenshots/dashboard.png) | ![Log Management](screenshots/log.png) | ![Alerts](screenshots/security.png) |

| Network Monitoring | Anomaly Detection | System Configuration |
|:---------------:|:----------------:|:-------------------:|
| ![Network Monitoring](screenshots/Network-monitoring.png) | ![CVE](screenshots/anomalies.png) | ![System Configuration](screenshots/settings.png) |

> **Note**: Screenshots demonstrate production-ready interface with enterprise security features. For complete visual documentation, see [Screenshots Guide](./docs/SCREENSHOTS.md).

---

## 🔑 **Development Credentials**

**SecureNet includes pre-configured development users for testing role-based access:**

| Role | Username | Password | Email | Access Level |
|------|----------|----------|-------|--------------|
| 🟣 **Platform Owner** | `ceo` | `superadmin123` | `ceo@securenet.ai` | Full platform access, tenant management, audit logs |
| 🔵 **Security Admin** | `admin` | `platform123` | `admin@secureorg.com` | Organization-level admin with advanced controls |
| 🟢 **SOC Analyst** | `user` | `enduser123` | `user@secureorg.com` | Standard user with dashboard access |

> ⚠️ **Important**: These are development credentials only. Change them before production deployment.

---

## ⚡ **Quick Start**

### **Prerequisites**
- Python 3.8+ with pip
- Node.js 16+ with npm
- PostgreSQL 13+ (for enterprise features) or SQLite (development)
- Redis (for enhanced features)
- Git

### **1. Clone & Setup Backend**
```bash
git clone https://github.com/pmvita/securenet.git
cd SecureNet

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
# For development (SQLite):
pip install -r requirements.txt

# For enterprise (PostgreSQL + full features):
pip install -r requirements-enterprise.txt
```

### **2. Database Setup**

#### **🏢 Enterprise (PostgreSQL)**
```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Install and setup PostgreSQL
brew install postgresql                    # macOS
sudo apt-get install postgresql          # Ubuntu/Debian
brew services start postgresql           # macOS
sudo systemctl start postgresql          # Linux

# Create database and user
createdb securenet
createuser -s securenet
psql -c "ALTER USER securenet PASSWORD 'securenet';"

# Run migration to PostgreSQL
python scripts/migrate_to_postgresql.py
```

#### **🛠 Development (SQLite)**
```bash
# SQLite database will be created automatically at data/securenet.db
# No additional setup required
```

### **3. Start Backend Server**

#### **🚀 Production Mode (Recommended)**
```bash
# Complete production environment (backend + frontend)
./start_production.sh         # Full production setup with security checks

# Stop production services
./stop_production.sh          # Clean shutdown
```

- **📚 Complete Setup**: See [Startup Guide](./docs/setup/STARTUP_GUIDE.md) for comprehensive deployment instructions
- **🏢 Enterprise Deployment**: See [Production Configuration](./docs/setup/production_config.txt) for enterprise environment setup
- **🔧 Enhanced Features**: See [Enhanced Version Guide](./docs/setup/ENHANCED_VERSION_GUIDE.md) for advanced monitoring & ML capabilities

### **4. Setup Frontend**
```bash
# New terminal window
cd frontend
npm install

# Start in production mode (real network scanning)
npm run start:prod

# Alternative: Development mode with mock data
npm run dev
```

### **5. Access SecureNet**
- **🎯 Dashboard**: http://localhost:5173
- **🔧 API**: http://localhost:8000
- **📚 API Docs**: http://localhost:8000/docs
- **📊 Enhanced Metrics**: http://localhost:8000/system/health (enhanced version only)

---

## 🛠️ **Technology Stack**

<div align="center">

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

</div>

**Backend**: FastAPI • PostgreSQL/SQLite • WebSockets • JWT Auth • Pydantic • Asyncio  
**Frontend**: React 18 • TypeScript • Vite • Tailwind CSS • Heroicons • Axios  
**AI/ML**: Custom algorithms • Scikit-learn • MLflow • Pattern recognition • Behavioral analytics  
**Enhanced**: Redis • RQ • Sentry • Prometheus • Structured logging • Cryptography  
**Infrastructure**: Docker • Kubernetes • Multi-tenant SaaS • Stripe billing • Real-time processing

---

## ✅ **Enterprise Readiness Checklist**

- ✅ **Role-Based Access Control** — 3-tier security model (Platform Owner → Security Admin → SOC Analyst)
- ✅ **CVE Integration** — Real-time NIST NVD API with CISA KEV tracking
- ✅ **SaaS Billing** — Stripe integration with subscription management
- ✅ **Audit Logging** — Comprehensive activity tracking and compliance
- ✅ **Predictive Analytics** — AI-driven threat detection and risk assessment
- ✅ **Multi-Tenant Architecture** — Organization isolation and management
- ✅ **Real-Time Monitoring** — WebSocket alerts and live data streaming
- ✅ **API-First Design** — RESTful endpoints with comprehensive documentation
- ✅ **Docker Support** — Containerized deployment and scaling
- ✅ **Security Hardening** — JWT authentication, API keys, session management

---

## 🧩 **SecureNet Enhanced Architecture**

SecureNet now offers **two deployment options** to meet different operational needs:

### **🏭 Original SecureNet (`app.py`)**
- ✅ **Production-ready** and battle-tested
- ✅ **Full feature set** with real-time monitoring
- ✅ **Stable architecture** for enterprise deployment
- ✅ **Compatible** with existing frontend and workflows

### **🚀 Enhanced SecureNet (`app_enhanced.py`)**
- ✅ **All original features** PLUS advanced capabilities
- 📊 **Prometheus metrics** and structured logging
- 🔍 **Sentry error monitoring** and distributed tracing
- 🤖 **MLflow experiment tracking** and model management
- ⚡ **Redis task queues** for background processing
- 🔐 **Advanced cryptography** and security services

> **Seamless Migration**: Both versions use the same database and frontend - switch anytime!

---

## 📁 **Technical Integration Guides**

### **🏗️ Backend Integration**
- [🚀 Startup Guide](./docs/setup/STARTUP_GUIDE.md) - Complete setup instructions for both versions
- [🔧 Production Configuration](./docs/setup/production_config.txt) - Environment setup template
- [🔒 Production Setup](./docs/setup/DEV_MODE_DISABLED.md) - Production mode configuration and security
- [⚡ Production Quick Reference](./docs/setup/PRODUCTION_QUICK_REFERENCE.md) - Fast production deployment commands
- [Phase 1: Observability](./docs/integration/phase-1-observability.md) - Monitoring and logging
- [Phase 2: Developer Experience](./docs/integration/phase-2-developer-experience.md) - Testing and ML tools
- [Phase 3: Advanced Tooling](./docs/integration/phase-3-advanced-tooling.md) - Cryptography and task queues

### **🎨 Frontend Integration**
- [🎨 Frontend Integration Hub](./docs/integration/frontend/README.md) - frontend enhancement roadmap
- ✅ [🚀 Phase 1: Immediate Enhancements](./docs/integration/frontend/phase-1-frontend-enhancements.md) - **COMPLETE** - Performance & reliability improvements
- ✅ [📊 Phase 2: UI & Visualization](./docs/integration/frontend/phase-2-ui-visualization.md) - **COMPLETE** - Advanced analytics & user experience
- ✅ [🏢 Phase 3: Enterprise Components](./docs/integration/frontend/phase-3-enterprise-components.md) - **COMPLETE** - Enterprise-grade development tools

---

## 📚 **Documentation Hub**

| Documentation | Description | Status |
|---------------|-------------|--------|
| **[🚀 Startup Guide](./docs/setup/STARTUP_GUIDE.md)** | Complete instructions for both original and enhanced versions | ✅ Ready |
| **[⚡ Enhanced Features](./docs/reference/ENHANCED_FEATURES.md)** | Feature comparison and enhanced capabilities reference | ✅ Ready |
| **[🔧 Production Config](./docs/setup/production_config.txt)** | Environment configuration template and setup guide | ✅ Ready |
| **[📋 Installation Guide](./docs/installation/INSTALLATION.md)** | Complete setup instructions for backend + frontend | ✅ Ready |
| **[🤖 AI Features](./docs/features/FEATURES.md)** | ML threat detection, predictive analytics, behavioral analysis | ✅ Ready |
| **[📡 API Reference](./docs/api/API-Reference.md)** | REST endpoints, WebSocket connections, authentication | ✅ Ready |
| **[🔥 CVE Integration](./docs/features/CVE-INTEGRATION-SUMMARY.md)** | NIST NVD API sync, vulnerability scoring, CISA KEV | ✅ Ready |
| **[📊 System Status](./docs/system/SYSTEM-STATUS.md)** | Operational metrics, performance data, uptime monitoring | ✅ Ready |
| **[🎯 Development Roadmap](./docs/project/TODO.md)** | Feature milestones, upcoming AI enhancements | ✅ Ready |
| **[🖼️ Screenshots](./docs/SCREENSHOTS.md)** | Visual documentation, dashboard views, interface guide | ✅ Ready |
| **[🏗️ Frontend Architecture](./docs/architecture/FRONTEND-ARCHITECTURE.md)** | Component structure, design system, technical details | ✅ Ready |
| **[🔧 Integration Docs](./docs/)** | Phase-based library integration guides and tooling | ✅ Ready |

---

## 🏗️ **Architecture Overview**

```mermaid
graph TB
    A[🌐 React Frontend] --> B[🔌 FastAPI Backend]
    B --> C[🗄️ PostgreSQL/SQLite Database]
    B --> D[🤖 AI/ML Engine]
    B --> E[🔍 Network Scanner]
    B --> F[🛡️ CVE Intelligence]
    
    G[📡 WebSocket] --> A
    H[🔔 Real-time Alerts] --> G
    I[📊 Threat Analytics] --> D
    J[🌍 NIST NVD API] --> F
    K[🏢 Multi-tenant SaaS] --> B
```

**Core Components:**
- **AI-Powered Backend**: FastAPI with ML threat detection engine
- **Intelligent Frontend**: React 18 with TypeScript and real-time updates
- **Security Engine**: Custom vulnerability assessment and risk scoring
- **Network Discovery**: Cross-platform device scanning and classification
- **SaaS Infrastructure**: Multi-tenant architecture with billing integration

---

## ☁️ **Deployment & Hosting Options**

SecureNet supports multiple deployment environments to meet diverse organizational requirements:

### **🏢 On-Premise**
- **Air-gapped environments** with complete offline operation
- **Classified-ready** deployment for government and defense contracts
- **SCIF-compatible** secure hosting for sensitive compartmented information
- **Hardware security module (HSM)** integration for cryptographic operations

### **☁️ Public Cloud**
- **Amazon Web Services (AWS)** - EC2, ECS, EKS deployment options
- **Microsoft Azure** - Container Instances, AKS, Virtual Machines
- **Google Cloud Platform (GCP)** - Compute Engine, GKE, Cloud Run
- **Multi-cloud redundancy** for high availability and disaster recovery

### **🔄 Hybrid Cloud**
- **SOC/Compliance zone** support with data residency controls
- **Edge deployment** for distributed security operations
- **Private cloud integration** with VMware vSphere, OpenStack
- **Seamless data synchronization** between on-premise and cloud components

### **🔒 SCIF-Ready Secure Hosting**
- **TS/SCI clearance** environment compatibility
- **TEMPEST-certified** hardware deployment options
- **Cross-domain solutions (CDS)** integration capability
- **FISMA High/Moderate** authorization boundary support

---

## 🚦 **Development Status**

| Component | Status | Description |
|-----------|--------|-------------|
| 🤖 **ML Threat Detection** | ✅ **Production** | AI-powered anomaly detection and behavioral analysis |
| 🛡️ **Security Intelligence** | ✅ **Production** | CVE integration with NIST NVD and vulnerability scoring |
| 📊 **Analytics Dashboard** | ✅ **Production** | Real-time security metrics and threat visualization |
| 🔔 **Notification System** | ✅ **Production** | WebSocket alerts with smart categorization |
| 🔒 **Enterprise Auth** | ✅ **Production** | JWT + API key authentication with RBAC |
| 📱 **Responsive UI** | ✅ **Production** | Modern interface with mobile support |
| 📦 **SaaS Infrastructure** | ✅ **Production** | Multi-tenant architecture with billing |
| 📚 **Documentation** | ✅ **Complete** | Comprehensive guides and API reference |

---

## 🤝 **Contributing**

We welcome contributions to SecureNet! Here's how to get started:

1. **📖 Read**: Review our [Contributing Guidelines](./CONTRIBUTING.md)
2. **🍴 Fork**: Create your feature branch (`git checkout -b feature/ai-enhancement`)
3. **🔨 Develop**: Build and test with real network environment
4. **✅ Test**: Validate AI features and ML model performance
5. **📝 Document**: Update relevant documentation files
6. **🚀 Submit**: Push branch and open a Pull Request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed development workflow and coding standards.

---

## 📞 **Support & Community**

### **📖 Getting Help**
- **Setup Issues**: See [Installation Guide](./docs/installation/INSTALLATION.md)
- **Feature Questions**: Check [Features Documentation](./docs/features/FEATURES.md)
- **API Help**: Reference [API Documentation](./docs/api/API-Reference.md)
- **System Status**: Monitor [Operational Metrics](./docs/system/SYSTEM-STATUS.md)

### **🐛 Issues & Feedback**
- **Bug Reports**: [GitHub Issues](https://github.com/yourusername/securenet/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/yourusername/securenet/discussions)
- **Security Issues**: Email security@securenet.ai

### **💬 Community**
- **Discussions**: [GitHub Discussions](https://github.com/pmvita/securenet/discussions)
- **Updates**: Follow development in [Roadmap](./docs/project/TODO.md)
- **Documentation**: Contribute to [docs improvement](./CONTRIBUTING.md)

---

## 📄 **License**

**Copyright (c) 2025 Pierre Mvita. All Rights Reserved.**

This software is proprietary and confidential. See the [LICENSE.txt](./LICENSE.txt) file for complete terms and conditions.

---

<div align="center">

**🛡️ SecureNet** — *AI-Powered Network Security Monitoring & Management*

Built for cybersecurity professionals, SOC teams, and enterprise security operations

---

**Pierre Mvita** • [LinkedIn](https://www.linkedin.com/in/pierre-mvita/) • [SecureNet.ai](https://securenet.ai)

*Transforming cybersecurity through artificial intelligence*

</div>

## 🚀 Development Roadmap

### ✅ Phase 1: Core Infrastructure - **COMPLETE**
- [x] Backend API with FastAPI
- [x] Database layer (SQLite for development, PostgreSQL for enterprise)
- [x] Authentication system (JWT)
- [x] Basic network scanning capabilities
- [x] Security vulnerability detection
- [x] Real-time logging system

### ✅ Phase 2: Frontend Integration - **COMPLETE**
- [x] React frontend with TypeScript
- [x] Real-time dashboard with live data
- [x] Network device management
- [x] Security alerts and monitoring
- [x] User authentication and authorization
- [x] Responsive design with dark theme

### ✅ 🏢 Phase 3: Enterprise Components - **COMPLETE**
- [x] **Interactive Network Topology** - ReactFlow-based network visualization
  - [x] Dashboard Page: Main enterprise network visualization
  - [x] Network Page: Full-featured network topology with threat detection
- [x] **Enterprise Data Management** - AG Grid for advanced security event management
  - [x] Dashboard Page: Enterprise security events overview
  - [x] Security Page: Full-featured security events grid
  - [x] Anomalies Page: Enterprise anomaly events management
- [x] **Custom Node Components** - Device, Threat, Server, Security nodes
- [x] **Real-time Updates** - Live network topology and event streaming
- [x] **Professional UI/UX** - Consistent dark theme across all components
- [x] **Export Capabilities** - CSV export for compliance reporting

## 🔒 **Compliance & Security Frameworks**

SecureNet maintains adherence to industry-leading security and compliance standards:

• **SOC 2 Type II** — Audit readiness in progress, target Q3 2025 certification with independent assessment
• **ISO/IEC 27001** — Information security management controls implemented for production environments
• **GDPR / CCPA** — Multi-tenant data isolation, privacy-by-design architecture, and comprehensive data protection tools
• **OWASP / NIST** — Secure coding practices following OWASP Top 10 and NIST Cybersecurity Framework with integrated penetration testing
• **Audit Log Compliance** — HIPAA, NIST SP 800-53, and FISMA-compliant audit trails with tamper-evident logging
• **FedRAMP Ready** — Cloud security assessment and authorization framework preparation for government cloud deployments
• **PCI DSS** — Payment card data security standards for billing and subscription management components

**Compliance Documentation**: Complete security control matrices, risk assessments, and audit preparation materials available in [`docs/compliance/`](./docs/compliance/).

## 👥 **Project Governance**

### **Ownership Structure**
- **Founder & CEO**: Pierre Mvita (60% equity via SecureNet Holdings)
- **Corporate Structure**: Proprietary software owned by SecureNet Holdings with comprehensive IP portfolio

### **Development Entities**
- **SecureNet Labs** — Core platform development and AI/ML research
- **SecureNet Reserve** — Enterprise security consulting and implementation services  
- **SecureNet Real Estate** — Secure facility management and SCIF-certified hosting operations

### **Licensing & Intellectual Property**
- **Proprietary License**: All rights reserved, confidential and proprietary software
- **Enterprise Licensing**: Available for Fortune 500 and government contracts
- **Technology Transfer**: Available for qualified defense and intelligence partnerships
- **Patent Portfolio**: AI threat detection algorithms and security automation processes

### **Quality Assurance & Certifications**
- **ISO 9001** quality management system implementation
- **CMMI Level 3** process maturity for government contracts
- **Security clearance** eligible development team for classified projects
