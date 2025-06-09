# 🔐 SecureNet

[![Python Version](https://img.shields.io/badge/python-3.8%2B-blue.svg)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE.txt)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.95.1-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)](tests/)
[![Security](https://img.shields.io/badge/security-enhanced-blue.svg)](SECURITY.md)
[![Status](https://img.shields.io/badge/status-active-success.svg)]()

> AI-powered network security monitoring and management system with real-time threat detection, network health monitoring, and comprehensive security management.

## 📌 Quick Links

- [Features](#-features)
- [Getting Started](#-getting-started)
- [Roadmap & TODO](#-roadmap--todo)
- [Project Structure](#-project-structure)
- [Documentation](#-documentation)
- [Frontend Architecture](#-frontend-architecture)
- [Screenshots](#-screenshots)
- [API Reference](#-api-reference)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [Security](#-security--compliance)
- [License](#-license)

## ✨ Features

### Core Capabilities
- 🔍 **Real-time Security Monitoring**
  - ML-based threat detection using scikit-learn
  - Network health monitoring and scoring
  - Real-time security metrics via WebSocket
  - Asset protection status tracking
  - Vulnerability assessment
  - Patch status monitoring
  - Security incident tracking
  - Live threat feed with WebSocket updates
  - Severity-based threat categorization
  - Enhanced anomaly visualization with:
    - Interactive timeline charts
    - Severity distribution analysis
    - Real-time anomaly updates via WebSocket
    - Advanced filtering and search
    - Detailed anomaly inspection
    - Export capabilities
    - Trend analysis and statistics
  - **Advanced Security Scanning**
    - Real-time security scan management via WebSocket
    - Multiple scan types:
      - Full system scans
      - Vulnerability scans
      - Compliance checks
      - Custom scans
    - Scan scheduling with datetime support
    - Real-time scan progress monitoring
    - Detailed findings management
    - Severity-based finding categorization
    - Finding status tracking
    - Export capabilities for scan results
    - WebSocket-based real-time updates
    - Interactive scan dashboard with charts
    - Scan history and statistics

- 📊 **Professional Security Operations Center (SOC) Dashboard**
  - **Real-time Security Overview**:
    - Comprehensive security status with 6-panel professional metrics display
    - Active threats monitoring with severity-based categorization
    - Live anomaly detection with real-time ML insights
    - Network devices status with health monitoring
    - Active connections tracking with protocol analysis
    - System health monitoring with performance metrics
    - Log events analysis with real-time streaming
  - **Enterprise-Grade Visualizations**:
    - Professional metrics cards with gradient-based design system
    - Real-time security alerts with color-coded severity indicators
    - Critical logs monitoring with expandable detailed views
    - System performance tracking with interactive charts
    - Recent activity timeline with security event correlation
    - Network traffic analysis with live data streaming
  - **Advanced Data Management**:
    - Security score tracking with trend analysis
    - Asset protection status with comprehensive monitoring
    - Maintenance scheduling with automated workflows
    - Report generation with customizable templates
    - Real-time data updates via WebSocket connections
    - Dynamic dashboard configuration with user preferences
  - **Professional UI/UX**:
    - Modern React-based interface with TypeScript
    - Consistent design language across all security management interfaces
    - Responsive design optimized for security operations
    - Professional loading states and transition animations
    - Enhanced error handling and user feedback systems

- 🌐 **Advanced Network Management**
  - **Live Network Traffic Monitoring** (Wireshark-style interface):
    - Real-time packet-level analysis with live data streaming
    - Comprehensive traffic logs with source/destination IPs, ports, protocols, and packet sizes
    - Advanced filtering by protocol (HTTP/HTTPS/TCP/UDP/FTP/SSH/DNS), security status, and applications
    - Traffic statistics dashboard with real-time counters (total, inbound, outbound, blocked, flagged packets)
    - Play/pause traffic monitoring controls with configurable refresh intervals
    - Professional traffic visualization with color-coded protocols and status indicators
    - Geographic tracking with country code identification
    - Application-level traffic analysis and categorization
  - **Professional Device Management**:
    - Network device discovery and monitoring with enhanced status tracking
    - Real-time device health monitoring with professional status indicators
    - Device performance metrics with latency and bandwidth tracking
    - Interactive device details with comprehensive technical information
  - **Enterprise Connection Management**:
    - Connection tracking and management with real-time state updates
    - Professional connection analysis with protocol distribution
    - Automated threat response and connection blocking capabilities
    - Network scan scheduling and maintenance window management
    - Connection history and trend analysis with data export capabilities
  - **Enhanced Network Visualization**:
    - Interactive network map with physical/logical views
    - Real-time device status monitoring with color-coded indicators
    - Professional metrics cards with gradient-based design
    - Network topology visualization with device health monitoring
    - Performance trend tracking with enterprise-grade charts
  - **Cross-Platform Compatibility**:
    - macOS-compatible network monitoring with native `netstat` integration
    - Enhanced permission handling and improved error reporting
    - Cross-platform compatibility with real-time connection state updates
    - Detailed protocol information and connection history tracking

- 📝 **Advanced Log Management**
  - Multiple log source types:
    - Syslog (UDP/TCP)
    - File monitoring with pattern matching
    - API endpoints with authentication
    - Database queries with polling
  - Flexible log format support:
    - Auto-detect
    - JSON
    - Syslog
    - CSV
    - Custom format patterns
  - Real-time log streaming with WebSocket
  - Interactive log feed with:
    - Color-coded log levels
    - Expandable log entries
    - Real-time filtering
    - Pause/Resume functionality
    - Clear feed option
    - Advanced search capabilities:
      - Full-text search
      - Regular expression support
      - Field-specific filtering
      - Time-based filtering
      - Log level filtering
      - Source-based filtering
    - Log analysis features:
      - Log aggregation
      - Pattern detection
      - Trend analysis
      - Statistical summaries
      - Custom visualization
    - Export options:
      - CSV format
      - JSON format
      - PDF reports
      - Custom templates
  - Log source management:
    - Add/Edit/Delete sources
    - Enable/Disable sources
    - Status monitoring
    - Log rate tracking
    - Tag-based organization
    - Source health metrics
    - Configuration validation
  - SQLite database with:
    - Efficient log storage
    - Optimized indexes
    - Log statistics
    - Source configuration
    - Enhanced query performance
    - Automatic maintenance

- 🔔 **Alerting System**
  - Real-time notification center
  - Unread notification counter
  - Notification history
  - Slack integration for instant notifications
  - Email alerts for critical events
  - Configurable alert thresholds
  - Custom alert templates
  - Interactive notification management

### Planned Features
- 🤖 GPT-based security analysis and recommendations
- ☁️ Cloud service integration (AWS, Azure, GCP)
- 🐳 Docker containerization
- 🔄 CI/CD pipeline
- 📈 Advanced analytics dashboard
- 🔐 Zero-trust security model implementation

## 📋 Roadmap & TODO

For detailed information about the project's roadmap, current progress, and upcoming tasks, please see our [TODO.md](TODO.md) file.

## Recent Updates

#### Security Scanning Implementation
- Added comprehensive security scanning system
- Implemented real-time scan management interface
- Added support for multiple scan types (full, vulnerability, compliance, custom)
- Integrated scan scheduling with cron support
- Added real-time scan progress monitoring via WebSocket
- Implemented findings management with severity tracking
- Added export capabilities for scan results
- Enhanced security dashboard with scan statistics
- Improved error handling and reporting for scans
- Added interactive scan details view
- Implemented finding status management
- Added scan scheduling interface

#### Network Monitoring Improvements
- Enhanced macOS compatibility with native `netstat` integration
- Improved permission handling for network connection access
- Better error reporting and logging for network operations
- Cross-platform compatibility improvements
- Real-time connection state tracking
- Detailed protocol information display
- Connection history and trend analysis

#### Enterprise UI Transformation (2024)
- **Complete transformation to professional Security Operations Center (SOC) interface**
- **Industry-standard UI/UX design** comparable to enterprise security platforms
- Refactored frontend from FastAPI + Jinja2 templates to React + TypeScript with modern tooling:
  - Vite for fast development and building
  - TypeScript for type safety and robust development
  - TailwindCSS with custom gradient-based design system
  - React Query for efficient data fetching and state management
  - React Router for seamless navigation
  - Jest and Testing Library for comprehensive testing
  - Storybook for component development and documentation

#### Professional Security Management Interface
- **Security Operations Center (SOC) Dashboard**:
  - Real-time security status overview with professional metrics cards
  - 6-panel metrics display (Active Threats, Anomalies, Network Devices, Connections, System Health, Log Events)
  - Live security alerts and critical logs monitoring
  - System performance tracking with enterprise-grade visualizations
  - Recent activity timeline with security event correlation

- **Enterprise Network Monitoring**:
  - **Live Network Traffic Analysis** - Packet-level monitoring with Wireshark-style interface
  - Real-time traffic logs with source/destination IPs, ports, protocols, and packet sizes
  - Advanced filtering by protocol (HTTP/HTTPS/TCP/UDP/FTP/SSH/DNS), security status, and applications
  - Traffic statistics dashboard with real-time counters (total, inbound, outbound, blocked, flagged packets)
  - Play/pause traffic monitoring controls with live data streaming
  - Professional device management with enhanced status indicators
  - Network topology visualization with device health monitoring

- **Advanced Anomaly Detection System**:
  - AI-powered anomaly detection with ML insights and confidence scoring
  - Enhanced investigation modal with pattern analysis and risk assessment
  - Comprehensive filtering by severity (Critical/High/Medium/Low), status, and anomaly type
  - Machine learning model performance metrics and accuracy tracking
  - False positive management and anomaly resolution workflows
  - Detailed anomaly inspection with technical metadata and ML insights

- **Professional Log Management System**:
  - Enterprise-grade log viewer (ELK Stack/Splunk style interface)
  - Real-time log streaming with auto-refresh and monitoring controls
  - Advanced search and filtering with time-based queries
  - Professional log table with expandable entries and detailed views
  - Log statistics dashboard with comprehensive metrics tracking
  - Industry-standard log analysis and pattern detection

- **Enhanced Security Scanning Interface**:
  - Comprehensive security scan management with real-time progress monitoring
  - Professional findings management with severity-based categorization
  - Advanced scan configuration and scheduling capabilities
  - Detailed scan results with investigation workflows
  - Security compliance tracking and vulnerability assessment

#### Modern Development Infrastructure
- **Enhanced UI/UX Components**:
  - Headless UI components for accessible, professional interfaces
  - Heroicons for consistent iconography throughout the application
  - Advanced data visualization with Chart.js and custom components
  - Vis Network for interactive network topology visualization
  - Professional gradient-based design system with consistent color schemes
  - Enhanced typography and spacing systems for enterprise-grade appearance

- **Development Experience**:
  - Hot module replacement for rapid development cycles
  - Comprehensive TypeScript type checking for robust code quality
  - ESLint and Prettier for consistent code formatting and quality
  - Component-driven development with reusable design patterns
  - Comprehensive testing setup with unit and integration tests
  - Mock data development mode for frontend-only development

- **Enterprise Features**:
  - Responsive design optimized for desktop and mobile security operations
  - Real-time updates via WebSocket for live monitoring capabilities
  - Advanced data visualization with professional security metrics
  - Comprehensive error handling and user feedback systems
  - Professional loading states and transition animations
  - Consistent design language across all security management interfaces

#### Log Management Enhancements
- Advanced search capabilities with full-text and regex support
- Log aggregation and pattern detection
- Statistical analysis and trend visualization
- Multiple export formats (CSV, JSON, PDF)
- Enhanced source management with health metrics
- Improved database performance and maintenance
- Better error handling and reporting

#### UI/UX Improvements
- Modernized log viewer interface
- Advanced filtering and search options
- Interactive log analysis panels
- Real-time log statistics
- Export functionality
- Improved error messages and notifications
- Enhanced mobile responsiveness

## 🚀 Getting Started

### Prerequisites
- Python 3.8 or higher
- Node.js 18 or higher
- `pip` package manager
- `npm` package manager
- Virtual environment (recommended)
- SQLite3 (included with Python)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/pmvita/SecureNet.git
cd SecureNet
```

2. Set up Python virtual environment and install backend dependencies:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Install frontend dependencies:
```bash
cd frontend
npm install
cd ..
```

4. Initialize the database:
```bash
python scripts/init_db.py
```

5. Generate an API key:
```bash
python scripts/generate_api_key.py
```

### Running the Application

The application consists of two parts: the backend API server and the frontend development server.

#### Development Mode Options

The frontend supports two distinct development modes controlled by the `VITE_MOCK_DATA` environment variable:

**Option 1: Mock Data Mode (Recommended for Development)**
```bash
cd frontend
npm run dev          # Uses comprehensive mock data, no backend required
# OR
npm run dev:mock     # Same as above, explicit mock mode
```
- **Features**: Complete mock data simulation including live network traffic, real-time anomalies, security scans, and log streams
- **Benefits**: Fast development without backend dependencies, realistic data for UI testing
- **Use Case**: Frontend development, UI/UX testing, component development

**Option 2: Real API Mode**
```bash
# First, start the backend server (in one terminal):
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn app:app --reload

# Then start the frontend with real API calls (in another terminal):
cd frontend
npm run dev:api      # Connects to real backend API
```
- **Features**: Live data from backend services, real network monitoring, actual security scans
- **Benefits**: Full functionality testing, real data validation
- **Use Case**: Integration testing, backend development, production-like testing

#### Environment Configuration
The development mode is controlled by the `VITE_MOCK_DATA` environment variable:
- `VITE_MOCK_DATA=true` - Enables mock data mode with simulated real-time data
- `VITE_MOCK_DATA=false` - Connects to real backend APIs for live data

#### Quick Start (Mock Mode)
For quick development and testing without setting up the backend:
```bash
cd frontend
npm install
npm run dev
```
This will start the frontend with mock data at `http://localhost:5173`

#### Full Setup (Real API Mode)
For full functionality with real data:

1. Start the backend server (in one terminal):
```bash
# Make sure you're in the project root and virtual environment is activated
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn app:app --host 0.0.0.0 --port 8000
# Or
uvicorn app:app --reload
```

2. Start the frontend with real API calls (in another terminal):
```bash
cd frontend
npm run dev:api
```

The application will be available at:
- Backend API: `http://localhost:8000`
- Frontend UI: `http://localhost:5173`
- Username: admin
- Password: admin123
- Email: admin@example.com

### Environment Variables
Create a `.env` file in the project root based on `.env.example`:
```env
SECRET_KEY=your-secret-key
API_KEY=your-api-key
DATABASE_URL=sqlite:///data/securenet.db
LOG_LEVEL=INFO
```

### Development

#### Backend Development
- The backend is built with FastAPI and runs on port 8000
- API documentation is available at `http://localhost:8000/docs`
- WebSocket endpoints are available at `ws://localhost:8000/ws/*`

#### Frontend Development
- The frontend is built with React + TypeScript and runs on port 5173
- Uses Vite for fast development and building
- Includes hot module replacement for quick development
- TypeScript for type safety
- TailwindCSS for styling
- React Query for data fetching
- React Router for navigation
- Jest and Testing Library for testing
- Storybook for component development

To run frontend tests:
```bash
cd frontend
npm test
```

To run Storybook:
```bash
cd frontend
npm run storybook
```

## 📸 Screenshots

### Login
![Login](screenshots/login.png)
*Login page with username and password fields*

### Dashboard
![Dashboard](screenshots/dashboard.png)
*Comprehensive dashboard featuring:
- Real-time security metrics and statistics
- Network health visualization
- Active threat monitoring
- Asset protection status
- Security score tracking
- Service status indicators
- Quick action buttons
- Real-time data updates via WebSocket*

### Log Management
![Log Management](screenshots/log.png)
*Advanced log management interface featuring:
- Real-time log streaming with WebSocket support
- Color-coded log levels for easy identification
- Expandable log entries for detailed inspection
- Advanced filtering and search capabilities
- Log source management and monitoring
- Export functionality for analysis
- Log statistics and trend visualization
- Source health metrics and status tracking*

### Security Center
![Security](screenshots/security.png)
*Enhanced security management center featuring:
- Real-time security scan management
- Multiple scan type support (full, vulnerability, compliance, custom)
- Active scan monitoring with progress tracking
- Scan scheduling and automation
- Findings management with severity tracking
- Interactive scan dashboard
- Export capabilities for scan results
- Real-time WebSocket updates
- Scan history and statistics
- Finding status management
- Severity-based categorization
- Detailed scan inspection*

### Anomalies View
![Anomalies View](screenshots/anomalies.png)
*Advanced anomaly detection dashboard featuring:
- Real-time anomaly statistics with trend indicators
- Interactive timeline visualization
- Severity-based distribution analysis
- Advanced filtering and search capabilities
- Detailed anomaly inspection modal
- Export functionality for analysis
- ML-based threat detection metrics
- Pattern recognition visualization
- Anomaly correlation analysis
- Real-time WebSocket updates*

### Network Monitoring 
![Network Monitoring](screenshots/Network-monitoring.png)
*Comprehensive network monitoring center featuring:
- Real-time device and connection statistics
- Interactive network traffic visualization
- Protocol distribution analysis
- Dynamic network map with device discovery
- Connection filtering and management
- Device details inspection
- Network data export capabilities
- Traffic pattern analysis
- Connection history tracking
- Native macOS network monitoring
- Real-time connection state updates
- Performance trend tracking*

### Settings
![Settings](screenshots/settings.png)
*Configuration management interface featuring:
- Log source configuration and management
- Notification settings and preferences
- API key management
- Security scan configuration
- **Advanced Network Monitoring Configuration**:
  - Network interface selection (auto-detect, ethernet, WiFi, all interfaces)
  - IP range monitoring with CIDR notation support
  - Device discovery methods (ping+ARP, ping-only, ARP-only, passive)
  - Traffic analysis and packet capture settings
  - DNS monitoring and port scan detection
  - Bandwidth threshold alerting
  - Packet capture filtering with BPF expressions
  - Maximum device tracking limits
- Alert threshold configuration
- System preferences
- User management
- Export/Import settings
- Backup and restore options*

## 📚 Documentation

For detailed project documentation, see:
- [API Reference](API-Reference.md) - Complete API documentation with WebSocket endpoints
- [Frontend Architecture](FRONTEND-ARCHITECTURE.md) - Comprehensive frontend development guide
- [Contributing Guide](CONTRIBUTING.md) - Guidelines for contributors
- [TODO & Roadmap](TODO.md) - Project roadmap and current progress

## 🏗️ Frontend Architecture

The SecureNet frontend is a modern React-based Security Operations Center (SOC) interface built with enterprise-grade UI/UX design. For comprehensive information about the frontend architecture, development modes, design system, and component structure, see our [Frontend Architecture Guide](FRONTEND-ARCHITECTURE.md).

### Key Frontend Features:
- **Professional SOC Interface** - Enterprise-grade security management dashboard
- **Live Network Traffic Monitoring** - Wireshark-style packet analysis interface
- **Real-time Anomaly Detection** - AI-powered insights with ML visualization
- **Mock Data Development Mode** - Complete frontend development without backend dependencies
- **TypeScript & Modern Tooling** - Type-safe development with Vite, React Query, and comprehensive testing

### Architecture

SecureNet follows a modular architecture:
- **Data Sources:** 
  - Syslog server (UDP/TCP)
  - File system monitoring
  - API endpoints
  - Database queries
  - Network devices
  - Security scanners
- **Data Pipeline:** 
  - Log ingestion → Format detection → Processing → Storage
  - Network monitoring → Traffic analysis → Health scoring
  - Security scanning → Threat detection → Vulnerability assessment
  - Real-time WebSocket streaming
  - Notification broadcasting
- **Security Management:**
  - Network health monitoring
  - Threat detection and tracking
  - Vulnerability assessment
  - Patch management
  - Security scoring
  - Maintenance scheduling
- **Log Management:**
  - Source configuration and monitoring
  - Format detection and parsing
  - Real-time streaming
  - Efficient storage
  - Statistics tracking
- **AI Engine:** 
  - Isolation Forest (scikit-learn)
  - Real-time anomaly scoring
  - Network health analysis
  - Security risk assessment
- **Alerting:** 
  - Real-time notification center
  - Configurable notification system
- **Dashboard:** 
  - FastAPI + Jinja2 templates
  - WebSocket for real-time updates
  - Bootstrap for modern UI
  - Interactive visualizations
- **Database:** 
  - SQLite with optimized schema
  - Log source management
  - Network device tracking
  - Security metrics storage
  - Asset management
  - Statistics and monitoring
- **UI Components:**
  - Modern, responsive dashboard with real-time updates
  - Interactive visualizations using Chart.js
  - Dynamic network mapping with vis.js
  - Real-time WebSocket notifications
  - Advanced filtering and search capabilities
  - Modal-based detailed views
  - Export functionality for data analysis
  - Consistent design language across all screens

### API Reference

For detailed API documentation, including all endpoints, authentication, WebSocket connections, and code examples, please see our [API Reference](API-Reference.md).

## 🧪 Testing

### Running Tests

1. Activate virtual environment:
```bash
source venv/bin/activate
```

2. Run test suite:
```bash
# All tests
python -m pytest -v

# Specific test file
python -m pytest tests/test_dashboard.py -v
```

### Test Coverage

- `test_ingestion.py`: Log ingestion and storage
- `test_detect_anomalies.py`: ML model and scoring
- `test_dashboard.py`: UI rendering and data display
- WebSocket connection testing
- Real-time log streaming
- Notification system

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 🔒 Security & Compliance

- Encrypted log handling
- JWT-based API authentication (planned)
- Role-based access control
- Audit logging
- Secure WebSocket connections
- Environment variable management

## 📝 License

Distributed under the MIT License. See [LICENSE.txt](LICENSE.txt) for details.

## 📬 Contact

**Pierre Mvita**  
📧 [petermvita@hotmail.com](mailto:petermvita@hotmail.com)  
🔗 [GitHub](https://github.com/pmvita)  
🔗 [LinkedIn](https://www.linkedin.com/in/pierre-mvita)

---

<div align="center">
Made by Pierre Mvita
</div>

## 📁 Project Structure

```
SecureNet/
├── app.py                 # Main FastAPI application
├── database.py            # Database models and operations
├── requirements.txt       # Python dependencies
├── LICENSE.txt           # MIT License
├── README.md             # Project documentation
├── TODO.md               # Development roadmap
├── CONTRIBUTING.md       # Contribution guidelines
├── .gitignore            # Git ignore rules
│
├── frontend/             # React TypeScript frontend
│   ├── src/              # Source code
│   │   ├── api/          # API client and endpoints
│   │   ├── components/   # Reusable UI components
│   │   ├── features/     # Feature-specific components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utility libraries
│   │   ├── pages/        # Page components
│   │   ├── types/        # TypeScript type definitions
│   │   ├── utils/        # Helper functions
│   │   ├── App.tsx       # Main application component
│   │   ├── main.tsx      # Application entry point
│   │   └── index.css     # Global styles
│   │
│   ├── .storybook/       # Storybook configuration
│   ├── __mocks__/        # Test mocks
│   ├── node_modules/     # Node.js dependencies
│   ├── package.json      # Node.js dependencies and scripts
│   ├── tsconfig.json     # TypeScript configuration
│   ├── vite.config.ts    # Vite configuration
│   └── tailwind.config.js # Tailwind CSS configuration
│
├── src/                  # Python source code
│   ├── security.py       # Security utilities
│   ├── detect_anomalies.py # Anomaly detection logic
│   ├── ingest_logs.py    # Log ingestion service
│   └── alert.py          # Alert handling
│
├── tests/                # Test suite
│   ├── test_dashboard.py # Dashboard tests
│   ├── test_ingestion.py # Log ingestion tests
│   ├── test_detect_anomalies.py # Anomaly detection tests
│   └── smoke_slack.py    # Slack integration tests
│
├── templates/            # HTML templates
├── static/              # Static assets
├── logs/                # Application logs
├── data/                # Data storage
├── config/              # Configuration files
├── models/              # Data models
├── scripts/             # Utility scripts
└── screenshots/         # Documentation screenshots
```

### Key Components

- **Backend (`app.py`, `database.py`)**: FastAPI application handling API endpoints, WebSocket connections, and database operations
- **Frontend (`frontend/`)**: React TypeScript application with modern tooling (Vite, Tailwind CSS)
- **Core Services (`src/`)**: Python modules for security, anomaly detection, and log ingestion
- **Testing (`tests/`)**: Comprehensive test suite for backend functionality
- **Documentation**: README, CONTRIBUTING, and TODO files for project documentation
- **Configuration**: Environment and application configuration files
- **Data Storage**: SQLite database and log files
- **Static Assets**: Templates, static files, and screenshots

## 🔌 API Reference

### Authentication
All API endpoints require authentication using an API key. Include the API key in the request header:
```
X-API-Key: your-api-key
```

### WebSocket Endpoints
- `/ws/notifications` - Real-time notifications
- `/ws/security` - Security scan updates
- `/ws/logs` - Live log streaming

### REST Endpoints
- `GET /api/stats/overview` - System overview statistics
- `GET /api/logs` - Log retrieval with filtering
- `GET /api/network/traffic` - Network traffic data
- `GET /api/security/score` - Security score
- `GET /api/network/overview` - Network overview
- `GET /api/network/protocols` - Protocol statistics
- `GET /api/network/devices` - Device information
- `GET /api/network/connections` - Active connections
- `GET /api/settings` - System settings
- `GET /api/anomalies` - Anomaly detection results

### Security Endpoints
- `GET /api/security/scans` - List security scans
- `POST /api/security/scan` - Start new scan
- `GET /api/security/scan/{id}` - Get scan details
- `POST /api/security/scan/{id}/stop` - Stop running scan
- `GET /api/security/scan/{id}/findings` - Get scan findings
- `PUT /api/security/scan/{id}/findings/{finding_id}` - Update finding status

