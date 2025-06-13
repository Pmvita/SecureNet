✅ **Integrated in Phase 2** – See [phase guide](../integration/phase-2-developer-experience.md)

# Joblib - Model Persistence

Joblib is a set of tools to provide lightweight pipelining in Python, particularly optimized for NumPy arrays and scikit-learn models.

## 🎯 Purpose for SecureNet

- **Model Persistence** - Efficient serialization of ML models
- **Fast Loading** - Quick model loading for production use
- **Memory Efficiency** - Optimized for large NumPy arrays
- **Multi-tenant Support** - Separate model storage per tenant
- **Version Management** - Track different model versions

## 📦 Installation

```bash
pip install joblib
```

## 🔧 Integration

### Core Model Persistence Manager

**File**: `ml/model_persistence.py`

```python
import joblib
import os
import json
from pathlib import Path
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
import hashlib
import structlog

logger = structlog.get_logger()

class ModelPersistence:
    """Handles model serialization and loading for SecureNet"""
    
    def __init__(self, models_dir: str = "models"):
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(exist_ok=True)
        self.metadata_dir = self.models_dir / "metadata"
        self.metadata_dir.mkdir(exist_ok=True)
    
    def save_model(self, 
                   model: Any, 
                   model_name: str, 
                   tenant_id: Optional[str] = None,
                   version: Optional[str] = None,
                   metadata: Optional[Dict] = None) -> str:
        """
        Save a model with metadata
        
        Args:
            model: The trained model to save
            model_name: Name identifier for the model
            tenant_id: Optional tenant identifier for multi-tenant support
            version: Optional version string
            metadata: Additional metadata to store with the model
            
        Returns:
            str: Path to the saved model file
        """
        # Generate filename
        filename = self._generate_filename(model_name, tenant_id, version)
        filepath = self.models_dir / filename
        
        try:
            # Save the model
            joblib.dump(model, filepath, compress=3)
            
            # Save metadata
            model_metadata = self._create_metadata(
                model, model_name, tenant_id, version, metadata, filepath
            )
            self._save_metadata(filename, model_metadata)
            
            logger.info(
                "Model saved successfully",
                model_name=model_name,
                tenant_id=tenant_id,
                filepath=str(filepath),
                size_mb=round(filepath.stat().st_size / 1024 / 1024, 2)
            )
            
            return str(filepath)
            
        except Exception as e:
            logger.error(
                "Failed to save model",
                model_name=model_name,
                tenant_id=tenant_id,
                error=str(e)
            )
            raise
    
    def load_model(self, 
                   model_name: str, 
                   tenant_id: Optional[str] = None,
                   version: Optional[str] = None) -> Any:
        """
        Load a model from disk
        
        Args:
            model_name: Name identifier for the model
            tenant_id: Optional tenant identifier
            version: Optional version string (loads latest if not specified)
            
        Returns:
            The loaded model object
        """
        try:
            # Find the model file
            if version:
                filename = self._generate_filename(model_name, tenant_id, version)
                filepath = self.models_dir / filename
            else:
                # Load latest version
                filepath = self._find_latest_model(model_name, tenant_id)
            
            if not filepath or not filepath.exists():
                raise FileNotFoundError(
                    f"Model not found: {model_name}"
                    f"{f' (tenant: {tenant_id})' if tenant_id else ''}"
                    f"{f' (version: {version})' if version else ''}"
                )
            
            # Load the model
            model = joblib.load(filepath)
            
            # Load and validate metadata
            metadata = self._load_metadata(filepath.name)
            self._validate_model_integrity(model, metadata)
            
            logger.info(
                "Model loaded successfully",
                model_name=model_name,
                tenant_id=tenant_id,
                version=metadata.get('version'),
                filepath=str(filepath)
            )
            
            return model
            
        except Exception as e:
            logger.error(
                "Failed to load model",
                model_name=model_name,
                tenant_id=tenant_id,
                version=version,
                error=str(e)
            )
            raise
    
    def list_models(self, tenant_id: Optional[str] = None) -> List[Dict]:
        """
        List all available models
        
        Args:
            tenant_id: Optional tenant filter
            
        Returns:
            List of model information dictionaries
        """
        models = []
        
        for model_file in self.models_dir.glob("*.joblib"):
            try:
                metadata = self._load_metadata(model_file.name)
                
                # Filter by tenant if specified
                if tenant_id and metadata.get('tenant_id') != tenant_id:
                    continue
                
                models.append({
                    'model_name': metadata.get('model_name'),
                    'tenant_id': metadata.get('tenant_id'),
                    'version': metadata.get('version'),
                    'created_at': metadata.get('created_at'),
                    'model_type': metadata.get('model_type'),
                    'file_size_mb': round(model_file.stat().st_size / 1024 / 1024, 2),
                    'filepath': str(model_file)
                })
                
            except Exception as e:
                logger.warning(
                    "Failed to load metadata for model",
                    model_file=str(model_file),
                    error=str(e)
                )
                continue
        
        # Sort by creation date (newest first)
        models.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        return models
    
    def delete_model(self, 
                     model_name: str, 
                     tenant_id: Optional[str] = None,
                     version: Optional[str] = None) -> bool:
        """
        Delete a model and its metadata
        
        Args:
            model_name: Name identifier for the model
            tenant_id: Optional tenant identifier
            version: Optional version string (deletes latest if not specified)
            
        Returns:
            bool: True if deletion was successful
        """
        try:
            # Find the model file
            if version:
                filename = self._generate_filename(model_name, tenant_id, version)
                filepath = self.models_dir / filename
            else:
                filepath = self._find_latest_model(model_name, tenant_id)
            
            if not filepath or not filepath.exists():
                logger.warning(
                    "Model not found for deletion",
                    model_name=model_name,
                    tenant_id=tenant_id,
                    version=version
                )
                return False
            
            # Delete model file
            filepath.unlink()
            
            # Delete metadata
            metadata_file = self.metadata_dir / f"{filepath.stem}.json"
            if metadata_file.exists():
                metadata_file.unlink()
            
            logger.info(
                "Model deleted successfully",
                model_name=model_name,
                tenant_id=tenant_id,
                version=version,
                filepath=str(filepath)
            )
            
            return True
            
        except Exception as e:
            logger.error(
                "Failed to delete model",
                model_name=model_name,
                tenant_id=tenant_id,
                version=version,
                error=str(e)
            )
            return False
    
    def get_model_info(self, 
                       model_name: str, 
                       tenant_id: Optional[str] = None,
                       version: Optional[str] = None) -> Dict:
        """
        Get detailed information about a model
        
        Args:
            model_name: Name identifier for the model
            tenant_id: Optional tenant identifier
            version: Optional version string
            
        Returns:
            Dict: Model information and metadata
        """
        try:
            # Find the model file
            if version:
                filename = self._generate_filename(model_name, tenant_id, version)
                filepath = self.models_dir / filename
            else:
                filepath = self._find_latest_model(model_name, tenant_id)
            
            if not filepath or not filepath.exists():
                raise FileNotFoundError(f"Model not found: {model_name}")
            
            # Load metadata
            metadata = self._load_metadata(filepath.name)
            
            # Add file information
            stat = filepath.stat()
            metadata.update({
                'file_size_bytes': stat.st_size,
                'file_size_mb': round(stat.st_size / 1024 / 1024, 2),
                'last_modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                'filepath': str(filepath)
            })
            
            return metadata
            
        except Exception as e:
            logger.error(
                "Failed to get model info",
                model_name=model_name,
                tenant_id=tenant_id,
                version=version,
                error=str(e)
            )
            raise
    
    def _generate_filename(self, 
                          model_name: str, 
                          tenant_id: Optional[str] = None,
                          version: Optional[str] = None) -> str:
        """Generate a standardized filename for the model"""
        parts = [model_name]
        
        if tenant_id:
            parts.append(tenant_id)
        
        if version:
            parts.append(version)
        else:
            # Use timestamp as version
            parts.append(datetime.now().strftime("%Y%m%d_%H%M%S"))
        
        return "_".join(parts) + ".joblib"
    
    def _find_latest_model(self, 
                          model_name: str, 
                          tenant_id: Optional[str] = None) -> Optional[Path]:
        """Find the latest version of a model"""
        pattern = f"{model_name}"
        if tenant_id:
            pattern += f"_{tenant_id}"
        pattern += "_*.joblib"
        
        matching_files = list(self.models_dir.glob(pattern))
        
        if not matching_files:
            return None
        
        # Sort by modification time (newest first)
        matching_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        
        return matching_files[0]
    
    def _create_metadata(self, 
                        model: Any, 
                        model_name: str, 
                        tenant_id: Optional[str],
                        version: Optional[str],
                        user_metadata: Optional[Dict],
                        filepath: Path) -> Dict:
        """Create metadata for the model"""
        metadata = {
            'model_name': model_name,
            'tenant_id': tenant_id,
            'version': version or datetime.now().strftime("%Y%m%d_%H%M%S"),
            'created_at': datetime.now().isoformat(),
            'model_type': type(model).__name__,
            'model_module': type(model).__module__,
            'file_hash': self._calculate_file_hash(filepath),
            'joblib_version': joblib.__version__
        }
        
        # Add model-specific metadata
        if hasattr(model, 'get_params'):
            try:
                metadata['model_params'] = model.get_params()
            except Exception:
                pass
        
        # Add user-provided metadata
        if user_metadata:
            metadata['user_metadata'] = user_metadata
        
        return metadata
    
    def _save_metadata(self, filename: str, metadata: Dict):
        """Save metadata to a JSON file"""
        metadata_file = self.metadata_dir / f"{Path(filename).stem}.json"
        
        with open(metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2, default=str)
    
    def _load_metadata(self, filename: str) -> Dict:
        """Load metadata from a JSON file"""
        metadata_file = self.metadata_dir / f"{Path(filename).stem}.json"
        
        if not metadata_file.exists():
            return {}
        
        with open(metadata_file, 'r') as f:
            return json.load(f)
    
    def _calculate_file_hash(self, filepath: Path) -> str:
        """Calculate SHA256 hash of the model file"""
        hash_sha256 = hashlib.sha256()
        
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        
        return hash_sha256.hexdigest()
    
    def _validate_model_integrity(self, model: Any, metadata: Dict):
        """Validate that the loaded model matches the metadata"""
        if metadata.get('model_type') and type(model).__name__ != metadata['model_type']:
            logger.warning(
                "Model type mismatch",
                expected=metadata['model_type'],
                actual=type(model).__name__
            )
```

