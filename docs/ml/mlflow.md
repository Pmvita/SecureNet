✅ **Integrated in Phase 2** – See [phase guide](../integration/phase-2-developer-experience.md)

# MLflow - ML Lifecycle Management

MLflow is an open-source platform for managing the complete machine learning lifecycle, including experimentation, reproducibility, and deployment.

## 🎯 Purpose for SecureNet

- **Experiment Tracking** - Log and compare ML model experiments
- **Model Versioning** - Manage different versions of anomaly detection models
- **Model Registry** - Centralized model storage and deployment
- **Reproducibility** - Track parameters, metrics, and artifacts

## 📦 Installation

```bash
pip install mlflow
```

## 🔧 Integration

### Core Implementation

**File**: `ml/mlflow_tracking.py`

```python
import mlflow
import mlflow.sklearn
from mlflow.tracking import MlflowClient
import os
from datetime import datetime
from typing import Dict, Any, Optional

class MLModelManager:
    def __init__(self, tracking_uri: str = "http://localhost:5000"):
        mlflow.set_tracking_uri(tracking_uri)
        self.client = MlflowClient()
        self.experiment_name = "securenet-anomaly-detection"
        
        # Create experiment if it doesn't exist
        try:
            self.experiment_id = mlflow.create_experiment(self.experiment_name)
        except mlflow.exceptions.MlflowException:
            self.experiment_id = mlflow.get_experiment_by_name(self.experiment_name).experiment_id
    
    def train_and_log_model(self, model, X_train, y_train, model_name: str, 
                           tenant_id: Optional[str] = None, 
                           hyperparameters: Optional[Dict] = None):
        """Train model and log everything to MLflow"""
        
        with mlflow.start_run(experiment_id=self.experiment_id):
            # Set tags
            mlflow.set_tag("model_name", model_name)
            mlflow.set_tag("tenant_id", tenant_id or "global")
            mlflow.set_tag("training_date", datetime.now().isoformat())
            
            # Log hyperparameters
            if hyperparameters:
                for param, value in hyperparameters.items():
                    mlflow.log_param(param, value)
            
            # Log model info
            mlflow.log_param("model_type", type(model).__name__)
            mlflow.log_param("training_samples", len(X_train))
            mlflow.log_param("feature_count", X_train.shape[1] if hasattr(X_train, 'shape') else len(X_train[0]))
            
            # Train model
            model.fit(X_train, y_train)
            
            # Log metrics
            if hasattr(model, 'score'):
                accuracy = model.score(X_train, y_train)
                mlflow.log_metric("training_accuracy", accuracy)
            
            # Log model artifacts
            model_path = f"models/{model_name}"
            mlflow.sklearn.log_model(
                model, 
                model_path,
                registered_model_name=f"{model_name}_{tenant_id}" if tenant_id else model_name
            )
            
            # Log additional artifacts
            self._log_model_metadata(model, model_name, tenant_id)
            
            run_id = mlflow.active_run().info.run_id
            print(f"✅ Model logged to MLflow with run_id: {run_id}")
            return run_id
    
    def load_production_model(self, model_name: str, tenant_id: Optional[str] = None):
        """Load the latest production model"""
        full_model_name = f"{model_name}_{tenant_id}" if tenant_id else model_name
        
        try:
            model_versions = self.client.get_latest_versions(
                full_model_name, 
                stages=["Production"]
            )
            
            if not model_versions:
                # Fallback to latest version if no production model
                model_versions = self.client.get_latest_versions(full_model_name)
            
            if model_versions:
                model_version = model_versions[0]
                model_uri = f"models:/{full_model_name}/{model_version.version}"
                return mlflow.sklearn.load_model(model_uri)
            else:
                raise ValueError(f"No model found for {full_model_name}")
                
        except Exception as e:
            print(f"❌ Error loading model {full_model_name}: {e}")
            return None
    
    def promote_model_to_production(self, model_name: str, version: str, tenant_id: Optional[str] = None):
        """Promote a model version to production"""
        full_model_name = f"{model_name}_{tenant_id}" if tenant_id else model_name
        
        self.client.transition_model_version_stage(
            name=full_model_name,
            version=version,
            stage="Production"
        )
        print(f"✅ Model {full_model_name} v{version} promoted to Production")
    
    def get_model_metrics(self, run_id: str) -> Dict[str, Any]:
        """Get metrics for a specific run"""
        run = self.client.get_run(run_id)
        return run.data.metrics
    
    def compare_models(self, run_ids: list) -> Dict[str, Dict]:
        """Compare metrics across multiple model runs"""
        comparison = {}
        for run_id in run_ids:
            run = self.client.get_run(run_id)
            comparison[run_id] = {
                'metrics': run.data.metrics,
                'params': run.data.params,
                'tags': run.data.tags
            }
        return comparison
    
    def _log_model_metadata(self, model, model_name: str, tenant_id: Optional[str]):
        """Log additional model metadata"""
        metadata = {
            'model_name': model_name,
            'tenant_id': tenant_id or 'global',
            'training_timestamp': datetime.now().isoformat(),
            'model_class': type(model).__name__
        }
        
        # Log as artifact
        import json
        import tempfile
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(metadata, f, indent=2)
            mlflow.log_artifact(f.name, "metadata")
```

