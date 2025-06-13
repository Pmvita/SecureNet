✅ **Integrated in Phase 3** – See [phase guide](../integration/phase-3-advanced-tooling.md)

# wandb - Advanced Experiment Tracking

Weights & Biases (wandb) is a platform for experiment tracking, model management, and collaboration in machine learning projects. It provides advanced visualization and collaboration features beyond basic MLflow capabilities.

## 🎯 Purpose for SecureNet

- **Advanced Experiment Tracking** - Rich visualizations and experiment comparison
- **Model Management** - Version control for models with advanced metadata
- **Collaboration** - Team collaboration on ML experiments
- **Hyperparameter Visualization** - Advanced hyperparameter optimization tracking
- **Real-time Monitoring** - Live training monitoring and alerts
- **Report Generation** - Automated ML reports and documentation

## 📦 Installation

```bash
pip install wandb
```

## 🔧 Integration

### Core wandb Setup

**File**: `ml/wandb_tracking.py`

```python
import wandb
import os
import json
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
import structlog
from pathlib import Path
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import confusion_matrix, classification_report
import joblib

logger = structlog.get_logger()

class WandBTracker:
    """Advanced experiment tracking with Weights & Biases for SecureNet"""
    
    def __init__(self, 
                 project_name: str = "securenet-ml",
                 entity: Optional[str] = None,
                 tags: Optional[List[str]] = None):
        
        self.project_name = project_name
        self.entity = entity
        self.tags = tags or ["securenet", "cybersecurity"]
        self.run = None
        
        # Initialize wandb
        self._setup_wandb()
    
    def _setup_wandb(self):
        """Setup wandb configuration"""
        
        # Set API key if provided via environment
        if os.getenv("WANDB_API_KEY"):
            wandb.login(key=os.getenv("WANDB_API_KEY"))
        
        # Configure wandb settings
        os.environ["WANDB_SILENT"] = "true"  # Reduce verbose output
        
        logger.info("wandb tracking initialized", project=self.project_name)
    
    def start_experiment(self, 
                        experiment_name: str,
                        config: Dict[str, Any],
                        experiment_type: str = "training",
                        notes: Optional[str] = None) -> wandb.Run:
        """
        Start a new experiment run
        
        Args:
            experiment_name: Name of the experiment
            config: Configuration dictionary
            experiment_type: Type of experiment (training, evaluation, etc.)
            notes: Optional notes about the experiment
            
        Returns:
            wandb Run object
        """
        
        # Add SecureNet-specific tags
        run_tags = self.tags + [experiment_type]
        if "model_type" in config:
            run_tags.append(config["model_type"])
        
        # Initialize run
        self.run = wandb.init(
            project=self.project_name,
            entity=self.entity,
            name=experiment_name,
            config=config,
            tags=run_tags,
            notes=notes,
            reinit=True
        )
        
        # Log system information
        self._log_system_info()
        
        logger.info(
            "Experiment started",
            experiment_name=experiment_name,
            run_id=self.run.id,
            run_url=self.run.url
        )
        
        return self.run
    
    def _log_system_info(self):
        """Log system and environment information"""
        
        import platform
        import psutil
        
        system_info = {
            "python_version": platform.python_version(),
            "platform": platform.platform(),
            "cpu_count": psutil.cpu_count(),
            "memory_gb": round(psutil.virtual_memory().total / (1024**3), 2),
            "timestamp": datetime.now().isoformat()
        }
        
        self.run.config.update({"system_info": system_info})
    
    def log_metrics(self, 
                   metrics: Dict[str, Union[float, int]], 
                   step: Optional[int] = None,
                   commit: bool = True):
        """
        Log metrics to wandb
        
        Args:
            metrics: Dictionary of metric names and values
            step: Optional step number
            commit: Whether to commit the metrics immediately
        """
        
        if not self.run:
            logger.warning("No active run - call start_experiment first")
            return
        
        # Add timestamp to metrics
        metrics_with_time = {
            **metrics,
            "timestamp": datetime.now().timestamp()
        }
        
        self.run.log(metrics_with_time, step=step, commit=commit)
        
        logger.debug("Metrics logged", metrics=list(metrics.keys()), step=step)
    
    def log_model_artifacts(self, 
                           model_path: str,
                           model_name: str,
                           model_type: str = "sklearn",
                           metadata: Optional[Dict[str, Any]] = None):
        """
        Log model artifacts to wandb
        
        Args:
            model_path: Path to the saved model file
            model_name: Name for the model artifact
            model_type: Type of model (sklearn, pytorch, etc.)
            metadata: Additional metadata about the model
        """
        
        if not self.run:
            logger.warning("No active run - call start_experiment first")
            return
        
        # Create artifact
        artifact = wandb.Artifact(
            name=model_name,
            type="model",
            description=f"SecureNet {model_type} model",
            metadata=metadata or {}
        )
        
        # Add model file
        artifact.add_file(model_path)
        
        # Add model metadata file if it exists
        metadata_path = model_path.replace('.joblib', '_metadata.json')
        if os.path.exists(metadata_path):
            artifact.add_file(metadata_path)
        
        # Log artifact
        self.run.log_artifact(artifact)
        
        logger.info(
            "Model artifact logged",
            model_name=model_name,
            model_path=model_path,
            artifact_version=artifact.version
        )
    
    def log_dataset(self, 
                   data: Union[pd.DataFrame, np.ndarray],
                   dataset_name: str,
                   dataset_type: str = "training",
                   description: Optional[str] = None):
        """
        Log dataset as wandb artifact
        
        Args:
            data: Dataset to log
            dataset_name: Name for the dataset
            dataset_type: Type of dataset (training, validation, test)
            description: Description of the dataset
        """
        
        if not self.run:
            logger.warning("No active run - call start_experiment first")
            return
        
        # Create temporary file for dataset
        temp_path = f"/tmp/{dataset_name}_{dataset_type}.csv"
        
        if isinstance(data, pd.DataFrame):
            data.to_csv(temp_path, index=False)
            metadata = {
                "shape": data.shape,
                "columns": list(data.columns),
                "dtypes": data.dtypes.to_dict()
            }
        else:  # numpy array
            pd.DataFrame(data).to_csv(temp_path, index=False)
            metadata = {
                "shape": data.shape,
                "dtype": str(data.dtype)
            }
        
        # Create artifact
        artifact = wandb.Artifact(
            name=dataset_name,
            type="dataset",
            description=description or f"SecureNet {dataset_type} dataset",
            metadata=metadata
        )
        
        artifact.add_file(temp_path)
        self.run.log_artifact(artifact)
        
        # Clean up temporary file
        os.remove(temp_path)
        
        logger.info("Dataset logged", dataset_name=dataset_name, shape=metadata["shape"])
    
    def log_confusion_matrix(self, 
                           y_true: np.ndarray,
                           y_pred: np.ndarray,
                           class_names: Optional[List[str]] = None,
                           title: str = "Confusion Matrix"):
        """Log confusion matrix visualization"""
        
        if not self.run:
            logger.warning("No active run - call start_experiment first")
            return
        
        # Create confusion matrix
        cm = confusion_matrix(y_true, y_pred)
        
        # Create visualization
        plt.figure(figsize=(8, 6))
        sns.heatmap(
            cm, 
            annot=True, 
            fmt='d', 
            cmap='Blues',
            xticklabels=class_names or range(len(cm)),
            yticklabels=class_names or range(len(cm))
        )
        plt.title(title)
        plt.ylabel('True Label')
        plt.xlabel('Predicted Label')
        
        # Log to wandb
        self.run.log({title.lower().replace(' ', '_'): wandb.Image(plt)})
        plt.close()
        
        # Also log classification report
        if len(np.unique(y_true)) <= 10:  # Only for reasonable number of classes
            report = classification_report(y_true, y_pred, output_dict=True)
            self.run.log({"classification_report": report})
    
    def log_feature_importance(self, 
                             feature_names: List[str],
                             importance_values: np.ndarray,
                             title: str = "Feature Importance"):
        """Log feature importance visualization"""
        
        if not self.run:
            logger.warning("No active run - call start_experiment first")
            return
        
        # Create feature importance plot
        plt.figure(figsize=(10, max(6, len(feature_names) * 0.3)))
        
        # Sort by importance
        sorted_idx = np.argsort(importance_values)
        sorted_features = [feature_names[i] for i in sorted_idx]
        sorted_importance = importance_values[sorted_idx]
        
        plt.barh(range(len(sorted_features)), sorted_importance)
        plt.yticks(range(len(sorted_features)), sorted_features)
        plt.xlabel('Importance')
        plt.title(title)
        plt.tight_layout()
        
        # Log to wandb
        self.run.log({title.lower().replace(' ', '_'): wandb.Image(plt)})
        plt.close()
        
        # Also log as table
        importance_table = wandb.Table(
            columns=["Feature", "Importance"],
            data=[[name, float(imp)] for name, imp in zip(feature_names, importance_values)]
        )
        self.run.log({"feature_importance_table": importance_table})
    
    def log_training_progress(self, 
                            epoch: int,
                            train_metrics: Dict[str, float],
                            val_metrics: Optional[Dict[str, float]] = None):
        """Log training progress with proper prefixes"""
        
        if not self.run:
            logger.warning("No active run - call start_experiment first")
            return
        
        # Prepare metrics with prefixes
        metrics = {}
        
        # Add training metrics
        for key, value in train_metrics.items():
            metrics[f"train_{key}"] = value
        
        # Add validation metrics
        if val_metrics:
            for key, value in val_metrics.items():
                metrics[f"val_{key}"] = value
        
        # Add epoch
        metrics["epoch"] = epoch
        
        self.run.log(metrics, step=epoch)
    
    def log_hyperparameter_sweep(self, 
                                sweep_config: Dict[str, Any],
                                sweep_name: str = "hyperparameter_sweep"):
        """Initialize hyperparameter sweep"""
        
        # Create sweep
        sweep_id = wandb.sweep(
            sweep_config,
            project=self.project_name,
            entity=self.entity
        )
        
        logger.info(
            "Hyperparameter sweep created",
            sweep_id=sweep_id,
            sweep_name=sweep_name
        )
        
        return sweep_id
    
    def create_report(self, 
                     report_title: str,
                     sections: List[Dict[str, Any]],
                     description: Optional[str] = None) -> str:
        """
        Create a wandb report
        
        Args:
            report_title: Title of the report
            sections: List of report sections
            description: Optional description
            
        Returns:
            URL of the created report
        """
        
        if not self.run:
            logger.warning("No active run - call start_experiment first")
            return ""
        
        # Create report content
        report_content = {
            "displayName": report_title,
            "description": description or f"SecureNet ML Report - {datetime.now().strftime('%Y-%m-%d')}",
            "width": "readable",
            "sections": sections
        }
        
        # This would typically use wandb's report API
        # For now, we'll log the report structure
        self.run.log({"report_structure": report_content})
        
        logger.info("Report structure logged", title=report_title)
        
        return self.run.url
    
    def finish_experiment(self, 
                         summary_metrics: Optional[Dict[str, Any]] = None,
                         exit_code: int = 0):
        """
        Finish the current experiment
        
        Args:
            summary_metrics: Final summary metrics
            exit_code: Exit code (0 for success)
        """
        
        if not self.run:
            logger.warning("No active run to finish")
            return
        
        # Log final summary
        if summary_metrics:
            for key, value in summary_metrics.items():
                self.run.summary[key] = value
        
        # Add experiment duration
        if hasattr(self.run, '_start_time'):
            duration = datetime.now().timestamp() - self.run._start_time
            self.run.summary["experiment_duration_seconds"] = duration
        
        # Finish run
        self.run.finish(exit_code=exit_code)
        
        logger.info(
            "Experiment finished",
            run_id=self.run.id,
            exit_code=exit_code
        )
        
        self.run = None

class SecureNetMLPipeline:
    """Complete ML pipeline with wandb tracking for SecureNet"""
    
    def __init__(self, project_name: str = "securenet-ml-pipeline"):
        self.tracker = WandBTracker(project_name=project_name)
        self.model = None
        self.scaler = None
        
    def train_anomaly_detection_model(self, 
                                    X_train: np.ndarray,
                                    y_train: np.ndarray,
                                    X_val: np.ndarray,
                                    y_val: np.ndarray,
                                    model_config: Dict[str, Any],
                                    experiment_name: str = "anomaly_detection_training"):
        """Train anomaly detection model with full wandb tracking"""
        
        from sklearn.ensemble import IsolationForest
        from sklearn.preprocessing import StandardScaler
        from sklearn.metrics import classification_report, f1_score
        
        # Start experiment
        config = {
            "model_type": "isolation_forest",
            "training_samples": len(X_train),
            "validation_samples": len(X_val),
            "features": X_train.shape[1],
            **model_config
        }
        
        self.tracker.start_experiment(
            experiment_name=experiment_name,
            config=config,
            experiment_type="training",
            notes="SecureNet anomaly detection model training"
        )
        
        # Log training dataset
        self.tracker.log_dataset(
            pd.DataFrame(X_train),
            "training_data",
            "training",
            "Network traffic features for anomaly detection"
        )
        
        # Preprocessing
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_val_scaled = self.scaler.transform(X_val)
        
        # Model training
        self.model = IsolationForest(**model_config, random_state=42)
        
        # Track training time
        start_time = datetime.now()
        self.model.fit(X_train_scaled)
        training_time = (datetime.now() - start_time).total_seconds()
        
        # Validation
        y_pred_train = self.model.predict(X_train_scaled)
        y_pred_val = self.model.predict(X_val_scaled)
        
        # Calculate metrics
        train_f1 = f1_score(y_train, y_pred_train, average='binary', pos_label=-1)
        val_f1 = f1_score(y_val, y_pred_val, average='binary', pos_label=-1)
        
        # Log metrics
        self.tracker.log_metrics({
            "train_f1_score": train_f1,
            "val_f1_score": val_f1,
            "training_time_seconds": training_time,
            "model_n_estimators": self.model.n_estimators,
            "contamination": self.model.contamination
        })
        
        # Log confusion matrix
        self.tracker.log_confusion_matrix(
            y_val, y_pred_val,
            class_names=["Normal", "Anomaly"],
            title="Validation Confusion Matrix"
        )
        
        # Save and log model
        model_path = f"/tmp/anomaly_model_{datetime.now().strftime('%Y%m%d_%H%M%S')}.joblib"
        joblib.dump({
            'model': self.model,
            'scaler': self.scaler,
            'config': config
        }, model_path)
        
        self.tracker.log_model_artifacts(
            model_path=model_path,
            model_name="anomaly_detection_model",
            model_type="isolation_forest",
            metadata={
                "f1_score": val_f1,
                "training_samples": len(X_train),
                "features": X_train.shape[1]
            }
        )
        
        # Finish experiment
        self.tracker.finish_experiment(
            summary_metrics={
                "final_val_f1": val_f1,
                "final_train_f1": train_f1,
                "training_time": training_time
            }
        )
        
        return {
            "model": self.model,
            "scaler": self.scaler,
            "val_f1_score": val_f1,
            "model_path": model_path
        }
    
    def run_hyperparameter_sweep(self, 
                               X_train: np.ndarray,
                               y_train: np.ndarray,
                               X_val: np.ndarray,
                               y_val: np.ndarray):
        """Run hyperparameter sweep with wandb"""
        
        # Define sweep configuration
        sweep_config = {
            'method': 'bayes',
            'metric': {
                'name': 'val_f1_score',
                'goal': 'maximize'
            },
            'parameters': {
                'n_estimators': {
                    'values': [50, 100, 200, 300]
                },
                'contamination': {
                    'min': 0.01,
                    'max': 0.3
                },
                'max_features': {
                    'min': 0.1,
                    'max': 1.0
                }
            }
        }
        
        # Create sweep
        sweep_id = self.tracker.log_hyperparameter_sweep(
            sweep_config,
            "anomaly_detection_sweep"
        )
        
        def train_with_config():
            """Training function for sweep"""
            with wandb.init() as run:
                config = wandb.config
                
                # Train model with current config
                result = self.train_anomaly_detection_model(
                    X_train, y_train, X_val, y_val,
                    model_config=dict(config),
                    experiment_name=f"sweep_run_{run.id}"
                )
                
                # Log result
                wandb.log({"val_f1_score": result["val_f1_score"]})
        
        return sweep_id, train_with_config
```

