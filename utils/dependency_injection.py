"""
SecureNet Dependency Injection Container
Phase 2: Developer Experience - Dependency Injector Integration
"""

from dependency_injector import containers, providers
from dependency_injector.wiring import Provide, inject
import os
from typing import Dict, Any
from utils.logging_config import get_logger, configure_structlog
from monitoring.sentry_config import configure_sentry
from monitoring.prometheus_metrics import SecureNetMetrics
from ml.mlflow_tracking import SecureNetMLflowTracker

logger = get_logger(__name__)

class DatabaseContainer(containers.DeclarativeContainer):
    """Database-related dependencies"""
    
    # Database configuration
    db_config = providers.Configuration()
    
    # Database URL provider
    database_url = providers.Factory(
        lambda config: config.get("url", "sqlite:///data/securenet.db"),
        config=db_config
    )

class SecurityContainer(containers.DeclarativeContainer):
    """Security-related dependencies"""
    
    # Security configuration
    security_config = providers.Configuration()
    
    # JWT secret provider
    jwt_secret = providers.Factory(
        lambda config: config.get("jwt_secret", os.getenv("JWT_SECRET", "dev-secret-key")),
        config=security_config
    )
    
    # Encryption key provider
    encryption_key = providers.Factory(
        lambda config: config.get("encryption_key", os.getenv("ENCRYPTION_KEY")),
        config=security_config
    )

class MonitoringContainer(containers.DeclarativeContainer):
    """Monitoring and observability dependencies"""
    
    # Monitoring configuration
    monitoring_config = providers.Configuration()
    
    # Prometheus metrics provider
    metrics = providers.Singleton(SecureNetMetrics)
    
    # Sentry configuration provider
    sentry_dsn = providers.Factory(
        lambda config: config.get("sentry_dsn", os.getenv("SENTRY_DSN")),
        config=monitoring_config
    )

class MLContainer(containers.DeclarativeContainer):
    """Machine Learning dependencies"""
    
    # ML configuration
    ml_config = providers.Configuration()
    
    # MLflow tracker provider
    mlflow_tracker = providers.Singleton(
        SecureNetMLflowTracker,
        tracking_uri=ml_config.mlflow_uri,
        experiment_name=ml_config.experiment_name.provided.as_(str)
    )
    
    # Model cache provider
    model_cache = providers.Factory(dict)

class ExternalServicesContainer(containers.DeclarativeContainer):
    """External service dependencies"""
    
    # External services configuration
    external_config = providers.Configuration()
    
    # Slack webhook provider
    slack_webhook = providers.Factory(
        lambda config: config.get("slack_webhook", os.getenv("SLACK_WEBHOOK_URL")),
        config=external_config
    )
    
    # Email service provider
    email_config = providers.Factory(
        lambda config: {
            "smtp_server": config.get("smtp_server", os.getenv("SMTP_SERVER")),
            "smtp_port": config.get("smtp_port", int(os.getenv("SMTP_PORT", "587"))),
            "username": config.get("smtp_username", os.getenv("SMTP_USERNAME")),
            "password": config.get("smtp_password", os.getenv("SMTP_PASSWORD"))
        },
        config=external_config
    )

class ApplicationContainer(containers.DeclarativeContainer):
    """Main application container"""
    
    # Application configuration
    config = providers.Configuration()
    
    # Wire sub-containers
    database = providers.DependenciesContainer()
    security = providers.DependenciesContainer()
    monitoring = providers.DependenciesContainer()
    ml = providers.DependenciesContainer()
    external_services = providers.DependenciesContainer()
    
    # Application services
    threat_detection_service = providers.Factory(
        "services.threat_detection.ThreatDetectionService",
        metrics=monitoring.metrics,
        mlflow_tracker=ml.mlflow_tracker
    )
    
    vulnerability_service = providers.Factory(
        "services.vulnerability.VulnerabilityService",
        database_url=database.database_url,
        metrics=monitoring.metrics
    )
    
    network_scanner_service = providers.Factory(
        "services.network_scanner.NetworkScannerService",
        metrics=monitoring.metrics
    )
    
    notification_service = providers.Factory(
        "services.notifications.NotificationService",
        slack_webhook=external_services.slack_webhook,
        email_config=external_services.email_config
    )