### Integration with SecureNet's ML Pipeline

**File**: `ml/anomaly_detection_with_persistence.py`

```python
from ml.model_persistence import ModelPersistence
from ml.mlflow_tracking import MLModelManager
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import numpy as np
import pandas as pd
from typing import Dict, List, Optional
import structlog

logger = structlog.get_logger()

class PersistentAnomalyDetector:
    """Anomaly detector with model persistence capabilities"""
    
    def __init__(self, models_dir: str = "models"):
        self.persistence = ModelPersistence(models_dir)
        self.mlflow_manager = MLModelManager()
        self.scaler = StandardScaler()
        self.model = None
        self.model_name = "isolation_forest_anomaly_detector"
        self.scaler_name = "anomaly_detector_scaler"
    
    def train_and_save_model(self, 
                            network_data: List[Dict], 
                            tenant_id: Optional[str] = None,
                            version: Optional[str] = None) -> str:
        """Train model and save it with persistence"""
        
        logger.info("Starting model training", tenant_id=tenant_id, data_points=len(network_data))
        
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
        
        # Train model
        self.model = IsolationForest(**hyperparameters)
        self.model.fit(X)
        
        # Save model with joblib
        model_path = self.persistence.save_model(
            model=self.model,
            model_name=self.model_name,
            tenant_id=tenant_id,
            version=version,
            metadata={
                'training_samples': len(network_data),
                'feature_count': X.shape[1],
                'hyperparameters': hyperparameters,
                'training_data_hash': self._hash_data(network_data)
            }
        )
        
        # Save scaler separately
        scaler_path = self.persistence.save_model(
            model=self.scaler,
            model_name=self.scaler_name,
            tenant_id=tenant_id,
            version=version,
            metadata={
                'feature_count': X.shape[1],
                'scaler_type': type(self.scaler).__name__
            }
        )
        
        # Also log to MLflow if available
        try:
            mlflow_run_id = self.mlflow_manager.train_and_log_model(
                model=self.model,
                X_train=X,
                y_train=None,
                model_name=self.model_name,
                tenant_id=tenant_id,
                hyperparameters=hyperparameters
            )
            
            logger.info(
                "Model training completed",
                tenant_id=tenant_id,
                model_path=model_path,
                scaler_path=scaler_path,
                mlflow_run_id=mlflow_run_id
            )
            
        except Exception as e:
            logger.warning("MLflow logging failed", error=str(e))
        
        return model_path
    
    def load_model(self, 
                   tenant_id: Optional[str] = None,
                   version: Optional[str] = None) -> bool:
        """Load model and scaler from persistence"""
        
        try:
            # Load model
            self.model = self.persistence.load_model(
                model_name=self.model_name,
                tenant_id=tenant_id,
                version=version
            )
            
            # Load scaler
            self.scaler = self.persistence.load_model(
                model_name=self.scaler_name,
                tenant_id=tenant_id,
                version=version
            )
            
            logger.info(
                "Model and scaler loaded successfully",
                tenant_id=tenant_id,
                version=version
            )
            
            return True
            
        except Exception as e:
            logger.error(
                "Failed to load model",
                tenant_id=tenant_id,
                version=version,
                error=str(e)
            )
            return False
    
    def detect_anomalies(self, network_data: List[Dict]) -> List[Dict]:
        """Detect anomalies using loaded model"""
        
        if not self.model or not self.scaler:
            raise ValueError("Model not loaded. Call load_model() first.")
        
        # Prepare data
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
    
    def get_model_versions(self, tenant_id: Optional[str] = None) -> List[Dict]:
        """Get all available model versions"""
        return self.persistence.list_models(tenant_id=tenant_id)
    
    def delete_model_version(self, 
                           tenant_id: Optional[str] = None,
                           version: Optional[str] = None) -> bool:
        """Delete a specific model version"""
        
        # Delete both model and scaler
        model_deleted = self.persistence.delete_model(
            model_name=self.model_name,
            tenant_id=tenant_id,
            version=version
        )
        
        scaler_deleted = self.persistence.delete_model(
            model_name=self.scaler_name,
            tenant_id=tenant_id,
            version=version
        )
        
        return model_deleted and scaler_deleted
    
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
    
    def _hash_data(self, data: List[Dict]) -> str:
        """Create a hash of the training data for tracking"""
        import hashlib
        import json
        
        data_str = json.dumps(data, sort_keys=True, default=str)
        return hashlib.md5(data_str.encode()).hexdigest()
```

