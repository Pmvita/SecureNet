# Source Code Directory

> **SecureNet Application Source Code Organization**  
> *Main application implementations and core business logic*

---

## 📋 **Overview**

This directory contains the core application source code for SecureNet, organized into logical subdirectories for better maintainability and development workflow.

---

## 📁 **Directory Structure**

```
src/
├── apps/                    # 🚀 Main application implementations
│   ├── app.py                   # Primary FastAPI application (119KB)
│   ├── app.py.bak              # Backup of previous app version (94KB)
│   ├── app_enhanced.py         # Enhanced application features (13KB)
│   ├── enterprise_app.py       # Enterprise-specific application (22KB)
│   └── setup_enhanced.py       # Enhanced setup and configuration (15KB)
│
└── README.md               # 📚 This documentation
```

---

## 🚀 **Application Implementations**

### **Primary Application** (`app.py`)
- **Size**: 119KB, 3,249 lines - The main SecureNet application
- **Framework**: FastAPI with async/await support
- **Features**:
  - Complete REST API implementation
  - Authentication and authorization
  - Real-time WebSocket connections
  - Comprehensive security monitoring
  - Multi-tenant organization support

### **Enterprise Application** (`enterprise_app.py`)
- **Size**: 22KB, 690 lines - Enterprise-specific features
- **Purpose**: Advanced enterprise functionality and integrations
- **Features**:
  - Enterprise SSO integration
  - Advanced compliance reporting
  - Multi-organization management
  - Enterprise-grade security features

### **Enhanced Application** (`app_enhanced.py`)
- **Size**: 13KB, 456 lines - Extended functionality
- **Purpose**: Additional features and enhancements
- **Features**:
  - Performance optimizations
  - Advanced monitoring capabilities
  - Extended API endpoints
  - Enhanced error handling

### **Enhanced Setup** (`setup_enhanced.py`)
- **Size**: 15KB, 559 lines - Advanced configuration management
- **Purpose**: Sophisticated setup and configuration handling
- **Features**:
  - Environment-specific configuration
  - Database initialization and migration
  - Service discovery and registration
  - Health check implementation

---

## 🏗️ **Application Architecture**

### **FastAPI Framework**
```python
# Main application structure
app = FastAPI(
    title="SecureNet Enterprise Security Platform",
    description="AI-powered cybersecurity monitoring and management",
    version="1.5.0",
    docs_url="/docs",
    redoc_url="/redoc"
)
```

### **Core Components**
- **API Routing**: RESTful endpoint organization
- **Authentication**: JWT-based authentication system
- **Database Integration**: Multi-database support (SQLite/PostgreSQL)
- **WebSocket Support**: Real-time communication capabilities
- **Middleware Stack**: Security, logging, and performance middleware

### **Security Features**
- **Role-Based Access Control**: Comprehensive RBAC implementation
- **Multi-Factor Authentication**: TOTP and SMS-based MFA
- **Audit Logging**: Complete audit trail for compliance
- **Rate Limiting**: API rate limiting and DDoS protection

---

## 🔧 **Application Configuration**

### **Environment-Based Configuration**
```python
# Configuration management
class AppConfig:
    environment: str = "development"
    database_url: str = "sqlite:///data/securenet.db"
    redis_url: str = "redis://localhost:6379"
    secret_key: str = "your-secret-key"
    debug: bool = True
```

### **Database Configuration**
- **Development**: SQLite for rapid development
- **Production**: PostgreSQL for enterprise scalability
- **Testing**: In-memory SQLite for test isolation
- **Connection Pooling**: Optimized connection management

### **Security Configuration**
- **JWT Settings**: Token expiration and refresh policies
- **CORS Configuration**: Cross-origin request handling
- **Rate Limiting**: Request throttling and abuse prevention
- **Encryption**: Data encryption at rest and in transit

---

## 🚀 **Running Applications**

### **Development Mode**
```bash
# Start development server
python src/apps/app.py --dev

# Start with hot reload
uvicorn src.apps.app:app --reload --host 0.0.0.0 --port 8000

# Start enterprise application
python src/apps/enterprise_app.py --dev
```

### **Production Mode**
```bash
# Start production server
python src/apps/app.py --prod

# Start with gunicorn
gunicorn src.apps.app:app -w 4 -k uvicorn.workers.UvicornWorker

# Start enterprise production
python src/apps/enterprise_app.py --prod
```