### Integration with SecureNet's Anomaly Detection

**File**: `ml/anomaly_detection_mlflow.py`

```python
from ml.mlflow_tracking import MLModelManager
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import numpy as np
import pandas as pd
from typing import Dict, List, Optional

class MLflowAnomalyDetector:
    def __init__(self):
        self.model_manager = MLModelManager()
        self.scaler = StandardScaler()
        self.model = None
        self.model_name = "isolation_forest_anomaly_detector"
    
    def train_model(self, network_data: List[Dict], tenant_id: Optional[str] = None):
        """Train anomaly detection model with MLflow tracking"""
        
        # Prepare data
        df = pd.DataFrame(network_data)
        features = self._extract_features(df)
        X = self.scaler.fit_transform(features)
        
        # Define hyperparameters
        hyperparameters = {
            'contamination': 0.1,
            'n_estimators': 100,
            'max_samples': 'auto',
            'random_state': 42
        }
        
        # Create and train model
        self.model = IsolationForest(**hyperparameters)
        
        # Log training to MLflow
        run_id = self.model_manager.train_and_log_model(
            model=self.model,
            X_train=X,
            y_train=None,  # Unsupervised learning
            model_name=self.model_name,
            tenant_id=tenant_id,
            hyperparameters=hyperparameters
        )
        
        return run_id
    
    def load_model(self, tenant_id: Optional[str] = None):
        """Load production model from MLflow"""
        self.model = self.model_manager.load_production_model(
            self.model_name, 
            tenant_id
        )
        return self.model is not None
    
    def detect_anomalies(self, network_data: List[Dict]) -> List[Dict]:
        """Detect anomalies using loaded model"""
        if not self.model:
            raise ValueError("Model not loaded. Call load_model() first.")
        
        df = pd.DataFrame(network_data)
        features = self._extract_features(df)
        X = self.scaler.transform(features)
        
        # Predict anomalies
        predictions = self.model.predict(X)
        anomaly_scores = self.model.decision_function(X)
        
        results = []
        for i, (prediction, score) in enumerate(zip(predictions, anomaly_scores)):
            results.append({
                'index': i,
                'is_anomaly': prediction == -1,
                'anomaly_score': float(score),
                'threat_level': self._score_to_threat_level(score),
                'original_data': network_data[i]
            })
        
        return results
    
    def _extract_features(self, df: pd.DataFrame) -> np.ndarray:
        """Extract numerical features from network data"""
        features = []
        
        # Example feature extraction (customize based on your data)
        if 'bytes_transferred' in df.columns:
            features.append(df['bytes_transferred'].fillna(0))
        if 'packet_count' in df.columns:
            features.append(df['packet_count'].fillna(0))
        if 'connection_duration' in df.columns:
            features.append(df['connection_duration'].fillna(0))
        
        return np.column_stack(features) if features else np.zeros((len(df), 1))
    
    def _score_to_threat_level(self, score: float) -> str:
        """Convert anomaly score to threat level"""
        if score < -0.5:
            return 'critical'
        elif score < -0.2:
            return 'high'
        elif score < 0:
            return 'medium'
        else:
            return 'low'
```