### Model Management API

**File**: `api/model_management.py`

```python
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel

from ml.model_persistence import ModelPersistence
from ml.anomaly_detection_with_persistence import PersistentAnomalyDetector

router = APIRouter()

class ModelInfo(BaseModel):
    model_name: str
    tenant_id: Optional[str]
    version: str
    created_at: str
    model_type: str
    file_size_mb: float

class TrainingRequest(BaseModel):
    network_data: List[dict]
    tenant_id: Optional[str] = None
    version: Optional[str] = None

@router.get("/models", response_model=List[ModelInfo])
async def list_models(tenant_id: Optional[str] = None):
    """List all available models"""
    persistence = ModelPersistence()
    models = persistence.list_models(tenant_id=tenant_id)
    return models

@router.get("/models/{model_name}/info")
async def get_model_info(
    model_name: str,
    tenant_id: Optional[str] = None,
    version: Optional[str] = None
):
    """Get detailed information about a specific model"""
    persistence = ModelPersistence()
    
    try:
        info = persistence.get_model_info(model_name, tenant_id, version)
        return info
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Model not found")

@router.post("/models/train")
async def train_model(request: TrainingRequest):
    """Train and save a new model"""
    detector = PersistentAnomalyDetector()
    
    try:
        model_path = detector.train_and_save_model(
            network_data=request.network_data,
            tenant_id=request.tenant_id,
            version=request.version
        )
        
        return {
            "status": "success",
            "message": "Model trained and saved successfully",
            "model_path": model_path
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

@router.delete("/models/{model_name}")
async def delete_model(
    model_name: str,
    tenant_id: Optional[str] = None,
    version: Optional[str] = None
):
    """Delete a specific model version"""
    persistence = ModelPersistence()
    
    success = persistence.delete_model(model_name, tenant_id, version)
    
    if success:
        return {"status": "success", "message": "Model deleted successfully"}
    else:
        raise HTTPException(status_code=404, detail="Model not found")

@router.post("/models/{model_name}/load")
async def load_model(
    model_name: str,
    tenant_id: Optional[str] = None,
    version: Optional[str] = None
):
    """Load a model for inference"""
    detector = PersistentAnomalyDetector()
    
    success = detector.load_model(tenant_id=tenant_id, version=version)
    
    if success:
        return {"status": "success", "message": "Model loaded successfully"}
    else:
        raise HTTPException(status_code=404, detail="Failed to load model")
```