def create_container() -> ApplicationContainer:
    """Create and configure the main application container"""
    
    # Create main container
    container = ApplicationContainer()
    
    # Create sub-containers
    database_container = DatabaseContainer()
    security_container = SecurityContainer()
    monitoring_container = MonitoringContainer()
    ml_container = MLContainer()
    external_container = ExternalServicesContainer()
    
    # Configure sub-containers
    database_container.db_config.from_dict({
        "url": os.getenv("DATABASE_URL", "sqlite:///data/securenet.db")
    })
    
    security_container.security_config.from_dict({
        "jwt_secret": os.getenv("JWT_SECRET", "dev-secret-key"),
        "encryption_key": os.getenv("ENCRYPTION_KEY")
    })
    
    monitoring_container.monitoring_config.from_dict({
        "sentry_dsn": os.getenv("SENTRY_DSN")
    })
    
    ml_container.ml_config.from_dict({
        "mlflow_uri": os.getenv("MLFLOW_TRACKING_URI", "sqlite:///data/mlflow.db"),
        "experiment_name": "securenet-ml"
    })
    
    external_container.external_config.from_dict({
        "slack_webhook": os.getenv("SLACK_WEBHOOK_URL"),
        "smtp_server": os.getenv("SMTP_SERVER"),
        "smtp_port": int(os.getenv("SMTP_PORT", "587")),
        "smtp_username": os.getenv("SMTP_USERNAME"),
        "smtp_password": os.getenv("SMTP_PASSWORD")
    })
    
    # Wire sub-containers to main container
    container.database.override(database_container)
    container.security.override(security_container)
    container.monitoring.override(monitoring_container)
    container.ml.override(ml_container)
    container.external_services.override(external_container)
    
    # Configure main container
    container.config.from_dict({
        "environment": os.getenv("ENVIRONMENT", "development"),
        "debug": os.getenv("DEBUG", "false").lower() == "true"
    })
    
    logger.info("Dependency injection container configured")
    
    return container

# Global container instance
container = create_container()

# Dependency injection decorators for common services
def inject_metrics(func):
    """Decorator to inject metrics service"""
    return inject(func, metrics=Provide[ApplicationContainer.monitoring.metrics])

def inject_mlflow(func):
    """Decorator to inject MLflow tracker"""
    return inject(func, mlflow_tracker=Provide[ApplicationContainer.ml.mlflow_tracker])

def inject_threat_detection(func):
    """Decorator to inject threat detection service"""
    return inject(func, threat_detection=Provide[ApplicationContainer.threat_detection_service])

def inject_vulnerability_service(func):
    """Decorator to inject vulnerability service"""
    return inject(func, vulnerability_service=Provide[ApplicationContainer.vulnerability_service])

def inject_notification_service(func):
    """Decorator to inject notification service"""
    return inject(func, notification_service=Provide[ApplicationContainer.notification_service])

# Service locator pattern for manual dependency resolution
class ServiceLocator:
    """Service locator for manual dependency resolution"""
    
    def __init__(self, container: ApplicationContainer):
        self.container = container
    
    def get_metrics(self) -> SecureNetMetrics:
        """Get metrics service"""
        return self.container.monitoring.metrics()
    
    def get_mlflow_tracker(self) -> SecureNetMLflowTracker:
        """Get MLflow tracker"""
        return self.container.ml.mlflow_tracker()
    
    def get_threat_detection_service(self):
        """Get threat detection service"""
        return self.container.threat_detection_service()
    
    def get_vulnerability_service(self):
        """Get vulnerability service"""
        return self.container.vulnerability_service()
    
    def get_notification_service(self):
        """Get notification service"""
        return self.container.notification_service()

# Global service locator
service_locator = ServiceLocator(container) 