## 🔧 Configuration

### Environment Variables

```bash
# MLflow Configuration
MLFLOW_TRACKING_URI=http://localhost:5000
MLFLOW_EXPERIMENT_NAME=securenet-ml
MLFLOW_ARTIFACT_ROOT=./mlruns

# Model Storage
MODEL_STORAGE_PATH=./models
```

### Docker Compose Integration

Add to your `docker-compose.yml`:

```yaml
services:
  mlflow:
    image: python:3.11-slim
    command: >
      bash -c "pip install mlflow && 
               mlflow server --host 0.0.0.0 --port 5000 
               --backend-store-uri sqlite:///mlflow.db 
               --default-artifact-root ./mlruns"
    ports:
      - "5000:5000"
    volumes:
      - mlflow_data:/app
      - ./mlruns:/app/mlruns
    environment:
      - MLFLOW_TRACKING_URI=http://localhost:5000
    
volumes:
  mlflow_data:
```

## 🚀 Usage Examples

### Training a Model

```python
from ml.anomaly_detection_mlflow import MLflowAnomalyDetector

# Initialize detector
detector = MLflowAnomalyDetector()

# Sample network data
network_data = [
    {'bytes_transferred': 1024, 'packet_count': 10, 'connection_duration': 5.2},
    {'bytes_transferred': 2048, 'packet_count': 15, 'connection_duration': 3.1},
    # ... more data
]

# Train model (automatically logged to MLflow)
run_id = detector.train_model(network_data, tenant_id="tenant_123")
print(f"Model trained with run_id: {run_id}")
```

### Loading and Using a Model

```python
# Load production model
detector = MLflowAnomalyDetector()
if detector.load_model(tenant_id="tenant_123"):
    # Detect anomalies
    results = detector.detect_anomalies(new_network_data)
    
    for result in results:
        if result['is_anomaly']:
            print(f"Anomaly detected: {result['threat_level']} threat")
```

### Model Management

```python
from ml.mlflow_tracking import MLModelManager

manager = MLModelManager()

# Promote model to production
manager.promote_model_to_production(
    model_name="isolation_forest_anomaly_detector",
    version="1",
    tenant_id="tenant_123"
)

# Compare model performance
run_ids = ["run_1", "run_2", "run_3"]
comparison = manager.compare_models(run_ids)
```

## ✅ Validation Steps

1. **Start MLflow Server**:
   ```bash
   mlflow server --host 0.0.0.0 --port 5000
   ```

2. **Access MLflow UI**: http://localhost:5000

3. **Train Test Model**:
   ```python
   detector = MLflowAnomalyDetector()
   run_id = detector.train_model(sample_data)
   ```

4. **Verify in UI**: Check that experiment appears in MLflow dashboard

5. **Load and Test**: Verify model can be loaded and used for predictions

## 📈 Benefits for SecureNet

- **Experiment Tracking** - Compare different anomaly detection approaches
- **Model Versioning** - Manage models per tenant and version
- **Reproducibility** - Recreate exact model training conditions
- **Collaboration** - Share model results across team
- **Production Deployment** - Seamless model promotion workflow
- **Performance Monitoring** - Track model accuracy over time

## 🔗 Related Documentation

- [Phase 2: Developer Experience](../integration/phase-2-developer-experience.md)
- [ML Tools Overview](README.md)
- [Joblib Integration](joblib.md) 