### Integration with Existing ML Pipeline

**File**: `ml/wandb_integration.py`

```python
import wandb
from ml.wandb_tracking import WandBTracker
from ml.anomaly_detection import ThreatDetectionService
from ml.hyperparameter_optimization import SecureNetOptimizer
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional
import structlog

logger = structlog.get_logger()

class WandBIntegratedThreatDetection(ThreatDetectionService):
    """Threat detection service with wandb integration"""
    
    def __init__(self, model_path: Optional[str] = None):
        super().__init__(model_path)
        self.tracker = WandBTracker(
            project_name="securenet-threat-detection",
            tags=["production", "threat-detection"]
        )
        
    async def analyze_with_tracking(self, 
                                  network_data: List[Dict],
                                  tenant_id: str,
                                  experiment_name: str = "threat_analysis") -> Dict[str, Any]:
        """Analyze network data with wandb tracking"""
        
        # Start tracking
        config = {
            "tenant_id": tenant_id,
            "data_points": len(network_data),
            "model_type": "isolation_forest",
            "analysis_type": "real_time"
        }
        
        self.tracker.start_experiment(
            experiment_name=f"{experiment_name}_{tenant_id}",
            config=config,
            experiment_type="inference"
        )
        
        try:
            # Perform analysis
            results = await super().analyze_network_data(network_data, tenant_id)
            
            # Extract metrics
            threat_count = sum(1 for r in results if r.get('is_threat', False))
            avg_confidence = np.mean([r.get('confidence', 0) for r in results])
            max_severity = max([r.get('severity_score', 0) for r in results], default=0)
            
            # Log metrics
            self.tracker.log_metrics({
                "threats_detected": threat_count,
                "total_analyzed": len(results),
                "threat_rate": threat_count / len(results) if results else 0,
                "avg_confidence": avg_confidence,
                "max_severity": max_severity
            })
            
            # Log results summary
            severity_distribution = {}
            for result in results:
                severity = result.get('severity_level', 'unknown')
                severity_distribution[severity] = severity_distribution.get(severity, 0) + 1
            
            self.tracker.log_metrics(severity_distribution)
            
            # Finish tracking
            self.tracker.finish_experiment(
                summary_metrics={
                    "total_threats": threat_count,
                    "analysis_success": True
                }
            )
            
            return {
                "results": results,
                "summary": {
                    "threats_detected": threat_count,
                    "total_analyzed": len(results),
                    "avg_confidence": avg_confidence
                }
            }
            
        except Exception as e:
            # Log error
            self.tracker.log_metrics({"error": str(e), "analysis_success": False})
            self.tracker.finish_experiment(exit_code=1)
            raise

class WandBOptimizer(SecureNetOptimizer):
    """Hyperparameter optimizer with wandb integration"""
    
    def __init__(self, study_name: str = "securenet_optimization"):
        super().__init__(study_name)
        self.wandb_tracker = WandBTracker(
            project_name="securenet-optimization",
            tags=["hyperparameter-optimization"]
        )
    
    def optimize_with_wandb_tracking(self, 
                                   X_train: np.ndarray,
                                   y_train: np.ndarray,
                                   X_val: np.ndarray,
                                   y_val: np.ndarray,
                                   n_trials: int = 100) -> Dict[str, Any]:
        """Run optimization with wandb tracking"""
        
        # Start wandb experiment
        config = {
            "optimization_algorithm": "TPE",
            "n_trials": n_trials,
            "training_samples": len(X_train),
            "validation_samples": len(X_val),
            "features": X_train.shape[1]
        }
        
        self.wandb_tracker.start_experiment(
            experiment_name=f"hyperparameter_optimization_{self.study_name}",
            config=config,
            experiment_type="optimization"
        )
        
        # Custom objective function with wandb logging
        def wandb_objective(trial):
            # Start wandb run for this trial
            with wandb.init(
                project="securenet-optimization-trials",
                name=f"trial_{trial.number}",
                config=trial.params,
                reinit=True
            ) as run:
                
                # Run optimization trial
                if hasattr(self, '_optimize_isolation_forest'):
                    metrics = self._optimize_isolation_forest(trial, X_train, y_train, X_val, y_val)
                else:
                    # Fallback to basic optimization
                    from sklearn.ensemble import IsolationForest
                    from sklearn.metrics import f1_score
                    
                    model = IsolationForest(
                        n_estimators=trial.suggest_int('n_estimators', 50, 300),
                        contamination=trial.suggest_float('contamination', 0.01, 0.3),
                        random_state=42
                    )
                    
                    model.fit(X_train)
                    y_pred = model.predict(X_val)
                    f1 = f1_score(y_val, y_pred, average='binary', pos_label=-1)
                    
                    metrics = {'f1_score': f1}
                
                # Log metrics to wandb
                wandb.log(metrics)
                
                return metrics['f1_score']
        
        # Run optimization
        self.study.optimize(wandb_objective, n_trials=n_trials)
        
        # Log optimization results
        best_trial = self.study.best_trial
        
        self.wandb_tracker.log_metrics({
            "best_f1_score": best_trial.value,
            "best_trial_number": best_trial.number,
            "total_trials": len(self.study.trials)
        })
        
        # Log parameter importance
        try:
            import optuna
            importance = optuna.importance.get_param_importances(self.study)
            self.wandb_tracker.log_metrics(importance)
        except Exception as e:
            logger.warning("Could not calculate parameter importance", error=str(e))
        
        # Create optimization history plot
        trial_values = [trial.value for trial in self.study.trials if trial.value is not None]
        
        import matplotlib.pyplot as plt
        plt.figure(figsize=(10, 6))
        plt.plot(trial_values, marker='o')
        plt.title('Optimization History')
        plt.xlabel('Trial')
        plt.ylabel('F1 Score')
        plt.grid(True)
        
        self.wandb_tracker.run.log({"optimization_history": wandb.Image(plt)})
        plt.close()
        
        # Finish experiment
        self.wandb_tracker.finish_experiment(
            summary_metrics={
                "best_score": best_trial.value,
                "best_params": best_trial.params,
                "optimization_completed": True
            }
        )
        
        return {
            'best_params': best_trial.params,
            'best_score': best_trial.value,
            'study': self.study,
            'wandb_url': self.wandb_tracker.run.url if self.wandb_tracker.run else None
        }

# Utility functions for wandb integration
def create_securenet_sweep_config() -> Dict[str, Any]:
    """Create a comprehensive sweep configuration for SecureNet models"""
    
    return {
        'method': 'bayes',
        'metric': {
            'name': 'val_f1_score',
            'goal': 'maximize'
        },
        'parameters': {
            'model_type': {
                'values': ['isolation_forest', 'one_class_svm', 'local_outlier_factor']
            },
            'n_estimators': {
                'distribution': 'int_uniform',
                'min': 50,
                'max': 500
            },
            'contamination': {
                'distribution': 'uniform',
                'min': 0.01,
                'max': 0.3
            },
            'max_features': {
                'distribution': 'uniform',
                'min': 0.1,
                'max': 1.0
            },
            'learning_rate': {
                'distribution': 'log_uniform',
                'min': 1e-5,
                'max': 1e-1
            }
        },
        'early_terminate': {
            'type': 'hyperband',
            'min_iter': 10,
            'eta': 2
        }
    }

def setup_wandb_alerts(project_name: str, alert_config: Dict[str, Any]):
    """Setup wandb alerts for model performance monitoring"""
    
    # This would typically use wandb's alerting API
    # For now, we'll create a configuration structure
    
    alert_structure = {
        "project": project_name,
        "alerts": [
            {
                "name": "Low F1 Score Alert",
                "condition": "val_f1_score < 0.7",
                "action": "email",
                "message": "Model F1 score dropped below threshold"
            },
            {
                "name": "High Error Rate Alert", 
                "condition": "error_rate > 0.1",
                "action": "slack",
                "message": "Model error rate exceeded 10%"
            },
            {
                "name": "Training Time Alert",
                "condition": "training_time_seconds > 3600",
                "action": "email",
                "message": "Model training took longer than 1 hour"
            }
        ]
    }
    
    logger.info("Alert configuration created", alerts=len(alert_structure["alerts"]))
    
    return alert_structure
```