### **Configuration Options**
```bash
# Custom configuration
python src/apps/app.py --config production --port 8000

# Database-specific startup
python src/apps/app.py --database postgresql

# Debug mode
python src/apps/app.py --debug --log-level debug
```

---

## 📊 **API Documentation**

### **Interactive Documentation**
- **Swagger UI**: Available at `/docs` when server is running
- **ReDoc**: Available at `/redoc` for alternative documentation view
- **OpenAPI Schema**: Auto-generated OpenAPI 3.0 specification
- **API Testing**: Built-in API testing interface

### **API Endpoints Overview**
```
/api/v1/
├── auth/           # Authentication and authorization
├── users/          # User management
├── organizations/  # Organization management
├── security/       # Security monitoring and events
├── network/        # Network device management
├── compliance/     # Compliance and reporting
├── admin/          # Administrative functions
└── health/         # Health checks and monitoring
```

---

## 🧪 **Testing and Development**

### **Testing Applications**
```bash
# Run application tests
python -m pytest tests/apps/

# Test specific application
python -m pytest tests/apps/test_main_app.py

# Integration testing
python -m pytest tests/integration/

# Performance testing
python tests/performance/load_test.py
```

### **Development Workflow**
```bash
# Install dependencies
pip install -r requirements.txt

# Set up development environment
python src/apps/setup_enhanced.py --dev

# Run linting
flake8 src/

# Format code
black src/
```

---

## 📈 **Performance and Monitoring**

### **Performance Features**
- **Async/Await**: Full asynchronous request handling
- **Connection Pooling**: Efficient database connection management
- **Caching**: Redis-based response and query caching
- **Background Tasks**: Celery integration for background processing

### **Monitoring Integration**
- **Health Checks**: Comprehensive health monitoring endpoints
- **Metrics Collection**: Prometheus metrics integration
- **Logging**: Structured logging with correlation IDs
- **Alerting**: Integration with monitoring and alerting systems

### **Performance Metrics**
- **Response Time**: Average API response times
- **Throughput**: Requests per second handling
- **Error Rate**: Application error tracking
- **Resource Usage**: CPU, memory, and database utilization

---

## 🔐 **Security Implementation**

### **Authentication System**
```python
# JWT-based authentication
@app.middleware("http")
async def authenticate_request(request: Request, call_next):
    # Token validation and user context setting
    token = extract_jwt_token(request)
    user = await validate_token(token)
    request.state.user = user
    return await call_next(request)
```

### **Authorization Framework**
- **Role-Based Access**: Hierarchical role system
- **Permission Checking**: Granular permission validation
- **Resource Access**: Context-aware resource authorization
- **Audit Logging**: Complete access audit trail

---

## 🚀 **Deployment and Production**

### **Production Deployment**
```bash
# Build production image
docker build -t securenet-app:latest .

# Deploy to production
kubectl apply -f k8s/app-deployment.yaml

# Health check
curl http://production-url/health
```

### **Environment Variables**
```bash
# Required environment variables
export DATABASE_URL="postgresql://user:pass@host:5432/db"
export REDIS_URL="redis://redis:6379"
export SECRET_KEY="your-production-secret"
export ENVIRONMENT="production"
```

---

## 📚 **Related Documentation**

| Resource | Description | Link |
|----------|-------------|------|
| **API Documentation** | Complete API reference | [🔧 API Docs](../docs/api/API-DOCUMENTATION.md) |
| **Deployment Guide** | Production deployment procedures | [🚀 Deployment](../docs/deployment/README.md) |
| **Security Guide** | Security implementation details | [🔒 Security](../docs/security/README.md) |
| **Performance Guide** | Performance optimization guide | [⚡ Performance](../docs/performance/README.md) |

---

## 🛠️ **Development Guidelines**

### **Code Standards**
- **PEP 8**: Python code style compliance
- **Type Hints**: Full type annotation coverage
- **Async/Await**: Use async patterns for I/O operations
- **Error Handling**: Comprehensive exception handling

### **Application Design Principles**
- **Separation of Concerns**: Clear separation between layers
- **Dependency Injection**: Use dependency injection for testability
- **Configuration Management**: Environment-based configuration
- **Logging**: Structured logging with appropriate levels

### **Security Best Practices**
- **Input Validation**: Validate all user inputs
- **SQL Injection Prevention**: Use parameterized queries
- **Authentication**: Implement proper authentication flows
- **Authorization**: Enforce proper access controls

---

*The src directory contains the core application logic that powers SecureNet's enterprise security platform.* 