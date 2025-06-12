# SecureNet API Documentation

## Overview

SecureNet provides a comprehensive REST API for cybersecurity monitoring, threat detection, and network management. The API supports multi-tenant SaaS architecture with organization-scoped access control.

## Authentication

All API endpoints require authentication using either:
- **Bearer Token**: JWT token obtained from `/api/auth/login`
- **API Key**: Organization-specific API key in header `X-API-Key`

### Development Mode
In development mode (`DEV_MODE=true`), authentication is bypassed for testing purposes.

---

## 🔐 Authentication Endpoints

### POST /api/auth/login
Authenticate user and obtain JWT token.

**Request Body:**
```json
{
  "username": "admin",
  "password": "password"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@securenet.local",
      "role": "admin",
      "last_login": "2024-01-01T12:00:00Z"
    }
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### GET /api/auth/me
Get current authenticated user information.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@securenet.local",
    "role": "admin",
    "last_login": "2024-01-01T12:00:00Z"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### POST /api/auth/logout
Logout current user.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "status": "success",
  "data": {
    "message": "Successfully logged out"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## 💳 Billing & Subscription Endpoints

### GET /api/billing/plans
Get available subscription plans.

**Headers:** `X-API-Key: <api-key>`

**Response:**
```json
{
  "status": "success",
  "data": {
    "plans": [
      {
        "id": "free",
        "name": "Free",
        "price": 0,
        "currency": "USD",
        "billing_period": "month",
        "features": {
          "devices": 5,
          "scans_per_month": 10,
          "log_retention_days": 7,
          "email_alerts": true,
          "api_access": false,
          "ml_detection": false
        }
      },
      {
        "id": "pro",
        "name": "Pro",
        "price": 99,
        "currency": "USD",
        "billing_period": "month",
        "features": {
          "devices": 50,
          "scans_per_month": 500,
          "log_retention_days": 30,
          "email_alerts": true,
          "api_access": true,
          "ml_detection": true
        }
      },
      {
        "id": "enterprise",
        "name": "Enterprise",
        "price": 499,
        "currency": "USD",
        "billing_period": "month",
        "features": {
          "devices": 1000,
          "scans_per_month": 10000,
          "log_retention_days": 365,
          "compliance_reporting": true,
          "priority_support": true
        }
      }
    ]
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### GET /api/billing/usage
Get organization usage statistics and billing information.

**Headers:** `X-API-Key: <api-key>`

**Query Parameters:**
- `months` (optional): Number of months to retrieve (default: 12)

**Response:**
```json
{
  "status": "success",
  "data": {
    "current_plan": {
      "id": "pro",
      "name": "Pro",
      "price": 99,
      "device_limit": 50
    },
    "current_usage": {
      "devices": 23,
      "scans_this_month": 156,
      "logs_this_month": 45230,
      "api_requests_this_month": 1250
    },
    "usage_history": [
      {
        "month": "2024-01",
        "device_count": 23,
        "scan_count": 156,
        "log_count": 45230,
        "api_requests": 1250
      }
    ],
    "overage_charges": {
      "devices": 0,
      "scans": 0,
      "total": 0
    }
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### GET /api/billing/current-plan
Get current subscription plan details.

**Headers:** `X-API-Key: <api-key>`

**Response:**
```json
{
  "status": "success",
  "data": {
    "plan": {
      "id": "pro",
      "name": "Pro",
      "price": 99,
      "device_limit": 50
    },
    "usage": {
      "devices": 23,
      "scans_this_month": 156
    },
    "limits": {
      "devices_remaining": 27,
      "scans_remaining": 344
    }
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### POST /api/billing/upgrade
Upgrade subscription plan.

**Headers:** `X-API-Key: <api-key>`

**Request Body:**
```json
{
  "plan_id": "enterprise",
  "payment_method": "stripe_token_here"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "message": "Plan upgraded successfully",
    "new_plan": {
      "id": "enterprise",
      "name": "Enterprise",
      "price": 499,
      "device_limit": 1000
    },
    "effective_date": "2024-01-01T12:00:00Z"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### POST /api/billing/webhook/stripe
Stripe webhook handler for payment processing.

**Headers:** `Stripe-Signature: <signature>`

**Request Body:** Stripe webhook payload

### GET /api/billing/limits/check
Check if organization is within subscription limits.

**Headers:** `X-API-Key: <api-key>`

**Response:**
```json
{
  "status": "success",
  "data": {
    "within_limits": true,
    "limits": {
      "devices": {
        "current": 23,
        "limit": 50,
        "remaining": 27
      },
      "scans": {
        "current": 156,
        "limit": 500,
        "remaining": 344
      }
    },
    "warnings": []
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## 📊 Metrics & Analytics Endpoints

### GET /api/metrics/system
Get system performance metrics.

**Headers:** `X-API-Key: <api-key>`

**Response:**
```json
{
  "status": "success",
  "data": {
    "cpu": {
      "usage_percent": 45.2,
      "cores": 8,
      "load_average": [1.2, 1.5, 1.8]
    },
    "memory": {
      "total_gb": 16.0,
      "used_gb": 8.5,
      "available_gb": 7.5,
      "usage_percent": 53.1
    },
    "disk": {
      "total_gb": 500.0,
      "used_gb": 125.3,
      "free_gb": 374.7,
      "usage_percent": 25.1
    },
    "network": {
      "connections_active": 45,
      "bytes_sent": 1024000,
      "bytes_received": 2048000
    },
    "uptime_seconds": 86400,
    "timestamp": "2024-01-01T12:00:00Z"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### GET /api/metrics/organization
Get organization-specific metrics.

**Headers:** `X-API-Key: <api-key>`

**Response:**
```json
{
  "status": "success",
  "data": {
    "devices": {
      "total": 23,
      "online": 20,
      "offline": 3,
      "critical": 1
    },
    "scans": {
      "total_this_month": 156,
      "completed": 150,
      "failed": 6,
      "in_progress": 0
    },
    "anomalies": {
      "total": 45,
      "high_severity": 5,
      "medium_severity": 15,
      "low_severity": 25,
      "resolved": 30,
      "open": 15
    },
    "logs": {
      "total_this_month": 45230,
      "error_count": 123,
      "warning_count": 456,
      "info_count": 44651
    },
    "security_score": 85
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### GET /api/metrics/security
Get security-focused metrics.

**Headers:** `X-API-Key: <api-key>`

**Response:**
```json
{
  "status": "success",
  "data": {
    "vulnerabilities": {
      "critical": 2,
      "high": 8,
      "medium": 15,
      "low": 23,
      "total": 48
    },
    "threats": {
      "blocked": 156,
      "detected": 23,
      "resolved": 145
    },
    "compliance": {
      "score": 92,
      "checks_passed": 45,
      "checks_failed": 3,
      "total_checks": 48
    },
    "security_events": {
      "last_24h": 23,
      "last_7d": 156,
      "last_30d": 678
    }
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### GET /api/metrics/prometheus
Export metrics in Prometheus format.

**Headers:** `X-API-Key: <api-key>`

**Response:** (text/plain)
```
# HELP securenet_cpu_usage_percent CPU usage percentage
# TYPE securenet_cpu_usage_percent gauge
securenet_cpu_usage_percent{organization_id="org_123"} 45.2

# HELP securenet_memory_usage_percent Memory usage percentage
# TYPE securenet_memory_usage_percent gauge
securenet_memory_usage_percent{organization_id="org_123"} 53.1

# HELP securenet_devices_total Total number of devices
# TYPE securenet_devices_total gauge
securenet_devices_total{organization_id="org_123",status="online"} 20
securenet_devices_total{organization_id="org_123",status="offline"} 3
```

### GET /api/metrics/dashboard
Get comprehensive dashboard metrics.

**Headers:** `X-API-Key: <api-key>`

**Response:**
```json
{
  "status": "success",
  "data": {
    "system": {
      "cpu_usage": 45.2,
      "memory_usage": 53.1,
      "disk_usage": 25.1,
      "uptime": 86400
    },
    "organization": {
      "devices_total": 23,
      "devices_online": 20,
      "scans_this_month": 156,
      "anomalies_open": 15,
      "security_score": 85
    },
    "security": {
      "vulnerabilities_critical": 2,
      "threats_blocked": 156,
      "compliance_score": 92
    },
    "recent_activity": [
      {
        "timestamp": "2024-01-01T11:55:00Z",
        "type": "scan_completed",
        "message": "Network scan completed successfully"
      }
    ]
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### GET /api/metrics/health
Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "version": "1.0.0",
  "uptime": 86400,
  "database": "connected",
  "services": {
    "log_ingestion": "running",
    "anomaly_detection": "running",
    "network_scanner": "running"
  }
}
```

### GET /api/metrics/usage/export
Export usage data in CSV or JSON format.

**Headers:** `X-API-Key: <api-key>`

**Query Parameters:**
- `format`: "csv" or "json" (default: "json")
- `months`: Number of months (default: 12)

**Response (JSON):**
```json
{
  "status": "success",
  "data": {
    "export_format": "json",
    "organization_id": "org_123",
    "usage_data": [
      {
        "month": "2024-01",
        "device_count": 23,
        "scan_count": 156,
        "log_count": 45230,
        "api_requests": 1250
      }
    ]
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## 🤖 AI/ML Insights Endpoints

### GET /api/insights/models
List available ML models for the organization.

**Headers:** `X-API-Key: <api-key>`

**Response:**
```json
{
  "status": "success",
  "data": {
    "models": [
      {
        "id": "model_123",
        "name": "Anomaly Detection v1.0",
        "type": "isolation_forest",
        "accuracy": 0.92,
        "status": "active",
        "created_at": "2024-01-01T10:00:00Z"
      }
    ]
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### POST /api/insights/models/train
Train a new ML model.

**Headers:** `X-API-Key: <api-key>`

**Request Body:**
```json
{
  "model_name": "Custom Anomaly Detector",
  "model_type": "isolation_forest",
  "parameters": {
    "contamination": 0.1,
    "n_estimators": 100
  }
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "training_session_id": "session_456",
    "model_id": "model_789",
    "status": "training_started"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### POST /api/insights/models/{model_id}/predict
Make predictions using a trained ML model.

**Headers:** `X-API-Key: <api-key>`

**Request Body:**
```json
{
  "data": [
    {
      "cpu_usage": 85.5,
      "memory_usage": 92.1,
      "network_connections": 150,
      "disk_io": 45.2
    }
  ]
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "predictions": [
      {
        "is_anomaly": true,
        "confidence": 0.87,
        "anomaly_score": 0.92,
        "features_contributing": ["cpu_usage", "memory_usage"]
      }
    ],
    "model_info": {
      "id": "model_123",
      "accuracy": 0.92,
      "last_trained": "2024-01-01T10:30:00Z"
    }
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### POST /api/insights/models/upload-training-data
Upload training data for ML model training.

**Headers:** `X-API-Key: <api-key>`

**Request:** Multipart form data with file upload

**Response:**
```json
{
  "status": "success",
  "data": {
    "file_id": "file_123",
    "filename": "training_data.csv",
    "size_bytes": 1024000,
    "rows_count": 10000,
    "columns": ["timestamp", "cpu_usage", "memory_usage", "is_anomaly"],
    "upload_timestamp": "2024-01-01T12:00:00Z"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### POST /api/insights/summary
Generate AI-powered summary of logs and security events.

**Headers:** `X-API-Key: <api-key>`

**Request Body:**
```json
{
  "time_range": "24h",
  "log_types": ["error", "warning", "security"]
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "summary": "In the past 24 hours, your network experienced 23 security events, including 2 critical vulnerabilities.",
    "key_findings": [
      "2 critical vulnerabilities detected",
      "Unusual spike in failed login attempts"
    ],
    "recommendations": [
      "Update firmware on vulnerable devices",
      "Implement IP blocking for suspicious IPs"
    ],
    "risk_level": "medium"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### POST /api/insights/threat-analysis
Perform advanced threat analysis using AI.

**Headers:** `X-API-Key: <api-key>`

**Request Body:**
```json
{
  "analysis_type": "behavioral",
  "time_range": "7d",
  "include_predictions": true
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "threat_level": "medium",
    "threats_detected": [
      {
        "type": "suspicious_network_activity",
        "severity": "high",
        "confidence": 0.85,
        "description": "Unusual data exfiltration pattern detected",
        "affected_devices": ["192.168.1.50", "192.168.1.75"],
        "recommended_actions": ["Isolate affected devices", "Review access logs"]
      }
    ],
    "behavioral_patterns": [
      {
        "pattern": "increased_after_hours_activity",
        "anomaly_score": 0.78,
        "first_detected": "2024-01-01T02:00:00Z"
      }
    ],
    "predictions": {
      "next_24h_risk": "low",
      "next_7d_risk": "medium",
      "recommended_monitoring": ["network_traffic", "user_behavior"]
    }
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### GET /api/insights/recommendations
Get AI-generated security recommendations.

**Headers:** `X-API-Key: <api-key>`

**Response:**
```json
{
  "status": "success",
  "data": {
    "recommendations": [
      {
        "id": "rec_001",
        "category": "vulnerability_management",
        "priority": "high",
        "title": "Update Critical Security Patches",
        "description": "2 devices have critical vulnerabilities that should be patched immediately",
        "impact": "Prevents potential system compromise",
        "effort": "medium",
        "affected_devices": ["192.168.1.10", "192.168.1.20"],
        "estimated_time": "2 hours"
      },
      {
        "id": "rec_002",
        "category": "access_control",
        "priority": "medium",
        "title": "Implement Multi-Factor Authentication",
        "description": "Enable MFA for admin accounts to improve security",
        "impact": "Reduces risk of unauthorized access",
        "effort": "low",
        "estimated_time": "30 minutes"
      }
    ],
    "summary": {
      "total_recommendations": 2,
      "high_priority": 1,
      "medium_priority": 1,
      "low_priority": 0
    }
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## 📋 Legacy Endpoints (Preserved for Backward Compatibility)

### GET /api/logs
Get system logs with filtering and pagination.

### GET /api/anomalies
Get detected anomalies.

### GET /api/network
Get network status and device information.

### GET /api/security
Get security status and scan results.

### POST /api/network/scan
Start network device scan.

### POST /api/security/scan
Start security vulnerability scan.

### GET /api/notifications
Get system notifications.

### WebSocket /ws/logs
Real-time log streaming.

### WebSocket /ws/notifications
Real-time notification streaming.

---

## 🔧 Error Handling

All endpoints return consistent error responses:

```json
{
  "status": "error",
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Invalid API key provided"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Common Error Codes
- `AUTHENTICATION_FAILED`: Invalid credentials or API key
- `AUTHORIZATION_DENIED`: Insufficient permissions
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `VALIDATION_ERROR`: Invalid request parameters
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `SUBSCRIPTION_LIMIT_EXCEEDED`: Usage exceeds plan limits
- `INTERNAL_SERVER_ERROR`: Unexpected server error

---

## 📈 Rate Limiting

API endpoints are rate-limited per organization:

- **Authentication**: 10 requests/minute
- **Billing**: 30 requests/minute
- **Metrics**: 60 requests/minute
- **AI/ML**: 20 requests/minute
- **General**: 100 requests/minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640995200
```

---

## 🔒 Security Headers

All API responses include security headers:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'
```

---

## 📊 API Versioning

Current API version: **v1**

Version is specified in the URL path: `/api/v1/...` (optional, defaults to v1)

---

**🚀 SecureNet API - Production Ready for Enterprise Cybersecurity** 