## 🚀 Usage Examples

### Basic Experiment Tracking

```python
from ml.wandb_tracking import WandBTracker
import numpy as np

# Initialize tracker
tracker = WandBTracker(project_name="securenet-experiments")

# Start experiment
config = {
    "model_type": "isolation_forest",
    "n_estimators": 100,
    "contamination": 0.1
}

tracker.start_experiment(
    experiment_name="anomaly_detection_v1",
    config=config,
    notes="Testing new anomaly detection approach"
)

# Log metrics during training
for epoch in range(10):
    metrics = {
        "train_loss": np.random.random(),
        "val_loss": np.random.random(),
        "f1_score": 0.8 + np.random.random() * 0.1
    }
    tracker.log_metrics(metrics, step=epoch)

# Log model
tracker.log_model_artifacts(
    model_path="model.joblib",
    model_name="anomaly_detector_v1",
    metadata={"version": "1.0", "performance": "good"}
)

# Finish experiment
tracker.finish_experiment(summary_metrics={"final_f1": 0.85})
```

### Hyperparameter Sweep

```python
from ml.wandb_integration import create_securenet_sweep_config
import wandb

# Create sweep
sweep_config = create_securenet_sweep_config()
sweep_id = wandb.sweep(sweep_config, project="securenet-optimization")

# Define training function
def train():
    with wandb.init() as run:
        config = wandb.config
        
        # Train model with config
        model = train_model_with_config(config)
        
        # Evaluate and log
        f1_score = evaluate_model(model)
        wandb.log({"val_f1_score": f1_score})

# Run sweep
wandb.agent(sweep_id, train, count=50)
```

