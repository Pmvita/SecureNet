"""
SecureNet MLflow Experiment Tracking
Phase 2: Developer Experience - MLflow Integration
"""

import mlflow
import mlflow.sklearn
import mlflow.pytorch
import os
from typing import Dict, Any, Optional, List
import numpy as np
import pandas as pd
from datetime import datetime
import json
from utils.logging_config import get_logger

logger = get_logger(__name__)

class SecureNetMLflowTracker:
    """MLflow experiment tracking for SecureNet ML models"""
    
    def __init__(self, tracking_uri: str = None, experiment_name: str = "securenet-ml"):
        self.tracking_uri = tracking_uri or os.getenv("MLFLOW_TRACKING_URI", "sqlite:///data/mlflow.db")
        self.experiment_name = experiment_name
        
        # Configure MLflow
        mlflow.set_tracking_uri(self.tracking_uri)
        
        # Create or get experiment
        try:
            self.experiment_id = mlflow.create_experiment(experiment_name)
        except mlflow.exceptions.MlflowException:
            self.experiment_id = mlflow.get_experiment_by_name(experiment_name).experiment_id
        
        mlflow.set_experiment(experiment_name)
        
        logger.info(
            "MLflow tracker initialized",
            tracking_uri=self.tracking_uri,
            experiment_name=experiment_name,
            experiment_id=self.experiment_id
        )
    
    def start_run(self, run_name: str = None, tags: Dict[str, str] = None) -> mlflow.ActiveRun:
        """Start a new MLflow run"""
        
        default_tags = {
            "project": "SecureNet",
            "environment": os.getenv("ENVIRONMENT", "development"),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if tags:
            default_tags.update(tags)
        
        run = mlflow.start_run(run_name=run_name, tags=default_tags)
        
        logger.info(
            "MLflow run started",
            run_id=run.info.run_id,
            run_name=run_name
        )
        
        return run
    
    def log_threat_detection_model(self, 
                                 model, 
                                 model_name: str,
                                 training_data: pd.DataFrame,
                                 test_metrics: Dict[str, float],
                                 hyperparameters: Dict[str, Any],
                                 feature_importance: Dict[str, float] = None):
        """Log threat detection model training"""
        
        with self.start_run(run_name=f"{model_name}_training") as run:
            # Log hyperparameters
            mlflow.log_params(hyperparameters)
            
            # Log metrics
            for metric_name, value in test_metrics.items():
                mlflow.log_metric(metric_name, value)
            
            # Log model
            mlflow.sklearn.log_model(
                model,
                model_name,
                registered_model_name=f"securenet_{model_name}",
                metadata={
                    "model_type": "threat_detection",
                    "training_samples": len(training_data),
                    "features": list(training_data.columns)
                }
            )
            
            # Log feature importance if available
            if feature_importance:
                importance_df = pd.DataFrame(
                    list(feature_importance.items()),
                    columns=["feature", "importance"]
                )
                mlflow.log_table(importance_df, "feature_importance.json")
            
            # Log training data info
            mlflow.log_param("training_samples", len(training_data))
            mlflow.log_param("feature_count", len(training_data.columns))
            
            logger.info(
                "Threat detection model logged",
                model_name=model_name,
                run_id=run.info.run_id,
                metrics=test_metrics
            )
    
    def log_vulnerability_model(self,
                              model,
                              model_name: str,
                              cve_data: pd.DataFrame,
                              performance_metrics: Dict[str, float],
                              model_config: Dict[str, Any]):
        """Log vulnerability assessment model"""
        
        with self.start_run(run_name=f"{model_name}_vulnerability") as run:
            # Log configuration
            mlflow.log_params(model_config)
            
            # Log performance metrics
            for metric, value in performance_metrics.items():
                mlflow.log_metric(metric, value)
            
            # Log model
            mlflow.sklearn.log_model(
                model,
                model_name,
                registered_model_name=f"securenet_vuln_{model_name}",
                metadata={
                    "model_type": "vulnerability_assessment",
                    "cve_samples": len(cve_data),
                    "last_updated": datetime.utcnow().isoformat()
                }
            )
            
            # Log CVE data statistics
            mlflow.log_param("cve_count", len(cve_data))
            mlflow.log_param("severity_distribution", 
                           cve_data['severity'].value_counts().to_dict())
            
            logger.info(
                "Vulnerability model logged",
                model_name=model_name,
                run_id=run.info.run_id,
                cve_count=len(cve_data)
            )
    
    def log_network_anomaly_model(self,
                                 model,
                                 model_name: str,
                                 network_data: pd.DataFrame,
                                 anomaly_threshold: float,
                                 detection_metrics: Dict[str, float]):
        """Log network anomaly detection model"""
        
        with self.start_run(run_name=f"{model_name}_anomaly") as run:
            # Log model parameters
            mlflow.log_param("anomaly_threshold", anomaly_threshold)
            mlflow.log_param("network_samples", len(network_data))
            
            # Log detection metrics
            for metric, value in detection_metrics.items():
                mlflow.log_metric(metric, value)
            
            # Log model
            mlflow.sklearn.log_model(
                model,
                model_name,
                registered_model_name=f"securenet_anomaly_{model_name}",
                metadata={
                    "model_type": "network_anomaly_detection",
                    "threshold": anomaly_threshold,
                    "training_period": "last_30_days"
                }
            )
            
            # Log network statistics
            network_stats = {
                "unique_ips": network_data['source_ip'].nunique() if 'source_ip' in network_data.columns else 0,
                "traffic_volume": len(network_data),
                "time_range": f"{network_data.index.min()} to {network_data.index.max()}" if hasattr(network_data.index, 'min') else "unknown"
            }
            
            for stat, value in network_stats.items():
                mlflow.log_param(stat, value)
            
            logger.info(
                "Network anomaly model logged",
                model_name=model_name,
                run_id=run.info.run_id,
                threshold=anomaly_threshold
            )
    
    def load_model(self, model_name: str, version: str = "latest") -> Any:
        """Load a registered model"""
        
        try:
            if version == "latest":
                model_uri = f"models:/{model_name}/latest"
            else:
                model_uri = f"models:/{model_name}/{version}"
            
            model = mlflow.sklearn.load_model(model_uri)
            
            logger.info(
                "Model loaded from MLflow",
                model_name=model_name,
                version=version
            )
            
            return model
            
        except Exception as e:
            logger.error(
                "Failed to load model from MLflow",
                model_name=model_name,
                version=version,
                error=str(e)
            )
            raise
    
    def get_model_metrics(self, model_name: str, version: str = "latest") -> Dict[str, Any]:
        """Get metrics for a specific model version"""
        
        try:
            client = mlflow.tracking.MlflowClient()
            
            if version == "latest":
                model_version = client.get_latest_versions(model_name, stages=["Production", "Staging", "None"])[0]
            else:
                model_version = client.get_model_version(model_name, version)
            
            run = client.get_run(model_version.run_id)
            
            return {
                "metrics": run.data.metrics,
                "params": run.data.params,
                "tags": run.data.tags,
                "model_version": model_version.version,
                "stage": model_version.current_stage
            }
            
        except Exception as e:
            logger.error(
                "Failed to get model metrics",
                model_name=model_name,
                version=version,
                error=str(e)
            )
            return {}
    
    def compare_models(self, model_names: List[str]) -> pd.DataFrame:
        """Compare metrics across multiple models"""
        
        comparison_data = []
        
        for model_name in model_names:
            metrics = self.get_model_metrics(model_name)
            if metrics:
                row = {"model_name": model_name}
                row.update(metrics["metrics"])
                row.update(metrics["params"])
                comparison_data.append(row)
        
        return pd.DataFrame(comparison_data)
    
    def promote_model(self, model_name: str, version: str, stage: str = "Production"):
        """Promote model to production stage"""
        
        try:
            client = mlflow.tracking.MlflowClient()
            client.transition_model_version_stage(
                name=model_name,
                version=version,
                stage=stage
            )
            
            logger.info(
                "Model promoted",
                model_name=model_name,
                version=version,
                stage=stage
            )
            
        except Exception as e:
            logger.error(
                "Failed to promote model",
                model_name=model_name,
                version=version,
                stage=stage,
                error=str(e)
            )
            raise

# Global MLflow tracker instance
mlflow_tracker = SecureNetMLflowTracker() 