## 🚀 Usage Examples

### Basic Model Persistence

```python
from ml.model_persistence import ModelPersistence
from sklearn.ensemble import IsolationForest

# Create persistence manager
persistence = ModelPersistence("models")

# Train a model
model = IsolationForest(contamination=0.1)
model.fit(training_data)

# Save the model
model_path = persistence.save_model(
    model=model,
    model_name="threat_detector",
    tenant_id="tenant_123",
    metadata={"accuracy": 0.95, "training_samples": 1000}
)

# Load the model
loaded_model = persistence.load_model(
    model_name="threat_detector",
    tenant_id="tenant_123"
)
```

### Integrated Anomaly Detection

```python
from ml.anomaly_detection_with_persistence import PersistentAnomalyDetector

# Create detector
detector = PersistentAnomalyDetector()

# Train and save model
network_data = [
    {'bytes_transferred': 1024, 'packet_count': 10},
    {'bytes_transferred': 2048, 'packet_count': 15},
    # ... more data
]

model_path = detector.train_and_save_model(
    network_data=network_data,
    tenant_id="tenant_123"
)

# Later, load and use the model
detector.load_model(tenant_id="tenant_123")
results = detector.detect_anomalies(new_network_data)
```

## ✅ Validation Steps

1. **Install Joblib**:
   ```bash
   pip install joblib
   ```

2. **Test Basic Persistence**:
   ```python
   from ml.model_persistence import ModelPersistence
   from sklearn.ensemble import IsolationForest
   
   persistence = ModelPersistence()
   model = IsolationForest()
   model.fit([[1], [2], [3]])
   
   # Save and load
   path = persistence.save_model(model, "test_model")
   loaded = persistence.load_model("test_model")
   assert type(loaded) == type(model)
   ```

3. **Test Model Listing**:
   ```python
   models = persistence.list_models()
   assert len(models) > 0
   ```

4. **Test Metadata**:
   ```python
   info = persistence.get_model_info("test_model")
   assert "created_at" in info
   assert "model_type" in info
   ```

## 📈 Benefits for SecureNet

- **Fast Model Loading** - Optimized for NumPy arrays and scikit-learn models
- **Multi-tenant Support** - Separate model storage per tenant
- **Version Management** - Track and manage different model versions
- **Metadata Tracking** - Store training information and model parameters
- **Integrity Validation** - Verify model integrity with checksums
- **Space Efficient** - Compressed storage for large models

## 🔗 Related Documentation

- [Phase 2: Developer Experience](../integration/phase-2-developer-experience.md)
- [ML Tools Overview](README.md)
- [MLflow Integration](mlflow.md) 