### Production Monitoring

```python
from ml.wandb_integration import WandBIntegratedThreatDetection

# Initialize service with wandb tracking
service = WandBIntegratedThreatDetection()

# Analyze with tracking
results = await service.analyze_with_tracking(
    network_data=network_traffic_data,
    tenant_id="tenant_123",
    experiment_name="production_analysis"
)

print(f"Detected {results['summary']['threats_detected']} threats")
```

### Model Comparison Report

```python
# Create comparison report
report_sections = [
    {
        "type": "run-comparer",
        "runsets": [
            {"name": "Isolation Forest", "query": "model_type:isolation_forest"},
            {"name": "One-Class SVM", "query": "model_type:one_class_svm"}
        ]
    },
    {
        "type": "media-browser",
        "media_keys": ["confusion_matrix", "feature_importance"]
    }
]

report_url = tracker.create_report(
    report_title="SecureNet Model Comparison",
    sections=report_sections,
    description="Comparison of different anomaly detection models"
)

print(f"Report available at: {report_url}")
```

## ✅ Validation Steps

1. **Install wandb**:
   ```bash
   pip install wandb
   wandb login
   ```

2. **Test Basic Tracking**:
   ```python
   import wandb
   
   wandb.init(project="test-project")
   wandb.log({"metric": 0.5})
   wandb.finish()
   ```

3. **Test SecureNet Integration**:
   ```python
   from ml.wandb_tracking import WandBTracker
   
   tracker = WandBTracker()
   tracker.start_experiment("test", {"param": 1})
   tracker.log_metrics({"score": 0.8})
   tracker.finish_experiment()
   ```

4. **View Dashboard**:
   - Go to https://wandb.ai
   - Check your project dashboard
   - Verify experiments are logged

## 📈 Benefits for SecureNet

- **Rich Visualizations** - Advanced charts and plots for model analysis
- **Experiment Comparison** - Easy comparison of different model runs
- **Collaboration** - Team collaboration on ML experiments
- **Model Registry** - Advanced model versioning and management
- **Real-time Monitoring** - Live monitoring of training and inference
- **Automated Reports** - Generate professional ML reports automatically

## 🔗 Related Documentation

- [Phase 3: Advanced Tooling](../integration/phase-3-advanced-tooling.md)
- [ML Tools Overview](README.md)
- [MLflow Integration](mlflow.md)
- [Optuna Integration](optuna.md) 